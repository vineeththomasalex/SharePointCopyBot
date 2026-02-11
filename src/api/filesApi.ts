import { executeGraphRequest } from './graphClient';
import { DriveItem } from './sitesApi';

// Delta query response types
export interface DeltaResponse {
  files: DriveItem[];
  deltaToken: string;
  hasMore: boolean;
}

/**
 * Get initial files using delta query
 * Returns all files and folders in the drive (or specific folder if folderPath provided)
 */
export async function getInitialFiles(
  siteId: string,
  driveId: string,
  folderPath?: string
): Promise<DeltaResponse> {
  return executeGraphRequest(async (client) => {
    let allFiles: DriveItem[] = [];
    let nextLink: string | undefined;
    let deltaLink: string | undefined;

    // Build API path based on whether we're syncing a folder or entire drive
    const apiPath = folderPath
      ? `/sites/${siteId}/drives/${driveId}/root:/${folderPath}:/delta`
      : `/sites/${siteId}/drives/${driveId}/root/delta`;

    // Initial delta query
    let response = await client
      .api(apiPath)
      .select('id,name,size,webUrl,createdDateTime,lastModifiedDateTime,folder,file,parentReference,deleted')
      .get();

    allFiles = allFiles.concat(response.value || []);
    nextLink = response['@odata.nextLink'];
    deltaLink = response['@odata.deltaLink'];

    // Handle pagination
    while (nextLink) {
      response = await client.api(nextLink).get();
      allFiles = allFiles.concat(response.value || []);
      nextLink = response['@odata.nextLink'];
      deltaLink = response['@odata.deltaLink'];
    }

    // Extract delta token from deltaLink
    const deltaToken = extractDeltaToken(deltaLink || '');

    return {
      files: allFiles,
      deltaToken,
      hasMore: false
    };
  });
}

/**
 * Get changed files using delta query with token
 * Returns only files that changed since last query
 */
export async function getChangedFiles(
  siteId: string,
  driveId: string,
  deltaToken: string,
  folderPath?: string
): Promise<DeltaResponse> {
  return executeGraphRequest(async (client) => {
    let allFiles: DriveItem[] = [];
    let nextLink: string | undefined;
    let deltaLink: string | undefined;

    // Build API path based on whether we're syncing a folder or entire drive
    const apiPath = folderPath
      ? `/sites/${siteId}/drives/${driveId}/root:/${folderPath}:/delta`
      : `/sites/${siteId}/drives/${driveId}/root/delta`;

    // Delta query with token
    let response = await client
      .api(apiPath)
      .query({ token: deltaToken })
      .select('id,name,size,webUrl,createdDateTime,lastModifiedDateTime,folder,file,parentReference,deleted')
      .get();

    allFiles = allFiles.concat(response.value || []);
    nextLink = response['@odata.nextLink'];
    deltaLink = response['@odata.deltaLink'];

    // Handle pagination
    while (nextLink) {
      response = await client.api(nextLink).get();
      allFiles = allFiles.concat(response.value || []);
      nextLink = response['@odata.nextLink'];
      deltaLink = response['@odata.deltaLink'];
    }

    // Extract delta token from deltaLink
    const newDeltaToken = extractDeltaToken(deltaLink || '');

    return {
      files: allFiles,
      deltaToken: newDeltaToken,
      hasMore: false
    };
  });
}

/**
 * Extract delta token from delta link URL
 */
function extractDeltaToken(deltaLink: string): string {
  if (!deltaLink) return '';

  const url = new URL(deltaLink);
  const token = url.searchParams.get('token');
  return token || '';
}

/**
 * Get a single file/folder item
 */
export async function getDriveItem(siteId: string, driveId: string, itemId: string): Promise<DriveItem> {
  return executeGraphRequest(async (client) => {
    return await client
      .api(`/sites/${siteId}/drives/${driveId}/items/${itemId}`)
      .select('id,name,size,webUrl,createdDateTime,lastModifiedDateTime,folder,file,parentReference')
      .get();
  });
}

/**
 * Create a folder in the destination drive
 */
export async function createFolder(
  siteId: string,
  driveId: string,
  parentFolderId: string,
  folderName: string
): Promise<DriveItem> {
  return executeGraphRequest(async (client) => {
    return await client
      .api(`/sites/${siteId}/drives/${driveId}/items/${parentFolderId}/children`)
      .post({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'replace'
      });
  });
}

