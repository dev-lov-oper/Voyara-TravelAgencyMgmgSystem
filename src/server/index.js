/**
 * Standalone HTTP Server for Voyara TAMS API
 * Can be run via: node src/server/index.js
 */
import http from 'node:http';
import { handleApiRequest } from './apiHandler.js';

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  handleApiRequest(req, res).catch((err) => {
    console.error('[Server] Handler error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Server error' }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`[Voyara TAMS Backend] API Server running at http://localhost:${PORT}/api/`);
});

export default server;
