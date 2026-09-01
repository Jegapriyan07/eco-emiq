/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, user, logout } = useAuthStore();
    const supportedRoles = ['generator_owner', 'industry_owner', 'city_admin'];

    if (!isAuthenticated || !user || !supportedRoles.includes(user.role)) {
        if (isAuthenticated) logout();
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
