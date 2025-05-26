// Google Drive Integration for Dark Notes
class GoogleDriveManager {
    constructor() {
        this.API_KEY = null; // Optional
        this.CLIENT_ID = null; // Will be loaded from manifest
        this.FOLDER_NAME = 'Dark Notes';
        this.rootFolderId = null;
        this.isAuthenticated = false;
        
        // Load auth details
        chrome.runtime.getManifest().oauth2 && (this.CLIENT_ID = chrome.runtime.getManifest().oauth2.client_id);
    }

    /**
     * Authenticates the user with Google Drive
     */
    async authenticate() {
        try {
            const token = await this.getAuthToken();
            this.isAuthenticated = !!token;
            if (this.isAuthenticated) {
                await this.ensureRootFolderExists();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Authentication error:', error);
            return false;
        }
    }

    /**
     * Gets the auth token from Chrome's identity API
     */
    async getAuthToken() {
        return new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ interactive: true }, (token) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(token);
                }
            });
        });
    }

    /**
     * Makes an authenticated request to Google Drive API
     */
    async makeRequest(url, method = 'GET', body = null, contentType = 'application/json') {
        const token = await this.getAuthToken();
        const headers = new Headers({
            'Authorization': `Bearer ${token}`,
            'Content-Type': contentType
        });

        const options = {
            method,
            headers
        };

        if (body) {
            options.body = typeof body === 'string' ? body : JSON.stringify(body);
        }

        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`Google Drive API error: ${response.status} ${response.statusText}`);
        }
        
        return response.json();
    }

    /**
     * Creates the root folder for notes if it doesn't exist
     */
    async ensureRootFolderExists() {
        try {
            // Check if folder exists
            const searchResponse = await this.makeRequest(
                `https://www.googleapis.com/drive/v3/files?q=name='${this.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
            );

            if (searchResponse.files && searchResponse.files.length > 0) {
                this.rootFolderId = searchResponse.files[0].id;
                return this.rootFolderId;
            }

            // Create folder if it doesn't exist
            const createResponse = await this.makeRequest(
                'https://www.googleapis.com/drive/v3/files',
                'POST',
                {
                    name: this.FOLDER_NAME,
                    mimeType: 'application/vnd.google-apps.folder'
                }
            );

            this.rootFolderId = createResponse.id;
            return this.rootFolderId;
        } catch (error) {
            console.error('Error ensuring root folder exists:', error);
            throw error;
        }
    }

    /**
     * Lists all notes in the root folder
     */
    async listNotes() {
        if (!this.rootFolderId) await this.ensureRootFolderExists();
        
        try {
            const response = await this.makeRequest(
                `https://www.googleapis.com/drive/v3/files?q=mimeType='text/markdown' or mimeType='text/plain' and '${this.rootFolderId}' in parents and trashed=false&fields=files(id,name,modifiedTime)`
            );
            
            return response.files || [];
        } catch (error) {
            console.error('Error listing notes:', error);
            throw error;
        }
    }

    /**
     * Creates a new file in the root folder
     */
    async createNote(name, content, mimeType = 'text/markdown') {
        if (!this.rootFolderId) await this.ensureRootFolderExists();
        
        try {
            // Create file metadata
            const metadata = JSON.stringify({
                name: name,
                parents: [this.rootFolderId],
                mimeType: mimeType
            });

            // Create multipart request for both metadata and content
            const boundary = 'DarkNotes_' + Math.random().toString(16).substr(2);
            const requestBody = this.createMultipartBody(boundary, metadata, content);

            // Upload file
            const response = await this.makeRequest(
                'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
                'POST',
                requestBody,
                `multipart/related; boundary=${boundary}`
            );
            
            return response;
        } catch (error) {
            console.error('Error creating note:', error);
            throw error;
        }
    }

    /**
     * Updates an existing note
     */
    async updateNote(fileId, content, mimeType = 'text/markdown') {
        try {
            // Update file content
            const response = await this.makeRequest(
                `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
                'PATCH',
                content,
                mimeType
            );
            
            return response;
        } catch (error) {
            console.error('Error updating note:', error);
            throw error;
        }
    }

    /**
     * Reads a note's content
     */
    async readNote(fileId) {
        try {
            const token = await this.getAuthToken();
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error(`Failed to read note: ${response.status} ${response.statusText}`);
            }
            
            return await response.text();
        } catch (error) {
            console.error('Error reading note:', error);
            throw error;
        }
    }

    /**
     * Deletes a note
     */
    async deleteNote(fileId) {
        try {
            await this.makeRequest(
                `https://www.googleapis.com/drive/v3/files/${fileId}`,
                'DELETE'
            );
            return true;
        } catch (error) {
            console.error('Error deleting note:', error);
            throw error;
        }
    }

    /**
     * Creates a multipart request body 
     */
    createMultipartBody(boundary, metadata, content) {
        return (
            `--${boundary}\r\n` +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            metadata + '\r\n' +
            `--${boundary}\r\n` +
            'Content-Type: text/plain\r\n\r\n' +
            content + '\r\n' +
            `--${boundary}--`
        );
    }

    /**
     * Creates a directory structure in the root folder
     */
    async createDirectory(path) {
        if (!this.rootFolderId) await this.ensureRootFolderExists();
        
        // Split path into parts and create each directory in sequence
        const pathParts = path.split('/').filter(Boolean);
        let parentId = this.rootFolderId;
        
        for (const dirName of pathParts) {
            // Check if directory exists
            const searchResponse = await this.makeRequest(
                `https://www.googleapis.com/drive/v3/files?q=name='${dirName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
            );
            
            if (searchResponse.files && searchResponse.files.length > 0) {
                // Directory exists, use it as parent for next iteration
                parentId = searchResponse.files[0].id;
            } else {
                // Create directory
                const createResponse = await this.makeRequest(
                    'https://www.googleapis.com/drive/v3/files',
                    'POST',
                    {
                        name: dirName,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [parentId]
                    }
                );
                
                parentId = createResponse.id;
            }
        }
        
        return parentId;
    }
}

// Create singleton instance
const gDrive = new GoogleDriveManager();
