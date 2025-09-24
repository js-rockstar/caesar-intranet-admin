export interface CpanelConfig {
  domain: string
  username: string
  apiToken: string
  subdomainDirPath?: string
}

export interface SubdomainData {
  subdomain: string
  domain: string
  dir?: string
}

export class CpanelService {
  private config: CpanelConfig
  private baseUrl: string

  constructor(config: CpanelConfig) {
    this.config = config
    this.baseUrl = `https://${config.domain}:2083/execute`
  }

  private async makeRequest(module: string, functionName: string, params: Record<string, any> = {}): Promise<any> {
    try {
      let url = `${this.baseUrl}/${module}/${functionName}`
      
      if (Object.keys(params).length > 0) {
        const queryParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          queryParams.append(key, String(value))
        })
        url += '?' + queryParams.toString()
      }

      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `cpanel ${this.config.username}:${this.config.apiToken}`,
          'cache-control': 'no-cache',
        },
      })
      
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        const responseText = await response.text()
        return {
          success: false,
          error: 'Invalid JSON response',
          message: `cPanel API returned invalid JSON: ${responseText}`
        }
      }

      if (data.errors && data.errors.length > 0) {
        const errorMessage = Array.isArray(data.errors) ? data.errors.join('; ') : data.errors
        return {
          success: false,
          error: errorMessage,
          message: `cPanel API error: ${errorMessage}`
        }
      }

      if (data.warnings && data.warnings.length > 0) {
        const warningMessage = Array.isArray(data.warnings) ? data.warnings.join('; ') : data.warnings
      }

      if (data.status !== undefined) {
        if (data.status === 1) {
          return {
            success: true,
            data: data.data,
            message: data.messages ? (Array.isArray(data.messages) ? data.messages.join('; ') : data.messages) : 'Operation completed successfully'
          }
        } else if (data.status === 0) {
          return {
            success: false,
            error: data.messages ? (Array.isArray(data.messages) ? data.messages.join('; ') : data.messages) : 'Operation failed',
            message: `Operation failed: ${data.messages ? (Array.isArray(data.messages) ? data.messages.join('; ') : data.messages) : 'Operation failed'}`
          }
        } else {
          return {
            success: false,
            error: `Unexpected status code: ${data.status}`,
            message: `Operation failed with status: ${data.status}`
          }
        }
      }

      if (data.result && data.result.length > 0) {
        const result = data.result[0]
        if (result.status === 1) {
          return {
            success: true,
            data: result.data,
            message: result.message || 'Operation completed successfully'
          }
        } else if (result.status === 0) {
          return {
            success: false,
            error: result.message || 'Operation failed',
            message: `Operation failed: ${result.message || 'Operation failed'}`
          }
        } else {
          return {
            success: false,
            error: `Unexpected status code: ${result.status}`,
            message: `Operation failed with status: ${result.status}`
          }
        }
      }

      return {
        success: false,
        error: 'Invalid response format',
        message: `Invalid response from cPanel API. Expected format with status/errors fields, got: ${JSON.stringify(data)}`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to communicate with cPanel API: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Add a subdomain
   */
  async addSubdomain(subdomain: string, domain: string, dir?: string): Promise<any> {
    const params: Record<string, any> = {
      domain: subdomain,
      rootdomain: domain,
      canoff: 0,
      disallowdot: 0,
    }

    // Use provided dir or construct from config subdomainDirPath
    if (dir) {
      params.dir = dir
    } else if (this.config.subdomainDirPath) {
      // Construct the directory path: subdomainDirPath + subdomain
      params.dir = `${this.config.subdomainDirPath}${subdomain}`
    }

    return await this.makeRequest('SubDomain', 'addsubdomain', params)
  }

  /**
   * List all subdomains
   */
  async listSubdomains(): Promise<any> {
    return await this.makeRequest('SubDomain', 'list_subdomains')
  }

  /**
   * Check if a subdomain exists
   */
  async checkSubdomain(subdomain: string, domain: string): Promise<any> {
    const result = await this.listSubdomains()
    
    if (!result.success) {
      return result
    }

    const subdomains = result.data || []
    const fullSubdomain = `${subdomain}.${domain}`
    const exists = subdomains.some((sub: any) => sub.domain === fullSubdomain)

    return {
      success: true,
      exists: exists,
      data: exists ? subdomains.find((sub: any) => sub.domain === fullSubdomain) : null,
      message: exists 
        ? `Subdomain ${fullSubdomain} exists`
        : `Subdomain ${fullSubdomain} does not exist`
    }
  }

  /**
   * Delete a subdomain
   */
  async deleteSubdomain(subdomain: string, domain: string): Promise<any> {
    const params = {
      domain: subdomain,
      rootdomain: domain,
    }

    return await this.makeRequest('SubDomain', 'delsubdomain', params)
  }

  /**
   * Create a directory
   */
  async createDirectory(path: string): Promise<any> {
    const params = {
      dir: path,
    }

    return await this.makeRequest('Fileman', 'save_file_content', {
      ...params,
      content: '', // Empty content to create directory
    })
  }

  /**
   * Set directory permissions
   */
  async setDirectoryPermissions(path: string, permissions: string = '755'): Promise<any> {
    const params = {
      dir: path,
      perms: permissions,
    }

    return await this.makeRequest('Fileman', 'set_permissions', params)
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<any> {
    return await this.makeRequest('Mysql', 'list_databases')
  }

  /**
   * Test the connection to cPanel
   */
  async testConnection(): Promise<any> {
    try {
      const result = await this.getAccountInfo()
      return {
        success: result.success,
        message: result.success 
          ? 'Successfully connected to cPanel'
          : 'Failed to connect to cPanel',
        error: result.error
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to connect to cPanel',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

/**
 * Factory function to create cPanel service with project settings
 */
export async function createCpanelService(projectId: number): Promise<CpanelService | null> {
  try {
    // Import entity meta utilities dynamically to avoid circular dependencies
    const { getAllProjectSettings } = await import('@/lib/utils/entity-meta/project-settings')

    // Get cPanel settings for the project
    const settings = await getAllProjectSettings(projectId)

    // Validate required settings
    if (!settings.cpanelDomain || !settings.cpanelUsername || !settings.cpanelApiToken) {
      throw new Error(`Missing cPanel configuration for project ${projectId}`)
    }

    const config: CpanelConfig = {
      domain: settings.cpanelDomain,
      username: settings.cpanelUsername,
      apiToken: settings.cpanelApiToken,
      subdomainDirPath: settings.cpanelSubdomainDirPath,
    }

    return new CpanelService(config)
  } catch (error) {
    return null
  }
}
