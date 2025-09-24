const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedEntityMeta() {
  try {
    console.log('🌱 Seeding EntityMeta with project settings...')

    // Get all projects
    const projects = await prisma.project.findMany({
      select: { id: true, key: true, name: true }
    })

    console.log(`📊 Found ${projects.length} projects:`, projects.map(p => `${p.name} (${p.key})`))

    // Define the project settings that should be created for each project
    const projectSettings = [
      'CPANEL_DOMAIN',
      'CPANEL_USERNAME', 
      'CPANEL_API_TOKEN',
      'CPANEL_SUBDOMAIN_DIR_PATH',
      'CLOUDFLARE_USERNAME',
      'CLOUDFLARE_API_KEY',
      'CLOUDFLARE_ZONE_ID',
      'CLOUDFLARE_A_RECORD_IP',
      'INSTALLER_API_ENDPOINT',
      'INSTALLER_TOKEN'
    ]

    let totalCreated = 0

    // Create EntityMeta entries for each project
    for (const project of projects) {
      console.log(`\n🔧 Creating settings for project: ${project.name} (${project.key})`)
      
      for (const settingName of projectSettings) {
        await prisma.entityMeta.upsert({
          where: {
            relId_relType_name: {
              relId: project.id,
              relType: 'project',
              name: settingName
            }
          },
          update: {
            value: '', // Empty value by default
            updatedAt: new Date()
          },
          create: {
            relId: project.id,
            relType: 'project',
            name: settingName,
            value: '' // Empty value by default
          }
        })
        
        console.log(`   ✅ ${settingName}`)
        totalCreated++
      }
    }

    console.log('')
    console.log('📊 EntityMeta Seeding Summary:')
    console.log(`   Projects processed: ${projects.length}`)
    console.log(`   Settings per project: ${projectSettings.length}`)
    console.log(`   Total EntityMeta entries: ${totalCreated}`)
    console.log('')
    console.log('✅ EntityMeta seeding completed successfully!')

  } catch (error) {
    console.error('❌ Error seeding EntityMeta:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedEntityMeta()
