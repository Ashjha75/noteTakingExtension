// Constants and state management
const ALLOWED_EXTENSIONS = ['.md', '.txt'];
const state = {
    currentFileHandle: null,
    currentContent: "",
    directoryHandle: null,
    fileTree: {},
    hasUnsavedChanges: false,
    usingGoogleDrive: false,
    currentGDriveFileId: null
};

// DOM elements
let noteEditor;
let openFolderBtn;
let newFileBtn;
let fileTreeEl;
let currentFilePathEl;
let statusBarEl;
let previewToggleBtn;
let previewArea;
let connectDriveBtn;

// Initialize the application
async function initialize() {    // Initialize DOM elements
    noteEditor = document.getElementById('noteEditor');
    openFolderBtn = document.getElementById('openFolderBtn');
    newFileBtn = document.getElementById('newFileBtn');
    fileTreeEl = document.getElementById('fileTree');
    currentFilePathEl = document.getElementById('currentFilePath');
    statusBarEl = document.getElementById('statusBar');
    previewToggleBtn = document.getElementById('previewToggleBtn');
    previewArea = document.getElementById('previewArea');
    connectDriveBtn = document.getElementById('connectDriveBtn');
    
    // Check if all elements were found
    if (!noteEditor || !openFolderBtn || !fileTreeEl) {
        console.error('Some UI elements could not be found. Check your HTML structure.');
        return;
    }
    
    // Load the last saved note from storage
    try {
        chrome.storage.local.get(['lastNote'], function(data) {
            if (data.lastNote) {
                noteEditor.value = data.lastNote;
                state.currentContent = data.lastNote;
            }
        });
    } catch (error) {
        console.error('Error loading last note:', error);
    }

    // Set up event listeners
    setupEventListeners();
}

