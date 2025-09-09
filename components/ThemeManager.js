class ThemeManager {
    constructor(settingsManager) {
        this.settingsManager = settingsManager;
        this.init();
    }

    init() {
        // Apply initial theme
        const uiTheme = this.settingsManager.getSetting('uiTheme') || 'dark';
        this.applyUITheme(uiTheme);

        // Listen for theme changes
        this.settingsManager.onChange((key, value) => {
            if (key === 'uiTheme') {
                this.applyUITheme(value);
            }
        });
    }

    applyUITheme(theme) {
        const body = document.body;
        
        // Remove existing theme class
        body.removeAttribute('data-theme');
        
        // Apply new theme
        if (theme === 'light') {
            body.setAttribute('data-theme', 'light');
        }
        
        // Also update the meta theme-color for PWA
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'light' ? '#f8f9fa' : '#007acc');
        }

        // Dispatch custom event for other components to react to theme changes
        document.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme }
        }));
    }

    getCurrentTheme() {
        return this.settingsManager.getSetting('uiTheme') || 'dark';
    }

    toggleTheme() {
        const currentTheme = this.getCurrentTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.settingsManager.setSetting('uiTheme', newTheme);
    }

    // Utility method to check if system prefers dark mode
    getSystemPreference() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    // Method to set theme based on system preference
    useSystemTheme() {
        const systemTheme = this.getSystemPreference();
        this.settingsManager.setSetting('uiTheme', systemTheme);
    }
}