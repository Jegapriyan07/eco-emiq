/**
 * EcoTronics Auth Service - Authentication Controller
 * Handles user registration, login, token refresh, and password management
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { prisma } from '../config/database';
import { JWTService } from '../services/jwt.service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    role: z.enum(['vehicle_owner', 'generator_owner', 'industry_owner', 'city_admin']),
    phone: z.string().optional(),
    orgId: z.string().uuid().optional(),
});

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// ============================================================================
// AUTH CONTROLLER
// ============================================================================

export class AuthController {
    /**
     * @swagger
     * /api/v1/auth/register:
     *   post:
     *     summary: Register a new user
     *     tags: [Authentication]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *               - password
     *               - firstName
     *               - lastName
     *               - role
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *               password:
     *                 type: string
     *                 minLength: 8
     *               firstName:
     *                 type: string
     *               lastName:
     *                 type: string
     *               role:
     *                 type: string
     *                 enum: [vehicle_owner, generator_owner, industry_owner, city_admin]
     *               phone:
     *                 type: string
     *               orgId:
     *                 type: string
     *                 format: uuid
     *     responses:
     *       201:
     *         description: User registered successfully
     *       400:
     *         description: Invalid input
     *       409:
     *         description: Email already exists
     */
    static async register(req: Request, res: Response, next: NextFunction) {
        try {
            // Validate input
            const data = registerSchema.parse(req.body);

            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: data.email },
            });

            if (existingUser) {
                throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
            }

            // Hash password
            const passwordHash = await bcrypt.hash(data.password, 12);

            // Create user
            const user = await prisma.user.create({
                data: {
                    id: uuidv4(),
                    email: data.email,
                    passwordHash,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    role: data.role,
                    phone: data.phone,
                    orgId: data.orgId,
                },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    createdAt: true,
                },
            });

            // Generate tokens
            const accessToken = JWTService.generateAccessToken({
                userId: user.id,
                email: user.email,
                role: user.role,
            });

            const refreshToken = JWTService.generateRefreshToken({
                userId: user.id,
            });

            // Store refresh token
            await prisma.refreshToken.create({
                data: {
                    id: uuidv4(),
                    userId: user.id,
                    token: refreshToken,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                },
            });

            logger.info(`User registered: ${user.email}`);

            res.status(201).json({
                success: true,
                data: {
                    user,
                    accessToken,
                    refreshToken,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @swagger
     * /api/v1/auth/login:
     *   post:
     *     summary: Login user
     *     tags: [Authentication]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *               - password
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *               password:
     *                 type: string
     *     responses:
     *       200:
     *         description: Login successful
     *       401:
     *         description: Invalid credentials
     */
    static async login(req: Request, res: Response, next: NextFunction) {
        try {
            // Validate input
            const data = loginSchema.parse(req.body);

            // Find user
            const user = await prisma.user.findUnique({
                where: { email: data.email },
            });

            if (!user) {
                throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
            }

            // Check if user is active
            if (!user.isActive) {
                throw new AppError('Account is deactivated', 403, 'ACCOUNT_DEACTIVATED');
            }

            // Verify password
            const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

            if (!isPasswordValid) {
                throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
            }

            // Generate tokens
            const accessToken = JWTService.generateAccessToken({
                userId: user.id,
                email: user.email,
                role: user.role,
            });

            const refreshToken = JWTService.generateRefreshToken({
                userId: user.id,
            });

            // Store refresh token
            await prisma.refreshToken.create({
                data: {
                    id: uuidv4(),
                    userId: user.id,
                    token: refreshToken,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                },
            });

            logger.info(`User logged in: ${user.email}`);

            res.json({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role,
                    },
                    accessToken,
                    refreshToken,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @swagger
     * /api/v1/auth/refresh:
     *   post:
     *     summary: Refresh access token
     *     tags: [Authentication]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - refreshToken
     *             properties:
     *               refreshToken:
     *                 type: string
     *     responses:
     *       200:
     *         description: Token refreshed successfully
     *       401:
     *         description: Invalid refresh token
     */
    static async refresh(req: Request, res: Response, next: NextFunction) {
        try {
            // Validate input
            const data = refreshSchema.parse(req.body);

            // Verify refresh token
            const payload = JWTService.verifyRefreshToken(data.refreshToken);

            // Check if token exists in database
            const storedToken = await prisma.refreshToken.findFirst({
                where: {
                    token: data.refreshToken,
                    userId: payload.userId,
                    expiresAt: { gt: new Date() },
                },
                include: {
                    user: true,
                },
            });

            if (!storedToken) {
                throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
            }

            // Generate new access token
            const accessToken = JWTService.generateAccessToken({
                userId: storedToken.user.id,
                email: storedToken.user.email,
                role: storedToken.user.role,
            });

            res.json({
                success: true,
                data: {
                    accessToken,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @swagger
     * /api/v1/auth/logout:
     *   post:
     *     summary: Logout user
     *     tags: [Authentication]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - refreshToken
     *             properties:
     *               refreshToken:
     *                 type: string
     *     responses:
     *       200:
     *         description: Logout successful
     */
    static async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const { refreshToken } = req.body;

            // Delete refresh token
            await prisma.refreshToken.deleteMany({
                where: { token: refreshToken },
            });

            logger.info(`User logged out: ${req.user?.email}`);

            res.json({
                success: true,
                message: 'Logged out successfully',
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @swagger
     * /api/v1/auth/me:
     *   get:
     *     summary: Get current user
     *     tags: [Authentication]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Current user details
     *       401:
     *         description: Unauthorized
     */
    static async me(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user!.userId },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    phone: true,
                    orgId: true,
                    emailVerified: true,
                    createdAt: true,
                },
            });

            if (!user) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            res.json({
                success: true,
                data: { user },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @swagger
     * /api/v1/auth/password:
     *   put:
     *     summary: Change password
     *     tags: [Authentication]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - currentPassword
     *               - newPassword
     *             properties:
     *               currentPassword:
     *                 type: string
     *               newPassword:
     *                 type: string
     *                 minLength: 8
     *     responses:
     *       200:
     *         description: Password changed successfully
     *       401:
     *         description: Invalid current password
     */
    static async changePassword(req: Request, res: Response, next: NextFunction) {
        try {
            // Validate input
            const data = changePasswordSchema.parse(req.body);

            // Get user
            const user = await prisma.user.findUnique({
                where: { id: req.user!.userId },
            });

            if (!user) {
                throw new AppError('User not found', 404, 'USER_NOT_FOUND');
            }

            // Verify current password
            const isPasswordValid = await bcrypt.compare(data.currentPassword, user.passwordHash);

            if (!isPasswordValid) {
                throw new AppError('Invalid current password', 401, 'INVALID_PASSWORD');
            }

            // Hash new password
            const newPasswordHash = await bcrypt.hash(data.newPassword, 12);

            // Update password
            await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: newPasswordHash },
            });

            // Invalidate all refresh tokens
            await prisma.refreshToken.deleteMany({
                where: { userId: user.id },
            });

            logger.info(`Password changed: ${user.email}`);

            res.json({
                success: true,
                message: 'Password changed successfully. Please login again.',
            });
        } catch (error) {
            next(error);
        }
    }
}
