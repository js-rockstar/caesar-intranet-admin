import {CloudflareService, createCloudflareService} from './cloudflare'
import {CpanelService, createCpanelService} from './cpanel'

export interface InstallationConfig {
    projectId: number
    subdomain: string
    domain: string
    fullDomain: string
    clientId?: number
    clientName?: string
    adminEmail?: string
    adminPassword?: string
    installerEndpoint?: string
    installerToken?: string
}

export interface InstallationResult {
    success: boolean
    message: string
    data?: any
    error?: string
    step: string
}

export class InstallationService {
    private projectId: number
    private cloudflareService: CloudflareService | null = null
    private cpanelService: CpanelService | null = null

    constructor(projectId: number) {
        this.projectId = projectId
    }

    /**
     * Step 1: Create subdomain in cPanel
     */
    async createSubdomain(config: InstallationConfig): Promise<InstallationResult> {
        this.cpanelService = await createCpanelService(this.projectId)

        if (!this.cpanelService) {
            return {
                success: false,
                message: 'cPanel service not initialized',
                error: 'Service not available',
                step: 'CPANEL_ENTRY'
            }
        }

        try {
            // Extract root domain from full domain if needed
            let rootDomain = config.domain
            if (config.domain && config.domain.includes('.')) {
                // If domain is a full domain like "test.bmswise.net", extract the root domain
                const domainParts = config.domain.split('.')
                if (domainParts.length > 2) {
                    rootDomain = domainParts.slice(1).join('.')
                }
            }
            
            // Check if subdomain already exists
            const checkResult = await this.cpanelService.checkSubdomain(config.subdomain, rootDomain)

            if (checkResult.success && checkResult.exists) {
                return {
                    success: true,
                    message: `Subdomain ${config.fullDomain} already exists`,
                    data: checkResult.data,
                    step: 'CPANEL_ENTRY'
                }
            }

            const result = await this.cpanelService.addSubdomain(config.subdomain, rootDomain)

            if (result.success) {
                return {
                    success: true,
                    message: `Subdomain ${config.fullDomain} created successfully`,
                    data: result.data,
                    step: 'CPANEL_ENTRY'
                }
            } else {
                return {
                    success: false,
                    message: `Failed to create subdomain ${config.fullDomain}`,
                    error: result.error || result.message || 'Unknown cPanel error',
                    step: 'CPANEL_ENTRY'
                }
            }
        } catch (error) {
            return {
                success: false,
                message: `Error creating subdomain ${config.fullDomain}`,
                error: error instanceof Error ? error.message : 'Unknown error',
                step: 'CPANEL_ENTRY'
            }
        }
    }

    /**
     * Step 2: Add DNS record in Cloudflare
     */
    async addDnsRecord(config: InstallationConfig): Promise<InstallationResult> {
        this.cloudflareService = await createCloudflareService(this.projectId)

        if (!this.cloudflareService) {
            return {
                success: false,
                message: 'Cloudflare service not initialized',
                error: 'Service not available',
                step: 'CLOUDFLARE_ENTRY'
            }
        }

        try {
            // Get configuration from the Cloudflare service
            const zoneId = this.cloudflareService.getZoneId()
            const aRecordIp = this.cloudflareService.getARecordIp()

            if (!zoneId || !aRecordIp) {
                return {
                    success: false,
                    message: 'Missing Cloudflare configuration',
                    error: 'Zone ID or A Record IP not configured',
                    step: 'CLOUDFLARE_ENTRY'
                }
            }

            const checkResult = await this.cloudflareService.checkDnsRecord(zoneId, config.fullDomain, 'A')

            if (checkResult.success && checkResult.exists) {
                return {
                    success: true,
                    message: `DNS record for ${config.fullDomain} already exists`,
                    data: checkResult.records,
                    step: 'CLOUDFLARE_ENTRY'
                }
            }

            // Add the DNS record
            const result = await this.cloudflareService.addSubdomainRecord(zoneId, config.fullDomain, aRecordIp)

            if (result.success) {
                return {
                    success: true,
                    message: `DNS record for ${config.fullDomain} added successfully`,
                    data: result.data,
                    step: 'CLOUDFLARE_ENTRY'
                }
            } else {
                return {
                    success: false,
                    message: `Failed to add DNS record for ${config.fullDomain}`,
                    error: result.error,
                    step: 'CLOUDFLARE_ENTRY'
                }
            }
        } catch (error) {
            return {
                success: false,
                message: `Error adding DNS record for ${config.fullDomain}`,
                error: error instanceof Error ? error.message : 'Unknown error',
                step: 'CLOUDFLARE_ENTRY'
            }
        }
    }

