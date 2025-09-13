class CustomVariablesManager {
    constructor() {
        this.storageKey = 'ai_editor_custom_variables';
        this.variables = this.loadVariables();
    }

    generateUniqueId() {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substr(2, 9);
        const id = `var_${timestamp}-${randomPart}`;
        
        // Ensure uniqueness by checking against existing IDs
        const existingIds = new Set(this.variables.map(v => v.id));
        
        if (existingIds.has(id)) {
            // Very unlikely, but if collision occurs, try again
            return this.generateUniqueId();
        }
        
        return id;
    }

    loadVariables() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            let variables = stored ? JSON.parse(stored) : [];
            
            // Ensure all variables have required properties
            variables = variables.map(variable => ({
                id: variable.id || this.generateUniqueId(),
                name: variable.name || '',
                value: variable.value || '',
                description: variable.description || '',
                createdAt: variable.createdAt || new Date().toISOString(),
                updatedAt: variable.updatedAt || variable.createdAt || new Date().toISOString(),
                ...variable
            }));
            
            return variables;
        } catch (error) {
            console.error('Error loading custom variables:', error);
            return [];
        }
    }

    saveVariables() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.variables));
            return true;
        } catch (error) {
            console.error('Error saving custom variables:', error);
            return false;
        }
    }

    addVariable(name, value, description = '') {
        if (!name || !name.trim()) {
            throw new Error('Variable name is required');
        }

        if (!value || !value.trim()) {
            throw new Error('Variable value is required');
        }

        const trimmedName = name.trim();
        
        // Validate variable name format (alphanumeric, underscores, hyphens)
        if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(trimmedName)) {
            throw new Error('Variable name must start with a letter or underscore and contain only letters, numbers, underscores, and hyphens');
        }

        // Check for reserved names (built-in placeholders)
        const reservedNames = ['text', 'sentence', 'word', 'paragraph'];
        if (reservedNames.includes(trimmedName.toLowerCase())) {
            throw new Error(`Variable name "${trimmedName}" is reserved. Please choose a different name.`);
        }

        // Check for name uniqueness (case-insensitive)
        if (this.variables.find(v => v.name.toLowerCase() === trimmedName.toLowerCase())) {
            throw new Error('A variable with this name already exists');
        }

        const newVariable = {
            id: this.generateUniqueId(),
            name: trimmedName,
            value: value.trim(),
            description: description.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.variables.push(newVariable);
        this.saveVariables();
        return newVariable;
    }

    updateVariable(id, updates) {
        const index = this.variables.findIndex(v => v.id === id);
        if (index === -1) {
            throw new Error('Variable not found');
        }

        const variable = this.variables[index];

        // Validate name if being updated
        if (updates.name && updates.name !== variable.name) {
            const trimmedName = updates.name.trim();
            
            if (!trimmedName) {
                throw new Error('Variable name is required');
            }

            // Validate variable name format
            if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(trimmedName)) {
                throw new Error('Variable name must start with a letter or underscore and contain only letters, numbers, underscores, and hyphens');
            }

            // Check for reserved names (built-in placeholders)
            const reservedNames = ['text', 'sentence', 'word', 'paragraph'];
            if (reservedNames.includes(trimmedName.toLowerCase())) {
                throw new Error(`Variable name "${trimmedName}" is reserved. Please choose a different name.`);
            }

            // Check for name uniqueness (case-insensitive)
            if (this.variables.find(v => v.id !== id && v.name.toLowerCase() === trimmedName.toLowerCase())) {
                throw new Error('A variable with this name already exists');
            }

            updates.name = trimmedName;
        }

        // Validate value if being updated
        if (updates.value !== undefined) {
            if (!updates.value || !updates.value.trim()) {
                throw new Error('Variable value is required');
            }
            updates.value = updates.value.trim();
        }

        // Trim description
        if (updates.description !== undefined) {
            updates.description = updates.description.trim();
        }

        this.variables[index] = {
            ...variable,
            ...updates,
            id,
            updatedAt: new Date().toISOString()
        };

        this.saveVariables();
        return this.variables[index];
    }

    deleteVariable(id) {
        const index = this.variables.findIndex(v => v.id === id);
        if (index === -1) {
            throw new Error('Variable not found');
        }

        const deleted = this.variables.splice(index, 1)[0];
        this.saveVariables();
        return deleted;
    }

    getVariable(id) {
        return this.variables.find(v => v.id === id);
    }

    getVariableByName(name) {
        return this.variables.find(v => v.name.toLowerCase() === name.toLowerCase());
    }

    getAllVariables() {
        return [...this.variables].sort((a, b) => a.name.localeCompare(b.name));
    }

    duplicateVariable(id) {
        const variable = this.getVariable(id);
        if (!variable) {
            throw new Error('Variable not found');
        }

        // Create a unique name for the duplicate
        let duplicateName = `${variable.name}_copy`;
        let counter = 2;
        while (this.variables.find(v => v.name.toLowerCase() === duplicateName.toLowerCase())) {
            duplicateName = `${variable.name}_copy${counter}`;
            counter++;
        }

        const duplicatedVariable = {
            id: this.generateUniqueId(),
            name: duplicateName,
            value: variable.value,
            description: variable.description,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.variables.push(duplicatedVariable);
        this.saveVariables();
        return duplicatedVariable;
    }

    exportVariables() {
        return JSON.stringify(this.variables, null, 2);
    }

    importVariables(jsonData, replace = false) {
        try {
            const imported = JSON.parse(jsonData);
            if (!Array.isArray(imported)) {
                throw new Error('Invalid format: expected array of variables');
            }

            const validVariables = imported.filter(v => v.name && v.value);
            
            if (replace) {
                this.variables = validVariables.map(v => ({
                    id: this.generateUniqueId(),
                    name: v.name.trim(),
                    value: v.value.trim(),
                    description: (v.description || '').trim(),
                    createdAt: v.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }));
            } else {
                const existingNames = new Set(this.variables.map(v => v.name.toLowerCase()));
                const newVariables = validVariables
                    .filter(v => !existingNames.has(v.name.toLowerCase()))
                    .map(v => ({
                        id: this.generateUniqueId(),
                        name: v.name.trim(),
                        value: v.value.trim(),
                        description: (v.description || '').trim(),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }));
                
                this.variables.push(...newVariables);
            }

            this.saveVariables();
            return this.variables.length;
        } catch (error) {
            throw new Error('Failed to import variables: ' + error.message);
        }
    }

    // Utility method to get all variable placeholders for use in prompts
    getVariablePlaceholders() {
        return this.variables.map(v => ({
            placeholder: `{${v.name}}`,
            name: v.name,
            value: v.value,
            description: v.description
        }));
    }

    // Method to substitute variables in text
    substituteVariables(text) {
        if (!text || typeof text !== 'string') {
            return text;
        }

        let result = text;
        
        // Replace all {variableName} placeholders
        this.variables.forEach(variable => {
            const placeholder = `{${variable.name}}`;
            const regex = new RegExp(this.escapeRegExp(placeholder), 'gi');
            result = result.replace(regex, variable.value);
        });

        return result;
    }

    // Helper method to escape special regex characters
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Method to find variables used in text
    findVariablesInText(text) {
        if (!text || typeof text !== 'string') {
            return [];
        }

        const variablePattern = /\{([a-zA-Z_][a-zA-Z0-9_-]*)\}/gi;
        const matches = [];
        let match;

        while ((match = variablePattern.exec(text)) !== null) {
            const variableName = match[1];
            const variable = this.getVariableByName(variableName);
            matches.push({
                placeholder: match[0],
                name: variableName,
                variable: variable,
                isValid: !!variable
            });
        }

        return matches;
    }

    // Method to validate that all variables in text exist
    validateVariablesInText(text) {
        const variables = this.findVariablesInText(text);
        const invalidVariables = variables.filter(v => !v.isValid);
        
        if (invalidVariables.length > 0) {
            const invalidNames = invalidVariables.map(v => v.name).join(', ');
            throw new Error(`Unknown variables: ${invalidNames}`);
        }

        return true;
    }

    // Method to create default variables if none exist
    createDefaultVariables() {
        if (this.variables.length > 0) {
            return; // Already have variables
        }

        const defaultVariables = [
            {
                name: 'project_name',
                value: 'My Project',
                description: 'The name of the current project'
            },
            {
                name: 'author_name',
                value: 'Author Name',
                description: 'The name of the document author'
            },
            {
                name: 'company_name',
                value: 'Company Name',
                description: 'The name of your company or organization'
            },
            {
                name: 'writing_style',
                value: 'professional and clear',
                description: 'The preferred writing style for content'
            },
            {
                name: 'target_audience',
                value: 'general audience',
                description: 'The intended audience for the content'
            }
        ];

        defaultVariables.forEach(varData => {
            try {
                this.addVariable(varData.name, varData.value, varData.description);
            } catch (error) {
                console.warn(`Failed to create default variable "${varData.name}":`, error);
            }
        });
    }
}