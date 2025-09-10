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
        const theme = this.settingsManager ? this.settingsManager.getSetting('theme') : 'material';
        this.editor = CodeMirror.fromTextArea(this.textEditorElement, {
            theme: theme,
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

        this.editor.on('change', (cm, change) => {
            this.handleEditorChange();
            
            // Trigger AI feedback for user input changes
            if (change.origin === '+input' || 
                change.origin === 'paste' || 
                change.origin === '+delete' ||
                change.origin === 'cut' ||
                (change.origin && change.origin.indexOf('paste') !== -1)) {
                this.onChangeCallback('input');
            }
        });

        // Apply initial font settings
        this.applyFontSettings();
    }

    setupSettingsListeners() {
        if (this.settingsManager) {
            this.settingsManager.onChange((key, value) => {
                if (key === 'fontFamily' || key === 'fontSize') {
                    this.applyFontSettings();
                } else if (key === 'theme') {
                    this.applyTheme(value);
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

    applyTheme(theme) {
        if (!this.editor) return;
        
        this.editor.setOption('theme', theme);
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
        
        // Reset AI feedback timers for new content
        if (window.app?.aiService) {
            window.app.aiService.resetTimersForNewContent();
        }
        
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
        
        // Reset AI feedback timers for new content
        if (window.app?.aiService) {
            window.app.aiService.resetTimersForNewContent();
        }
        
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

    highlightRange(start, end) {
        if (!this.editor) return;

        const doc = this.editor.getDoc();
        const text = doc.getValue();
        
        // Convert character positions to line/column positions
        const startPos = this.charPosToLineCol(text, start);
        const endPos = this.charPosToLineCol(text, end);
        
        // Clear existing selections
        doc.setSelection(startPos, endPos);
        
        // Scroll to selection
        this.editor.scrollIntoView({from: startPos, to: endPos}, 100);
        
        // Focus the editor
        this.editor.focus();
        
        // Create a temporary highlight mark that fades out
        const mark = doc.markText(startPos, endPos, {
            className: 'inspect-highlight',
            inclusiveLeft: false,
            inclusiveRight: false
        });
        
        // Add temporary highlighting CSS if not already added
        this.addHighlightStyles();
        
        // Remove the highlight after a few seconds
        setTimeout(() => {
            if (mark && mark.clear) {
                mark.clear();
            }
        }, 3000);
    }

    charPosToLineCol(text, charPos) {
        if (charPos <= 0) return {line: 0, ch: 0};
        
        const lines = text.substring(0, charPos).split('\n');
        return {
            line: lines.length - 1,
            ch: lines[lines.length - 1].length
        };
    }

    addHighlightStyles() {
        if (document.getElementById('inspect-highlight-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'inspect-highlight-styles';
        style.textContent = `
            .inspect-highlight {
                background-color: rgba(0, 122, 204, 0.3);
                border-radius: 2px;
                animation: inspectFadeOut 3s ease-out forwards;
            }
            
            @keyframes inspectFadeOut {
                0% {
                    background-color: rgba(0, 122, 204, 0.5);
                }
                100% {
                    background-color: rgba(0, 122, 204, 0.1);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    updateCurrentFileName(newFileName) {
        if (this.currentFile) {
            this.currentFile.name = newFileName;
            this.currentFile.path = newFileName;
            this.setEditorMode(newFileName);
            
            this.onChangeCallback('contentChange', {
                isModified: this.isModified,
                fileName: newFileName
            });
        }
    }

    insertTextAtPosition(text, position = null) {
        if (!this.editor) return;

        const doc = this.editor.getDoc();
        let insertionStartPos;
        
        if (position !== null && typeof position === 'number') {
            // Convert character position to line/column position
            const editorContent = doc.getValue();
            const insertPos = this.charPosToLineCol(editorContent, position);
            insertionStartPos = position;
            
            // Insert text at the specified position
            doc.replaceRange(text, insertPos, insertPos);
        } else {
            // Use smart insertion after current sentence
            this.insertTextAfterSentence(text);
            return;
        }
        
        // Mark the inserted content as AI-generated
        this.markInsertedContentAsAI(insertionStartPos, insertionStartPos + text.length);
        
        // Mark file as modified and trigger change callbacks
        this.handleEditorChange();
        
        // Trigger input event to update text analysis (but mark as AI-generated first)
        this.onChangeCallback('input');
        
        // Focus the editor
        this.editor.focus();
    }

    insertTextAfterSentence(text) {
        if (!this.editor) return;

        const doc = this.editor.getDoc();
        const cursor = doc.getCursor();
        const currentLine = doc.getLine(cursor.line);
        
        // Find the end of the current sentence (look for . ! ? followed by space or end of line)
        let insertPos = cursor;
        const sentenceEndPattern = /[.!?](\s|$)/g;
        let match;
        let lastSentenceEnd = -1;
        
        while ((match = sentenceEndPattern.exec(currentLine)) !== null) {
            const endPos = match.index + match[0].length - (match[1] === '' ? 0 : 1);
            if (endPos >= cursor.ch) {
                insertPos = { line: cursor.line, ch: endPos };
                break;
            }
            lastSentenceEnd = endPos;
        }
        
        // If no sentence end found after cursor, use the last one found or cursor position
        if (insertPos === cursor && lastSentenceEnd >= 0) {
            insertPos = { line: cursor.line, ch: lastSentenceEnd };
        }
        
        // Add appropriate spacing
        const textToInsert = insertPos.ch < currentLine.length ? ` ${text}` : ` ${text}`;
        
        // Calculate character position for AI content marking
        const currentContent = doc.getValue();
        const insertCharPos = this.lineColToCharPos(currentContent, insertPos);
        
        // Insert the text
        doc.replaceRange(textToInsert, insertPos, insertPos);
        
        // Mark the inserted content as AI-generated (skip the leading space)
        const actualTextStart = insertCharPos + (textToInsert.startsWith(' ') ? 1 : 0);
        this.markInsertedContentAsAI(actualTextStart, actualTextStart + text.length);
        
        // Mark file as modified and trigger change callbacks
        this.handleEditorChange();
        
        // Trigger input event to update text analysis
        this.onChangeCallback('input');
        
        // Focus the editor
        this.editor.focus();
    }

    getCursorPosition() {
        if (!this.editor) return null;
        const cursor = this.editor.getDoc().getCursor();
        const content = this.editor.getValue();
        return this.lineColToCharPos(content, cursor);
    }

    lineColToCharPos(text, lineCol) {
        const lines = text.split('\n');
        let charPos = 0;
        
        for (let i = 0; i < lineCol.line && i < lines.length; i++) {
            charPos += lines[i].length + 1; // +1 for newline character
        }
        
        charPos += Math.min(lineCol.ch, lines[lineCol.line]?.length || 0);
        return charPos;
    }

    replaceTextAtPosition(newText, startPos, endPos) {
        if (!this.editor) return;

        const doc = this.editor.getDoc();
        
        if (typeof startPos === 'number' && typeof endPos === 'number') {
            // Convert character positions to line/column positions
            const editorContent = doc.getValue();
            const startLineCol = this.charPosToLineCol(editorContent, startPos);
            const endLineCol = this.charPosToLineCol(editorContent, endPos);
            
            // Replace the range with new text
            doc.replaceRange(newText, startLineCol, endLineCol);
        } else if (startPos && endPos) {
            // Assume startPos and endPos are already line/column objects
            doc.replaceRange(newText, startPos, endPos);
        } else {
            // Fallback: replace selected text or current line
            const selection = doc.getSelection();
            if (selection && selection.trim()) {
                doc.replaceSelection(newText);
            } else {
                const cursor = doc.getCursor();
                const line = doc.getLine(cursor.line);
                doc.replaceRange(newText, {line: cursor.line, ch: 0}, {line: cursor.line, ch: line.length});
            }
        }
        
        // Mark file as modified and trigger change callbacks
        this.handleEditorChange();
        
        // Trigger input event to update text analysis
        this.onChangeCallback('input');
        
        // Focus the editor
        this.editor.focus();
    }

    markInsertedContentAsAI(startPos, endPos) {
        // Mark the inserted content as AI-generated in the text analysis system
        if (window.app?.textAnalysisManager?.sentenceDataModel) {
            // Delay the marking to ensure the text analysis has processed the new content
            setTimeout(() => {
                window.app.textAnalysisManager.sentenceDataModel.markContentAsAIGenerated(startPos, endPos);
            }, 200);
        }
    }
}