/**
 * After Vite build, copy index.html into each SPA route folder so static hosts
 * (Render CDN without rewrite rules) can serve deep links on refresh.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');
const indexFile = path.join(distDir, 'index.html');

const SPA_ROUTES = [
    'home',
    'pricing',
    'how-it-compares',
    'trust',
    'login',
    'register',
    'vehicle-owner',
    'vehicle-owner/timeline',
    'vehicle-owner/maintenance',
    'vehicle-owner/tips',
    'vehicle-owner/devices',
    'generator-owner',
    'generator-owner/performance',
    'generator-owner/maintenance',
    'generator-owner/control',
    'generator-owner/logs',
    'industry-owner',
    'industry-owner/compliance',
    'industry-owner/maintenance',
    'industry-owner/anomalies',
    'industry-owner/organization',
    'city-admin',
    'city-admin/wards',
    'city-admin/devices',
    'city-admin/alerts',
    'city-admin/policy',
    'city-admin/predictions',
];

if (!fs.existsSync(indexFile)) {
    console.error('spa-fallback: dist/index.html missing — run vite build first');
    process.exit(1);
}

const html = fs.readFileSync(indexFile);

for (const route of SPA_ROUTES) {
    const dir = path.join(distDir, route);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
}

// Keep Netlify-style file for hosts that honor it; Render prefers Dashboard rewrite
fs.writeFileSync(
    path.join(distDir, '_redirects'),
    '/*    /index.html   200\n'
);

console.log(`spa-fallback: wrote index.html for ${SPA_ROUTES.length} routes`);
