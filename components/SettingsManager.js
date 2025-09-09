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
            customBaseUrl: '',
            customServices: [],
            theme: 'material',
            uiTheme: 'dark'
        };

        // Built-in services that are always available
        this.builtInServices = [
            { value: 'anthropic', label: 'Anthropic' },
            { value: 'google', label: 'Google' },
            { value: 'groq', label: 'Groq' },
            { value: 'ollama', label: 'Ollama' },
            { value: 'openai', label: 'OpenAI' }
        ];

        // Available CodeMirror themes
        this.availableThemes = [
            { value: 'default', label: 'Default' },
            { value: '3024-day', label: '3024 Day' },
            { value: '3024-night', label: '3024 Night' },
            { value: 'abbott', label: 'Abbott' },
            { value: 'abcdef', label: 'Abcdef' },
            { value: 'ambiance', label: 'Ambiance' },
            { value: 'ayu-dark', label: 'Ayu Dark' },
            { value: 'ayu-mirage', label: 'Ayu Mirage' },
            { value: 'base16-dark', label: 'Base16 Dark' },
            { value: 'base16-light', label: 'Base16 Light' },
            { value: 'bespin', label: 'Bespin' },
            { value: 'blackboard', label: 'Blackboard' },
            { value: 'cobalt', label: 'Cobalt' },
            { value: 'colorforth', label: 'Colorforth' },
            { value: 'darcula', label: 'Darcula' },
            { value: 'dracula', label: 'Dracula' },
            { value: 'duotone-dark', label: 'Duotone Dark' },
            { value: 'duotone-light', label: 'Duotone Light' },
            { value: 'eclipse', label: 'Eclipse' },
            { value: 'elegant', label: 'Elegant' },
            { value: 'erlang-dark', label: 'Erlang Dark' },
            { value: 'gruvbox-dark', label: 'Gruvbox Dark' },
            { value: 'hopscotch', label: 'Hopscotch' },
            { value: 'icecoder', label: 'Icecoder' },
            { value: 'idea', label: 'Idea' },
            { value: 'isotope', label: 'Isotope' },
            { value: 'juejin', label: 'Juejin' },
            { value: 'lesser-dark', label: 'Lesser Dark' },
            { value: 'liquibyte', label: 'Liquibyte' },
            { value: 'lucario', label: 'Lucario' },
            { value: 'material', label: 'Material' },
            { value: 'material-darker', label: 'Material Darker' },
            { value: 'material-palenight', label: 'Material Palenight' },
            { value: 'material-ocean', label: 'Material Ocean' },
            { value: 'mbo', label: 'MBO' },
            { value: 'mdn-like', label: 'MDN-like' },
            { value: 'midnight', label: 'Midnight' },
            { value: 'monokai', label: 'Monokai' },
            { value: 'moxer', label: 'Moxer' },
            { value: 'neat', label: 'Neat' },
            { value: 'neo', label: 'Neo' },
            { value: 'night', label: 'Night' },
            { value: 'nord', label: 'Nord' },
            { value: 'oceanic-next', label: 'Oceanic Next' },
            { value: 'panda-syntax', label: 'Panda Syntax' },
            { value: 'paraiso-dark', label: 'Paraiso Dark' },
            { value: 'paraiso-light', label: 'Paraiso Light' },
            { value: 'pastel-on-dark', label: 'Pastel on Dark' },
            { value: 'railscasts', label: 'Railscasts' },
            { value: 'rubyblue', label: 'Ruby Blue' },
            { value: 'seti', label: 'Seti' },
            { value: 'shadowfox', label: 'Shadowfox' },
            { value: 'solarized', label: 'Solarized' },
            { value: 'the-matrix', label: 'The Matrix' },
            { value: 'tomorrow-night-bright', label: 'Tomorrow Night Bright' },
            { value: 'tomorrow-night-eighties', label: 'Tomorrow Night Eighties' },
            { value: 'ttcn', label: 'TTCN' },
            { value: 'twilight', label: 'Twilight' },
            { value: 'vibrant-ink', label: 'Vibrant Ink' },
            { value: 'xq-dark', label: 'XQ Dark' },
            { value: 'xq-light', label: 'XQ Light' },
            { value: 'yeti', label: 'Yeti' },
            { value: 'yonce', label: 'Yonce' },
            { value: 'zenburn', label: 'Zenburn' }
        ];

        // Available UI themes
        this.availableUIThemes = [
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' }
        ];
        
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
        const themeSelect = document.getElementById('theme');
        const uiThemeSelect = document.getElementById('uiTheme');

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

        const themeInstance = window.searchableDropdown.init('theme', {
            searchEnabled: true,
            searchPlaceholderValue: 'Search themes...',
            placeholder: false
        });

        const uiThemeInstance = window.searchableDropdown.init('uiTheme', {
            searchEnabled: false,
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

        if (themeSelect) {
            window.searchableDropdown.setValue('theme', this.settings.theme);
        }

        if (uiThemeSelect) {
            window.searchableDropdown.setValue('uiTheme', this.settings.uiTheme);
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

        // Theme change handlers
        window.searchableDropdown.addEventListener('theme', 'change', (e) => {
            this.setSetting('theme', e.detail.value);
        });

        window.searchableDropdown.addEventListener('uiTheme', 'change', (e) => {
            this.setSetting('uiTheme', e.detail.value);
        });

        // Initialize custom services UI
        this.setupCustomServicesUI();

        // Initialize dropdowns
        this.updateServiceDropdowns();
        this.updateThemeDropdowns();

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
        window.searchableDropdown.setValue('theme', this.settings.theme);
        window.searchableDropdown.setValue('uiTheme', this.settings.uiTheme);
        
        this.setupUI(); // Refresh UI
        
        // Notify all callbacks
        Object.keys(this.settings).forEach(key => {
            this.notifyChange(key, this.settings[key]);
        });
    }

    // Custom service management methods
    getAllServices() {
        return [...this.builtInServices, ...this.settings.customServices];
    }

    addCustomService(name, serviceKey, baseUrl = '') {
        const customService = {
            value: serviceKey,
            label: name,
            baseUrl: baseUrl,
            isCustom: true
        };

        // Check if service already exists
        const allServices = this.getAllServices();
        if (allServices.find(service => service.value === serviceKey)) {
            throw new Error('Service with this key already exists');
        }

        this.settings.customServices.push(customService);
        this.saveSettings();
        this.notifyChange('customServices', this.settings.customServices);
        
        // Update the dropdowns
        this.updateServiceDropdowns();
        
        // Re-render the services list
        this.renderCustomServicesList();
        
        return customService;
    }

    removeCustomService(serviceKey) {
        const index = this.settings.customServices.findIndex(service => service.value === serviceKey);
        if (index === -1) {
            throw new Error('Custom service not found');
        }

        this.settings.customServices.splice(index, 1);
        this.saveSettings();
        this.notifyChange('customServices', this.settings.customServices);
        
        // Update the dropdowns
        this.updateServiceDropdowns();
    }

    getServiceConfig(serviceKey) {
        const allServices = this.getAllServices();
        return allServices.find(service => service.value === serviceKey);
    }

    updateServiceDropdowns() {
        const allServices = this.getAllServices();
        const serviceChoices = allServices.map(service => ({
            value: service.value,
            label: service.label
        }));

        // Update main settings dropdown
        window.searchableDropdown.setChoices('llmService', serviceChoices);
        
        // Update prompt override dropdown if it exists
        const promptServiceChoices = [
            { value: '', label: 'Use global setting' },
            ...serviceChoices
        ];
        window.searchableDropdown.setChoices('promptLlmService', promptServiceChoices);
    }

    updateThemeDropdowns() {
        // Update theme dropdown
        const themeChoices = this.availableThemes.map(theme => ({
            value: theme.value,
            label: theme.label
        }));
        window.searchableDropdown.setChoices('theme', themeChoices);

        // Update UI theme dropdown
        const uiThemeChoices = this.availableUIThemes.map(theme => ({
            value: theme.value,
            label: theme.label
        }));
        window.searchableDropdown.setChoices('uiTheme', uiThemeChoices);
    }

    setupCustomServicesUI() {
        const addBtn = document.getElementById('addCustomServiceBtn');
        const serviceForm = document.getElementById('customServiceForm');
        const saveBtn = document.getElementById('saveCustomServiceBtn');
        const cancelBtn = document.getElementById('cancelCustomServiceBtn');

        if (!addBtn || !serviceForm || !saveBtn || !cancelBtn) return;

        // Show/hide form handlers
        addBtn.addEventListener('click', () => {
            this.showCustomServiceForm();
        });

        cancelBtn.addEventListener('click', () => {
            this.hideCustomServiceForm();
        });

        // Save custom service
        saveBtn.addEventListener('click', () => {
            this.saveCustomService();
        });

        // Auto-generate service key from name
        const nameInput = document.getElementById('customServiceName');
        const keyInput = document.getElementById('customServiceKey');
        
        if (nameInput && keyInput) {
            nameInput.addEventListener('input', (e) => {
                // Only auto-generate if key field is empty
                if (!keyInput.value) {
                    const name = e.target.value;
                    // Convert to lowercase, replace spaces/special chars with hyphens
                    const autoKey = name
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, '-')
                        .replace(/-+/g, '-')
                        .replace(/^-+|-+$/g, '');
                    keyInput.value = autoKey;
                }
            });
        }

        // Keyboard shortcuts for form
        document.getElementById('customServiceForm').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                this.saveCustomService();
                e.preventDefault();
            } else if (e.key === 'Escape') {
                this.hideCustomServiceForm();
                e.preventDefault();
            }
        });

        // Initial render of custom services list
        this.renderCustomServicesList();
    }

    showCustomServiceForm() {
        const form = document.getElementById('customServiceForm');
        if (form) {
            form.style.display = 'block';
            document.getElementById('customServiceName').focus();
        }
    }

    hideCustomServiceForm() {
        const form = document.getElementById('customServiceForm');
        if (form) {
            form.style.display = 'none';
            // Clear form fields
            document.getElementById('customServiceName').value = '';
            document.getElementById('customServiceKey').value = '';
            document.getElementById('customServiceUrl').value = '';
        }
    }

    saveCustomService() {
        const name = document.getElementById('customServiceName').value.trim();
        const key = document.getElementById('customServiceKey').value.trim();
        const url = document.getElementById('customServiceUrl').value.trim();

        // Validation
        if (!name) {
            alert('Please enter a service name');
            return;
        }

        if (!key) {
            alert('Please enter a service key');
            return;
        }

        // Validate key format
        if (!/^[a-z0-9-]+$/.test(key)) {
            alert('Service key can only contain lowercase letters, numbers, and hyphens');
            return;
        }

        try {
            this.addCustomService(name, key, url);
            this.hideCustomServiceForm();
            
            // Show success message
            if (window.app?.notificationManager) {
                window.app.notificationManager.success(`Custom service "${name}" added successfully`);
            }
        } catch (error) {
            alert(error.message);
        }
    }

    renderCustomServicesList() {
        const container = document.getElementById('customServicesList');
        if (!container) return;

        container.innerHTML = '';

        if (this.settings.customServices.length === 0) {
            container.innerHTML = '<p class="no-data">No custom services configured.</p>';
            return;
        }

        this.settings.customServices.forEach(service => {
            const serviceItem = document.createElement('div');
            serviceItem.className = 'custom-service-item';
            
            serviceItem.innerHTML = `
                <div class="custom-service-info">
                    <div class="custom-service-name">${this.escapeHTML(service.label)}</div>
                    <div class="custom-service-details">
                        <span>Key: <code class="custom-service-key">${this.escapeHTML(service.value)}</code></span>
                        ${service.baseUrl ? `<span>URL: ${this.escapeHTML(service.baseUrl)}</span>` : ''}
                    </div>
                </div>
                <div class="custom-service-actions">
                    <button class="btn-danger" data-service-key="${this.escapeHTML(service.value)}" title="Remove Service">×</button>
                </div>
            `;

            // Add delete handler
            const deleteBtn = serviceItem.querySelector('.btn-danger');
            deleteBtn.addEventListener('click', () => {
                this.deleteCustomService(service.value, service.label);
            });

            container.appendChild(serviceItem);
        });
    }

    deleteCustomService(serviceKey, serviceName) {
        if (confirm(`Are you sure you want to remove the custom service "${serviceName}"?`)) {
            try {
                this.removeCustomService(serviceKey);
                this.renderCustomServicesList();
                
                // Show success message
                if (window.app?.notificationManager) {
                    window.app.notificationManager.success(`Custom service "${serviceName}" removed`);
                }
            } catch (error) {
                alert(error.message);
            }
        }
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}