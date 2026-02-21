import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        // Allow Vite to resolve modules from parent node_modules (monorepo)
        preserveSymlinks: false,
        dedupe: ['react', 'react-dom'],
    },
    server: {
        port: 5173,
        proxy: {
            '/ml-api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/ml-api/, '/api/v1/ml'),
            },
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://localhost:3003',
                ws: true,
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'charts': ['recharts'],
                    'maps': ['leaflet', 'react-leaflet'],
                },
            },
        },
    },
});
