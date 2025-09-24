const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verifyMigration() {
  try {
    console.log('🔍 Verifying database migration...')
    console.log('')

    // Count records
    const settingsCount = await prisma.setting.count()
    const entityMetaCount = await prisma.entityMeta.count()
    const projectsCount = await prisma.project.count()

    console.log('📊 Database Verification:')
    console.log(`   Projects: ${projectsCount}`)
    console.log(`   General Settings: ${settingsCount}`)
    console.log(`   EntityMeta entries: ${entityMetaCount}`)
    console.log('')

    // Show sample EntityMeta entries
    const sampleEntityMeta = await prisma.entityMeta.findMany({
      take: 5
    })

    console.log('📋 Sample EntityMeta entries:')
    sampleEntityMeta.forEach(meta => {
      console.log(`   Project ID ${meta.relId} (${meta.relType}): ${meta.name} = "${meta.value}"`)
    })

    // Show general settings
    const generalSettings = await prisma.setting.findMany()
    console.log('')
    console.log('📋 General Settings:')
    generalSettings.forEach(setting => {
      console.log(`   ${setting.key} (${setting.group}): "${setting.value}"`)
    })

    // Show projects
    const projects = await prisma.project.findMany()
    console.log('')
    console.log('📋 Projects:')
    projects.forEach(project => {
      console.log(`   ${project.name} (${project.key}): ${project.domain}`)
    })

    console.log('')
    console.log('✅ Migration verification completed successfully!')

  } catch (error) {
    console.error('❌ Error verifying migration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyMigration()
