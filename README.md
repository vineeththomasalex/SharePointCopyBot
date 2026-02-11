# SharePoint Bot

A browser-based SharePoint file synchronization tool that copies files from one SharePoint document library to another. No backend infrastructure required - runs entirely in your browser!

## Features

- ✅ **Browser-only** - No backend server required
- ✅ **OAuth 2.0 Authentication** - Secure Microsoft 365 login with PKCE flow
- ✅ **Incremental Sync** - Only copies changed files using Microsoft Graph delta queries
- ✅ **Folder Structure** - Preserves complete folder hierarchy
- ✅ **Change Tracking** - Uses IndexedDB to track file states locally
- ✅ **Progress Tracking** - Real-time progress with detailed status updates
- ✅ **Sync History** - View past sync operations and statistics
- ✅ **Custom Authentication** - Use default app or configure your own Azure AD app
- ✅ **GitHub Pages Ready** - Easy deployment to GitHub Pages

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Authentication**: MSAL.js v3 (OAuth 2.0 with PKCE)
- **API**: Microsoft Graph API
- **Storage**: IndexedDB via Dexie.js
- **State Management**: Zustand
- **UI**: Material-UI v6

## 🚀 Using the Deployed App (No Setup Required!)

**Live Demo**: https://vineeththomasalex.github.io/SharePointCopyBot/

You can use the deployed app without any local installation:

1. **Open the app** at the URL above
2. **Click "Go to Settings"** when you see the credentials warning
3. **Register your own Azure AD app** (free, takes 5 minutes - see [AZURE_AD_SETUP.md](./AZURE_AD_SETUP.md))
4. **Enter your Azure AD credentials** in Settings
5. **Return to login** and sign in with Microsoft

Your credentials are stored securely in your browser's IndexedDB and never leave your device!

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+ and npm
- Microsoft 365 account with access to SharePoint
- Azure AD application (see setup guide below)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/SharePointBot.git
   cd SharePointBot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

   Update `.env.local` with your Azure AD app credentials:
   ```env
   VITE_DEFAULT_CLIENT_ID=your-client-id-here
   VITE_DEFAULT_TENANT_ID=your-tenant-id-here
   VITE_REDIRECT_URI=http://localhost:5173
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**

   Navigate to http://localhost:5173

## Azure AD App Setup

To use SharePoint Bot, you need to register an Azure AD application. Follow the detailed guide in [AZURE_AD_SETUP.md](./AZURE_AD_SETUP.md).

### Quick Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Configure:
   - **Name**: SharePoint Bot
   - **Account types**: Single tenant
   - **Redirect URI**: Single-page application (SPA) - `http://localhost:5173`
5. Add API permissions (Microsoft Graph, Delegated):
   - `User.Read`
   - `Sites.Read.All`
   - `Sites.ReadWrite.All`
   - `Files.ReadWrite.All`
   - `offline_access`
6. **Grant admin consent** for all permissions
7. Copy **Client ID** and **Tenant ID** to `.env.local`

See [AZURE_AD_SETUP.md](./AZURE_AD_SETUP.md) for detailed instructions with screenshots.

## Usage

### First Time Setup

1. **Login** - Sign in with your Microsoft 365 account
2. **Configure Sync**:
   - Select **source** SharePoint site and document library
   - Select **destination** SharePoint site and document library
   - Click **Save Configuration**
3. **Start Sync** - Click the "Start Sync" button on the dashboard

### Subsequent Syncs

1. Go to the **Dashboard**
2. Click **Start Sync**
3. The app will:
   - Fetch only changed files since last sync (using delta tokens)
   - Show a summary of changes (new, modified, deleted files)
   - Copy files while preserving folder structure
   - Track progress in real-time
   - Save results to sync history

### Optional: Use Your Own Azure AD App

1. Create your own Azure AD app registration (see setup guide)
2. Go to **Settings** → **Authentication**
3. Toggle **"Use custom Azure AD app"**
4. Enter your **Client ID** and **Tenant ID**
5. Click **Save & Re-initialize**
6. Log in again with your credentials

## Deployment to GitHub Pages

This project uses **npm gh-pages** for simple deployment:

### 1. Update Vite Configuration

The `vite.config.ts` should have the correct base path matching your repo name:
```typescript
base: '/SharePointCopyBot/'  // Match your GitHub repo name
```

### 2. Deploy

Simply run:
```bash
npm run deploy
```

This will:
- Build the project
- Push the build to the `gh-pages` branch
- Automatically deploy to GitHub Pages

### 3. Enable GitHub Pages (First Time Only)

1. Go to your GitHub repository **Settings** → **Pages**
2. Under **Source**, select branch: `gh-pages`
3. Click **Save**

Your app will be available at: `https://YOUR_USERNAME.github.io/REPO_NAME/`

### 4. Add Production Redirect URI

