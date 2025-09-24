import { prisma } from '@/lib/prisma'

/**
 * Settings utility functions for managing application settings
 * These functions provide a clean interface for managing settings stored in the Setting table
 */

export interface Setting {
  id: number
  key: string
  group: string
  value: string
  createdAt: Date
  updatedAt: Date
}

export interface SettingInput {
  key: string
  group: string
  value: string
}

/**
 * Check if a setting key exists
 * @param key - The setting key
 * @returns Promise<boolean> - True if the setting exists
 */
export async function settingKeyExists(key: string): Promise<boolean> {
  try {
    if (!key) {
      return false
    }

    const count = await prisma.setting.count({
      where: { key },
    })

    return count > 0
  } catch (error) {
    return false
  }
}

/**
 * Get a single setting value
 * @param key - The setting key
 * @returns Promise<string | null> - The setting value or null if not found
 */
export async function getSetting(key: string): Promise<string | null> {
  try {
    if (!key) {
      return null
    }

    const setting = await prisma.setting.findUnique({
      where: { key },
      select: { value: true },
    })

    return setting?.value || null
  } catch (error) {
    return null
  }
}

/**
 * Get a setting with full details
 * @param key - The setting key
 * @returns Promise<Setting | null> - The setting object or null if not found
 */
export async function getSettingDetails(key: string): Promise<Setting | null> {
  try {
    if (!key) {
      return null
    }

    const setting = await prisma.setting.findUnique({
      where: { key },
    })

    return setting
  } catch (error) {
    return null
  }
}

/**
 * Get all settings for a specific group
 * @param group - The setting group
 * @returns Promise<Setting[]> - Array of settings in the group
 */
export async function getSettingsByGroup(group: string): Promise<Setting[]> {
  try {
    if (!group) {
      return []
    }

    const settings = await prisma.setting.findMany({
      where: { group },
      orderBy: { key: 'asc' },
    })

    return settings
  } catch (error) {
    return []
  }
}

/**
 * Get all settings
 * @returns Promise<Setting[]> - Array of all settings
 */
export async function getAllSettings(): Promise<Setting[]> {
  try {
    const settings = await prisma.setting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    })

    return settings
  } catch (error) {
    return []
  }
}

/**
 * Add a new setting
 * @param key - The setting key
 * @param group - The setting group
 * @param value - The setting value
 * @returns Promise<boolean> - True if successfully added
 */
export async function addSetting(
  key: string,
  group: string,
  value: string
): Promise<boolean> {
  try {
    if (!key || !group) {
      return false
    }

    // Check if the setting already exists
    const exists = await settingKeyExists(key)
    if (exists) {
      return false // Key already exists, use updateSetting instead
    }

    await prisma.setting.create({
      data: {
        key,
        group,
        value,
      },
    })

    return true
  } catch (error) {
    return false
  }
}

/**
 * Update an existing setting
 * @param key - The setting key
 * @param value - The new value
 * @param group - Optional new group (if not provided, keeps existing group)
 * @returns Promise<boolean> - True if successfully updated
 */
export async function updateSetting(
  key: string,
  value: string,
  group?: string
): Promise<boolean> {
  try {
    if (!key) {
      return false
    }

    // Check if the setting exists
    const exists = await settingKeyExists(key)
    
    if (!exists) {
      // Setting doesn't exist, create it if group is provided
      if (group) {
        return await addSetting(key, group, value)
      }
      return false
    }

    const updateData: { value: string; group?: string; updatedAt: Date } = {
      value,
      updatedAt: new Date(),
    }

    if (group) {
      updateData.group = group
    }

    await prisma.setting.update({
      where: { key },
      data: updateData,
    })

    return true
  } catch (error) {
    return false
  }
}

/**
 * Delete a setting
 * @param key - The setting key
 * @returns Promise<boolean> - True if successfully deleted
 */
export async function deleteSetting(key: string): Promise<boolean> {
  try {
    if (!key) {
      return false
    }

    // Check if the setting exists
    const exists = await settingKeyExists(key)
    if (!exists) {
      return false // Setting doesn't exist
    }

    await prisma.setting.delete({
      where: { key },
    })

    return true
  } catch (error) {
    return false
  }
}

