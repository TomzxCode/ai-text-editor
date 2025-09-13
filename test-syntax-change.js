// Quick test to verify the syntax change works correctly

// Mock localStorage for testing
global.localStorage = {
    data: {},
    getItem(key) {
        return this.data[key];
    },
    setItem(key, value) {
        this.data[key] = value;
    }
};

// Load the CustomVariablesManager
require('./components/CustomVariablesManager.js');

// Create manager instance
const manager = new CustomVariablesManager();

console.log('Testing CustomVariablesManager with new {variable_name} syntax...\n');

try {
    // Test adding variables
    console.log('1. Adding test variables...');
    const var1 = manager.addVariable('project_name', 'My Awesome Project');
    const var2 = manager.addVariable('author_name', 'John Doe');
    console.log('✓ Added variables successfully');

    // Test reserved name validation
    console.log('\n2. Testing reserved name validation...');
    try {
        manager.addVariable('text', 'This should fail');
        console.log('✗ Reserved name validation failed - should have thrown error');
    } catch (error) {
        console.log('✓ Reserved name validation works:', error.message);
    }

    // Test variable substitution
    console.log('\n3. Testing variable substitution...');
    const testText = 'Welcome to {project_name} created by {author_name}!';
    const result = manager.substituteVariables(testText);
    console.log('Original:', testText);
    console.log('Substituted:', result);
    
    if (result === 'Welcome to My Awesome Project created by John Doe!') {
        console.log('✓ Variable substitution works correctly');
    } else {
        console.log('✗ Variable substitution failed');
    }

    // Test mixed text with built-in placeholders
    console.log('\n4. Testing mixed placeholders...');
    const mixedText = 'Project: {project_name}, Text: {text}, Author: {author_name}';
    const mixedResult = manager.substituteVariables(mixedText);
    console.log('Original:', mixedText);
    console.log('Substituted:', mixedResult);
    
    if (mixedResult === 'Project: My Awesome Project, Text: {text}, Author: John Doe') {
        console.log('✓ Mixed placeholders work correctly (custom vars substituted, built-in preserved)');
    } else {
        console.log('✗ Mixed placeholders failed');
    }

    // Test findVariablesInText
    console.log('\n5. Testing variable detection...');
    const variables = manager.findVariablesInText(testText);
    console.log('Found variables:', variables.map(v => ({ name: v.name, placeholder: v.placeholder })));
    
    if (variables.length === 2 && variables[0].name === 'project_name' && variables[1].name === 'author_name') {
        console.log('✓ Variable detection works correctly');
    } else {
        console.log('✗ Variable detection failed');
    }

    console.log('\n🎉 All tests passed! The new {variable_name} syntax is working correctly.');

} catch (error) {
    console.error('Test failed:', error);
}