// Render 启动探针：先于主服务监听并快速响应 Render 的端口探测
// Render 免费版会在启动后 60s 内探测 0.0.0.0 端口，若未及时响应会标记 No open HTTP ports
const http = require('http');
const path = require('path');
const PORT = Number(process.env.PORT || 10000);
const ENTRY = path.resolve(__dirname, '../dist/index.js');

console.log('[render-probe] PORT:', PORT);
console.log('[render-probe] 启动端口探针...');

// 先创建一个最小 HTTP 服务器快速响应 Render 探测
const probeServer = http.createServer((req, res) => {
  if (req.url === '/api/health' || req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, probe: true, ready: false }));
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, probe: true }));
  }
});

probeServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[render-probe] 探针已启动: http://0.0.0.0:${PORT}`);
  // 1.5秒后关闭探针，让主服务接管同一端口
  setTimeout(() => {
    probeServer.close(() => {
      console.log('[render-probe] 探针已关闭，启动主服务...');
      require(ENTRY);
    });
  }, 1500);
});

probeServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('[render-probe] 端口已被占用，直接启动主服务...');
    require(ENTRY);
  } else {
    console.error('[render-probe] 探针错误:', err.message);
    require(ENTRY); // 无论如何尝试启动主服务
  }
});
