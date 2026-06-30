/**
 * EcoTronics Auth Service - Authentication Middleware
 * JWT verification and user context injection
 */

import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/jwt.service';
import { AppError } from '../utils/errors';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                email: string;
                role: string;
            };
        }
    }
}

/**
 * Middleware to verify JWT access token
 */
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('No token provided', 401, 'NO_TOKEN');
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = JWTService.verifyAccessToken(token);

        // Attach user to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
        };

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = JWTService.verifyAccessToken(token);

            req.user = {
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role,
            };
        }

        next();
    } catch (error) {
        // Ignore auth errors for optional auth
        next();
    }
};
