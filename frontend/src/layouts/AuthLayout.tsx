/**
 * Auth Layout
 * Layout for login, registration, and pricing pages
 */

import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function AuthLayout() {
    const { isAuthenticated, user } = useAuthStore();
    const location = useLocation();
    const isPricing = location.pathname === '/pricing';

    // Redirect to dashboard if already authenticated (unless viewing pricing)
    if (isAuthenticated && !isPricing) {
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

    // Full-width layout for pricing page
    if (isPricing) {
        return (
            <div className="min-h-screen bg-slate-950">
                <Outlet />
            </div>
        );
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
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 relative pt-14">
                    <Outlet />
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-gray-500 mt-8">
                    © 2026 EMIQ. Built for a sustainable future.
                </p>
            </div>
        </div>
    );
}
