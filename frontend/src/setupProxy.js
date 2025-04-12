const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:880', // Your Express backend server port
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api' // Keep the /api prefix when forwarding
      }
    })
  );
};