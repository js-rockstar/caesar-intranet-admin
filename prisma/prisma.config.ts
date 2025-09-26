// prisma/prisma.config.ts
import path from 'node:path';
import { PrismaConfig } from 'prisma';

export default {
    schema: path.join('prisma', 'schema.prisma'),
    migrations: {
        path: path.join('prisma', 'migrations'),
        seed: 'tsx prisma/seed.ts',
    },
} satisfies PrismaConfig;