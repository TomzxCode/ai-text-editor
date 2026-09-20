# AI Text Editor

A modern, frontend-only web-based text editor with integrated AI assistance using direct LLM API calls.

## Features

### Core Functionality
- 📝 **Full-featured code editor** with CodeMirror and syntax highlighting for 100+ languages
- 🤖 **AI-powered text analysis** with real-time feedback using configurable custom prompts
- 📊 **Advanced text analytics** including word/sentence/paragraph completion tracking
- 💾 **Local file system integration** via File System Access API (Chrome/Edge)
- 📱 **Mobile-responsive design** with touch-optimized three-panel layout

### AI Integration
- ⚙️ **Multiple LLM providers** (Groq, OpenAI, Anthropic, Google) via LLM.js
- 🎯 **Custom prompt system** with template placeholders (`{text}`, `{sentence}`, `{word}`, `{paragraph}`)
- 🔄 **Progressive feedback loading** with parallel AI analysis execution
- 📈 **Usage tracking** and API call monitoring with detailed analytics
- 🎨 **Flexible response formatting** supporting HTML output for rich feedback display

### User Experience
- 🌙 **Dark/light theme switching** with persistent preferences
- 💾 **Session persistence** and automatic state restoration
- 📤 **Import/Export functionality** for settings, prompts, and session data
- 🔍 **Advanced inspection tools** for detailed text analysis
- 📋 **Context menus** and keyboard shortcuts for enhanced productivity
- 🚀 **PWA support** - installable as a desktop/mobile app

## Setup Instructions

### Frontend-Only Setup

1. **Serve the application using any simple HTTP server:**
   ```bash
   # Python option:
   python -m http.server 8000

   # Node.js option:
   npx serve .

   # Or deploy to static hosting (Netlify, Vercel, GitHub Pages)
   ```

2. **Configure API keys:**
   - Open the application in your browser
   - Go to Settings tab
   - Add your API key for your preferred LLM service (Groq, OpenAI, Anthropic, etc.)
   - Select your LLM provider and model

### Usage

1. **Access the application:** Open `http://localhost:8000` in your web browser
2. **For best experience:** Use Chrome/Edge (File System Access API support)
3. **Configure AI:** Add your API key in Settings to enable AI features

## AI Integration

The application uses direct LLM API calls via the LLM.js library, supporting multiple providers:

- **Groq:** Fast inference with Llama and Mixtral models
- **OpenAI:** GPT-3.5, GPT-4 models
- **Anthropic:** Claude models
- **Google:** Gemini models

### Custom Prompts

Create sophisticated analysis prompts in the Prompts tab:
- **Template placeholders**: `{text}`, `{sentence}`, `{word}`, `{paragraph}` for dynamic content insertion
- **Individual control**: Enable/disable prompts independently
- **Persistent storage**: Prompts saved locally in browser localStorage
- **Feedback association**: AI responses automatically linked to triggering prompts
- **Prompt palette**: Quick access interface for frequently used prompts

## How to Use

1. **Start the application:** Serve files with any HTTP server and open in browser
2. **Configure AI:** Add your API key in Settings tab and select LLM provider
3. **Select a Directory:** Click "Select Directory" to choose a folder to work with
4. **Edit Files:** Click on any file in the tree to open it in the editor
5. **AI Feedback:** Start typing to receive real-time AI analysis (if enabled)
6. **Custom Prompts:** Create and manage custom analysis prompts in the Prompts tab

## Browser Compatibility

- ✅ Chrome/Chromium (recommended)
- ✅ Edge
- ⚠️ Firefox (limited file system access)
- ⚠️ Safari (limited file system access)

## Development

### Project Structure
```
ai-text-editor/
├── index.html          # Main HTML file with responsive three-panel layout
├── script.js           # Main application orchestrator (AITextEditor class)
├── styles.css          # Modern CSS with responsive design and dark/light themes
├── manifest.json       # PWA manifest for installable web app
├── sw.js              # Service worker for PWA functionality
├── components/         # Modular ES6 components (20+ specialized managers)
│   ├── AIService.js    # Direct LLM API integration via LLM.js
│   ├── EditorManager.js    # CodeMirror wrapper with syntax highlighting
│   ├── FileSystemManager.js    # File System Access API integration
│   ├── UIManager.js    # UI state, mobile navigation, resizable panels
│   ├── PromptsManager.js   # Custom prompts with template system
│   ├── SettingsManager.js  # User preferences and localStorage persistence
│   ├── NotificationManager.js  # Toast notification system
│   ├── TextAnalysisManager.js  # Real-time text analysis and completion tracking
│   ├── ThemeManager.js # Dark/light theme switching
│   ├── ImportExportManager.js  # Data import/export functionality
│   ├── HistoryManager.js   # Editor history and version tracking
│   ├── SessionManager.js   # Session persistence and restoration
│   ├── UsageTracker.js # API usage monitoring and analytics
│   ├── InspectManager.js   # Advanced text inspection tools
│   ├── FeedbackAssociationManager.js  # AI feedback organization
│   ├── PromptPaletteManager.js # Quick prompt access interface
│   ├── ContextMenuManager.js   # Right-click context menus
│   ├── SearchableDropdown.js   # Enhanced dropdown components
│   ├── SentenceDataModel.js    # Sentence-level data modeling
│   └── LLMCallStorage.js   # LLM API call logging and storage
├── icons/             # PWA icons for app installation
├── test-*.html        # Testing and debugging utilities
├── AGENTS.md          # Comprehensive development guidelines
└── README.md          # This file
```

### Development Commands

```bash
# Serve files using any simple HTTP server
# Python option:
python -m http.server 8000

# Node.js option:
npx serve .

# Or deploy to static hosting (Netlify, Vercel, GitHub Pages)
```

### Key Technologies
- **Frontend:** Vanilla JavaScript ES6 modules with component-based architecture
- **Editor:** CodeMirror 5.65.16 with extensive theme and language support
- **AI Integration:** LLM.js library for unified multi-provider API access
- **File System:** File System Access API for direct local file operations
- **Storage:** localStorage for persistent settings, prompts, and session data
- **PWA:** Service worker with manifest for app-like installation experience
- **Styling:** Modern CSS Grid/Flexbox with comprehensive theming system

## Prerequisites

- **API Key:** Your chosen LLM service (Groq, OpenAI, Anthropic, etc.)
- **Modern Browser:** Chrome/Edge recommended for File System Access API
- **HTTP Server:** Any simple server for local development

## Troubleshooting

### API Issues
- **"Invalid API key":** Verify API key configuration in Settings tab
- **CORS errors:** Some LLM providers may have CORS restrictions for browser requests
- **Rate limiting:** Monitor usage with built-in analytics to avoid exceeding provider limits
- **Timeouts:** Large text analysis requests may take longer; check progressive loading indicators
- **Provider outages:** Switch between multiple configured LLM providers for redundancy

### File System Issues
- **Permission denied:** Re-grant directory access permissions in browser settings
- **Files not appearing:** Refresh file tree or re-select directory
- **Save failures:** Check file permissions and available storage space

### Performance Issues
- **Slow AI responses:** Consider switching to faster providers like Groq for real-time analysis
- **Memory usage:** Large files may impact browser performance; consider breaking into smaller sections
- **Storage limits:** Regular export of settings/prompts recommended for backup

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
