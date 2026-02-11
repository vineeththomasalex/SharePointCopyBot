# Azure AD App Registration Guide

This guide will walk you through creating an Azure AD application for SharePoint Bot.

## Prerequisites

- Azure AD account with permissions to register applications
- Access to Azure Portal (https://portal.azure.com)

## Step-by-Step Instructions

### 1. Navigate to Azure Portal

1. Go to https://portal.azure.com
2. Sign in with your Microsoft account
3. Search for "Azure Active Directory" (or "Microsoft Entra ID") in the top search bar
4. Click on **Azure Active Directory**

### 2. Register a New Application

1. In the left sidebar, click **App registrations**
2. Click **+ New registration** at the top
3. Fill in the application details:
   - **Name**: `SharePoint Bot` (or any name you prefer)
   - **Supported account types**: Select one of:
     - **Single tenant** (recommended) - Only accounts in your organization
     - **Multi-tenant** - Accounts in any organization
   - **Redirect URI**:
     - Platform: Select **Single-page application (SPA)**
     - URI: `http://localhost:5173` (for local development)
4. Click **Register**

### 3. Note Your Credentials

After registration, you'll see the app overview page. **Copy and save these values**:

- **Application (client) ID** - You'll need this for `VITE_DEFAULT_CLIENT_ID`
- **Directory (tenant) ID** - You'll need this for `VITE_DEFAULT_TENANT_ID`

### 4. Configure Authentication

1. In the left sidebar, click **Authentication**
2. Under **Single-page application**, verify your redirect URI is listed:
   - `http://localhost:5173`
3. Add production redirect URIs (when you deploy):
   - For GitHub Pages: `https://[your-username].github.io/SharePointBot/`
4. Under **Implicit grant and hybrid flows**:
   - **DO NOT** check any boxes (we're using modern PKCE flow)
5. Click **Save**

### 5. Add API Permissions

1. In the left sidebar, click **API permissions**
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Search for and add these permissions:
   - `User.Read`
   - `Sites.Read.All`
   - `Sites.ReadWrite.All`
   - `Files.ReadWrite.All`
   - `offline_access`
6. Click **Add permissions**

### 6. Grant Admin Consent (Important!)

1. After adding permissions, click **Grant admin consent for [Your Organization]**
2. Click **Yes** to confirm
3. Wait for the consent to complete
4. Verify that all permissions show "Granted for [Your Organization]" with green checkmarks

**Note**: You need admin privileges to grant consent. If you don't have admin rights, ask your IT administrator to grant consent.

### 7. Update Environment Variables

1. Open `.env.local` in your project
2. Update with your credentials:

```env
VITE_DEFAULT_CLIENT_ID=your-application-client-id-here
VITE_DEFAULT_TENANT_ID=your-directory-tenant-id-here
VITE_REDIRECT_URI=http://localhost:5173
```

3. Save the file

### 8. Test Authentication

1. Start the development server: `npm run dev`
2. Open http://localhost:5173 in your browser
3. Click the login button
4. You should be redirected to Microsoft login
5. After successful login, you should be redirected back to the app

## Production Deployment (GitHub Pages)

When deploying to GitHub Pages:

### 1. Update Redirect URIs

1. Go back to your Azure AD app registration
2. Navigate to **Authentication**
3. Add production redirect URI:
   - `https://[your-github-username].github.io/SharePointBot/`
4. Click **Save**

### 2. Update Environment Variables for Production

Create a `.env.production` file:

```env
VITE_DEFAULT_CLIENT_ID=your-application-client-id-here
VITE_DEFAULT_TENANT_ID=your-directory-tenant-id-here
VITE_REDIRECT_URI=https://[your-github-username].github.io/SharePointBot/
```

## Troubleshooting

### "AADSTS50011: The redirect URI specified in the request does not match"

- Ensure the redirect URI in your Azure AD app matches exactly (including trailing slashes)
- For GitHub Pages, make sure to include the repository name in the path

### "AADSTS65001: The user or administrator has not consented"

- You need to grant admin consent for the permissions (Step 6)
- Ask your IT administrator if you don't have permissions

### "Invalid client" error

- Verify your Client ID is correct in `.env.local`
- Ensure you're using the Application (client) ID, not the Object ID

### Permissions not working

- Make sure admin consent was granted
- Try logging out and logging back in
- Clear browser cache and localStorage

## Security Best Practices

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Use different apps for dev/prod** - Create separate app registrations for development and production
3. **Rotate credentials regularly** - Create new client secrets if using confidential client
4. **Limit permissions** - Only request permissions you actually need
5. **Monitor usage** - Regularly check Azure AD sign-in logs

## Optional: Enable Users to Configure Their Own App

Users can optionally configure their own Azure AD app by:

1. Following these same steps to create their own app registration
2. In SharePoint Bot, going to **Settings** → **Authentication**
3. Toggling "Use custom Azure AD app"
4. Entering their own Client ID and Tenant ID
5. Clicking **Save and Re-initialize**

This allows each user to have independent control over their own authentication.
