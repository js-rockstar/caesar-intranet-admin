"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Save, Settings, Database, Cloud, Server, FolderOpen, Key, ChevronDown, ChevronUp, ChevronRight, TestTube } from "lucide-react"
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useSettings, useCrmSettings, type ProjectSettings } from "@/hooks/use-settings"
import { toast } from "sonner"

interface Project {
  id: number
  name: string
  key: string
  domain: string
  status: boolean
}

export default function SettingsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeTab, setActiveTab] = useState("general")
  const [openProject, setOpenProject] = useState<string | null>(null)

  // Use custom hooks for settings management
  const { settings, loading: settingsLoading, saving: settingsSaving, updateSettings, getSettingValue } = useSettings()
  const { crmSettings, loading: crmLoading, saving: crmSaving, testing: crmTesting, updateCrmSettings, testCrmConnection } = useCrmSettings()
  
  // Local state for project settings saving and loading
  const [projectSaving, setProjectSaving] = useState(false)
  const [projectSettingsLoading, setProjectSettingsLoading] = useState(false)
  const [testingInstaller, setTestingInstaller] = useState<Record<string, boolean>>({})

  // Form states for CRM settings
  const [centralCrmEndpoint, setCentralCrmEndpoint] = useState("")
  const [centralCrmToken, setCentralCrmToken] = useState("")

  // Form states for project settings
  const [projectSettingsState, setProjectSettingsState] = useState<Record<string, ProjectSettings>>({})

  useEffect(() => {
    fetchProjects()
  }, [])

  // Initialize CRM form states when settings are loaded
  useEffect(() => {
    if (crmSettings.apiEndpoint || crmSettings.token) {
      setCentralCrmEndpoint(crmSettings.apiEndpoint)
      setCentralCrmToken(crmSettings.token)
    }
  }, [crmSettings])

  const toggleProject = (projectKey: string) => {
    setOpenProject(openProject === projectKey ? null : projectKey)
  }

  const fetchProjects = async () => {
    try {
      setProjectSettingsLoading(true)
      const response = await fetch("/api/projects")
      const data = await response.json()
      setProjects(data || [])
      
      // Fetch project settings for each project
      const initialProjectSettings: Record<string, ProjectSettings> = {}
      
      if (data && data.length > 0) {
        // Fetch settings for each project
        const settingsPromises = data.map(async (project: Project) => {
          try {
            const settingsResponse = await fetch(`/api/projects/${project.id}/settings`)
            if (settingsResponse.ok) {
              const settingsData = await settingsResponse.json()
              return {
                projectKey: project.key,
                settings: settingsData.settings || {
                  cpanel: { domain: '', username: '', apiToken: '' },
                  cloudflare: { username: '', apiKey: '', zoneId: '', aRecordIp: '' },
                  installer: { apiEndpoint: '', token: '' }
                }
              }
            }
          } catch (error) {
          }
          
          // Return default settings if fetch fails
          return {
            projectKey: project.key,
            settings: {
              cpanel: { domain: '', username: '', apiToken: '' },
              cloudflare: { username: '', apiKey: '', zoneId: '', aRecordIp: '' },
              installer: { apiEndpoint: '', token: '' }
            }
          }
        })
        
        const settingsResults = await Promise.all(settingsPromises)
        
        // Build the settings object
        settingsResults.forEach(({ projectKey, settings }) => {
          initialProjectSettings[projectKey] = settings
        })
      }
      
      setProjectSettingsState(initialProjectSettings)
    } catch (error) {
    } finally {
      setProjectSettingsLoading(false)
    }
  }

  const handleCrmSettingsSave = async () => {
    const newCrmSettings = {
      apiEndpoint: centralCrmEndpoint,
      token: centralCrmToken
    }
    
    await updateCrmSettings(newCrmSettings)
  }

  const handleProjectSettingsSave = async (projectKey: string) => {
    const project = projects.find(p => p.key === projectKey)
    if (!project) return

    const settings = projectSettingsState[projectKey]
    if (!settings) return

    try {
      setProjectSaving(true)
      const response = await fetch(`/api/projects/${project.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (!response.ok) throw new Error('Failed to update project settings')
      
      toast.success('Project settings saved successfully')
    } catch (error) {
      toast.error('Failed to save project settings')
    } finally {
      setProjectSaving(false)
    }
  }

  const updateProjectSetting = (projectKey: string, category: keyof ProjectSettings, key: string, value: string) => {
    setProjectSettingsState(prev => ({
      ...prev,
      [projectKey]: {
        ...prev[projectKey],
        [category]: {
          ...prev[projectKey][category],
          [key]: value
        }
      }
    }))
  }

  const testInstallerConfiguration = async (projectKey: string) => {
    const project = projects.find(p => p.key === projectKey)
    if (!project) return

    const settings = projectSettingsState[projectKey]
    if (!settings?.installer?.apiEndpoint || !settings?.installer?.token) {
      toast.error('Please fill in both API Endpoint and Token before testing')
      return
    }

    try {
      setTestingInstaller(prev => ({ ...prev, [projectKey]: true }))
      
      const response = await fetch(`/api/projects/${project.id}/settings/test-installer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings.installer)
      })

      if (!response.ok) {
        const errorResult = await response.json()
        throw new Error(errorResult.message || errorResult.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      if (result.success) {
        toast.success('Installer configuration test successful')
      } else {
        toast.error(result.message || 'Installer configuration test failed')
      }
    } catch (error) {
      toast.error('Failed to test installer configuration')
    } finally {
      setTestingInstaller(prev => ({ ...prev, [projectKey]: false }))
    }
  }

  const loading = settingsLoading || crmLoading || projectSettingsLoading
  const saving = settingsSaving || crmSaving

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage system configurations and project settings
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>General</span>
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Projects</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Central CRM Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure connection to the central CRM system for client import functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="crm-endpoint">API Endpoint</Label>
                  <Input
                    id="crm-endpoint"
                    value={centralCrmEndpoint}
                    onChange={(e) => setCentralCrmEndpoint(e.target.value)}
                    placeholder="https://api.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="crm-token">API Token</Label>
                  <Input
                    id="crm-token"
                    type="password"
                    value={centralCrmToken}
                    onChange={(e) => setCentralCrmToken(e.target.value)}
                    placeholder="Enter your API token"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={handleCrmSettingsSave} 
                  disabled={saving}
                  className="flex items-center space-x-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>Save CRM Settings</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => testCrmConnection({ 
                    apiEndpoint: centralCrmEndpoint, 
                    token: centralCrmToken 
                  })}
                  disabled={crmTesting || !centralCrmEndpoint || !centralCrmToken}
                  className="flex items-center space-x-2"
                >
                  {crmTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4" />
                  )}
                  <span>Test Connection</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <div className="space-y-4">
            {projects.map((project) => (
              <Collapsible
                key={project.key}
                open={openProject === project.key}
                onOpenChange={() => toggleProject(project.key)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Database className="h-5 w-5" />
                          <div>
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                            <CardDescription>
                              {project.domain} • {project.status ? 'Active' : 'Inactive'}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={project.status ? "default" : "secondary"}>
                            {project.status ? "Active" : "Inactive"}
                          </Badge>
                          {openProject === project.key ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="space-y-6">
                      {/* cPanel Settings */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Server className="h-4 w-4" />
                          <h4 className="font-medium">cPanel Configuration</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`${project.key}-cpanel-domain`}>Domain</Label>
                            <Input
                              id={`${project.key}-cpanel-domain`}
                              value={projectSettingsState[project.key]?.cpanel?.domain || ''}
                              onChange={(e) => updateProjectSetting(project.key, 'cpanel', 'domain', e.target.value)}
                              placeholder="cpanel.example.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${project.key}-cpanel-username`}>Username</Label>
                            <Input
                              id={`${project.key}-cpanel-username`}
                              value={projectSettingsState[project.key]?.cpanel?.username || ''}
                              onChange={(e) => updateProjectSetting(project.key, 'cpanel', 'username', e.target.value)}
                              placeholder="cpanel_username"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${project.key}-cpanel-token`}>API Token</Label>
                            <Input
                              id={`${project.key}-cpanel-token`}
                              type="password"
                              value={projectSettingsState[project.key]?.cpanel?.apiToken || ''}
                              onChange={(e) => updateProjectSetting(project.key, 'cpanel', 'apiToken', e.target.value)}
                              placeholder="API token"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${project.key}-cpanel-subdomain-dir-path`}>Subdomain Directory Path</Label>
                            <Input
                              id={`${project.key}-cpanel-subdomain-dir-path`}
                              value={projectSettingsState[project.key]?.cpanel?.subdomainDirPath || ''}
                              onChange={(e) => updateProjectSetting(project.key, 'cpanel', 'subdomainDirPath', e.target.value)}
                              placeholder="public_html/project/sites/"
                            />
                            <p className="text-xs text-muted-foreground">
                              Base path for subdomain directories. The subdomain name will be appended to this path.
                            </p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Cloudflare Settings */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Cloud className="h-4 w-4" />
                          <h4 className="font-medium">Cloudflare Configuration</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`${project.key}-cf-username`}>Email</Label>
                            <Input
                              id={`${project.key}-cf-username`}
                              value={projectSettingsState[project.key]?.cloudflare?.username || ''}
                              onChange={(e) => updateProjectSetting(project.key, 'cloudflare', 'username', e.target.value)}
                              placeholder="user@example.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${project.key}-cf-apikey`}>API Key</Label>
                            <Input
                              id={`${project.key}-cf-apikey`}
                              type="password"
                              value={projectSettingsState[project.key]?.cloudflare?.apiKey || ''}
                              onChange={(e) => updateProjectSetting(project.key, 'cloudflare', 'apiKey', e.target.value)}
                              placeholder="API key"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${project.key}-cf-zoneid`}>Zone ID</Label>
                            <Input
                              id={`${project.key}-cf-zoneid`}
                              value={projectSettingsState[project.key]?.cloudflare?.zoneId || ''}
                              onChange={(e) => updateProjectSetting(project.key, 'cloudflare', 'zoneId', e.target.value)}
                              placeholder="Zone ID"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${project.key}-cf-arecord`}>A Record IP</Label>
                            <Input
                              id={`${project.key}-cf-arecord`}
                              value={projectSettingsState[project.key]?.cloudflare?.aRecordIp || ''}
                              onChange={(e) => updateProjectSetting(project.key, 'cloudflare', 'aRecordIp', e.target.value)}
                              placeholder="192.168.1.1"
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Installer Settings */}
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <FolderOpen className="h-4 w-4" />
                          <h4 className="font-medium">Installer Configuration</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`${project.key}-installer-endpoint`}>API Endpoint</Label>
                            <Input
                              id={`${project.key}-installer-endpoint`}
                              value={projectSettingsState[project.key]?.installer?.apiEndpoint || ''}
                              onChange={(e) => updateProjectSetting(project.key, 'installer', 'apiEndpoint', e.target.value)}
                              placeholder="https://installer.example.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`${project.key}-installer-token`}>Token</Label>
                            <Input
                              id={`${project.key}-installer-token`}
                              type="password"
                              value={projectSettingsState[project.key]?.installer?.token || ''}
                              onChange={(e) => updateProjectSetting(project.key, 'installer', 'token', e.target.value)}
                              placeholder="Installer token"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            onClick={() => testInstallerConfiguration(project.key)}
                            disabled={testingInstaller[project.key] || !projectSettingsState[project.key]?.installer?.apiEndpoint || !projectSettingsState[project.key]?.installer?.token}
                            className="flex items-center space-x-2"
                          >
                            {testingInstaller[project.key] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4" />
                            )}
                            <span>Test Connection</span>
                          </Button>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button 
                          onClick={() => handleProjectSettingsSave(project.key)}
                          disabled={projectSaving}
                          className="flex items-center space-x-2"
                        >
                          {projectSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          <span>Save {project.name} Settings</span>
                        </Button>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
