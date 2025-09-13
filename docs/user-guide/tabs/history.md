# History Tab

The History tab provides comprehensive tracking and visualization of all AI feedback interactions within the editor. Located in the AI sidebar, it offers powerful tools for reviewing, searching, and managing your AI conversation history.

## Key Features

### Statistics Dashboard
- Total feedback count across all interactions
- Number of files with AI feedback
- Count of unique prompts used
- Number of different AI providers utilized

### Multiple View Modes
- **Timeline View**: Chronological display of all AI interactions
- **By Files**: Groups feedback by file, showing all AI responses for each document
- **By Prompts**: Organizes feedback by the prompts that generated them

### Advanced Search and Filtering
- Full-text search across feedback content, prompts, and file names
- Filter by specific files to see all AI feedback for a particular document
- Filter by prompt type to review responses from specific AI instructions
- Real-time search results with instant filtering

### Detailed Feedback Display
- Expandable/collapsible feedback items for easy browsing
- Rich HTML content preservation from AI responses
- Metadata display including:
  - Timestamp of interaction
  - File name and location
  - AI provider and model used
  - Response duration
  - Token usage statistics (input/output)

### Data Management
- Export entire history as JSON for backup or analysis
- Clear all history with confirmation prompt
- Refresh functionality to reload data
- Automatic persistence via IndexedDB for reliable storage

## Pagination and Performance
- Intelligent pagination for large history datasets (20 items per page)
- Efficient loading of recent feedback first
- Memory-conscious design for handling extensive AI interaction logs

## Usage Tips
- Use the search function to quickly find specific AI responses or discussions
- Switch between view modes to organize information by your preferred workflow
- Export your history periodically as a backup of valuable AI insights
- Files view is particularly useful for project-based review of AI assistance
