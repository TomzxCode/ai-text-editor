class SettingsManager {
    constructor() {
        this.storageKey = 'aiTextEditor_settings';
        this.defaultSettings = {
            fontFamily: "'Monaco', 'Menlo', monospace",
            fontSize: 14,
            enableAIFeedback: true,
            apiKey: '',
            llmService: 'groq',
            llmModel: 'llama3-8b-8192',
            customBaseUrl: ''
        };
        
        this.settings = this.loadSettings();
        this.onChangeCallbacks = [];
    }

    loadSettings() {
        try {
            const savedSettings = localStorage.getItem(this.storageKey);
            if (savedSettings) {
                return { ...this.defaultSettings, ...JSON.parse(savedSettings) };
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
        
        return { ...this.defaultSettings };
    }

    saveSettings() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    getSetting(key) {
        return this.settings[key];
    }

    getSettings() {
        return { ...this.settings };
    }

    setSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        this.notifyChange(key, value);
    }

    getAllSettings() {
        return { ...this.settings };
    }

    onChange(callback) {
        this.onChangeCallbacks.push(callback);
    }

    notifyChange(key, value) {
        this.onChangeCallbacks.forEach(callback => {
            try {
                callback(key, value, this.settings);
            } catch (error) {
                console.error('Error in settings change callback:', error);
            }
        });
    }

    setupUI() {
        const fontFamilySelect = document.getElementById('fontFamily');
        const fontSizeRange = document.getElementById('fontSize');
        const fontSizeValue = document.getElementById('fontSizeValue');
        const enableAICheckbox = document.getElementById('enableAIFeedback');
        const apiKeyInput = document.getElementById('apiKey');
        const llmServiceSelect = document.getElementById('llmService');
        const llmModelSelect = document.getElementById('llmModel');
        const customBaseUrlInput = document.getElementById('customBaseUrl');

        if (!fontFamilySelect || !fontSizeRange || !fontSizeValue) {
            console.error('Settings UI elements not found');
            return;
        }

        // Initialize searchable dropdowns
        const fontFamilyInstance = window.searchableDropdown.init('fontFamily', {
            searchEnabled: true,
            searchPlaceholderValue: 'Search fonts...',
            placeholder: false
        });

        const llmServiceInstance = window.searchableDropdown.init('llmService', {
            searchEnabled: true,
            searchPlaceholderValue: 'Search services...',
            placeholder: false
        });

        const llmModelInstance = window.searchableDropdown.init('llmModel', {
            searchEnabled: true,
            searchPlaceholderValue: 'Search models...',
            placeholder: false
        });

        // Set initial values
        window.searchableDropdown.setValue('fontFamily', this.settings.fontFamily);
        fontSizeRange.value = this.settings.fontSize;
        fontSizeValue.textContent = `${this.settings.fontSize}px`;
        
        if (enableAICheckbox) {
            enableAICheckbox.checked = this.settings.enableAIFeedback;
        }

        if (apiKeyInput) {
            apiKeyInput.value = this.settings.apiKey;
        }

        if (llmServiceSelect) {
            window.searchableDropdown.setValue('llmService', this.settings.llmService);
        }

        if (llmModelSelect) {
            window.searchableDropdown.setValue('llmModel', this.settings.llmModel);
        }

        if (customBaseUrlInput) {
            customBaseUrlInput.value = this.settings.customBaseUrl;
        }

        // Font family change handler
        window.searchableDropdown.addEventListener('fontFamily', 'change', (e) => {
            this.setSetting('fontFamily', e.detail.value);
        });

        // Font size change handler
        fontSizeRange.addEventListener('input', (e) => {
            const size = parseInt(e.target.value);
            fontSizeValue.textContent = `${size}px`;
            this.setSetting('fontSize', size);
        });

        // AI feedback toggle handler
        if (enableAICheckbox) {
            enableAICheckbox.addEventListener('change', (e) => {
                this.setSetting('enableAIFeedback', e.target.checked);
            });
        }

        // API key input handler
        if (apiKeyInput) {
            apiKeyInput.addEventListener('input', (e) => {
                this.setSetting('apiKey', e.target.value);
            });
        }

        // LLM service select handler
        window.searchableDropdown.addEventListener('llmService', 'change', async (e) => {
            this.setSetting('llmService', e.detail.value);
            await this.populateModelOptions(e.detail.value);
        });

        // LLM model select handler
        window.searchableDropdown.addEventListener('llmModel', 'change', (e) => {
            this.setSetting('llmModel', e.detail.value);
        });

        // Custom base URL input handler
        if (customBaseUrlInput) {
            customBaseUrlInput.addEventListener('input', (e) => {
                this.setSetting('customBaseUrl', e.target.value);
            });
        }

        // Initial population of model options
        this.populateModelOptions(this.settings.llmService);
    }

    async populateModelOptions(service) {
        if (!service) return;

        // Show loading state
        window.searchableDropdown.disable('llmModel');
        window.searchableDropdown.setChoices('llmModel', [
            { value: '', label: 'Loading models...' }
        ]);

        try {
            // Get AIService instance from global app
            const aiService = window.app?.aiService;
            if (!aiService) {
                throw new Error('AIService not available');
            }

            // Wait for LLM.js to be initialized
            if (!aiService.LLM) {
                // Wait up to 5 seconds for LLM to initialize
                let attempts = 0;
                while (!aiService.LLM && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
                
                if (!aiService.LLM) {
                    throw new Error('LLM service failed to initialize');
                }
            }

            // Fetch models for the selected service
            const models = await aiService.fetchModels(service);
            
            // Clear and populate dropdown
            if (models.length === 0) {
                window.searchableDropdown.setChoices('llmModel', [
                    { value: '', label: 'No models available' }
                ]);
            } else {
                const modelChoices = models.map(modelName => ({
                    value: modelName,
                    label: modelName
                }));
                window.searchableDropdown.setChoices('llmModel', modelChoices);
            }

            // Set the current model if it exists in the list
            if (models.includes(this.settings.llmModel)) {
                window.searchableDropdown.setValue('llmModel', this.settings.llmModel);
            } else if (models.length > 0) {
                // If current model is not in the list, select the first one
                window.searchableDropdown.setValue('llmModel', models[0]);
                this.setSetting('llmModel', models[0]);
            }

        } catch (error) {
            console.error('Error populating model options:', error);
            
            // Provide specific error messages based on the error type
            let errorMessage = 'Error loading models';
            if (error.message.includes('API key')) {
                errorMessage = 'API key required';
            } else if (error.message.includes('Unauthorized')) {
                errorMessage = 'Invalid API key';
            } else if (error.message.includes('failed to initialize')) {
                errorMessage = 'Service unavailable';
            }
            
            window.searchableDropdown.setChoices('llmModel', [
                { value: '', label: errorMessage }
            ]);
        } finally {
            window.searchableDropdown.enable('llmModel');
        }
    }

    resetToDefaults() {
        this.settings = { ...this.defaultSettings };
        this.saveSettings();
        
        // Reset searchable dropdowns
        window.searchableDropdown.setValue('fontFamily', this.settings.fontFamily);
        window.searchableDropdown.setValue('llmService', this.settings.llmService);
        window.searchableDropdown.setValue('llmModel', this.settings.llmModel);
        
        this.setupUI(); // Refresh UI
        
        // Notify all callbacks
        Object.keys(this.settings).forEach(key => {
            this.notifyChange(key, this.settings[key]);
        });
    }
}