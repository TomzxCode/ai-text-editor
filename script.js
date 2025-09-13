class AITextEditor {
    constructor() {
        this.fileSystemManager = new FileSystemManager();
        this.notificationManager = new NotificationManager();

        // Session-only auto-refresh state (promptId -> boolean)
        this.autoRefreshState = new Map();

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
            wordCountSpan: document.getElementById('wordCount'),
            sentenceCountSpan: document.getElementById('sentenceCount'),
            paragraphCountSpan: document.getElementById('paragraphCount'),
            costDisplaySpan: document.getElementById('costDisplay'),
            callsCountSpan: document.getElementById('callsCount'),
            inputTokensSpan: document.getElementById('inputTokens'),
            outputTokensSpan: document.getElementById('outputTokens'),
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
            leftResize: document.getElementById('leftResize'),
            rightResize: document.getElementById('rightResize'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            feedbackContainer: document.querySelector('.feedback-container'),
            addPromptBtn: document.getElementById('addPromptBtn'),
            toggleAllPromptsBtn: document.getElementById('toggleAllPromptsBtn'),
            promptsList: document.getElementById('promptsList'),
            promptModal: document.getElementById('promptModal'),
            promptModalTitle: document.getElementById('promptModalTitle'),
            promptName: document.getElementById('promptName'),
            promptText: document.getElementById('promptText'),
            promptActionType: document.getElementById('promptActionType'),
            promptTriggerTiming: document.getElementById('promptTriggerTiming'),
            promptCustomDelay: document.getElementById('promptCustomDelay'),
            customDelayGroup: document.getElementById('customDelayGroup'),
            promptKeyboardShortcut: document.getElementById('promptKeyboardShortcut'),
            keyboardShortcutGroup: document.getElementById('keyboardShortcutGroup'),
            providersList: document.getElementById('providersList'),
            addProviderBtn: document.getElementById('addProviderBtn'),
            promptEnabled: document.getElementById('promptEnabled'),
            savePromptBtn: document.getElementById('savePromptBtn'),
            cancelPromptBtn: document.getElementById('cancelPromptBtn'),
            closePromptModal: document.getElementById('closePromptModal'),
            promptPaletteBtn: document.getElementById('promptPaletteBtn'),
            // Group management elements
            activeGroupSelect: document.getElementById('activeGroupSelect'),
            promptsSectionTitle: document.getElementById('promptsSectionTitle'),
            addGroupBtn: document.getElementById('addGroupBtn'),
            editGroupBtn: document.getElementById('editGroupBtn'),
            deleteGroupBtn: document.getElementById('deleteGroupBtn'),
            groupModal: document.getElementById('groupModal'),
            groupModalTitle: document.getElementById('groupModalTitle'),
            groupName: document.getElementById('groupName'),
            groupPromptsFilter: document.getElementById('groupPromptsFilter'),
            groupPromptsList: document.getElementById('groupPromptsList'),
            groupSetActive: document.getElementById('groupSetActive'),
            saveGroupBtn: document.getElementById('saveGroupBtn'),
            cancelGroupBtn: document.getElementById('cancelGroupBtn'),
            closeGroupModal: document.getElementById('closeGroupModal')
        };
    }

    initializeManagers() {
        this.sessionManager = new SessionManager();
        this.settingsManager = new SettingsManager();
        this.themeManager = new ThemeManager(this.settingsManager);
        this.textAnalysisManager = new TextAnalysisManager();
        this.customVariablesManager = new CustomVariablesManager();

        this.editorManager = new EditorManager(this.elements.textEditor, (event, data) => {
            this.handleEditorEvent(event, data);
        }, this.settingsManager);

        this.uiManager = new UIManager(this.elements);
        this.aiService = new AIService();
        this.contextMenuManager = new ContextMenuManager(this.editorManager, this.aiService);
        this.promptsManager = new PromptsManager();
        this.promptPaletteManager = new PromptPaletteManager(this.promptsManager, this.aiService, this.editorManager);
        this.usageTracker = new UsageTracker();
        this.historyManager = new HistoryManager();
        this.inspectManager = new InspectManager();
        this.importExportManager = new ImportExportManager();

        // Connect custom variables manager to other managers
        this.promptsManager.setCustomVariablesManager(this.customVariablesManager);
        this.settingsManager.setCustomVariablesManager(this.customVariablesManager);

        // Create default variables if none exist
        this.customVariablesManager.createDefaultVariables();

        // Initialize provider management
        this.initializeProviderManagement();

        this.currentEditingPromptId = null;
        this.currentEditingGroupId = null;
        this.renderGroups();
        this.renderPrompts();

        // Setup text analysis callbacks
        this.setupTextAnalysisCallbacks();

        // Initialize text statistics display
        this.updateTextStatisticsDisplay();

        // Setup settings UI after DOM is ready
        setTimeout(async () => {
            this.settingsManager.setupUI();
            await this.usageTracker.initialize();
            await this.historyManager.initialize();
            await this.importExportManager.initialize();
            this.setupImportExportUI();
        }, 0);
    }

    initializeProviderManagement() {
        // Add event listener for add provider button
        this.elements.addProviderBtn.addEventListener('click', () => {
            this.addProviderRow();
        });

        // Initialize with empty state
        this.currentProviders = [];
        this.updateProvidersDisplay();
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

        this.elements.promptPaletteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.promptPaletteManager.showPalette();
        });

        this.elements.addPromptBtn.addEventListener('click', () => {
            this.showPromptModal();
        });

        this.elements.toggleAllPromptsBtn.addEventListener('click', () => {
            this.toggleAllPrompts();
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

        // Group management event listeners
        this.elements.activeGroupSelect.addEventListener('change', (e) => {
            this.switchActiveGroup(e.target.value);
        });

        this.elements.addGroupBtn.addEventListener('click', () => {
            this.showGroupModal();
        });

        this.elements.editGroupBtn.addEventListener('click', () => {
            const activeGroup = this.promptsManager.getActiveGroup();
            if (activeGroup) {
                this.showGroupModal(activeGroup.id);
            }
        });

        this.elements.deleteGroupBtn.addEventListener('click', () => {
            const activeGroup = this.promptsManager.getActiveGroup();
            if (activeGroup) {
                this.deleteGroup(activeGroup.id);
            }
        });

        this.elements.saveGroupBtn.addEventListener('click', () => {
            this.saveGroup();
        });

        this.elements.cancelGroupBtn.addEventListener('click', () => {
            this.hideGroupModal();
        });

        this.elements.closeGroupModal.addEventListener('click', () => {
            this.hideGroupModal();
        });

        // Filter prompts in group modal
        this.elements.groupPromptsFilter.addEventListener('input', (e) => {
            this.filterGroupPrompts(e.target.value);
        });

        this.elements.promptTriggerTiming.addEventListener('change', () => {
            this.toggleCustomDelayField();
        });

        // Keyboard shortcut capture
        this.elements.promptKeyboardShortcut.addEventListener('keydown', (e) => {
            e.preventDefault();
            this.captureKeyboardShortcut(e);
        });

        this.elements.promptKeyboardShortcut.addEventListener('focus', () => {
            this.elements.promptKeyboardShortcut.placeholder = 'Press key combination...';
        });

        this.elements.promptKeyboardShortcut.addEventListener('blur', () => {
            this.elements.promptKeyboardShortcut.placeholder = 'e.g., Ctrl+Shift+A, Alt+P, F5';
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

        // Global keyboard shortcut listener
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeyboardShortcut(e);
        });
    }

    setupTextAnalysisCallbacks() {
        // Setup word completion callback
        this.textAnalysisManager.onWordCompletion((data) => {
            this.handleTriggerTimingEvent('word', data);
        });

        // Setup sentence completion callback
        this.textAnalysisManager.onSentenceCompletion((data) => {
            this.handleTriggerTimingEvent('sentence', data);
        });

        // Setup paragraph completion callback
        this.textAnalysisManager.onParagraphCompletion((data) => {
            this.handleTriggerTimingEvent('paragraph', data);
        });

        // Setup structure change callback for inspect manager
        this.textAnalysisManager.onStructureChange((structure) => {
            if (this.inspectManager) {
                this.inspectManager.updateStructure(structure);
            }
        });

        // Start tracking when editor is ready
        this.textAnalysisManager.startTracking();
    }

    handleTriggerTimingEvent(triggerType, triggerData = null) {
        const currentText = this.editorManager.getValue();
        const enabledPrompts = this.promptsManager.getEnabledPromptsByTrigger(triggerType);

        if (enabledPrompts.length === 0) return;

        const settings = this.settingsManager.getAllSettings();
        if (!settings.enableAIFeedback) return;

        // Prepare trigger data for association
        const triggerInfo = triggerData ? {
            type: triggerType,
            contentId: triggerData.contentId,
            content: triggerData.completedWord || triggerData.completedSentence || triggerData.completedParagraph,
            position: triggerData.position,
            timestamp: triggerData.timestamp
        } : null;

        // Schedule individual feedback for each prompt that matches this trigger type and has auto-refresh enabled for this session
        enabledPrompts.filter(prompt => this.isAutoRefreshEnabled(prompt.id)).forEach(prompt => {
            this.aiService.schedulePromptFeedback(
                prompt.id,
                (promptId) => this.generateIndividualPromptFeedback(promptId, currentText, triggerInfo),
                triggerType,
                currentText,
                prompt.customDelay
            );
        });
    }

    generateIndividualPromptFeedback(promptId, content, triggerInfo = null) {
        const prompt = this.promptsManager.getPrompt(promptId);
        if (!prompt || !this.promptsManager.isPromptEnabledInActiveGroup(promptId)) return;

        const settings = this.settingsManager.getAllSettings();

        this.aiService.generateIndividualPromptFeedback(
            content,
            promptId,
            prompt,
            (isLoading) => {
                // Individual prompts don't need the main loading overlay
            },
            (data) => {
                // Handle individual prompt completion
                if (data.isIndividualPrompt) {
                    // Individual prompt feedback is already handled by the AIService
                    // Just ensure any existing delay-triggered feedback doesn't override it
                }
                // Update cost display after individual prompt feedback is generated
                this.updateTextStatisticsDisplay();
            },
            (error) => {
                console.error('Error generating individual prompt feedback:', error);
            },
            settings,
            triggerInfo
        );
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
                this.handleTextInput();
                break;
            case 'contentChange':
                this.updateFileTitle(data.fileName, data.isModified);
                break;
            case 'fileLoaded':
                this.updateFileTitle(data.fileName, data.isModified);
                // Reset text analysis for new file
                this.textAnalysisManager.reset();
                // Analyze the loaded content to initialize statistics
                const currentText = this.editorManager.getValue();
                this.textAnalysisManager.analyzeText(currentText);
                // Update statistics display for new file
                this.updateTextStatisticsDisplay();
                break;
        }
    }

    updateFileTitle(fileName, isModified) {
        const title = fileName + (isModified ? ' *' : '');
        this.elements.currentFileSpan.textContent = title;
    }

    handleTextInput() {
        // Analyze text for word and sentence completion
        const currentText = this.editorManager.getValue();
        this.textAnalysisManager.analyzeText(currentText);

        // Update text statistics display
        this.updateTextStatisticsDisplay();

        // Schedule AI feedback as before
        this.scheduleAIFeedback();
    }

    getTextStatistics() {
        const currentText = this.editorManager.getValue();
        return this.textAnalysisManager.getStatistics(currentText);
    }

    updateTextStatisticsDisplay() {
        // Update text stats immediately to prevent flickering
        this.updateTextStats();

        // Update LLM stats asynchronously without blocking
        this.updateLLMStats().catch(console.error);
    }

    updateTextStats() {
        const stats = this.getTextStatistics();

        // Format word count
        const wordText = stats.wordCount === 1 ? '1 word' : `${stats.wordCount} words`;
        this.elements.wordCountSpan.textContent = wordText;

        // Format sentence count
        const sentenceText = stats.sentenceCount === 1 ? '1 sentence' : `${stats.sentenceCount} sentences`;
        this.elements.sentenceCountSpan.textContent = sentenceText;

        // Format paragraph count
        const paragraphText = stats.paragraphCount === 1 ? '1 paragraph' : `${stats.paragraphCount} paragraphs`;
        this.elements.paragraphCountSpan.textContent = paragraphText;
    }

    async updateLLMStats() {
        const llmStats = await this.getLLMStatistics();

        // Format cost
        const costText = `$${llmStats.cost.toFixed(2)}`;
        this.elements.costDisplaySpan.textContent = costText;

        // Format calls count
        const callsText = llmStats.totalCalls === 1 ? '1 call' : `${llmStats.totalCalls} calls`;
        this.elements.callsCountSpan.textContent = callsText;

        // Format input tokens (abbreviated)
        const inputText = `${this.formatTokenCount(llmStats.inputTokens)} in`;
        this.elements.inputTokensSpan.textContent = inputText;

        // Format output tokens (abbreviated)
        const outputText = `${this.formatTokenCount(llmStats.outputTokens)} out`;
        this.elements.outputTokensSpan.textContent = outputText;
    }

    async getLLMStatistics() {
        if (!this.aiService?.llmCallStorage || !this.sessionManager) {
            return {
                totalCalls: 0,
                inputTokens: 0,
                outputTokens: 0,
                cost: 0
            };
        }

        const currentSessionId = this.sessionManager.getCurrentSessionId();
        const usageStats = await this.aiService.llmCallStorage.getUsageStatisticsBySession(currentSessionId);
        let totalCost = 0;

        // Get session calls to calculate cost
        const sessionCalls = await this.aiService.llmCallStorage.getCallsBySession(currentSessionId);

        sessionCalls.forEach(call => {
            if (call.usage) {
                const promptTokens = call.usage.input_tokens || 0;
                const completionTokens = call.usage.output_tokens || 0;

                // Example pricing (approximate, varies by provider):
                // $0.0015 per 1K prompt tokens, $0.002 per 1K completion tokens
                const promptCost = (promptTokens / 1000) * 0.0015;
                const completionCost = (completionTokens / 1000) * 0.002;

                totalCost += promptCost + completionCost;
            }
        });

        return {
            totalCalls: usageStats.totalCalls || 0,
            inputTokens: usageStats.totalPromptTokens || 0,
            outputTokens: usageStats.totalCompletionTokens || 0,
            cost: totalCost
        };
    }

    formatTokenCount(tokens) {
        if (!tokens || tokens === 0) return '0';
        if (tokens < 1000) return tokens.toString();
        if (tokens < 1000000) return (tokens / 1000).toFixed(1) + 'k';
        return (tokens / 1000000).toFixed(1) + 'M';
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
            this.scheduleAIFeedback();

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

        this.editorManager.createNewFile('Untitled');
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
                let fileName = currentFile.name;

                if (fileName === 'Untitled') {
                    fileName = prompt('Enter file name:');
                    if (!fileName) return;

                    this.editorManager.updateCurrentFileName(fileName);
                }

                await this.fileSystemManager.createNewFile(fileName, content);
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




    scheduleAIFeedback() {
        // Check if AI feedback is enabled in settings
        const aiEnabled = this.settingsManager.getSetting('enableAIFeedback');

        if (!aiEnabled) {
            return;
        }

        // Handle custom delay prompts individually (all delay-based prompts are now custom)
        const currentText = this.editorManager.getValue();
        const customDelayPrompts = this.promptsManager.getEnabledPromptsByTrigger('custom');

        customDelayPrompts.filter(prompt => this.isAutoRefreshEnabled(prompt.id)).forEach(prompt => {
            this.aiService.schedulePromptFeedback(
                prompt.id,
                (promptId) => this.generateIndividualPromptFeedback(promptId, currentText),
                'custom',
                currentText,
                prompt.customDelay
            );
        });
    }

    generateAIFeedback(content) {
        // Allow AI feedback even without a current file, as long as there's content
        if (!content || content.trim().length === 0) {
            // Restore initial placeholder if no content
            this.uiManager.restoreInitialPlaceholder();
            return;
        }

        // This method is no longer needed since all delay-based prompts are now custom delays
        // and handled individually in scheduleAIFeedback
        const delayTriggeredPrompts = [];
        const settings = this.settingsManager.getAllSettings();

        this.aiService.generateFeedback(
            content,
            (show) => {}, // No longer needed since we use individual placeholders
            (feedback) => {
                this.uiManager.displayFeedback(feedback);
                // Update cost display after feedback is generated
                this.updateTextStatisticsDisplay();
            },
            (error) => this.uiManager.showFeedbackError(error),
            delayTriggeredPrompts,
            settings
        );
    }

    renderPrompts() {
        const prompts = this.promptsManager.getPromptsInActiveGroup();
        const activeGroup = this.promptsManager.getActiveGroup();
        const container = this.elements.promptsList;

        // Update section title to show active group
        if (activeGroup) {
            this.elements.promptsSectionTitle.textContent = `Prompts in "${activeGroup.name}"`;
        }

        if (prompts.length === 0) {
            container.innerHTML = '<p class="no-prompts">No prompts yet. Click + to add one.</p>';
            return;
        }

        // Sort prompts alphabetically by name
        const sortedPrompts = prompts.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

        container.innerHTML = sortedPrompts.map((prompt, index) => {
            const isEnabled = this.promptsManager.isPromptEnabledInActiveGroup(prompt.id);
            return `
            <div class="prompt-item ${!isEnabled ? 'disabled' : ''}"
                 data-id="${prompt.id}"
                 data-index="${index}"
                 draggable="true">
                <div class="prompt-header">
                    <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
                    <span class="prompt-name">${this.escapeHtml(prompt.name)}</span>
                    <div class="prompt-actions">
                        <button class="btn-icon" onclick="app.togglePrompt('${prompt.id}')" title="${isEnabled ? 'Disable' : 'Enable'}">
                            ${isEnabled ? '●' : '○'}
                        </button>
                        <button class="btn-icon" onclick="app.duplicatePrompt('${prompt.id}')" title="Duplicate">📄</button>
                        <button class="btn-icon" onclick="app.editPrompt('${prompt.id}')" title="Edit">✏️</button>
                        <button class="btn-icon danger" onclick="app.deletePrompt('${prompt.id}')" title="Delete">🗑️</button>
                    </div>
                </div>
                <div class="prompt-metadata">
                    <div class="prompt-action-type ${prompt.actionType === 'insert' ? 'action-insert' : prompt.actionType === 'replace' ? 'action-replace' : 'action-feedback'}">${this.formatActionType(prompt)}</div>
                    <div class="prompt-trigger">${this.formatTriggerType(prompt)}</div>
                </div>
                <div class="prompt-preview">${this.escapeHtml(prompt.prompt)}</div>
            </div>
            `;
        }).join('');

        // Add drag and drop event listeners
        this.setupDragAndDrop();

        // Update toggle all button appearance
        this.updateToggleAllButton();
    }

    updateToggleAllButton() {
        const toggleButton = this.elements.toggleAllPromptsBtn;
        const activeGroup = this.promptsManager.getActiveGroup();

        if (!toggleButton || !activeGroup || activeGroup.promptIds.length === 0) {
            // Hide button if no group or no prompts
            if (toggleButton) {
                toggleButton.style.display = 'none';
            }
            return;
        }

        toggleButton.style.display = 'flex';
        const allEnabled = this.promptsManager.areAllPromptsEnabledInActiveGroup();

        // Update button icon and title
        toggleButton.textContent = allEnabled ? '●' : '○';
        toggleButton.title = allEnabled ? 'Disable all prompts' : 'Enable all prompts';
    }

    showPromptModal(promptId = null) {
        this.currentEditingPromptId = promptId;

        if (promptId) {
            const prompt = this.promptsManager.getPrompt(promptId);
            if (prompt) {
                this.elements.promptModalTitle.textContent = 'Edit Prompt';
                this.elements.promptName.value = prompt.name;
                this.elements.promptText.value = prompt.prompt;
                this.elements.promptActionType.value = prompt.actionType || 'feedback';
                this.elements.promptTriggerTiming.value = prompt.triggerTiming || 'custom';
                this.elements.promptCustomDelay.value = prompt.customDelay || '1s';
                this.elements.promptKeyboardShortcut.value = prompt.keyboardShortcut || '';
                this.currentProviders = prompt.providers ? [...prompt.providers] : [];
                this.elements.promptEnabled.checked = this.promptsManager.isPromptEnabledInActiveGroup(prompt.id);
            }
        } else {
            this.elements.promptModalTitle.textContent = 'Add Prompt';
            this.elements.promptName.value = '';
            this.elements.promptText.value = '';
            this.elements.promptActionType.value = 'feedback';
            this.elements.promptTriggerTiming.value = 'custom';
            this.elements.promptCustomDelay.value = '1s';
            this.elements.promptKeyboardShortcut.value = '';
            this.currentProviders = [];
            this.elements.promptEnabled.checked = true;
        }

        this.elements.promptModal.style.display = 'flex';
        this.toggleCustomDelayField(); // Show/hide custom delay field based on selection
        this.updateProvidersDisplay(); // Populate provider list
        this.elements.promptName.focus();
    }

    toggleCustomDelayField() {
        const triggerTiming = this.elements.promptTriggerTiming.value;
        if (triggerTiming === 'custom') {
            this.elements.customDelayGroup.style.display = 'block';
            this.elements.keyboardShortcutGroup.style.display = 'none';
        } else if (triggerTiming === 'keyboard') {
            this.elements.customDelayGroup.style.display = 'none';
            this.elements.keyboardShortcutGroup.style.display = 'block';
        } else {
            this.elements.customDelayGroup.style.display = 'none';
            this.elements.keyboardShortcutGroup.style.display = 'none';
        }
    }

    captureKeyboardShortcut(event) {
        const modifiers = [];

        if (event.ctrlKey) modifiers.push('Ctrl');
        if (event.altKey) modifiers.push('Alt');
        if (event.shiftKey) modifiers.push('Shift');
        if (event.metaKey) modifiers.push('Meta');

        let key = event.key;

        // Handle special keys
        if (key === ' ') key = 'Space';
        if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
            return; // Don't capture modifier keys alone
        }

        // Build shortcut string
        const shortcut = [...modifiers, key].join('+');

        // Update input value
        this.elements.promptKeyboardShortcut.value = shortcut;
    }

    buildKeyboardShortcut(event) {
        const modifiers = [];

        if (event.ctrlKey) modifiers.push('Ctrl');
        if (event.altKey) modifiers.push('Alt');
        if (event.shiftKey) modifiers.push('Shift');
        if (event.metaKey) modifiers.push('Meta');

        let key = event.key;

        // Handle special keys
        if (key === ' ') key = 'Space';

        // Build shortcut string
        return [...modifiers, key].join('+');
    }

    handleGlobalKeyboardShortcut(event) {
        // Don't process shortcuts when typing in input fields or textareas, except for specific shortcuts
        const activeElement = document.activeElement;
        const isInputField = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable
        );

        // Skip if we're in the keyboard shortcut input field (let it capture the shortcut)
        if (activeElement === this.elements.promptKeyboardShortcut) {
            return;
        }

        // Allow some shortcuts even when in input fields (like Ctrl+S for save)
        const isSystemShortcut = (event.ctrlKey || event.metaKey) && ['s', 'z', 'y', 'x', 'c', 'v', 'a'].includes(event.key.toLowerCase());

        if (isInputField && !isSystemShortcut) {
            // Only process shortcuts with modifiers when in input fields
            if (!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
                return;
            }
        }

        const shortcut = this.buildKeyboardShortcut(event);
        const prompts = this.promptsManager.getPromptsByKeyboardShortcut(shortcut);

        if (prompts.length > 0) {
            event.preventDefault();
            event.stopPropagation();

            // Trigger all prompts with this shortcut
            this.triggerKeyboardShortcutPrompts(prompts, shortcut);
        }
    }

    async triggerKeyboardShortcutPrompts(prompts, shortcut) {
        try {
            const currentText = this.editorManager.getValue();
            if (!currentText.trim()) {
                this.notificationManager.error('No text to analyze');
                return;
            }

            if (prompts.length === 1) {
                this.notificationManager.success(`Triggered: ${prompts[0].name}`);
            } else {
                this.notificationManager.success(`Triggered ${prompts.length} prompts with shortcut ${shortcut}`);
            }

            // Execute all prompts in parallel
            const promises = prompts.map(async (prompt) => {
                try {
                    const result = await this.aiService.getPromptFeedback(
                        currentText,
                        `⌨️ ${prompt.name}`, // Add keyboard icon to indicate it was triggered by shortcut
                        prompt.prompt,
                        this.textAnalysisManager,
                        prompt // Pass the entire prompt config so AIService can use providers or fallback to llmService/llmModel
                    );
                    // Display the result in the AI sidebar using the existing system
                    this.insertFeedbackResult(result);
                } catch (error) {
                    console.error(`Error executing prompt "${prompt.name}":`, error);
                    this.notificationManager.error(`Failed to execute "${prompt.name}": ${error.message}`);
                }
            });

            // Wait for all prompts to complete
            await Promise.allSettled(promises);

        } catch (error) {
            console.error('Error triggering keyboard shortcut prompts:', error);
            this.notificationManager.error(`Failed to execute prompts: ${error.message}`);
        }
    }

    // Legacy method for single prompt (kept for compatibility)
    async triggerKeyboardShortcutPrompt(prompt) {
        await this.triggerKeyboardShortcutPrompts([prompt], prompt.keyboardShortcut);
    }

    insertFeedbackResult(result) {
        // Switch to feedback tab
        const feedbackTab = document.getElementById('feedbackTab');
        if (feedbackTab) {
            feedbackTab.click();
        }

        // Add feedback to the container using the existing system pattern
        const feedbackContainer = document.getElementById('feedbackContainer');
        if (feedbackContainer && result && result.htmlContent) {
            // Remove placeholder if present
            const placeholder = feedbackContainer.querySelector('.placeholder-message');
            if (placeholder) {
                placeholder.remove();
            }

            // Create a temporary container to parse the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = result.htmlContent;

            // Insert the parsed HTML at the top
            while (tempDiv.firstChild) {
                feedbackContainer.insertBefore(tempDiv.firstChild, feedbackContainer.firstChild);
            }

            // Scroll to top of feedback container
            feedbackContainer.scrollTop = 0;
        }
    }

    hidePromptModal() {
        this.elements.promptModal.style.display = 'none';
        this.currentEditingPromptId = null;
    }

    savePrompt() {
        const name = this.elements.promptName.value.trim();
        const prompt = this.elements.promptText.value.trim();
        const actionType = this.elements.promptActionType.value;
        const triggerTiming = this.elements.promptTriggerTiming.value;
        const customDelay = this.elements.promptCustomDelay.value.trim();
        const keyboardShortcut = this.elements.promptKeyboardShortcut.value.trim();
        const providers = this.currentProviders.filter(p => p.service && p.model);
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

        // Validate custom delay if selected
        if (triggerTiming === 'custom') {
            if (!customDelay) {
                this.notificationManager.error('Please enter a custom delay');
                this.elements.promptCustomDelay.focus();
                return;
            }

            const delayMs = this.parseDelayString(customDelay);
            if (delayMs === null) {
                this.notificationManager.error('Invalid delay format. Use format like "5s", "2m 30s", "1h"');
                this.elements.promptCustomDelay.focus();
                return;
            }
        }

        // Validate keyboard shortcut if selected
        if (triggerTiming === 'keyboard') {
            if (!keyboardShortcut) {
                this.notificationManager.error('Please set a keyboard shortcut');
                this.elements.promptKeyboardShortcut.focus();
                return;
            }
        }

        try {
            let promptId;

            if (this.currentEditingPromptId) {
                // Update existing prompt
                this.promptsManager.updatePrompt(this.currentEditingPromptId, {
                    name,
                    prompt,
                    actionType,
                    triggerTiming,
                    customDelay: triggerTiming === 'custom' ? customDelay : '',
                    keyboardShortcut: triggerTiming === 'keyboard' ? keyboardShortcut : '',
                    providers,
                    enabled
                });
                promptId = this.currentEditingPromptId;
                this.notificationManager.success('Prompt updated successfully');
            } else {
            	// Add new prompt (without global enabled state)
                const llmService = providers.length > 0 ? providers[0].service || '' : '';
                const llmModel = providers.length > 0 ? providers[0].model || '' : '';
                const customDelayValue = triggerTiming === 'custom' ? customDelay : '1s';
                const keyboardShortcutValue = triggerTiming === 'keyboard' ? keyboardShortcut : '';

                const newPrompt = this.promptsManager.addPrompt(
                    name,
                    prompt,
                    enabled,
                    triggerTiming,
                    customDelayValue,
                    keyboardShortcutValue,
                    llmService,
                    llmModel,
                    actionType,
                    providers
                );
                promptId = newPrompt.id;

                // Add the new prompt to the active group
                const activeGroup = this.promptsManager.getActiveGroup();
                if (activeGroup) {
                    this.promptsManager.addPromptToGroup(activeGroup.id, promptId);
                }

     			this.notificationManager.success('Prompt added successfully');
            }

            // Set the enabled state for this prompt in the active group
            const activeGroup = this.promptsManager.getActiveGroup();
            if (activeGroup) {
                this.promptsManager.setPromptEnabledInGroup(activeGroup.id, promptId, enabled);
            }

            this.renderPrompts();
            this.hidePromptModal();
        } catch (error) {
            this.notificationManager.error(error.message);
        }
    }

    addProviderRow(service = '', model = '') {
        const providerIndex = this.currentProviders.length;
        this.currentProviders.push({ service, model });
        this.updateProvidersDisplay();
    }

    removeProviderRow(index) {
        this.currentProviders.splice(index, 1);
        this.updateProvidersDisplay();
    }

    updateProvidersDisplay() {
        const container = this.elements.providersList;
        container.innerHTML = '';

        if (this.currentProviders.length === 0) {
            container.innerHTML = `
                <div class="empty-providers-message">
                    No providers selected. Global settings will be used.
                </div>
            `;
            return;
        }

        this.currentProviders.forEach((provider, index) => {
            const providerRow = document.createElement('div');
            providerRow.className = 'provider-item';

            const serviceId = `provider-service-${index}`;
            const modelId = `provider-model-${index}`;

            providerRow.innerHTML = `
                <div class="provider-selects">
                    <select id="${serviceId}" class="provider-service setting-select">
                        <option value="">Select service...</option>
                    </select>
                    <select id="${modelId}" class="provider-model setting-select">
                        <option value="">Select model...</option>
                    </select>
                </div>
                <button type="button" class="remove-provider-btn" onclick="window.app.removeProviderRow(${index})">×</button>
            `;

            container.appendChild(providerRow);

            // Initialize searchable dropdowns for this row
            const serviceDropdown = window.searchableDropdown.init(serviceId, {
                searchEnabled: true,
                searchPlaceholderValue: 'Search services...',
                placeholder: false
            });

            const modelDropdown = window.searchableDropdown.init(modelId, {
                searchEnabled: true,
                searchPlaceholderValue: 'Search models...',
                placeholder: false
            });

            // Populate service options
            const allServices = this.settingsManager.getAllServices();
            const serviceChoices = [
                { value: '', label: 'Select service...' },
                ...allServices.map(service => ({
                    value: service.value,
                    label: service.label
                }))
            ];
            window.searchableDropdown.setChoices(serviceId, serviceChoices);

            // Set current values if they exist
            if (provider.service) {
                window.searchableDropdown.setValue(serviceId, provider.service);
                this.updateProviderModels(index, provider.service, provider.model);
            }

            // Add change handler for service selection
            window.searchableDropdown.addEventListener(serviceId, 'change', (e) => {
                this.currentProviders[index].service = e.detail.value;
                this.currentProviders[index].model = ''; // Reset model when service changes
                this.updateProviderModels(index, e.detail.value);
            });

            // Add change handler for model selection
            window.searchableDropdown.addEventListener(modelId, 'change', (e) => {
                this.currentProviders[index].model = e.detail.value;
            });
        });
    }

    async updateProviderModels(providerIndex, service, selectedModel = '') {
        const modelId = `provider-model-${providerIndex}`;

        if (!service) {
            window.searchableDropdown.setChoices(modelId, [
                { value: '', label: 'Select model...' }
            ]);
            return;
        }

        // Show loading state
        window.searchableDropdown.disable(modelId);
        window.searchableDropdown.setChoices(modelId, [
            { value: '', label: 'Loading models...' }
        ]);

        try {
            const models = await this.aiService.fetchModels(service);

            const modelChoices = [
                { value: '', label: 'Select model...' },
                ...models.map(modelName => ({
                    value: modelName,
                    label: modelName
                }))
            ];

            window.searchableDropdown.setChoices(modelId, modelChoices);

            // Set selected model if provided
            if (selectedModel && models.includes(selectedModel)) {
                window.searchableDropdown.setValue(modelId, selectedModel);
            }

        } catch (error) {
            console.error('Error fetching models for provider:', error);
            window.searchableDropdown.setChoices(modelId, [
                { value: '', label: 'Error loading models' }
            ]);
        } finally {
            window.searchableDropdown.enable(modelId);
        }
    }

    parseDelayString(delayString) {
        if (!delayString) return null;

        // Parse format: Ad Bh Cm Ds (days, hours, minutes, seconds)
        const regex = /(?:(\d+)d)?\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?/i;
        const match = delayString.trim().match(regex);

        if (!match || match[0] === '') return null;

        const days = parseInt(match[1] || 0);
        const hours = parseInt(match[2] || 0);
        const minutes = parseInt(match[3] || 0);
        const seconds = parseInt(match[4] || 0);

        // Check if at least one unit was specified
        if (days === 0 && hours === 0 && minutes === 0 && seconds === 0) {
            return null;
        }

        // Convert to milliseconds
        const totalMs = (days * 24 * 60 * 60 * 1000) +
                       (hours * 60 * 60 * 1000) +
                       (minutes * 60 * 1000) +
                       (seconds * 1000);

        return totalMs > 0 ? totalMs : null;
    }

    editPrompt(promptId) {
        this.showPromptModal(promptId);
    }

    togglePrompt(promptId) {
        try {
            this.promptsManager.togglePrompt(promptId);
            this.renderPrompts();
            this.notificationManager.success('Prompt toggled successfully');
        } catch (error) {
            this.notificationManager.error(error.message);
        }
    }

    toggleAllPrompts() {
        try {
            const allEnabled = this.promptsManager.areAllPromptsEnabledInActiveGroup();
            this.promptsManager.toggleAllPromptsInActiveGroup();
            this.renderPrompts();
            this.notificationManager.success(allEnabled ? 'All prompts disabled' : 'All prompts enabled');
        } catch (error) {
            this.notificationManager.error(error.message);
        }
    }

    duplicatePrompt(promptId) {
        try {
            const duplicatedPrompt = this.promptsManager.duplicatePrompt(promptId);
            this.renderPrompts();
            this.notificationManager.success(`Prompt duplicated as "${duplicatedPrompt.name}"`);
        } catch (error) {
            this.notificationManager.error(error.message);
        }
    }

    toggleAutoRefresh(promptId) {
        try {
            // Toggle session-only auto-refresh state
            const currentState = this.autoRefreshState.get(promptId) ?? true; // default to enabled
            const newState = !currentState;
            this.autoRefreshState.set(promptId, newState);

            // Update all toggle buttons for this prompt ID immediately
            this.updateAutoRefreshButtons(promptId, newState);

            this.notificationManager.success(`Auto-refresh ${newState ? 'enabled' : 'disabled'} for this session`);
        } catch (error) {
            this.notificationManager.error(error.message);
        }
    }

    isAutoRefreshEnabled(promptId) {
        // Default to enabled if not explicitly set
        return this.autoRefreshState.get(promptId) ?? true;
    }

    updateAutoRefreshButtons(promptId, enabled) {
        // Find all auto-refresh toggle buttons for this prompt ID in the feedback area
        const feedbackContainer = document.getElementById('feedbackContainer');
        if (!feedbackContainer) return;

        // Find all buttons with onclick that contains this promptId
        const buttons = feedbackContainer.querySelectorAll('.auto-refresh-toggle');
        buttons.forEach(button => {
            // Check if this button belongs to the correct prompt
            const onclick = button.getAttribute('onclick');
            if (onclick && onclick.includes(`'${promptId}'`)) {
                // Update the button appearance
                button.innerHTML = enabled ? '🟢' : '🔴';
                button.className = `btn-icon auto-refresh-toggle ${enabled ? 'enabled' : 'disabled'}`;
                button.title = enabled ? 'Auto-refresh enabled - Click to disable' : 'Auto-refresh disabled - Click to enable';
            }
        });
    }

    regenerateCurrentFeedback() {
        // Trigger a fresh generation of current feedback to update toggle states
        const currentText = this.editorManager.getValue();
        if (currentText && currentText.trim().length > 0) {
            this.generateAIFeedback(currentText);
        }
    }

    deletePrompt(promptId) {
        const prompt = this.promptsManager.getPrompt(promptId);
        if (!prompt) return;

        if (confirm(`Are you sure you want to delete the prompt "${prompt.name}"?`)) {
            try {
                this.promptsManager.deletePrompt(promptId);
                this.renderPrompts();
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

    formatActionType(prompt) {
        switch (prompt.actionType) {
            case 'insert':
                return '✏️ Insert text';
            case 'replace':
                return '🔄 Replace text';
            case 'feedback':
            default:
                return '💬 Show feedback';
        }
    }

    formatTriggerType(prompt) {
        switch (prompt.triggerTiming) {
            case 'word':
                return '📝 Word completion';
            case 'sentence':
                return '📖 Sentence completion';
            case 'paragraph':
                return '📄 Paragraph completion';
            case 'custom':
                return `⏱️ Delay: ${prompt.customDelay || '1s'}`;
            case 'keyboard':
                return `⌨️ Shortcut: ${prompt.keyboardShortcut || 'Not set'}`;
            default:
                return '⏱️ Delay: 1s';
        }
    }

    setupDragAndDrop() {
        const container = this.elements.promptsList;
        const items = container.querySelectorAll('.prompt-item');

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
            if (this.promptsManager.reorderPromptsInActiveGroup(fromIndex, toIndex)) {
                this.renderPrompts();

                // Update the order of existing feedback immediately
                const enabledPrompts = this.promptsManager.getEnabledPrompts();
                const enabledPromptNames = enabledPrompts.map(p => p.name);
                this.aiService.reorderFeedbackByPromptOrder(enabledPromptNames);

                this.notificationManager.success('Prompt order updated');
            }
        } catch (error) {
            this.notificationManager.error('Failed to reorder prompt: ' + error.message);
        }
    }

    // Group Management Methods
    renderGroups() {
        const groups = this.promptsManager.getAllGroups();
        const activeGroup = this.promptsManager.getActiveGroup();
        const select = this.elements.activeGroupSelect;

        // Clear existing options
        select.innerHTML = '';

        // Add groups as options
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            option.selected = group.isActive;
            select.appendChild(option);
        });

        // Update button states
        this.elements.editGroupBtn.disabled = !activeGroup;
        this.elements.deleteGroupBtn.disabled = !activeGroup || groups.length <= 1;
    }

    switchActiveGroup(groupId) {
        if (!groupId) return;

        try {
            this.promptsManager.setActiveGroup(groupId);
            this.renderGroups();
            this.renderPrompts();
            this.notificationManager.success('Active group changed');

            // Clear existing feedback since we're switching contexts
            this.aiService.clearFeedback();
        } catch (error) {
            this.notificationManager.error(error.message);
        }
    }

    showGroupModal(groupId = null) {
        this.currentEditingGroupId = groupId;

        if (groupId) {
            // Edit existing group
            const group = this.promptsManager.getGroup(groupId);
            if (group) {
                this.elements.groupModalTitle.textContent = 'Edit Group';
                this.elements.groupName.value = group.name;
                this.elements.groupSetActive.checked = group.isActive;

                // Populate prompt checkboxes
                this.renderGroupPromptsList(group.promptIds);
            }
        } else {
            // Create new group
            this.elements.groupModalTitle.textContent = 'Add Group';
            this.elements.groupName.value = '';
            this.elements.groupSetActive.checked = false;

            // Populate prompt checkboxes with none selected
            this.renderGroupPromptsList([]);
        }

        this.elements.groupModal.style.display = 'flex';
        this.elements.groupName.focus();
    }

    renderGroupPromptsList(selectedPromptIds = [], filterTerm = '') {
        const allPrompts = this.promptsManager.getAllPrompts();
        const container = this.elements.groupPromptsList;

        if (allPrompts.length === 0) {
            container.innerHTML = '<p class="no-prompts">No prompts available. Create some prompts first.</p>';
            return;
        }

        // Filter prompts based on search term (name only)
        const filteredPrompts = filterTerm ?
            allPrompts.filter(prompt =>
                prompt.name.toLowerCase().includes(filterTerm.toLowerCase())
            ) : allPrompts;

        if (filteredPrompts.length === 0 && filterTerm) {
            container.innerHTML = '<p class="no-prompts">No prompts match your search.</p>';
            return;
        }

        // Sort prompts alphabetically by name
        const sortedPrompts = filteredPrompts.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

        container.innerHTML = sortedPrompts.map(prompt => {
            const highlightedName = this.highlightMatch(prompt.name, filterTerm);
            return `
                <div class="checkbox-item">
                    <label>
                        <input type="checkbox" value="${prompt.id}" ${selectedPromptIds.includes(prompt.id) ? 'checked' : ''}>
                        <span class="checkbox-label">${highlightedName}</span>
                    </label>
                </div>
            `;
        }).join('');
    }

    filterGroupPrompts(filterTerm) {
        // Get currently selected prompt IDs to preserve selection
        const checkboxes = this.elements.groupPromptsList.querySelectorAll('input[type="checkbox"]:checked');
        const selectedIds = Array.from(checkboxes).map(cb => cb.value);

        // Re-render with filter applied
        this.renderGroupPromptsList(selectedIds, filterTerm);
    }

    highlightMatch(text, searchTerm) {
        if (!searchTerm || !searchTerm.trim()) {
            return this.escapeHtml(text);
        }

        const escaped = this.escapeHtml(text);
        const escapedSearchTerm = this.escapeHtml(searchTerm.trim());

        // Case-insensitive replacement with highlighting
        const regex = new RegExp(`(${escapedSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return escaped.replace(regex, '<mark>$1</mark>');
    }

    hideGroupModal() {
        this.elements.groupModal.style.display = 'none';
        this.elements.groupPromptsFilter.value = ''; // Clear filter
        this.currentEditingGroupId = null;
    }

    saveGroup() {
        const name = this.elements.groupName.value.trim();
        const setActive = this.elements.groupSetActive.checked;

        if (!name) {
            this.notificationManager.error('Please enter a name for the group');
            this.elements.groupName.focus();
            return;
        }

        // Get selected prompt IDs
        const checkboxes = this.elements.groupPromptsList.querySelectorAll('input[type="checkbox"]:checked');
        const promptIds = Array.from(checkboxes).map(cb => cb.value);

        try {
            if (this.currentEditingGroupId) {
                // Update existing group
                this.promptsManager.updateGroup(this.currentEditingGroupId, {
                    name,
                    promptIds,
                    isActive: setActive
                });
                this.notificationManager.success('Group updated successfully');
            } else {
                // Create new group
                this.promptsManager.createGroup(name, promptIds, setActive);
                this.notificationManager.success('Group created successfully');
            }

            this.renderGroups();
            this.renderPrompts();
            this.hideGroupModal();
        } catch (error) {
            this.notificationManager.error(error.message);
        }
    }

    deleteGroup(groupId) {
        const group = this.promptsManager.getGroup(groupId);
        if (!group) return;

        if (confirm(`Are you sure you want to delete the group "${group.name}"?`)) {
            try {
                this.promptsManager.deleteGroup(groupId);
                this.renderGroups();
                this.renderPrompts();
                this.notificationManager.success('Group deleted successfully');

                // Clear existing feedback since group context changed
                this.aiService.clearFeedback();
            } catch (error) {
                this.notificationManager.error(error.message);
            }
        }
    }

    async setupImportExportUI() {
        const exportBtn = document.getElementById('exportDataBtn');
        const importBtn = document.getElementById('importDataBtn');
        const importDefaultPromptsBtn = document.getElementById('importDefaultPromptsBtn');
        const importFileInput = document.getElementById('importFileInput');
        const importOptions = document.getElementById('importOptions');
        const confirmImportBtn = document.getElementById('confirmImportBtn');
        const cancelImportBtn = document.getElementById('cancelImportBtn');
        const statsContainer = document.getElementById('importExportStats');

        if (!exportBtn || !importBtn || !importFileInput || !statsContainer) {
            console.warn('Import/Export UI elements not found');
            return;
        }

        // Load and display storage stats
        this.updateStorageStats();

        // Export functionality
        exportBtn.addEventListener('click', async () => {
            exportBtn.disabled = true;
            exportBtn.textContent = 'Exporting...';

            try {
                const result = await this.importExportManager.downloadBackup();
                if (result.success) {
                    this.notificationManager.success(`Backup downloaded: ${result.filename}`);
                } else {
                    this.notificationManager.error(`Export failed: ${result.error}`);
                }
            } catch (error) {
                this.notificationManager.error(`Export failed: ${error.message}`);
            }

            exportBtn.disabled = false;
            exportBtn.innerHTML = '<span class="btn-icon">⬇️</span>Export All Data';
        });

        // Import default prompts functionality
        if (importDefaultPromptsBtn) {
            importDefaultPromptsBtn.addEventListener('click', async () => {
                importDefaultPromptsBtn.disabled = true;
                importDefaultPromptsBtn.innerHTML = '<span class="btn-icon">⏳</span>Importing...';

                try {
                    const result = this.promptsManager.importDefaultPrompts(true);

                    if (result.imported > 0) {
                        this.notificationManager.success(
                            `Successfully imported ${result.imported} default prompts!` +
                            (result.skipped > 0 ? ` (${result.skipped} skipped as they already exist)` : '')
                        );
                        // Refresh the prompts UI
                        this.renderPrompts();
                    } else if (result.skipped > 0) {
                        this.notificationManager.info('All default prompts already exist in your collection.');
                    } else {
                        this.notificationManager.info('No prompts were imported.');
                    }
                } catch (error) {
                    this.notificationManager.error(`Failed to import default prompts: ${error.message}`);
                }

                importDefaultPromptsBtn.disabled = false;
                importDefaultPromptsBtn.innerHTML = '<span class="btn-icon">✨</span>Import Default Prompts';
            });
        }

        // Import functionality
        importBtn.addEventListener('click', () => {
            importFileInput.click();
        });

        importFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                importOptions.style.display = 'block';
            }
        });

        confirmImportBtn.addEventListener('click', async () => {
            const file = importFileInput.files[0];
            if (!file) return;

            const overwrite = document.getElementById('overwriteData').checked;
            const importSettings = document.getElementById('importSettings').checked;
            const importPrompts = document.getElementById('importPrompts').checked;
            const importHistory = document.getElementById('importHistory').checked;

            const selective = [];
            if (importSettings || importPrompts) selective.push('localStorage');
            if (importHistory) selective.push('indexedDB');

            confirmImportBtn.disabled = true;
            confirmImportBtn.textContent = 'Importing...';

            try {
                const results = await this.importExportManager.uploadBackupFromFile(file, {
                    overwrite,
                    selective: selective.length > 0 ? selective : null
                });

                this.displayImportResults(results);
                importOptions.style.display = 'none';
                importFileInput.value = '';
                this.updateStorageStats();

            } catch (error) {
                this.notificationManager.error(`Import failed: ${error.message}`);
                this.displayImportResults(null, error.message);
            }

            confirmImportBtn.disabled = false;
            confirmImportBtn.textContent = 'Import Selected';
        });

        cancelImportBtn.addEventListener('click', () => {
            importOptions.style.display = 'none';
            importFileInput.value = '';
        });

        // Reset all data functionality
        const resetAllBtn = document.getElementById('resetAllDataBtn');
        if (resetAllBtn) {
            resetAllBtn.addEventListener('click', () => {
                this.showResetConfirmation();
            });
        }

        // Listen for data changes to update stats
        window.addEventListener('dataImported', () => {
            this.updateStorageStats();
            // Refresh UI components that may have been affected
            this.settingsManager.setupUI();
            this.renderGroups();
            this.renderPrompts();
        });

        // Listen for data reset to update stats
        window.addEventListener('dataReset', (e) => {
            this.updateStorageStats();
            this.displayResetResults(e.detail.results);
            // Refresh UI components
            this.settingsManager.setupUI();
            this.renderGroups();
            this.renderPrompts();
        });
    }

    async updateStorageStats() {
        const statsContainer = document.getElementById('importExportStats');
        if (!statsContainer) return;

        try {
            const stats = await this.importExportManager.getStorageStats();

            if (stats.error) {
                statsContainer.innerHTML = `<div class="stats-error">Error loading stats: ${stats.error}</div>`;
                return;
            }

            statsContainer.innerHTML = `
                <div class="stats-summary">
                    <div class="stat-item">
                        <div class="stat-label">Total Size</div>
                        <div class="stat-value">${stats.totalSizeMB} MB</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Settings</div>
                        <div class="stat-value">${stats.breakdown.settings ? '✓' : '✗'}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Prompts</div>
                        <div class="stat-value">${stats.breakdown.prompts || '0 items'}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Groups</div>
                        <div class="stat-value">${stats.breakdown.promptGroups || '0 items'}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">AI History</div>
                        <div class="stat-value">${stats.breakdown.llmHistory || '0 items'}</div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Failed to update storage stats:', error);
            statsContainer.innerHTML = `<div class="stats-error">Failed to load storage stats</div>`;
        }
    }

    displayImportResults(results, errorMessage = null) {
        const statsContainer = document.getElementById('importExportStats');
        if (!statsContainer) return;

        // Remove any existing results display
        const existingResults = document.querySelector('.import-results');
        if (existingResults) {
            existingResults.remove();
        }

        let resultElement;

        if (errorMessage) {
            resultElement = document.createElement('div');
            resultElement.className = 'import-results error';
            resultElement.innerHTML = `
                <div class="results-summary">Import Failed</div>
                <div class="results-details">${errorMessage}</div>
            `;
        } else if (results) {
            const hasErrors = (results.localStorage?.errors?.length > 0) || (results.indexedDB?.errors?.length > 0);
            const totalImported = (results.localStorage?.imported || 0) + (results.indexedDB?.imported || 0);

            resultElement = document.createElement('div');
            resultElement.className = hasErrors ? 'import-results warning' : 'import-results success';

            let detailsHTML = `
                <div class="results-summary">
                    Import ${hasErrors ? 'Completed with Warnings' : 'Successful'}
                </div>
                <div class="results-details">
                    Imported ${totalImported} items total
                </div>
            `;

            if (hasErrors) {
                const allErrors = [...(results.localStorage?.errors || []), ...(results.indexedDB?.errors || [])];
                detailsHTML += `
                    <ul class="error-list">
                        ${allErrors.map(error => `<li>${error}</li>`).join('')}
                    </ul>
                `;
            }

            resultElement.innerHTML = detailsHTML;
        }

        if (resultElement) {
            statsContainer.parentNode.insertBefore(resultElement, statsContainer.nextSibling);

            // Remove the results after 10 seconds
            setTimeout(() => {
                if (resultElement && resultElement.parentNode) {
                    resultElement.remove();
                }
            }, 10000);
        }
    }

    showResetConfirmation() {
        // Create confirmation modal
        const modal = document.createElement('div');
        modal.className = 'reset-confirmation-modal';
        modal.innerHTML = `
            <div class="reset-confirmation-content">
                <div class="reset-confirmation-title">
                    ⚠️ Reset All Data
                </div>
                <div class="reset-confirmation-message">
                    You are about to permanently delete ALL your data including:
                    <ul style="text-align: left; margin: 1rem 0;">
                        <li>Settings and preferences</li>
                        <li>All custom prompts and groups</li>
                        <li>Complete AI interaction history</li>
                        <li>Usage statistics and analytics</li>
                    </ul>
                </div>
                <div class="reset-confirmation-warning">
                    ⚠️ This action cannot be undone!<br>
                    Consider exporting your data first as a backup.
                </div>
                <div class="reset-confirmation-actions">
                    <button class="btn-danger" id="confirmResetBtn">
                        🗑️ Delete All Data
                    </button>
                    <button class="btn-secondary" id="cancelResetBtn">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Get elements
        const confirmBtn = modal.querySelector('#confirmResetBtn');
        const cancelBtn = modal.querySelector('#cancelResetBtn');

        // Handle confirm
        confirmBtn.addEventListener('click', async () => {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Deleting...';

            try {
                const results = await this.importExportManager.resetAllData();
                this.notificationManager.success('All data has been reset successfully');
                modal.remove();
            } catch (error) {
                this.notificationManager.error(`Reset failed: ${error.message}`);
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '🗑️ Delete All Data';
            }
        });

        // Handle cancel
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });

        // Handle escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Handle click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Focus the cancel button for keyboard navigation
        setTimeout(() => cancelBtn.focus(), 100);
    }

    displayResetResults(results) {
        const statsContainer = document.getElementById('importExportStats');
        if (!statsContainer) return;

        // Remove any existing results display
        const existingResults = document.querySelector('.reset-results');
        if (existingResults) {
            existingResults.remove();
        }

        const hasErrors = (results.localStorage?.errors?.length > 0) || (results.indexedDB?.errors?.length > 0);
        const totalCleared = (results.localStorage?.cleared || 0) + (results.indexedDB?.cleared || 0);

        const resultElement = document.createElement('div');
        resultElement.className = hasErrors ? 'import-results warning reset-results' : 'import-results success reset-results';

        let detailsHTML = `
            <div class="results-summary">
                Reset ${hasErrors ? 'Completed with Issues' : 'Successful'}
            </div>
            <div class="results-details">
                Cleared ${results.localStorage?.cleared || 0} localStorage items and ${results.indexedDB?.cleared || 0} AI history records
            </div>
        `;

        if (hasErrors) {
            const allErrors = [...(results.localStorage?.errors || []), ...(results.indexedDB?.errors || [])];
            detailsHTML += `
                <ul class="error-list">
                    ${allErrors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            `;
        }

        resultElement.innerHTML = detailsHTML;
        statsContainer.parentNode.insertBefore(resultElement, statsContainer.nextSibling);

        // Remove the results after 10 seconds
        setTimeout(() => {
            if (resultElement && resultElement.parentNode) {
                resultElement.remove();
            }
        }, 10000);
    }

    cleanup() {
        // Clean up context menu manager
        if (this.contextMenuManager) {
            this.contextMenuManager.destroy();
        }

        // Clean up other resources
        if (this.aiService) {
            this.aiService.clearTimers();
        }
    }









}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new AITextEditor();
    window.app = app; // Make app globally accessible
    window.aiTextEditor = app; // Also make available as aiTextEditor for components
});
