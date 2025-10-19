// lib/prisma.ts
import PrismaPkg from '@prisma/client';

const { PrismaClient } = PrismaPkg;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // log: ['query', 'info', 'warn', 'error'], // opcional
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
