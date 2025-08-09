# AI Text Editor

A modern web-based text editor with AI-powered suggestions and improvements using Claude AI.

## Features

- 📝 Full-featured code editor with syntax highlighting
- 🤖 AI-powered text analysis and feedback
- ✨ Smart text improvement suggestions
- 📊 Real-time text statistics
- 📱 Mobile-responsive design
- 💾 File system integration (File System Access API)

## Setup Instructions

### Backend Setup

1. **Install uv (if not already installed):**
   ```bash
   # macOS and Linux
   curl -LsSf https://astral.sh/uv/install.sh | sh

   # Windows
   powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

   # Or with pip
   pip install uv
   ```

2. **Install Python dependencies:**
   ```bash
   # Install dependencies with uv
   uv sync

   # Or install in current environment
   uv pip install -e .
   ```

3. **Install Claude CLI (if not already installed):**
   ```bash
   # Install Claude CLI
   pip install claude-cli

   # Or follow instructions at: https://claude.ai/cli
   ```

4. **Start the application:**
   ```bash
   # Using uv to run
   uv run python backend.py

   # Or activate the environment and run
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   python backend.py
   ```

   The application will be available at `http://localhost:8000`

### Usage

1. **Access the application:** Open `http://localhost:8000` in your web browser
2. **For best experience:** Use Chrome/Edge (File System Access API support)

## API Endpoints

### `POST /analyze-text`
Analyzes text and provides improvement feedback.

**Request:**
```json
{
  "text": "Your text here",
}
```

**Response:**
```json
{
  "feedback": [
    {
      "category": "Style",
      "suggestion": "Consider using more active voice",
      "priority": "medium"
    }
  ],
  "word_count": 42,
  "character_count": 250
}
```

### `POST /improve-text`
Improves the provided text using AI.

**Request:**
```json
{
  "text": "Your text to improve"
}
```

**Response:**
```json
{
  "improved_text": "Your improved text"
}
```

### `POST /summarize-text`
Generates a summary of the provided text.

**Request:**
```json
{
  "text": "Long text to summarize"
}
```

**Response:**
```json
{
  "summary": "Brief summary of the text"
}
```

## How to Use

1. **Start the application:** Run `uv run python backend.py` and open `http://localhost:8000`
2. **Select a Directory:** Click "Select Directory" to choose a folder to work with
3. **Edit Files:** Click on any file in the tree to open it in the editor
4. **AI Feedback:** Start typing to receive real-time AI suggestions
5. **Improve Text:** Use the "Improve Text" button to enhance your writing
6. **Summarize:** Generate summaries with the "Summarize" button

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
├── script.js           # Frontend JavaScript
├── styles.css          # CSS styles
├── backend.py          # FastAPI backend
├── pyproject.toml      # Python project configuration
└── README.md          # This file
```

### Development Commands

```bash
# Install development dependencies
uv sync --dev

# Run with auto-reload for development
uv run uvicorn backend:app --reload --host 0.0.0.0 --port 8000

# Format code
uv run black .
uv run isort .

# Lint code
uv run flake8 .

# Run tests (when available)
uv run pytest
```

### Key Technologies
- **Frontend:** Vanilla JavaScript, CodeMirror, File System Access API
- **Backend:** FastAPI, Claude CLI
- **Styling:** Modern CSS with dark theme

## Prerequisites

- **Claude CLI:** The application uses the Claude CLI instead of API keys
- **Python 3.12+:** Required for the backend
- **Modern Browser:** Chrome/Edge recommended for File System Access API

## Troubleshooting

### Claude CLI Issues
- **"Claude CLI not found":** Make sure Claude CLI is installed and available in your PATH
- **Authentication:** Ensure you're logged in to Claude CLI with `claude auth login`
- **Timeouts:** Large text requests may take longer; the system has a 30-second timeout

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
