class EditorManager {
    constructor(textEditorElement, onChangeCallback) {
        this.textEditorElement = textEditorElement;
        this.onChangeCallback = onChangeCallback;
        this.editor = null;
        this.currentFile = null;
        this.isModified = false;
        
        this.initializeEditor();
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
            if (change.origin === '+input') {
                this.onChangeCallback('input');
            }
        });
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