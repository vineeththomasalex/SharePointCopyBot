import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  HelpOutline as HelpIcon
} from '@mui/icons-material';
import { useConfigStore } from '../../store/configStore';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';

export default function ConfigPage() {
  const navigate = useNavigate();
  const {
    syncConfig,
    sourceUrl,
    destUrl,
    isValidatingUrls,
    urlValidationError,
    loadSyncConfig,
    setSourceUrl,
    setDestUrl,
    validateAndSaveUrls
  } = useConfigStore();

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSyncConfig();
  }, []);

  const handleValidateAndSave = async () => {
    try {
      setError(null);
      setSuccess(false);

      await validateAndSaveUrls();

      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to validate and save configuration');
    }
  };

  const isConfigured = syncConfig?.sourceSiteId && syncConfig?.destSiteId;

  return (
    <AppLayout>
      <Typography variant="h4" gutterBottom>
        Sync Configuration
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Provide SharePoint folder URLs to configure sync between source and destination locations.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {urlValidationError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {urlValidationError}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircleIcon />}>
          Configuration saved successfully! Redirecting to dashboard...
        </Alert>
      )}

      {isConfigured && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Current Configuration:
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Chip
              label={`Source: ${syncConfig?.sourceLibraryName}${syncConfig?.sourceFolderPath ? '/' + syncConfig.sourceFolderPath : ''}`}
              size="small"
              sx={{ mr: 1, mb: 1 }}
            />
            <Chip
              label={`Destination: ${syncConfig?.destLibraryName}${syncConfig?.destFolderPath ? '/' + syncConfig.destFolderPath : ''}`}
              size="small"
              sx={{ mb: 1 }}
            />
          </Box>
        </Alert>
      )}

      <Stack spacing={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              Source Location
            </Typography>

            <TextField
              fullWidth
              label="Source SharePoint Folder URL"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://contoso.sharepoint.com/sites/sitename/Shared Documents/SourceFolder"
              helperText="Paste the URL of the SharePoint folder you want to copy from"
              disabled={isValidatingUrls}
              multiline
              rows={2}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              Destination Location
            </Typography>

            <TextField
              fullWidth
              label="Destination SharePoint Folder URL"
              value={destUrl}
              onChange={(e) => setDestUrl(e.target.value)}
              placeholder="https://contoso.sharepoint.com/sites/sitename/Shared Documents/DestFolder"
              helperText="Paste the URL of the SharePoint folder you want to copy to"
              disabled={isValidatingUrls}
              multiline
              rows={2}
            />
          </CardContent>
        </Card>

        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <HelpIcon color="primary" />
              <Typography>How to get a SharePoint folder URL?</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" paragraph>
              Follow these steps to get the URL of a SharePoint folder:
            </Typography>
            <Box component="ol" sx={{ pl: 2, '& li': { mb: 1 } }}>
              <li>
                <Typography variant="body2">
                  Open SharePoint in your web browser
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Navigate to the document library (e.g., "Shared Documents")
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Click on the folder you want to sync to open it
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Copy the URL from your browser's address bar
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Paste it into the text field above
                </Typography>
              </li>
            </Box>
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Example URL:</strong><br />
                https://contoso.sharepoint.com/sites/TeamSite/Shared Documents/Projects/2024
              </Typography>
            </Alert>
            <Typography variant="body2" sx={{ mt: 2 }}>
              <strong>Note:</strong> You can also use library root URLs without a specific folder path if you want to sync the entire library.
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Stack>

      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={isValidatingUrls ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={handleValidateAndSave}
          disabled={isValidatingUrls || !sourceUrl || !destUrl}
        >
          {isValidatingUrls ? 'Validating & Saving...' : 'Validate & Save Configuration'}
        </Button>

        <Button
          variant="outlined"
          size="large"
          onClick={() => navigate('/dashboard')}
          disabled={isValidatingUrls}
        >
          Cancel
        </Button>
      </Box>
    </AppLayout>
  );
}
