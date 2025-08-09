class AIService {
    constructor() {
        this.isGeneratingRecommendations = false;
        this.hasPendingRecommendationRequest = false;
        this.recommendationTimer = null;
        this.activeRequests = new Map(); // Track individual request timers
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
            
            // Handle new generic response format
            if (data.items && data.response_type) {
                // Convert generic items to recommendations format for UI compatibility
                const recommendations = this.convertGenericItemsToRecommendations(data.items, data.response_type);
                return {
                    recommendations: recommendations,
                    promptName: promptName,
                    responseType: data.response_type,
                    originalItems: data.items
                };
            } 
            // Handle legacy recommendations format
            else if (data.recommendations) {
                return {
                    recommendations: data.recommendations || [],
                    promptName: promptName,
                    responseType: 'recommendations'
                };
            }
            // Fallback
            else {
                return {
                    recommendations: [],
                    promptName: promptName,
                    responseType: 'analysis'
                };
            }
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
                promptName: promptName,
                responseType: 'error'
            };
        }
    }

    convertGenericItemsToRecommendations(items, responseType) {
        if (!items || !Array.isArray(items)) {
            return [];
        }

        return items.map(item => {
            switch (item.type) {
                case 'recommendation':
                    return {
                        category: item.content.category || 'Analysis',
                        suggestion: item.content.suggestion || '',
                        priority: item.content.priority || 'medium',
                        type: 'recommendation'
                    };
                
                case 'citation':
                case 'reference':
                    const citationFormatted = this.formatCitation(item.content);
                    return {
                        category: 'References',
                        suggestion: citationFormatted.text,
                        priority: 'medium',
                        type: 'citation',
                        htmlContent: citationFormatted.html,
                        originalContent: item.content
                    };
                
                case 'diff':
                    const diffFormatted = this.formatDiff(item.content);
                    return {
                        category: 'Suggested Edits',
                        suggestion: diffFormatted.text,
                        priority: 'high',
                        type: 'diff',
                        htmlContent: diffFormatted.html,
                        originalContent: item.content
                    };
                
                case 'analysis':
                case 'insight':
                    return {
                        category: item.content.title || 'Analysis',
                        suggestion: item.content.description || JSON.stringify(item.content),
                        priority: 'medium',
                        type: 'analysis'
                    };
                
                default:
                    return {
                        category: item.type?.charAt(0).toUpperCase() + item.type?.slice(1) || 'Analysis',
                        suggestion: typeof item.content === 'string' ? item.content : JSON.stringify(item.content),
                        priority: 'medium',
                        type: 'general'
                    };
            }
        });
    }

    formatCitation(content) {
        // Create a structured citation display
        return {
            html: this.createCitationHTML(content),
            text: this.createCitationText(content)
        };
    }

    formatDiff(content) {
        // Create a structured diff display
        return {
            html: this.createDiffHTML(content),
            text: this.createDiffText(content)
        };
    }

    createCitationHTML(content) {
        const fields = [];
        
        if (content.source) {
            fields.push(`
                <div class="citation-field">
                    <span class="field-label">Source</span>
                    <span class="field-value">${this.escapeHTML(content.source)}</span>
                </div>
            `);
        }
        
        if (content.title) {
            fields.push(`
                <div class="citation-field">
                    <span class="field-label">Title</span>
                    <span class="field-value">${this.escapeHTML(content.title)}</span>
                </div>
            `);
        }
        
        if (content.url) {
            fields.push(`
                <div class="citation-field">
                    <span class="field-label">URL</span>
                    <span class="field-value link" onclick="window.open('${this.escapeHTML(content.url)}', '_blank')">${this.escapeHTML(content.url)}</span>
                </div>
            `);
        }
        
        if (content.relevance) {
            fields.push(`
                <div class="citation-field">
                    <span class="field-label">Relevance</span>
                    <span class="field-value">${this.escapeHTML(content.relevance)}</span>
                </div>
            `);
        }

        return `
            <div class="citation-content">
                ${fields.join('')}
            </div>
        `;
    }

    createDiffHTML(content) {
        let html = '<div class="diff-content">';
        
        if (content.original) {
            html += `
                <div class="diff-section">
                    <div class="diff-text original" data-label="Original">
                        ${this.escapeHTML(content.original)}
                    </div>
                </div>
            `;
        }
        
        if (content.suggested) {
            html += `
                <div class="diff-section">
                    <div class="diff-text suggested" data-label="Suggested">
                        ${this.escapeHTML(content.suggested)}
                    </div>
                </div>
            `;
        }
        
        if (content.reason) {
            html += `
                <div class="diff-reason">
                    ${this.escapeHTML(content.reason)}
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    createCitationText(content) {
        const parts = [];
        if (content.source) parts.push(`Source: ${content.source}`);
        if (content.title) parts.push(`Title: ${content.title}`);
        if (content.url) parts.push(`URL: ${content.url}`);
        if (content.relevance) parts.push(`Relevance: ${content.relevance}`);
        return parts.join('\n');
    }

    createDiffText(content) {
        const parts = [];
        if (content.original) parts.push(`Original: "${content.original}"`);
        if (content.suggested) parts.push(`Suggested: "${content.suggested}"`);
        if (content.reason) parts.push(`Reason: ${content.reason}`);
        return parts.join('\n');
    }

    escapeHTML(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
            // Clear any existing loading placeholders but preserve completed recommendations
            this.clearOnlyLoadingPlaceholders();
            const initialPlaceholder = document.getElementById('initialPlaceholder');
            if (initialPlaceholder) {
                initialPlaceholder.remove();
            }
            
            // Only use enabled custom prompts
            const enabledPrompts = customPrompts.filter(prompt => prompt.enabled);
            
            // If no custom prompts are enabled, show a message
            if (enabledPrompts.length === 0) {
                const noPromptsRecommendations = [{
                    promptName: 'No Custom Prompts',
                    recommendations: [
                        {
                            category: "Setup Required",
                            suggestion: "No custom prompts are enabled. Go to the Custom Prompts tab to create and enable prompts for AI analysis.",
                            priority: "low"
                        }
                    ]
                }];

                onProgressiveComplete({
                    groupedRecommendations: noPromptsRecommendations,
                    isComplete: true,
                    completedCount: 1,
                    totalCount: 1
                });
                return;
            }
            
            // Show update indicators for existing recommendations that will be refreshed
            this.showUpdateIndicatorsForExistingRecommendations(enabledPrompts.map(p => p.name));

            // Create promises and placeholders for all custom prompts
            const allPromises = enabledPrompts.map(prompt => {
                const requestId = `custom-${prompt.id}`;
                this.createOrUpdateRequestContainer(requestId, prompt.name, true);
                return this.getCustomPromptRecommendations(content, prompt.name, prompt.prompt)
                    .then(result => ({ ...result, promptId: prompt.id, requestId }));
            });

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
            'AI Analysis': '🤖',
            'References': '📚',
            'Suggested Edits': '✏️',
            'Analysis': '🔍',
            'Citations': '📖',
            'Diffs': '📝',
            'Insights': '💡'
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
        
        // Check if this was an existing container converted to loading state
        const wasExistingContainer = request && request.existingContainer;
        
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

            let html = '';
            
            if (wasExistingContainer) {
                // Update the existing container in place
                placeholder.classList.remove('loading-item');
                placeholder.id = ''; // Remove the placeholder ID
                
                // Update the heading
                const heading = placeholder.querySelector('h4');
                if (heading) {
                    heading.innerHTML = `✨ ${promptName}`;
                }
                
                // Replace the content but keep the container
                let contentHtml = '';
                for (const [category, recs] of Object.entries(groupedRecs)) {
                    contentHtml += `<div class="category-section">
                        <h5>${category}</h5>`;
                    
                    recs.forEach(rec => {
                        // Use specialized display for citations and diffs
                        if (rec.type === 'citation') {
                            contentHtml += `
                                <div class="citation-item">
                                    <div class="citation-header">
                                        <span class="citation-icon">📚</span>
                                        <h6 class="citation-title">Citation</h6>
                                    </div>
                                    ${rec.htmlContent}
                                    <span class="priority-badge citation">${rec.priority}</span>
                                </div>
                            `;
                        } else if (rec.type === 'diff') {
                            contentHtml += `
                                <div class="diff-item">
                                    <div class="diff-header">
                                        <span class="diff-icon">✏️</span>
                                        <h6 class="diff-title">Suggested Edit</h6>
                                    </div>
                                    ${rec.htmlContent}
                                    <span class="priority-badge diff">${rec.priority}</span>
                                </div>
                            `;
                        } else {
                            // Standard recommendation display
                            const priorityClass = rec.type || rec.priority;
                            contentHtml += `
                                <p class="recommendation-${rec.priority}">
                                    • ${this.escapeHTML(rec.suggestion)}
                                    <span class="priority-badge ${priorityClass}">${rec.priority}</span>
                                </p>
                            `;
                        }
                    });
                    
                    contentHtml += `</div>`;
                }
                
                // Remove all content except the heading and add new content
                const elementsToRemove = placeholder.querySelectorAll('.category-section, p:not(.loading-text)');
                elementsToRemove.forEach(el => el.remove());
                
                // Remove any loading text
                const loadingText = placeholder.querySelector('.loading-text');
                if (loadingText && loadingText.parentElement) {
                    loadingText.parentElement.remove();
                }
                
                placeholder.insertAdjacentHTML('beforeend', contentHtml);
                
            } else {
                // Replace entire placeholder as before
                html = `<div class="recommendation-item">
                    <h4>✨ ${promptName}</h4>`;
                
                for (const [category, recs] of Object.entries(groupedRecs)) {
                    html += `<div class="category-section">
                        <h5>${category}</h5>`;
                    
                    recs.forEach(rec => {
                        // Use specialized display for citations and diffs
                        if (rec.type === 'citation') {
                            html += `
                                <div class="citation-item">
                                    <div class="citation-header">
                                        <span class="citation-icon">📚</span>
                                        <h6 class="citation-title">Citation</h6>
                                    </div>
                                    ${rec.htmlContent}
                                    <span class="priority-badge citation">${rec.priority}</span>
                                </div>
                            `;
                        } else if (rec.type === 'diff') {
                            html += `
                                <div class="diff-item">
                                    <div class="diff-header">
                                        <span class="diff-icon">✏️</span>
                                        <h6 class="diff-title">Suggested Edit</h6>
                                    </div>
                                    ${rec.htmlContent}
                                    <span class="priority-badge diff">${rec.priority}</span>
                                </div>
                            `;
                        } else {
                            // Standard recommendation display
                            const priorityClass = rec.type || rec.priority;
                            html += `
                                <p class="recommendation-${rec.priority}">
                                    • ${this.escapeHTML(rec.suggestion)}
                                    <span class="priority-badge ${priorityClass}">${rec.priority}</span>
                                </p>
                            `;
                        }
                    });
                    
                    html += `</div>`;
                }
                html += '</div>';
                
                placeholder.outerHTML = html;
            }
        } else {
            // No recommendations - show a simple message
            if (wasExistingContainer) {
                placeholder.classList.remove('loading-item');
                placeholder.id = '';
                
                const heading = placeholder.querySelector('h4');
                if (heading) {
                    heading.innerHTML = `✨ ${promptName}`;
                }
                
                // Remove loading content and add no-recommendations message
                const elementsToRemove = placeholder.querySelectorAll('.category-section, p');
                elementsToRemove.forEach(el => el.remove());
                
                placeholder.insertAdjacentHTML('beforeend', '<p>No specific recommendations at this time. Your text looks good!</p>');
            } else {
                placeholder.outerHTML = `
                    <div class="recommendation-item">
                        <h4>✨ ${promptName}</h4>
                        <p>No specific recommendations at this time. Your text looks good!</p>
                    </div>
                `;
            }
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

    clearOnlyLoadingPlaceholders() {
        // Clear only placeholders that are currently loading (have timers)
        const loadingRequestIds = [];
        this.activeRequests.forEach((request, requestId) => {
            if (request.timerInterval) {
                loadingRequestIds.push(requestId);
            }
        });
        
        loadingRequestIds.forEach(requestId => {
            this.removeRequestPlaceholder(requestId);
        });
    }

    showUpdateIndicatorsForExistingRecommendations(promptNames) {
        const container = document.getElementById('recommendationsContainer');
        if (!container) return;
        
        promptNames.forEach(promptName => {
            // Find existing recommendation container for this prompt
            const existingContainer = this.findExistingRecommendationContainer(promptName);
            if (existingContainer && !existingContainer.classList.contains('loading-item')) {
                // Add update indicator to existing container
                this.addUpdateIndicator(existingContainer, promptName);
            }
        });
    }

    findExistingRecommendationContainer(promptName) {
        const container = document.getElementById('recommendationsContainer');
        if (!container) return null;
        
        // Look for a container with this prompt name in its heading
        const containers = container.querySelectorAll('.recommendation-item');
        for (const cont of containers) {
            const heading = cont.querySelector('h4');
            if (heading && heading.textContent.includes(promptName)) {
                return cont;
            }
        }
        return null;
    }

    addUpdateIndicator(container, promptName) {
        // Remove any existing update indicator
        const existingIndicator = container.querySelector('.update-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Add a subtle update indicator
        const heading = container.querySelector('h4');
        if (heading) {
            const indicator = document.createElement('span');
            indicator.className = 'update-indicator';
            indicator.innerHTML = '🔄';
            indicator.style.opacity = '0.6';
            indicator.style.fontSize = '0.8em';
            indicator.style.marginLeft = '8px';
            heading.appendChild(indicator);
            
            // Start a subtle animation
            let opacity = 0.3;
            let increasing = true;
            const animateInterval = setInterval(() => {
                if (increasing) {
                    opacity += 0.1;
                    if (opacity >= 0.8) increasing = false;
                } else {
                    opacity -= 0.1;
                    if (opacity <= 0.3) increasing = true;
                }
                indicator.style.opacity = opacity;
            }, 200);
            
            // Store the interval so we can clear it later
            indicator.dataset.animationInterval = animateInterval;
        }
    }

    createOrUpdateRequestContainer(requestId, promptName, isLoading = false) {
        const container = document.getElementById('recommendationsContainer');
        if (!container) return null;
        
        // Check if there's already a container for this prompt
        const existingContainer = this.findExistingRecommendationContainer(promptName);
        
        if (existingContainer && !isLoading) {
            // Just update the existing container
            return existingContainer;
        } else if (existingContainer && isLoading) {
            // Convert existing container to loading state
            this.convertToLoadingState(existingContainer, requestId, promptName);
            return existingContainer;
        } else {
            // Create new placeholder as before
            return this.createRequestPlaceholder(requestId, promptName);
        }
    }

    convertToLoadingState(existingContainer, requestId, promptName) {
        // Remove any existing update indicator
        const updateIndicator = existingContainer.querySelector('.update-indicator');
        if (updateIndicator) {
            // Clear the animation interval
            const intervalId = updateIndicator.dataset.animationInterval;
            if (intervalId) {
                clearInterval(parseInt(intervalId));
            }
            updateIndicator.remove();
        }
        
        // Add loading state to the existing container
        existingContainer.classList.add('loading-item');
        existingContainer.id = `placeholder-${requestId}`;
        
        // Add a loading indicator to the heading
        const heading = existingContainer.querySelector('h4');
        if (heading) {
            // Update the heading with loading indicator
            const originalText = heading.textContent.replace(/^[🔄✨]\s*/, '');
            heading.innerHTML = `🔄 ${originalText} <span class="loading-timer" id="timer-${requestId}">0.0s</span>`;
        }
        
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
            promptName,
            existingContainer: true
        });
    }

    clearTimers() {
        clearTimeout(this.recommendationTimer);
        this.clearAllRequestPlaceholders();
    }
}
