const http = require('http');
const port = process.env.PORT || 8790;

http.createServer((req, res) => {
  const opts = {
    hostname: '127.0.0.1',
    port: 8787,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: '127.0.0.1:8787' }
  };
  const proxy = http.request(opts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxy.on('error', () => { res.writeHead(502); res.end('Backend unavailable'); });
  req.pipe(proxy);
}).listen(port, () => console.log(`Preview proxy on ${port} -> 8787`));
