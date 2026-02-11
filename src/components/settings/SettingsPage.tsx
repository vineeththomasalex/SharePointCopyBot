import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
  Alert,
  Link,
  Divider
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import AppLayout from '../layout/AppLayout';
import { useConfigStore } from '../../store/configStore';
import { useAuthStore } from '../../store/authStore';

export default function SettingsPage() {
  const { authConfig, loadAuthConfig, saveAuthConfig, clearAuthConfig } = useConfigStore();
  const { reinitialize } = useAuthStore();

  const [useCustomAuth, setUseCustomAuth] = useState(false);
  const [clientId, setClientId] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadAuthConfig();
  }, []);

  useEffect(() => {
    if (authConfig) {
      setUseCustomAuth(authConfig.useCustomAuth);
      setClientId(authConfig.clientId || '');
      setTenantId(authConfig.tenantId || '');
    }
  }, [authConfig]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      if (useCustomAuth && (!clientId || !tenantId)) {
        setError('Client ID and Tenant ID are required when using custom authentication');
        return;
      }

      await saveAuthConfig({
        useCustomAuth,
        clientId: useCustomAuth ? clientId : undefined,
        tenantId: useCustomAuth ? tenantId : undefined
      });

      // Re-initialize MSAL with new credentials
      await reinitialize();

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear custom authentication settings and revert to defaults?')) {
      try {
        await clearAuthConfig();
        await reinitialize();
        setUseCustomAuth(false);
        setClientId('');
        setTenantId('');
        setSuccess(true);
      } catch (err: any) {
        setError(err.message || 'Failed to clear settings');
      }
    }
  };

  return (
    <AppLayout>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully! Please log in again.
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Authentication Settings
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={useCustomAuth}
                onChange={(e) => setUseCustomAuth(e.target.checked)}
              />
            }
            label="Use custom Azure AD app"
          />

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
            By default, this app uses a pre-configured Azure AD application.
            You can optionally configure your own Azure AD app for complete independence.
          </Typography>

          {useCustomAuth && (
            <Box sx={{ mt: 3 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  To create your own Azure AD app, follow the{' '}
                  <Link
                    href="https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app"
                    target="_blank"
                    rel="noopener"
                  >
                    official Microsoft documentation
                  </Link>
                  {' '}or see the AZURE_AD_SETUP.md file in the project repository.
                </Typography>
              </Alert>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <TextField
                  label="Application (Client) ID"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  helperText="Found in Azure Portal → App Registrations → Your App → Overview"
                />
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <TextField
                  label="Directory (Tenant) ID"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  helperText="Found in Azure Portal → App Registrations → Your App → Overview. Note: For multi-tenant apps, any organizational account can sign in."
                />
              </FormControl>

              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                <strong>Required API Permissions:</strong> User.Read, Sites.Read.All,
                Sites.ReadWrite.All, Files.ReadWrite.All, offline_access
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save & Re-initialize'}
            </Button>

            {useCustomAuth && authConfig?.useCustomAuth && (
              <Button
                variant="outlined"
                color="warning"
                onClick={handleClear}
                disabled={saving}
              >
                Clear Custom Settings
              </Button>
            )}
          </Box>

          <Alert severity="warning" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Note:</strong> After changing authentication settings, you will need to
              log in again for the changes to take effect.
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            About
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            SharePoint Bot v0.1.0
          </Typography>
          <Typography variant="body2" color="text.secondary">
            A browser-based tool for synchronizing files between SharePoint document libraries.
            No backend infrastructure required - runs entirely in your browser.
          </Typography>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