// Set up all event listeners
function setupEventListeners() {
    // Open folder button
    openFolderBtn.addEventListener('click', openFolder);
    
    // New file button
    newFileBtn.addEventListener('click', createNewFile);
    
    // Note editor change detection
    noteEditor.addEventListener('input', handleNoteChange);
    
    // Preview toggle button
    if (previewToggleBtn) {
        previewToggleBtn.addEventListener('click', togglePreview);
    }
    
    // Google Drive connect button
    if (connectDriveBtn) {
        connectDriveBtn.addEventListener('click', connectToGoogleDrive);
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Handle the open folder action
async function openFolder() {
    try {
        // Try to use the File System Access API if available
        if (window.showDirectoryPicker) {
            try {
                // Request a directory from the user - might fail in extension context
                const directoryHandle = await window.showDirectoryPicker();
                state.directoryHandle = directoryHandle;
                
                // Clear the file tree UI
                fileTreeEl.innerHTML = '';
                
                // Build the file tree object and UI
                state.fileTree = await buildFileTree(directoryHandle);
                renderFileTree();
                
                // Update status
                updateStatusBar(`Folder opened: ${directoryHandle.name}`);
                return; // Success! Exit the function
            } catch (fsError) {
                console.warn('File System Access API failed:', fsError);
                // Continue to fallback methods below
            }
        }
        
        // FALLBACK 1: Try opening in a regular tab via background script
        try {
            // Check if we're in an extension context
            if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
                // Ask if user wants to try opening in a new tab
                if (confirm('File system access is restricted in extensions. Would you like to try opening this app in a regular tab?')) {
                    chrome.runtime.sendMessage({ action: "openInNewTab" });
                    return;
                }
            }
        } catch (extError) {
            console.warn('Not in extension context or messaging failed:', extError);
        }
        
        // FALLBACK 2: Use improved mock file system
        alert('Using mock files. You can edit and "save" files, but they will not persist between sessions.\n\nFull file system access is limited in Chrome extensions.');
        
        // Use enhanced mock file tree with editable files
        state.fileTree = createMockFileTree();
        renderFileTree();
        
        // Update status
        updateStatusBar('Using enhanced mock files', true);
        
    } catch (error) {
        console.error('Open folder operation failed:', error);
        updateStatusBar('Folder operation failed', false);
    }
}

// Recursively build a file tree object from a directory handle
async function buildFileTree(directoryHandle, path = '') {
    const result = {
        name: directoryHandle.name,
        kind: 'directory',
        path: path + directoryHandle.name,
        children: []
    };
    
    // Iterate through all entries in the directory
    try {
        for await (const entry of directoryHandle.values()) {
            const entryPath = path + directoryHandle.name + '/';
            
            if (entry.kind === 'directory') {
                // Recursively process subdirectories
                const subTree = await buildFileTree(entry, entryPath);
                result.children.push(subTree);
            } else if (entry.kind === 'file') {
                // Check if the file has an allowed extension
                const fileName = entry.name;
                if (ALLOWED_EXTENSIONS.some(ext => fileName.toLowerCase().endsWith(ext))) {
                    result.children.push({
                        name: entry.name,
                        kind: 'file',
                        path: entryPath + entry.name,
                        handle: entry
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error reading directory contents:', error);
    }
    
    // Sort the children (directories first, then files alphabetically)
    result.children.sort((a, b) => {
        if (a.kind !== b.kind) {
            return a.kind === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });
    
    return result;
}

// Render the file tree in the UI
function renderFileTree() {
    if (!state.fileTree || Object.keys(state.fileTree).length === 0) {
        fileTreeEl.innerHTML = '<div class="empty-message">No folder opened yet</div>';
        return;
    }
    
    fileTreeEl.innerHTML = '';
    renderFileTreeNode(state.fileTree, fileTreeEl, '');
    
    // Expand the root folder by default
    const firstFolder = fileTreeEl.querySelector('.folder-children');
    if (firstFolder) {
        firstFolder.style.display = 'block';
    }
}

// Render a single node in the file tree
function renderFileTreeNode(node, parentElement, indent) {
    if (node.kind === 'directory') {
        // Create folder item
        const folderItem = document.createElement('div');
        folderItem.className = 'folder-item';
        folderItem.innerHTML = `${node.name}/`;
        folderItem.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFolderExpand(folderItem.nextElementSibling);
        });
        parentElement.appendChild(folderItem);
        
        // Create container for children
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'folder-children';
        parentElement.appendChild(childrenContainer);
        
        // Recursively render children
        for (const child of node.children) {
            renderFileTreeNode(child, childrenContainer, indent + '  ');
        }
    } else if (node.kind === 'file') {
        // Create file item
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.textContent = node.name;
        fileItem.addEventListener('click', () => openFile(node));
        parentElement.appendChild(fileItem);
    }
}

// Toggle folder expand/collapse
function toggleFolderExpand(childrenContainer) {
    if (!childrenContainer) return;
    childrenContainer.style.display = childrenContainer.style.display === 'none' ? 'block' : 'none';
}

// Handle opening a file from the file tree
async function openFile(fileNode) {
    // Check for unsaved changes
    if (state.hasUnsavedChanges) {
        const shouldSave = confirm('You have unsaved changes. Save them before opening a new file?');
        if (shouldSave) {
            await saveCurrentFile();
        }
    }
    
    try {
        // Get the file handle and read its contents
        const fileHandle = fileNode.handle;
        const file = await fileHandle.getFile();
        const content = await file.text();
        
        // Update the editor and state
        noteEditor.value = content;
        state.currentFileHandle = fileHandle;
        state.currentContent = content;
        state.hasUnsavedChanges = false;
        
        // Update UI
        currentFilePathEl.textContent = fileNode.path;
        updateStatusBar(`File opened: ${fileNode.name}`);
        
        // Highlight the active file in the file tree
        clearActiveFileStyles();
        const fileElements = document.querySelectorAll('.file-item');
        for (const el of fileElements) {
            if (el.textContent === fileNode.name) {
                el.classList.add('active');
                break;
            }
        }
    } catch (error) {
        console.error('Error opening file:', error);
        updateStatusBar('Error opening file', true);
    }
}

// Clear active file styling in the file tree
function clearActiveFileStyles() {
    const activeItems = document.querySelectorAll('.file-item.active');
    for (const item of activeItems) {
        item.classList.remove('active');
    }
}

// Handle note content changes
function handleNoteChange() {
    const newContent = noteEditor.value;
    
    // Save to storage automatically
    try {
        chrome.storage.local.set({ 'lastNote': newContent });
    } catch (error) {
        console.error('Error saving to storage:', error);
    }
    
    // Mark as having unsaved changes if different from the saved file
    state.hasUnsavedChanges = (state.currentFileHandle && newContent !== state.currentContent);
    
    // Update UI
    updateStatusBar(state.hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved');
    
    // Update preview if it's visible
    if (previewArea && !previewArea.classList.contains('hidden')) {
        updatePreview();
    }
}

// Create a new file
async function createNewFile() {
    // Check if a directory is opened
    if (!state.directoryHandle) {
        alert('Please open a folder first');
        return;
    }
    
    // Ask for the filename
    const fileName = prompt('Enter file name (with .md or .txt extension):');
    if (!fileName) return;
    
    // Validate file extension
    if (!ALLOWED_EXTENSIONS.some(ext => fileName.toLowerCase().endsWith(ext))) {
        alert('File must have .md or .txt extension');
        return;
    }
    
    try {
        // Create a new file in the directory
        const fileHandle = await state.directoryHandle.getFileHandle(fileName, { create: true });
        
        // Create an empty file
        const writable = await fileHandle.createWritable();
        await writable.write('');
        await writable.close();
        
        // Refresh the file tree
        state.fileTree = await buildFileTree(state.directoryHandle);
        renderFileTree();
        
        // Open the new file
        const newFileNode = {
            name: fileName,
            kind: 'file',
            path: state.directoryHandle.name + '/' + fileName,
            handle: fileHandle
        };
        await openFile(newFileNode);
        
        updateStatusBar(`Created new file: ${fileName}`);
    } catch (error) {
        console.error('Error creating file:', error);
        
        // If we're in mock mode, handle it there
        if (!window.showDirectoryPicker || error.name === 'SecurityError' || error.name === 'NotAllowedError') {
            // Create a mock file and add it to the tree
            const mockFileName = fileName;
            const mockPath = state.fileTree.name + '/' + mockFileName;
            
            // Add the file to the root of our mock tree
            const newFileNode = {
                name: mockFileName,
                kind: 'file',
                path: mockPath,
                handle: createMockFileHandle("")
            };
            
            state.fileTree.children.push(newFileNode);
            renderFileTree();
            openFile(newFileNode);
            
            updateStatusBar(`Created new mock file: ${mockFileName}`);
        } else {
            updateStatusBar('Error creating file', true);
        }
    }
}

// Connect to Google Drive
async function connectToGoogleDrive() {
    try {
        updateStatusBar('Connecting to Google Drive...', false);
        
        // Attempt to authenticate with Google Drive
        const isAuthenticated = await gDrive.authenticate();
        
        if (isAuthenticated) {
            // Update UI to show connected state
            connectDriveBtn.textContent = 'Google Drive Connected';
            connectDriveBtn.classList.add('drive-connected');
            
            // Set the state to indicate we're using Google Drive
            state.usingGoogleDrive = true;
            
            // Load notes from Google Drive
            await loadNotesFromDrive();
            
            updateStatusBar('Connected to Google Drive', false);
        } else {
            updateStatusBar('Failed to connect to Google Drive', true);
        }
    } catch (error) {
        console.error('Google Drive connection error:', error);
        updateStatusBar('Error connecting to Google Drive: ' + error.message, true);
    }
}

// Load notes from Google Drive
async function loadNotesFromDrive() {
    try {
        const files = await gDrive.listNotes();
        
        // Create a file tree structure from the Google Drive files
        state.fileTree = {
            name: "Google Drive",
            kind: "directory",
            path: "Google Drive",
            children: []
        };
        
        // Add files to the tree
        for (const file of files) {
            state.fileTree.children.push({
                name: file.name,
                kind: "file",
                path: `Google Drive/${file.name}`,
                driveId: file.id,
                modifiedTime: file.modifiedTime
            });
        }
        
        // Sort files by name
        state.fileTree.children.sort((a, b) => a.name.localeCompare(b.name));
        
        // Render the file tree
        renderFileTree();
    } catch (error) {
        console.error('Error loading notes from Google Drive:', error);
        updateStatusBar('Error loading notes from Google Drive', true);
    }
}

// Handle click on a Google Drive file
async function handleDriveFileClick(fileNode) {
    try {
        updateStatusBar(`Loading ${fileNode.name}...`, false);
        
        // Get the file content from Google Drive
        const content = await gDrive.readNote(fileNode.driveId);
        
        // Update editor content
        noteEditor.value = content;
        state.currentContent = content;
        state.hasUnsavedChanges = false;
        state.currentGDriveFileId = fileNode.driveId;
        
        // Update UI
        currentFilePathEl.textContent = fileNode.path;
        
        updateStatusBar(`File loaded: ${fileNode.name}`, false);
    } catch (error) {
        console.error('Error opening Google Drive file:', error);
        updateStatusBar('Error opening file from Google Drive', true);
    }
}

// Save current file to Google Drive
async function saveFileToDrive() {
    try {
        const content = noteEditor.value;
        
        if (state.currentGDriveFileId) {
            // Update existing file
            updateStatusBar('Saving to Google Drive...', false);
            await gDrive.updateNote(state.currentGDriveFileId, content);
            state.hasUnsavedChanges = false;
            updateStatusBar('File saved to Google Drive', false);
        } else {
            // Create new file
            const fileName = prompt('Enter a name for your note:', 'Untitled Note.md');
            
            if (fileName) {
                updateStatusBar('Creating file in Google Drive...', false);
                
                // Determine mime type based on extension
                const mimeType = fileName.toLowerCase().endsWith('.md') ? 'text/markdown' : 'text/plain';
                
                const response = await gDrive.createNote(fileName, content, mimeType);
                
                if (response && response.id) {
                    state.currentGDriveFileId = response.id;
                    state.hasUnsavedChanges = false;
                    currentFilePathEl.textContent = `Google Drive/${fileName}`;
                    
                    // Reload file list to show the new file
                    await loadNotesFromDrive();
                    
                    updateStatusBar(`File created: ${fileName}`, false);
                }
            }
        }
    } catch (error) {
        console.error('Error saving to Google Drive:', error);
        updateStatusBar('Error saving to Google Drive: ' + error.message, true);
    }
}

// Handle keyboard shortcuts
async function handleKeyboardShortcuts(event) {
    // Ctrl+S / Cmd+S
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        await saveCurrentFile();
    }
    
    // Ctrl+P / Cmd+P for preview toggle
    if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        togglePreview();
    }
}

// Save the current file
async function saveCurrentFile() {
    // Get the content from the editor
    const content = noteEditor.value;
    
    try {
        // If we have a file handle, save to that file
        if (state.currentFileHandle) {
            const writable = await state.currentFileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            
            // Update state
            state.currentContent = content;
            state.hasUnsavedChanges = false;
            
            updateStatusBar('File saved successfully');
        } else {
            // If no file handle, show save file picker
            await saveFileAs(content);
        }
    } catch (error) {
        console.error('Error saving file:', error);
        updateStatusBar('Error saving file', true);
    }
}

// Save as a new file
async function saveFileAs(content) {
    try {
        // Check if File System Access API is available
        if (!window.showSaveFilePicker) {
            throw new Error('File System Access API is not supported in this environment');
        }
        
        // Show save file picker
        const options = {
            types: [
                {
                    description: 'Text files',
                    accept: {
                        'text/plain': ['.txt'],
                        'text/markdown': ['.md']
                    }
                }
            ]
        };
        
        const fileHandle = await window.showSaveFilePicker(options);
        
        // Save content to the file
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        
        // Update state
        state.currentFileHandle = fileHandle;
        state.currentContent = content;
        state.hasUnsavedChanges = false;
        
        // Update UI
        const file = await fileHandle.getFile();
        currentFilePathEl.textContent = file.name;
        updateStatusBar('File saved successfully');
    } catch (error) {
        // Handle specific error cases
        if (error.message.includes('not supported')) {
            // Provide a fallback for saving files when the API is not available
            alert('File System Access is not available in Chrome extensions by default. Your notes are auto-saved in the browser storage.');
            
            // Alternative: Create a download link
            const blob = new Blob([content], { type: 'text/plain' });
            const downloadUrl = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = downloadUrl;
            downloadLink.download = 'notes.md';
            downloadLink.click();
            URL.revokeObjectURL(downloadUrl);
            
            updateStatusBar('Downloaded notes as a file', false);
        } else {
            // User likely canceled the file picker
            console.log('File save was canceled or failed:', error);
            updateStatusBar('File save canceled', false);
        }
    }
}

// Update status bar with a message
function updateStatusBar(message, isError = false) {
    if (!statusBarEl) return;
    
    statusBarEl.textContent = message;
    statusBarEl.style.color = isError ? '#ff6b6b' : 'var(--text-muted)';
    
    // Clear status after a few seconds, if not an error
    if (!isError) {
        setTimeout(() => {
            if (statusBarEl) {
                statusBarEl.textContent = state.hasUnsavedChanges ? 'Unsaved changes' : '';
            }
        }, 3000);
    }
}

// Toggle between editor and preview mode
function togglePreview() {
    if (!previewArea || !noteEditor || !previewToggleBtn) return;
    
    const isPreviewHidden = previewArea.classList.contains('hidden');
    
    if (isPreviewHidden) {
        // Show preview
        updatePreview();
        previewArea.classList.remove('hidden');
        noteEditor.classList.add('hidden');
        previewToggleBtn.textContent = 'Edit';
        previewToggleBtn.classList.add('active');
    } else {
        // Show editor
        previewArea.classList.add('hidden');
        noteEditor.classList.remove('hidden');
        previewToggleBtn.textContent = 'Preview';
        previewToggleBtn.classList.remove('active');
    }
}

// Update the preview content with rendered markdown
function updatePreview() {
    if (!previewArea || !noteEditor) return;
    
    const content = noteEditor.value;
    try {
        const renderedContent = SimpleMarkdown.parse(content);
        previewArea.innerHTML = renderedContent;
    } catch (error) {
        console.error('Error updating preview:', error);
        previewArea.innerHTML = '<p>Error rendering preview</p>';
    }
}

// Create a mock file tree for testing when File System Access API is not available
function createMockFileTree() {
    return {
        name: "Sample Project",
        kind: "directory",
        path: "Sample Project",
        children: [
            {
                name: "docs",
                kind: "directory",
                path: "Sample Project/docs",
                children: [
                    {
                        name: "README.md",
                        kind: "file",
                        path: "Sample Project/docs/README.md",
                        handle: createMockFileHandle("# Documentation\n\nThis is a sample markdown file.")
                    }
                ]
            },
            {
                name: "notes.md",
                kind: "file",
                path: "Sample Project/notes.md",
                handle: createMockFileHandle("# My Notes\n\n- First item\n- Second item\n\nThis is a mock file created when the File System Access API is unavailable.")
            },
            {
                name: "todo.txt",
                kind: "file",
                path: "Sample Project/todo.txt",
                handle: createMockFileHandle("TODO LIST:\n\n1. Fix filesystem access\n2. Improve error handling\n3. Add more features")
            }
        ]
    };
}

// Create a mock file handle
function createMockFileHandle(content) {
    return {
        kind: "file",
        name: "mock-file",
        getFile: async () => {
            return {
                text: async () => content,
                name: "mock-file"
            };
        },
        createWritable: async () => {
            return {
                write: async (newContent) => {
                    console.log("Mock file write:", newContent);
                    content = newContent;
                },
                close: async () => {
                    console.log("Mock file closed");
                }
            };
        }
    };
}

// Initialize the application when the document is loaded
document.addEventListener('DOMContentLoaded', initialize);

// Add a console message to help with debugging
console.log('Dark Notes Extension script loaded successfully. Version 1.0.0');
