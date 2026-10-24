import { type Server } from 'node:http';

import { envVars } from '@/config/env';
import { prisma } from '@/config/prisma.config';
// import { seedMenu } from '@/seed/menu.seed'
// import { ensureSuperAdmin } from '@/seed/superAdmin.seed'
import { initSocket } from '@/utils/socket';

import app from './app';

let server: Server;

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception detected. Shutting down...', error);
  process.exit(1);
});

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
    // await ensureSuperAdmin()
    // await seedMenu()

    server = app.listen(envVars.PORT, () => {
      console.log(`Server is running on PORT: ${envVars.PORT}`);
    });

    initSocket(server);

    server.on('close', () => {
      console.log('HTTP server closed.');
    });

    server.on('error', (error) => {
      console.error('HTTP server error:', error);
    });

    process.on('unhandledRejection', (error) => {
      console.error('Unhandled Rejection detected. Shutting down...', error);
      server.close(() => process.exit(1));
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Server closed.');
      });
    });
  } catch (error) {
    console.error('Error during startup:', error);
    process.exit(1);
  }
}

bootstrap();
