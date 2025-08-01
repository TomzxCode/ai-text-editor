class AIService {
    constructor() {
        this.isGeneratingRecommendations = false;
        this.hasPendingRecommendationRequest = false;
        this.recommendationTimer = null;
        this.loadingStartTime = null;
        this.loadingTimerInterval = null;
    }

    async getRecommendations(content) {
        try {
            const response = await fetch('/analyze-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: content,
                    max_recommendations: 5
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
            console.error('Error calling AI API:', error);
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

    async generateRecommendations(content, onLoading, onComplete, onError) {
        if (content.length < 10) return;

        if (this.isGeneratingRecommendations) {
            this.hasPendingRecommendationRequest = true;
            return;
        }

        this.isGeneratingRecommendations = true;
        this.hasPendingRecommendationRequest = false;

        onLoading(true);
        this.startLoadingTimer();

        try {
            const recommendations = await this.getRecommendations(content);
            onComplete(recommendations);
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
                    this.generateRecommendations(content, onLoading, onComplete, onError);
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