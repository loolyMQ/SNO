import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminEmail = 'admin@science-map.com';
  const adminExists = await prisma.user.findUnique({ 
    where: { email: adminEmail } 
  });
  
  if (!adminExists) {
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: await bcrypt.hash('admin123', 10),
        name: 'Admin User',
        role: 'ADMIN',
      },
    });
    console.log('Admin user created:', adminUser.email);
  } else {
    console.log('Admin user already exists');
  }

  // Create test user
  const testEmail = 'test@science-map.com';
  const testExists = await prisma.user.findUnique({ 
    where: { email: testEmail } 
  });
  
  if (!testExists) {
    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        password: await bcrypt.hash('test123', 10),
        name: 'Test User',
        role: 'USER',
      },
    });
    console.log('Test user created:', testUser.email);
  } else {
    console.log('Test user already exists');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
