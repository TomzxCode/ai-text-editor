class AITextEditor {
    constructor() {
        this.aiRecommendationsEnabled = true;
        
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
            recommendationsContainer: document.querySelector('.recommendations-container')
        };
    }

    initializeManagers() {
        this.editorManager = new EditorManager(this.elements.textEditor, (event, data) => {
            this.handleEditorEvent(event, data);
        });
        
        this.uiManager = new UIManager(this.elements);
        this.aiService = new AIService();
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
        if (!this.aiRecommendationsEnabled) return;
        
        const content = this.editorManager.getValue();
        this.aiService.scheduleRecommendations(() => {
            this.generateAIRecommendations(content);
        });
    }

    generateAIRecommendations(content) {
        if (!this.editorManager.hasCurrentFile()) return;
        
        this.aiService.generateRecommendations(
            content,
            (show) => this.uiManager.showRecommendationsLoading(show),
            (recommendations) => this.uiManager.displayRecommendations(recommendations),
            (error) => this.uiManager.showRecommendationError(error)
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









}

document.addEventListener('DOMContentLoaded', () => {
    new AITextEditor();
});