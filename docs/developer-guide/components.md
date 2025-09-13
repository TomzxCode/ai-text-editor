# Components

## Manager Classes

### Core Managers

#### AIService
**Location**: `components/AIService.js`

**Purpose**: Handles direct LLM API calls and response processing

**Key Methods**:
- `analyzeText(text, prompts)` - Process text with multiple prompts
- `callLLM(prompt, text)` - Single LLM API call
- `handleResponse(response)` - Process and format responses

**Dependencies**: LLM.js, SettingsManager

#### FileSystemManager
**Location**: `components/FileSystemManager.js`

**Purpose**: File system integration and directory management

**Key Methods**:
- `selectDirectory()` - Directory picker interface
- `loadFileTree()` - Build in-memory file structure
- `readFile(handle)` - Read file contents
- `writeFile(handle, content)` - Save file changes

**Browser Support**: Requires File System Access API

#### EditorManager
**Location**: `components/EditorManager.js`

**Purpose**: CodeMirror integration and editor functionality

**Key Methods**:
- `initializeEditor()` - Set up CodeMirror instance
- `loadFile(content, language)` - Load content with syntax highlighting
- `getContent()` - Retrieve current editor content
- `setTheme(theme)` - Apply editor theme

**Dependencies**: CodeMirror library

#### UIManager
**Location**: `components/UIManager.js`

**Purpose**: UI state and responsive layout management

**Key Methods**:
- `initializePanels()` - Set up resizable panels
- `toggleMobileNav()` - Mobile navigation state
- `switchTab(tabName)` - AI sidebar tab switching
- `updateLayout()` - Responsive layout updates

### Feature Managers

#### PromptsManager
**Location**: `components/PromptsManager.js`

**Purpose**: Custom prompt management and processing

**Key Methods**:
- `createPrompt(name, content)` - Add new prompt
- `processTemplate(template, variables)` - Variable substitution
- `togglePrompt(id, enabled)` - Enable/disable prompts
- `exportPrompts()` - Data export functionality

**Storage**: localStorage with JSON serialization

#### HistoryManager
**Location**: `components/HistoryManager.js`

**Purpose**: LLM interaction history and analytics

**Key Methods**:
- `recordCall(prompt, response, metadata)` - Store interaction
- `getHistory(filters)` - Retrieve filtered history
- `searchHistory(query)` - Full-text search
- `exportHistory()` - Data export with pagination

**Storage**: IndexedDB for efficient large dataset handling

#### ThemeManager
**Location**: `components/ThemeManager.js`

**Purpose**: UI theme management and switching

**Key Methods**:
- `setTheme(theme)` - Apply theme (dark/light/auto)
- `detectSystemTheme()` - System preference detection
- `updateCSSProperties()` - CSS custom property updates
- `handleThemeChange()` - System theme change listener

## Utility Components

#### SearchableDropdown
**Location**: `components/SearchableDropdown.js`

**Purpose**: Reusable dropdown with search functionality

**Usage**:
```javascript
const dropdown = new SearchableDropdown({
  container: element,
  options: ['Option 1', 'Option 2'],
  onSelect: (value) => console.log(value)
});
```

#### UsageTracker
**Location**: `components/UsageTracker.js`

**Purpose**: Application usage analytics and metrics

**Key Methods**:
- `trackEvent(event, metadata)` - Record user actions
- `getUsageStats()` - Retrieve usage statistics
- `exportMetrics()` - Analytics data export

**Privacy**: All data stored locally, no external transmission

## Data Models

#### SentenceDataModel
**Location**: `components/SentenceDataModel.js`

**Purpose**: Sentence-level text analysis and tracking

**Properties**:
```javascript
{
  id: 'unique-id',
  text: 'sentence content',
  wordCount: 12,
  startPosition: 0,
  endPosition: 65,
  analysis: {},
  timestamp: Date.now()
}
```

## Component Lifecycle

### Initialization Pattern
```javascript
class Manager {
  constructor(dependencies) {
    this.dependencies = dependencies;
    this.eventBus = dependencies.eventBus;
    this.initialize();
  }

  initialize() {
    this.setupEventListeners();
    this.loadPersistedState();
  }

  cleanup() {
    this.removeEventListeners();
    this.saveState();
  }
}
```

### Event System
Components use a centralized event bus for communication:

```javascript
// Subscribe to events
eventBus.subscribe('file-opened', this.handleFileOpen.bind(this));

// Publish events
eventBus.publish('theme-changed', { theme: 'dark' });

// Cleanup
eventBus.unsubscribe('file-opened', this.handleFileOpen);
```

## Adding New Components

### 1. Create Component Class
```javascript
// components/NewFeatureManager.js
export class NewFeatureManager {
  constructor(dependencies) {
    this.dependencies = dependencies;
    this.eventBus = dependencies.eventBus;
    this.initialize();
  }

  initialize() {
    // Setup code
  }

  cleanup() {
    // Cleanup code
  }
}
```

### 2. Register in Main App
```javascript
// script.js
import { NewFeatureManager } from './components/NewFeatureManager.js';

class AITextEditor {
  constructor() {
    this.newFeature = new NewFeatureManager(this.dependencies);
  }
}
```

### 3. Add Event Handlers
```javascript
setupEventListeners() {
  this.eventBus.subscribe('relevant-event', this.handleEvent.bind(this));
}
```

## Best Practices

### Component Design
- Single responsibility principle
- Dependency injection for testability
- Event-driven communication
- Graceful error handling

### Memory Management
- Remove event listeners in cleanup
- Clear timers and intervals
- Release DOM references
- Use WeakMap for private data

### Error Handling
- Try-catch blocks for async operations
- User-friendly error messages
- Fallback behaviors for failures
- Logging for debugging

### Performance
- Debounce user input processing
- Use requestAnimationFrame for animations
- Lazy load non-critical components
- Optimize DOM queries with caching