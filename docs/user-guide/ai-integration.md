# AI Integration

## Overview

AI Text Editor integrates directly with LLM APIs to provide real-time writing assistance and feedback.

## Configuration

### API Key Setup

1. Navigate to the Settings tab
2. Select your preferred LLM provider
3. Enter your API key
4. Choose your model (if applicable)

### Supported Providers

| Provider | Models | Features |
|----------|--------|----------|
| Anthropic | Claude | Safety-focused |
| Google | Gemini | Multimodal capabilities |
| Groq | Llama, Mixtral, GPT OSS | Fast inference |
| OpenAI | GPT-x | High quality responses |

## How It Works

### Text Analysis Pipeline

1. **User Types**: Text is entered in the editor
2. **Analysis**: Trigger based prompts are sent to the LLMs
3. **Parallel Execution**: Multiple prompts run simultaneously
4. **Progressive Updates**: UI updates as each response arrives
5. **Feedback Display**: HTML responses shown in sidebar

### Prompt System

#### Built-in Analysis
- General text feedback
- Grammar and style suggestions
- Content improvement recommendations

#### Custom Prompts
Create personalized prompts with template variables:

```
Analyze this {text} for clarity and suggest improvements.
```

Available variables:
- `{text}` - All text in the editor
- `{sentence}` - Current sentence
- `{word}` - Current word
- `{paragraph}` - Current paragraph

### Response Format

AI responses are returned as HTML for flexible formatting.
The HTML itself is provide by the LLM.

## Best Practices

### API Usage
- Monitor your API usage and costs
- Use appropriate models for your needs
- Consider rate limits when creating prompts

### Prompt Design
- Be specific about what you want analyzed
- Use template variables for dynamic content
- Test prompts with different text types
- Put your instructions at the beginning to benefit from caching

### Performance
- Disable unused prompts to reduce API calls
- Use shorter prompts for faster responses

## Troubleshooting

### Common Issues

**No AI Feedback**
- Check API key configuration
- Verify internet connection
- Ensure AI feedback is enabled in settings

**Slow Responses**
- Check your internet connection
- Try a different LLM provider
- Reduce the number of active prompts

**Error Messages**
- Verify API key is valid and has credits
- Check provider status pages
- Review prompt formatting
