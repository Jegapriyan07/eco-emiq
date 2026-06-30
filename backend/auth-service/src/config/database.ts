/**
 * EcoTronics Auth Service - Database Configuration
 * Initializes and exports the Prisma Client instance
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Prevent multiple instances of Prisma Client in development
declare global {
    var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
    return new PrismaClient({
        log: [
            {
                emit: 'event',
                level: 'query',
            },
            {
                emit: 'stdout',
                level: 'error',
            },
            {
                emit: 'stdout',
                level: 'info',
            },
            {
                emit: 'stdout',
                level: 'warn',
            },
        ],
    });
};

const prisma = globalThis.prisma ?? prismaClientSingleton();

// Log queries in development
if (process.env.NODE_ENV !== 'production') {
    prisma.$on('query', (e) => {
        // Only log slow queries or specific types if needed
        // logger.debug(`Query: ${e.query} Duration: ${e.duration}ms`);
    });
}

export { prisma };

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}
