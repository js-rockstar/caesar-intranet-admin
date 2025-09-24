import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'

export interface Setting {
  id: number
  key: string
  group: string
  value: string
  createdAt: Date
  updatedAt: Date
}

export interface ProjectSettings {
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

export interface CrmSettings {
  apiEndpoint: string
  token: string
}

/**
 * Custom hook for managing general application settings
 */
export function useSettings() {
  const [settings, setSettings] = useState<Record<string, Setting[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings?format=grouped')
      if (!response.ok) throw new Error('Failed to fetch settings')
      
      const data = await response.json()
      setSettings(data.settings || {})
    } catch (error) {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateSettings = useCallback(async (group: string, settingsData: Record<string, string>) => {
    try {
      setSaving(true)
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group, settings: settingsData })
      })

      if (!response.ok) throw new Error('Failed to update settings')
      
      const result = await response.json()
      toast.success('Settings saved successfully')
      
      // Refresh settings after successful update
      await fetchSettings()
      
      return result
    } catch (error) {
      toast.error('Failed to save settings')
      throw error
    } finally {
      setSaving(false)
    }
  }, [fetchSettings])

  const getSettingValue = useCallback((group: string, key: string): string => {
    const groupSettings = settings[group] || []
    const setting = groupSettings.find(s => s.key === key)
    return setting?.value || ''
  }, [settings])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    loading,
    saving,
    fetchSettings,
    updateSettings,
    getSettingValue
  }
}

/**
 * Custom hook for managing CRM settings
 */
export function useCrmSettings() {
  const [crmSettings, setCrmSettings] = useState<CrmSettings>({
    apiEndpoint: '',
    token: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const fetchCrmSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/crm')
      if (!response.ok) throw new Error('Failed to fetch CRM settings')
      
      const data = await response.json()
      setCrmSettings(data.settings || { apiEndpoint: '', token: '' })
    } catch (error) {
      toast.error('Failed to load CRM settings')
    } finally {
      setLoading(false)
    }
  }, [])

  const updateCrmSettings = useCallback(async (newSettings: CrmSettings) => {
    try {
      setSaving(true)
      const response = await fetch('/api/settings/crm', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      })

      if (!response.ok) throw new Error('Failed to update CRM settings')
      
      toast.success('CRM settings saved successfully')
      setCrmSettings(newSettings)
      
      return true
    } catch (error) {
      toast.error('Failed to save CRM settings')
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  const testCrmConnection = useCallback(async (testSettings?: CrmSettings) => {
    try {
      setTesting(true)
      const settingsToTest = testSettings || crmSettings
      const response = await fetch('/api/settings/crm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToTest)
      })

      if (!response.ok) {
        // Try to get the error message from the response
        try {
          const errorResult = await response.json()
          throw new Error(errorResult.message || errorResult.error || `HTTP ${response.status}: ${response.statusText}`)
        } catch (parseError) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      }
      
      const result = await response.json()
      if (result.success) {
        toast.success('CRM connection successful')
      } else {
        toast.error(result.message || 'CRM connection failed')
      }
      
      return result.success
    } catch (error) {
      toast.error('Failed to test CRM connection')
      return false
    } finally {
      setTesting(false)
    }
  }, [crmSettings])

  useEffect(() => {
    fetchCrmSettings()
  }, [fetchCrmSettings])

  return {
    crmSettings,
    loading,
    saving,
    testing,
    fetchCrmSettings,
    updateCrmSettings,
    testCrmConnection
  }
}

/**
 * Custom hook for managing project-specific settings
 */
export function useProjectSettings(projectId: number) {
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
    cpanel: { domain: '', username: '', apiToken: '', subdomainDirPath: '' },
    cloudflare: { username: '', apiKey: '', zoneId: '', aRecordIp: '' },
    installer: { apiEndpoint: '', token: '' }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingInstaller, setTestingInstaller] = useState(false)
  const fetchedProjectId = useRef<number | null>(null)

  const fetchProjectSettings = useCallback(async () => {
    if (!projectId) return
    
    // Prevent duplicate fetches for the same projectId
    if (fetchedProjectId.current === projectId && !loading) {
      return
    }
    
    try {
      setLoading(true)
      fetchedProjectId.current = projectId
      
      const response = await fetch(`/api/projects/${projectId}/settings`)
      if (!response.ok) throw new Error('Failed to fetch project settings')
      
      const data = await response.json()
      setProjectSettings(data.settings || {
        cpanel: { domain: '', username: '', apiToken: '', subdomainDirPath: '' },
        cloudflare: { username: '', apiKey: '', zoneId: '', aRecordIp: '' },
        installer: { apiEndpoint: '', token: '' }
      })
    } catch (error) {
      toast.error('Failed to load project settings')
      fetchedProjectId.current = null // Reset on error
    } finally {
      setLoading(false)
    }
  }, [projectId, loading])

  const updateProjectSettings = useCallback(async (newSettings: ProjectSettings) => {
    if (!projectId) return false
    
    try {
      setSaving(true)
      const response = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      })

      if (!response.ok) throw new Error('Failed to update project settings')
      
      toast.success('Project settings saved successfully')
      setProjectSettings(newSettings)
      
      return true
    } catch (error) {
      toast.error('Failed to save project settings')
      return false
    } finally {
      setSaving(false)
    }
  }, [projectId])

  const getProjectSetting = useCallback((category: keyof ProjectSettings, key: string): string => {
    return projectSettings[category]?.[key as keyof ProjectSettings[typeof category]] || ''
  }, [projectSettings])

  const testInstallerConfiguration = useCallback(async (testSettings?: { apiEndpoint: string; token: string }) => {
    if (!projectId) return false
    
    try {
      setTestingInstaller(true)
      const settingsToTest = testSettings || projectSettings.installer
      
      const response = await fetch(`/api/projects/${projectId}/settings/test-installer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToTest)
      })

      if (!response.ok) {
        // Try to get the error message from the response
        try {
          const errorResult = await response.json()
          throw new Error(errorResult.message || errorResult.error || `HTTP ${response.status}: ${response.statusText}`)
        } catch (parseError) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      }
      
      const result = await response.json()
      if (result.success) {
        toast.success('Installer configuration test successful')
      } else {
        toast.error(result.message || 'Installer configuration test failed')
      }
      
      return result.success
    } catch (error) {
      toast.error('Failed to test installer configuration')
      return false
    } finally {
      setTestingInstaller(false)
    }
  }, [projectId, projectSettings.installer])

  useEffect(() => {
    if (projectId && fetchedProjectId.current !== projectId) {
      fetchProjectSettings()
    }
  }, [projectId, fetchProjectSettings])

  return {
    projectSettings,
    loading,
    saving,
    testingInstaller,
    fetchProjectSettings,
    updateProjectSettings,
    getProjectSetting,
    testInstallerConfiguration
  }
}
