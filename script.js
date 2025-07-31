class AITextEditor {
    constructor() {
        this.editor = null;
        this.currentFile = null;
        this.currentDirectory = null;
        this.directoryHandle = null;
        this.fileHandles = new Map();
        this.isModified = false;
        this.aiRecommendationsEnabled = true;
        this.recommendationTimer = null;
        this.supportsFileSystemAccess = 'showDirectoryPicker' in window;
        
        if (!this.supportsFileSystemAccess) {
            this.showNotification('File System Access API not supported in this browser', 'error');
        }
        
        this.init();
    }

    init() {
        this.initializeElements();
        this.setupEventListeners();
        this.initializeEditor();
        this.setupMobileNavigation();
    }

    initializeElements() {
        this.elements = {
            selectDirectoryBtn: document.getElementById('selectDirectoryBtn'),
            fileTree: document.getElementById('fileTree'),
            textEditor: document.getElementById('textEditor'),
            currentFileSpan: document.getElementById('currentFile'),
            newFileBtn: document.getElementById('newFileBtn'),
            saveFileBtn: document.getElementById('saveFileBtn'),
            menuToggle: document.getElementById('menuToggle'),
            fileExplorer: document.getElementById('fileExplorer'),
            aiSidebar: document.getElementById('aiSidebar'),
            closeExplorer: document.getElementById('closeExplorer'),
            closeSidebar: document.getElementById('closeSidebar'),
            bottomNav: document.querySelector('.bottom-nav'),
            filesNavBtn: document.getElementById('filesNavBtn'),
            editorNavBtn: document.getElementById('editorNavBtn'),
            aiNavBtn: document.getElementById('aiNavBtn'),
            improveTextBtn: document.getElementById('improveTextBtn'),
            summarizeBtn: document.getElementById('summarizeBtn'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            recommendationsContainer: document.querySelector('.recommendations-container')
        };
    }

    setupEventListeners() {
        this.elements.selectDirectoryBtn.addEventListener('click', () => {
            if (this.supportsFileSystemAccess) {
                this.selectDirectoryWithFileSystemAPI();
            } else {
                this.showNotification('File System Access API not supported', 'error');
            }
        });


        this.elements.newFileBtn.addEventListener('click', () => {
            this.createNewFile();
        });

        this.elements.saveFileBtn.addEventListener('click', () => {
            this.saveCurrentFile();
        });

        this.elements.closeExplorer.addEventListener('click', () => {
            this.closePanel('fileExplorer');
        });

        this.elements.closeSidebar.addEventListener('click', () => {
            this.closePanel('aiSidebar');
        });

        this.elements.improveTextBtn.addEventListener('click', () => {
            this.improveText();
        });

        this.elements.summarizeBtn.addEventListener('click', () => {
            this.summarizeText();
        });

        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        window.addEventListener('beforeunload', (e) => {
            if (this.isModified) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    initializeEditor() {
        this.editor = CodeMirror.fromTextArea(this.elements.textEditor, {
            theme: 'material',
            lineNumbers: true,
            lineWrapping: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 2,
            tabSize: 2,
            mode: 'text/plain',
            extraKeys: {
                'Ctrl-S': () => this.saveCurrentFile(),
                'Cmd-S': () => this.saveCurrentFile(),
                'Ctrl-N': () => this.createNewFile(),
                'Cmd-N': () => this.createNewFile()
            }
        });

        this.editor.on('change', () => {
            this.handleEditorChange();
        });

        this.editor.on('inputRead', (cm, change) => {
            if (change.origin === '+input') {
                this.scheduleAIRecommendations();
            }
        });
    }

    setupMobileNavigation() {
        this.elements.filesNavBtn.addEventListener('click', () => {
            this.showMobilePanel('files');
        });

        this.elements.editorNavBtn.addEventListener('click', () => {
            this.showMobilePanel('editor');
        });

        this.elements.aiNavBtn.addEventListener('click', () => {
            this.showMobilePanel('ai');
        });

        this.updateMobileNavigation('editor');
    }

    async selectDirectoryWithFileSystemAPI() {
        try {
            this.directoryHandle = await window.showDirectoryPicker({
                mode: 'readwrite'
            });
            
            this.currentDirectory = this.directoryHandle.name;
            this.fileHandles.clear();
            
            await this.scanDirectory(this.directoryHandle);
            this.renderFileTree();
            
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error selecting directory:', error);
                this.showNotification('Error selecting directory', 'error');
            }
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


    renderFileTree() {
        const fileTree = this.elements.fileTree;
        fileTree.innerHTML = '';

        if (this.fileHandles.size === 0) {
            fileTree.innerHTML = '<p class="no-files">No directory selected</p>';
            return;
        }

        const fileStructure = this.buildFileStructure();
        const treeHTML = this.renderFileStructure(fileStructure);
        fileTree.innerHTML = treeHTML;

        this.attachFileTreeListeners();
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

    renderFileStructure(structure, level = 0) {
        let html = '';
        
        for (const [name, content] of Object.entries(structure)) {
            if (content._isFile) {
                const icon = this.getFileIcon(name);
                html += `
                    <div class="file-item" data-path="${content._path}" style="margin-left: ${level * 20}px;">
                        <span class="file-icon">${icon}</span>
                        ${name}
                    </div>
                `;
            } else {
                html += `
                    <div class="folder-item" style="margin-left: ${level * 20}px;">
                        <span class="file-icon">📁</span>
                        ${name}
                    </div>
                `;
                html += this.renderFileStructure(content, level + 1);
            }
        }
        
        return html;
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

    attachFileTreeListeners() {
        const fileItems = document.querySelectorAll('.file-item');
        fileItems.forEach(item => {
            item.addEventListener('click', () => {
                this.openFile(item.dataset.path);
            });
        });
    }

    async openFile(filePath) {
        if (this.isModified && !confirm('You have unsaved changes. Continue?')) {
            return;
        }

        const fileHandle = this.fileHandles.get(filePath);
        if (!fileHandle) return;

        try {
            let content;
            
            const file = await fileHandle.getFile();
            content = await file.text();
            
            this.currentFile = {
                path: filePath,
                name: filePath.split('/').pop(),
                content: content,
                originalContent: content,
                handle: fileHandle
            };

            this.editor.setValue(content);
            this.setEditorMode(filePath);
            this.elements.currentFileSpan.textContent = this.currentFile.name;
            this.elements.saveFileBtn.disabled = false;
            this.isModified = false;

            this.updateActiveFileInTree(filePath);
            this.scheduleAIRecommendations();

            if (window.innerWidth <= 768) {
                this.showMobilePanel('editor');
            }
        } catch (error) {
            console.error('Error opening file:', error);
            this.showNotification('Error opening file', 'error');
        }
    }

    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    setEditorMode(filePath) {
        const ext = filePath.split('.').pop().toLowerCase();
        const modes = {
            'js': 'javascript',
            'json': 'javascript',
            'html': 'xml',
            'xml': 'xml',
            'css': 'css',
            'md': 'markdown'
        };
        
        const mode = modes[ext] || 'text/plain';
        this.editor.setOption('mode', mode);
    }

    updateActiveFileInTree(filePath) {
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-path="${filePath}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    createNewFile() {
        if (this.isModified && !confirm('You have unsaved changes. Continue?')) {
            return;
        }

        const fileName = prompt('Enter file name:');
        if (!fileName) return;

        this.currentFile = {
            path: fileName,
            name: fileName,
            content: '',
            originalContent: '',
            isNew: true
        };

        this.editor.setValue('');
        this.setEditorMode(fileName);
        this.elements.currentFileSpan.textContent = fileName;
        this.elements.saveFileBtn.disabled = false;
        this.isModified = false;

        this.editor.focus();
    }

    async saveCurrentFile() {
        if (!this.currentFile) return;

        const content = this.editor.getValue();
        
        try {
            if (this.currentFile.handle && this.currentFile.handle.createWritable) {
                const writable = await this.currentFile.handle.createWritable();
                await writable.write(content);
                await writable.close();
                this.showNotification('File saved successfully', 'success');
            } else if (this.currentFile.isNew) {
                await this.saveNewFileWithFileSystemAPI(this.currentFile.name, content);
            } else {
                this.showNotification('Unable to save file', 'error');
                return;
            }

            this.currentFile.originalContent = content;
            this.isModified = false;
            
        } catch (error) {
            console.error('Error saving file:', error);
            this.showNotification('Error saving file', 'error');
        }
    }

    async saveNewFileWithFileSystemAPI(fileName, content) {
        if (!this.directoryHandle) {
            this.showNotification('No directory selected', 'error');
            return;
        }

        try {
            const fileHandle = await this.directoryHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();
            
            this.fileHandles.set(fileName, fileHandle);
            this.currentFile.handle = fileHandle;
            this.currentFile.isNew = false;
            
            this.renderFileTree();
            this.showNotification('File created successfully', 'success');
            
        } catch (error) {
            console.error('Error creating file:', error);
            this.showNotification('Error creating file', 'error');
        }
    }

    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    handleEditorChange() {
        if (!this.currentFile) return;
        
        const content = this.editor.getValue();
        this.isModified = content !== this.currentFile.originalContent;
        
        const title = this.currentFile.name + (this.isModified ? ' *' : '');
        this.elements.currentFileSpan.textContent = title;
    }

    scheduleAIRecommendations() {
        if (!this.aiRecommendationsEnabled) return;
        
        clearTimeout(this.recommendationTimer);
        this.recommendationTimer = setTimeout(() => {
            this.generateAIRecommendations();
        }, 1000);
    }

    async generateAIRecommendations() {
        if (!this.currentFile) return;
        
        const content = this.editor.getValue();
        if (content.length < 10) return;

        // Show loading indicator
        this.showRecommendationsLoading(true);

        try {
            const recommendations = await this.getAIRecommendations(content);
            this.displayRecommendations(recommendations);
        } catch (error) {
            console.error('Error generating AI recommendations:', error);
            this.showRecommendationError('Unable to generate recommendations. Please check your connection.');
        } finally {
            // Hide loading indicator
            this.showRecommendationsLoading(false);
        }
    }

    async getAIRecommendations(content) {
        try {
            const response = await fetch('/analyze-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: content,
                    max_recommendations: 5
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            return {
                recommendations: data.recommendations || [],
                word_count: data.word_count || 0,
                character_count: data.character_count || 0
            };
        } catch (error) {
            console.error('Error calling AI API:', error);
            // Fallback to basic analysis if API is unavailable
            return {
                recommendations: [
                    {
                        category: "Connection Error",
                        suggestion: "Unable to connect to AI service. Please check your internet connection.",
                        priority: "high"
                    }
                ],
                word_count: content.split(/\s+/).length,
                character_count: content.length
            };
        }
    }

    showRecommendationsLoading(show) {
        const loadingElement = document.getElementById('recommendationsLoading');
        
        if (show) {
            loadingElement.style.display = 'block';
        } else {
            loadingElement.style.display = 'none';
        }
    }

    showRecommendationError(message) {
        const container = this.elements.recommendationsContainer;
        container.innerHTML = `
            <div class="recommendation-item error">
                <h4>⚠️ Connection Issue</h4>
                <p>${message}</p>
                <p><small>Please check your internet connection and try again.</small></p>
            </div>
        `;
    }

    displayRecommendations(data) {
        const container = this.elements.recommendationsContainer;
        
        if (!data.recommendations || data.recommendations.length === 0) {
            container.innerHTML = `
                <div class="recommendation-item">
                    <h4>✨ AI Analysis</h4>
                    <p>No specific recommendations at this time. Your text looks good!</p>
                </div>
            `;
            return;
        }

        // Group recommendations by category
        const groupedRecs = {};
        data.recommendations.forEach(rec => {
            if (!groupedRecs[rec.category]) {
                groupedRecs[rec.category] = [];
            }
            groupedRecs[rec.category].push(rec);
        });

        let html = '';
        for (const [category, recs] of Object.entries(groupedRecs)) {
            const categoryIcon = this.getCategoryIcon(category);
            html += `
                <div class="recommendation-item">
                    <h4>${categoryIcon} ${category}</h4>
                    ${recs.map(rec => `
                        <p class="recommendation-${rec.priority}">
                            • ${rec.suggestion}
                            <span class="priority-badge ${rec.priority}">${rec.priority}</span>
                        </p>
                    `).join('')}
                </div>
            `;
        }

        // Add text statistics
        if (data.word_count !== undefined) {
            html += `
                <div class="recommendation-item stats">
                    <h4>📊 Text Statistics</h4>
                    <p>Words: ${data.word_count} | Characters: ${data.character_count}</p>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    getCategoryIcon(category) {
        const icons = {
            'Style': '✨',
            'Grammar': '📝', 
            'Vocabulary': '📚',
            'Structure': '🏗️',
            'Clarity': '💡',
            'Syntax': '⚙️',
            'Connection Error': '⚠️',
            'AI Analysis': '🤖'
        };
        return icons[category] || '📋';
    }

    async improveText() {
        if (!this.currentFile) return;
        
        const selectedText = this.editor.getSelection();
        const textToImprove = selectedText || this.editor.getValue();
        
        if (!textToImprove.trim()) return;
        
        this.showLoading(true);
        
        try {
            const improvedText = await this.callAIImprovement(textToImprove);
            
            if (selectedText) {
                this.editor.replaceSelection(improvedText);
            } else {
                this.editor.setValue(improvedText);
            }
            
            this.showNotification('Text improved successfully', 'success');
        } catch (error) {
            console.error('Error improving text:', error);
            this.showNotification('Error improving text. Check your connection.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async summarizeText() {
        if (!this.currentFile) return;
        
        const content = this.editor.getValue();
        if (!content.trim()) return;
        
        this.showLoading(true);
        
        try {
            const summary = await this.callAISummarization(content);
            
            const summaryWindow = window.open('', '_blank', 'width=600,height=400');
            summaryWindow.document.write(`
                <html>
                    <head>
                        <title>Text Summary</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                            h1 { color: #333; }
                            .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
                        </style>
                    </head>
                    <body>
                        <h1>Summary of ${this.currentFile.name}</h1>
                        <div class="summary">${summary}</div>
                    </body>
                </html>
            `);
            
            this.showNotification('Summary generated successfully', 'success');
        } catch (error) {
            console.error('Error summarizing text:', error);
            this.showNotification('Error generating summary', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async callAIImprovement(text) {
        try {
            const response = await fetch('/improve-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            return data.improved_text || text;
        } catch (error) {
            console.error('Error calling improve text API:', error);
            throw new Error('Unable to improve text. Please check your internet connection.');
        }
    }

    async callAISummarization(text) {
        try {
            const response = await fetch('/summarize-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            return data.summary || 'Unable to generate summary.';
        } catch (error) {
            console.error('Error calling summarization API:', error);
            throw new Error('Unable to generate summary. Please check your internet connection.');
        }
    }


    showMobilePanel(panel) {
        this.elements.fileExplorer.classList.remove('active');
        this.elements.aiSidebar.classList.remove('active');
        
        if (panel === 'files') {
            this.elements.fileExplorer.classList.add('active');
        } else if (panel === 'ai') {
            this.elements.aiSidebar.classList.add('active');
        }
        
        this.updateMobileNavigation(panel);
    }

    updateMobileNavigation(activePanel) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (activePanel === 'files') {
            this.elements.filesNavBtn.classList.add('active');
        } else if (activePanel === 'ai') {
            this.elements.aiNavBtn.classList.add('active');
        } else {
            this.elements.editorNavBtn.classList.add('active');
        }
    }

    closePanel(panelId) {
        const panel = document.getElementById(panelId);
        panel.classList.remove('active');
        this.updateMobileNavigation('editor');
    }

    handleKeyboardShortcuts(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            this.saveCurrentFile();
        } else if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            this.createNewFile();
        } else if (event.key === 'Escape') {
            this.elements.fileExplorer.classList.remove('active');
            this.elements.aiSidebar.classList.remove('active');
            this.updateMobileNavigation('editor');
        }
    }

    showLoading(show) {
        this.elements.loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            background-color: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AITextEditor();
});