import { DriveItem } from '../api/sitesApi';
import { FileSnapshot } from '../db/schema';
import { buildFilePath, isDeleted } from './deltaQuery';

// Change categories
export interface SyncPlan {
  newFiles: DriveItem[];
  modifiedFiles: DriveItem[];
  deletedFiles: string[]; // File IDs
  unchangedFiles: DriveItem[];
  totalChanges: number;
}

/**
 * Detect changes between previous snapshot and current files
 */
export function detectChanges(
  currentFiles: DriveItem[],
  previousSnapshots: FileSnapshot[]
): SyncPlan {
  const newFiles: DriveItem[] = [];
  const modifiedFiles: DriveItem[] = [];
  const deletedFiles: string[] = [];
  const unchangedFiles: DriveItem[] = [];

  // Create a map of previous files for quick lookup
  const previousMap = new Map<string, FileSnapshot>();
  previousSnapshots.forEach(snapshot => {
    previousMap.set(snapshot.id, snapshot);
  });

  // Track which previous files we've seen
  const seenIds = new Set<string>();

  // Analyze current files
  for (const file of currentFiles) {
    // Skip folders
    if (file.folder) continue;

    // Check if file is marked as deleted in delta response
    if (isDeleted(file)) {
      deletedFiles.push(file.id);
      seenIds.add(file.id);
      continue;
    }

    const previous = previousMap.get(file.id);

    if (!previous) {
      // New file
      newFiles.push(file);
    } else if (isFileModified(file, previous)) {
      // Modified file
      modifiedFiles.push(file);
    } else {
      // Unchanged file
      unchangedFiles.push(file);
    }

    seenIds.add(file.id);
  }

  // Find files that were in previous snapshot but not in current
  // (deleted files that weren't marked as deleted in delta response)
  for (const [id, snapshot] of previousMap) {
    if (!seenIds.has(id) && !snapshot.isDeleted) {
      deletedFiles.push(id);
    }
  }

  const totalChanges = newFiles.length + modifiedFiles.length + deletedFiles.length;

  return {
    newFiles,
    modifiedFiles,
    deletedFiles,
    unchangedFiles,
    totalChanges
  };
}

/**
 * Check if file has been modified
 */
function isFileModified(current: DriveItem, previous: FileSnapshot): boolean {
  // Compare last modified time
  if (current.lastModifiedDateTime !== previous.lastModifiedDateTime) {
    return true;
  }

  // Compare file size
  if (current.size !== previous.size) {
    return true;
  }

  return false;
}

/**
 * Convert DriveItem to FileSnapshot
 */
export function driveItemToSnapshot(item: DriveItem, syncConfigId: string = '1'): FileSnapshot {
  return {
    id: item.id,
    name: item.name,
    path: buildFilePath(item),
    lastModifiedDateTime: item.lastModifiedDateTime,
    size: item.size,
    parentId: item.parentReference?.id,
    isCopied: false,
    isDeleted: false,
    syncConfigId
  };
}

/**
 * Convert multiple DriveItems to FileSnapshots
 */
export function driveItemsToSnapshots(items: DriveItem[], syncConfigId: string = '1'): FileSnapshot[] {
  return items
    .filter(item => !item.folder) // Only files
    .map(item => driveItemToSnapshot(item, syncConfigId));
}
