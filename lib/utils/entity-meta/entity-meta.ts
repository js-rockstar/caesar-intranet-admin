import { prisma } from '@/lib/prisma'

/**
 * EntityMeta utility functions for managing entity metadata
 * Similar to WordPress meta functions but for our EntityMeta table
 */

export interface EntityMeta {
  id: number
  relId: number
  relType: string
  name: string
  value: string
  createdAt: Date
  updatedAt: Date
}

export interface EntityMetaInput {
  relId: number
  relType: string
  name: string
  value: string
}

/**
 * Check if an entity meta key exists
 * @param relId - The related entity ID
 * @param relType - The related entity type (e.g., 'project', 'client')
 * @param metaKey - The meta key name
 * @returns Promise<boolean> - True if the meta key exists
 */
export async function entityMetaKeyExists(
  relId: number,
  relType: string,
  metaKey: string
): Promise<boolean> {
  try {
    if (!relId || !relType || !metaKey) {
      return false
    }

    const count = await prisma.entityMeta.count({
      where: {
        relId,
        relType,
        name: metaKey,
      },
    })

    return count > 0
  } catch (error) {
    return false
  }
}

/**
 * Get a single entity meta value
 * @param relId - The related entity ID
 * @param relType - The related entity type
 * @param metaKey - The meta key name
 * @returns Promise<string | null> - The meta value or null if not found
 */
export async function getEntityMeta(
  relId: number,
  relType: string,
  metaKey: string
): Promise<string | null> {
  try {
    if (!relId || !relType || !metaKey) {
      return null
    }

    const entityMeta = await prisma.entityMeta.findUnique({
      where: {
        relId_relType_name: {
          relId,
          relType,
          name: metaKey,
        },
      },
      select: {
        value: true,
      },
    })

    return entityMeta?.value || null
  } catch (error) {
    return null
  }
}

/**
 * Get all entity meta for a specific entity
 * @param relId - The related entity ID
 * @param relType - The related entity type
 * @param columns - Optional array of columns to select (defaults to all)
 * @returns Promise<EntityMeta[]> - Array of entity meta records
 */
export async function getEntityAllMeta(
  relId: number,
  relType: string,
  columns?: (keyof EntityMeta)[]
): Promise<EntityMeta[]> {
  try {
    if (!relId || !relType) {
      return []
    }

    const selectFields = columns ? 
      columns.reduce((acc, col) => ({ ...acc, [col]: true }), {}) : 
      undefined

    const entityMeta = await prisma.entityMeta.findMany({
      where: {
        relId,
        relType,
      },
      select: selectFields,
      orderBy: {
        id: 'asc',
      },
    })

    return entityMeta as EntityMeta[]
  } catch (error) {
    return []
  }
}

/**
 * Add a new entity meta entry
 * @param relId - The related entity ID
 * @param relType - The related entity type
 * @param metaKey - The meta key name
 * @param metaValue - The meta value
 * @returns Promise<boolean> - True if successfully added
 */
export async function addEntityMeta(
  relId: number,
  relType: string,
  metaKey: string,
  metaValue: string
): Promise<boolean> {
  try {
    if (!relId || !relType || !metaKey) {
      return false
    }

    // Check if the meta key already exists
    const exists = await entityMetaKeyExists(relId, relType, metaKey)
    if (exists) {
      return false // Key already exists, use updateEntityMeta instead
    }

    await prisma.entityMeta.create({
      data: {
        relId,
        relType,
        name: metaKey,
        value: metaValue,
      },
    })

    return true
  } catch (error) {
    return false
  }
}

/**
 * Update an existing entity meta entry
 * @param relId - The related entity ID
 * @param relType - The related entity type
 * @param metaKey - The meta key name
 * @param metaValue - The new meta value
 * @returns Promise<boolean> - True if successfully updated
 */
