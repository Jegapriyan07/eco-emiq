/**
 * Production SPA static server for Render Web Service.
 * Serves dist/ files and falls back to index.html for client-side routes.
 * Avoids broken Static Site CDN rewrites that return empty bodies for /home, /login, etc.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '..', 'dist');
const port = Number(process.env.PORT || 3000);
const indexHtml = path.join(dist, 'index.html');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.json': 'application/json',
    '.map': 'application/json',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.webp': 'image/webp',
};

function send(res, status, body, contentType, cacheControl) {
    res.writeHead(status, {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        'X-Content-Type-Options': 'nosniff',
    });
    res.end(body);
}

function safeJoin(root, reqPath) {
    const decoded = decodeURIComponent(reqPath.split('?')[0] || '/');
    const resolved = path.normalize(path.join(root, decoded));
    if (!resolved.startsWith(root)) return null;
    return resolved;
}

const server = http.createServer((req, res) => {
    try {
        if (!fs.existsSync(indexHtml)) {
            send(res, 500, 'Build missing: dist/index.html', 'text/plain; charset=utf-8', 'no-store');
            return;
        }

        let filePath = safeJoin(dist, req.url === '/' ? '/index.html' : req.url || '/');
        if (!filePath) {
            send(res, 403, 'Forbidden', 'text/plain; charset=utf-8', 'no-store');
            return;
        }

        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
            filePath = path.join(filePath, 'index.html');
        }

        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const isHtml = ext === '.html';
            send(
                res,
                200,
                fs.readFileSync(filePath),
                MIME[ext] || 'application/octet-stream',
                isHtml ? 'no-cache' : 'public, max-age=31536000, immutable'
            );
            return;
        }

        // Client-side route → index.html
        send(res, 200, fs.readFileSync(indexHtml), MIME['.html'], 'no-cache');
    } catch (err) {
        console.error(err);
        send(res, 500, 'Server error', 'text/plain; charset=utf-8', 'no-store');
    }
});

server.listen(port, '0.0.0.0', () => {
    console.log(`EMIQ SPA server on http://0.0.0.0:${port} (dist=${dist})`);
});
