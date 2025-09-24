import {
  getEntityMeta,
  updateEntityMeta,
  getEntityMetaAsObject,
  updateEntityMetaFromObject,
  deleteAllEntityMeta,
  upsertEntityMeta
} from './entity-meta'

/**
 * Site-specific settings utility functions
 * These functions provide a clean interface for managing site settings
 * stored in the EntityMeta table
 */

export interface SiteSettings {
  projectSetupAdminCredentials?: {
    domain: string
    adminEmail: string
    adminPassword: string
  }
  // Add other site-specific settings here as needed
}

/**
 * Get a specific site setting
 * @param siteId - The site ID
 * @param key - The setting key
 * @returns The setting value or null if not found
 */
export async function getSiteSetting(siteId: number, key: string): Promise<string | null> {
  try {
    const result = await getEntityMeta(siteId, 'site', key)
    return result?.metaValue || null
  } catch (error) {
    return null
  }
}

/**
 * Update a specific site setting
 * @param siteId - The site ID
 * @param key - The setting key
 * @param value - The setting value
 * @returns True if successful, false otherwise
 */
export async function updateSiteSetting(siteId: number, key: string, value: string): Promise<boolean> {
  try {
    await updateEntityMeta(siteId, 'site', key, value)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Get all site settings as an object
 * @param siteId - The site ID
 * @returns Object containing all site settings
 */
export async function getAllSiteSettings(siteId: number): Promise<SiteSettings> {
  try {
    const metaObject = await getEntityMetaAsObject(siteId, 'site')
    
    return {
      projectSetupAdminCredentials: metaObject.PROJECT_SETUP_ADMIN_CREDENTIALS 
        ? JSON.parse(metaObject.PROJECT_SETUP_ADMIN_CREDENTIALS) 
        : undefined
    }
  } catch (error) {
    return {}
  }
}

/**
 * Update multiple site settings from an object
 * @param siteId - The site ID
 * @param settings - Object containing settings to update
 * @returns True if successful, false otherwise
 */
export async function updateSiteSettings(siteId: number, settings: Partial<SiteSettings>): Promise<boolean> {
  try {
    const metaObject: Record<string, string> = {}
    
    if (settings.projectSetupAdminCredentials !== undefined) {
      metaObject.PROJECT_SETUP_ADMIN_CREDENTIALS = JSON.stringify(settings.projectSetupAdminCredentials)
    }
    
    await updateEntityMetaFromObject(siteId, 'site', metaObject)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Delete all site settings
 * @param siteId - The site ID
 * @returns True if successful, false otherwise
 */
export async function deleteAllSiteSettings(siteId: number): Promise<boolean> {
  try {
    await deleteAllEntityMeta(siteId, 'site')
    return true
  } catch (error) {
    return false
  }
}

/**
 * Store installation credentials for a site
 * @param siteId - The site ID
 * @param credentials - The installation credentials
 * @returns True if successful, false otherwise
 */
export async function storeInstallationCredentials(
  siteId: number, 
  credentials: { domain: string; adminEmail: string; adminPassword: string }
): Promise<boolean> {
  try {
    return await upsertEntityMeta(siteId, 'site', 'PROJECT_SETUP_ADMIN_CREDENTIALS', JSON.stringify(credentials))
  } catch (error) {
    return false
  }
}

/**
 * Get installation credentials for a site
 * @param siteId - The site ID
 * @returns The installation credentials or null if not found
 */
export async function getInstallationCredentials(siteId: number): Promise<{ domain: string; adminEmail: string; adminPassword: string } | null> {
  try {
    const credentialsJson = await getSiteSetting(siteId, 'PROJECT_SETUP_ADMIN_CREDENTIALS')
    if (!credentialsJson) return null
    
    return JSON.parse(credentialsJson)
  } catch (error) {
    return null
  }
}
