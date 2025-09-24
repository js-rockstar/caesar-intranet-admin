import {
  getEntityMeta,
  updateEntityMeta,
  getEntityMetaAsObject,
  updateEntityMetaFromObject,
  deleteAllEntityMeta
} from './entity-meta'

/**
 * Project-specific settings utility functions
 * These functions provide a clean interface for managing project settings
 * stored in the EntityMeta table
 */

export interface ProjectSettings {
  cpanelDomain?: string
  cpanelUsername?: string
  cpanelApiToken?: string
  cpanelSubdomainDirPath?: string
  cloudflareUsername?: string
  cloudflareApiKey?: string
  cloudflareZoneId?: string
  cloudflareARecordIp?: string
  installerApiEndpoint?: string
  installerToken?: string
}

/**
 * Get a specific project setting
 * @param projectId - The project ID
 * @param settingName - The setting name (e.g., 'CPANEL_DOMAIN')
 * @returns Promise<string | null> - The setting value or null if not found
 */
export async function getProjectSetting(
  projectId: number,
  settingName: string
): Promise<string | null> {
  return await getEntityMeta(projectId, 'project', settingName)
}

/**
 * Update a specific project setting
 * @param projectId - The project ID
 * @param settingName - The setting name
 * @param value - The new value
 * @returns Promise<boolean> - True if successfully updated
 */
export async function updateProjectSetting(
  projectId: number,
  settingName: string,
  value: string
): Promise<boolean> {
  return await updateEntityMeta(projectId, 'project', settingName, value)
}

/**
 * Get all project settings as an object
 * @param projectId - The project ID
 * @returns Promise<ProjectSettings> - Object with all project settings
 */
export async function getAllProjectSettings(projectId: number): Promise<ProjectSettings> {
  const metaObject = await getEntityMetaAsObject(projectId, 'project')
  
  return {
    cpanelDomain: metaObject.CPANEL_DOMAIN || '',
    cpanelUsername: metaObject.CPANEL_USERNAME || '',
    cpanelApiToken: metaObject.CPANEL_API_TOKEN || '',
    cpanelSubdomainDirPath: metaObject.CPANEL_SUBDOMAIN_DIR_PATH || '',
    cloudflareUsername: metaObject.CLOUDFLARE_USERNAME || '',
    cloudflareApiKey: metaObject.CLOUDFLARE_API_KEY || '',
    cloudflareZoneId: metaObject.CLOUDFLARE_ZONE_ID || '',
    cloudflareARecordIp: metaObject.CLOUDFLARE_A_RECORD_IP || '',
    installerApiEndpoint: metaObject.INSTALLER_API_ENDPOINT || '',
    installerToken: metaObject.INSTALLER_TOKEN || '',
  }
}

/**
 * Update multiple project settings at once
 * @param projectId - The project ID
 * @param settings - Object with setting names as keys and values as values
 * @returns Promise<boolean> - True if all updates were successful
 */
export async function updateProjectSettings(
  projectId: number,
  settings: Partial<ProjectSettings>
): Promise<boolean> {
  const metaObject: Record<string, string> = {}
  
  // Convert camelCase settings to UPPER_CASE meta keys
  if (settings.cpanelDomain !== undefined) metaObject.CPANEL_DOMAIN = settings.cpanelDomain
  if (settings.cpanelUsername !== undefined) metaObject.CPANEL_USERNAME = settings.cpanelUsername
  if (settings.cpanelApiToken !== undefined) metaObject.CPANEL_API_TOKEN = settings.cpanelApiToken
  if (settings.cpanelSubdomainDirPath !== undefined) metaObject.CPANEL_SUBDOMAIN_DIR_PATH = settings.cpanelSubdomainDirPath
  if (settings.cloudflareUsername !== undefined) metaObject.CLOUDFLARE_USERNAME = settings.cloudflareUsername
  if (settings.cloudflareApiKey !== undefined) metaObject.CLOUDFLARE_API_KEY = settings.cloudflareApiKey
  if (settings.cloudflareZoneId !== undefined) metaObject.CLOUDFLARE_ZONE_ID = settings.cloudflareZoneId
  if (settings.cloudflareARecordIp !== undefined) metaObject.CLOUDFLARE_A_RECORD_IP = settings.cloudflareARecordIp
  if (settings.installerApiEndpoint !== undefined) metaObject.INSTALLER_API_ENDPOINT = settings.installerApiEndpoint
  if (settings.installerToken !== undefined) metaObject.INSTALLER_TOKEN = settings.installerToken
  
  return await updateEntityMetaFromObject(projectId, 'project', metaObject)
}

/**
 * Reset all project settings (delete all and recreate with defaults)
 * @param projectId - The project ID
 * @returns Promise<boolean> - True if successfully reset
 */
export async function resetProjectSettings(projectId: number): Promise<boolean> {
  try {
    // Delete all existing settings
    await deleteAllEntityMeta(projectId, 'project')
    
    // Create default empty settings
    const defaultSettings: Record<string, string> = {
      CPANEL_DOMAIN: '',
      CPANEL_USERNAME: '',
      CPANEL_API_TOKEN: '',
      CLOUDFLARE_USERNAME: '',
      CLOUDFLARE_API_KEY: '',
      CLOUDFLARE_ZONE_ID: '',
      CLOUDFLARE_A_RECORD_IP: '',
      INSTALLER_API_ENDPOINT: '',
      INSTALLER_TOKEN: '',
    }
    
    return await updateEntityMetaFromObject(projectId, 'project', defaultSettings)
  } catch (error) {
    return false
  }
}

/**
 * Validate project settings (check if required settings are filled)
 * @param projectId - The project ID
 * @returns Promise<{ isValid: boolean; missingSettings: string[] }> - Validation result
 */
export async function validateProjectSettings(projectId: number): Promise<{
  isValid: boolean
  missingSettings: string[]
}> {
  const settings = await getAllProjectSettings(projectId)
  const requiredSettings = [
    'cpanelDomain',
    'cpanelUsername', 
    'cpanelApiToken',
    'cloudflareUsername',
    'cloudflareApiKey',
    'cloudflareZoneId',
    'cloudflareARecordIp'
  ]
  
  const missingSettings: string[] = []
  
  for (const setting of requiredSettings) {
    const value = settings[setting as keyof ProjectSettings]
    if (!value || value.trim() === '') {
      missingSettings.push(setting)
    }
    
  }
  
  return {
    isValid: missingSettings.length === 0,
    missingSettings
  }
}
