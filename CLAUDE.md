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

- **AIService.js** - Handles direct LLM API calls via LLM.js with progressive loading and parallel execution
- **FileSystemManager.js** - File System Access API integration with directory selection and file operations
- **EditorManager.js** - CodeMirror wrapper with syntax highlighting and file management
- **UIManager.js** - Handles all UI state, mobile navigation, resizable panels, and tab switching
- **PromptsManager.js** - localStorage-based prompts with CRUD operations
- **NotificationManager.js** - Toast notification system
- **SettingsManager.js** - User preferences management with localStorage persistence
- **TextAnalysisManager.js** - Text analysis with word/sentence completion tracking and callbacks

### Direct LLM API Integration
- Uses LLM.js library for unified API access to multiple providers (Groq, OpenAI, Anthropic, Google)
- API keys configured in Settings tab
- HTML response format for flexible AI feedback display
- Progressive feedback loading with real-time UI updates

### Key Data Flow
1. User types in editor → TextAnalysisManager tracks word/sentence completion
2. AIService schedules debounced analysis for enabled prompts
3. AIService calls LLM APIs directly via LLM.js using user's API key
4. AI responses returned as HTML for flexible display formatting
5. File operations handled directly via File System Access API

### Mobile-Responsive Design
- Desktop: Three-panel layout with resizable sidebars
- Mobile: Single-panel navigation with swipe gestures
- Tab system in AI sidebar separates feedback from prompts
- Touch-optimized interface elements

### Storage and State Management
- File handles cached in FileSystemManager for direct file operations
- Prompts stored in localStorage with JSON serialization
- User settings (fonts, AI toggle, API keys, LLM service/model) managed by SettingsManager with localStorage persistence
- Tab state persistence for AI sidebar navigation
- UI state managed through event-driven component communication
- Editor state includes modification tracking and auto-save indicators

## File System Integration

The app uses the modern File System Access API for direct file operations. Key behaviors:
- Directory selection creates persistent file handles
- File tree rendered from in-memory directory structure
- Search functionality filters files by name and path
- Active file highlighting in tree view

## AI Integration Patterns

### Feedback System
- Debounced text analysis (1-second delay)
- Parallel execution of general + prompt analyses
- Progressive UI updates as each analysis completes
- Grouped display with separate sections per prompt source

### Prompts
- User-created prompts with enable/disable toggle
- Template system using `{text}` placeholder
- Persistent storage with localStorage
- Separate tab in AI sidebar for management

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
- Settings persist in localStorage with automatic UI updates
- Reset to defaults functionality available

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
- Word and sentence completion tracking via TextAnalysisManager
- Configurable callbacks for completion events
- Real-time counting and statistics display
- Debounced analysis to avoid excessive API calls
