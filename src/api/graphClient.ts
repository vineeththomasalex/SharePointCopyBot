import { Client } from '@microsoft/microsoft-graph-client';
import { getAccessToken, refreshToken } from '../auth/authService';

/**
 * Create Microsoft Graph client with authentication
 */
export function createGraphClient(): Client {
  return Client.init({
    authProvider: async (done) => {
      try {
        const token = await getAccessToken();
        done(null, token);
      } catch (error) {
        console.error('Failed to get access token for Graph API:', error);
        done(error as Error, null);
      }
    },
    defaultVersion: 'v1.0'
  });
}

/**
 * Execute a Graph API request with automatic retry on 401 (token expired)
 */
export async function executeGraphRequest<T>(
  requestFn: (client: Client) => Promise<T>,
  retryOn401: boolean = true
): Promise<T> {
  try {
    const client = createGraphClient();
    return await requestFn(client);
  } catch (error: any) {
    // If 401 Unauthorized and retry is enabled, refresh token and try once more
    if (retryOn401 && error?.statusCode === 401) {
      console.log('Token expired (401), refreshing and retrying...');
      await refreshToken();
      const client = createGraphClient();
      return await requestFn(client);
    }
    throw error;
  }
}
