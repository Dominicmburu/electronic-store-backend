import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function checkDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('Database connection was successful');
  } catch (error) {
    console.error('Database connection failed', error);
    process.exit(1);
  }
}

checkDatabaseConnection();

export default prisma;