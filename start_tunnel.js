// 查找 localtunnel 模块路径
const path = require('path');
const localtunnelPath = path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'localtunnel');

try {
  const localtunnel = require(localtunnelPath);
  
  const tunnel = localtunnel(5173, (err, tunnel) => {
    if (err) {
      console.error('Error creating tunnel:', err);
      process.exit(1);
    }
    console.log('Public URL:', tunnel.url);
    console.log('请将此URL分享给微信好友访问');
    
    tunnel.on('close', () => {
      console.log('Tunnel closed');
    });
    
    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
    });
  });
} catch (e) {
  // 尝试其他路径
  try {
    const localtunnel = require('localtunnel');
    const tunnel = localtunnel(5173, (err, tunnel) => {
      if (err) {
        console.error('Error creating tunnel:', err);
        process.exit(1);
      }
      console.log('Public URL:', tunnel.url);
    });
  } catch (e2) {
    console.error('Cannot find localtunnel module');
    console.error(e.message);
    process.exit(1);
  }
}
