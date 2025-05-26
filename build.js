const fs = require('fs');
const path = require('path');

// Create dist directory
console.log('Creating dist directory...');
if (!fs.existsSync('./dist')) {
  fs.mkdirSync('./dist', { recursive: true });
}

// Files to copy
const filesToCopy = [
  'styles.css',
  'script.js',
  'markdown.js',
  'gdrive.js',
  'README.md',
  'INSTALL.md'
];

// Copy each file to dist folder
filesToCopy.forEach(file => {
  try {
    fs.copyFileSync(file, path.join('./dist', file));
    console.log(`Copied ${file} to dist folder`);
  } catch (err) {
    console.error(`Error copying ${file}: ${err.message}`);
  }
});

// Copy newtab.html as notes.html
try {
  fs.copyFileSync('newtab.html', path.join('./dist', 'notes.html'));
  console.log('Copied newtab.html to dist/notes.html');
} catch (err) {
  console.error(`Error copying newtab.html to notes.html: ${err.message}`);
}

// Handle manifest.json separately - modify it to use an action button instead of new tab override
try {
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  
  // Remove the icons property if it exists
  if (manifest.icons) {
    delete manifest.icons;
    console.log('Removed icons property from manifest.json');
  }
  
  // Remove chrome_url_overrides if it exists (prevents replacing all new tabs)
  if (manifest.chrome_url_overrides) {
    delete manifest.chrome_url_overrides;
    console.log('Removed chrome_url_overrides from manifest.json');
  }
  
  // Add action (toolbar button)
  manifest.action = {
    "default_title": "Open Dark Notes"
  };
  console.log('Added action button to manifest.json');
  
  // Add background script
  manifest.background = {
    "service_worker": "background.js"
  };
  console.log('Added background script to manifest.json');
  
  // Make sure we have the tabs permission
  if (!manifest.permissions) {
    manifest.permissions = [];
  }
  if (!manifest.permissions.includes("tabs")) {
    manifest.permissions.push("tabs");
  }
  
  // Write the modified manifest to the dist folder
  fs.writeFileSync(
    path.join('./dist', 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  );
  console.log('Copied and modified manifest.json to dist folder');
  // Create a background.js file to handle opening the notes page
  const backgroundScript = `// Handle extension icon click
chrome.action.onClicked.addListener(() => {
  // Open the notes page in a new tab using the extension's own URL
  // Using regular tab which has better support for File System Access API
  chrome.tabs.create({ 
    url: chrome.runtime.getURL('notes.html'),
    active: true
  });
});

// Listen for runtime messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openInNewTab") {
    chrome.tabs.create({ 
      url: chrome.runtime.getURL('notes.html'),
      active: true
    });
  }
});
`;
  
  fs.writeFileSync(
    path.join('./dist', 'background.js'),
    backgroundScript,
    'utf8'
  );
  console.log('Created background.js file');
  
} catch (err) {
  console.error(`Error processing manifest.json: ${err.message}`);
}

console.log('Distribution folder created successfully!');
console.log('Note: The extension now opens via an action button click instead of replacing every new tab.');
console.log('IMPORTANT: File System Access API (for opening folders and saving files) has limited support in extensions.');
console.log('The code includes fallbacks and appropriate error messages for users.');