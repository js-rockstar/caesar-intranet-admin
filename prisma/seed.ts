import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create or update admin user
  const hashedPassword = await bcrypt.hash('admin', 12)
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'rockstar22115@gmail.com' },
    update: {
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
    create: {
      email: 'rockstar22115@gmail.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  console.log('✅ Admin user created:', {
    id: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    role: adminUser.role,
  })


  // Create projects
  const projects = [
    { name: 'Phoenix', key: 'PHOENIX', domain: 'bmspoint.net', status: true },
    { name: 'Bmswise', key: 'BMSWISE', domain: 'bmswise.net', status: true },
    { name: 'Immowise', key: 'IMMOWISE', domain: 'immowise.net', status: true },
  ]

  const createdProjects = []
  for (const projectData of projects) {
    const project = await prisma.project.upsert({
      where: { key: projectData.key },
      update: {
        name: projectData.name,
        domain: projectData.domain,
        status: projectData.status,
      },
      create: projectData,
    })
    createdProjects.push(project)
    console.log('✅ Project created/updated:', {
      id: project.id,
      name: project.name,
    })
  }


  console.log('🎉 Database seeding completed successfully!')
  console.log('')
  console.log('📋 Login Credentials:')
  console.log('   Email: rockstar22115@gmail.com')
  console.log('   Password: admin')
  console.log('')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
