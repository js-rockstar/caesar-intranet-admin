// deploy.ts
import * as dotenv from 'dotenv';
import {execSync} from 'child_process';
import {resolve} from 'path';

// Determine environment
const env = process.env.NODE_ENV || 'development';
console.log(`🌐 Deploying for environment: ${env}`);

// Load environment variables
// Priority: GitLab CI/CD variables > local .env files
const envFile = resolve(process.cwd(), `.env.${env}`);
dotenv.config({path: envFile});

// Helper to run shell commands
function run(cmd: string) {
    console.log(`\n> Running: ${cmd}`);
    try {
        execSync(cmd, {stdio: 'inherit'});
    } catch (err) {
        console.error(`❌ Command failed: ${cmd}`);
        process.exit(1);
    }
}

// 1️⃣ Run Prisma migrations
run('npx prisma migrate deploy');

// 2️⃣ Generate Prisma client
run('npx prisma generate');

// 3️⃣ Build Next.js app
run('npm run build');

console.log(`✅ Deployment finished for environment: ${env}`);
