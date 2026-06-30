/**
 * EcoTronics Auth Service - JWT Service
 * Handles JWT token generation and verification
 */

import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';

export interface AccessTokenPayload {
    userId: string;
    email: string;
    role: string;
}

export interface RefreshTokenPayload {
    userId: string;
}

export interface DecodedAccessToken extends AccessTokenPayload {
    iat: number;
    exp: number;
}

export interface DecodedRefreshToken extends RefreshTokenPayload {
    iat: number;
    exp: number;
}

export class JWTService {
    private static readonly ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret-change-in-production';
    private static readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production';
    private static readonly ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
    private static readonly REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

    /**
     * Generate access token (short-lived)
     */
    static generateAccessToken(payload: AccessTokenPayload): string {
        return jwt.sign(payload, this.ACCESS_TOKEN_SECRET, {
            expiresIn: this.ACCESS_TOKEN_EXPIRY,
            issuer: 'ecotronics-auth',
            audience: 'ecotronics-api',
        });
    }

    /**
     * Generate refresh token (long-lived)
     */
    static generateRefreshToken(payload: RefreshTokenPayload): string {
        return jwt.sign(payload, this.REFRESH_TOKEN_SECRET, {
            expiresIn: this.REFRESH_TOKEN_EXPIRY,
            issuer: 'ecotronics-auth',
            audience: 'ecotronics-api',
        });
    }

    /**
     * Verify access token
     */
    static verifyAccessToken(token: string): DecodedAccessToken {
        try {
            const decoded = jwt.verify(token, this.ACCESS_TOKEN_SECRET, {
                issuer: 'ecotronics-auth',
                audience: 'ecotronics-api',
            }) as DecodedAccessToken;

            return decoded;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new AppError('Access token expired', 401, 'TOKEN_EXPIRED');
            } else if (error instanceof jwt.JsonWebTokenError) {
                throw new AppError('Invalid access token', 401, 'INVALID_TOKEN');
            }
            throw error;
        }
    }

    /**
     * Verify refresh token
     */
    static verifyRefreshToken(token: string): DecodedRefreshToken {
        try {
            const decoded = jwt.verify(token, this.REFRESH_TOKEN_SECRET, {
                issuer: 'ecotronics-auth',
                audience: 'ecotronics-api',
            }) as DecodedRefreshToken;

            return decoded;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new AppError('Refresh token expired', 401, 'REFRESH_TOKEN_EXPIRED');
            } else if (error instanceof jwt.JsonWebTokenError) {
                throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
            }
            throw error;
        }
    }

    /**
     * Decode token without verification (for debugging)
     */
    static decode(token: string): any {
        return jwt.decode(token);
    }
}
