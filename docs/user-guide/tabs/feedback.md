# Feedback Tab

The Feedback Tab is the primary interface for displaying AI-generated analysis and responses in the AI Text Editor. It provides real-time AI assistance as you write and edit your documents.

## Location and Access

The Feedback Tab is located in the right sidebar as part of the tabbed interface.

## Key Features

### Real-time AI Feedback
- Displays AI analysis based on text from enabled prompts
- Updates automatically when you type or complete sentences/paragraphs
- Provides contextual suggestions and improvements

### Progressive Loading
- Shows feedback incrementally as each AI analysis completes
- No need to wait for all analyses to finish before seeing results
- Provides immediate feedback for faster workflow

### Grouped Display
- Organizes feedback by prompt source with clear section headers
- Makes it easy to distinguish between different types of analysis
- Maintains organized presentation even with multiple active prompts

### Rich HTML Rendering
- Supports rich HTML responses from LLM APIs
- Enhanced formatting for better readability
- Displays structured content like lists, headings, and emphasis

### Text Association
- Links feedback to specific text segments via FeedbackAssociationManager
- Provides context-aware analysis tied to your content
- Helps you understand which parts of your text triggered specific feedback

## Technical Implementation

### Auto-refresh Behavior
- Updates automatically when user completes words, sentences, or paragraphs
- Debounced updates with 1-second delay to prevent excessive API calls
- Efficient processing that doesn't interrupt your writing flow

### Error Handling
- Gracefully displays connection errors and API issues
- Provides clear error messages when LLM APIs are unavailable
- Includes retry suggestions for failed requests

### Control Options
- Can be enabled/disabled via the AI toggle in Settings tab
- Allows you to turn off AI feedback when not needed
- Preserves your preferences across sessions

### Mobile Responsiveness
- Optimized for touch interaction on mobile devices
- Responsive design that works on small screens
- Touch-friendly interface elements

### State Persistence
- Maintains feedback content across tab switches
- Preserves state during sessions
- Remembers your feedback preferences

## Usage Tips

1. **Enable relevant prompts** in the Prompts tab to get targeted feedback
2. **Use the AI toggle** in Settings to control when feedback appears
3. **Review grouped feedback** to understand different perspectives on your text
4. **Check error messages** if feedback isn't appearing as expected
5. **Switch between tabs** to access prompts, history, and settings while keeping feedback visible
