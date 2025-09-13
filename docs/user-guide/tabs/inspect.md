# Inspect Tab

The Inspect tab is a powerful debugging and analysis tool within the AI Text Editor that provides real-time text structure analysis. It offers detailed insights into how your text is broken down into sentences, words, and paragraphs, with special tracking for AI-generated versus human-written content.

## Features

### Text Statistics
The Inspect tab displays live counters showing:

- **Sentences**: Total number of sentences in the current text
- **Words**: Total word count
- **Paragraphs**: Number of paragraphs detected
- **Text Version**: Internal version number that increments with each change

### View Modes

The Inspect tab offers four different view modes:

#### 1. Structure View
- Provides a hierarchical overview of the entire text
- Shows statistical summary (averages, totals)
- Displays paragraphs with their contained sentences
- Nested view showing relationships between text elements

#### 2. Sentences View
- Lists all sentences individually
- Shows sentence ID, position, word count, and AI generation status
- Displays visual indicators for AI-generated vs human-written content
- Highlights newly added sentences

#### 3. Paragraphs View
- Shows paragraph-level breakdown
- Displays paragraph ID, position, sentence count, and word count
- Provides content preview (truncated for long paragraphs)

#### 4. Words View
- Grid display of individual words
- Shows word ID, position, and AI generation status
- Compact chip-style layout for easy scanning
- Visual indicators distinguish AI vs human content

### AI Generation Tracking

The Inspect tab provides sophisticated tracking of content origin:

- **🤖 AI Generated**: Content created by AI assistance
- **👤 Human Written**: Content typed directly by the user
- **Color Coding**: Different visual styles for AI vs human content
- **New Content Highlighting**: Recently added content is visually highlighted

### Interactive Features

#### Click-to-Highlight
- Click any text element (sentence, word, paragraph) to highlight it in the main editor
- Provides instant visual connection between analysis and source text
- Shows success notifications with content preview

#### Real-time Filtering
- Filter text elements by content or ID
- Search functionality works across all view modes
- Case-insensitive matching for both content and element identifiers

### Position Tracking

Each text element includes precise position information:

- **Start Position**: Character index where element begins
- **End Position**: Character index where element ends
- **Exact Positioning**: Enables precise highlighting and navigation

## User Interface

### Navigation
- Access via the "Inspect" tab in the AI sidebar
- Responsive design works on both desktop and mobile
- Tab activation automatically refreshes content

### Controls
- **View Selector**: Dropdown to switch between view modes
- **Filter Input**: Search box for filtering displayed elements
- **Refresh Button**: Manual refresh of structure analysis
- **Statistics Display**: Always-visible counters at the top

## Technical Implementation

### Data Model
The Inspect tab works with structured text data that includes:

- Hierarchical relationships (paragraphs → sentences → words)
- Unique identifiers for each text element
- Position tracking for all elements
- AI generation flags and metadata
- Version tracking for change detection

### Performance Optimization
- **Lazy Loading**: Content only renders when tab is active
- **Efficient Updates**: Only refreshes when text structure changes
- **Filtered Display**: Search operations work on already-parsed data
- **Memory Management**: Cleanup methods prevent memory leaks

### Integration Points
- **TextAnalysisManager**: Provides structured text data
- **EditorManager**: Handles highlighting operations
- **NotificationManager**: Shows user feedback
- **UIManager**: Manages tab activation state

## Use Cases

### Development and Debugging
- Verify text parsing accuracy
- Debug sentence and paragraph detection
- Validate AI generation tracking
- Export data for external analysis

### Content Analysis
- Understand text structure breakdown
- Track AI assistance usage patterns
- Analyze writing composition (AI vs human ratio)
- Monitor text complexity metrics

### Quality Assurance
- Verify proper text segmentation
- Check for parsing edge cases
- Validate position tracking accuracy
- Test interactive highlighting functionality

## Best Practices
- Use filtering to find specific content quickly
- Click elements to see their exact location in the editor
- Check AI generation tracking to understand content composition

## Troubleshooting

### Common Issues
- **Empty Display**: Ensure there's text in the editor and refresh the tab
- **Highlighting Not Working**: Check that EditorManager is properly initialized
- **Filter Not Responding**: Verify that structure data is loaded correctly
- **Export Failing**: Check browser permissions for file downloads

### Performance Considerations
- Large texts may take time to process
- Filtering is performed on client-side for responsiveness
- Tab switching triggers automatic refresh for up-to-date data
- Memory usage scales with text complexity
