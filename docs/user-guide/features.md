# Features

## Editor Features

### File Management
- Direct file system access via modern APIs
- File tree navigation with search
- Persistent file handles for quick access

## AI Integration

### Real-time Feedback
- Debounced text analysis (1-second delay)
- Progressive UI updates as analysis completes
- Support for multiple LLM providers

### Custom Prompts
- User-created prompts with templates
- Enable/disable individual prompts
- Template variables: `{text}`, `{sentence}`, `{word}`, `{paragraph}`

### Supported LLM Providers
- Anthropic
- Google
- Groq
- OpenAI

It is possible to define custom LLM providers (e.g., Poe).

Support for Ollama (local models).

## User Interface

### Responsive Design
- Three-panel desktop layout
- Mobile-optimized single-panel navigation
- Resizable sidebars
- Touch-friendly interface

### Theme System
- Dark and light mode support
- Automatic theme switching
- Consistent styling across components
- Customizable font family and size

### Notifications
- Toast notification system
- Error handling with user feedback
- Connection status indicators

## Data Management

### Settings Persistence
- All preferences saved to localStorage
- Import/export settings for backup
- Reset to defaults option

### History Tracking
- Complete LLM call history
- Timeline and file-based views
- Search and filtering capabilities
- Persistent storage via IndexedDB

### Session Management
- Application state persistence
- Automatic restoration on reload
- Tab state memory
