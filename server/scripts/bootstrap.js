// 启动前检查并修复 better-sqlite3 原生绑定问题
// 防止 pnpm deploy --legacy 后 .node 文件路径失效导致无日志崩溃
const { spawnSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../..');
const SERVER_ROOT = path.resolve(__dirname, '..');
const ENTRY = path.resolve(SERVER_ROOT, 'dist/index.js');

console.log('[bootstrap] 入口:', ENTRY);
console.log('[bootstrap] CWD:', process.cwd());

function tryRequireSqlite() {
  try {
    const nm = path.resolve(SERVER_ROOT, 'node_modules');
    const sqlitePkg = path.resolve(nm, 'better-sqlite3');
    if (!fs.existsSync(sqlitePkg)) {
      console.warn('[bootstrap] better-sqlite3 包未找到:', sqlitePkg);
      return false;
    }
    const bindings = path.resolve(sqlitePkg, 'build/Release/better_sqlite3.node');
    const prebuild = path.resolve(sqlitePkg, 'prebuilds');
    console.log('[bootstrap] bindings 路径:', bindings, '存在:', fs.existsSync(bindings));
    console.log('[bootstrap] prebuilds 路径:', prebuild, '存在:', fs.existsSync(prebuild));
    const s = require(sqlitePkg);
    // 实际打开一个库验证绑定可用
    const tmpFile = path.join(process.env.DB_URL ? path.dirname(process.env.DB_URL) : '/tmp', 'bootstrap-test.sqlite3');
    try {
      const db = new s(tmpFile);
      db.exec('CREATE TABLE IF NOT EXISTS t (a INT)');
      db.close();
      try { fs.unlinkSync(tmpFile); } catch {}
      console.log('[bootstrap] better-sqlite3 原生绑定 OK');
      return true;
    } catch (e) {
      console.error('[bootstrap] better-sqlite3 打开/操作失败:', e.message);
      return false;
    }
  } catch (e) {
    console.error('[bootstrap] better-sqlite3 加载失败:', e.message);
    return false;
  }
}

if (!tryRequireSqlite()) {
  console.warn('[bootstrap] 尝试自动修复: 进入 server/node_modules/better-sqlite3 执行 rebuild...');
  const nm = path.resolve(SERVER_ROOT, 'node_modules');
  process.chdir(path.resolve(nm, 'better-sqlite3'));
  console.log('[bootstrap] 当前目录:', process.cwd());
  const res = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'install'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env },
  });
  console.log('[bootstrap] rebuild status:', res.status);
  process.chdir(SERVER_ROOT);
  if (!tryRequireSqlite()) {
    console.error('[bootstrap] 自动修复失败，仍以普通模式启动（可能会崩溃，参见错误日志）');
  }
}

process.chdir(ROOT);
console.log('[bootstrap] 启动主服务...');
require(ENTRY);
