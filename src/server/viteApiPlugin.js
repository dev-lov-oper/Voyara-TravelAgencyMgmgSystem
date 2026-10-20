/**
 * Vite Plugin to serve backend API endpoints (/api/*) directly in Vite dev and preview servers.
 */
import { handleApiRequest } from './apiHandler.js';

export function viteApiPlugin() {
  const middleware = (req, res, next) => {
    if (req.url && req.url.startsWith('/api')) {
      handleApiRequest(req, res).catch((err) => {
        console.error('[viteApiPlugin] Error in API handler:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Server error' }));
        }
      });
      return;
    }
    next();
  };

  return {
    name: 'voyara-api-server',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
