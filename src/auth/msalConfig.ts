import { Configuration, PublicClientApplication, LogLevel } from '@azure/msal-browser';
import { dbHelpers } from '../db/schema';

// Scopes required for SharePoint operations
export const loginRequest = {
  scopes: [
    'User.Read',
    'Sites.Read.All',
    'Sites.ReadWrite.All',
    'Files.ReadWrite.All',
    'offline_access'
  ]
};

// Token request for Graph API calls
export const tokenRequest = {
  scopes: [
    'Sites.Read.All',
    'Sites.ReadWrite.All',
    'Files.ReadWrite.All'
  ]
};

// MSAL instance - will be initialized dynamically
let msalInstance: PublicClientApplication | null = null;

/**
 * Load authentication credentials
 * Priority: 1) IndexedDB (custom credentials), 2) Environment variables (default)
 */
async function loadAuthCredentials(): Promise<{ clientId: string; tenantId: string }> {
  try {
    // Try to load from IndexedDB first
    const authConfig = await dbHelpers.getAuthConfig();

    if (authConfig && authConfig.useCustomAuth && authConfig.clientId && authConfig.tenantId) {
      console.log('Using custom Azure AD credentials from IndexedDB');
      return {
        clientId: authConfig.clientId,
        tenantId: authConfig.tenantId
      };
    }
  } catch (error) {
    console.warn('Failed to load custom auth config from IndexedDB:', error);
  }

  // Fall back to environment variables
  const clientId = import.meta.env.VITE_DEFAULT_CLIENT_ID;
  const tenantId = import.meta.env.VITE_DEFAULT_TENANT_ID;

  if (!clientId || !tenantId || clientId === 'your-client-id-here' || tenantId === 'your-tenant-id-here') {
    throw new Error(
      'Azure AD credentials not configured. Please configure them in Settings or update the .env.local file.'
    );
  }

  console.log('Using default Azure AD credentials from environment variables');
  return { clientId, tenantId };
}

/**
 * Create MSAL configuration
 */
async function createMsalConfig(): Promise<Configuration> {
  const { clientId, tenantId } = await loadAuthCredentials();
  const redirectUri = import.meta.env.VITE_REDIRECT_URI || window.location.origin;

  return {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      redirectUri,
      postLogoutRedirectUri: redirectUri
    },
    cache: {
      cacheLocation: 'localStorage' // Use localStorage for persistence
    },
    system: {
      loggerOptions: {
        loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
          if (containsPii) return;

          switch (level) {
            case LogLevel.Error:
              console.error(message);
              break;
            case LogLevel.Info:
              console.info(message);
              break;
            case LogLevel.Verbose:
              console.debug(message);
              break;
            case LogLevel.Warning:
              console.warn(message);
              break;
          }
        },
        logLevel: LogLevel.Warning,
        piiLoggingEnabled: false
      }
    }
  };
}

/**
 * Initialize MSAL instance
 * This should be called once at app startup and whenever credentials change
 */
export async function initializeMsal(): Promise<PublicClientApplication> {
  try {
    const config = await createMsalConfig();
    msalInstance = new PublicClientApplication(config);
    await msalInstance.initialize();

    // Handle redirect response
    await msalInstance.handleRedirectPromise();

    console.log('MSAL initialized successfully');
    return msalInstance;
  } catch (error) {
    console.error('Failed to initialize MSAL:', error);
    throw error;
  }
}

/**
 * Re-initialize MSAL with new credentials
 * Called when user updates auth settings
 */
export async function reinitializeMsal(): Promise<PublicClientApplication> {
  console.log('Re-initializing MSAL with updated credentials');

  // Clear existing instance
  if (msalInstance) {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      // Log out existing user
      await msalInstance.logoutPopup({
        account: accounts[0]
      });
    }
  }

  // Create new instance
  return await initializeMsal();
}

/**
 * Get current MSAL instance
 */
export function getMsalInstance(): PublicClientApplication {
  if (!msalInstance) {
    throw new Error('MSAL not initialized. Call initializeMsal() first.');
  }
  return msalInstance;
}

/**
 * Check if MSAL is initialized
 */
export function isMsalInitialized(): boolean {
  return msalInstance !== null;
}
