# EntityMeta Utilities Documentation

This document describes the EntityMeta utility functions that provide a clean interface for managing entity metadata in the database, similar to WordPress meta functions but adapted for our Next.js application.

## Overview

The EntityMeta utilities provide a comprehensive set of functions for managing metadata associated with any entity in the system. This is particularly useful for storing configuration settings, custom fields, or any key-value data associated with entities like projects, clients, sites, etc.

## Core Functions

### Basic CRUD Operations

#### `entityMetaKeyExists(relId, relType, metaKey)`
Check if an entity meta key exists.

```typescript
const exists = await entityMetaKeyExists(1, 'project', 'CPANEL_DOMAIN')
// Returns: boolean
```

#### `getEntityMeta(relId, relType, metaKey)`
Get a single entity meta value.

```typescript
const value = await getEntityMeta(1, 'project', 'CPANEL_DOMAIN')
// Returns: string | null
```

#### `getEntityAllMeta(relId, relType, columns?)`
Get all entity meta for a specific entity.

```typescript
const allMeta = await getEntityAllMeta(1, 'project')
// Returns: EntityMeta[]

const specificColumns = await getEntityAllMeta(1, 'project', ['name', 'value'])
// Returns: EntityMeta[] with only name and value columns
```

#### `addEntityMeta(relId, relType, metaKey, metaValue)`
Add a new entity meta entry (fails if key already exists).

```typescript
const success = await addEntityMeta(1, 'project', 'NEW_SETTING', 'new_value')
// Returns: boolean
```