/**
 * Get folder by path
 */
export async function getFolderByPath(
  siteId: string,
  driveId: string,
  folderPath: string
): Promise<DriveItem | null> {
  try {
    return await executeGraphRequest(async (client) => {
      return await client
        .api(`/sites/${siteId}/drives/${driveId}/root:/${folderPath}`)
        .select('id,name,folder')
        .get();
    });
  } catch (error: any) {
    if (error?.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Copy a file using Graph API copy operation
 * Returns the monitor URL to check copy status
 */
export async function copyFile(
  sourceSiteId: string,
  sourceDriveId: string,
  sourceItemId: string,
  _destSiteId: string,
  destDriveId: string,
  destFolderId: string,
  fileName: string
): Promise<string> {
  return executeGraphRequest(async (client) => {
    const response = await client
      .api(`/sites/${sourceSiteId}/drives/${sourceDriveId}/items/${sourceItemId}/copy`)
      .post({
        parentReference: {
          driveId: destDriveId,
          id: destFolderId
        },
        name: fileName,
        '@microsoft.graph.conflictBehavior': 'replace'
      });

    // Return the Location header which contains the monitor URL
    return response.headers.get('Location') || '';
  });
}

/**
 * Monitor copy operation status
 */
export async function getCopyStatus(monitorUrl: string): Promise<{
  status: string;
  percentComplete?: number;
  resourceId?: string;
}> {
  return executeGraphRequest(async (client) => {
    const response = await client.api(monitorUrl).get();
    return {
      status: response.status,
      percentComplete: response.percentageComplete,
      resourceId: response.resourceId
    };
  });
}

/**
 * Download file content (for fallback copy method)
 */
export async function downloadFile(
  siteId: string,
  driveId: string,
  itemId: string
): Promise<Blob> {
  return executeGraphRequest(async (client) => {
    // Get download URL
    const item = await client
      .api(`/sites/${siteId}/drives/${driveId}/items/${itemId}`)
      .select('@microsoft.graph.downloadUrl')
      .get();

    const downloadUrl = item['@microsoft.graph.downloadUrl'];
    if (!downloadUrl) {
      throw new Error('Download URL not available');
    }

    // Download file content
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    return await response.blob();
  });
}

/**
 * Upload file content (for fallback copy method)
 */
export async function uploadFile(
  siteId: string,
  driveId: string,
  parentFolderId: string,
  fileName: string,
  content: Blob
): Promise<DriveItem> {
  return executeGraphRequest(async (client) => {
    // For files < 4MB, use simple upload
    if (content.size < 4 * 1024 * 1024) {
      return await client
        .api(`/sites/${siteId}/drives/${driveId}/items/${parentFolderId}:/${fileName}:/content`)
        .put(content);
    }

    // For larger files, use upload session (resumable upload)
    const uploadSession = await client
      .api(`/sites/${siteId}/drives/${driveId}/items/${parentFolderId}:/${fileName}:/createUploadSession`)
      .post({
        item: {
          '@microsoft.graph.conflictBehavior': 'replace'
        }
      });

    const uploadUrl = uploadSession.uploadUrl;

    // Upload in chunks
    const chunkSize = 320 * 1024; // 320 KB chunks
    const totalSize = content.size;
    let start = 0;

    while (start < totalSize) {
      const end = Math.min(start + chunkSize, totalSize);
      const chunk = content.slice(start, end);

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Range': `bytes ${start}-${end - 1}/${totalSize}`,
          'Content-Length': chunk.size.toString()
        },
        body: chunk
      });

      if (response.status === 201 || response.status === 200) {
        // Upload complete
        return await response.json();
      } else if (response.status === 202) {
        // Continue uploading
        start = end;
      } else {
        throw new Error(`Upload failed with status ${response.status}`);
      }
    }

    throw new Error('Upload failed');
  });
}

/**
 * Delete a file or folder
 */
export async function deleteItem(siteId: string, driveId: string, itemId: string): Promise<void> {
  return executeGraphRequest(async (client) => {
    await client
      .api(`/sites/${siteId}/drives/${driveId}/items/${itemId}`)
      .delete();
  });
}
