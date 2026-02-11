import { executeGraphRequest } from './graphClient';
import { parseSharePointUrl, buildGraphSitePath } from '../utils/sharepointUrlParser';

// Type definitions for Graph API responses
export interface Site {
  id: string;
  displayName: string;
  name: string;
  webUrl: string;
  description?: string;
}

export interface Drive {
  id: string;
  name: string;
  description?: string;
  driveType: string;
  webUrl: string;
}

export interface DriveItem {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  folder?: { childCount: number };
  file?: { mimeType: string };
  parentReference?: {
    driveId: string;
    id: string;
    path: string;
  };
  '@microsoft.graph.downloadUrl'?: string;
}

/**
 * Get all SharePoint sites accessible to the user
 */
export async function getSites(): Promise<Site[]> {
  return executeGraphRequest(async (client) => {
    const response = await client
      .api('/sites')
      .filter('siteCollection/root ne null')
      .select('id,displayName,name,webUrl,description')
      .top(100)
      .get();

    return response.value || [];
  });
}

/**
 * Search for SharePoint sites by name
 */
export async function searchSites(query: string): Promise<Site[]> {
  return executeGraphRequest(async (client) => {
    const response = await client
      .api('/sites')
      .filter(`siteCollection/root ne null and contains(displayName,'${query}')`)
      .select('id,displayName,name,webUrl,description')
      .get();

    return response.value || [];
  });
}

/**
 * Get a specific site by ID
 */
export async function getSite(siteId: string): Promise<Site> {
  return executeGraphRequest(async (client) => {
    return await client
      .api(`/sites/${siteId}`)
      .select('id,displayName,name,webUrl,description')
      .get();
  });
}

/**
 * Get a site by SharePoint URL
 */
export async function getSiteByUrl(siteUrl: string): Promise<Site> {
  return executeGraphRequest(async (client) => {
    // Extract hostname and path from URL
    const url = new URL(siteUrl);
    const hostname = url.hostname;
    const path = url.pathname;

    return await client
      .api(`/sites/${hostname}:${path}`)
      .select('id,displayName,name,webUrl,description')
      .get();
  });
}

/**
 * Get all document libraries (drives) for a site
 */
export async function getDrives(siteId: string): Promise<Drive[]> {
  return executeGraphRequest(async (client) => {
    const response = await client
      .api(`/sites/${siteId}/drives`)
      .select('id,name,description,driveType,webUrl')
      .get();

    return response.value || [];
  });
}

/**
 * Get a specific drive
 */
export async function getDrive(siteId: string, driveId: string): Promise<Drive> {
  return executeGraphRequest(async (client) => {
    return await client
      .api(`/sites/${siteId}/drives/${driveId}`)
      .select('id,name,description,driveType,webUrl')
      .get();
  });
}

/**
 * Get drive by library name
 */
export async function getDriveByName(siteId: string, libraryName: string): Promise<Drive | null> {
  const drives = await getDrives(siteId);
  return drives.find(d => d.name === libraryName) || null;
}

/**
 * Get library information (alias for getDrive)
 */
export async function getLibraryInfo(siteId: string, driveId: string): Promise<Drive> {
  return getDrive(siteId, driveId);
}

/**
 * Resolved SharePoint location information
 */
export interface ResolvedSharePointLocation {
  siteId: string;
  siteUrl: string;
  siteName: string;
  driveId: string;
  driveName: string;
  folderPath: string;
  folderId?: string;  // Resolved folder item ID (optional)
}

/**
 * Resolve a SharePoint URL to site/drive/folder information
 * This validates user has access and extracts all necessary IDs
 */
export async function resolveSharePointUrl(url: string): Promise<ResolvedSharePointLocation> {
  // Step 1: Parse URL
  const parsed = parseSharePointUrl(url);

  // Step 2: Get site using URL-based lookup
  const sitePath = buildGraphSitePath(parsed.hostname, parsed.sitePath);
  const siteUrl = `https://${parsed.hostname}${parsed.sitePath || ''}`;

  let site: Site;
  try {
    site = await getSiteByUrl(sitePath);
  } catch (error: any) {
    if (error?.statusCode === 404 || error?.message?.includes('404')) {
      throw new Error(`SharePoint site not found at: ${siteUrl}. Please check the URL and ensure you have access.`);
    }
    if (error?.statusCode === 403 || error?.message?.includes('403') || error?.message?.includes('Access denied')) {
      throw new Error(`Access denied to SharePoint site: ${siteUrl}. Please ensure you have permission to access this site.`);
    }
    throw new Error(`Failed to access SharePoint site: ${error.message || 'Unknown error'}`);
  }

  // Step 3: Get drives for this site
  let drives: Drive[];
  try {
    drives = await getDrives(site.id);
  } catch (error: any) {
    throw new Error(`Failed to list document libraries in site: ${error.message || 'Unknown error'}`);
  }

  // Step 4: Find matching drive by name
  const drive = drives.find(d => d.name === parsed.libraryName);
  if (!drive) {
    const availableLibraries = drives.map(d => d.name).join(', ');
    throw new Error(
      `Document library "${parsed.libraryName}" not found. Available libraries: ${availableLibraries || 'none'}`
    );
  }

  // Step 5: Optionally resolve folder ID if folder path provided
  let folderId: string | undefined;
  if (parsed.folderPath) {
    try {
      const folderItem = await executeGraphRequest(async (client) => {
        return await client
          .api(`/sites/${site.id}/drives/${drive.id}/root:/${parsed.folderPath}`)
          .select('id,name,folder')
          .get();
      });

      if (!folderItem.folder) {
        throw new Error(`Path "${parsed.folderPath}" is not a folder`);
      }

      folderId = folderItem.id;
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.message?.includes('404')) {
        throw new Error(
          `Folder not found: "${parsed.folderPath}" in library "${parsed.libraryName}". Please check the URL is correct.`
        );
      }
      throw new Error(`Failed to access folder: ${error.message || 'Unknown error'}`);
    }
  }

  // Step 6: Return resolved location
  return {
    siteId: site.id,
    siteUrl: site.webUrl,
    siteName: site.displayName || site.name,
    driveId: drive.id,
    driveName: drive.name,
    folderPath: parsed.folderPath,
    folderId
  };
}
