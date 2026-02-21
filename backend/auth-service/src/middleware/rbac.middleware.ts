/**
 * EcoTronics Auth Service - RBAC Middleware
 * Role-Based Access Control for 4 user types
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export type UserRole = 'vehicle_owner' | 'generator_owner' | 'industry_owner' | 'city_admin';

/**
 * RBAC Permission Matrix
 */
const PERMISSIONS = {
    // Own resources
    'read:own:devices': ['vehicle_owner', 'generator_owner', 'industry_owner', 'city_admin'],
    'write:own:devices': ['vehicle_owner', 'generator_owner', 'industry_owner', 'city_admin'],
    'delete:own:devices': ['vehicle_owner', 'generator_owner', 'industry_owner', 'city_admin'],

    // Organization resources
    'read:org:devices': ['industry_owner', 'city_admin'],
    'write:org:devices': ['industry_owner', 'city_admin'],
    'read:org:users': ['industry_owner', 'city_admin'],
    'write:org:users': ['industry_owner'],

    // City-wide resources
    'read:city:devices': ['city_admin'],
    'read:city:wards': ['city_admin'],
    'read:city:analytics': ['city_admin'],
    'write:city:wards': ['city_admin'],

    // Admin operations
    'read:all:users': ['city_admin'],
    'write:all:users': ['city_admin'],
    'delete:all:users': ['city_admin'],
};

/**
 * Check if user has required permission
 */
export const hasPermission = (permission: string, userRole: UserRole): boolean => {
    const allowedRoles = PERMISSIONS[permission as keyof typeof PERMISSIONS];
    return allowedRoles ? allowedRoles.includes(userRole) : false;
};

/**
 * Middleware to require specific roles
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
        }

        if (!allowedRoles.includes(req.user.role as UserRole)) {
            throw new AppError(
                'Insufficient permissions',
                403,
                'INSUFFICIENT_PERMISSIONS'
            );
        }

        next();
    };
};

/**
 * Middleware to require specific permission
 */
export const requirePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
        }

        if (!hasPermission(permission, req.user.role as UserRole)) {
            throw new AppError(
                `Permission denied: ${permission}`,
                403,
                'PERMISSION_DENIED'
            );
        }

        next();
    };
};

/**
 * Middleware to check resource ownership
 */
export const requireOwnership = (resourceType: 'device' | 'user' | 'org') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
            }

            const resourceId = req.params.id;
            const userId = req.user.userId;
            const userRole = req.user.role as UserRole;

            // City admins have access to everything
            if (userRole === 'city_admin') {
                return next();
            }

            // Check ownership based on resource type
            switch (resourceType) {
                case 'device':
                    // Check if user owns the device or is in the same org
                    const device = await prisma.device.findUnique({
                        where: { id: resourceId },
                    });

                    if (!device) {
                        throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
                    }

                    // Owner can access
                    if (device.ownerId === userId) {
                        return next();
                    }

                    // Industry owners can access org devices
                    if (userRole === 'industry_owner' && device.orgId === req.user.orgId) {
                        return next();
                    }

                    throw new AppError('Access denied', 403, 'ACCESS_DENIED');

                case 'user':
                    // Users can only access their own profile
                    if (resourceId === userId) {
                        return next();
                    }

                    // Industry owners can access org users
                    if (userRole === 'industry_owner') {
                        const user = await prisma.user.findUnique({
                            where: { id: resourceId },
                        });

                        if (user && user.orgId === req.user.orgId) {
                            return next();
                        }
                    }

                    throw new AppError('Access denied', 403, 'ACCESS_DENIED');

                case 'org':
                    // Check if user belongs to the organization
                    const user = await prisma.user.findUnique({
                        where: { id: userId },
                    });

                    if (user && user.orgId === resourceId) {
                        return next();
                    }

                    throw new AppError('Access denied', 403, 'ACCESS_DENIED');

                default:
                    throw new AppError('Invalid resource type', 400, 'INVALID_RESOURCE_TYPE');
            }
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware to check if user is in same organization
 */
export const requireSameOrg = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.user) {
            throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
        }

        const userRole = req.user.role as UserRole;

        // City admins bypass org check
        if (userRole === 'city_admin') {
            return next();
        }

        // Individual users (vehicle/generator owners) don't have org restrictions
        if (userRole === 'vehicle_owner' || userRole === 'generator_owner') {
            return next();
        }

        // Industry owners must have an org
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
        });

        if (!user || !user.orgId) {
            throw new AppError('Organization required', 403, 'ORG_REQUIRED');
        }

        // Attach orgId to request for downstream use
        req.user.orgId = user.orgId;

        next();
    } catch (error) {
        next(error);
    }
};

// Import prisma for database queries
import { prisma } from '../config/database';
