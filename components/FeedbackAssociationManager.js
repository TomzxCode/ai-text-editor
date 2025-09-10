class FeedbackAssociationManager {
    constructor() {
        // Association data structure: Maps content to feedback entries
        // contentId -> { content, type, position, feedback[], timestamp }
        this.contentAssociations = new Map();
        
        // Reverse mapping for quick lookups: feedbackId -> contentId
        this.feedbackToContent = new Map();
        
        // Counter for generating unique IDs
        this.nextContentId = 1;
        this.nextFeedbackId = 1;
        
        // Content change listeners
        this.contentChangeCallbacks = [];
    }

    /**
     * Creates or updates a content association when word/sentence/paragraph completion occurs
     * @param {string} content - The completed content (word, sentence, or paragraph)
     * @param {string} type - The type of content ('word', 'sentence', 'paragraph')
     * @param {Object} position - Position information (start, end, line, etc.)
     * @param {string} fullText - The full text for context
     * @returns {string} contentId - Unique identifier for this content
     */
    associateContent(content, type, position, fullText) {
        // Generate a content hash for deduplication (same content at same position)
        const contentHash = this.generateContentHash(content, type, position);
        
        // Check if we already have this content association
        let existingContentId = null;
        for (const [contentId, assoc] of this.contentAssociations.entries()) {
            if (assoc.contentHash === contentHash) {
                existingContentId = contentId;
                break;
            }
        }

        let contentId;
        if (existingContentId) {
            contentId = existingContentId;
            // Update timestamp to mark as recently active
            this.contentAssociations.get(contentId).timestamp = Date.now();
        } else {
            contentId = `content_${this.nextContentId++}`;
            this.contentAssociations.set(contentId, {
                contentId,
                content,
                type,
                position,
                contentHash,
                feedback: [],
                timestamp: Date.now(),
                fullTextContext: fullText
            });
        }

        return contentId;
    }

    /**
     * Associates feedback with a content element
     * @param {string} contentId - The content ID to associate feedback with
     * @param {Object} feedback - The feedback object
     * @param {string} promptId - The prompt that generated this feedback
     * @param {string} promptName - The name of the prompt
     * @returns {string} feedbackId - Unique identifier for this feedback
     */
    associateFeedback(contentId, feedback, promptId, promptName) {
        if (!this.contentAssociations.has(contentId)) {
            console.warn('Cannot associate feedback: content ID not found:', contentId);
            return null;
        }

        const feedbackId = `feedback_${this.nextFeedbackId++}`;
        const feedbackEntry = {
            feedbackId,
            promptId,
            promptName,
            feedback,
            timestamp: Date.now(),
            isVisible: true
        };

        // Add feedback to content association
        this.contentAssociations.get(contentId).feedback.push(feedbackEntry);
        
        // Add reverse mapping
        this.feedbackToContent.set(feedbackId, contentId);

        // Notify listeners about new feedback association
        this.notifyContentChange('feedbackAdded', { contentId, feedbackId, feedbackEntry });

        return feedbackId;
    }

    /**
     * Gets all feedback associated with a specific content element
     * @param {string} contentId - The content ID
     * @returns {Array} Array of feedback entries
     */
    getFeedbackForContent(contentId) {
        const association = this.contentAssociations.get(contentId);
        return association ? association.feedback.filter(f => f.isVisible) : [];
    }

    /**
     * Gets all content associations with their feedback
     * @returns {Array} Array of content associations
     */
    getAllContentAssociations() {
        return Array.from(this.contentAssociations.values())
            .map(assoc => ({
                ...assoc,
                feedback: assoc.feedback.filter(f => f.isVisible)
            }))
            .filter(assoc => assoc.feedback.length > 0); // Only return associations with visible feedback
    }

    /**
     * Removes feedback association
     * @param {string} feedbackId - The feedback ID to remove
     */
    removeFeedback(feedbackId) {
        const contentId = this.feedbackToContent.get(feedbackId);
        if (!contentId) return;

        const association = this.contentAssociations.get(contentId);
        if (!association) return;

        // Mark feedback as invisible instead of removing (for history)
        const feedbackIndex = association.feedback.findIndex(f => f.feedbackId === feedbackId);
        if (feedbackIndex !== -1) {
            association.feedback[feedbackIndex].isVisible = false;
            this.notifyContentChange('feedbackRemoved', { contentId, feedbackId });
        }

        // Clean up reverse mapping
        this.feedbackToContent.delete(feedbackId);

        // If no more visible feedback, we could optionally remove the content association
        const visibleFeedback = association.feedback.filter(f => f.isVisible);
        if (visibleFeedback.length === 0) {
            this.removeContentAssociation(contentId);
        }
    }

    /**
     * Removes a content association and all its feedback
     * @param {string} contentId - The content ID to remove
     */
    removeContentAssociation(contentId) {
        const association = this.contentAssociations.get(contentId);
        if (!association) return;

        // Remove all feedback mappings
        association.feedback.forEach(f => {
            this.feedbackToContent.delete(f.feedbackId);
        });

        // Remove the content association
        this.contentAssociations.delete(contentId);
        this.notifyContentChange('contentRemoved', { contentId });
    }

    /**
     * Validates content associations against current text and removes invalid ones
     * @param {string} currentText - The current full text
     */
    validateAndCleanupAssociations(currentText) {
        const toRemove = [];

        for (const [contentId, association] of this.contentAssociations.entries()) {
            // Check if the content still exists in the text at the expected position
            const isValid = this.isContentStillValid(association, currentText);
            
            if (!isValid) {
                toRemove.push(contentId);
            }
        }

        // Collect feedback items that need to be removed from DOM before removing associations
        const feedbackItemsToRemove = [];
        toRemove.forEach(contentId => {
            const association = this.contentAssociations.get(contentId);
            if (association) {
                association.feedback.forEach(feedbackEntry => {
                    if (feedbackEntry.isVisible && feedbackEntry.feedbackId) {
                        feedbackItemsToRemove.push({
                            feedbackId: feedbackEntry.feedbackId,
                            promptName: feedbackEntry.promptName,
                            contentId: contentId,
                            content: association.content
                        });
                    }
                });
            }
        });

        // Remove invalid associations
        toRemove.forEach(contentId => {
            this.removeContentAssociation(contentId);
        });

        if (toRemove.length > 0) {
            this.notifyContentChange('cleanup', { 
                removedCount: toRemove.length,
                feedbackItemsToRemove: feedbackItemsToRemove
            });
        }
    }

    /**
     * Checks if content association is still valid in current text
     * @param {Object} association - The content association
     * @param {string} currentText - The current full text
     * @returns {boolean} Whether the association is still valid
     */
    isContentStillValid(association, currentText) {
        const { content, type, position } = association;
        
        try {
            // More precise validation based on content type
            if (type === 'word') {
                // For words, check if the exact word still exists
                // Use word boundaries to ensure exact match
                const wordRegex = new RegExp(`\\b${content.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
                return wordRegex.test(currentText);
            } else if (type === 'sentence') {
                // For sentences, check if at least 70% of the sentence content is still present
                const sentenceWords = content.match(/\b\w+\b/g) || [];
                if (sentenceWords.length === 0) return false;
                
                const wordsInText = sentenceWords.filter(word => {
                    const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
                    return wordRegex.test(currentText);
                });
                
                // Consider valid if 70% of words are still present
                return (wordsInText.length / sentenceWords.length) >= 0.7;
            } else if (type === 'paragraph') {
                // For paragraphs, check if at least 60% of the paragraph content is still present
                const paragraphWords = content.match(/\b\w+\b/g) || [];
                if (paragraphWords.length === 0) return false;
                
                const wordsInText = paragraphWords.filter(word => {
                    const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
                    return wordRegex.test(currentText);
                });
                
                // Consider valid if 60% of words are still present
                return (wordsInText.length / paragraphWords.length) >= 0.6;
            }
        } catch (error) {
            console.warn('Error validating content association:', error);
            return false;
        }

        return false;
    }

    /**
     * Generates a content hash for deduplication
     * @param {string} content - The content
     * @param {string} type - The content type
     * @param {Object} position - Position information
     * @returns {string} Content hash
     */
    generateContentHash(content, type, position) {
        // Create a simple hash based on content, type, and approximate position
        const positionStr = position ? `${position.start || 0}-${position.end || 0}` : '0-0';
        return `${type}:${content}:${positionStr}`;
    }

    /**
     * Adds a content change listener
     * @param {Function} callback - Callback function to call on content changes
     */
    onContentChange(callback) {
        if (typeof callback === 'function') {
            this.contentChangeCallbacks.push(callback);
        }
    }

    /**
     * Removes a content change listener
     * @param {Function} callback - Callback function to remove
     */
    removeContentChangeCallback(callback) {
        const index = this.contentChangeCallbacks.indexOf(callback);
        if (index > -1) {
            this.contentChangeCallbacks.splice(index, 1);
        }
    }

    /**
     * Notifies listeners about content changes
     * @param {string} changeType - Type of change
     * @param {Object} data - Change data
     */
    notifyContentChange(changeType, data) {
        this.contentChangeCallbacks.forEach(callback => {
            try {
                callback(changeType, data);
            } catch (error) {
                console.error('Error in content change callback:', error);
            }
        });
    }

    /**
     * Gets statistics about content associations
     * @returns {Object} Statistics object
     */
    getStatistics() {
        const totalContent = this.contentAssociations.size;
        let totalFeedback = 0;
        let feedbackByType = { word: 0, sentence: 0, paragraph: 0 };

        for (const association of this.contentAssociations.values()) {
            const visibleFeedback = association.feedback.filter(f => f.isVisible);
            totalFeedback += visibleFeedback.length;
            feedbackByType[association.type] += visibleFeedback.length;
        }

        return {
            totalContentAssociations: totalContent,
            totalFeedback,
            feedbackByType,
            timestamp: Date.now()
        };
    }

    /**
     * Exports all associations for persistence or debugging
     * @returns {Object} Export data
     */
    exportAssociations() {
        return {
            contentAssociations: Object.fromEntries(this.contentAssociations),
            feedbackToContent: Object.fromEntries(this.feedbackToContent),
            nextContentId: this.nextContentId,
            nextFeedbackId: this.nextFeedbackId,
            timestamp: Date.now()
        };
    }

    /**
     * Imports associations from exported data
     * @param {Object} data - Exported association data
     */
    importAssociations(data) {
        if (!data) return;

        try {
            this.contentAssociations = new Map(Object.entries(data.contentAssociations || {}));
            this.feedbackToContent = new Map(Object.entries(data.feedbackToContent || {}));
            this.nextContentId = data.nextContentId || 1;
            this.nextFeedbackId = data.nextFeedbackId || 1;
            
            this.notifyContentChange('imported', { associationCount: this.contentAssociations.size });
        } catch (error) {
            console.error('Error importing associations:', error);
            this.reset();
        }
    }

    /**
     * Resets all associations
     */
    reset() {
        this.contentAssociations.clear();
        this.feedbackToContent.clear();
        this.nextContentId = 1;
        this.nextFeedbackId = 1;
        this.notifyContentChange('reset', {});
    }

    /**
     * Cleanup method for disposing resources
     */
    cleanup() {
        this.reset();
        this.contentChangeCallbacks = [];
    }
}