/**
 * EcoTronics Auth Service - Error Handler Middleware
 * Global error handling for consistent API responses
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Log the error
    logger.error(err);

    // Default error response
    let statusCode = 500;
    let message = 'Internal Server Error';
    let errorCode = 'INTERNAL_ERROR';

    // Handle AppError (known operational errors)
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        errorCode = err.errorCode;
    }

    // Handle Zod Validation Errors
    else if (err instanceof ZodError) {
        statusCode = 400;
        message = 'Validation Error';
        errorCode = 'VALIDATION_ERROR';
        // Format Zod errors into a readable object
        const validationErrors = err.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
        }));
        return res.status(statusCode).json({
            success: false,
            error: {
                code: errorCode,
                message,
                details: validationErrors,
            },
        });
    }

    // Handle Prisma Database Errors
    else if (err instanceof Prisma.PrismaClientKnownRequestError) {
        // Unique constraint violation
        if (err.code === 'P2002') {
            statusCode = 409;
            message = 'Resource already exists';
            errorCode = 'RESOURCE_EXISTS';
        }
        // Record not found
        else if (err.code === 'P2025') {
            statusCode = 404;
            message = 'Resource not found';
            errorCode = 'NOT_FOUND';
        }
    }

    // Send response
    res.status(statusCode).json({
        success: false,
        error: {
            code: errorCode,
            message,
        },
    });
};
