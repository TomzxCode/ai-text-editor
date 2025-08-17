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
            promptsList: document.getElementById('promptsList'),
            promptModal: document.getElementById('promptModal'),
            promptModalTitle: document.getElementById('promptModalTitle'),
            promptName: document.getElementById('promptName'),
            promptText: document.getElementById('promptText'),
            promptTriggerTiming: document.getElementById('promptTriggerTiming'),
            promptCustomDelay: document.getElementById('promptCustomDelay'),
            customDelayGroup: document.getElementById('customDelayGroup'),
            providersList: document.getElementById('providersList'),
            addProviderBtn: document.getElementById('addProviderBtn'),
            promptEnabled: document.getElementById('promptEnabled'),
            savePromptBtn: document.getElementById('savePromptBtn'),
            cancelPromptBtn: document.getElementById('cancelPromptBtn'),
            closePromptModal: document.getElementById('closePromptModal')
        };
    }

    initializeManagers() {
        this.sessionManager = new SessionManager();
        this.settingsManager = new SettingsManager();
        this.textAnalysisManager = new TextAnalysisManager();

        this.editorManager = new EditorManager(this.elements.textEditor, (event, data) => {
            this.handleEditorEvent(event, data);
        }, this.settingsManager);

        this.uiManager = new UIManager(this.elements);
        this.aiService = new AIService();
        this.promptsManager = new PromptsManager();
        this.usageTracker = new UsageTracker();
        this.historyManager = new HistoryManager();

        // Initialize provider management
        this.initializeProviderManagement();

        this.currentEditingPromptId = null;
        this.renderPrompts();

        // Setup text analysis callbacks
        this.setupTextAnalysisCallbacks();

        // Initialize text statistics display
        this.updateTextStatisticsDisplay().catch(console.error);

        // Setup settings UI after DOM is ready
        setTimeout(async () => {
            this.settingsManager.setupUI();
            await this.usageTracker.initialize();
            await this.historyManager.initialize();
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

        this.elements.promptTriggerTiming.addEventListener('change', () => {
            this.toggleCustomDelayField();
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

    setupTextAnalysisCallbacks() {
        // Setup word completion callback
        this.textAnalysisManager.onWordCompletion((data) => {
            this.handleTriggerTimingEvent('word');
        });

        // Setup sentence completion callback
        this.textAnalysisManager.onSentenceCompletion((data) => {
            this.handleTriggerTimingEvent('sentence');
        });

        // Start tracking when editor is ready
        this.textAnalysisManager.startTracking();
    }

    handleTriggerTimingEvent(triggerType) {
        const currentText = this.editorManager.getValue();
        const enabledPrompts = this.promptsManager.getEnabledPromptsByTrigger(triggerType);
        
        if (enabledPrompts.length === 0) return;

        const settings = this.settingsManager.getAllSettings();
        if (!settings.enableAIFeedback) return;

        // Schedule individual feedback for each prompt that matches this trigger type and has auto-refresh enabled for this session
        enabledPrompts.filter(prompt => this.isAutoRefreshEnabled(prompt.id)).forEach(prompt => {
            this.aiService.schedulePromptFeedback(
                prompt.id,
                (promptId) => this.generateIndividualPromptFeedback(promptId, currentText),
                triggerType,
                currentText,
                prompt.customDelay
            );
        });
    }

    generateIndividualPromptFeedback(promptId, content) {
        const prompt = this.promptsManager.getPrompt(promptId);
        if (!prompt || !prompt.enabled) return;

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
                this.updateTextStatisticsDisplay().catch(console.error);
            },
            (error) => {
                console.error('Error generating individual prompt feedback:', error);
            },
            settings
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
                // Update statistics display for new file
                this.updateTextStatisticsDisplay().catch(console.error);
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
        this.updateTextStatisticsDisplay().catch(console.error);

        // Schedule AI feedback as before
        this.scheduleAIFeedback();
    }

    getTextStatistics() {
        const currentText = this.editorManager.getValue();
        return this.textAnalysisManager.getStatistics(currentText);
    }

    async updateTextStatisticsDisplay() {
        const stats = this.getTextStatistics();
        const llmStats = await this.getLLMStatistics();

        // Format word count
        const wordText = stats.wordCount === 1 ? '1 word' : `${stats.wordCount} words`;
        this.elements.wordCountSpan.textContent = wordText;

        // Format sentence count
        const sentenceText = stats.sentenceCount === 1 ? '1 sentence' : `${stats.sentenceCount} sentences`;
        this.elements.sentenceCountSpan.textContent = sentenceText;

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
                this.updateTextStatisticsDisplay().catch(console.error);
            },
            (error) => this.uiManager.showFeedbackError(error),
            delayTriggeredPrompts,
            settings
        );
    }









    renderPrompts() {
        const prompts = this.promptsManager.getAllPrompts();
        const container = this.elements.promptsList;

        if (prompts.length === 0) {
            container.innerHTML = '<p class="no-prompts">No prompts yet. Click + to add one.</p>';
            return;
        }

        container.innerHTML = prompts.map((prompt, index) => `
            <div class="prompt-item ${!prompt.enabled ? 'disabled' : ''}"
                 data-id="${prompt.id}"
                 data-index="${index}"
                 draggable="true">
                <div class="prompt-header">
                    <div class="drag-handle" title="Drag to reorder">⋮⋮</div>
                    <span class="prompt-name">${this.escapeHtml(prompt.name)}</span>
                    <div class="prompt-actions">
                        <button class="btn-icon" onclick="app.togglePrompt('${prompt.id}')" title="${prompt.enabled ? 'Disable' : 'Enable'}">
                            ${prompt.enabled ? '●' : '○'}
                        </button>
                        <button class="btn-icon" onclick="app.editPrompt('${prompt.id}')" title="Edit">✏️</button>
                        <button class="btn-icon danger" onclick="app.deletePrompt('${prompt.id}')" title="Delete">🗑️</button>
                    </div>
                </div>
                <div class="prompt-trigger">${this.formatTriggerType(prompt)}</div>
                <div class="prompt-preview">${this.escapeHtml(prompt.prompt)}</div>
            </div>
        `).join('');

        // Add drag and drop event listeners
        this.setupDragAndDrop();
    }

    showPromptModal(promptId = null) {
        this.currentEditingPromptId = promptId;

        if (promptId) {
            const prompt = this.promptsManager.getPrompt(promptId);
            if (prompt) {
                this.elements.promptModalTitle.textContent = 'Edit Prompt';
                this.elements.promptName.value = prompt.name;
                this.elements.promptText.value = prompt.prompt;
                this.elements.promptTriggerTiming.value = prompt.triggerTiming || 'custom';
                this.elements.promptCustomDelay.value = prompt.customDelay || '1s';
                this.currentProviders = prompt.providers ? [...prompt.providers] : [];
                this.elements.promptEnabled.checked = prompt.enabled;
            }
        } else {
            this.elements.promptModalTitle.textContent = 'Add Prompt';
            this.elements.promptName.value = '';
            this.elements.promptText.value = '';
            this.elements.promptTriggerTiming.value = 'custom';
            this.elements.promptCustomDelay.value = '1s';
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
        } else {
            this.elements.customDelayGroup.style.display = 'none';
        }
    }

    hidePromptModal() {
        this.elements.promptModal.style.display = 'none';
        this.currentEditingPromptId = null;
    }

    savePrompt() {
        const name = this.elements.promptName.value.trim();
        const prompt = this.elements.promptText.value.trim();
        const triggerTiming = this.elements.promptTriggerTiming.value;
        const customDelay = this.elements.promptCustomDelay.value.trim();
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

        try {
            if (this.currentEditingPromptId) {
                this.promptsManager.updatePrompt(this.currentEditingPromptId, {
                    name,
                    prompt,
                    triggerTiming,
                    customDelay: triggerTiming === 'custom' ? customDelay : '',
                    providers,
                    enabled
                });
                this.notificationManager.success('Prompt updated successfully');
            } else {
                this.promptsManager.addPrompt(name, prompt, enabled, triggerTiming, customDelay, providers);
                this.notificationManager.success('Prompt added successfully');
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

    formatTriggerType(prompt) {
        switch (prompt.triggerTiming) {
            case 'word':
                return '📝 Word completion';
            case 'sentence':
                return '📖 Sentence completion';
            case 'custom':
                return `⏱️ Delay: ${prompt.customDelay || '1s'}`;
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
            if (this.promptsManager.reorderPrompts(fromIndex, toIndex)) {
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









}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new AITextEditor();
    window.app = app; // Make app globally accessible
});
