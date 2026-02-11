import { create } from 'zustand';
import { SyncPhase, SyncResult, executeSync } from '../sync/syncOrchestrator';
import { SyncPlan } from '../sync/changeDetector';

interface SyncState {
  // State
  status: 'idle' | 'running' | 'completed' | 'failed';
  phase: SyncPhase | null;
  progress: {
    current: number;
    total: number;
  };
  currentFile: string | null;
  changes: SyncPlan | null;
  result: SyncResult | null;
  error: string | null;

  // Actions
  startSync: () => Promise<void>;
  cancelSync: () => void;
  reset: () => void;
  setChanges: (changes: SyncPlan) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  // Initial state
  status: 'idle',
  phase: null,
  progress: {
    current: 0,
    total: 0
  },
  currentFile: null,
  changes: null,
  result: null,
  error: null,

  // Start sync
  startSync: async () => {
    try {
      set({
        status: 'running',
        phase: 'initializing',
        progress: { current: 0, total: 0 },
        currentFile: null,
        result: null,
        error: null
      });

      const result = await executeSync({
        onProgress: (current, total, fileName) => {
          set({
            progress: { current, total },
            currentFile: fileName
          });
        },
        onPhaseChange: (phase) => {
          set({ phase });
        }
      });

      set({
        status: result.success ? 'completed' : 'failed',
        result,
        error: result.error || null,
        currentFile: null
      });
    } catch (error: any) {
      console.error('Sync failed:', error);
      set({
        status: 'failed',
        error: error.message || 'Sync failed',
        currentFile: null
      });
    }
  },

  // Cancel sync (placeholder - actual implementation would need abort controller)
  cancelSync: () => {
    set({
      status: 'idle',
      phase: null,
      currentFile: null
    });
  },

  // Reset state
  reset: () => {
    set({
      status: 'idle',
      phase: null,
      progress: { current: 0, total: 0 },
      currentFile: null,
      changes: null,
      result: null,
      error: null
    });
  },

  // Set detected changes
  setChanges: (changes: SyncPlan) => {
    set({ changes });
  }
}));
