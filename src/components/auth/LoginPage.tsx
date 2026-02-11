import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { Login as LoginIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, account, isLoading, error, needsCredentials, login, clearError } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && account) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, account, navigate]);

  const handleLogin = async () => {
    try {
      clearError();
      await login();
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" gutterBottom>
            SharePoint Bot
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Browser-based SharePoint file synchronization tool
          </Typography>
        </Box>

        {error && needsCredentials && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              {error}. Please configure your Azure AD app credentials in Settings.
            </Typography>
            <Button
              size="small"
              startIcon={<SettingsIcon />}
              onClick={() => navigate('/settings')}
              sx={{ mt: 1 }}
            >
              Go to Settings
            </Button>
          </Alert>
        )}

        {error && !needsCredentials && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
            {error}
          </Alert>
        )}

        <Box sx={{ my: 4 }}>
          <Typography variant="body1" paragraph>
            Sign in with your Microsoft 365 account to get started.
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            SharePoint Bot runs entirely in your browser with no backend infrastructure.
            Your credentials are never stored on any server.
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="large"
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <LoginIcon />}
          onClick={handleLogin}
          disabled={isLoading || needsCredentials}
          fullWidth
          sx={{ py: 1.5 }}
        >
          {isLoading ? 'Signing in...' : 'Sign in with Microsoft'}
        </Button>

        <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            By signing in, you agree to grant this app access to your SharePoint sites
            and files for synchronization purposes.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
