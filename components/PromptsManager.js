class PromptsManager {
    constructor() {
        this.storageKey = 'ai_editor_prompts';
        this.groupsStorageKey = 'ai_editor_prompt_groups';
        this.prompts = this.loadPrompts();
        this.groups = this.loadGroups();
        this.ensureDefaultGroup();
    }

    loadPrompts() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            let prompts = stored ? JSON.parse(stored) : [];
            
            // Migrate existing prompts to have triggerTiming, customDelay, keyboard shortcut, and LLM overrides if they don't have them
            prompts = prompts.map(prompt => ({
                ...prompt,
                triggerTiming: prompt.triggerTiming || 'custom',
                customDelay: prompt.customDelay || (prompt.triggerTiming === 'delay' || !prompt.triggerTiming ? '1s' : ''),
                keyboardShortcut: prompt.keyboardShortcut || '',
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
        const validTimings = ['word', 'sentence', 'custom', 'keyboard'];
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

    addPrompt(name, prompt, enabled = true, triggerTiming = 'custom', customDelay = '1s', keyboardShortcut = '', llmService = '', llmModel = '') {
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
            // Note: 'enabled' is now managed per-group, not globally
            triggerTiming: this.validateTriggerTiming(triggerTiming),
            customDelay: triggerTiming === 'custom' ? customDelay.trim() : '',
            keyboardShortcut: triggerTiming === 'keyboard' ? keyboardShortcut.trim() : '',
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

    // Legacy method - now delegates to active group functionality  
    getEnabledPrompts() {
        return this.getEnabledPromptsInActiveGroup();
    }

    // Legacy method - kept for compatibility but now delegates to per-group functionality
    getEnabledPromptsByTrigger(triggerTiming) {
        return this.getEnabledPromptsByTriggerInActiveGroup(triggerTiming);
    }

    getPromptsByKeyboardShortcut(shortcut) {
        return this.prompts.filter(p => p.enabled && p.keyboardShortcut === shortcut && p.triggerTiming === 'keyboard');
    }

    // Legacy method for backward compatibility
    getPromptByKeyboardShortcut(shortcut) {
        const prompts = this.getPromptsByKeyboardShortcut(shortcut);
        return prompts.length > 0 ? prompts[0] : null;
    }

    getKeyboardShortcutPrompts() {
        return this.prompts.filter(p => p.enabled && p.triggerTiming === 'keyboard' && p.keyboardShortcut);
    }

    duplicatePrompt(id) {
        const prompt = this.getPrompt(id);
        if (!prompt) {
            throw new Error('Prompt not found');
        }

        // Create a unique name for the duplicate
        let duplicateName = `${prompt.name} (Copy)`;
        let counter = 2;
        while (this.prompts.find(p => p.name === duplicateName)) {
            duplicateName = `${prompt.name} (Copy ${counter})`;
            counter++;
        }

        const duplicatedPrompt = {
            id: Date.now().toString(),
            name: duplicateName,
            prompt: prompt.prompt,
            enabled: prompt.enabled,
            triggerTiming: prompt.triggerTiming,
            customDelay: prompt.customDelay,
            keyboardShortcut: '', // Clear keyboard shortcut to avoid conflicts
            llmService: prompt.llmService,
            llmModel: prompt.llmModel,
            createdAt: new Date().toISOString()
        };

        this.prompts.push(duplicatedPrompt);
        this.savePrompts();

        // Find all groups that contain the original prompt and add the duplicate to them
        const groupsContainingOriginal = this.groups.filter(group => 
            group.promptIds.includes(id)
        );

        groupsContainingOriginal.forEach(group => {
            // Add the duplicated prompt to the group
            group.promptIds.push(duplicatedPrompt.id);
            
            // Set the same enabled state as the original prompt in this group
            if (!group.promptStates) {
                group.promptStates = {};
            }
            const originalEnabledState = group.promptStates[id]?.enabled !== false; // Default to true if not set
            group.promptStates[duplicatedPrompt.id] = { enabled: originalEnabledState };
        });

        // Save groups if any were modified
        if (groupsContainingOriginal.length > 0) {
            this.saveGroups();
        }

        return duplicatedPrompt;
    }

    togglePrompt(id) {
        return this.togglePromptInActiveGroup(id);
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
                    keyboardShortcut: p.keyboardShortcut || '',
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
                        keyboardShortcut: p.keyboardShortcut || '',
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

    // Prompt Groups Management
    loadGroups() {
        try {
            const stored = localStorage.getItem(this.groupsStorageKey);
            let groups = stored ? JSON.parse(stored) : [];
            
            // Ensure all groups have required properties
            groups = groups.map(group => ({
                id: group.id || Date.now().toString() + Math.random(),
                name: group.name || 'Unnamed Group',
                promptIds: Array.isArray(group.promptIds) ? group.promptIds : [],
                isActive: !!group.isActive,
                createdAt: group.createdAt || new Date().toISOString(),
                ...group
            }));
            
            return groups;
        } catch (error) {
            console.error('Error loading prompt groups:', error);
            return [];
        }
    }

    saveGroups() {
        try {
            localStorage.setItem(this.groupsStorageKey, JSON.stringify(this.groups));
            return true;
        } catch (error) {
            console.error('Error saving prompt groups:', error);
            return false;
        }
    }

    ensureDefaultGroup() {
        // Check if we have any groups
        if (this.groups.length === 0) {
            // Create default group with all existing prompts
            const allPromptIds = this.prompts.map(p => p.id);
            this.createGroup('Default', allPromptIds, true);
        } else {
            // Ensure exactly one group is active
            const activeGroups = this.groups.filter(g => g.isActive);
            if (activeGroups.length === 0) {
                // Make first group active
                if (this.groups.length > 0) {
                    this.groups[0].isActive = true;
                    this.saveGroups();
                }
            } else if (activeGroups.length > 1) {
                // Ensure only one group is active
                this.groups.forEach((g, index) => {
                    g.isActive = index === 0;
                });
                this.saveGroups();
            }
        }

        // Migrate existing prompt states to groups
        this.migratePromptStatesToGroups();
    }

    migratePromptStatesToGroups() {
        let migrationNeeded = false;

        // Check if any prompts still have global 'enabled' property
        const promptsWithGlobalEnabled = this.prompts.filter(p => typeof p.enabled === 'boolean');
        
        if (promptsWithGlobalEnabled.length > 0) {
            // Migrate global enabled states to all groups
            this.groups.forEach(group => {
                if (!group.promptStates) {
                    group.promptStates = {};
                    migrationNeeded = true;
                }

                // For each prompt in this group, set its enabled state
                group.promptIds.forEach(promptId => {
                    const prompt = this.prompts.find(p => p.id === promptId);
                    if (prompt && typeof prompt.enabled === 'boolean' && !(promptId in group.promptStates)) {
                        group.promptStates[promptId] = { enabled: prompt.enabled };
                    }
                });
            });

            // Remove global enabled property from prompts
            this.prompts.forEach(prompt => {
                if (typeof prompt.enabled === 'boolean') {
                    delete prompt.enabled;
                    migrationNeeded = true;
                }
            });

            if (migrationNeeded) {
                this.savePrompts();
                this.saveGroups();
            }
        }

        // Ensure all groups have promptStates and all their prompts have states
        this.groups.forEach(group => {
            if (!group.promptStates) {
                group.promptStates = {};
                migrationNeeded = true;
            }

            // Ensure all prompts in group have states
            group.promptIds.forEach(promptId => {
                if (!(promptId in group.promptStates)) {
                    group.promptStates[promptId] = { enabled: true }; // Default to enabled
                    migrationNeeded = true;
                }
            });
        });

        if (migrationNeeded) {
            this.saveGroups();
        }
    }

    createGroup(name, promptIds = [], isActive = false) {
        if (!name || name.trim().length === 0) {
            throw new Error('Group name is required');
        }

        const trimmedName = name.trim();
        if (this.groups.find(g => g.name === trimmedName)) {
            throw new Error('A group with this name already exists');
        }

        // Validate prompt IDs
        const validPromptIds = promptIds.filter(id => this.prompts.find(p => p.id === id));

        // Initialize prompt states - all enabled by default
        const promptStates = {};
        validPromptIds.forEach(promptId => {
            promptStates[promptId] = { enabled: true };
        });

        const newGroup = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: trimmedName,
            promptIds: validPromptIds,
            promptStates: promptStates,
            isActive: isActive,
            createdAt: new Date().toISOString()
        };

        // If setting as active, deactivate other groups
        if (isActive) {
            this.groups.forEach(g => g.isActive = false);
        }

        this.groups.push(newGroup);
        this.saveGroups();
        return newGroup;
    }

    updateGroup(groupId, updates) {
        const index = this.groups.findIndex(g => g.id === groupId);
        if (index === -1) {
            throw new Error('Group not found');
        }

        // Validate name uniqueness if changing name
        if (updates.name && updates.name !== this.groups[index].name) {
            const trimmedName = updates.name.trim();
            if (this.groups.find(g => g.name === trimmedName && g.id !== groupId)) {
                throw new Error('A group with this name already exists');
            }
            updates.name = trimmedName;
        }

        // Validate prompt IDs if provided and update prompt states
        if (updates.promptIds) {
            updates.promptIds = updates.promptIds.filter(id => this.prompts.find(p => p.id === id));
            
            // Update prompt states - preserve existing states, add new ones as enabled
            const currentGroup = this.groups[index];
            const newPromptStates = { ...currentGroup.promptStates };
            
            // Add new prompts as enabled
            updates.promptIds.forEach(promptId => {
                if (!(promptId in newPromptStates)) {
                    newPromptStates[promptId] = { enabled: true };
                }
            });
            
            // Remove states for prompts no longer in group
            Object.keys(newPromptStates).forEach(promptId => {
                if (!updates.promptIds.includes(promptId)) {
                    delete newPromptStates[promptId];
                }
            });
            
            updates.promptStates = newPromptStates;
        }

        // If setting as active, deactivate other groups
        if (updates.isActive) {
            this.groups.forEach(g => g.isActive = false);
        }

        this.groups[index] = {
            ...this.groups[index],
            ...updates,
            id: groupId,
            updatedAt: new Date().toISOString()
        };

        this.saveGroups();
        return this.groups[index];
    }

    deleteGroup(groupId) {
        const index = this.groups.findIndex(g => g.id === groupId);
        if (index === -1) {
            throw new Error('Group not found');
        }

        const group = this.groups[index];
        
        // Prevent deleting the last group
        if (this.groups.length === 1) {
            throw new Error('Cannot delete the last group');
        }

        const wasActive = group.isActive;
        const deleted = this.groups.splice(index, 1)[0];

        // If deleted group was active, activate another group
        if (wasActive && this.groups.length > 0) {
            this.groups[0].isActive = true;
        }

        this.saveGroups();
        return deleted;
    }

    getGroup(groupId) {
        return this.groups.find(g => g.id === groupId);
    }

    getAllGroups() {
        return [...this.groups];
    }

    getActiveGroup() {
        return this.groups.find(g => g.isActive);
    }

    setActiveGroup(groupId) {
        const group = this.getGroup(groupId);
        if (!group) {
            throw new Error('Group not found');
        }

        // Deactivate all groups
        this.groups.forEach(g => g.isActive = false);
        
        // Activate the specified group
        group.isActive = true;
        
        this.saveGroups();
        return group;
    }

    getPromptsInActiveGroup() {
        const activeGroup = this.getActiveGroup();
        if (!activeGroup) {
            return [];
        }

        return this.prompts.filter(p => activeGroup.promptIds.includes(p.id));
    }

    getEnabledPromptsInActiveGroup() {
        const activeGroup = this.getActiveGroup();
        if (!activeGroup) {
            return [];
        }

        return this.prompts.filter(p => {
            return activeGroup.promptIds.includes(p.id) && 
                   activeGroup.promptStates[p.id]?.enabled === true;
        });
    }

    getEnabledPromptsByTriggerInActiveGroup(triggerTiming) {
        return this.getEnabledPromptsInActiveGroup().filter(p => p.triggerTiming === triggerTiming);
    }

    // Per-group prompt state management
    isPromptEnabledInGroup(groupId, promptId) {
        const group = this.getGroup(groupId);
        return group?.promptStates[promptId]?.enabled === true;
    }

    isPromptEnabledInActiveGroup(promptId) {
        const activeGroup = this.getActiveGroup();
        return activeGroup?.promptStates[promptId]?.enabled === true;
    }

    setPromptEnabledInGroup(groupId, promptId, enabled) {
        const group = this.getGroup(groupId);
        if (!group) {
            throw new Error('Group not found');
        }

        if (!group.promptIds.includes(promptId)) {
            throw new Error('Prompt not in group');
        }

        if (!group.promptStates) {
            group.promptStates = {};
        }

        group.promptStates[promptId] = { enabled: !!enabled };
        this.saveGroups();
        return group;
    }

    togglePromptInGroup(groupId, promptId) {
        const currentState = this.isPromptEnabledInGroup(groupId, promptId);
        return this.setPromptEnabledInGroup(groupId, promptId, !currentState);
    }

    togglePromptInActiveGroup(promptId) {
        const activeGroup = this.getActiveGroup();
        if (!activeGroup) {
            throw new Error('No active group');
        }
        return this.togglePromptInGroup(activeGroup.id, promptId);
    }

    addPromptToGroup(groupId, promptId) {
        const group = this.getGroup(groupId);
        if (!group) {
            throw new Error('Group not found');
        }

        const prompt = this.getPrompt(promptId);
        if (!prompt) {
            throw new Error('Prompt not found');
        }

        if (!group.promptIds.includes(promptId)) {
            group.promptIds.push(promptId);
            
            // Initialize prompt state as enabled
            if (!group.promptStates) {
                group.promptStates = {};
            }
            group.promptStates[promptId] = { enabled: true };
            
            this.saveGroups();
        }

        return group;
    }

    removePromptFromGroup(groupId, promptId) {
        const group = this.getGroup(groupId);
        if (!group) {
            throw new Error('Group not found');
        }

        const index = group.promptIds.indexOf(promptId);
        if (index !== -1) {
            group.promptIds.splice(index, 1);
            
            // Remove prompt state
            if (group.promptStates && group.promptStates[promptId]) {
                delete group.promptStates[promptId];
            }
            
            this.saveGroups();
        }

        return group;
    }

    // Override the existing getEnabledPrompts to respect active group
    getEnabledPrompts() {
        return this.getEnabledPromptsInActiveGroup();
    }

    // Override the existing getEnabledPromptsByTrigger to respect active group
    getEnabledPromptsByTrigger(triggerTiming) {
        return this.getEnabledPromptsByTriggerInActiveGroup(triggerTiming);
    }

    // Toggle all prompts functionality
    enableAllPromptsInActiveGroup() {
        const activeGroup = this.getActiveGroup();
        if (!activeGroup) {
            throw new Error('No active group');
        }

        // Enable all prompts in the active group
        activeGroup.promptIds.forEach(promptId => {
            if (!activeGroup.promptStates) {
                activeGroup.promptStates = {};
            }
            activeGroup.promptStates[promptId] = { enabled: true };
        });

        this.saveGroups();
        return activeGroup;
    }

    disableAllPromptsInActiveGroup() {
        const activeGroup = this.getActiveGroup();
        if (!activeGroup) {
            throw new Error('No active group');
        }

        // Disable all prompts in the active group
        activeGroup.promptIds.forEach(promptId => {
            if (!activeGroup.promptStates) {
                activeGroup.promptStates = {};
            }
            activeGroup.promptStates[promptId] = { enabled: false };
        });

        this.saveGroups();
        return activeGroup;
    }

    toggleAllPromptsInActiveGroup() {
        const activeGroup = this.getActiveGroup();
        if (!activeGroup) {
            throw new Error('No active group');
        }

        // Check if all prompts are currently enabled
        const allEnabled = activeGroup.promptIds.every(promptId => 
            activeGroup.promptStates?.[promptId]?.enabled === true
        );

        // If all are enabled, disable all; otherwise, enable all
        if (allEnabled) {
            return this.disableAllPromptsInActiveGroup();
        } else {
            return this.enableAllPromptsInActiveGroup();
        }
    }

    areAllPromptsEnabledInActiveGroup() {
        const activeGroup = this.getActiveGroup();
        if (!activeGroup || activeGroup.promptIds.length === 0) {
            return false;
        }

        return activeGroup.promptIds.every(promptId => 
            activeGroup.promptStates?.[promptId]?.enabled === true
        );
    }
}