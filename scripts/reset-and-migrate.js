const { execSync } = require('child_process')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function resetAndMigrate() {
  try {
    console.log('🔄 Starting database reset and migration process...')
    console.log('')

    // Step 1: Reset the database
    console.log('1️⃣ Resetting database...')
    try {
      execSync('npx prisma db push --force-reset', { stdio: 'inherit' })
      console.log('✅ Database reset completed')
    } catch (error) {
      console.error('❌ Error resetting database:', error.message)
      throw error
    }
    console.log('')

    // Step 2: Generate Prisma client
    console.log('2️⃣ Generating Prisma client...')
    try {
      execSync('npx prisma generate', { stdio: 'inherit' })
      console.log('✅ Prisma client generated')
    } catch (error) {
      console.error('❌ Error generating Prisma client:', error.message)
      throw error
    }
    console.log('')

    // Step 3: Seed projects
    console.log('3️⃣ Seeding projects...')
    try {
      execSync('node scripts/seed-projects.js', { stdio: 'inherit' })
      console.log('✅ Projects seeded')
    } catch (error) {
      console.error('❌ Error seeding projects:', error.message)
      throw error
    }
    console.log('')

    // Step 4: Seed general settings
    console.log('4️⃣ Seeding general settings...')
    try {
      execSync('node scripts/seed-settings.js', { stdio: 'inherit' })
      console.log('✅ General settings seeded')
    } catch (error) {
      console.error('❌ Error seeding settings:', error.message)
      throw error
    }
    console.log('')

    // Step 5: Seed EntityMeta with project settings
    console.log('5️⃣ Seeding EntityMeta with project settings...')
    try {
      execSync('node scripts/seed-entity-meta.js', { stdio: 'inherit' })
      console.log('✅ EntityMeta seeded')
    } catch (error) {
      console.error('❌ Error seeding EntityMeta:', error.message)
      throw error
    }
    console.log('')

    // Step 6: Verify the migration
    console.log('6️⃣ Verifying migration...')
    try {
      const settingsCount = await prisma.setting.count()
      const entityMetaCount = await prisma.entityMeta.count()
      const projectsCount = await prisma.project.count()

      console.log('📊 Migration Verification:')
      console.log(`   Projects: ${projectsCount}`)
      console.log(`   General Settings: ${settingsCount}`)
      console.log(`   EntityMeta entries: ${entityMetaCount}`)
      console.log('')

      // Show sample EntityMeta entries
      const sampleEntityMeta = await prisma.entityMeta.findMany({
        take: 5,
        include: {
          // Note: We can't include the actual project relation since it's not defined in schema
          // But we can show the relId and relType
        }
      })

      console.log('📋 Sample EntityMeta entries:')
      sampleEntityMeta.forEach(meta => {
        console.log(`   Project ID ${meta.relId} (${meta.relType}): ${meta.name} = "${meta.value}"`)
      })

      console.log('')
      console.log('✅ Migration verification completed successfully!')

    } catch (error) {
      console.error('❌ Error verifying migration:', error.message)
      throw error
    }

    console.log('')
    console.log('🎉 Database reset and migration completed successfully!')
    console.log('')
    console.log('📋 Summary of changes:')
    console.log('   ✅ Created EntityMeta table')
    console.log('   ✅ Added createdAt/updatedAt to Setting table')
    console.log('   ✅ Added importedContactId to Contact table')
    console.log('   ✅ Added installerSiteId to Site table')
    console.log('   ✅ Migrated project settings to EntityMeta')
    console.log('   ✅ All updatedAt fields now auto-update on changes')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetAndMigrate()
