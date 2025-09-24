import { useState, useEffect, useCallback } from 'react'
import { useProjectSettings } from './use-settings'

export interface InstallationConfig {
  projectKey: string
  cpanel: {
    domain: string
    username: string
    apiToken: string
    subdomainDirPath: string
  }
  cloudflare: {
    username: string
    apiKey: string
    zoneId: string
    aRecordIp: string
  }
  installer: {
    apiEndpoint: string
    token: string
  }
}

/**
 * Custom hook for managing installation-specific settings
 * Combines project settings with installation context
 */
export function useInstallationSettings(projectId: number) {
  const { projectSettings, loading, getProjectSetting } = useProjectSettings(projectId)
  const [installationConfig, setInstallationConfig] = useState<InstallationConfig | null>(null)

  const buildInstallationConfig = useCallback(async (projectId: number) => {
    if (!projectId || loading) return null

    try {
      // Fetch project details to get the project key
      const projectResponse = await fetch(`/api/projects/${projectId}`)
      if (!projectResponse.ok) throw new Error('Failed to fetch project details')
      
      const project = await projectResponse.json()
      
      const config: InstallationConfig = {
        projectKey: project.key || 'UNKNOWN',
        cpanel: {
          domain: getProjectSetting('cpanel', 'domain'),
          username: getProjectSetting('cpanel', 'username'),
          apiToken: getProjectSetting('cpanel', 'apiToken'),
          subdomainDirPath: getProjectSetting('cpanel', 'subdomainDirPath')
        },
        cloudflare: {
          username: getProjectSetting('cloudflare', 'username'),
          apiKey: getProjectSetting('cloudflare', 'apiKey'),
          zoneId: getProjectSetting('cloudflare', 'zoneId'),
          aRecordIp: getProjectSetting('cloudflare', 'aRecordIp')
        },
        installer: {
          apiEndpoint: getProjectSetting('installer', 'apiEndpoint'),
          token: getProjectSetting('installer', 'token')
        }
      }

      setInstallationConfig(config)
      return config
    } catch (error) {
      return null
    }
  }, [projectSettings, loading, getProjectSetting])

  useEffect(() => {
    if (projectId && !loading) {
      buildInstallationConfig(projectId)
    }
  }, [projectId, loading, buildInstallationConfig])

  const getStepConfig = useCallback((stepType: string) => {
    if (!installationConfig) return null

    switch (stepType) {
      case 'CPANEL_ENTRY':
        return {
          type: 'cpanel',
          config: installationConfig.cpanel,
          projectKey: installationConfig.projectKey
        }
      case 'CLOUDFLARE_ENTRY':
        return {
          type: 'cloudflare',
          config: installationConfig.cloudflare,
          projectKey: installationConfig.projectKey
        }
      case 'DIRECTORY_SETUP':
        return {
          type: 'installer',
          config: installationConfig.installer,
          projectKey: installationConfig.projectKey
        }
      case 'DB_CREATION':
        return {
          type: 'installer',
          config: installationConfig.installer,
          projectKey: installationConfig.projectKey
        }
      default:
        return null
    }
  }, [installationConfig])

  const validateConfig = useCallback((stepType: string): { isValid: boolean; missingFields: string[] } => {
    const stepConfig = getStepConfig(stepType)
    if (!stepConfig) {
      return { isValid: false, missingFields: ['Configuration not found'] }
    }

    const missingFields: string[] = []
    const { config } = stepConfig

    switch (stepType) {
      case 'CPANEL_ENTRY':
        if (!config.domain) missingFields.push('cPanel Domain')
        if (!config.username) missingFields.push('cPanel Username')
        if (!config.apiToken) missingFields.push('cPanel API Token')
        break
      case 'CLOUDFLARE_ENTRY':
        if (!config.username) missingFields.push('Cloudflare Email')
        if (!config.apiKey) missingFields.push('Cloudflare API Key')
        if (!config.zoneId) missingFields.push('Cloudflare Zone ID')
        if (!config.aRecordIp) missingFields.push('A Record IP')
        break
      case 'DIRECTORY_SETUP':
      case 'DB_CREATION':
        if (!config.apiEndpoint) missingFields.push('Installer API Endpoint')
        if (!config.token) missingFields.push('Installer Token')
        break
    }

    return {
      isValid: missingFields.length === 0,
      missingFields
    }
  }, [getStepConfig])

  return {
    installationConfig,
    loading,
    getStepConfig,
    validateConfig,
    buildInstallationConfig
  }
}
