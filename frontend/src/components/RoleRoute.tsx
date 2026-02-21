/**
 * Role-Based Route Component
 * Ensures user has correct role to access route
 */

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface RoleRouteProps {
    children: React.ReactNode;
    allowedRoles: string[];
}

export default function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
    const { user } = useAuthStore();

    if (!user || !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
