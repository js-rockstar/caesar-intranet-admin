const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedSettings() {
  try {
    console.log('🌱 Seeding settings...')

    const settings = [
      // CRM configuration settings
      { key: 'CENTRAL_CRM_API_ENDPOINT', group: 'centralCrmConfig', value: 'https://api.example.com' },
      { key: 'CENTRAL_CRM_TOKEN', group: 'centralCrmConfig', value: '' },
    ]

    console.log(`📝 Creating ${settings.length} settings...`)

    for (const setting of settings) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value, group: setting.group },
        create: setting,
      })
    }

    console.log('✅ Settings seeded successfully!')
    console.log('')
    console.log('📋 Settings Summary:')
    console.log('   CRM Config settings: 2')
    console.log('   Project settings: Moved to EntityMeta table')
    console.log('   Total settings: 2')
    console.log('')
    console.log('ℹ️  Note: Project settings are now stored in EntityMeta table')

  } catch (error) {
    console.error('❌ Error seeding settings:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedSettings()
