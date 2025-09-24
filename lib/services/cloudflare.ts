import Cloudflare from 'cloudflare'
import fetch from 'node-fetch'

export interface CloudflareConfig {
  apiKey: string
  email: string
  zoneId: string
  aRecordIp: string
}

export interface DnsRecord {
  type: 'A' | 'CNAME' | 'MX' | 'TXT'
  name: string
  content: string
  ttl?: number
  proxied?: boolean
}

export class CloudflareService {
  private client: Cloudflare
  private apiKey: string
  private email: string
  private zoneId: string
  private aRecordIp: string

  constructor(config: CloudflareConfig) {
    
    // Validate required configuration
    if (!config.apiKey) {
      throw new Error('Cloudflare API key is required')
    }
    if (!config.email) {
      throw new Error('Cloudflare email is required')
    }
    if (!config.zoneId) {
      throw new Error('Cloudflare zone ID is required')
    }
    if (!config.aRecordIp) {
      throw new Error('Cloudflare A record IP is required')
    }
    
    // Store configuration values
    this.apiKey = config.apiKey
    this.email = config.email
    this.zoneId = config.zoneId
    this.aRecordIp = config.aRecordIp
    
    this.client = new Cloudflare({
      apiKey: config.apiKey,
      email: config.email,
    } as any)
  }

  /**
   * Get the zone ID
   */
  getZoneId(): string {
    return this.zoneId
  }

  /**
   * Get the A record IP
   */
  getARecordIp(): string {
    return this.aRecordIp
  }

  /**
   * Make a direct HTTP request to Cloudflare API (similar to PHP implementation)
   */
  private async makeCloudflareRequest(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    const url = `https://api.cloudflare.com/client/v4/${endpoint}`
    
    const headers = {
      'X-Auth-Email': this.email,
      'X-Auth-Key': this.apiKey,
      'Content-Type': 'application/json'
    }

    const options: any = {
      method,
      headers
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data)
    }

    try {
      const response = await fetch(url, options)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(`${response.status} ${JSON.stringify(result)}`)
      }

      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Add a DNS record to Cloudflare
   */
  async addDnsRecord(zoneId: string, record: DnsRecord): Promise<any> {
    try {
      
      // Use direct HTTP request (similar to PHP implementation)
      const endpoint = `zones/${zoneId}/dns_records`
      const data = {
        type: record.type,
        name: record.name,
        content: record.content,
        ttl: record.ttl || 1, // Auto TTL
        proxied: record.proxied || false,
      }
      
      const response = await this.makeCloudflareRequest(endpoint, 'POST', data)

      return {
        success: true,
        data: response.result,
        message: `DNS record ${record.type} for ${record.name} created successfully`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to create DNS record ${record.type} for ${record.name}`
      }
    }
  }

  /**
   * Add an A record for a subdomain
   */
  async addSubdomainRecord(zoneId: string, subdomain: string, ip: string): Promise<any> {
    const record: DnsRecord = {
      type: 'A',
      name: subdomain,
      content: ip,
      ttl: 1, // Auto TTL
      proxied: true, // Enable Cloudflare proxy
    }

    return await this.addDnsRecord(zoneId, record)
  }

  /**
   * Check if a DNS record exists
   */
  async checkDnsRecord(zoneId: string, name: string, type: string): Promise<any> {
    try {
      
      // Use direct HTTP request (similar to PHP implementation)
      const endpoint = `zones/${zoneId}/dns_records?name=${encodeURIComponent(name)}&type=${type}`
      
      const response = await this.makeCloudflareRequest(endpoint, 'GET')

      return {
        success: true,
        exists: response.result.length > 0,
        records: response.result,
        message: response.result.length > 0 
          ? `DNS record ${type} for ${name} exists`
          : `DNS record ${type} for ${name} does not exist`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to check DNS record ${type} for ${name}`
      }
    }
  }

  /**
   * Delete a DNS record
   */
  async deleteDnsRecord(zoneId: string, recordId: string): Promise<any> {
    try {
      // Use direct HTTP request (similar to PHP implementation)
      const endpoint = `zones/${zoneId}/dns_records/${recordId}`
      
      await this.makeCloudflareRequest(endpoint, 'DELETE')

      return {
        success: true,
        message: `DNS record ${recordId} deleted successfully`
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to delete DNS record ${recordId}`
      }
    }
  }

  /**
   * Get zone information
   */
  async getZoneInfo(zoneId: string): Promise<any> {
    try {
      const response = await this.client.zones.get({
        zone_id: zoneId
      })

      return {
        success: true,
        data: response,
        message: 'Zone information retrieved successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to retrieve zone information'
      }
    }
  }
}

/**
 * Factory function to create Cloudflare service with project settings
 */
export async function createCloudflareService(projectId: number): Promise<CloudflareService | null> {
  try {
    // Import entity meta utilities dynamically to avoid circular dependencies
    const { getAllProjectSettings } = await import('@/lib/utils/entity-meta/project-settings')

    // Get Cloudflare settings for the project
    const settings = await getAllProjectSettings(projectId)

    // Validate required settings
    const missingFields = []
    if (!settings.cloudflareApiKey) missingFields.push('cloudflareApiKey')
    if (!settings.cloudflareUsername) missingFields.push('cloudflareUsername')
    if (!settings.cloudflareZoneId) missingFields.push('cloudflareZoneId')
    if (!settings.cloudflareARecordIp) missingFields.push('cloudflareARecordIp')
    
    if (missingFields.length > 0) {
      throw new Error(`Missing Cloudflare configuration for project ${projectId}: ${missingFields.join(', ')}`)
    }

    const config: CloudflareConfig = {
      apiKey: settings.cloudflareApiKey,
      email: settings.cloudflareUsername,
      zoneId: settings.cloudflareZoneId,
      aRecordIp: settings.cloudflareARecordIp,
    }

    return new CloudflareService(config)
  } catch (error) {
    return null
  }
}
