const fs = require('fs-extra'); // fs-extra is a popular package for enhanced file system operations
const path = require('path');

const distDir = 'dist';
const filesToCopy = [
    'newtab.html', // Keep this as the newtab override
    'styles.css',
    'script.js',
    'markdown.js',
    'README.md',
    'INSTALL.md'
];
const iconsDir = 'icons';

async function createDist() {
    try {
        // Remove existing dist directory to ensure a clean build
        await fs.remove(distDir);
        console.log(`Cleaned existing '${distDir}' directory.`);

        // Create dist directory
        await fs.mkdir(distDir);
        console.log(`Created '${distDir}' directory.`);

        // Copy individual files
        for (const file of filesToCopy) {
            const srcPath = file;
            const destPath = path.join(distDir, file);
            await fs.copy(srcPath, destPath);
            console.log(`Copied ${file} to ${distDir}/`);
        }

        // Copy icons directory
        const iconsSrcPath = iconsDir;
        const iconsDestPath = path.join(distDir, iconsDir);
        await fs.copy(iconsSrcPath, iconsDestPath);
        console.log(`Copied ${iconsDir}/ to ${distDir}/${iconsDir}/`);

        // Handle manifest.json - ensure it uses chrome_url_overrides for newtab
        const manifestPath = 'manifest.json';
        const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

        // Ensure chrome_url_overrides is set correctly for newtab.html
        manifestContent.chrome_url_overrides = {
            "newtab": "newtab.html"
        };
        // Remove action and background if they were added by a previous script
        if (manifestContent.action) {
            delete manifestContent.action;
            console.log('Removed action property from manifest.json');
        }
        if (manifestContent.background) {
            delete manifestContent.background;
            console.log('Removed background property from manifest.json');
        }
        // Ensure icons are present (they were removed by your previous script)
        if (!manifestContent.icons) {
            manifestContent.icons = {
                "16": "icons/icon16.png",
                "48": "icons/icon48.png",
                "128": "icons/icon128.png"
            };
            console.log('Restored icons property to manifest.json');
        }

        // Ensure necessary permissions are present for File System Access API (though not explicitly declared in manifest)
        // The File System Access API permissions are handled by the browser's native prompts.
        // We still need 'storage' for auto-saving.
        if (!manifestContent.permissions) {
            manifestContent.permissions = [];
        }
        if (!manifestContent.permissions.includes("storage")) {
            manifestContent.permissions.push("storage");
        }
        // Remove tabs and scripting if they are not strictly needed for this core functionality
        manifestContent.permissions = manifestContent.permissions.filter(perm => perm !== "tabs" && perm !== "scripting");


        fs.writeFileSync(
            path.join(distDir, 'manifest.json'),
            JSON.stringify(manifestContent, null, 2),
            'utf8'
        );
        console.log('Copied and ensured correct manifest.json in dist folder');

        console.log("\n✅ Distribution created successfully in the 'dist' folder!");
        console.log("Note: The extension now overrides the new tab page, which allows the File System Access API to function reliably.");
    } catch (err) {
        console.error('Error creating distribution:', err);
        process.exit(1); // Exit with an error code
    }
}

createDist();
