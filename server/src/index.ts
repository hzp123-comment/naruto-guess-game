import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { config, validateProductionConfig } from './config';
import { assertDatabaseReady } from './db/ready';
import { ensureSchema, backfillLegacyPlayerDifficulties } from './db/schema';
import { seedPlayersIfEmpty, backfillEasyPlayers } from './db/init';
import { db } from './db/knex';
import { errorHandler } from './middleware/common';
import authRoutes from './routes/auth';
import playerRoutes from './routes/players';
import gameRoutes from './routes/game';
import statsRoutes from './routes/stats';
import leaderboardRoutes from './routes/leaderboard';
import announcementRoutes from './routes/announcements';
import adminRoutes from './routes/admin';
import externalPlayerRoutes, { externalPlayerAuth } from './routes/externalPlayers';
import { setupSocket } from './socket';
import {
  closeRedis,
  duplicateRedisClient,
  initRedis,
  isRedisAvailable,
  isRedisTimeoutError,
} from './redis';
import { initPlayerCache } from './services/playerCache';
import { rateLimit } from './middleware/rateLimit';
import { initMatchResultWorker } from './services/matchResultQueue';
import powRoutes from './routes/pow';
import { requirePow } from './middleware/pow';
import { closePasswordWorkers } from './services/password';
import { getRuntimeSnapshot, startRuntimeMonitor } from './services/runtimeMonitor';
import { requireAdmin, requireAuth } from './middleware/auth';
import { parseJsonOnce, rejectOversizedBody } from './middleware/jsonBody';
import { rejectMissingClientAsset, setClientAssetCacheHeaders } from './middleware/clientAssets';
import { injectUmamiScript } from './services/umami';

const SHUTDOWN_TIMEOUT_MS = 10_000;
const CLOUDFLARE_INSIGHTS_SCRIPT_ORIGIN = 'https://static.cloudflareinsights.com';
const CLOUDFLARE_INSIGHTS_BEACON_ORIGIN = 'https://cloudflareinsights.com';

