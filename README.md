# Dark Notes Chrome Extension

A VS Code-like note-taking extension that provides a dark-themed note editor via browser action.

## Development

### Setup
1. Clone this repository
2. Run `npm install` to install dependencies

### Build
Run `npm run build` to create the `dist` folder containing the extension files ready for loading into Chrome

### Important Note About File System Access
Chrome restricts the File System Access API (used for opening folders and saving files) in extensions. When using this extension:

1. The "Open Folder" functionality is limited in extensions
2. Saving files with Ctrl+S will download the file instead of using the File Picker in extension context
3. For full functionality, consider using the app outside of the extension context

## Features

- Overrides the new tab page with a dark-themed note editor
- VS Code-like sidebar for file/folder navigation
- Local file system access for saving and loading notes
- Google Drive integration for cloud storage
- Keyboard shortcuts (Ctrl+S / Cmd+S) for saving
- File tree navigation for .md and .txt files
- Auto-saving to Chrome storage

## How to Use

1. Install the extension
2. Open a new tab to see the note editor
3. Click "Open Folder" to select a folder on your computer for file navigation
4. Use the editor to write notes
5. Press Ctrl+S (or Cmd+S on macOS) to save your notes to a file
6. Create new files with the "New File" button
7. Use the "Connect Google Drive" button to save and manage notes in the cloud

## Google Drive Setup

To use Google Drive integration:

1. Create a Google Cloud Platform project at https://console.cloud.google.com
2. Enable the Google Drive API for your project
3. Create OAuth 2.0 credentials (Web application type)
4. Add `chrome-extension://YOUR_EXTENSION_ID` to the authorized JavaScript origins
5. Copy your client ID and update it in the manifest.json file:
   ```json
   "oauth2": {
     "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
     "scopes": ["https://www.googleapis.com/auth/drive.file"]
   }
   ```
6. Reload the extension and click "Connect Google Drive" to authenticate

## Permissions Required

- `storage`: For auto-saving notes
- `activeTab`: For interacting with the current tab
- `scripting`: For content script injection (potential future features)
- `identity`: For Google Drive integration
- `https://www.googleapis.com/*`: For accessing Google Drive API
- File System Access API permissions: For reading/writing local files

## Installation (Developer Mode)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extension folder
5. The extension should now be installed and will override new tabs

## Note

This extension uses modern browser APIs including the File System Access API, which requires Chrome version 86 or later.
