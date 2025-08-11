# AI Text Editor

A modern, frontend-only web-based text editor with integrated AI assistance using direct LLM API calls.

## Features

- 📝 Full-featured code editor with syntax highlighting
- 🤖 AI-powered text analysis and feedback with configurable prompts
- 📊 Real-time text statistics and completion tracking
- ⚙️ Configurable LLM providers (Groq, OpenAI, Anthropic, Google)
- 📱 Mobile-responsive design
- 💾 File system integration (File System Access API)

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

Create custom analysis prompts in the Prompts tab:
- Use `{text}` placeholder for dynamic text insertion
- Enable/disable prompts individually
- Prompts are stored locally in browser storage

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
├── index.html          # Main HTML file
├── script.js           # Main application orchestrator
├── styles.css          # CSS styles
├── components/         # Modular ES6 components
│   ├── AIService.js    # Direct LLM API integration
│   ├── EditorManager.js    # CodeMirror wrapper
│   ├── FileSystemManager.js    # File System Access API
│   ├── UIManager.js    # UI state and mobile navigation
│   ├── PromptsManager.js   # Custom prompts management
│   ├── SettingsManager.js  # User preferences
│   ├── NotificationManager.js  # Toast notifications
│   └── TextAnalysisManager.js  # Text analysis and tracking
├── CLAUDE.md          # Development guidelines
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
- **Frontend:** Vanilla JavaScript ES6 modules, CodeMirror editor
- **AI Integration:** LLM.js library for direct API calls
- **File System:** File System Access API for local file operations
- **Storage:** localStorage for settings and prompts
- **Styling:** Modern CSS with responsive design

## Prerequisites

- **API Key:** Your chosen LLM service (Groq, OpenAI, Anthropic, etc.)
- **Modern Browser:** Chrome/Edge recommended for File System Access API
- **HTTP Server:** Any simple server for local development

## Troubleshooting

### API Issues
- **"Invalid API key":** Check your API key configuration in Settings
- **CORS errors:** Some LLM providers may have CORS restrictions
- **Rate limiting:** Be mindful of API rate limits with your provider
- **Timeouts:** Large text requests may take longer

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
