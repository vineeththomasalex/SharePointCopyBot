/**
 * SharePoint URL Parser Utility
 *
 * Parses SharePoint URLs to extract components needed for Graph API calls
 * Handles various URL formats:
 * - https://contoso.sharepoint.com/sites/sitename/Shared Documents/folder
 * - https://contoso.sharepoint.com/sites/sitename/LibraryName/folder/subfolder
 * - https://contoso.sharepoint.com/Shared Documents/folder (root site)
 */

export interface ParsedSharePointUrl {
  hostname: string;        // contoso.sharepoint.com
  sitePath: string;        // /sites/sitename or empty for root site
  libraryName: string;     // Shared Documents
  folderPath: string;      // folder/subfolder (relative path within library)
  fullUrl: string;         // Original URL
}

/**
 * Parse a SharePoint URL into its components
 */
export function parseSharePointUrl(urlString: string): ParsedSharePointUrl {
  // Validate input
  if (!urlString || typeof urlString !== 'string') {
    throw new Error('Invalid URL: URL must be a non-empty string');
  }

  // Parse URL
  let url: URL;
  try {
    url = new URL(urlString.trim());
  } catch (error) {
    throw new Error('Invalid URL format. Please provide a valid SharePoint URL.');
  }

  // Validate it's a SharePoint URL
  if (!url.hostname.includes('sharepoint.com')) {
    throw new Error('Not a SharePoint URL. URL must be from sharepoint.com domain.');
  }

  const hostname = url.hostname;
  const pathname = decodeURIComponent(url.pathname);

  // Parse pathname to extract site path, library name, and folder path
  const pathParts = pathname.split('/').filter(p => p.length > 0);

  if (pathParts.length === 0) {
    throw new Error('Invalid SharePoint URL: No path found');
  }

  let sitePath = '';
  let libraryName = '';
  let folderPath = '';

  // Check if it's a site URL (contains /sites/)
  if (pathParts[0] === 'sites' && pathParts.length >= 2) {
    // Format: /sites/sitename/Library/folder
    sitePath = `/sites/${pathParts[1]}`;

    if (pathParts.length >= 3) {
      libraryName = pathParts[2];

      if (pathParts.length > 3) {
        folderPath = pathParts.slice(3).join('/');
      }
    } else {
      throw new Error('Invalid SharePoint URL: Library name not found');
    }
  } else {
    // Root site format: /Library/folder
    sitePath = '';
    libraryName = pathParts[0];

    if (pathParts.length > 1) {
      folderPath = pathParts.slice(1).join('/');
    }
  }

  if (!libraryName) {
    throw new Error('Invalid SharePoint URL: Could not extract library name');
  }

  return {
    hostname,
    sitePath,
    libraryName,
    folderPath,
    fullUrl: urlString.trim()
  };
}

/**
 * Build Graph API site path format
 * Format: {hostname}:{sitePath}
 * Example: contoso.sharepoint.com:/sites/sitename
 */
export function buildGraphSitePath(hostname: string, sitePath: string): string {
  // For root site, sitePath is empty
  if (!sitePath || sitePath === '/') {
    return `${hostname}:/`;
  }

  return `${hostname}:${sitePath}`;
}

/**
 * Validate SharePoint URL format (basic check)
 */
export function isValidSharePointUrl(urlString: string): boolean {
  try {
    parseSharePointUrl(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract site URL from full SharePoint URL
 */
export function extractSiteUrl(urlString: string): string {
  const parsed = parseSharePointUrl(urlString);
  return `https://${parsed.hostname}${parsed.sitePath}`;
}
