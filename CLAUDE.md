# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Text Editor is a modern, frontend-only web-based text editor with integrated AI assistance. It features a responsive three-panel design: file explorer, code editor, and AI feedback sidebar with tabbed interface.

## Development Commands

### Prerequisites
- Modern browser (Chrome/Edge recommended for File System Access API)
- API key for your chosen LLM service (Groq, OpenAI, Anthropic, etc.)
- Simple HTTP server for local development

## Architecture Overview

### Core Application Structure
- **script.js** - Main AITextEditor class that orchestrates all components
- **index.html** - Three-panel responsive layout with tabbed AI sidebar
- **components/** - Modular ES6 classes for different functionality areas
- **LLM.js** - Direct LLM API integration via CDN

### Component Architecture Pattern
The frontend uses a manager-based component pattern where each major functionality area has its own class:

#### Core Managers
- **AIService.js** - Handles direct LLM API calls via LLM.js with progressive loading and parallel execution
- **FileSystemManager.js** - File System Access API integration with directory selection and file operations
- **EditorManager.js** - CodeMirror wrapper with syntax highlighting and file management
- **UIManager.js** - Handles all UI state, mobile navigation, resizable panels, and tab switching
- **SettingsManager.js** - User preferences management with localStorage persistence
- **NotificationManager.js** - Toast notification system
- **TextAnalysisManager.js** - Text analysis with word/sentence completion tracking and callbacks

#### Feature Managers
- **PromptsManager.js** - localStorage-based prompts with CRUD operations
- **PromptPaletteManager.js** - Quick prompt selection and management interface
- **ThemeManager.js** - UI theme management (dark/light mode) with automatic application
- **HistoryManager.js** - LLM call history tracking, viewing, and search functionality
- **ImportExportManager.js** - Data import/export with cloud provider integration support
- **SessionManager.js** - Session state management and persistence
- **InspectManager.js** - Code inspection and analysis tools
- **FeedbackAssociationManager.js** - Associates AI feedback with specific text segments
- **ContextMenuManager.js** - Right-click context menu functionality

#### Utility Components
- **LLMCallStorage.js** - Persistent storage for LLM API call history and responses
- **SentenceDataModel.js** - Data model for sentence-level text analysis and tracking
- **SearchableDropdown.js** - Reusable dropdown component with search functionality
- **UsageTracker.js** - Tracks application usage metrics and statistics

### Direct LLM API Integration
- Uses LLM.js library for unified API access to multiple providers (Groq, OpenAI, Anthropic, Google)
- API keys configured in Settings tab
- HTML response format for flexible AI feedback display
- Progressive feedback loading with real-time UI updates

### Key Data Flow
1. User types in editor → TextAnalysisManager tracks word/sentence/paragraph completion
2. AIService schedules debounced analysis for enabled prompts
3. AIService calls LLM APIs directly via LLM.js using user's API key
4. AI responses returned as HTML for flexible display formatting
5. FeedbackAssociationManager associates responses with specific text segments
6. LLMCallStorage persists all interactions for history tracking
7. File operations handled directly via File System Access API

### Mobile-Responsive Design
- Desktop: Three-panel layout with resizable sidebars
- Mobile: Single-panel navigation with swipe gestures
- Tab system in AI sidebar separates feedback from prompts
- Touch-optimized interface elements

### Storage and State Management
- File handles cached in FileSystemManager for direct file operations
- Prompts stored in localStorage with JSON serialization
- User settings (fonts, AI toggle, API keys, LLM service/model, UI theme) managed by SettingsManager with localStorage persistence
- LLM call history stored persistently via LLMCallStorage with IndexedDB
- Session state managed by SessionManager for application state restoration
- Tab state persistence for AI sidebar navigation
- UI state managed through event-driven component communication
- Editor state includes modification tracking and auto-save indicators
- Usage metrics tracked by UsageTracker for analytics

## File System Integration

The app uses the modern File System Access API for direct file operations. Key behaviors:
- Directory selection creates persistent file handles
- File tree rendered from in-memory directory structure
- Search functionality filters files by name and path
- Active file highlighting in tree view

## Data Management

### History and Session Management
- **HistoryManager** provides comprehensive LLM call history with timeline, file-based, and search views
- **SessionManager** handles application state persistence and restoration
- **LLMCallStorage** uses IndexedDB for efficient storage of large interaction datasets
- Pagination support for large history datasets
- Advanced search and filtering capabilities

### Import/Export System
- **ImportExportManager** supports data backup and migration
- Cloud provider integration support (Google Drive, Dropbox, OneDrive)
- Settings and prompts can be exported/imported as JSON
- Version control for export format compatibility
- Selective import/export options

## AI Integration Patterns

### Feedback System
- Debounced text analysis (1-second delay)
- Parallel execution of general + prompt analyses
- Progressive UI updates as each analysis completes
- Grouped display with separate sections per prompt source

### Prompts
- User-created prompts with enable/disable toggle
- Template system using `{text}`, `{sentence}`, `{word}`, and `{paragraph}` placeholders
- Persistent storage with localStorage
- Separate tab in AI sidebar for management
- Prompt palette for quick selection and application
- Import/export functionality for sharing prompt collections

### Error Handling
- Graceful degradation when LLM API unavailable or misconfigured
- Connection error feedback with retry suggestions
- API key validation and error messages
- HTML error responses with formatted display
- AI feedback can be toggled on/off via settings

### Settings System
- Configurable font family and size for editor
- AI feedback toggle (enable/disable)
- API key management for LLM services
- LLM service and model selection (Groq, OpenAI, Anthropic, Google)
- UI theme selection (dark/light mode) with automatic switching
- Settings persist in localStorage with automatic UI updates
- Reset to defaults functionality available
- Import/export settings for backup and sharing

## Development Notes

### When Adding New Components
- Create ES6 class in components/ directory
- Initialize in AITextEditor constructor
- Use event-driven communication pattern
- Add cleanup methods for timers/listeners

### When Modifying AI Features
- Test with and without valid API keys configured
- Test with different LLM providers (Groq, OpenAI, etc.)
- Ensure progressive loading continues to work
- Handle both HTML and fallback response formats
- Maintain backward compatibility for feedback display
- Consider rate limiting and API costs when making changes
- Handle CORS limitations when adding new providers
- **IMPORTANT**: Always consult the LLM.js documentation at https://llmjs.themaximalist.com/ for correct parameter names, configuration options, and API usage patterns before making changes to LLM integration code

### When Working with File Operations
- Use FileSystemManager for all file operations
- Check FileSystemManager.supportsFileSystemAccess before using APIs
- Handle permission errors gracefully
- Update file tree after file system changes

### When Working with Settings
- Use SettingsManager for all user preference operations
- Settings automatically persist to localStorage
- UI updates are handled through onChange callbacks
- Always provide default values for new settings

### Mobile Considerations
- Test swipe gestures on touch devices
- Ensure tab switching works on mobile
- Verify responsive layout breakpoints
- Test touch targets meet accessibility standards

### Text Analysis Features
- Word, sentence, and paragraph completion tracking via TextAnalysisManager
- Advanced sentence data modeling with SentenceDataModel for granular analysis
- Configurable callbacks for completion events
- Real-time counting and statistics display
- Debounced analysis to avoid excessive API calls
- Historical tracking of all LLM interactions via LLMCallStorage
- Feedback association with specific text segments for context-aware analysis
- Inspection tools for detailed code and text analysis

### Theme and UI Management
- **ThemeManager** handles automatic theme switching between dark and light modes
- CSS custom properties for consistent theming across components
- Responsive design with mobile-first approach
- Context menu system for enhanced user interaction
- Searchable dropdown components for improved UX

### Usage Analytics
- **UsageTracker** monitors application usage patterns
- Privacy-focused analytics with local storage
- Performance metrics for optimization insights
- Feature usage statistics for development prioritization

### When Working with History and Sessions
- Use HistoryManager for all LLM call history operations
- SessionManager handles state persistence automatically
- LLMCallStorage provides efficient IndexedDB operations
- Always implement pagination for large datasets
- Consider memory usage when loading historical data

### When Working with Import/Export
- Use ImportExportManager for all data migration operations
- Maintain backward compatibility for export formats
- Handle cloud provider authentication gracefully
- Provide clear user feedback for import/export operations
- Validate imported data before applying changes

### When Working with Themes
- Use ThemeManager for all theme-related operations
- Test both dark and light themes thoroughly
- Ensure contrast ratios meet accessibility standards
- Use CSS custom properties for theme-aware styling
- Handle theme transitions smoothly

### When Working with Context Menus
- Use ContextMenuManager for consistent menu behavior
- Ensure menu items are contextually relevant
- Handle keyboard navigation properly
- Test on both desktop and mobile devices
- Position menus appropriately to avoid viewport issues
