/**
 * Auth Layout
 * Layout for login and registration pages
 */

import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function AuthLayout() {
    const { isAuthenticated, user } = useAuthStore();

    // Redirect to dashboard if already authenticated
    if (isAuthenticated) {
        const dashboardPath =
            user?.role === 'vehicle_owner'
                ? '/vehicle-owner'
                : user?.role === 'generator_owner'
                    ? '/generator-owner'
                    : user?.role === 'industry_owner'
                        ? '/industry-owner'
                        : '/city-admin';

        return <Navigate to={dashboardPath} replace />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-primary-600 mb-2">EMIQ</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Emission Monitoring Platform
                    </p>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                    <Outlet />
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-gray-500 mt-8 space-x-3">
                    <Link to="/pricing" className="hover:text-primary-600">Pricing</Link>
                    <Link to="/how-it-compares" className="hover:text-primary-600">Compare</Link>
                    <Link to="/trust" className="hover:text-primary-600">Trust</Link>
                </div>
                <p className="text-center text-sm text-gray-500 mt-4">
                    © 2026 EMIQ. Built for a sustainable future.
                </p>
            </div>
        </div>
    );
}