In your Azure AD app registration:
1. Go to **Authentication**
2. Add redirect URI: `https://YOUR_USERNAME.github.io/REPO_NAME/`
3. Click **Save**

**Note**: Users can configure their own Azure AD credentials directly in the app's Settings page. No need to embed credentials in the build!

## Project Structure

```
SharePointBot/
├── src/
│   ├── api/                  # Microsoft Graph API integration
│   │   ├── graphClient.ts
│   │   ├── sitesApi.ts
│   │   └── filesApi.ts
│   ├── auth/                 # Authentication
│   │   ├── msalConfig.ts
│   │   └── authService.ts
│   ├── components/           # React components
│   │   ├── auth/
│   │   ├── config/
│   │   ├── history/
│   │   ├── layout/
│   │   ├── settings/
│   │   └── sync/
│   ├── db/                   # IndexedDB schema
│   │   └── schema.ts
│   ├── store/                # Zustand state management
│   │   ├── authStore.ts
│   │   ├── configStore.ts
│   │   └── syncStore.ts
│   ├── sync/                 # Sync logic
│   │   ├── changeDetector.ts
│   │   ├── deltaQuery.ts
│   │   ├── fileCopier.ts
│   │   ├── folderManager.ts
│   │   └── syncOrchestrator.ts
│   ├── utils/                # Utilities
│   │   ├── errorHandler.ts
│   │   └── retryHandler.ts
│   ├── App.tsx
│   └── main.tsx
├── .env.example              # Environment variables template
├── .env.local                # Your local environment (gitignored)
├── package.json
├── vite.config.ts
├── AZURE_AD_SETUP.md         # Detailed Azure AD setup guide
└── README.md
```

## How It Works

### Delta Query Synchronization

1. **First Sync**:
   - Fetches all files from source library
   - Saves file snapshots to IndexedDB
   - Stores a delta token for future syncs
   - Copies all files to destination

2. **Incremental Sync**:
   - Uses delta token to fetch only changed files
   - Compares with previous snapshots
   - Identifies new, modified, and deleted files
   - Copies only changed files
   - Updates delta token for next sync

### Local State Management

- **IndexedDB** stores:
  - Authentication configuration
  - Sync configuration (source/destination)
  - File snapshots (metadata for each file)
  - Delta tokens (for incremental queries)
  - Sync history (past operations)

- **Benefits**:
  - Works offline (UI only)
  - No server-side storage required
  - Handles thousands of files efficiently
  - Fast subsequent syncs

## Troubleshooting

### Authentication Issues

**"AADSTS50011: Redirect URI mismatch"**
- Ensure redirect URI in Azure AD app matches exactly
- Check for trailing slashes
- For GitHub Pages: `https://username.github.io/SharePointBot/`

**"AADSTS65001: Consent required"**
- Admin consent was not granted
- Go to Azure AD app → API permissions → Grant admin consent

### Sync Issues

**"Failed to load sites"**
- Check API permissions are granted
- Verify user has access to SharePoint sites
- Try logging out and back in

**"Copy operation failed"**
- Large files (>250MB) may timeout with Graph copy API
- App automatically falls back to download/upload method
- Check network connection

**Delta token expired**
- Delta tokens are valid for 7 days
- If sync hasn't run in >7 days, app performs full sync
- This is expected behavior

### Performance

**Slow initial sync**
- First sync fetches all files (can be slow for large libraries)
- Subsequent syncs are much faster (delta queries)
- Consider syncing smaller libraries or folders

## Security Considerations

- ✅ Uses OAuth 2.0 with PKCE (no client secrets)
- ✅ Tokens stored securely in browser localStorage by MSAL
- ✅ No backend server means no server-side security risks
- ✅ All operations happen client-side
- ⚠️ Never commit `.env.local` to version control
- ⚠️ Use separate Azure AD apps for dev/production

## Limitations

- Browser-based, so limited by browser capabilities
- Large file uploads (>100MB) may be slow
- No offline sync capability (requires internet)
- Delta tokens expire after 7 days of inactivity
- Single-direction sync only (one-way copy)

## Future Enhancements

- [ ] Bidirectional sync with conflict resolution
- [ ] Selective folder sync (choose specific folders)
- [ ] File filters (by extension, size, date)
- [ ] Batch operations (pause/resume)
- [ ] Export sync reports (CSV, PDF)
- [ ] PWA support (install as app)
- [ ] Dark mode theme
- [ ] Email notifications on sync completion

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Create an issue on GitHub
- Check [AZURE_AD_SETUP.md](./AZURE_AD_SETUP.md) for setup help
- Review troubleshooting section above

## Acknowledgments

- Built with [React](https://react.dev/)
- Authentication via [MSAL.js](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- UI components from [Material-UI](https://mui.com/)
- Microsoft Graph API by [Microsoft](https://developer.microsoft.com/en-us/graph)
