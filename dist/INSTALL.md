# Installation Guide for Dark Notes Chrome Extension

This guide will walk you through installing and setting up the Dark Notes Chrome extension in developer mode.

## Prerequisites

- Google Chrome browser (version 86 or later recommended for File System Access API support)
- Basic knowledge of Chrome's extension system
- Node.js (for building the extension)

## Building the Extension

1. **Build the extension using Node.js**
   - Run `npm run build` in the project directory
   - This will create a `dist` folder with all the necessary files

## Installation Steps

1. **Access the Built Extension Files**
   - Use the `dist` folder created by the build process

2. **Open Chrome Extensions Page**
   - Open Chrome and navigate to `chrome://extensions/`
   - You can also access this by clicking the three dots menu → More Tools → Extensions

3. **Enable Developer Mode**
   - In the top-right corner of the Extensions page, toggle "Developer mode" to ON

4. **Load the Extension**
   - Click the "Load unpacked" button that appears when Developer mode is enabled
   - Navigate to the folder containing the extension files (where the `manifest.json` file is located)
   - Select the folder and click "Open"

5. **Verify Installation**
   - The Dark Notes extension should now appear in your list of extensions
   - It should be enabled by default (if not, toggle it on)

6. **Test the Extension**
   - Open a new tab to see the Dark Notes interface
   - Try writing some notes in the editor
   - Test using Ctrl+S (Cmd+S on Mac) to save files
   - Click "Open Folder" to test file system access

## Troubleshooting

- **Extension Not Loading**: Make sure all the required files (`manifest.json`, `newtab.html`, `styles.css`, `script.js`) are present in your extension folder.
- **File System Access Not Working**: This extension uses the File System Access API, which requires Chrome 86+. Make sure you have an up-to-date Chrome browser.
- **Preview Not Working**: If the Markdown preview isn't working, check that `markdown.js` is properly included and that there are no JavaScript errors in the Chrome Developer Console (F12).

## Permissions

When you first use features like "Open Folder" or try to save files, Chrome will prompt you to grant file system access permissions. These permissions are necessary for the extension to function properly.

## Updates

To update the extension after making changes to its code:
1. Go to `chrome://extensions/`
2. Find Dark Notes in the list
3. Click the refresh icon for the extension
4. Open a new tab to see your changes
