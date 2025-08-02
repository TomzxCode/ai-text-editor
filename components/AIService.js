class AIService {
    constructor() {
        this.isGeneratingRecommendations = false;
        this.hasPendingRecommendationRequest = false;
        this.recommendationTimer = null;
        this.loadingStartTime = null;
        this.loadingTimerInterval = null;
    }

    async getDefaultRecommendations(content) {
        try {
            const response = await fetch('/analyze-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: content,
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            return {
                recommendations: data.recommendations || [],
                word_count: data.word_count || 0,
                character_count: data.character_count || 0
            };
        } catch (error) {
            console.error('Error calling default analysis API:', error);
            return {
                recommendations: [
                    {
                        category: "Connection Error",
                        suggestion: "Unable to connect to AI service. Please check your internet connection.",
                        priority: "high"
                    }
                ],
                word_count: content.split(/\s+/).length,
                character_count: content.length
            };
        }
    }

    async getCustomPromptRecommendations(content, promptName, promptText) {
        try {
            const response = await fetch('/analyze-custom-prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: content,
                    prompt_name: promptName,
                    prompt_text: promptText
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            return {
                recommendations: data.recommendations || [],
                word_count: data.word_count || 0,
                character_count: data.character_count || 0,
                promptName: promptName
            };
        } catch (error) {
            console.error(`Error calling custom prompt API for '${promptName}':`, error);
            return {
                recommendations: [
                    {
                        category: `${promptName} - Connection Error`,
                        suggestion: "Unable to connect to AI service. Please check your internet connection.",
                        priority: "high"
                    }
                ],
                word_count: content.split(/\s+/).length,
                character_count: content.length,
                promptName: promptName
            };
        }
    }

    async improveText(text) {
        try {
            const response = await fetch('/improve-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            return data.improved_text || text;
        } catch (error) {
            console.error('Error calling improve text API:', error);
            throw new Error('Unable to improve text. Please check your internet connection.');
        }
    }

    async summarizeText(text) {
        try {
            const response = await fetch('/summarize-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            return data.summary || 'Unable to generate summary.';
        } catch (error) {
            console.error('Error calling summarization API:', error);
            throw new Error('Unable to generate summary. Please check your internet connection.');
        }
    }

    scheduleRecommendations(callback, delay = 1000) {
        clearTimeout(this.recommendationTimer);

        if (this.isGeneratingRecommendations) {
            this.hasPendingRecommendationRequest = true;
            return;
        }

        this.recommendationTimer = setTimeout(() => {
            callback();
        }, delay);
    }

    async generateRecommendations(content, onLoading, onProgressiveComplete, onError, customPrompts = [], settings = {}) {
        if (content.length < 10) return;

        if (this.isGeneratingRecommendations) {
            this.hasPendingRecommendationRequest = true;
            return;
        }

        this.isGeneratingRecommendations = true;
        this.hasPendingRecommendationRequest = false;

        onLoading(true);
        this.startLoadingTimer();

        // Check if AI recommendations are disabled
        if (!settings.enableAIRecommendations) {
            try {
                const disabledRecommendations = [{
                    promptName: 'AI Recommendations Disabled',
                    recommendations: [
                        {
                            category: "AI Recommendations Disabled",
                            suggestion: "AI recommendations are currently disabled in settings. Enable them in the Settings tab to get AI-powered writing suggestions.",
                            priority: "low"
                        },
                        {
                            category: "Text Statistics", 
                            suggestion: `Word count: ${content.split(/\s+/).length}, Character count: ${content.length}`,
                            priority: "low"
                        }
                    ]
                }];

                onProgressiveComplete({
                    groupedRecommendations: disabledRecommendations,
                    word_count: content.split(/\s+/).length,
                    character_count: content.length,
                    isComplete: true,
                    completedCount: 1,
                    totalCount: 1
                });

            } finally {
                onLoading(false);
                this.stopLoadingTimer();
                this.isGeneratingRecommendations = false;

                if (this.hasPendingRecommendationRequest) {
                    this.hasPendingRecommendationRequest = false;
                    setTimeout(() => {
                        this.generateRecommendations(content, onLoading, onProgressiveComplete, onError, customPrompts, settings);
                    }, 100);
                }
            }
            return;
        }

        try {
            // Start with default recommendations
            const defaultPromise = this.getDefaultRecommendations(content);

            // Create promises for all custom prompts
            const customPromises = customPrompts
                .filter(prompt => prompt.enabled)
                .map(prompt =>
                    this.getCustomPromptRecommendations(content, prompt.name, prompt.prompt)
                        .then(result => ({ ...result, promptId: prompt.id }))
                );

            // Combine all promises
            const allPromises = [defaultPromise, ...customPromises];

            // Process results as they complete
            let completedCount = 0;
            const groupedRecommendations = [];
            let combinedWordCount = 0;
            let combinedCharCount = 0;

            // Wait for each promise and update UI progressively
            for (const promise of allPromises) {
                try {
                    const result = await promise;

                    // Update counters from first result only
                    if (completedCount === 0) {
                        combinedWordCount = result.word_count;
                        combinedCharCount = result.character_count;
                    }

                    // Add recommendations grouped by prompt
                    const promptName = result.promptName || 'General';
                    groupedRecommendations.push({
                        promptName: promptName,
                        recommendations: result.recommendations
                    });
                    completedCount++;

                    // Send progressive update
                    onProgressiveComplete({
                        groupedRecommendations: [...groupedRecommendations],
                        word_count: combinedWordCount,
                        character_count: combinedCharCount,
                        isComplete: completedCount === allPromises.length,
                        completedCount,
                        totalCount: allPromises.length
                    });

                } catch (error) {
                    console.error('Error with individual prompt:', error);
                    completedCount++;

                    // Add error recommendation group
                    groupedRecommendations.push({
                        promptName: 'Error',
                        recommendations: [{
                            category: "Error",
                            suggestion: "One of the analysis requests failed. Please try again.",
                            priority: "low"
                        }]
                    });

                    // Send update even for errors
                    onProgressiveComplete({
                        groupedRecommendations: [...groupedRecommendations],
                        word_count: combinedWordCount,
                        character_count: combinedCharCount,
                        isComplete: completedCount === allPromises.length,
                        completedCount,
                        totalCount: allPromises.length
                    });
                }
            }

        } catch (error) {
            console.error('Error generating AI recommendations:', error);
            onError('Unable to generate recommendations. Please check your connection.');
        } finally {
            onLoading(false);
            this.stopLoadingTimer();
            this.isGeneratingRecommendations = false;

            if (this.hasPendingRecommendationRequest) {
                this.hasPendingRecommendationRequest = false;
                setTimeout(() => {
                    this.generateRecommendations(content, onLoading, onProgressiveComplete, onError, customPrompts, settings);
                }, 100);
            }
        }
    }

    startLoadingTimer() {
        this.loadingStartTime = Date.now();
        this.loadingTimerInterval = setInterval(() => {
            const elapsed = (Date.now() - this.loadingStartTime) / 1000;
            const timerElement = document.getElementById('loadingTimer');
            if (timerElement) {
                timerElement.textContent = elapsed.toFixed(1) + 's';
            }
        }, 100);
    }

    stopLoadingTimer() {
        if (this.loadingTimerInterval) {
            clearInterval(this.loadingTimerInterval);
            this.loadingTimerInterval = null;
        }
        const timerElement = document.getElementById('loadingTimer');
        if (timerElement) {
            timerElement.textContent = '0.0s';
        }
    }

    getCategoryIcon(category) {
        const icons = {
            'Style': '✨',
            'Grammar': '📝',
            'Vocabulary': '📚',
            'Structure': '🏗️',
            'Clarity': '💡',
            'Syntax': '⚙️',
            'Connection Error': '⚠️',
            'AI Analysis': '🤖'
        };
        return icons[category] || '📋';
    }

    clearTimers() {
        clearTimeout(this.recommendationTimer);
        this.stopLoadingTimer();
    }
}
