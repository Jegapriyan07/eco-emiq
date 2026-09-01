/**
 * Public layout for marketing / trust pages (accessible without login)
 */

import { Link, Outlet } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function PublicLayout() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-950 dark:text-white">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400 text-slate-950"><Activity className="h-5 w-5" /></span> EMIQ
                    </Link>
                    <nav className="flex items-center gap-4 text-sm">
                        <Link to="/how-it-compares" className="text-gray-600 dark:text-gray-300 hover:text-primary-600">Compare</Link>
                        <Link to="/pricing" className="text-gray-600 dark:text-gray-300 hover:text-primary-600">Pricing</Link>
                        <Link to="/trust" className="text-gray-600 dark:text-gray-300 hover:text-primary-600">Trust</Link>
                        <Link to="/login" className="rounded-lg bg-slate-950 px-4 py-2 font-medium text-white hover:bg-slate-800 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300">
                            Sign in
                        </Link>
                    </nav>
                </div>
            </header>
            <main className="max-w-6xl mx-auto px-4 py-10">
                <Outlet />
            </main>
            <footer className="border-t border-gray-200 dark:border-gray-700 py-8 text-center text-sm text-gray-500">
                © 2026 EMIQ · Team Eco-Tronics · TSM Technova 2026
            </footer>
        </div>
    );
}
