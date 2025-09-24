# Settings Utilities Documentation

This document describes the Settings utility functions that provide a clean interface for managing application settings stored in the Setting table.

## Overview

The Settings utilities provide a comprehensive set of functions for managing application-wide settings. This is particularly useful for storing configuration values, API endpoints, tokens, and other global application settings.

## Core Functions

### Basic CRUD Operations

#### `settingKeyExists(key)`
Check if a setting key exists.

```typescript
const exists = await settingKeyExists('CENTRAL_CRM_API_ENDPOINT')
// Returns: boolean
```

#### `getSetting(key)`
Get a single setting value.

```typescript
const value = await getSetting('CENTRAL_CRM_API_ENDPOINT')
// Returns: string | null
```

#### `getSettingDetails(key)`
Get a setting with full details (including metadata).

```typescript
const setting = await getSettingDetails('CENTRAL_CRM_API_ENDPOINT')
// Returns: Setting | null
// {
//   id: 1,
//   key: 'CENTRAL_CRM_API_ENDPOINT',
//   group: 'centralCrmConfig',
//   value: 'https://api.example.com',
//   createdAt: Date,
//   updatedAt: Date
// }
```

#### `addSetting(key, group, value)`
Add a new setting (fails if key already exists).

```typescript
const success = await addSetting('NEW_SETTING', 'general', 'new_value')
// Returns: boolean
```

