class LLMCallStorage {
    constructor() {
        this.storageKey = 'llm_call_history';
    }

    storeLLMCall(promptIdentifier, usage = null) {
        const callData = {
            id: this.generateId(),
            promptIdentifier: promptIdentifier,
            usage: usage,
            timestamp: new Date().toISOString()
        };

        try {
            const existingData = this.getAllCalls();
            existingData.push(callData);
            
            localStorage.setItem(this.storageKey, JSON.stringify(existingData));
            
            console.log(`Stored LLM call for prompt: ${promptIdentifier}`);
            return callData.id;
        } catch (error) {
            console.error('Error storing LLM call:', error);
            return null;
        }
    }

    getAllCalls() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error retrieving LLM calls:', error);
            return [];
        }
    }

    getCallsByPrompt(promptIdentifier) {
        const allCalls = this.getAllCalls();
        return allCalls.filter(call => call.promptIdentifier === promptIdentifier);
    }

    getCallsByDate(dateString) {
        const allCalls = this.getAllCalls();
        const targetDate = new Date(dateString).toDateString();
        return allCalls.filter(call => {
            const callDate = new Date(call.timestamp).toDateString();
            return callDate === targetDate;
        });
    }

    getCallsInDateRange(startDate, endDate) {
        const allCalls = this.getAllCalls();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return allCalls.filter(call => {
            const callDate = new Date(call.timestamp);
            return callDate >= start && callDate <= end;
        });
    }

    getUsageStatistics() {
        const allCalls = this.getAllCalls();
        const stats = {
            totalCalls: allCalls.length,
            totalTokensUsed: 0,
            totalPromptTokens: 0,
            totalCompletionTokens: 0,
            callsByPrompt: {},
            callsByDate: {}
        };

        allCalls.forEach(call => {
            if (call.usage) {
                stats.totalTokensUsed += call.usage.total_tokens || 0;
                stats.totalPromptTokens += call.usage.prompt_tokens || 0;
                stats.totalCompletionTokens += call.usage.completion_tokens || 0;
            }

            stats.callsByPrompt[call.promptIdentifier] = (stats.callsByPrompt[call.promptIdentifier] || 0) + 1;
            
            const callDate = new Date(call.timestamp).toDateString();
            stats.callsByDate[callDate] = (stats.callsByDate[callDate] || 0) + 1;
        });

        return stats;
    }

    clearHistory() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('LLM call history cleared');
            return true;
        } catch (error) {
            console.error('Error clearing LLM call history:', error);
            return false;
        }
    }

    clearOldCalls(daysToKeep = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            const allCalls = this.getAllCalls();
            const filteredCalls = allCalls.filter(call => {
                const callDate = new Date(call.timestamp);
                return callDate >= cutoffDate;
            });
            
            localStorage.setItem(this.storageKey, JSON.stringify(filteredCalls));
            console.log(`Cleared LLM calls older than ${daysToKeep} days`);
            return allCalls.length - filteredCalls.length;
        } catch (error) {
            console.error('Error clearing old LLM calls:', error);
            return 0;
        }
    }

    exportHistory() {
        const allCalls = this.getAllCalls();
        const exportData = {
            exportDate: new Date().toISOString(),
            totalCalls: allCalls.length,
            calls: allCalls
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}