/**
 * API base URLs for EcoTronics frontend.
 *
 * Locally Vite proxies `/ml-api` → `http://localhost:8000/api/v1/ml`.
 * On Render Static Site set VITE_ML_API_URL at build time, e.g.
 *   VITE_ML_API_URL=https://ecotronics-ml.onrender.com/api/v1/ml
 */
const raw = (import.meta.env.VITE_ML_API_URL as string | undefined)?.trim();

export const ML_BASE = (raw && raw.length > 0 ? raw : '/ml-api').replace(/\/$/, '');
