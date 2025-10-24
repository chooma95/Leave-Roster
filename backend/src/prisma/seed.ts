import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@roster.local' },
    update: {},
    create: {
      email: 'admin@roster.local',
      password: adminPassword,
      role: 'ADMIN',
      staff: {
        create: {
          name: 'Admin User',
          status: 'ACTIVE',
          scheduleType: 'FIXED',
          workDays: JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
        },
      },
    },
  });

  console.log('✅ Created admin user:', admin.email);
  console.log('   Password: admin123');

  // Create a few test staff members
  const staff1Password = await bcrypt.hash('staff123', 10);
  const staff1 = await prisma.user.upsert({
    where: { email: 'staff1@roster.local' },
    update: {},
    create: {
      email: 'staff1@roster.local',
      password: staff1Password,
      role: 'STAFF',
      staff: {
        create: {
          name: 'John Smith',
          status: 'ACTIVE',
          scheduleType: 'FIXED',
          workDays: JSON.stringify(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
        },
      },
    },
  });

  const staff2Password = await bcrypt.hash('staff123', 10);
  const staff2 = await prisma.user.upsert({
    where: { email: 'staff2@roster.local' },
    update: {},
    create: {
      email: 'staff2@roster.local',
      password: staff2Password,
      role: 'STAFF',
      staff: {
        create: {
          name: 'Jane Doe',
          status: 'ACTIVE',
          scheduleType: 'ALTERNATING',
          week1Days: JSON.stringify(['monday', 'wednesday', 'friday']),
          week2Days: JSON.stringify(['tuesday', 'thursday']),
        },
      },
    },
  });

  console.log('✅ Created test staff:', staff1.email, staff2.email);
  console.log('   Password: staff123');
  console.log('');
  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