/**
 * Upsert a setting (add if doesn't exist, update if exists)
 * @param key - The setting key
 * @param group - The setting group
 * @param value - The setting value
 * @returns Promise<boolean> - True if successfully upserted
 */
export async function upsertSetting(
  key: string,
  group: string,
  value: string
): Promise<boolean> {
  try {
    if (!key || !group) {
      return false
    }

    await prisma.setting.upsert({
      where: { key },
      update: {
        value,
        group,
        updatedAt: new Date(),
      },
      create: {
        key,
        group,
        value,
      },
    })

    return true
  } catch (error) {
    return false
  }
}

/**
 * Delete all settings in a specific group
 * @param group - The setting group
 * @returns Promise<number> - Number of deleted settings
 */
export async function deleteSettingsByGroup(group: string): Promise<number> {
  try {
    if (!group) {
      return 0
    }

    const result = await prisma.setting.deleteMany({
      where: { group },
    })

    return result.count
  } catch (error) {
    return 0
  }
}

/**
 * Get settings as a key-value object for a specific group
 * @param group - The setting group
 * @returns Promise<Record<string, string>> - Object with setting keys as keys and values as values
 */
export async function getSettingsAsObject(group: string): Promise<Record<string, string>> {
  try {
    if (!group) {
      return {}
    }

    const settings = await getSettingsByGroup(group)
    
    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)
  } catch (error) {
    return {}
  }
}

/**
 * Get all settings as a key-value object
 * @returns Promise<Record<string, string>> - Object with all setting keys and values
 */
export async function getAllSettingsAsObject(): Promise<Record<string, string>> {
  try {
    const settings = await getAllSettings()
    
    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)
  } catch (error) {
    return {}
  }
}

/**
 * Bulk update settings from an object
 * @param settingsObject - Object with setting keys and values
 * @param group - Optional group to assign to new settings
 * @returns Promise<boolean> - True if all updates were successful
 */
export async function updateSettingsFromObject(
  settingsObject: Record<string, string>,
  group?: string
): Promise<boolean> {
  try {
    if (!settingsObject) {
      return false
    }

    const promises = Object.entries(settingsObject).map(([key, value]) => {
      if (group) {
        return upsertSetting(key, group, value)
      } else {
        return updateSetting(key, value)
      }
    })

    const results = await Promise.all(promises)
    return results.every(result => result === true)
  } catch (error) {
    return false
  }
}

/**
 * Get settings grouped by group name
 * @returns Promise<Record<string, Setting[]>> - Object with group names as keys and settings arrays as values
 */
export async function getSettingsGrouped(): Promise<Record<string, Setting[]>> {
  try {
    const settings = await getAllSettings()
    
    return settings.reduce((acc, setting) => {
      if (!acc[setting.group]) {
        acc[setting.group] = []
      }
      acc[setting.group].push(setting)
      return acc
    }, {} as Record<string, Setting[]>)
  } catch (error) {
    return {}
  }
}

/**
 * Validate that required settings exist and have values
 * @param requiredKeys - Array of required setting keys
 * @returns Promise<{ isValid: boolean; missingSettings: string[]; emptySettings: string[] }> - Validation result
 */
export async function validateSettings(requiredKeys: string[]): Promise<{
  isValid: boolean
  missingSettings: string[]
  emptySettings: string[]
}> {
  try {
    const missingSettings: string[] = []
    const emptySettings: string[] = []
    
    for (const key of requiredKeys) {
      const value = await getSetting(key)
      if (value === null) {
        missingSettings.push(key)
      } else if (value.trim() === '') {
        emptySettings.push(key)
      }
    }
    
    return {
      isValid: missingSettings.length === 0 && emptySettings.length === 0,
      missingSettings,
      emptySettings
    }
  } catch (error) {
    return {
      isValid: false,
      missingSettings: requiredKeys,
      emptySettings: []
    }
  }
}
