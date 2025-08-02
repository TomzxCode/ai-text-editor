# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Text Editor is a modern, web-based text editor with integrated AI assistance powered by Claude AI. It features a responsive three-panel design: file explorer, code editor, and AI recommendations sidebar with tabbed interface.

## Development Commands

### Backend (FastAPI + Claude CLI)
```bash
# Install dependencies
uv sync

# Run development server
uv run uvicorn backend:app --reload --host 0.0.0.0 --port 8000

# Code formatting
uv run black .
uv run isort .

# Linting
uv run flake8 .
```

### Prerequisites
- Python 3.12+
- Claude CLI installed and authenticated (`claude --help` should work)
- Modern browser (Chrome/Edge recommended for File System Access API)

## Architecture Overview

### Core Application Structure
- **script.js** - Main AITextEditor class that orchestrates all components
- **backend.py** - FastAPI server with Claude CLI subprocess integration
- **index.html** - Three-panel responsive layout with tabbed AI sidebar
- **components/** - Modular ES6 classes for different functionality areas

### Component Architecture Pattern
The frontend uses a manager-based component pattern where each major functionality area has its own class:

- **AIService.js** - Handles all AI API calls with progressive loading and parallel execution
- **FileSystemManager.js** - File System Access API integration with directory selection and file operations
- **EditorManager.js** - CodeMirror wrapper with syntax highlighting and file management
- **UIManager.js** - Handles all UI state, mobile navigation, resizable panels, and tab switching
- **CustomPromptsManager.js** - localStorage-based custom prompts with CRUD operations
- **NotificationManager.js** - Toast notification system
- **SettingsManager.js** - User preferences management with localStorage persistence

### Frontend-Backend Communication
- REST endpoints: `/analyze-text`, `/improve-text`, `/summarize-text`, `/analyze-custom-prompt`
- Backend uses subprocess calls to Claude CLI for AI operations
- Progressive recommendation loading with real-time UI updates
- Grouped recommendations by prompt source (General + custom prompts)

### Key Data Flow
1. User types in editor → AIService schedules debounced analysis
2. AIService calls multiple APIs in parallel (general + custom prompts)
3. Backend processes each request via Claude CLI subprocess
4. Progressive results update UI with grouped recommendations
5. File operations go through FileSystemManager → backend → file system

### Mobile-Responsive Design
- Desktop: Three-panel layout with resizable sidebars
- Mobile: Single-panel navigation with swipe gestures
- Tab system in AI sidebar separates recommendations from custom prompts
- Touch-optimized interface elements

### Storage and State Management
- File handles cached in FileSystemManager for direct file operations
- Custom prompts stored in localStorage with JSON serialization
- User settings (fonts, AI toggle) managed by SettingsManager with localStorage persistence
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

### Recommendation System
- Debounced text analysis (1-second delay)
- Parallel execution of general + custom prompt analyses
- Progressive UI updates as each analysis completes
- Grouped display with separate sections per prompt source

### Custom Prompts
- User-created prompts with enable/disable toggle
- Template system using `{text}` placeholder
- Persistent storage with localStorage
- Separate tab in AI sidebar for management

### Error Handling
- Graceful degradation when Claude CLI unavailable
- Connection error recommendations with retry suggestions
- Fallback recommendations when JSON parsing fails
- AI recommendations can be toggled on/off via settings

### Settings System
- Configurable font family and size for editor
- AI recommendations toggle (enable/disable)
- Settings persist in localStorage with automatic UI updates
- Reset to defaults functionality available

## Development Notes

### When Adding New Components
- Create ES6 class in components/ directory
- Initialize in AITextEditor constructor
- Use event-driven communication pattern
- Add cleanup methods for timers/listeners

### When Modifying AI Features
- Test with and without Claude CLI available
- Ensure progressive loading continues to work
- Update both grouped and fallback recommendation formats
- Maintain backward compatibility for recommendation display

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