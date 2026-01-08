# AI Integration & Feedback System Specification

## Overview

This specification defines the AI integration and feedback system that provides real-time AI-powered text analysis and feedback within the text editor. The system supports multiple LLM providers and delivers progressive, contextual feedback.

## Requirements

### Core Functionality

#### LLM API Integration
- The system MUST support direct API integration with multiple LLM providers (Groq, OpenAI, Anthropic, Google)
- The system MUST use the LLM.js library for unified API access
- The system MUST allow users to configure API keys through the settings interface
- The system MUST allow users to select their preferred LLM service and model
- The system MUST validate API keys before making API calls
- The system MUST provide clear error messages when API calls fail due to invalid credentials

#### Text Analysis
- The system MUST track user typing in the editor to detect word, sentence, and paragraph completion events
- The system MUST debounce analysis requests to avoid excessive API calls (default: 1-second delay)
- The system MUST support both real-time analysis (AI toggle enabled) and manual analysis
- The system MUST support analysis at multiple text levels: word, sentence, and paragraph
- The system MUST allow users to enable/disable AI feedback globally
- The system MUST preserve editor performance during analysis operations

#### Feedback Delivery
- The system MUST support progressive loading of feedback from multiple sources
- The system MUST return AI responses in HTML format for flexible display formatting
- The system MUST display feedback in grouped sections by prompt source
- The system MUST update the UI in real-time as each analysis completes
- The system MUST handle both successful responses and error conditions gracefully

### Prompt System

#### Prompt Management
- The system MUST allow users to create, read, update, and delete custom prompts
- The system MUST support template placeholders: `{text}`, `{sentence}`, `{word}`, and `{paragraph}`
- The system MUST persist prompts using localStorage
- The system MUST allow users to enable/disable individual prompts
- The system MUST provide a default set of prompts for new users
- The system MUST validate prompt templates before saving

#### Prompt Execution
- The system MUST execute enabled prompts when text analysis is triggered
- The system MUST support parallel execution of general analysis and prompt-based analysis
- The system MUST replace template placeholders with actual text content before API calls
- The system MUST display which prompt generated each piece of feedback

#### Prompt Palette
- The system MUST provide a quick selection interface for prompts
- The system MUST allow users to quickly apply prompts to selected text
- The system MUST support search and filtering within the prompt palette
- The system MUST show prompt enable/disable status in the palette

### Feedback Association

#### Text Segment Association
- The system MUST associate AI feedback with specific text segments
- The system MUST maintain mappings between feedback and the text that generated it
- The system MUST allow users to navigate from feedback to associated text
- The system MUST handle feedback associations when text is modified

#### Context Awareness
- The system SHOULD provide context information to LLMs (surrounding text, file type)
- The system MAY include file metadata in analysis requests for better context

### History & Storage

#### Call Tracking
- The system MUST track all LLM API calls with timestamps
- The system MUST store request parameters and response content
- The system MUST persist call history using IndexedDB via LLMCallStorage
- The system MUST provide pagination for large history datasets
- The system MUST allow users to view, search, and filter call history

#### Data Persistence
- The system MUST persist all LLM interactions for history tracking
- The system MUST maintain feedback associations across sessions
- The system MUST handle IndexedDB errors gracefully
- The system SHOULD provide import/export functionality for history data

### Custom Variables

#### Variable Management
- The system MUST allow users to define custom variables for use in prompts
- The system MUST support variable substitution in prompt templates
- The system MUST persist custom variables using localStorage
- The system MUST provide a UI interface for managing variables
- The system MUST validate variable names and values

### Error Handling

#### API Failures
- The system MUST handle network errors gracefully
- The system MUST provide clear error messages for API failures
- The system MUST suggest retry options for transient failures
- The system MUST handle rate limiting errors appropriately
- The system MUST validate API responses before processing

#### Degradation
- The system MUST degrade gracefully when LLM API is unavailable
- The system MUST continue to function when AI feedback is disabled
- The system MUST provide feedback about API status in the UI

## Non-Functional Requirements

### Performance
- Text analysis MUST NOT block the main UI thread
- Debounced analysis SHOULD complete within 2 seconds of user stopping typing
- Feedback display MUST update incrementally as responses arrive
- The system MUST handle parallel execution efficiently

### Security
- API keys MUST be stored securely in localStorage
- API keys MUST NOT be exposed in client-side code or logs
- The system MUST NOT send sensitive file content without user consent
- The system SHOULD validate all user inputs before including in API requests

### Usability
- AI feedback MUST be easily distinguishable from other UI elements
- The system MUST provide clear indicators when analysis is in progress
- The system MUST allow users to cancel ongoing analysis requests
- The system MUST provide visual feedback for enable/disable states

## Implementation Notes

### Component Dependencies
- **AIService**: Orchestrates LLM API calls via LLM.js
- **TextAnalysisManager**: Tracks typing events and schedules analysis
- **FeedbackAssociationManager**: Maps feedback to text segments
- **PromptsManager**: Manages prompt CRUD operations
- **PromptPaletteManager**: Provides quick prompt selection interface
- **CustomVariablesManager**: Handles custom variable definitions
- **LLMCallStorage**: Provides IndexedDB persistence for call history
- **HistoryManager**: Presents history data with filtering and search

### LLM.js Integration
- Consult https://llmjs.themaximalist.com/ for correct parameter names and configuration
- Handle CORS limitations for specific providers
- Implement proper error handling for each provider's response format

### Testing Considerations
- Test with various LLM providers (Groq, OpenAI, Anthropic, Google)
- Test with and without valid API keys configured
- Test debouncing behavior with rapid typing
- Test parallel execution of multiple prompts
- Test error conditions (network failures, rate limits, invalid keys)
- Test template substitution with all placeholder types
- Test feedback association with text modifications
