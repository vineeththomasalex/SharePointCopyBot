import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  LinearProgress,
  Chip,
  Paper,
  Stack
} from '@mui/material';
import {
  Sync as SyncIcon,
  Settings as SettingsIcon,
  CheckCircle,
  Error as ErrorIcon,
  Folder as FolderIcon,
  CloudUpload
} from '@mui/icons-material';
import AppLayout from '../layout/AppLayout';
import { useConfigStore } from '../../store/configStore';
import { useSyncStore } from '../../store/syncStore';

export default function SyncDashboard() {
  const navigate = useNavigate();
  const { syncConfig, loadSyncConfig } = useConfigStore();
  const { status, phase, progress, currentFile, result, startSync, reset } = useSyncStore();

  useEffect(() => {
    loadSyncConfig();
  }, []);

  const handleStartSync = async () => {
    reset();
    await startSync();
  };

  const isConfigured = syncConfig?.sourceSiteId && syncConfig?.destSiteId;

  const getPhaseLabel = (phase: string | null) => {
    const labels: Record<string, string> = {
      initializing: 'Initializing...',
      fetching_files: 'Fetching files...',
      detecting_changes: 'Detecting changes...',
      creating_folders: 'Creating folders...',
      copying_files: 'Copying files...',
      updating_database: 'Updating database...',
      completed: 'Completed',
      failed: 'Failed'
    };
    return labels[phase || ''] || phase || '';
  };

  return (
    <AppLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Sync Dashboard
        </Typography>

        {!isConfigured && (
          <Alert
            severity="warning"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => navigate('/config')}
              >
                Configure Now
              </Button>
            }
          >
            Sync is not configured yet. Please configure source and destination libraries.
          </Alert>
        )}
      </Box>

      {isConfigured && (
        <>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FolderIcon sx={{ mr: 1 }} color="primary" />
                    <Typography variant="h6">Source</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {syncConfig?.sourceSiteUrl}
                  </Typography>
                  <Chip label={syncConfig?.sourceLibraryName} size="small" />
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CloudUpload sx={{ mr: 1 }} color="primary" />
                    <Typography variant="h6">Destination</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {syncConfig?.destSiteUrl}
                  </Typography>
                  <Chip label={syncConfig?.destLibraryName} size="small" />
                </CardContent>
              </Card>
            </Box>
          </Stack>

          {syncConfig.lastSyncTime && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Last sync: {format(new Date(syncConfig.lastSyncTime), 'PPpp')}
              </Typography>
            </Paper>
          )}

          {status === 'running' && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Sync in Progress
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {getPhaseLabel(phase)}
                  </Typography>
                </Box>

                <LinearProgress
                  variant={progress.total > 0 ? 'determinate' : 'indeterminate'}
                  value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0}
                  sx={{ mb: 2 }}
                />

                {currentFile && (
                  <Typography variant="body2" color="text.secondary">
                    Current file: {currentFile}
                  </Typography>
                )}

                {progress.total > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Progress: {progress.current} / {progress.total}
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}

          {status === 'completed' && result && (
            <Alert
              severity="success"
              icon={<CheckCircle />}
              sx={{ mb: 3 }}
              onClose={reset}
            >
              <Typography variant="subtitle1" gutterBottom>
                Sync completed successfully!
              </Typography>
              <Typography variant="body2">
                Added: {result.filesAdded}, Modified: {result.filesModified},
                Deleted: {result.filesDeleted}, Failed: {result.filesFailed}
              </Typography>
              <Typography variant="body2">
                Duration: {(result.duration / 1000).toFixed(1)}s
              </Typography>
            </Alert>
          )}

          {status === 'failed' && result && (
            <Alert
              severity="error"
              icon={<ErrorIcon />}
              sx={{ mb: 3 }}
              onClose={reset}
            >
              <Typography variant="subtitle1" gutterBottom>
                Sync failed
              </Typography>
              <Typography variant="body2">
                {result.error || 'Unknown error occurred'}
              </Typography>
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<SyncIcon />}
              onClick={handleStartSync}
              disabled={status === 'running'}
            >
              {status === 'running' ? 'Syncing...' : 'Start Sync'}
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={<SettingsIcon />}
              onClick={() => navigate('/config')}
              disabled={status === 'running'}
            >
              Configure
            </Button>
          </Box>
        </>
      )}
    </AppLayout>
  );
}
