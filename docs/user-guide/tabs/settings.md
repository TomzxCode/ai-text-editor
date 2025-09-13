# Settings Tab

The Settings tab provides comprehensive configuration options for customizing your AI Text Editor experience. Settings are organized into collapsible sections for easy navigation and are automatically saved to localStorage.

## Editor Settings

### Font Configuration
- **Font Family**: Choose from popular monospace fonts including JetBrains Mono, Fira Code, Source Code Pro, Monaco, Consolas, and system defaults
- **Font Size**: Adjustable from 10px to 24px with real-time preview

### Theme Configuration
- **Editor Theme**: Select from 50+ CodeMirror themes including Material, Dracula, Monokai, Solarized, and many others
- **UI Theme**: Switch between Dark and Light modes for the application interface

### AI Feedback Toggle
Enable or disable automatic AI feedback analysis. When enabled, the editor analyzes your text in real-time and provides suggestions.

## AI Configuration

### API Credentials
- **API Key**: Enter your API key for your chosen LLM service (Groq, OpenAI, Anthropic, etc.)
- **Custom Base URL**: Optional override for the default API endpoint, useful for custom deployments or proxies

### LLM Service Selection
- **Service Provider**: Choose from built-in providers:
  - Anthropic (Claude models)
  - Google (Gemini models)
  - Groq (Fast inference)
  - Ollama (Local models)
  - OpenAI (GPT models)
- **Model Selection**: Dynamically populated based on selected service and available models

## Custom LLM Services

Add and manage custom AI service providers beyond the built-in options.

### Adding Custom Services
1. Click the **+** button in the Custom LLM Services section
2. Enter a **Service Name** (e.g., "My Custom Service")
3. Provide a **Service Key** (lowercase letters, numbers, and hyphens only)
4. Optionally specify a **Base URL** for the API endpoint
5. Click **Add Service** to save

### Managing Custom Services
- View all configured custom services with their keys and URLs
- Delete services by clicking the **×** button
- Custom services appear in the main LLM Service dropdown alongside built-in providers

## Custom Variables

Create reusable variables that can be used in prompts using `{variable_name}` syntax.

### Adding Variables
1. Click the **+** button in the Custom Variables section
2. Enter a **Variable Name** (letters, numbers, underscores, and hyphens)
3. Provide the **Value** (can be a word, sentence, or paragraph)
4. Optionally add a **Description** for reference
5. Click **Add Variable** to save

### Using Variables in Prompts
Reference variables in your prompts using curly braces: `{my_variable_name}`

### Managing Variables
- **Edit**: Click the edit button (✏️) to modify existing variables
- **Duplicate**: Click the duplicate button (📋) to create a copy
- **Delete**: Click the × button to remove variables

## Import / Export

Backup and restore your settings, prompts, and AI history.

### Storage Statistics
View current storage usage including:

- Number of stored settings
- Total prompts and groups
- AI call history count
- Storage size information

### Export Options
- **Export All Data**: Download a complete backup including settings, prompts, groups, and AI history
- **Import Default Prompts**: Load a curated set of useful prompts for common writing tasks

### Import Options
- **Import Data**: Restore from a backup file with options to:
  - Overwrite existing data or merge with current data
  - Selectively import Settings, Prompts & Groups, or AI History
- **Reset All Data**: Clear all stored data and return to defaults

## Section Management

### Collapsible Sections
All settings sections can be collapsed or expanded for better organization:

- Click the **▼** button next to any section header to toggle visibility
- Section states are automatically saved and restored between sessions

### Available Sections
1. **Editor Settings**: Font, theme, and AI feedback configuration
2. **AI Configuration**: API keys, service selection, and model settings
3. **Custom LLM Services**: Add and manage custom AI providers
4. **Custom Variables**: Create reusable prompt variables
5. **Import / Export**: Data backup and restoration tools

## Tips

- **Auto-save**: All settings are automatically saved as you make changes
- **Validation**: Real-time validation for API keys and service configurations
- **Model Loading**: Model lists are dynamically fetched based on your selected service and API key
- **Service Keys**: Custom service keys must use lowercase letters, numbers, and hyphens only
- **Variable Names**: Variable names must start with a letter or underscore and contain only letters, numbers, underscores, and hyphens
- **Error Handling**: Clear error messages for configuration issues like invalid API keys or connection problems
