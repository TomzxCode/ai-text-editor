class PromptPaletteManager {
    constructor(promptsManager, aiService, editorManager) {
        this.promptsManager = promptsManager;
        this.aiService = aiService;
        this.editorManager = editorManager;
        this.isVisible = false;
        this.selectedIndex = -1;
        this.filteredPrompts = [];
        
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Global keyboard shortcut (Ctrl/Cmd + K)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                this.toggle();
            }
        });

        // Handle clicks outside palette to close
        document.addEventListener('click', (e) => {
            const palette = document.getElementById('promptPalette');
            if (palette && this.isVisible && !palette.contains(e.target)) {
                this.hide();
            }
        });
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        if (this.isVisible) return;
        
        const palette = document.getElementById('promptPalette');
        if (!palette) {
            console.error('Prompt palette element not found');
            return;
        }

        // Get current text from editor
        const currentText = this.editorManager ? this.editorManager.getValue() : '';
        const hasText = currentText.trim().length > 0;

        // Get all prompts (show both enabled and disabled)
        const allPrompts = this.promptsManager.getAllPrompts();
        this.filteredPrompts = allPrompts;

        // If no prompts available, show a message
        if (this.filteredPrompts.length === 0) {
            this.showNoPromptsMessage();
            return;
        }

        // Populate prompt list
        this.renderPrompts();
        
        // Show palette
        palette.style.display = 'block';
        this.isVisible = true;
        
        // Focus search input
        const searchInput = document.getElementById('paletteSearch');
        if (searchInput) {
            searchInput.focus();
            searchInput.value = '';
        }
        
        // Reset selection
        this.selectedIndex = -1;
        this.updateSelection();

        // Add palette-specific event handlers  
        this.removePaletteEventHandlers(); // Remove any existing handlers first
        
        // Use a small delay to ensure DOM is ready
        setTimeout(() => {
            this.addPaletteEventHandlers();
        }, 10);
    }

    hide() {
        if (!this.isVisible) return;
        
        const palette = document.getElementById('promptPalette');
        if (palette) {
            palette.style.display = 'none';
        }
        
        this.isVisible = false;
        this.selectedIndex = -1;
        
        // Remove palette-specific event handlers
        this.removePaletteEventHandlers();
    }

    addPaletteEventHandlers() {
        // Keyboard navigation
        this.keydownHandler = (e) => {
            if (!this.isVisible) return;
            
            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    this.hide();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.selectNext();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.selectPrevious();
                    break;
                case 'Enter':
                    e.preventDefault();
                    this.executeSelectedPrompt();
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    // Only execute if Ctrl or Cmd is held down
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.executePromptByNumber(parseInt(e.key));
                    }
                    break;
            }
        };

        // Search input handler
        this.searchHandler = (e) => {
            this.filterPrompts(e.target.value);
        };

        document.addEventListener('keydown', this.keydownHandler);
        
        const searchInput = document.getElementById('paletteSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.searchHandler);
        }
    }

    removePaletteEventHandlers() {
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
        
        const searchInput = document.getElementById('paletteSearch');
        if (searchInput && this.searchHandler) {
            searchInput.removeEventListener('input', this.searchHandler);
        }
    }

    renderPrompts(searchTerm = '') {
        const promptList = document.getElementById('palettePromptList');
        if (!promptList) return;

        promptList.innerHTML = '';

        if (this.filteredPrompts.length === 0) {
            promptList.innerHTML = '<div class="palette-no-results">No prompts found</div>';
            return;
        }

        this.filteredPrompts.forEach((prompt, index) => {
            const promptElement = document.createElement('div');
            promptElement.className = 'palette-prompt-item';
            promptElement.dataset.index = index;
            
            // Create shortcut indicator for first 9 prompts
            const shortcutHtml = index < 9 ? 
                `<span class="palette-shortcut">${index + 1}</span>` : '';
            
            // Add enabled/disabled styling
            if (!prompt.enabled) {
                promptElement.classList.add('disabled');
            }
            
            // Create enabled/disabled indicator
            const statusHtml = prompt.enabled ? 
                '<span class="palette-status enabled" title="Enabled for auto-analysis">●</span>' : 
                '<span class="palette-status disabled" title="Disabled for auto-analysis">○</span>';
            
            const highlightedName = this.highlightMatch(prompt.name, searchTerm);
            const previewData = this.getPromptPreviewWithHighlight(prompt.prompt, searchTerm);
            
            promptElement.innerHTML = `
                ${shortcutHtml}
                <div class="palette-prompt-content">
                    <div class="palette-prompt-name">${highlightedName} ${statusHtml}</div>
                    <div class="palette-prompt-preview">${previewData}</div>
                </div>
            `;
            
            // Click handler
            promptElement.addEventListener('click', () => {
                this.executePrompt(prompt);
            });
            
            promptList.appendChild(promptElement);
        });
    }

    filterPrompts(searchTerm) {
        const allPrompts = this.promptsManager.getAllPrompts();
        const term = searchTerm.toLowerCase().trim();
        
        if (!term) {
            this.filteredPrompts = allPrompts;
        } else {
            this.filteredPrompts = allPrompts.filter(prompt => 
                prompt.name.toLowerCase().includes(term) ||
                prompt.prompt.toLowerCase().includes(term)
            );
        }
        
        this.selectedIndex = -1;
        this.renderPrompts(searchTerm);
        this.updateSelection();
    }

    selectNext() {
        if (this.filteredPrompts.length === 0) return;
        
        this.selectedIndex = (this.selectedIndex + 1) % this.filteredPrompts.length;
        this.updateSelection();
    }

    selectPrevious() {
        if (this.filteredPrompts.length === 0) return;
        
        this.selectedIndex = this.selectedIndex <= 0 ? 
            this.filteredPrompts.length - 1 : this.selectedIndex - 1;
        this.updateSelection();
    }

    updateSelection() {
        const promptItems = document.querySelectorAll('.palette-prompt-item');
        promptItems.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
    }

    executeSelectedPrompt() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.filteredPrompts.length) {
            const selectedPrompt = this.filteredPrompts[this.selectedIndex];
            this.executePrompt(selectedPrompt);
        }
    }

    executePromptByNumber(number) {
        // Number keys are 1-9, but array indices are 0-8
        const index = number - 1;
        if (index >= 0 && index < this.filteredPrompts.length && index < 9) {
            const prompt = this.filteredPrompts[index];
            this.executePrompt(prompt);
        }
    }

    async executePrompt(prompt) {
        this.hide();
        
        // Get current text from editor
        const currentText = this.editorManager ? this.editorManager.getValue() : '';
        
        if (!currentText.trim()) {
            this.showNotification('No text to analyze', 'warning');
            return;
        }

        try {
            // Show loading notification
            this.showNotification(`Executing "${prompt.name}"...`, 'info');
            
            // Switch to feedback tab to show results
            this.switchToFeedbackTab();
            
            // Execute the prompt using AIService
            const result = await this.aiService.getPromptFeedback(
                currentText, 
                prompt.name, 
                prompt.prompt, 
                window.app?.textAnalysisManager, 
                prompt
            );
            
            // Display result in feedback container
            this.displayPromptResult(result);
            
            this.showNotification(`"${prompt.name}" executed successfully`, 'success');
            
        } catch (error) {
            console.error('Error executing prompt:', error);
            this.showNotification(`Error executing "${prompt.name}": ${error.message}`, 'error');
        }
    }

    displayPromptResult(result) {
        const feedbackContainer = document.getElementById('feedbackContainer');
        if (!feedbackContainer) return;

        // Remove initial placeholder if it exists
        const initialPlaceholder = document.getElementById('initialPlaceholder');
        if (initialPlaceholder) {
            initialPlaceholder.remove();
        }

        // Create a new feedback item
        const resultElement = document.createElement('div');
        resultElement.innerHTML = result.htmlContent;
        
        // Insert at the top of feedback container
        feedbackContainer.insertBefore(resultElement.firstElementChild, feedbackContainer.firstChild);
    }

    switchToFeedbackTab() {
        // Switch to feedback tab in AI sidebar
        const feedbackTab = document.getElementById('feedbackTab');
        if (feedbackTab) {
            feedbackTab.click();
        }
        
        // Ensure AI sidebar is visible on mobile
        if (window.app?.uiManager) {
            window.app.uiManager.showAISidebar();
        }
    }

    showNotification(message, type = 'info') {
        // Use existing notification system if available
        if (window.app?.notificationManager) {
            window.app.notificationManager.show(message, type);
        } else {
            // Fallback to console
            console.log(`[${type}] ${message}`);
        }
    }

    showNoPromptsMessage() {
        const palette = document.getElementById('promptPalette');
        if (!palette) return;

        // Show palette with no prompts message
        palette.style.display = 'block';
        this.isVisible = true;
        
        const promptList = document.getElementById('palettePromptList');
        if (promptList) {
            promptList.innerHTML = `
                <div class="palette-no-prompts">
                    <p>No prompts found.</p>
                    <p>Go to the Prompts tab to create prompts.</p>
                </div>
            `;
        }
        
        // Hide search input
        const searchInput = document.getElementById('paletteSearch');
        if (searchInput) {
            searchInput.style.display = 'none';
        }
    }

    getPromptPreview(promptText) {
        // Get first line or first 60 characters as preview
        const firstLine = promptText.split('\n')[0];
        const preview = firstLine.length > 60 ? firstLine.slice(0, 60) + '...' : firstLine;
        return this.escapeHTML(preview);
    }

    highlightMatch(text, searchTerm) {
        if (!searchTerm || !text) {
            return this.escapeHTML(text);
        }

        const escapedText = this.escapeHTML(text);
        const term = searchTerm.toLowerCase().trim();
        
        if (!term) {
            return escapedText;
        }

        // Create a case-insensitive regex for highlighting
        const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
        return escapedText.replace(regex, '<mark class="palette-highlight">$1</mark>');
    }

    getPromptPreviewWithHighlight(promptText, searchTerm) {
        if (!searchTerm || !promptText) {
            return this.getPromptPreview(promptText);
        }

        const term = searchTerm.toLowerCase().trim();
        
        if (!term) {
            return this.getPromptPreview(promptText);
        }

        // Check if the search term matches the name - if so, show normal preview
        // This is handled in the calling code, so we can focus on content matching here
        
        // If search term is in the prompt content, find the best matching section to show
        const lowerPromptText = promptText.toLowerCase();
        const matchIndex = lowerPromptText.indexOf(term);
        
        if (matchIndex === -1) {
            // No match in content, show normal preview
            return this.getPromptPreview(promptText);
        }

        // Find a good section around the match to display
        const contextBefore = 30;
        const contextAfter = 30;
        
        let startIndex = Math.max(0, matchIndex - contextBefore);
        let endIndex = Math.min(promptText.length, matchIndex + term.length + contextAfter);
        
        // Try to start at word boundary if possible
        if (startIndex > 0) {
            const spaceIndex = promptText.lastIndexOf(' ', startIndex + 10);
            if (spaceIndex > startIndex - 10 && spaceIndex !== -1) {
                startIndex = spaceIndex + 1;
            }
        }

        // Try to end at word boundary if possible
        if (endIndex < promptText.length) {
            const spaceIndex = promptText.indexOf(' ', endIndex - 10);
            if (spaceIndex < endIndex + 10 && spaceIndex !== -1) {
                endIndex = spaceIndex;
            }
        }

        let preview = promptText.slice(startIndex, endIndex);
        
        // Add ellipsis if we're not at the start/end
        if (startIndex > 0) preview = '...' + preview;
        if (endIndex < promptText.length) preview = preview + '...';
        
        // Highlight the match in the preview
        return this.highlightMatch(preview, searchTerm);
    }

    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Method to be called by main app for button trigger
    showPalette() {
        this.show();
    }
}