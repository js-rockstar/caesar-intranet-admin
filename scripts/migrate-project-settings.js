const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function migrateProjectSettings() {
  try {
    console.log('🔄 Migrating project settings to EntityMeta...')

    // Get all project settings from the Setting table
    const projectSettings = await prisma.setting.findMany({
      where: { group: 'project' }
    })

    console.log(`📋 Found ${projectSettings.length} project settings to migrate`)

    // Get all projects to map keys to IDs
    const projects = await prisma.project.findMany({
      select: { id: true, key: true }
    })

    const projectKeyToId = {}
    projects.forEach(project => {
      projectKeyToId[project.key] = project.id
    })

    console.log('📊 Project mapping:', projectKeyToId)

    // Process each project setting
    for (const setting of projectSettings) {
      // Extract project key from setting key (e.g., "PROJECT_PHOENIX_CPANEL_DOMAIN" -> "PHOENIX")
      const keyParts = setting.key.split('_')
      if (keyParts.length >= 3 && keyParts[0] === 'PROJECT') {
        const projectKey = keyParts[1]
        const projectId = projectKeyToId[projectKey]

        if (projectId) {
          // Extract the setting name without project prefix (e.g., "CPANEL_DOMAIN")
          const settingName = keyParts.slice(2).join('_')

          // Create EntityMeta entry
          await prisma.entityMeta.upsert({
            where: {
              relId_relType_name: {
                relId: projectId,
                relType: 'project',
                name: settingName
              }
            },
            update: {
              value: setting.value,
              updatedAt: new Date()
            },
            create: {
              relId: projectId,
              relType: 'project',
              name: settingName,
              value: setting.value
            }
          })

          console.log(`✅ Migrated: ${setting.key} -> Project ${projectKey} (ID: ${projectId}) - ${settingName}`)
        } else {
          console.log(`⚠️  Project key "${projectKey}" not found for setting: ${setting.key}`)
        }
      } else {
        console.log(`⚠️  Invalid project setting format: ${setting.key}`)
      }
    }

    // Delete the migrated project settings from Setting table
    const deletedCount = await prisma.setting.deleteMany({
      where: { group: 'project' }
    })

    console.log(`🗑️  Deleted ${deletedCount.count} project settings from Setting table`)

    // Show summary
    const remainingSettings = await prisma.setting.findMany()
    const entityMetaCount = await prisma.entityMeta.count()

    console.log('')
    console.log('📊 Migration Summary:')
    console.log(`   Settings remaining: ${remainingSettings.length}`)
    console.log(`   EntityMeta entries: ${entityMetaCount}`)
    console.log('')
    console.log('✅ Project settings migration completed successfully!')

  } catch (error) {
    console.error('❌ Error migrating project settings:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migrateProjectSettings()
