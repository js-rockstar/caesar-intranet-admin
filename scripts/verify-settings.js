const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verifySettings() {
  try {
    console.log('🔍 Verifying settings...')
    console.log('')

    const settings = await prisma.setting.findMany()
    console.log('📋 Settings:')
    settings.forEach(setting => {
      console.log(`   ${setting.key} (${setting.group}): "${setting.value}"`)
    })

    console.log('')
    console.log('✅ Settings verification completed!')

  } catch (error) {
    console.error('❌ Error verifying settings:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifySettings()
