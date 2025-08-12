class PromptsManager {
    constructor() {
        this.storageKey = 'ai_editor_prompts';
        this.prompts = this.loadPrompts();
    }

    loadPrompts() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            let prompts = stored ? JSON.parse(stored) : [];
            
            // Migrate existing prompts to have triggerTiming, customDelay, and LLM overrides if they don't have them
            prompts = prompts.map(prompt => ({
                ...prompt,
                triggerTiming: prompt.triggerTiming || 'custom',
                customDelay: prompt.customDelay || (prompt.triggerTiming === 'delay' || !prompt.triggerTiming ? '1s' : ''),
                llmService: prompt.llmService || '',
                llmModel: prompt.llmModel || ''
            }));
            
            return prompts;
        } catch (error) {
            console.error('Error loading prompts:', error);
            return [];
        }
    }

    validateTriggerTiming(timing) {
        const validTimings = ['word', 'sentence', 'custom'];
        return validTimings.includes(timing) ? timing : 'custom';
    }

    savePrompts() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.prompts));
            return true;
        } catch (error) {
            console.error('Error saving prompts:', error);
            return false;
        }
    }

    addPrompt(name, prompt, enabled = true, triggerTiming = 'custom', customDelay = '1s', llmService = '', llmModel = '') {
        if (!name || !prompt) {
            throw new Error('Name and prompt are required');
        }

        if (this.prompts.find(p => p.name === name)) {
            throw new Error('A prompt with this name already exists');
        }

        const newPrompt = {
            id: Date.now().toString(),
            name: name.trim(),
            prompt: prompt.trim(),
            enabled,
            triggerTiming: this.validateTriggerTiming(triggerTiming),
            customDelay: triggerTiming === 'custom' ? customDelay.trim() : '',
            llmService: llmService.trim(),
            llmModel: llmModel.trim(),
            createdAt: new Date().toISOString()
        };

        this.prompts.push(newPrompt);
        this.savePrompts();
        return newPrompt;
    }

    updatePrompt(id, updates) {
        const index = this.prompts.findIndex(p => p.id === id);
        if (index === -1) {
            throw new Error('Prompt not found');
        }

        if (updates.name && updates.name !== this.prompts[index].name) {
            if (this.prompts.find(p => p.name === updates.name && p.id !== id)) {
                throw new Error('A prompt with this name already exists');
            }
        }

        this.prompts[index] = {
            ...this.prompts[index],
            ...updates,
            id,
            updatedAt: new Date().toISOString()
        };

        this.savePrompts();
        return this.prompts[index];
    }

    deletePrompt(id) {
        const index = this.prompts.findIndex(p => p.id === id);
        if (index === -1) {
            throw new Error('Prompt not found');
        }

        const deleted = this.prompts.splice(index, 1)[0];
        this.savePrompts();
        return deleted;
    }

    getPrompt(id) {
        return this.prompts.find(p => p.id === id);
    }

    getAllPrompts() {
        return [...this.prompts];
    }

    getEnabledPrompts() {
        return this.prompts.filter(p => p.enabled);
    }

    getEnabledPromptsByTrigger(triggerTiming) {
        return this.prompts.filter(p => p.enabled && p.triggerTiming === triggerTiming);
    }

    togglePrompt(id) {
        const prompt = this.getPrompt(id);
        if (!prompt) {
            throw new Error('Prompt not found');
        }

        return this.updatePrompt(id, { enabled: !prompt.enabled });
    }


    exportPrompts() {
        return JSON.stringify(this.prompts, null, 2);
    }

    importPrompts(jsonData, replace = false) {
        try {
            const imported = JSON.parse(jsonData);
            if (!Array.isArray(imported)) {
                throw new Error('Invalid format: expected array of prompts');
            }

            const validPrompts = imported.filter(p => p.name && p.prompt);
            
            if (replace) {
                this.prompts = validPrompts.map(p => ({
                    ...p,
                    id: p.id || Date.now().toString() + Math.random(),
                    createdAt: p.createdAt || new Date().toISOString(),
                    enabled: p.enabled !== false,
                    triggerTiming: this.validateTriggerTiming(p.triggerTiming),
                    customDelay: p.customDelay || '',
                    llmService: p.llmService || '',
                    llmModel: p.llmModel || ''
                }));
            } else {
                const existingNames = new Set(this.prompts.map(p => p.name));
                const newPrompts = validPrompts
                    .filter(p => !existingNames.has(p.name))
                    .map(p => ({
                        ...p,
                        id: Date.now().toString() + Math.random(),
                        createdAt: new Date().toISOString(),
                        enabled: p.enabled !== false,
                        triggerTiming: this.validateTriggerTiming(p.triggerTiming),
                        customDelay: p.customDelay || '',
                        llmService: p.llmService || '',
                        llmModel: p.llmModel || ''
                    }));
                
                this.prompts.push(...newPrompts);
            }

            this.savePrompts();
            return this.prompts.length;
        } catch (error) {
            throw new Error('Failed to import prompts: ' + error.message);
        }
    }

    reorderPrompts(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.prompts.length || 
            toIndex < 0 || toIndex >= this.prompts.length || 
            fromIndex === toIndex) {
            return false;
        }

        // Remove the item from the old position
        const [movedPrompt] = this.prompts.splice(fromIndex, 1);
        
        // Insert it at the new position
        this.prompts.splice(toIndex, 0, movedPrompt);
        
        this.savePrompts();
        return true;
    }

    movePromptById(promptId, toIndex) {
        const fromIndex = this.prompts.findIndex(p => p.id === promptId);
        if (fromIndex === -1) {
            throw new Error('Prompt not found');
        }
        
        return this.reorderPrompts(fromIndex, toIndex);
    }
}