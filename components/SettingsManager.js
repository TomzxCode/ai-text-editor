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

        // Set initial values
        fontFamilySelect.value = this.settings.fontFamily;
        fontSizeRange.value = this.settings.fontSize;
        fontSizeValue.textContent = `${this.settings.fontSize}px`;
        
        if (enableAICheckbox) {
            enableAICheckbox.checked = this.settings.enableAIFeedback;
        }

        if (apiKeyInput) {
            apiKeyInput.value = this.settings.apiKey;
        }

        if (llmServiceSelect) {
            llmServiceSelect.value = this.settings.llmService;
        }

        if (llmModelSelect) {
            llmModelSelect.value = this.settings.llmModel;
        }

        if (customBaseUrlInput) {
            customBaseUrlInput.value = this.settings.customBaseUrl;
        }

        // Font family change handler
        fontFamilySelect.addEventListener('change', (e) => {
            this.setSetting('fontFamily', e.target.value);
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
        if (llmServiceSelect) {
            llmServiceSelect.addEventListener('change', async (e) => {
                this.setSetting('llmService', e.target.value);
                await this.populateModelOptions(e.target.value);
            });
        }

        // LLM model select handler
        if (llmModelSelect) {
            llmModelSelect.addEventListener('change', (e) => {
                this.setSetting('llmModel', e.target.value);
            });
        }

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
        const llmModelSelect = document.getElementById('llmModel');
        if (!llmModelSelect || !service) return;

        // Show loading state
        llmModelSelect.innerHTML = '<option value="">Loading models...</option>';
        llmModelSelect.disabled = true;

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
            llmModelSelect.innerHTML = '';
            
            if (models.length === 0) {
                llmModelSelect.innerHTML = '<option value="">No models available</option>';
            } else {
                models.forEach(modelName => {
                    const option = document.createElement('option');
                    option.value = modelName;
                    option.textContent = modelName;
                    llmModelSelect.appendChild(option);
                });
            }

            // Set the current model if it exists in the list
            if (models.includes(this.settings.llmModel)) {
                llmModelSelect.value = this.settings.llmModel;
            } else if (models.length > 0) {
                // If current model is not in the list, select the first one
                llmModelSelect.value = models[0];
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
            
            llmModelSelect.innerHTML = `<option value="">${errorMessage}</option>`;
        } finally {
            llmModelSelect.disabled = false;
        }
    }

    resetToDefaults() {
        this.settings = { ...this.defaultSettings };
        this.saveSettings();
        this.setupUI(); // Refresh UI
        
        // Notify all callbacks
        Object.keys(this.settings).forEach(key => {
            this.notifyChange(key, this.settings[key]);
        });
    }
}