process.on('unhandledRejection', (reason) => {
  if (isRedisTimeoutError(reason)) {
    console.warn('[server:redis-timeout-unhandled]', reason);
    return;
  }
  console.error('[server:unhandled-rejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[server:uncaught-exception]', err);
});
process.on('uncaughtExceptionMonitor', (err, origin) => {
  console.error('[server:uncaught-exception-monitor]', origin, err);
});

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, onTimeout: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        onTimeout();
        reject(new Error('SHUTDOWN_TIMEOUT'));
      } catch (err) {
        reject(err);
      }
    }, timeoutMs);
    timer.unref?.();
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function main() {
  validateProductionConfig();
  const stopRuntimeMonitor = startRuntimeMonitor();

  // 状态变量 - 提前声明,供中间件闭包使用
  let shuttingDown = false;
  let dbReady = false;

  // CORS 辅助函数 - 提前定义,供 Express 和 Socket.IO 使用
  const isDev = process.env.NODE_ENV !== 'production';
  function isOriginAllowed(origin: string | undefined): boolean {
    if (isDev || !origin) return true;
    return config.corsOrigins.some((pattern) => {
      if (pattern === origin) return true;
      if (pattern.startsWith('*.')) {
        const domain = pattern.slice(2);
        return origin.endsWith(domain);
      }
      return false;
    });
  }

  // index.html 含内联脚本(主题开关、启动屏进度),CSP 不放开 unsafe-inline,
  // 而是从实际服务的 HTML 计算各内联脚本的 sha256 哈希加入 script-src
  const clientDist = path.resolve(__dirname, '../../client/dist');
  const clientIndexPath = path.join(clientDist, 'index.html');
  const rawIndexHtml = fs.existsSync(clientIndexPath)
    ? fs.readFileSync(clientIndexPath, 'utf8')
    : null;
  const inlineScriptHashes = rawIndexHtml
    ? [...rawIndexHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
        (match) => `'sha256-${crypto.createHash('sha256').update(match[1], 'utf8').digest('base64')}'`
      )
    : [];

  // ==================== 创建 Express 应用并注册所有中间件和路由 ====================
  const app = express();
  app.set('trust proxy', config.trustProxy ? 1 : false);

  // 请求日志 - 放在所有中间件之前
  app.use((req, _res, next) => {
    console.log(`[request] ${req.method} ${req.url} from ${req.ip}`);
    next();
  });

  // 健康检查端点 - 放在 helmet/cors 之前,确保 Render 端口探测能立刻得到响应
  app.get('/api/health', (_req, res) =>
    res.json({
      ok: true,
      ready: dbReady,
      redis: isRedisAvailable() ? 'up' : 'degraded',
      features: { leaderboard: config.showLeaderboard },
      runtime: getRuntimeSnapshot(),
    })
  );

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'wasm-unsafe-eval'",
          CLOUDFLARE_INSIGHTS_SCRIPT_ORIGIN,
          ...(config.umami ? [config.umami.origin] : []),
          ...inlineScriptHashes,
        ],
        workerSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: [
          "'self'",
          ...config.corsOrigins,
          CLOUDFLARE_INSIGHTS_BEACON_ORIGIN,
          ...(config.umami ? [config.umami.origin] : []),
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  }));

  const corsOptions = {
    origin: isOriginAllowed,
    credentials: true,
  };
  app.use(cors(corsOptions));
  app.use((req, res, next) => {
    if (shuttingDown) return res.status(503).json({ code: 'SERVER_SHUTTING_DOWN' });
    if (!dbReady) return res.status(503).json({ code: 'SERVER_INITIALIZING' });
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (!isDev) {
        const origin = req.headers.origin;
        if (origin && !isOriginAllowed(origin)) {
          return res.status(403).json({ code: 'INVALID_ORIGIN' });
        }
      }
    }
    next();
  });
  app.use('/api', rateLimit({ name: 'api', limit: 600, windowSeconds: 60 }));
  app.use('/api/pow', rejectOversizedBody(16 * 1024), parseJsonOnce('16kb'));
  app.use('/api/pow', powRoutes);
  app.use('/api/external', externalPlayerAuth);
  app.use(
    '/api/external',
    rejectOversizedBody(config.adminImportBodyLimitBytes),
    parseJsonOnce(`${config.adminImportBodyLimitBytes}b`)
  );
  app.use('/api/external', externalPlayerRoutes);
  app.use('/api', requirePow);
  app.use('/api/admin/players/import', requireAuth, requireAdmin);
  app.use(
    '/api/admin/players/import',
    rejectOversizedBody(config.adminImportBodyLimitBytes),
    parseJsonOnce(`${config.adminImportBodyLimitBytes}b`)
  );
  app.use('/api', rejectOversizedBody(64 * 1024), parseJsonOnce('64kb'));

  app.use('/api/auth', authRoutes);
  app.use('/api/players', playerRoutes);
  app.use('/api/game', gameRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/announcements', announcementRoutes);
  app.use('/api/admin', adminRoutes);

  // 生产环境托管前端构建产物
  if (rawIndexHtml !== null) {
    const indexHtml = injectUmamiScript(rawIndexHtml, config.umami);
    app.use(express.static(clientDist, { index: false, setHeaders: setClientAssetCacheHeaders }));
    app.use(rejectMissingClientAsset);
    app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.type('html').send(indexHtml);
    });
  }

  app.use(errorHandler);

  // ==================== 创建 HTTP 服务器并立即开始监听 ====================
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: isOriginAllowed, credentials: true } });
  app.set('io', io);

  let shutdownPromise: Promise<void> | null = null;
  let adapterPubClient: ReturnType<typeof duplicateRedisClient> = null;
  let adapterSubClient: ReturnType<typeof duplicateRedisClient> = null;

  io.use((_socket, next) => {
    if (shuttingDown) return next(new Error('SERVER_SHUTTING_DOWN'));
    next();
  });

  const stopSocket = setupSocket(io);

  server.on('error', (err) => {
    console.error('[server:listen-error]', err);
  });
  server.on('listening', () => {
    const addr = server.address();
    console.log('[server:listening]', addr ? JSON.stringify(addr) : 'unknown');
  });
  server.on('close', () => {
    console.log('[server:close] HTTP server closed');
  });

  // 立即开始监听 - 不等待数据库初始化
  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error) => {
      reject(err);
    };
    server.once('error', onError);
    server.listen(config.port, '0.0.0.0', () => {
      server.off('error', onError);
      console.log(`[server] 服务已启动(监听中): http://0.0.0.0:${config.port}`);
      console.log(`[server] allowed origins: ${config.corsOrigins.join(', ')}`);
      resolve();
    });
  });

  // 保活定时器 - 不调用 unref(),确保进程不会静默退出
  const heartbeat = setInterval(() => {
    const mem = process.memoryUsage();
    console.log(`[heartbeat] pid=${process.pid} rss=${Math.round(mem.rss / 1024 / 1024)}MB heap=${Math.round(mem.heapUsed / 1024 / 1024)}MB ready=${dbReady}`);
  }, 10_000);
  // 注意: 不调用 heartbeat.unref() - 此定时器保持进程存活

  // ==================== 异步初始化(数据库/Redis) - 在服务器监听后执行 ====================
  console.log('[server] 正在初始化数据库结构');
  await ensureSchema();
  console.log('[server] 正在导入角色数据');
  await seedPlayersIfEmpty();
  await backfillEasyPlayers();
  await backfillLegacyPlayerDifficulties();
  console.log('[server] 正在验证数据库结构');
  await assertDatabaseReady();
  console.log('[server] 数据库结构验证通过');
  const redisReady = await initRedis();
  await initPlayerCache();
  const stopMatchWorker = redisReady ? await initMatchResultWorker() : async () => undefined;

  // Redis 适配器 - 在服务器已监听后设置
  if (redisReady) {
    adapterPubClient = duplicateRedisClient('socket-adapter-pub');
    adapterSubClient = duplicateRedisClient('socket-adapter-sub');
    if (adapterPubClient && adapterSubClient) {
      await Promise.all([adapterPubClient.connect(), adapterSubClient.connect()]);
      io.adapter(createAdapter(adapterPubClient, adapterSubClient));
    }
  }

  dbReady = true;
  console.log('[server] 初始化完成,服务就绪');

  // ==================== 优雅退出处理 ====================
  const shutdown = async (signal: string): Promise<void> => {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      shuttingDown = true;
      console.log(`[server] 收到 ${signal},开始优雅退出`);
      clearInterval(heartbeat);
      stopRuntimeMonitor();
      const serverClosed = new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeIdleConnections?.();
      });
      const socketClosed = new Promise<void>((resolve) => io.close(() => resolve()));
      await Promise.allSettled([
        withTimeout(serverClosed, SHUTDOWN_TIMEOUT_MS, () => server.closeAllConnections?.()),
        withTimeout(socketClosed, SHUTDOWN_TIMEOUT_MS, () => io.disconnectSockets(true)),
        withTimeout(stopMatchWorker(), SHUTDOWN_TIMEOUT_MS, () => undefined),
      ]);
      await withTimeout(stopSocket(), SHUTDOWN_TIMEOUT_MS, () => undefined).catch((err) => {
        console.error('[shutdown:socket-drain]', err);
      });

      await Promise.allSettled([
        withTimeout(
          adapterPubClient?.isOpen ? adapterPubClient.quit().then(() => undefined) : Promise.resolve(),
          SHUTDOWN_TIMEOUT_MS,
          () => undefined
        ),
        withTimeout(
          adapterSubClient?.isOpen ? adapterSubClient.quit().then(() => undefined) : Promise.resolve(),
          SHUTDOWN_TIMEOUT_MS,
          () => undefined
        ),
        withTimeout(closeRedis(), SHUTDOWN_TIMEOUT_MS, () => undefined),
        withTimeout(closePasswordWorkers(), SHUTDOWN_TIMEOUT_MS, () => undefined),
        withTimeout(db.destroy(), SHUTDOWN_TIMEOUT_MS, () => undefined),
      ]);
      console.log('[server] 优雅退出完成');
    })();
    return shutdownPromise;
  };
  const handleSignal = (signal: string) => {
    const forceExitTimer = setTimeout(() => {
      console.error('[server] 优雅退出超时,强制退出');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS * 2 + 2_000);
    void shutdown(signal)
      .then(() => {
        clearTimeout(forceExitTimer);
        process.exit(0);
      })
      .catch((err) => {
        clearTimeout(forceExitTimer);
        console.error('[server] 优雅退出失败:', err);
        process.exit(1);
      });
  };
  process.once('SIGINT', () => handleSignal('SIGINT'));
  process.once('SIGTERM', () => handleSignal('SIGTERM'));
}

main().catch((err) => {
  console.error('[server] 启动失败:', err);
  process.exit(1);
});
