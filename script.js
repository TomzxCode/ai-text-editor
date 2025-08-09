class AITextEditor {
    constructor() {
        this.fileSystemManager = new FileSystemManager();
        this.notificationManager = new NotificationManager();
        
        if (!this.fileSystemManager.supportsFileSystemAccess) {
            this.notificationManager.error('File System Access API not supported in this browser');
        }
        
        this.init();
    }

    init() {
        this.initializeElements();
        this.setupEventListeners();
        this.initializeManagers();
    }

    initializeElements() {
        this.elements = {
            selectDirectoryBtn: document.getElementById('selectDirectoryBtn'),
            fileTree: document.getElementById('fileTree'),
            fileSearch: document.getElementById('fileSearch'),
            fileSearchInput: document.getElementById('fileSearchInput'),
            searchClear: document.getElementById('searchClear'),
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
            leftResize: document.getElementById('leftResize'),
            rightResize: document.getElementById('rightResize'),
            summarizeBtn: document.getElementById('summarizeBtn'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            recommendationsContainer: document.querySelector('.recommendations-container'),
            addPromptBtn: document.getElementById('addPromptBtn'),
            customPromptsList: document.getElementById('customPromptsList'),
            promptModal: document.getElementById('promptModal'),
            promptModalTitle: document.getElementById('promptModalTitle'),
            promptName: document.getElementById('promptName'),
            promptText: document.getElementById('promptText'),
            promptEnabled: document.getElementById('promptEnabled'),
            savePromptBtn: document.getElementById('savePromptBtn'),
            cancelPromptBtn: document.getElementById('cancelPromptBtn'),
            closePromptModal: document.getElementById('closePromptModal')
        };
    }

    initializeManagers() {
        this.settingsManager = new SettingsManager();
        
        this.editorManager = new EditorManager(this.elements.textEditor, (event, data) => {
            this.handleEditorEvent(event, data);
        }, this.settingsManager);
        
        this.uiManager = new UIManager(this.elements);
        this.aiService = new AIService();
        this.customPromptsManager = new CustomPromptsManager();
        
        this.currentEditingPromptId = null;
        this.renderCustomPrompts();
        
        // Setup settings UI after DOM is ready
        setTimeout(() => {
            this.settingsManager.setupUI();
        }, 0);
    }

    setupEventListeners() {
        this.elements.selectDirectoryBtn.addEventListener('click', () => {
            this.selectDirectory();
        });

        this.elements.newFileBtn.addEventListener('click', () => {
            this.createNewFile();
        });

        this.elements.saveFileBtn.addEventListener('click', () => {
            this.saveCurrentFile();
        });

        this.elements.improveTextBtn.addEventListener('click', () => {
            this.improveText();
        });

        this.elements.summarizeBtn.addEventListener('click', () => {
            this.summarizeText();
        });

        this.elements.addPromptBtn.addEventListener('click', () => {
            this.showPromptModal();
        });

        this.elements.savePromptBtn.addEventListener('click', () => {
            this.savePrompt();
        });

        this.elements.cancelPromptBtn.addEventListener('click', () => {
            this.hidePromptModal();
        });

        this.elements.closePromptModal.addEventListener('click', () => {
            this.hidePromptModal();
        });

        // Track mousedown to distinguish between clicks and text selection
        let modalMouseDownTarget = null;
        
        this.elements.promptModal.addEventListener('mousedown', (e) => {
            modalMouseDownTarget = e.target;
        });
        
        this.elements.promptModal.addEventListener('mouseup', (e) => {
            // Only close modal if mousedown and mouseup happened on the same target (overlay)
            // and that target is the modal overlay itself
            if (e.target === this.elements.promptModal && 
                modalMouseDownTarget === this.elements.promptModal) {
                this.hidePromptModal();
            }
            modalMouseDownTarget = null;
        });

        window.addEventListener('beforeunload', (e) => {
            if (this.editorManager.isFileModified()) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    handleEditorEvent(event, data) {
        switch (event) {
            case 'save':
                this.saveCurrentFile();
                break;
            case 'new':
                this.createNewFile();
                break;
            case 'input':
                this.scheduleAIRecommendations();
                break;
            case 'contentChange':
                this.updateFileTitle(data.fileName, data.isModified);
                break;
            case 'fileLoaded':
                this.updateFileTitle(data.fileName, data.isModified);
                break;
        }
    }

    updateFileTitle(fileName, isModified) {
        const title = fileName + (isModified ? ' *' : '');
        this.elements.currentFileSpan.textContent = title;
    }



    async selectDirectory() {
        if (!this.fileSystemManager.supportsFileSystemAccess) {
            this.notificationManager.error('File System Access API not supported');
            return;
        }

        try {
            const result = await this.fileSystemManager.selectDirectory();
            if (result) {
                this.currentDirectory = result.name;
                this.renderFileTree();
            }
        } catch (error) {
            console.error('Error selecting directory:', error);
            this.notificationManager.error('Error selecting directory');
        }
    }



    renderFileTree() {
        const fileStructure = this.fileSystemManager.buildFileStructure();
        this.uiManager.renderFileTree(fileStructure, (filePath) => {
            this.openFile(filePath);
        });
    }













    async openFile(filePath) {
        if (this.editorManager.isFileModified() && !confirm('You have unsaved changes. Continue?')) {
            return;
        }

        try {
            const fileData = await this.fileSystemManager.readFile(filePath);
            this.editorManager.loadFile(fileData);
            this.elements.saveFileBtn.disabled = false;
            
            this.uiManager.updateActiveFileInTree(filePath);
            this.scheduleAIRecommendations();

            if (window.innerWidth <= 768) {
                this.uiManager.showMobilePanel('editor');
            }
        } catch (error) {
            console.error('Error opening file:', error);
            this.notificationManager.error('Error opening file');
        }
    }




    createNewFile() {
        if (this.editorManager.isFileModified() && !confirm('You have unsaved changes. Continue?')) {
            return;
        }

        const fileName = prompt('Enter file name:');
        if (!fileName) return;

        this.editorManager.createNewFile(fileName);
        this.elements.saveFileBtn.disabled = false;
    }

    async saveCurrentFile() {
        const currentFile = this.editorManager.getCurrentFile();
        if (!currentFile) return;

        const content = this.editorManager.getValue();
        
        try {
            if (currentFile.handle && currentFile.handle.createWritable) {
                await this.fileSystemManager.saveFile(currentFile.handle, content);
                this.notificationManager.success('File saved successfully');
            } else if (currentFile.isNew) {
                await this.fileSystemManager.createNewFile(currentFile.name, content);
                this.renderFileTree();
                this.notificationManager.success('File created successfully');
            } else {
                this.notificationManager.error('Unable to save file');
                return;
            }

            this.editorManager.markAsSaved();
            
        } catch (error) {
            console.error('Error saving file:', error);
            this.notificationManager.error('Error saving file');
        }
    }




    scheduleAIRecommendations() {
        // Check if AI recommendations are enabled in settings
        const aiEnabled = this.settingsManager.getSetting('enableAIRecommendations');
        
        if (!aiEnabled) {
            return;
        }
        
        this.aiService.scheduleRecommendations(() => {
            // Get content at execution time, not scheduling time
            const content = this.editorManager.getValue();
            this.generateAIRecommendations(content);
        });
    }

    generateAIRecommendations(content) {
        // Allow AI recommendations even without a current file, as long as there's content
        if (!content || content.trim().length === 0) {
            // Restore initial placeholder if no content
            this.uiManager.restoreInitialPlaceholder();
            return;
        }
        
        const enabledPrompts = this.customPromptsManager.getEnabledPrompts();
        const settings = this.settingsManager.getAllSettings();
        
        this.aiService.generateRecommendations(
            content,
            (show) => {}, // No longer needed since we use individual placeholders
            (recommendations) => this.uiManager.displayRecommendations(recommendations),
            (error) => this.uiManager.showRecommendationError(error),
            enabledPrompts,
            settings
        );
    }








    async improveText() {
        if (!this.editorManager.hasCurrentFile()) return;
        
        const selectedText = this.editorManager.getSelection();
        const textToImprove = selectedText || this.editorManager.getValue();
        
        if (!textToImprove.trim()) return;
        
        this.uiManager.showLoading(true);
        
        try {
            const improvedText = await this.aiService.improveText(textToImprove);
            
            if (selectedText) {
                this.editorManager.replaceSelection(improvedText);
            } else {
                this.editorManager.setValue(improvedText);
            }
            
            this.notificationManager.success('Text improved successfully');
        } catch (error) {
            console.error('Error improving text:', error);
            this.notificationManager.error('Error improving text. Check your connection.');
        } finally {
            this.uiManager.showLoading(false);
        }
    }

    async summarizeText() {
        if (!this.editorManager.hasCurrentFile()) return;
        
        const content = this.editorManager.getValue();
        if (!content.trim()) return;
        
        this.uiManager.showLoading(true);
        
        try {
            const summary = await this.aiService.summarizeText(content);
            const currentFile = this.editorManager.getCurrentFile();
            
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
                        <h1>Summary of ${currentFile.name}</h1>
                        <div class="summary">${summary}</div>
                    </body>
                </html>
            `);
            
            this.notificationManager.success('Summary generated successfully');
        } catch (error) {
            console.error('Error summarizing text:', error);
            this.notificationManager.error('Error generating summary');
        } finally {
            this.uiManager.showLoading(false);
        }
    }

    renderCustomPrompts() {
        const prompts = this.customPromptsManager.getAllPrompts();
        const container = this.elements.customPromptsList;
        
        if (prompts.length === 0) {
            container.innerHTML = '<p class="no-prompts">No custom prompts yet. Click + to add one.</p>';
            return;
        }
        
        container.innerHTML = prompts.map((prompt, index) => `
            <div class="custom-prompt-item ${!prompt.enabled ? 'disabled' : ''}" 
                 data-id="${prompt.id}" 
                 data-index="${index}"
                 draggable="true">
                <div class="custom-prompt-header">
                    <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
                    <span class="custom-prompt-name">${this.escapeHtml(prompt.name)}</span>
                    <div class="custom-prompt-actions">
                        <button class="btn-icon" onclick="app.togglePrompt('${prompt.id}')" title="${prompt.enabled ? 'Disable' : 'Enable'}">
                            ${prompt.enabled ? '●' : '○'}
                        </button>
                        <button class="btn-icon" onclick="app.editPrompt('${prompt.id}')" title="Edit">✏️</button>
                        <button class="btn-icon danger" onclick="app.deletePrompt('${prompt.id}')" title="Delete">🗑️</button>
                    </div>
                </div>
                <div class="custom-prompt-preview">${this.escapeHtml(prompt.prompt)}</div>
            </div>
        `).join('');
        
        // Add drag and drop event listeners
        this.setupDragAndDrop();
    }

    showPromptModal(promptId = null) {
        this.currentEditingPromptId = promptId;
        
        if (promptId) {
            const prompt = this.customPromptsManager.getPrompt(promptId);
            if (prompt) {
                this.elements.promptModalTitle.textContent = 'Edit Custom Prompt';
                this.elements.promptName.value = prompt.name;
                this.elements.promptText.value = prompt.prompt;
                this.elements.promptEnabled.checked = prompt.enabled;
            }
        } else {
            this.elements.promptModalTitle.textContent = 'Add Custom Prompt';
            this.elements.promptName.value = '';
            this.elements.promptText.value = '';
            this.elements.promptEnabled.checked = true;
        }
        
        this.elements.promptModal.style.display = 'flex';
        this.elements.promptName.focus();
    }

    hidePromptModal() {
        this.elements.promptModal.style.display = 'none';
        this.currentEditingPromptId = null;
    }

    savePrompt() {
        const name = this.elements.promptName.value.trim();
        const prompt = this.elements.promptText.value.trim();
        const enabled = this.elements.promptEnabled.checked;
        
        if (!name) {
            this.notificationManager.error('Please enter a name for the prompt');
            this.elements.promptName.focus();
            return;
        }
        
        if (!prompt) {
            this.notificationManager.error('Please enter the prompt text');
            this.elements.promptText.focus();
            return;
        }
        
        try {
            if (this.currentEditingPromptId) {
                this.customPromptsManager.updatePrompt(this.currentEditingPromptId, {
                    name,
                    prompt,
                    enabled
                });
                this.notificationManager.success('Prompt updated successfully');
            } else {
                this.customPromptsManager.addPrompt(name, prompt, enabled);
                this.notificationManager.success('Prompt added successfully');
            }
            
            this.renderCustomPrompts();
            this.hidePromptModal();
        } catch (error) {
            this.notificationManager.error(error.message);
        }
    }

    editPrompt(promptId) {
        this.showPromptModal(promptId);
    }

    togglePrompt(promptId) {
        try {
            this.customPromptsManager.togglePrompt(promptId);
            this.renderCustomPrompts();
            this.notificationManager.success('Prompt toggled successfully');
        } catch (error) {
            this.notificationManager.error(error.message);
        }
    }

    deletePrompt(promptId) {
        const prompt = this.customPromptsManager.getPrompt(promptId);
        if (!prompt) return;
        
        if (confirm(`Are you sure you want to delete the prompt "${prompt.name}"?`)) {
            try {
                this.customPromptsManager.deletePrompt(promptId);
                this.renderCustomPrompts();
                this.notificationManager.success('Prompt deleted successfully');
            } catch (error) {
                this.notificationManager.error(error.message);
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupDragAndDrop() {
        const container = this.elements.customPromptsList;
        const items = container.querySelectorAll('.custom-prompt-item');
        
        let draggedElement = null;
        let draggedIndex = null;
        
        items.forEach((item, index) => {
            item.addEventListener('dragstart', (e) => {
                draggedElement = item;
                draggedIndex = parseInt(item.dataset.index);
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', item.outerHTML);
            });
            
            item.addEventListener('dragend', (e) => {
                item.classList.remove('dragging');
                // Remove all drag-over indicators
                items.forEach(i => i.classList.remove('drag-over-top', 'drag-over-bottom'));
                draggedElement = null;
                draggedIndex = null;
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                if (item === draggedElement) return;
                
                const rect = item.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                
                // Remove previous indicators
                item.classList.remove('drag-over-top', 'drag-over-bottom');
                
                // Add appropriate indicator
                if (e.clientY < midpoint) {
                    item.classList.add('drag-over-top');
                } else {
                    item.classList.add('drag-over-bottom');
                }
            });
            
            item.addEventListener('dragleave', (e) => {
                // Only remove indicators if we're actually leaving the item
                if (!item.contains(e.relatedTarget)) {
                    item.classList.remove('drag-over-top', 'drag-over-bottom');
                }
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                
                if (item === draggedElement) return;
                
                const rect = item.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                const dropIndex = parseInt(item.dataset.index);
                
                let targetIndex;
                if (e.clientY < midpoint) {
                    // Drop above this item
                    targetIndex = dropIndex;
                } else {
                    // Drop below this item
                    targetIndex = dropIndex + 1;
                }
                
                // Adjust target index if dragging down
                if (draggedIndex < targetIndex) {
                    targetIndex--;
                }
                
                this.movePrompt(draggedIndex, targetIndex);
                
                // Remove indicators
                item.classList.remove('drag-over-top', 'drag-over-bottom');
            });
        });
    }
    
    movePrompt(fromIndex, toIndex) {
        try {
            if (this.customPromptsManager.reorderPrompts(fromIndex, toIndex)) {
                this.renderCustomPrompts();
                
                // Update the order of existing recommendations immediately
                const enabledPrompts = this.customPromptsManager.getEnabledPrompts();
                const enabledPromptNames = enabledPrompts.map(p => p.name);
                this.aiService.reorderRecommendationsByPromptOrder(enabledPromptNames);
                
                this.notificationManager.success('Prompt order updated');
            }
        } catch (error) {
            this.notificationManager.error('Failed to reorder prompt: ' + error.message);
        }
    }









}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new AITextEditor();
});