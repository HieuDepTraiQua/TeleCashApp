// Prisma client dùng chung + các hàm repo + seed.
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export { PrismaClient } from "@prisma/client";
export type { User, Transaction, Category, Keyword } from "@prisma/client";
export * from "./repo";
export * from "./seed";