export async function updateEntityMeta(
  relId: number,
  relType: string,
  metaKey: string,
  metaValue: string
): Promise<boolean> {
  try {
    if (!relId || !relType || !metaKey) {
      return false
    }

    // Check if the meta key exists
    const exists = await entityMetaKeyExists(relId, relType, metaKey)
    
    if (!exists) {
      // Key doesn't exist, create it instead
      return await addEntityMeta(relId, relType, metaKey, metaValue)
    }

    await prisma.entityMeta.update({
      where: {
        relId_relType_name: {
          relId,
          relType,
          name: metaKey,
        },
      },
      data: {
        value: metaValue,
        updatedAt: new Date(),
      },
    })

    return true
  } catch (error) {
    return false
  }
}

/**
 * Delete an entity meta entry
 * @param relId - The related entity ID
 * @param relType - The related entity type
 * @param metaKey - The meta key name
 * @returns Promise<boolean> - True if successfully deleted
 */
export async function deleteEntityMeta(
  relId: number,
  relType: string,
  metaKey: string
): Promise<boolean> {
  try {
    if (!relId || !relType || !metaKey) {
      return false
    }

    // Check if the meta key exists
    const exists = await entityMetaKeyExists(relId, relType, metaKey)
    if (!exists) {
      return false // Key doesn't exist
    }

    await prisma.entityMeta.delete({
      where: {
        relId_relType_name: {
          relId,
          relType,
          name: metaKey,
        },
      },
    })

    return true
  } catch (error) {
    return false
  }
}

/**
 * Upsert entity meta (add if doesn't exist, update if exists)
 * @param relId - The related entity ID
 * @param relType - The related entity type
 * @param metaKey - The meta key name
 * @param metaValue - The meta value
 * @returns Promise<boolean> - True if successfully upserted
 */
export async function upsertEntityMeta(
  relId: number,
  relType: string,
  metaKey: string,
  metaValue: string
): Promise<boolean> {
  try {
    if (!relId || !relType || !metaKey) {
      return false
    }

    await prisma.entityMeta.upsert({
      where: {
        relId_relType_name: {
          relId,
          relType,
          name: metaKey,
        },
      },
      update: {
        value: metaValue,
        updatedAt: new Date(),
      },
      create: {
        relId,
        relType,
        name: metaKey,
        value: metaValue,
      },
    })

    return true
  } catch (error) {
    return false
  }
}

/**
 * Delete all entity meta for a specific entity
 * @param relId - The related entity ID
 * @param relType - The related entity type
 * @returns Promise<number> - Number of deleted records
 */
export async function deleteAllEntityMeta(
  relId: number,
  relType: string
): Promise<number> {
  try {
    if (!relId || !relType) {
      return 0
    }

    const result = await prisma.entityMeta.deleteMany({
      where: {
        relId,
        relType,
      },
    })

    return result.count
  } catch (error) {
    return 0
  }
}

/**
 * Get entity meta as a key-value object
 * @param relId - The related entity ID
 * @param relType - The related entity type
 * @returns Promise<Record<string, string>> - Object with meta keys as keys and values as values
 */
export async function getEntityMetaAsObject(
  relId: number,
  relType: string
): Promise<Record<string, string>> {
  try {
    if (!relId || !relType) {
      return {}
    }

    const entityMeta = await getEntityAllMeta(relId, relType, ['name', 'value'])
    
    return entityMeta.reduce((acc, meta) => {
      acc[meta.name] = meta.value
      return acc
    }, {} as Record<string, string>)
  } catch (error) {
    return {}
  }
}

/**
 * Bulk update entity meta from an object
 * @param relId - The related entity ID
 * @param relType - The related entity type
 * @param metaObject - Object with meta keys and values
 * @returns Promise<boolean> - True if all updates were successful
 */
export async function updateEntityMetaFromObject(
  relId: number,
  relType: string,
  metaObject: Record<string, string>
): Promise<boolean> {
  try {
    if (!relId || !relType || !metaObject) {
      return false
    }

    const promises = Object.entries(metaObject).map(([key, value]) =>
      upsertEntityMeta(relId, relType, key, value)
    )

    const results = await Promise.all(promises)
    return results.every(result => result === true)
  } catch (error) {
    return false
  }
}