#### `updateSetting(key, value, group?)`
Update an existing setting (creates if doesn't exist and group is provided).

```typescript
const success = await updateSetting('CENTRAL_CRM_API_ENDPOINT', 'https://new-api.com')
// Returns: boolean

// Update with new group
const success = await updateSetting('SETTING_KEY', 'new_value', 'new_group')
// Returns: boolean
```

#### `deleteSetting(key)`
Delete a specific setting.

```typescript
const success = await deleteSetting('OLD_SETTING')
// Returns: boolean
```

### Group Operations

#### `getSettingsByGroup(group)`
Get all settings for a specific group.

```typescript
const crmSettings = await getSettingsByGroup('centralCrmConfig')
// Returns: Setting[]
```

#### `getAllSettings()`
Get all settings in the system.

```typescript
const allSettings = await getAllSettings()
// Returns: Setting[]
```

#### `deleteSettingsByGroup(group)`
Delete all settings in a specific group.

```typescript
const deletedCount = await deleteSettingsByGroup('old_group')
// Returns: number (count of deleted settings)
```

### Advanced Operations

#### `upsertSetting(key, group, value)`
Add or update a setting in a single operation.

```typescript
const success = await upsertSetting('SETTING_KEY', 'group', 'value')
// Returns: boolean
```

#### `getSettingsAsObject(group)`
Get settings for a group as a key-value object.

```typescript
const crmSettings = await getSettingsAsObject('centralCrmConfig')
// Returns: Record<string, string>
// Example: { "CENTRAL_CRM_API_ENDPOINT": "https://api.com", "CENTRAL_CRM_TOKEN": "token123" }
```

#### `getAllSettingsAsObject()`
Get all settings as a key-value object.

```typescript
const allSettings = await getAllSettingsAsObject()
// Returns: Record<string, string>
```

#### `updateSettingsFromObject(settingsObject, group?)`
Update multiple settings from an object.

```typescript
const settingsObject = {
  'SETTING_1': 'value1',
  'SETTING_2': 'value2',
  'SETTING_3': 'value3'
}
const success = await updateSettingsFromObject(settingsObject, 'group_name')
// Returns: boolean
```

#### `getSettingsGrouped()`
Get all settings grouped by group name.

```typescript
const groupedSettings = await getSettingsGrouped()
// Returns: Record<string, Setting[]>
// Example: {
//   "centralCrmConfig": [Setting, Setting],
//   "general": [Setting, Setting]
// }
```

#### `validateSettings(requiredKeys)`
Validate that required settings exist and have values.

```typescript
const validation = await validateSettings([
  'CENTRAL_CRM_API_ENDPOINT',
  'CENTRAL_CRM_TOKEN'
])
// Returns: { isValid: boolean, missingSettings: string[], emptySettings: string[] }
```

## CRM Settings Utilities

For CRM-specific settings, we provide a higher-level interface that handles the mapping between camelCase property names and UPPER_CASE setting keys.

### `getCrmSetting(settingName)`
Get a specific CRM setting.

```typescript
const endpoint = await getCrmSetting('CENTRAL_CRM_API_ENDPOINT')
// Returns: string | null
```

### `updateCrmSetting(settingName, value)`
Update a specific CRM setting.

```typescript
const success = await updateCrmSetting('CENTRAL_CRM_API_ENDPOINT', 'https://new-api.com')
// Returns: boolean
```

### `getAllCrmSettings()`
Get all CRM settings as a typed object.

```typescript
const settings = await getAllCrmSettings()
// Returns: CrmSettings
// {
//   apiEndpoint: 'https://api.example.com',
//   token: 'your_token_here'
// }
```

### `updateCrmSettings(settings)`
Update multiple CRM settings at once.

```typescript
const settings = {
  apiEndpoint: 'https://new-api.com',
  token: 'new_token'
}
const success = await updateCrmSettings(settings)
// Returns: boolean
```

### `validateCrmSettings()`
Validate that all required CRM settings are filled.

```typescript
const validation = await validateCrmSettings()
// Returns: { isValid: boolean, missingSettings: string[], emptySettings: string[] }
```

### `testCrmConnection(apiEndpoint?, token?)`
Test the CRM connection using provided settings or current settings.

```typescript
// Test with current settings
const result = await testCrmConnection()
// Returns: { success: boolean, message?: string, data?: any }

// Test with specific credentials
const resultWithCreds = await testCrmConnection('https://api.example.com', 'your-token')
// Returns: { success: boolean, message?: string, data?: any }
```

### `isCrmConfigured()`
Check if CRM is properly configured.

```typescript
const isConfigured = await isCrmConfigured()
// Returns: boolean
```

## API Usage Examples

### General Settings API

```typescript
// GET /api/settings?format=grouped
const response = await fetch('/api/settings?format=grouped')
const { settings } = await response.json()
// Returns settings grouped by group name

// GET /api/settings?format=object
const response = await fetch('/api/settings?format=object')
const { settings } = await response.json()
// Returns all settings as key-value object

// PUT /api/settings
const response = await fetch('/api/settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    settings: {
      'NEW_SETTING': 'new_value',
      'ANOTHER_SETTING': 'another_value'
    },
    group: 'general' // Optional group for new settings
  })
})
```

### CRM Settings API

```typescript
// GET /api/settings/crm
const response = await fetch('/api/settings/crm')
const { settings, validation, isConfigured } = await response.json()

// GET /api/settings/crm?test=true
const response = await fetch('/api/settings/crm?test=true')
const { settings, validation, isConfigured, connectionTest } = await response.json()

// PUT /api/settings/crm
const response = await fetch('/api/settings/crm', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    apiEndpoint: 'https://new-api.com',
    token: 'new_token'
  })
})

// POST /api/settings/crm (test connection)
const response = await fetch('/api/settings/crm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'test-connection'
  })
})
```

## Frontend Usage Examples

### Settings Management Component

```typescript
// components/settings-form.tsx
import { useState, useEffect } from 'react'
import { getAllCrmSettings, updateCrmSettings, testCrmConnection } from '@/lib/utils/settings/crm-settings'

export function CrmSettingsForm() {
  const [settings, setSettings] = useState({ apiEndpoint: '', token: '' })
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      const crmSettings = await getAllCrmSettings()
      setSettings(crmSettings)
      setLoading(false)
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    const success = await updateCrmSettings(settings)
    if (success) {
      alert('Settings saved successfully!')
    } else {
      alert('Failed to save settings')
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    const result = await testCrmConnection()
    setTesting(false)
    
    if (result.success) {
      alert('Connection test successful!')
    } else {
      alert(`Connection test failed: ${result.error}`)
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <form onSubmit={handleSave}>
      <input
        value={settings.apiEndpoint || ''}
        onChange={(e) => setSettings({ ...settings, apiEndpoint: e.target.value })}
        placeholder="CRM API Endpoint"
      />
      <input
        value={settings.token || ''}
        onChange={(e) => setSettings({ ...settings, token: e.target.value })}
        placeholder="CRM API Token"
        type="password"
      />
      <button type="submit">Save Settings</button>
      <button type="button" onClick={handleTestConnection} disabled={testing}>
        {testing ? 'Testing...' : 'Test Connection'}
      </button>
    </form>
  )
}
```

### Settings Dashboard

```typescript
// components/settings-dashboard.tsx
import { useState, useEffect } from 'react'
import { getSettingsGrouped, validateSettings } from '@/lib/utils/settings'

export function SettingsDashboard() {
  const [groupedSettings, setGroupedSettings] = useState({})
  const [validation, setValidation] = useState({})

  useEffect(() => {
    async function loadSettings() {
      const settings = await getSettingsGrouped()
      setGroupedSettings(settings)
      
      // Validate CRM settings
      const crmValidation = await validateSettings([
        'CENTRAL_CRM_API_ENDPOINT',
        'CENTRAL_CRM_TOKEN'
      ])
      setValidation(crmValidation)
    }
    loadSettings()
  }, [])

  return (
    <div>
      <h2>Settings Dashboard</h2>
      
      {Object.entries(groupedSettings).map(([group, settings]) => (
        <div key={group}>
          <h3>{group}</h3>
          <ul>
            {settings.map(setting => (
              <li key={setting.key}>
                <strong>{setting.key}:</strong> {setting.value}
              </li>
            ))}
          </ul>
        </div>
      ))}
      
      <div>
        <h3>Validation Status</h3>
        <p>CRM Settings Valid: {validation.isValid ? '✅' : '❌'}</p>
        {validation.missingSettings?.length > 0 && (
          <p>Missing: {validation.missingSettings.join(', ')}</p>
        )}
        {validation.emptySettings?.length > 0 && (
          <p>Empty: {validation.emptySettings.join(', ')}</p>
        )}
      </div>
    </div>
  )
}
```

## Error Handling

All functions include proper error handling and will return safe default values:

- Functions that return booleans will return `false` on error
- Functions that return strings will return `null` on error
- Functions that return arrays will return empty arrays on error
- Functions that return objects will return empty objects on error

## Type Safety

The utilities are fully typed with TypeScript:

- `Setting` interface defines the structure of setting records
- `CrmSettings` interface defines the structure of CRM settings
- All function parameters and return types are properly typed
- IDE autocomplete and type checking are fully supported

## Performance Considerations

- All database operations use Prisma's optimized queries
- Bulk operations use `Promise.all()` for parallel execution
- The unique constraint on `key` ensures fast lookups
- Functions are designed to minimize database round trips

## Best Practices

1. **Use group-specific utilities** for related settings (like CRM settings)
2. **Validate input parameters** before calling the functions
3. **Handle errors gracefully** in your application code
4. **Use bulk operations** when updating multiple settings at once
5. **Cache frequently accessed settings** to improve performance
6. **Use TypeScript** to get full type safety and IDE support
7. **Test connections** before saving API credentials
8. **Group related settings** logically for better organization

## API Routes

### `/api/settings`
- **GET**: Fetch all settings (supports `?format=grouped|flat|object`)
- **PUT**: Update settings by group

### `/api/settings/crm`
- **GET**: Fetch all CRM settings
- **PUT**: Update CRM settings

### `/api/settings/crm/test`
- **POST**: Test CRM connection with provided credentials
  - **Body**: `{ apiEndpoint: string, token: string }`
  - **Response**: `{ success: boolean, message: string, data?: any }`
  - **Note**: Tests the `/test` endpoint using `authtoken` header
  - **Success Response**: `{ status: true, message: 'Working' }`
  - **Error Response**: `{ status: false, message: 'Error description' }`

## Security Considerations

1. **Sensitive data**: Store API tokens and passwords securely
2. **Access control**: Only admins should be able to modify settings
3. **Validation**: Always validate setting values before saving
4. **Audit trail**: Consider logging setting changes for security
5. **Environment variables**: Use environment variables for truly sensitive data
