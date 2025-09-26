import {
  getSetting,
  updateSetting,
  getSettingsAsObject,
  updateSettingsFromObject,
  validateSettings
} from './settings'

/**
 * CRM-specific settings utility functions
 * These functions provide a clean interface for managing CRM configuration settings
 * stored in the Setting table with the 'centralCrmConfig' group
 */

export interface CrmSettings {
  apiEndpoint?: string
  token?: string
}

/**
 * Get a specific CRM setting
 * @param settingName - The setting name (e.g., 'CENTRAL_CRM_API_ENDPOINT')
 * @returns Promise<string | null> - The setting value or null if not found
 */
export async function getCrmSetting(settingName: string): Promise<string | null> {
  return await getSetting(settingName)
}

/**
 * Update a specific CRM setting
 * @param settingName - The setting name
 * @param value - The new value
 * @returns Promise<boolean> - True if successfully updated
 */
export async function updateCrmSetting(
  settingName: string,
  value: string
): Promise<boolean> {
  return await updateSetting(settingName, value, 'centralCrmConfig')
}

/**
 * Get all CRM settings as an object
 * @returns Promise<CrmSettings> - Object with all CRM settings
 */
export async function getAllCrmSettings(): Promise<CrmSettings> {
  const settingsObject = await getSettingsAsObject('centralCrmConfig')
  
  return {
    apiEndpoint: settingsObject.CENTRAL_CRM_API_ENDPOINT || '',
    token: settingsObject.CENTRAL_CRM_TOKEN || '',
  }
}

/**
 * Update multiple CRM settings at once
 * @param settings - Object with setting names as keys and values as values
 * @returns Promise<boolean> - True if all updates were successful
 */
export async function updateCrmSettings(settings: Partial<CrmSettings>): Promise<boolean> {
  const settingsObject: Record<string, string> = {}
  
  // Convert camelCase settings to UPPER_CASE setting keys
  if (settings.apiEndpoint !== undefined) {
    settingsObject.CENTRAL_CRM_API_ENDPOINT = settings.apiEndpoint
  }
  if (settings.token !== undefined) {
    settingsObject.CENTRAL_CRM_TOKEN = settings.token
  }
  
  return await updateSettingsFromObject(settingsObject, 'centralCrmConfig')
}

/**
 * Validate that all required CRM settings are filled
 * @returns Promise<{ isValid: boolean; missingSettings: string[]; emptySettings: string[] }> - Validation result
 */
export async function validateCrmSettings(): Promise<{
  isValid: boolean
  missingSettings: string[]
  emptySettings: string[]
}> {
  const requiredSettings = [
    'CENTRAL_CRM_API_ENDPOINT',
    'CENTRAL_CRM_TOKEN'
  ]
  
  return await validateSettings(requiredSettings)
}

/**
 * Test CRM connection using provided settings or current settings
 * Tests the /test endpoint using 'authtoken' header
 * Handles both success ({ status: true, message: 'Working' }) and error ({ status: false, message: 'Error description' }) responses
 * @param apiEndpoint - Optional API endpoint to test (if not provided, uses current settings)
 * @param token - Optional token to test (if not provided, uses current settings)
 * @returns Promise<{ success: boolean; message?: string; data?: any }> - Connection test result
 */
export async function testCrmConnection(
  apiEndpoint?: string, 
  token?: string
): Promise<{ success: boolean; message?: string; data?: any }> {
  try {
    let endpoint: string
    let authToken: string
    
    if (apiEndpoint && token) {
      // Use provided parameters
      endpoint = apiEndpoint
      authToken = token
    } else {
      // Use current settings
      const settings = await getAllCrmSettings()
      
      if (!settings.apiEndpoint || !settings.token) {
        return {
          success: false,
          message: 'CRM API endpoint or token is not configured'
        }
      }
      
      endpoint = settings.apiEndpoint
      authToken = settings.token
    }
    
    // Set SSL environment variable globally for this request
    const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    
    try {
      // Test the connection by making a request to the test endpoint
      const response = await fetch(`${endpoint}test`, {
        method: 'GET',
        headers: {
          'authtoken': authToken,
          'Content-Type': 'application/json',
          'User-Agent': 'Caesar-Intranet/1.0',
          'Accept': 'application/json'
        },
        // Add timeout for faster testing
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      if (response.ok) {
        const data = await response.json()
        // Expected response format: { status: true, message: 'Working' } or { status: false, message: 'Error message' }
        if (data.status === true) {
          return { 
            success: true, 
            message: data.message || 'CRM connection successful',
            data: data
          }
        } else {
          return {
            success: false,
            message: data.message || 'CRM returned unsuccessful status'
          }
        }
      } else {
        // Try to get error message from response body
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          if (errorData.message) {
            errorMessage = errorData.message
          }
        } catch {
          // If response is not JSON, use the default error message
        }
        
        return {
          success: false,
          message: errorMessage
        }
      }
    } catch (error) {
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            message: 'Connection timeout - CRM server did not respond within 10 seconds'
          }
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
          return {
            success: false,
            message: 'Cannot connect to CRM server - check the API endpoint URL'
          }
        } else if (error.message.includes('CERT_HAS_EXPIRED') || error.message.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE')) {
          return {
            success: false,
            message: 'SSL certificate error - CRM server has invalid or expired certificate'
          }
        }
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      }
    } finally {
      // Restore original SSL setting
      if (originalRejectUnauthorized !== undefined) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized
      } else {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
      }
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Get CRM API endpoint
 * @returns Promise<string | null> - The CRM API endpoint or null if not configured
 */
export async function getCrmApiEndpoint(): Promise<string | null> {
  return await getCrmSetting('CENTRAL_CRM_API_ENDPOINT')
}

/**
 * Get CRM API token
 * @returns Promise<string | null> - The CRM API token or null if not configured
 */
export async function getCrmApiToken(): Promise<string | null> {
  return await getCrmSetting('CENTRAL_CRM_TOKEN')
}

/**
 * Check if CRM is properly configured
 * @returns Promise<boolean> - True if both endpoint and token are configured
 */
export async function isCrmConfigured(): Promise<boolean> {
  const validation = await validateCrmSettings()
  return validation.isValid
}
