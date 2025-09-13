# API Reference

## Core Classes

### AITextEditor
Main application orchestrator class.

```javascript
class AITextEditor {
  constructor()
  initialize()
  cleanup()
}
```

**Methods**:
- `initialize()` - Set up all components and event listeners
- `cleanup()` - Clean up resources and event listeners

### AIService

LLM API integration service.

```javascript
class AIService {
  constructor(dependencies)
  async analyzeText(text, prompts)
  async callLLM(prompt, text, options)
  handleResponse(response, metadata)
}
```

**Methods**:
- `analyzeText(text, prompts)` - Analyze text with multiple prompts
- `callLLM(prompt, text, options)` - Single LLM API call
- `handleResponse(response, metadata)` - Process API response

**Events Emitted**:
- `analysis-started` - When text analysis begins
- `analysis-completed` - When analysis finishes
- `analysis-error` - When analysis fails

### FileSystemManager

File system operations manager.

```javascript
class FileSystemManager {
  constructor(dependencies)
  async selectDirectory()
  async loadFileTree()
  async readFile(fileHandle)
  async writeFile(fileHandle, content)
}
```

**Methods**:
- `selectDirectory()` - Show directory picker
- `loadFileTree()` - Build file tree structure
- `readFile(fileHandle)` - Read file contents
- `writeFile(fileHandle, content)` - Write file contents

**Properties**:
- `currentDirectory` - Currently selected directory handle
- `fileTree` - In-memory file tree structure
- `fileHandles` - Map of file path to file handle

### EditorManager

Code editor management.

```javascript
class EditorManager {
  constructor(dependencies)
  initializeEditor(container)
  loadFile(content, language)
  getContent()
  setLanguage(language)
}
```

**Methods**:
- `initializeEditor(container)` - Initialize CodeMirror
- `loadFile(content, language)` - Load file with syntax highlighting
- `getContent()` - Get current editor content
- `setLanguage(language)` - Set syntax highlighting language

**Events Emitted**:
- `content-changed` - When editor content changes
- `file-loaded` - When new file is loaded
- `cursor-moved` - When cursor position changes

## Manager APIs

### SettingsManager

User settings management.

```javascript
class SettingsManager {
  getSetting(key, defaultValue)
  setSetting(key, value)
  getSettings()
  setSettings(settings)
  resetToDefaults()
}
```

**Available Settings**:
```javascript
{
  fontFamily: 'JetBrains Mono',
  fontSize: 14,
  aiEnabled: true,
  apiKey: '',
  llmService: 'groq',
  llmModel: '',
  theme: 'auto'
}
```

### PromptsManager

Custom prompt management.

```javascript
class PromptsManager {
  createPrompt(name, content)
  updatePrompt(id, updates)
  deletePrompt(id)
  getPrompts()
  togglePrompt(id, enabled)
  processTemplate(template, variables)
}
```

**Prompt Object Structure**:
```javascript
{
  id: 'uuid',
  name: 'Prompt Name',
  content: 'Analyze this {text}',
  enabled: true,
  created: timestamp,
  modified: timestamp
}
```

### HistoryManager

LLM call history management.

```javascript
class HistoryManager {
  recordCall(prompt, response, metadata)
  getHistory(options)
  searchHistory(query, options)
  deleteHistory(filters)
  exportHistory(format)
}
```

**History Options**:
```javascript
{
  limit: 50,
  offset: 0,
  startDate: Date,
  endDate: Date,
  service: 'groq',
  fileFilter: 'filename.txt'
}
```

## Event System

### EventBus

Central event communication system.

```javascript
class EventBus {
  subscribe(event, callback)
  unsubscribe(event, callback)
  publish(event, data)
  clear()
}
```

### Standard Events

#### File Events
- `file-selected` - File selected in tree
- `file-opened` - File loaded in editor
- `file-saved` - File saved to disk
- `directory-changed` - Working directory changed

#### Editor Events
- `content-changed` - Editor content modified
- `cursor-moved` - Cursor position changed
- `language-changed` - Syntax highlighting changed

#### AI Events
- `analysis-requested` - Text analysis requested
- `analysis-started` - Analysis began processing
- `analysis-completed` - Analysis finished
- `analysis-error` - Analysis failed

#### UI Events
- `theme-changed` - UI theme switched
- `panel-resized` - Panel dimensions changed
- `tab-switched` - Sidebar tab changed
- `mobile-nav-toggled` - Mobile navigation state

## Data Structures

### File Tree Node
```javascript
{
  name: 'filename.txt',
  path: '/path/to/file',
  type: 'file' | 'directory',
  handle: FileSystemFileHandle,
  children: FileTreeNode[], // for directories
  size: 1024,
  modified: Date
}
```

### LLM Call Record
```javascript
{
  id: 'uuid',
  timestamp: Date,
  service: 'groq',
  model: 'llama-3.1-70b',
  prompt: 'Analyze this text...',
  response: 'The text shows...',
  metadata: {
    filename: 'document.txt',
    wordCount: 150,
    responseTime: 1250
  }
}
```

### Analysis Result
```javascript
{
  prompt: 'Grammar check',
  response: '<div>Analysis...</div>',
  timestamp: Date,
  service: 'groq',
  error: null | Error,
  metadata: {
    processingTime: 800,
    tokenCount: 45
  }
}
```

## Storage APIs

### LocalStorage Keys
- `ai-text-editor-settings` - User settings
- `ai-text-editor-prompts` - Custom prompts
- `ai-text-editor-session` - Session state

### IndexedDB Schema
- **Database**: `ai-text-editor`
- **Version**: 1
- **Stores**:
  - `llm-calls` - LLM interaction history
  - `usage-metrics` - Application usage data

## Error Handling

### Error Types
```javascript
class AIServiceError extends Error {
  constructor(message, code, service) {
    super(message);
    this.code = code;
    this.service = service;
  }
}

class FileSystemError extends Error {
  constructor(message, operation, filename) {
    super(message);
    this.operation = operation;
    this.filename = filename;
  }
}
```

### Error Codes
- `API_KEY_MISSING` - No API key configured
- `API_KEY_INVALID` - Invalid API key
- `RATE_LIMITED` - API rate limit exceeded
- `NETWORK_ERROR` - Network connectivity issue
- `FILE_NOT_FOUND` - File system access error
- `PERMISSION_DENIED` - File system permission error