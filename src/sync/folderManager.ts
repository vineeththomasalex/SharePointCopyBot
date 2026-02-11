import { createFolder, getFolderByPath } from '../api/filesApi';

// Cache for folder IDs to avoid redundant API calls
const folderCache = new Map<string, string>();

/**
 * Clear folder cache
 * Should be called at the start of each sync
 */
export function clearFolderCache(): void {
  folderCache.clear();
}

/**
 * Ensure a folder path exists in the destination drive
 * Creates folders recursively if they don't exist
 * Returns the folder ID of the final folder in the path
 */
export async function ensureFolderPath(
  siteId: string,
  driveId: string,
  folderPath: string
): Promise<string> {
  // If path is empty or root, return 'root'
  if (!folderPath || folderPath === '/' || folderPath === '.') {
    return 'root';
  }

  // Check cache first
  const cacheKey = `${siteId}:${driveId}:${folderPath}`;
  if (folderCache.has(cacheKey)) {
    return folderCache.get(cacheKey)!;
  }

  // Split path into parts
  const parts = folderPath.split('/').filter(p => p.length > 0);

  // Build path incrementally
  let currentPath = '';
  let currentFolderId = 'root';

  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    const pathCacheKey = `${siteId}:${driveId}:${currentPath}`;

    // Check if this folder is already cached
    if (folderCache.has(pathCacheKey)) {
      currentFolderId = folderCache.get(pathCacheKey)!;
      continue;
    }

    // Try to get existing folder
    const existingFolder = await getFolderByPath(siteId, driveId, currentPath);

    if (existingFolder) {
      // Folder exists
      currentFolderId = existingFolder.id;
      folderCache.set(pathCacheKey, currentFolderId);
    } else {
      // Create folder
      console.log(`Creating folder: ${currentPath}`);
      const newFolder = await createFolder(siteId, driveId, currentFolderId, part);
      currentFolderId = newFolder.id;
      folderCache.set(pathCacheKey, currentFolderId);
    }
  }

  // Cache the final path
  folderCache.set(cacheKey, currentFolderId);
  return currentFolderId;
}

/**
 * Extract folder path from file path
 */
export function extractFolderPath(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  if (lastSlash === -1) {
    return ''; // File is in root
  }
  return filePath.substring(0, lastSlash);
}

/**
 * Extract file name from file path
 */
export function extractFileName(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  if (lastSlash === -1) {
    return filePath;
  }
  return filePath.substring(lastSlash + 1);
}

/**
 * Get unique folder paths from a list of file paths
 */
export function getUniqueFolderPaths(filePaths: string[]): string[] {
  const folders = new Set<string>();

  for (const filePath of filePaths) {
    const folderPath = extractFolderPath(filePath);
    if (folderPath) {
      // Add all parent folders too
      const parts = folderPath.split('/').filter(p => p.length > 0);
      let currentPath = '';
      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        folders.add(currentPath);
      }
    }
  }

  // Sort folders by depth (shallowest first) for sequential creation
  return Array.from(folders).sort((a, b) => {
    const aDepth = a.split('/').length;
    const bDepth = b.split('/').length;
    return aDepth - bDepth;
  });
}
