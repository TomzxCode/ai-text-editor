# Usage Tab

The Usage tab provides comprehensive statistics and analytics for your AI Text Editor usage, helping you track LLM API calls, token consumption, and performance metrics.

The Usage tab is located in the AI sidebar and offers detailed insights into:

- API call statistics
- Token usage patterns
- Performance metrics
- Session-based analytics
- Provider and model usage

## Features

### Usage Statistics Dashboard

The main dashboard displays key metrics:

- **Total Calls**: Number of API calls made
- **Total Tokens**: Combined input and output tokens
- **Input Tokens**: Tokens sent to the LLM
- **Output Tokens**: Tokens received from the LLM
- **Total Time**: Cumulative processing time
- **Average Time**: Mean response time per call

### Filtering Options

Filter your usage data by:

- **Date Range**: All time, today, last 7 days, last 30 days, or custom range
- **Session**: Current session, all sessions, or specific session IDs
- **Provider**: Filter by AI service provider (Anthropic, OpenAI, Groq, etc.)
- **Model**: Filter by specific model within a provider

### Usage Subtabs

#### Overview
Displays the main statistics dashboard with filtered data.

#### By Prompt
Shows detailed usage statistics grouped by prompt:

- Call count per prompt
- Token consumption breakdown
- Execution time metrics
- Last usage timestamp
- Session participation (when viewing all sessions)

#### Recent Calls
Lists individual API calls with:

- Prompt identifier
- Timestamp and relative time
- Token usage details
- Provider and model information
- Session identification
- Search and limit controls

## Controls and Actions

### Refresh
- **Refresh Button**: Manual data refresh
- **Auto-refresh**: Automatic updates every 30 seconds when tab is active

### Export
- **Export Data**: Download complete usage history as JSON
- Includes all calls, tokens, timing, and metadata
- Filename format: `llm-usage-export-YYYY-MM-DD.json`

### Clear History
- **Clear Usage**: Remove all stored usage data
- Requires confirmation dialog
- Action cannot be undone

## Data Storage

Usage data is stored locally using IndexedDB for:

- Persistent storage across browser sessions
- Efficient querying and filtering
- Large dataset support
- No server dependencies

## Search and Navigation

### Search Functionality
- Filter calls by prompt name or session ID
- Real-time search results
- Case-insensitive matching

### Pagination
- Configurable result limits (50, 100, 500, or all)
- Efficient loading for large datasets
- Responsive performance

## Session Integration

The Usage tab integrates with the Session Manager to:

- Track calls per session
- Identify current vs. historical sessions
- Provide session-based analytics
- Enable cross-session comparisons

## Performance Metrics

### Duration Tracking
- Response time measurement in milliseconds
- Automatic formatting (ms, seconds, minutes, hours)
- Average calculation across filtered datasets
- Performance trend analysis

### Token Economics
- Input/output token breakdown
- Total consumption tracking
- Provider-specific metrics
- Cost estimation support (when available)

## Best Practices

### Monitoring Usage
1. Regular review of token consumption
2. Identify high-usage prompts
3. Monitor performance trends
4. Track session efficiency

### Data Management
1. Periodic export for backup
2. Clear old data when needed
3. Monitor storage usage
4. Review session patterns

### Optimization
1. Analyze prompt efficiency
2. Compare provider performance
3. Optimize high-usage workflows
4. Balance token usage across prompts
