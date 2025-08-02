class SettingsManager {
    constructor() {
        this.storageKey = 'aiTextEditor_settings';
        this.defaultSettings = {
            fontFamily: "'Monaco', 'Menlo', monospace",
            fontSize: 14
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

        if (!fontFamilySelect || !fontSizeRange || !fontSizeValue) {
            console.error('Settings UI elements not found');
            return;
        }

        // Set initial values
        fontFamilySelect.value = this.settings.fontFamily;
        fontSizeRange.value = this.settings.fontSize;
        fontSizeValue.textContent = `${this.settings.fontSize}px`;

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