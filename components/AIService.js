class AIService {
    constructor() {
        this.isGeneratingRecommendations = false;
        this.hasPendingRecommendationRequest = false;
        this.recommendationTimer = null;
        this.activeRequests = new Map(); // Track individual request timers
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
                recommendations: data.recommendations || []
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
                ]
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

        // Check if AI recommendations are disabled
        if (!settings.enableAIRecommendations) {
            try {
                // Clear initial placeholder
                const initialPlaceholder = document.getElementById('initialPlaceholder');
                if (initialPlaceholder) {
                    initialPlaceholder.remove();
                }
                
                const disabledRecommendations = [{
                    promptName: 'AI Recommendations Disabled',
                    recommendations: [
                        {
                            category: "AI Recommendations Disabled",
                            suggestion: "AI recommendations are currently disabled in settings. Enable them in the Settings tab to get AI-powered writing suggestions.",
                            priority: "low"
                        }
                    ]
                }];

                onProgressiveComplete({
                    groupedRecommendations: disabledRecommendations,
                    isComplete: true,
                    completedCount: 1,
                    totalCount: 1
                });

            } finally {
                onLoading(false);
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
            // Clear any existing placeholders and initial placeholder message
            this.clearAllRequestPlaceholders();
            const initialPlaceholder = document.getElementById('initialPlaceholder');
            if (initialPlaceholder) {
                initialPlaceholder.remove();
            }
            
            // Create placeholder for default recommendations
            const defaultRequestId = 'default';
            this.createRequestPlaceholder(defaultRequestId, 'General');
            const defaultPromise = this.getDefaultRecommendations(content);

            // Create promises and placeholders for all custom prompts
            const customPromises = customPrompts
                .filter(prompt => prompt.enabled)
                .map(prompt => {
                    const requestId = `custom-${prompt.id}`;
                    this.createRequestPlaceholder(requestId, prompt.name);
                    return this.getCustomPromptRecommendations(content, prompt.name, prompt.prompt)
                        .then(result => ({ ...result, promptId: prompt.id, requestId }));
                });

            // Combine all promises with their request IDs
            const allPromises = [
                defaultPromise.then(result => ({ ...result, requestId: defaultRequestId })),
                ...customPromises
            ];

            // Process results as they complete
            let completedCount = 0;
            const groupedRecommendations = [];

            // Wait for each promise and update UI progressively
            for (const promise of allPromises) {
                try {
                    const result = await promise;

                    // Replace the placeholder for this completed request
                    if (result.requestId) {
                        const promptName = result.promptName || 'General';
                        this.replaceRequestPlaceholder(result.requestId, result.recommendations, promptName);
                    }

                    // Add recommendations grouped by prompt (for final completion callback)
                    const promptName = result.promptName || 'General';
                    groupedRecommendations.push({
                        promptName: promptName,
                        recommendations: result.recommendations
                    });
                    completedCount++;

                    // Only send completion signal when all are done
                    if (completedCount === allPromises.length) {
                        onProgressiveComplete({
                            groupedRecommendations: [...groupedRecommendations],
                            isComplete: true,
                            completedCount,
                            totalCount: allPromises.length
                        });
                    }

                } catch (error) {
                    console.error('Error with individual prompt:', error);
                    
                    // For errors, we'll handle cleanup at the end since we can't identify which request failed
                    completedCount++;

                    // Add error recommendation group for final callback
                    groupedRecommendations.push({
                        promptName: 'Error',
                        recommendations: [{
                            category: "Error",
                            suggestion: "One of the analysis requests failed. Please try again.",
                            priority: "low"
                        }]
                    });

                    // Send completion signal when all are done (including failed ones)
                    if (completedCount === allPromises.length) {
                        onProgressiveComplete({
                            groupedRecommendations: [...groupedRecommendations],
                            isComplete: true,
                            completedCount,
                            totalCount: allPromises.length
                        });
                    }
                }
            }

        } catch (error) {
            console.error('Error generating AI recommendations:', error);
            onError('Unable to generate recommendations. Please check your connection.');
        } finally {
            onLoading(false);
            // Clean up any remaining placeholders
            this.clearAllRequestPlaceholders();
            this.isGeneratingRecommendations = false;

            if (this.hasPendingRecommendationRequest) {
                this.hasPendingRecommendationRequest = false;
                setTimeout(() => {
                    this.generateRecommendations(content, onLoading, onProgressiveComplete, onError, customPrompts, settings);
                }, 100);
            }
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

    createRequestPlaceholder(requestId, promptName) {
        const container = document.getElementById('recommendationsContainer');
        const placeholder = document.createElement('div');
        placeholder.className = 'recommendation-item loading-item';
        placeholder.id = `placeholder-${requestId}`;
        placeholder.innerHTML = `
            <h4>🔄 ${promptName}</h4>
            <p>
                <span class="loading-timer" id="timer-${requestId}">0.0s</span>
                <span class="loading-text">Analyzing...</span>
            </p>
        `;
        
        // Insert at the beginning of the container
        container.insertBefore(placeholder, container.firstChild);
        
        // Start timer for this request
        const startTime = Date.now();
        const timerInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const timerElement = document.getElementById(`timer-${requestId}`);
            if (timerElement) {
                timerElement.textContent = elapsed.toFixed(1) + 's';
            }
        }, 100);
        
        this.activeRequests.set(requestId, {
            startTime,
            timerInterval,
            promptName
        });
        
        return placeholder;
    }

    replaceRequestPlaceholder(requestId, recommendations, promptName) {
        const placeholder = document.getElementById(`placeholder-${requestId}`);
        if (!placeholder) return;
        
        // Stop and clear the timer
        const request = this.activeRequests.get(requestId);
        if (request && request.timerInterval) {
            clearInterval(request.timerInterval);
        }
        this.activeRequests.delete(requestId);
        
        // Create the new recommendation content
        if (recommendations && recommendations.length > 0) {
            const groupedRecs = {};
            recommendations.forEach(rec => {
                if (!groupedRecs[rec.category]) {
                    groupedRecs[rec.category] = [];
                }
                groupedRecs[rec.category].push(rec);
            });

            let html = `<div class="recommendation-item">
                <h4>✨ ${promptName}</h4>`;
            
            for (const [category, recs] of Object.entries(groupedRecs)) {
                html += `
                    <div class="category-section">
                        <h5>${category}</h5>
                        ${recs.map(rec => `
                            <p class="recommendation-${rec.priority}">
                                • ${rec.suggestion}
                                <span class="priority-badge ${rec.priority}">${rec.priority}</span>
                            </p>
                        `).join('')}
                    </div>
                `;
            }
            html += '</div>';
            
            placeholder.outerHTML = html;
        } else {
            // No recommendations - show a simple message
            placeholder.outerHTML = `
                <div class="recommendation-item">
                    <h4>✨ ${promptName}</h4>
                    <p>No specific recommendations at this time. Your text looks good!</p>
                </div>
            `;
        }
    }

    removeRequestPlaceholder(requestId) {
        const placeholder = document.getElementById(`placeholder-${requestId}`);
        if (placeholder) {
            placeholder.remove();
        }
        
        const request = this.activeRequests.get(requestId);
        if (request && request.timerInterval) {
            clearInterval(request.timerInterval);
        }
        
        this.activeRequests.delete(requestId);
    }

    clearAllRequestPlaceholders() {
        // Clear all active request timers and placeholders
        this.activeRequests.forEach((request, requestId) => {
            this.removeRequestPlaceholder(requestId);
        });
        this.activeRequests.clear();
    }

    clearTimers() {
        clearTimeout(this.recommendationTimer);
        this.clearAllRequestPlaceholders();
    }
}