#### `updateEntityMeta(relId, relType, metaKey, metaValue)`
Update an existing entity meta entry (creates if doesn't exist).

```typescript
const success = await updateEntityMeta(1, 'project', 'CPANEL_DOMAIN', 'new_domain.com')
// Returns: boolean
```

#### `deleteEntityMeta(relId, relType, metaKey)`
Delete a specific entity meta entry.

```typescript
const success = await deleteEntityMeta(1, 'project', 'OLD_SETTING')
// Returns: boolean
```

### Advanced Operations

#### `upsertEntityMeta(relId, relType, metaKey, metaValue)`
Add or update entity meta in a single operation.

```typescript
const success = await upsertEntityMeta(1, 'project', 'CPANEL_DOMAIN', 'domain.com')
// Returns: boolean
```

#### `deleteAllEntityMeta(relId, relType)`
Delete all entity meta for a specific entity.

```typescript
const deletedCount = await deleteAllEntityMeta(1, 'project')
// Returns: number (count of deleted records)
```

#### `getEntityMetaAsObject(relId, relType)`
Get all entity meta as a key-value object.

```typescript
const metaObject = await getEntityMetaAsObject(1, 'project')
// Returns: Record<string, string>
// Example: { "CPANEL_DOMAIN": "domain.com", "CPANEL_USERNAME": "user" }
```

#### `updateEntityMetaFromObject(relId, relType, metaObject)`
Update multiple entity meta entries from an object.

```typescript
const metaObject = {
  'CPANEL_DOMAIN': 'domain.com',
  'CPANEL_USERNAME': 'username',
  'CPANEL_API_TOKEN': 'token123'
}
const success = await updateEntityMetaFromObject(1, 'project', metaObject)
// Returns: boolean
```

## Project Settings Utilities

For project-specific settings, we provide a higher-level interface that handles the mapping between camelCase property names and UPPER_CASE meta keys.

### `getProjectSetting(projectId, settingName)`
Get a specific project setting.

```typescript
const domain = await getProjectSetting(1, 'CPANEL_DOMAIN')
// Returns: string | null
```

### `updateProjectSetting(projectId, settingName, value)`
Update a specific project setting.

```typescript
const success = await updateProjectSetting(1, 'CPANEL_DOMAIN', 'newdomain.com')
// Returns: boolean
```

### `getAllProjectSettings(projectId)`
Get all project settings as a typed object.

```typescript
const settings = await getAllProjectSettings(1)
// Returns: ProjectSettings
// {
//   cpanelDomain: 'domain.com',
//   cpanelUsername: 'user',
//   cpanelApiToken: 'token',
//   cloudflareUsername: 'cf_user',
//   cloudflareApiKey: 'cf_key',
//   // ... etc
// }
```

### `updateProjectSettings(projectId, settings)`
Update multiple project settings at once.

```typescript
const settings = {
  cpanelDomain: 'newdomain.com',
  cpanelUsername: 'newuser',
  cpanelApiToken: 'newtoken'
}
const success = await updateProjectSettings(1, settings)
// Returns: boolean
```

### `resetProjectSettings(projectId)`
Reset all project settings to default empty values.

```typescript
const success = await resetProjectSettings(1)
// Returns: boolean
```

### `validateProjectSettings(projectId)`
Validate that all required project settings are filled.

```typescript
const validation = await validateProjectSettings(1)
// Returns: { isValid: boolean, missingSettings: string[] }
```

## API Usage Example

Here's how to use these utilities in an API route:

```typescript
// app/api/projects/[id]/settings/route.ts
import { getAllProjectSettings, updateProjectSettings } from '@/lib/utils/entity-meta/project-settings'

export async function GET(request: NextRequest, { params }) {
  const { id } = await params
  const projectId = parseInt(id)
  
  const settings = await getAllProjectSettings(projectId)
  const validation = await validateProjectSettings(projectId)
  
  return NextResponse.json({ settings, validation })
}

export async function PUT(request: NextRequest, { params }) {
  const { id } = await params
  const projectId = parseInt(id)
  const body = await request.json()
  
  const success = await updateProjectSettings(projectId, body)
  
  if (success) {
    const updatedSettings = await getAllProjectSettings(projectId)
    return NextResponse.json({ message: 'Settings updated', settings: updatedSettings })
  } else {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
```

## Frontend Usage Example

Here's how to use these utilities in a React component:

```typescript
// components/project-settings-form.tsx
import { useState, useEffect } from 'react'
import { getAllProjectSettings, updateProjectSettings } from '@/lib/utils/entity-meta/project-settings'

export function ProjectSettingsForm({ projectId }: { projectId: number }) {
  const [settings, setSettings] = useState<ProjectSettings>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSettings() {
      const projectSettings = await getAllProjectSettings(projectId)
      setSettings(projectSettings)
      setLoading(false)
    }
    loadSettings()
  }, [projectId])

  const handleSave = async () => {
    const success = await updateProjectSettings(projectId, settings)
    if (success) {
      alert('Settings saved successfully!')
    } else {
      alert('Failed to save settings')
    }
  }

  if (loading) return <div>Loading...</div>

  return (
    <form onSubmit={handleSave}>
      <input
        value={settings.cpanelDomain || ''}
        onChange={(e) => setSettings({ ...settings, cpanelDomain: e.target.value })}
        placeholder="cPanel Domain"
      />
      {/* ... other fields */}
      <button type="submit">Save Settings</button>
    </form>
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

- `EntityMeta` interface defines the structure of meta records
- `ProjectSettings` interface defines the structure of project settings
- All function parameters and return types are properly typed
- IDE autocomplete and type checking are fully supported

## Performance Considerations

- All database operations use Prisma's optimized queries
- Bulk operations use `Promise.all()` for parallel execution
- The unique constraint on `(relId, relType, name)` ensures fast lookups
- Functions are designed to minimize database round trips

## Migration from PHP

If you're migrating from the PHP version, here are the key differences:

1. **Function Names**: Converted to camelCase (e.g., `add_entity_meta` → `addEntityMeta`)
2. **Return Types**: All functions return Promises for async operations
3. **Error Handling**: Uses try-catch blocks instead of checking affected rows
4. **Type Safety**: Full TypeScript support with interfaces and type checking
5. **Database**: Uses Prisma ORM instead of raw database queries

## Best Practices

1. **Use the project-specific utilities** for project settings instead of the generic EntityMeta functions
2. **Validate input parameters** before calling the functions
3. **Handle errors gracefully** in your application code
4. **Use bulk operations** when updating multiple settings at once
5. **Cache frequently accessed settings** to improve performance
6. **Use TypeScript** to get full type safety and IDE support
