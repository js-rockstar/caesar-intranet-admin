const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedProjects() {
  try {
    console.log('🌱 Seeding projects...')

    const projects = [
      { name: 'Phoenix', key: 'PHOENIX', domain: 'bmspoint.net', status: true },
      { name: 'Bmswise', key: 'BMSWISE', domain: 'bmswise.net', status: true },
      { name: 'Immowise', key: 'IMMOWISE', domain: 'immowise.net', status: true },
    ]

    console.log(`📝 Creating ${projects.length} projects...`)

    for (const projectData of projects) {
      const project = await prisma.project.upsert({
        where: { key: projectData.key },
        update: {
          name: projectData.name,
          domain: projectData.domain,
          status: projectData.status,
          updatedAt: new Date()
        },
        create: projectData,
      })
      
      console.log(`✅ Project: ${project.name} (${project.key}) - ${project.domain}`)
    }

    console.log('')
    console.log('📊 Projects Summary:')
    console.log('   Total projects: 3')
    console.log('   - Phoenix (PHOENIX) - bmspoint.net')
    console.log('   - Bmswise (BMSWISE) - bmswise.net')
    console.log('   - Immowise (IMMOWISE) - immowise.net')
    console.log('')
    console.log('✅ Projects seeded successfully!')

  } catch (error) {
    console.error('❌ Error seeding projects:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedProjects()
