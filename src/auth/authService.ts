import {
  AccountInfo,
  InteractionRequiredAuthError,
  SilentRequest,
  PopupRequest,
  EndSessionPopupRequest
} from '@azure/msal-browser';
import { getMsalInstance } from './msalConfig';
import { loginRequest, tokenRequest } from './msalConfig';

/**
 * Login using popup
 */
export async function login(): Promise<AccountInfo> {
  try {
    const msalInstance = getMsalInstance();

    const response = await msalInstance.loginPopup(loginRequest as PopupRequest);

    if (response && response.account) {
      // Set active account
      msalInstance.setActiveAccount(response.account);
      console.log('Login successful:', response.account.username);
      return response.account;
    }

    throw new Error('Login failed: No account returned');
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

/**
 * Login using redirect (alternative to popup)
 */
export async function loginRedirect(): Promise<void> {
  try {
    const msalInstance = getMsalInstance();
    await msalInstance.loginRedirect(loginRequest);
  } catch (error) {
    console.error('Login redirect failed:', error);
    throw error;
  }
}

/**
 * Get access token silently (from cache or using refresh token)
 * Falls back to interactive login if silent acquisition fails
 */
export async function getAccessToken(forceRefresh: boolean = false): Promise<string> {
  try {
    const msalInstance = getMsalInstance();
    const account = msalInstance.getActiveAccount();

    if (!account) {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        throw new Error('No authenticated account found. Please login first.');
      }
      msalInstance.setActiveAccount(accounts[0]);
    }

    const activeAccount = msalInstance.getActiveAccount();
    if (!activeAccount) {
      throw new Error('No active account found');
    }

    const silentRequest: SilentRequest = {
      ...tokenRequest,
      account: activeAccount,
      forceRefresh
    };

    try {
      // Try to acquire token silently (from cache or refresh token)
      const response = await msalInstance.acquireTokenSilent(silentRequest);
      return response.accessToken;
    } catch (error) {
      // If silent acquisition fails, try interactive popup
      if (error instanceof InteractionRequiredAuthError) {
        console.log('Silent token acquisition failed, falling back to interactive popup');
        const response = await msalInstance.acquireTokenPopup(tokenRequest as PopupRequest);
        return response.accessToken;
      }
      throw error;
    }
  } catch (error) {
    console.error('Failed to acquire access token:', error);
    throw error;
  }
}

/**
 * Logout using popup
 */
export async function logout(): Promise<void> {
  try {
    const msalInstance = getMsalInstance();
    const account = msalInstance.getActiveAccount();

    if (account) {
      const logoutRequest: EndSessionPopupRequest = {
        account,
        mainWindowRedirectUri: window.location.origin
      };

      await msalInstance.logoutPopup(logoutRequest);
      console.log('Logout successful');
    }
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
}

/**
 * Logout using redirect (alternative to popup)
 */
export async function logoutRedirect(): Promise<void> {
  try {
    const msalInstance = getMsalInstance();
    const account = msalInstance.getActiveAccount();

    if (account) {
      await msalInstance.logoutRedirect({
        account
      });
    }
  } catch (error) {
    console.error('Logout redirect failed:', error);
    throw error;
  }
}

/**
 * Get current authenticated account
 */
export function getAccount(): AccountInfo | null {
  try {
    const msalInstance = getMsalInstance();
    return msalInstance.getActiveAccount();
  } catch (error) {
    console.error('Failed to get account:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  try {
    const msalInstance = getMsalInstance();
    const account = msalInstance.getActiveAccount();
    return account !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Get all accounts
 */
export function getAllAccounts(): AccountInfo[] {
  try {
    const msalInstance = getMsalInstance();
    return msalInstance.getAllAccounts();
  } catch (error) {
    console.error('Failed to get accounts:', error);
    return [];
  }
}

/**
 * Force token refresh
 * Useful for long-running operations or when token might have expired
 */
export async function refreshToken(): Promise<string> {
  return await getAccessToken(true);
}
