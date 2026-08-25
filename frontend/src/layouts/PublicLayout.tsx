/**
 * Public layout for marketing / trust pages (accessible without login)
 */

import { Link, Outlet } from 'react-router-dom';
import { Leaf } from 'lucide-react';

export default function PublicLayout() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary-600">
                        <Leaf className="w-6 h-6" /> EMIQ
                    </Link>
                    <nav className="flex items-center gap-4 text-sm">
                        <Link to="/how-it-compares" className="text-gray-600 dark:text-gray-300 hover:text-primary-600">Compare</Link>
                        <Link to="/pricing" className="text-gray-600 dark:text-gray-300 hover:text-primary-600">Pricing</Link>
                        <Link to="/trust" className="text-gray-600 dark:text-gray-300 hover:text-primary-600">Trust</Link>
                        <Link to="/login" className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700">
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
