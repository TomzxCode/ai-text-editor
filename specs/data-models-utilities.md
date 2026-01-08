# Data Models & Utilities Specification

## Overview

This specification defines the data models and utility components that provide foundational functionality for the text editor, including text analysis, UI components, usage tracking, and code inspection.

## Requirements

### Core Functionality

#### Sentence Data Model

**Text Tracking**
- The system MUST track word completion events
- The system MUST track sentence completion events
- The system MUST track paragraph completion events
- The system MUST handle edge cases (abbreviations, decimal numbers, ellipsis)
- The system MUST provide real-time counting and statistics

**Callback System**
- The system MUST support configurable callbacks for completion events
- The system MUST allow multiple callbacks per event type
- The system MUST pass context data to callbacks (text, position, metadata)
- The system MUST handle callback errors gracefully
- The system MUST allow callback registration and deregistration

**Data Structure**
- The system MUST maintain sentence-level metadata
- The system MUST track position and offset for each text segment
- The system MUST support querying by text level (word/sentence/paragraph)
- The system MUST provide efficient lookup operations

#### Searchable Dropdown

**Search Functionality**
- The component MUST support filtering options by search text
- The component MUST update search results in real-time
- The component MUST highlight matching text in options
- The component MUST support keyboard navigation
- The component MUST handle large option lists efficiently

**User Interaction**
- The component MUST allow keyboard selection (arrows, enter, escape)
- The component MUST allow mouse selection and click
- The component MUST close on selection or outside click
- The component MUST maintain focus state appropriately
- The component MUST support custom option rendering

**Configuration**
- The component MUST support custom search functions
- The component MUST support placeholder text
- The component MUST support disabled state
- The component MUST support maximum height with scrolling

#### Usage Tracker

**Metrics Collection**
- The system MUST track session duration
- The system MUST track feature usage frequency
- The system MUST track user interaction patterns
- The system MUST track editor activity (keystrokes, file changes)
- The system MUST track AI usage (calls, tokens, models used)

**Privacy**
- All tracking data MUST be stored locally
- No data MUST be sent to external servers
- Users MUST be able to opt out of tracking
- Users MUST be able to clear tracking data
- The system MUST provide transparency about collected data

**Analytics**
- The system MUST provide usage statistics display
- The system MUST calculate usage trends over time
- The system MUST identify most-used features
- The system MUST provide session summaries
- The system MUST support data export for analysis

#### Inspection Manager

**Code Analysis**
- The system MUST provide code inspection tools
- The system MUST analyze code structure and patterns
- The system MUST identify potential issues
- The system MUST provide suggestions for improvements
- The system MUST support multiple programming languages

**Text Analysis**
- The system MUST provide text statistics (word count, readability)
- The system MUST analyze writing patterns
- The system MUST identify grammar and style issues
- The system MUST provide improvement suggestions

**Inspection Interface**
- The system MUST display inspection results clearly
- The system MUST allow users to navigate to identified issues
- The system MUST provide explanations for issues
- The system MUST support bulk inspection of entire files
- The system MUST allow users to configure inspection rules

## Non-Functional Requirements

### Performance
- Sentence tracking MUST NOT impact typing performance
- Searchable dropdown MUST filter 1000+ options within 50ms
- Usage tracking MUST have minimal overhead (<1% CPU)
- Inspection MUST complete within 2 seconds for typical files

### Memory
- Data models MUST efficiently manage memory for large texts
- Searchable dropdown MUST virtualize large option lists
- Usage tracking MUST implement data retention policies
- Inspection MUST handle large files without memory issues

### Usability
- Searchable dropdown MUST be intuitive and responsive
- Inspection results MUST be clear and actionable
- Usage statistics MUST be presented in understandable format
- All utilities MUST integrate seamlessly with main application

## Implementation Notes

### Component Dependencies
- **SentenceDataModel**: Provides text analysis and event tracking
- **SearchableDropdown**: Reusable dropdown with search functionality
- **UsageTracker**: Tracks application usage metrics
- **InspectManager**: Provides code and text inspection tools

### SentenceDataModel Implementation
- Use regular expressions for text segmentation
- Handle edge cases for sentence boundaries (Mr., Mrs., etc.)
- Implement efficient position tracking for text segments
- Provide event emitter pattern for callbacks

### SearchableDropdown Implementation
- Implement virtual scrolling for large option lists
- Use fuzzy search for better matching
- Provide keyboard accessibility (ARIA attributes)
- Support custom render functions for options

### UsageTracker Implementation
- Use localStorage for persistent storage
- Implement data aggregation for statistics
- Provide opt-out mechanism that stops collection
- Implement data retention and cleanup policies

### InspectManager Implementation
- Use AST parsing for code analysis
- Integrate with LLM for intelligent analysis
- Provide rule-based checking for common issues
- Support custom inspection rules

### Testing Considerations
- Test sentence tracking with various text patterns
- Test searchable dropdown with large option lists
- Test usage tracking accuracy and performance
- Test inspection with various file types and languages
- Test memory usage with large texts
- Test keyboard navigation for dropdown
- Test privacy features (opt-out, data clearing)
