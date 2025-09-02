class ContextMenuManager {
    constructor(editorManager, aiService) {
        this.editorManager = editorManager;
        this.aiService = aiService;
        this.contextMenu = null;
        this.isMenuOpen = false;
        this.cursorPosition = null;
        this.selectedText = '';
        this.menuOptions = [
            {
                id: 'custom',
                label: 'Custom',
                icon: '✨',
                prompt: 'Write your own prompt:'
            },
            {
                id: 'rephrase',
                label: 'Rephrase',
                icon: '🔄',
                prompt: 'Rephrase the following text to improve clarity while maintaining the same meaning:'
            },
            {
                id: 'shorten',
                label: 'Shorten',
                icon: '📝',
                prompt: 'Make the following text more concise while preserving its key meaning:'
            },
            {
                id: 'elaborate',
                label: 'Elaborate',
                icon: '📖',
                prompt: 'Expand on the following text with more details and explanations:'
            },
            {
                id: 'formal',
                label: 'More formal',
                icon: '🎩',
                prompt: 'Rewrite the following text to sound more formal and professional:'
            },
            {
                id: 'casual',
                label: 'More casual',
                icon: '😊',
                prompt: 'Rewrite the following text to sound more casual and conversational:'
            },
            {
                id: 'bulletize',
                label: 'Bulletize',
                icon: '•',
                prompt: 'Convert the following text into a bulleted list format:'
            },
            {
                id: 'summarize',
                label: 'Summarize',
                icon: '📋',
                prompt: 'Summarize the key points of the following text:'
            }
        ];
        
        this.initializeContextMenu();
        this.setupEventListeners();
        this.setupCustomPromptModal();
    }

    initializeContextMenu() {
        this.createContextMenuElement();
    }

    createContextMenuElement() {
        this.contextMenu = document.createElement('div');
        this.contextMenu.id = 'aiContextMenu';
        this.contextMenu.className = 'ai-context-menu hidden';
        
        const menuContent = this.menuOptions.map(option => `
            <div class="context-menu-item" data-option="${option.id}">
                <span class="menu-icon">${option.icon}</span>
                <span class="menu-label">${option.label}</span>
            </div>
        `).join('');
        
        this.contextMenu.innerHTML = menuContent;
        document.body.appendChild(this.contextMenu);
    }

    setupCustomPromptModal() {
        // Get modal elements
        this.customPromptModal = document.getElementById('customPromptModal');
        this.customPromptText = document.getElementById('customPromptText');
        this.submitCustomPromptBtn = document.getElementById('submitCustomPromptBtn');
        this.cancelCustomPromptBtn = document.getElementById('cancelCustomPromptBtn');
        this.closeCustomPromptModal = document.getElementById('closeCustomPromptModal');
        
        if (!this.customPromptModal) {
            console.warn('Custom prompt modal not found in DOM');
            return;
        }
        
        // Setup modal event listeners
        this.submitCustomPromptBtn.addEventListener('click', () => {
            this.handleCustomPromptSubmit();
        });
        
        this.cancelCustomPromptBtn.addEventListener('click', () => {
            this.hideCustomPromptModal();
        });
        
        this.closeCustomPromptModal.addEventListener('click', () => {
            this.hideCustomPromptModal();
        });
        
        // Handle Enter key in textarea
        this.customPromptText.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.handleCustomPromptSubmit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.hideCustomPromptModal();
            }
        });
        
        // Close modal when clicking on overlay
        this.customPromptModal.addEventListener('click', (e) => {
            if (e.target === this.customPromptModal) {
                this.hideCustomPromptModal();
            }
        });
    }

    setupEventListeners() {
        if (!this.editorManager?.editor) return;

        const editor = this.editorManager.editor;
        
        // Listen for cursor activity and text selection with debouncing
        editor.on('cursorActivity', (cm) => {
            // Debounce cursor activity to avoid too many updates
            clearTimeout(this.cursorActivityTimeout);
            this.cursorActivityTimeout = setTimeout(() => {
                this.handleCursorActivity(cm);
            }, 100);
        });

        // Handle editor blur with more careful timing
        editor.on('blur', () => {
            this.blurTimeout = setTimeout(() => {
                // Only hide if we're not interacting with context menu elements
                const activeElement = document.activeElement;
                const isContextMenuElement = activeElement?.closest('.magic-wand, .ai-context-menu');
                
                if (!this.isMenuOpen && !isContextMenuElement) {
                    this.hideContextMenu();
                    this.hideMagicWand();
                }
            }, 200);
        });

        // Clear blur timeout if editor gets focus again
        editor.on('focus', () => {
            if (this.blurTimeout) {
                clearTimeout(this.blurTimeout);
                this.blurTimeout = null;
            }
        });

        // Handle context menu clicks with better event handling
        this.contextMenu.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const menuItem = e.target.closest('.context-menu-item');
            if (menuItem) {
                const optionId = menuItem.dataset.option;
                this.handleMenuOption(optionId);
            }
        });

        // Prevent context menu from losing focus immediately
        this.contextMenu.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent focus loss from editor
        });

        // Store event handler references for cleanup
        this.documentClickHandler = (e) => {
            // Don't hide if clicking on magic wand or context menu
            if (this.contextMenu.contains(e.target) || e.target.closest('.magic-wand')) {
                return;
            }
            
            // Add a small delay to prevent race conditions
            setTimeout(() => {
                if (this.isMenuOpen) {
                    this.hideContextMenu();
                }
            }, 50);
        };
        
        this.keydownHandler = (e) => {
            if (e.key === 'Escape' && this.isMenuOpen) {
                e.preventDefault();
                this.hideContextMenu();
            }
        };
        
        // Use capture phase to handle clicks before other elements
        document.addEventListener('click', this.documentClickHandler, true);
        document.addEventListener('keydown', this.keydownHandler);
    }

    handleCursorActivity(cm) {
        if (this.isMenuOpen) return;

        const selection = cm.getSelection();
        const cursor = cm.getCursor();
        
        if (selection && selection.trim().length > 0) {
            // Text is selected - show magic wand
            this.selectedText = selection;
            this.cursorPosition = cursor;
            this.showMagicWand(cm, cursor);
        } else {
            // No selection - hide magic wand
            this.hideMagicWand();
        }
    }

    showMagicWand(cm, cursor) {
        this.hideMagicWand(); // Remove any existing wand
        
        const coords = cm.cursorCoords(cursor, 'local');
        const editorRect = cm.getWrapperElement().getBoundingClientRect();
        
        const wand = document.createElement('div');
        wand.className = 'magic-wand';
        wand.innerHTML = '🪄';
        wand.title = 'AI context menu';
        
        // Position the wand near the cursor
        wand.style.position = 'absolute';
        wand.style.left = (editorRect.left + coords.left + 15) + 'px';
        wand.style.top = (editorRect.top + coords.top - 5) + 'px';
        wand.style.zIndex = '1000';
        wand.style.cursor = 'pointer';
        wand.style.fontSize = '16px';
        wand.style.background = '#fff';
        wand.style.border = '1px solid #ccc';
        wand.style.borderRadius = '4px';
        wand.style.padding = '2px 4px';
        wand.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        wand.style.userSelect = 'none';
        
        wand.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showContextMenu(e.pageX, e.pageY);
        });
        
        // Prevent wand from disappearing when clicked
        wand.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.body.appendChild(wand);
    }

    hideMagicWand() {
        const existingWand = document.querySelector('.magic-wand');
        if (existingWand) {
            existingWand.remove();
        }
    }

    showContextMenu(x, y) {
        if (!this.selectedText.trim()) return;
        
        // Clear any existing timeouts that might hide the menu
        if (this.blurTimeout) {
            clearTimeout(this.blurTimeout);
            this.blurTimeout = null;
        }
        
        this.contextMenu.classList.remove('hidden');
        this.isMenuOpen = true;
        
        // Position the menu initially
        this.contextMenu.style.left = x + 'px';
        this.contextMenu.style.top = y + 'px';
        
        // Force a reflow to get accurate dimensions
        this.contextMenu.offsetHeight;
        
        // Adjust position if menu would go off-screen
        const rect = this.contextMenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let adjustedX = x;
        let adjustedY = y;
        
        if (rect.right > viewportWidth) {
            adjustedX = x - rect.width;
        }
        
        if (rect.bottom > viewportHeight) {
            adjustedY = y - rect.height;
        }
        
        // Apply adjusted positions
        this.contextMenu.style.left = Math.max(10, adjustedX) + 'px';
        this.contextMenu.style.top = Math.max(10, adjustedY) + 'px';
        
        // Hide the magic wand after showing menu
        setTimeout(() => this.hideMagicWand(), 10);
    }

    hideContextMenu() {
        if (!this.isMenuOpen) return;
        
        this.contextMenu.classList.add('hidden');
        this.isMenuOpen = false;
        
        // Clear any pending timeouts
        if (this.blurTimeout) {
            clearTimeout(this.blurTimeout);
            this.blurTimeout = null;
        }
    }

    async handleMenuOption(optionId) {
        const option = this.menuOptions.find(opt => opt.id === optionId);
        if (!option || !this.selectedText.trim()) return;
        
        // Check if AI service is available
        if (!this.aiService) {
            if (window.app?.notificationManager) {
                window.app.notificationManager.error('AI service not available');
            }
            return;
        }
        
        let prompt = option.prompt;
        
        // Handle custom option
        if (optionId === 'custom') {
            this.showCustomPromptModal();
            return;
        }
        
        this.hideContextMenu();
        
        try {
            // Show loading state
            this.showLoadingState();
            
            // Get the full prompt with the selected text
            const fullPrompt = `${prompt}\n\n"${this.selectedText}"\n\nRespond with only the improved text, no explanations or markdown formatting.`;
            
            // Call the AI service
            const result = await this.aiService.getPromptFeedback(
                this.selectedText,
                `AI Context - ${option.label}`,
                fullPrompt,
                null,
                null
            );
            
            if (result && result.htmlContent) {
                // Extract the improved text from the HTML response
                const improvedText = this.extractTextFromHTML(result.htmlContent);
                
                if (improvedText && improvedText.trim()) {
                    // Replace the selected text with the improved version
                    this.replaceSelectedText(improvedText.trim());
                    
                    // Show success notification
                    if (window.app?.notificationManager) {
                        window.app.notificationManager.success(`Text ${option.label.toLowerCase()}ed successfully`);
                    }
                } else {
                    throw new Error('No improved text received from AI');
                }
            } else {
                throw new Error('Invalid response from AI service');
            }
            
        } catch (error) {
            console.error('Error processing AI context menu option:', error);
            
            // Show error notification
            if (window.app?.notificationManager) {
                window.app.notificationManager.error(`Failed to ${option.label.toLowerCase()} text. Please try again.`);
            }
        } finally {
            this.hideLoadingState();
        }
    }

    extractTextFromHTML(htmlContent) {
        if (!htmlContent) return '';
        
        // Create a temporary div to parse the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // Try to find the actual content within the analysis-content div
        const analysisContent = tempDiv.querySelector('.analysis-content');
        if (analysisContent) {
            // Get text content, preserving line breaks
            return analysisContent.innerText || analysisContent.textContent || '';
        }
        
        // Fallback: extract all text content
        return tempDiv.innerText || tempDiv.textContent || '';
    }

    replaceSelectedText(newText) {
        if (!this.editorManager?.editor || !newText) return;
        
        const editor = this.editorManager.editor;
        
        // Replace the current selection with the new text
        editor.replaceSelection(newText);
        
        // Focus back on the editor
        editor.focus();
    }

    showLoadingState() {
        // Show a loading indicator in the editor or notification
        if (window.app?.notificationManager) {
            window.app.notificationManager.info('Processing text with AI...');
        }
    }

    hideLoadingState() {
        // This could clear a specific loading indicator if needed
        // For now, the notification system will auto-hide success/error messages
    }

    showCustomPromptModal() {
        if (!this.customPromptModal) return;
        
        // Clear previous input
        this.customPromptText.value = '';
        
        // Show modal
        this.customPromptModal.style.display = 'flex';
        
        // Focus on textarea
        setTimeout(() => {
            this.customPromptText.focus();
        }, 100);
    }

    hideCustomPromptModal() {
        if (!this.customPromptModal) return;
        
        this.customPromptModal.style.display = 'none';
        this.customPromptText.value = '';
    }

    async handleCustomPromptSubmit() {
        const customPrompt = this.customPromptText.value.trim();
        if (!customPrompt) {
            if (window.app?.notificationManager) {
                window.app.notificationManager.error('Please enter a prompt');
            }
            return;
        }

        // Hide the modal
        this.hideCustomPromptModal();
        
        // Hide the context menu
        this.hideContextMenu();

        try {
            // Show loading state
            this.showLoadingState();
            
            // Get the full prompt with the selected text
            const fullPrompt = `${customPrompt}\n\n"${this.selectedText}"\n\nRespond with only the improved text, no explanations or markdown formatting.`;
            
            // Call the AI service
            const result = await this.aiService.getPromptFeedback(
                this.selectedText,
                'AI Context - Custom',
                fullPrompt,
                null,
                null
            );
            
            if (result && result.htmlContent) {
                // Extract the improved text from the HTML response
                const improvedText = this.extractTextFromHTML(result.htmlContent);
                
                if (improvedText && improvedText.trim()) {
                    // Replace the selected text with the improved version
                    this.replaceSelectedText(improvedText.trim());
                    
                    // Show success notification
                    if (window.app?.notificationManager) {
                        window.app.notificationManager.success('Text processed successfully with custom prompt');
                    }
                } else {
                    throw new Error('No improved text received from AI');
                }
            } else {
                throw new Error('Invalid response from AI service');
            }
            
        } catch (error) {
            console.error('Error processing custom AI prompt:', error);
            
            // Show error notification
            if (window.app?.notificationManager) {
                window.app.notificationManager.error('Failed to process text with custom prompt. Please try again.');
            }
        } finally {
            this.hideLoadingState();
        }
    }

    destroy() {
        // Clear all timeouts
        if (this.cursorActivityTimeout) {
            clearTimeout(this.cursorActivityTimeout);
        }
        if (this.blurTimeout) {
            clearTimeout(this.blurTimeout);
        }
        
        // Remove event listeners
        if (this.documentClickHandler) {
            document.removeEventListener('click', this.documentClickHandler, true);
        }
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler);
        }
        
        // Clean up DOM elements
        if (this.contextMenu) {
            this.contextMenu.remove();
            this.contextMenu = null;
        }
        
        this.hideMagicWand();
        this.isMenuOpen = false;
        
        // Hide custom prompt modal if open
        this.hideCustomPromptModal();
        
        // Reset state
        this.selectedText = '';
        this.cursorPosition = null;
    }
}