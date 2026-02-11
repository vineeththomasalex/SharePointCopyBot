import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useConfigStore } from '../../store/configStore';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';

export default function ConfigPage() {
  const navigate = useNavigate();
  const {
    syncConfig,
    sites,
    sourceDrives,
    destDrives,
    isLoadingSites,
    isLoadingDrives,
    loadSyncConfig,
    loadSites,
    loadSourceDrives,
    loadDestDrives,
    updateSourceSite,
    updateSourceLibrary,
    updateDestSite,
    updateDestLibrary,
    saveSyncConfig
  } = useConfigStore();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSyncConfig();
    loadSites().catch(() => {
      setError('Failed to load SharePoint sites. Please check your permissions.');
    });
  }, []);

  const handleSourceSiteChange = async (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    if (site) {
      updateSourceSite(site.id, site.webUrl);
      try {
        await loadSourceDrives(siteId);
      } catch {
        setError('Failed to load libraries for source site.');
      }
    }
  };

  const handleDestSiteChange = async (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    if (site) {
      updateDestSite(site.id, site.webUrl);
      try {
        await loadDestDrives(siteId);
      } catch {
        setError('Failed to load libraries for destination site.');
      }
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      if (!syncConfig?.sourceSiteId || !syncConfig?.sourceLibraryId) {
        setError('Please select a source site and library');
        return;
      }

      if (!syncConfig?.destSiteId || !syncConfig?.destLibraryId) {
        setError('Please select a destination site and library');
        return;
      }

      await saveSyncConfig({
        sourceSiteId: syncConfig.sourceSiteId,
        sourceSiteUrl: syncConfig.sourceSiteUrl,
        sourceLibraryId: syncConfig.sourceLibraryId,
        sourceLibraryName: syncConfig.sourceLibraryName,
        destSiteId: syncConfig.destSiteId,
        destSiteUrl: syncConfig.destSiteUrl,
        destLibraryId: syncConfig.destLibraryId,
        destLibraryName: syncConfig.destLibraryName,
        lastSyncTime: syncConfig.lastSyncTime || null,
        deltaToken: syncConfig.deltaToken || null
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Load drives when config is loaded
  useEffect(() => {
    if (syncConfig?.sourceSiteId && sourceDrives.length === 0) {
      loadSourceDrives(syncConfig.sourceSiteId).catch(() => {});
    }
    if (syncConfig?.destSiteId && destDrives.length === 0) {
      loadDestDrives(syncConfig.destSiteId).catch(() => {});
    }
  }, [syncConfig]);

  return (
    <AppLayout>
      <Typography variant="h4" gutterBottom>
        Sync Configuration
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Configuration saved successfully! Redirecting to dashboard...
        </Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Source
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Source Site</InputLabel>
                <Select
                  value={syncConfig?.sourceSiteId || ''}
                  onChange={(e) => handleSourceSiteChange(e.target.value)}
                  disabled={isLoadingSites}
                  label="Source Site"
                >
                  {sites.map((site) => (
                    <MenuItem key={site.id} value={site.id}>
                      {site.displayName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Source Library</InputLabel>
                <Select
                  value={syncConfig?.sourceLibraryId || ''}
                  onChange={(e) => {
                    const drive = sourceDrives.find(d => d.id === e.target.value);
                    if (drive) updateSourceLibrary(drive.id, drive.name);
                  }}
                  disabled={!syncConfig?.sourceSiteId || isLoadingDrives}
                  label="Source Library"
                >
                  {sourceDrives.map((drive) => (
                    <MenuItem key={drive.id} value={drive.id}>
                      {drive.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Destination
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Destination Site</InputLabel>
                <Select
                  value={syncConfig?.destSiteId || ''}
                  onChange={(e) => handleDestSiteChange(e.target.value)}
                  disabled={isLoadingSites}
                  label="Destination Site"
                >
                  {sites.map((site) => (
                    <MenuItem key={site.id} value={site.id}>
                      {site.displayName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Destination Library</InputLabel>
                <Select
                  value={syncConfig?.destLibraryId || ''}
                  onChange={(e) => {
                    const drive = destDrives.find(d => d.id === e.target.value);
                    if (drive) updateDestLibrary(drive.id, drive.name);
                  }}
                  disabled={!syncConfig?.destSiteId || isLoadingDrives}
                  label="Destination Library"
                >
                  {destDrives.map((drive) => (
                    <MenuItem key={drive.id} value={drive.id}>
                      {drive.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Box>
      </Stack>

      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving || isLoadingSites || isLoadingDrives}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>

        <Button
          variant="outlined"
          size="large"
          onClick={() => navigate('/dashboard')}
          disabled={saving}
        >
          Cancel
        </Button>
      </Box>
    </AppLayout>
  );
}
