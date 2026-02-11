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
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { Save as SaveIcon, ExpandMore as ExpandMoreIcon, HelpOutline as HelpIcon } from '@mui/icons-material';
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
                  {' '}or see the detailed setup instructions below.
                </Typography>
              </Alert>

              <Accordion sx={{ mb: 3 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HelpIcon color="primary" />
                    <Typography>Step-by-Step: Azure AD App Setup</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="subtitle2" gutterBottom>
                    <strong>Step 1: Register Application</strong>
                  </Typography>
                  <Box component="ol" sx={{ pl: 2, mb: 2, '& li': { mb: 1 } }}>
                    <li>Go to <Link href="https://portal.azure.com" target="_blank">Azure Portal</Link></li>
                    <li>Navigate to "Microsoft Entra ID" (formerly Azure Active Directory)</li>
                    <li>Click "App registrations" → "New registration"</li>
                    <li>Name: "SharePoint Copy Bot" (or your preferred name)</li>
                    <li>Supported account types: "Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant)"</li>
                    <li>Redirect URI: Select "Single-page application (SPA)" and enter your app URL</li>
                    <li>Click "Register"</li>
                  </Box>

                  <Typography variant="subtitle2" gutterBottom>
                    <strong>Step 2: Configure API Permissions (CRITICAL)</strong>
                  </Typography>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>⚠️ IMPORTANT: Use the EXACT permissions below. Wrong permissions will require admin consent!</strong>
                    </Typography>
                  </Alert>
                  <Box component="ol" sx={{ pl: 2, mb: 2, '& li': { mb: 1 } }}>
                    <li>In your app, go to "API permissions"</li>
                    <li>Click "Add a permission" → "Microsoft Graph" → "Delegated permissions"</li>
                    <li>Add these permissions:
                      <Box component="ul" sx={{ mt: 1 }}>
                        <li><strong>User.Read</strong> - Basic user profile (automatically added)</li>
                        <li><strong>Files.ReadWrite</strong> - Read/write user files (NO admin consent required)</li>
                        <li><strong>offline_access</strong> - Maintain access to data (automatically added)</li>
                      </Box>
                    </li>
                    <li><strong>DO NOT ADD:</strong>
                      <Box component="ul" sx={{ mt: 1, color: 'error.main' }}>
                        <li>❌ Files.ReadWrite.All (requires admin consent)</li>
                        <li>❌ Sites.Read.All (requires admin consent)</li>
                        <li>❌ Sites.ReadWrite.All (requires admin consent)</li>
                      </Box>
                    </li>
                    <li>Click "Add permissions"</li>
                  </Box>

                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Difference:</strong> Files.ReadWrite allows access to files the user provides URLs for.
                      Files.ReadWrite.All allows browsing ALL sites, which requires admin consent.
                    </Typography>
                  </Alert>

                  <Typography variant="subtitle2" gutterBottom>
                    <strong>Step 3: Enable Public Client Flow (Optional)</strong>
                  </Typography>
                  <Box component="ol" sx={{ pl: 2, mb: 2, '& li': { mb: 1 } }}>
                    <li>Go to "Authentication"</li>
                    <li>Scroll to "Advanced settings"</li>
                    <li>Enable "Allow public client flows": Yes</li>
                    <li>Click "Save"</li>
                  </Box>

                  <Typography variant="subtitle2" gutterBottom>
                    <strong>Step 4: Copy Application IDs</strong>
                  </Typography>
                  <Box component="ol" sx={{ pl: 2, '& li': { mb: 1 } }}>
                    <li>Go to "Overview"</li>
                    <li>Copy "Application (client) ID" and paste below</li>
                    <li>Copy "Directory (tenant) ID" and paste below</li>
                  </Box>
                </AccordionDetails>
              </Accordion>

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
                <strong>Required API Permissions:</strong> User.Read, Files.ReadWrite, offline_access
              </Typography>
              <Typography variant="caption" color="warning.main" display="block" sx={{ mb: 2 }}>
                ⚠️ <strong>Important:</strong> Use Files.ReadWrite (NOT Files.ReadWrite.All) to avoid admin consent requirement.
                Do NOT add Sites.Read.All or Sites.ReadWrite.All permissions.
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
