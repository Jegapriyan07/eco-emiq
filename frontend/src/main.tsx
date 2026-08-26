import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { LanguageProvider } from './contexts/LanguageContext';

/**
 * HashRouter keeps the server path as `/` so refresh/back work on hosts where
 * path rewrites fail (Render Static Site returns empty bodies for /home, /login).
 * URLs look like https://emiq.onrender.com/#/login
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <HashRouter>
            <LanguageProvider>
                <App />
            </LanguageProvider>
        </HashRouter>
    </React.StrictMode>
);
