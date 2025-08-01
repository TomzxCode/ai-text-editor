class FileSystemManager {
    constructor() {
        this.directoryHandle = null;
        this.fileHandles = new Map();
        this.supportsFileSystemAccess = 'showDirectoryPicker' in window;
    }

    async selectDirectory() {
        if (!this.supportsFileSystemAccess) {
            throw new Error('File System Access API not supported');
        }

        try {
            this.directoryHandle = await window.showDirectoryPicker({
                mode: 'readwrite'
            });
            
            this.fileHandles.clear();
            await this.scanDirectory(this.directoryHandle);
            
            return {
                name: this.directoryHandle.name,
                files: this.getFileList()
            };
        } catch (error) {
            if (error.name !== 'AbortError') {
                throw error;
            }
            return null;
        }
    }

    async scanDirectory(directoryHandle, path = '') {
        for await (const [name, handle] of directoryHandle.entries()) {
            if (name.startsWith('.')) {
                continue;
            }
            
            const fullPath = path ? `${path}/${name}` : name;
            
            if (handle.kind === 'file') {
                this.fileHandles.set(fullPath, handle);
            } else if (handle.kind === 'directory') {
                await this.scanDirectory(handle, fullPath);
            }
        }
    }

    getFileList() {
        return Array.from(this.fileHandles.keys());
    }

    buildFileStructure() {
        const structure = {};
        
        for (const [path] of this.fileHandles) {
            const parts = path.split('/');
            let current = structure;
            
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (!current[part]) {
                    current[part] = i === parts.length - 1 ? { _isFile: true, _path: path } : {};
                }
                current = current[part];
            }
        }
        
        return structure;
    }

    async readFile(filePath) {
        const fileHandle = this.fileHandles.get(filePath);
        if (!fileHandle) {
            throw new Error('File not found');
        }

        const file = await fileHandle.getFile();
        const content = await file.text();
        
        return {
            path: filePath,
            name: filePath.split('/').pop(),
            content: content,
            originalContent: content,
            handle: fileHandle
        };
    }

    async saveFile(fileHandle, content) {
        if (!fileHandle || !fileHandle.createWritable) {
            throw new Error('Cannot save file - invalid handle');
        }

        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    }

    async createNewFile(fileName, content) {
        if (!this.directoryHandle) {
            throw new Error('No directory selected');
        }

        const fileHandle = await this.directoryHandle.getFileHandle(fileName, { create: true });
        await this.saveFile(fileHandle, content);
        
        this.fileHandles.set(fileName, fileHandle);
        
        return {
            path: fileName,
            name: fileName,
            content: content,
            originalContent: content,
            handle: fileHandle
        };
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'js': '📄',
            'html': '🌐',
            'css': '🎨',
            'json': '📋',
            'md': '📝',
            'txt': '📄',
            'py': '🐍',
            'java': '☕',
            'cpp': '⚙️',
            'c': '⚙️',
            'php': '🐘',
            'rb': '💎',
            'go': '🐹',
            'rs': '🦀'
        };
        return icons[ext] || '📄';
    }

    hasFiles() {
        return this.fileHandles.size > 0;
    }

    getCurrentDirectory() {
        return this.directoryHandle ? this.directoryHandle.name : null;
    }
}