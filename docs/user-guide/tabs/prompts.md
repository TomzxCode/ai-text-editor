# Prompts Tab

The AI Text Editor allows you to create custom prompts that automatically analyze your text as you write. Prompts are powerful tools for getting specific types of feedback tailored to your needs.

## Accessing Prompt Management

- Navigate to the **Prompts** tab in the right sidebar
- Use the prompt management interface to create, edit, enable/disable, and delete prompts
- Access the **Prompt Palette** for quick prompt selection and application

## Creating a New Prompt

1. **Click "Add New Prompt"** in the Prompts tab
2. **Enter a descriptive name** (e.g., "Grammar Check", "Code Review", "Style Guide")
3. **Write your prompt text** using natural language
4. **Use template placeholders** to insert dynamic content:
  - `{text}` - The entire text content
  - `{sentence}` - The current sentence being written
  - `{word}` - The current word being typed
  - `{paragraph}` - The current paragraph
5. **Save your prompt**

## Template Placeholder Examples

### Basic Grammar Check
```
Please check this text for grammar and spelling errors: {text}
```

### Sentence-Level Writing Coach
```
Analyze this sentence for clarity and conciseness: {sentence}
Suggest improvements if needed.
```

### Code Documentation Review
```
Review this code for documentation quality: {text}
Check if functions have clear docstrings and comments explain complex logic.
```

### Word Choice Suggestions
```
Suggest better word choices or synonyms for: {word}
Consider the context: {sentence}
```

## Prompt Best Practices

### Writing Effective Prompts
- **Be specific**: Clearly state what kind of analysis or feedback you want
- **Provide context**: Include relevant context about your writing goals
- **Use action words**: Start with verbs like "Check", "Analyze", "Suggest", "Review"
- **Set expectations**: Specify the format you want for responses

### Template Placeholder Usage
- `{text}` - Best for overall document analysis, style checks, comprehensive reviews
- `{paragraph}` - Good for structure analysis, topic coherence, paragraph flow
- `{sentence}` - Ideal for real-time grammar checking, clarity analysis, flow assessment
- `{word}` - Useful for vocabulary suggestions, terminology validation

### Performance Considerations
- **Limit active prompts**: Too many enabled prompts can slow down the editor
- **Use appropriate placeholders**: Choose the smallest relevant text unit to reduce API costs
- **Test your prompts**: Verify they provide useful feedback before leaving them enabled

## Example Prompts for Different Use Cases

### Creative Writing
```
Name: Story Flow Analyzer
Prompt: Analyze this paragraph for narrative flow and pacing: {paragraph}
Does it maintain reader engagement? Suggest improvements.
```

### Technical Documentation
```
Name: API Documentation Checker
Prompt: Review this technical documentation: {text}
Check for:
- Clear explanations
- Complete parameter descriptions
- Proper code examples
- Missing edge cases
```

### Academic Writing
```
Name: Academic Style Guide
Prompt: Check this sentence for academic writing standards: {sentence}
Ensure it follows formal academic style, avoids contractions, and uses precise language.
```

### Code Quality Review
```
Name: Code Quality Checker
Prompt: Analyze this code for quality and best practices: {text}
Check for:
- Proper naming conventions
- Code organization
- Potential bugs
- Performance considerations
```

## Managing Your Prompts

### Organization Tips
- Use descriptive names that indicate the prompt's purpose
- Group related prompts by prefixing names (e.g., "Code:", "Writing:", "Review:")
- Regularly review and update prompts based on their usefulness

### Enable/Disable Strategy
- Keep only essential prompts enabled for real-time analysis
- Enable specific prompts when working on particular types of content
- Disable prompts that generate too much noise or irrelevant feedback

### Sharing and Backup
- Use the Import/Export functionality to backup your prompt collections
- Share effective prompts with team members
- Export prompts before making major changes

## Troubleshooting Prompts

### Common Issues
- **No response**: Check that AI feedback is enabled in Settings
- **Poor quality feedback**: Refine your prompt to be more specific
- **Too many responses**: Reduce the number of enabled prompts
- **Slow performance**: Use smaller text placeholders (`{word}` or `{sentence}` instead of `{text}`)

### Optimization Tips
- Test prompts with different text lengths
- Monitor API usage if you're concerned about costs
- Adjust prompts based on the quality of responses you receive
- Use the History tab to review past prompt responses and refine accordingly
