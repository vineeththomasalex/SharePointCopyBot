import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  Avatar
} from '@mui/material';
import {
  Menu as MenuIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const { account, logout } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleClose();
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
    navigate('/');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={handleMenu}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SharePoint Bot
          </Typography>

          {account && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2">
                {account.name || account.username}
              </Typography>
              <Avatar sx={{ width: 32, height: 32 }}>
                {account.name?.[0] || account.username?.[0] || 'U'}
              </Avatar>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={() => handleNavigate('/dashboard')}>
          <DashboardIcon sx={{ mr: 1 }} fontSize="small" />
          Dashboard
        </MenuItem>
        <MenuItem onClick={() => handleNavigate('/history')}>
          <HistoryIcon sx={{ mr: 1 }} fontSize="small" />
          History
        </MenuItem>
        <MenuItem onClick={() => handleNavigate('/settings')}>
          <SettingsIcon sx={{ mr: 1 }} fontSize="small" />
          Settings
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
          Logout
        </MenuItem>
      </Menu>

      <Container
        component="main"
        maxWidth="lg"
        sx={{ mt: 4, mb: 4, flexGrow: 1 }}
      >
        {children}
      </Container>

      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? theme.palette.grey[200]
              : theme.palette.grey[800]
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            SharePoint Bot - Browser-based file synchronization
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
