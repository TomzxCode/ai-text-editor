class EditorManager {
    constructor(textEditorElement, onChangeCallback, settingsManager) {
        this.textEditorElement = textEditorElement;
        this.onChangeCallback = onChangeCallback;
        this.settingsManager = settingsManager;
        this.editor = null;
        this.currentFile = null;
        this.isModified = false;
        
        this.initializeEditor();
        this.setupSettingsListeners();
    }

    initializeEditor() {
        this.editor = CodeMirror.fromTextArea(this.textEditorElement, {
            theme: 'material',
            lineNumbers: true,
            lineWrapping: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 2,
            tabSize: 2,
            mode: 'markdown',
            extraKeys: {
                'Ctrl-S': () => this.onChangeCallback('save'),
                'Cmd-S': () => this.onChangeCallback('save'),
                'Ctrl-N': () => this.onChangeCallback('new'),
                'Cmd-N': () => this.onChangeCallback('new')
            }
        });

        this.editor.on('change', () => {
            this.handleEditorChange();
        });

        this.editor.on('inputRead', (cm, change) => {
            // Trigger AI feedback for various input types
            if (change.origin === '+input' || 
                change.origin === 'paste' || 
                change.origin === '+delete' ||
                (change.origin && change.origin.indexOf('paste') !== -1)) {
                this.onChangeCallback('input');
            }
        });

        // Add paste event listener to ensure paste operations trigger AI feedback
        this.editor.on('paste', () => {
            // Use setTimeout to ensure the paste content is processed first
            setTimeout(() => {
                this.onChangeCallback('input');
            }, 0);
        });

        // Apply initial font settings
        this.applyFontSettings();
    }

    setupSettingsListeners() {
        if (this.settingsManager) {
            this.settingsManager.onChange((key, value) => {
                if (key === 'fontFamily' || key === 'fontSize') {
                    this.applyFontSettings();
                }
            });
        }
    }

    applyFontSettings() {
        if (!this.editor || !this.settingsManager) return;

        const fontFamily = this.settingsManager.getSetting('fontFamily');
        const fontSize = this.settingsManager.getSetting('fontSize');

        // Apply styles to the editor
        const editorElement = this.editor.getWrapperElement();
        editorElement.style.fontFamily = fontFamily;
        editorElement.style.fontSize = `${fontSize}px`;

        // Also apply to the textarea for consistency
        this.textEditorElement.style.fontFamily = fontFamily;
        this.textEditorElement.style.fontSize = `${fontSize}px`;

        // Refresh the editor to apply changes
        this.editor.refresh();
    }

    handleEditorChange() {
        if (!this.currentFile) return;
        
        const content = this.editor.getValue();
        this.isModified = content !== this.currentFile.originalContent;
        
        this.onChangeCallback('contentChange', {
            isModified: this.isModified,
            fileName: this.currentFile.name
        });
    }

    loadFile(fileData) {
        this.currentFile = fileData;
        this.editor.setValue(fileData.content);
        this.setEditorMode(fileData.path);
        this.isModified = false;
        
        this.onChangeCallback('fileLoaded', {
            fileName: fileData.name,
            isModified: false
        });
    }

    createNewFile(fileName) {
        this.currentFile = {
            path: fileName,
            name: fileName,
            content: '',
            originalContent: '',
            isNew: true
        };

        this.editor.setValue('');
        this.setEditorMode(fileName);
        this.isModified = false;
        
        this.onChangeCallback('fileLoaded', {
            fileName: fileName,
            isModified: false
        });

        this.editor.focus();
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

    getValue() {
        return this.editor.getValue();
    }

    setValue(content) {
        this.editor.setValue(content);
    }

    getSelection() {
        return this.editor.getSelection();
    }

    replaceSelection(text) {
        this.editor.replaceSelection(text);
    }

    focus() {
        this.editor.focus();
    }

    getCurrentFile() {
        return this.currentFile;
    }

    isFileModified() {
        return this.isModified;
    }

    markAsSaved() {
        if (this.currentFile) {
            this.currentFile.originalContent = this.getValue();
            this.isModified = false;
            
            this.onChangeCallback('contentChange', {
                isModified: false,
                fileName: this.currentFile.name
            });
        }
    }

    hasCurrentFile() {
        return this.currentFile !== null;
    }
}