    /**
     * Step 3: Set up directory structure
     */
    async setupDirectory(config: InstallationConfig): Promise<InstallationResult> {
        if (!config.installerEndpoint || !config.installerToken) {
            return {
                success: false,
                message: 'Installer endpoint or token not provided',
                error: 'Missing configuration',
                step: 'DIRECTORY_SETUP'
            }
        }

        if (!config.clientName || !config.adminEmail || !config.adminPassword) {
            return {
                success: false,
                message: 'Client name, admin email, or admin password not provided',
                error: 'Missing required data',
                step: 'DIRECTORY_SETUP'
            }
        }

        try {
            const endpoint = `${config.installerEndpoint.replace(/\/$/, '')}/office/setup/directory`
            
            // Create form data
            const formData = new FormData()
            formData.append('name', config.subdomain)
            formData.append('client_name', config.clientName)
            formData.append('email', config.adminEmail)
            formData.append('password', config.adminPassword)

            // Temporarily disable SSL certificate verification for self-signed certificates
            const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED
            if (endpoint.startsWith('https:')) {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
            }

            let response
            try {
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config.installerToken}`,
                        'User-Agent': 'Caesar-Intranet/1.0'
                    },
                    body: formData,
                    signal: AbortSignal.timeout(300000) // 5 minute timeout
                })
            } finally {
                // Restore original SSL certificate verification setting
                if (originalRejectUnauthorized !== undefined) {
                    process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized
                } else {
                    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
                }
            }

            const responseData = await response.json()

            if (!response.ok) {
                return {
                    success: false,
                    message: `Failed to setup directory: ${responseData.result?.message || responseData.result?.name || 'Unknown error'}`,
                    error: responseData.result?.message || responseData.result?.name || 'HTTP error',
                    step: 'DIRECTORY_SETUP'
                }
            }

            if (responseData.success) {
                return {
                    success: true,
                    message: `Directory structure set up successfully for ${config.fullDomain}`,
                    data: {
                        siteId: responseData.result?.siteId,
                        message: responseData.result?.message
                    },
                    step: 'DIRECTORY_SETUP'
                }
            } else {
                return {
                    success: false,
                    message: `Failed to setup directory: ${responseData.result?.message || responseData.result?.name || 'Unknown error'}`,
                    error: responseData.result?.message || responseData.result?.name || 'API error',
                    step: 'DIRECTORY_SETUP'
                }
            }
        } catch (error) {
            return {
                success: false,
                message: `Error setting up directory for ${config.fullDomain}`,
                error: error instanceof Error ? error.message : 'Unknown error',
                step: 'DIRECTORY_SETUP'
            }
        }
    }

    /**
     * Step 4: Set up database
     */
    async setupDatabase(config: InstallationConfig): Promise<InstallationResult> {
        if (!config.installerEndpoint || !config.installerToken) {
            return {
                success: false,
                message: 'Installer endpoint or token not provided',
                error: 'Missing configuration',
                step: 'DB_CREATION'
            }
        }

        if (!config.clientName || !config.adminEmail || !config.adminPassword) {
            return {
                success: false,
                message: 'Client name, admin email, or admin password not provided',
                error: 'Missing required data',
                step: 'DB_CREATION'
            }
        }

        try {
            const endpoint = `${config.installerEndpoint.replace(/\/$/, '')}/office/setup/database`
            
            // Create form data
            const formData = new FormData()
            formData.append('name', config.subdomain)
            formData.append('client_name', config.clientName)
            formData.append('email', config.adminEmail)
            formData.append('password', config.adminPassword)

            // Temporarily disable SSL certificate verification for self-signed certificates
            const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED
            if (endpoint.startsWith('https:')) {
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
            }

            let response
            try {
                response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${config.installerToken}`,
                        'User-Agent': 'Caesar-Intranet/1.0'
                    },
                    body: formData,
                    signal: AbortSignal.timeout(300000) // 5 minute timeout
                })
            } finally {
                // Restore original SSL certificate verification setting
                if (originalRejectUnauthorized !== undefined) {
                    process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized
                } else {
                    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
                }
            }

            const responseData = await response.json()

            if (!response.ok) {
                return {
                    success: false,
                    message: `Failed to setup database: ${responseData.result?.message || 'Unknown error'}`,
                    error: responseData.result?.message || 'HTTP error',
                    step: 'DB_CREATION'
                }
            }

            if (responseData.success) {
                return {
                    success: true,
                    message: `Database setup completed successfully for ${config.fullDomain}`,
                    data: {
                        message: responseData.result?.message
                    },
                    step: 'DB_CREATION'
                }
            } else {
                return {
                    success: false,
                    message: `Failed to setup database: ${responseData.result?.message || 'Unknown error'}`,
                    error: responseData.result?.message || 'API error',
                    step: 'DB_CREATION'
                }
            }
        } catch (error) {
            return {
                success: false,
                message: `Error setting up database for ${config.fullDomain}`,
                error: error instanceof Error ? error.message : 'Unknown error',
                step: 'DB_CREATION'
            }
        }
    }

}

/**
 * Factory function to create installation service
 */
export function createInstallationService(projectId: number): InstallationService {
    return new InstallationService(projectId)
}
