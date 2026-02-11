import { executeGraphRequest } from './graphClient';

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
