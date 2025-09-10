class TextAnalysisManager {
    constructor() {
        this.previousText = '';
        this.previousWordCount = 0;
        this.previousSentenceCount = 0;
        this.previousParagraphCount = 0;
        this.wordCompletionCallbacks = [];
        this.sentenceCompletionCallbacks = [];
        this.paragraphCompletionCallbacks = [];
        
        // Regex patterns for word and sentence detection
        this.wordPattern = /\b\w+\b/g;
        this.sentencePattern = /[.!?]+(?:\s|$)/g;
        
        // State tracking
        this.lastCompletedWord = '';
        this.lastCompletedSentence = '';
        this.lastCompletedParagraph = '';
        this.isTrackingActive = false;
        
        // Sentence data model integration
        this.sentenceDataModel = new SentenceDataModel();
        this.structureChangeCallbacks = [];
        
        // Content association tracking
        this.feedbackAssociationManager = new FeedbackAssociationManager();
        
        // Track content positions for association
        this.lastCompletedWordPosition = null;
        this.lastCompletedSentencePosition = null;
        this.lastCompletedParagraphPosition = null;
    }

    startTracking() {
        this.isTrackingActive = true;
    }

    stopTracking() {
        this.isTrackingActive = false;
    }

    analyzeText(currentText) {
        if (!this.isTrackingActive) return;

        const currentWords = this.extractWords(currentText);
        const currentSentences = this.extractSentences(currentText);
        const currentParagraphs = this.extractParagraphs(currentText);
        
        const currentWordCount = currentWords.length;
        const currentSentenceCount = currentSentences.length;
        const currentParagraphCount = currentParagraphs.length;

        // Analyze text structure with sentence data model
        const structure = this.sentenceDataModel.analyzeText(currentText);
        
        // Validate and cleanup content associations if text has changed significantly
        if (this.previousText && currentText !== this.previousText) {
            this.feedbackAssociationManager.validateAndCleanupAssociations(currentText);
        }
        
        // Notify structure change listeners
        this.notifyStructureChange(structure);

        // Check for word completion
        if (this.hasCompletedWord(currentText, currentWordCount)) {
            const completedWord = this.getLastCompletedWord(currentText);
            if (completedWord && completedWord !== this.lastCompletedWord) {
                this.lastCompletedWord = completedWord;
                this.notifyWordCompletion(completedWord, currentWordCount, structure);
            }
        }

        // Check for sentence completion
        if (this.hasCompletedSentence(currentText, currentSentenceCount)) {
            const completedSentence = this.getLastCompletedSentence(currentText);
            if (completedSentence && completedSentence !== this.lastCompletedSentence) {
                this.lastCompletedSentence = completedSentence;
                const sentenceData = this.findSentenceDataByContent(completedSentence, structure);
                this.notifySentenceCompletion(completedSentence, currentSentenceCount, sentenceData, structure);
            }
        }

        // Check for paragraph completion
        if (this.hasCompletedParagraph(currentText, currentParagraphCount)) {
            const completedParagraph = this.getLastCompletedParagraph(currentText);
            if (completedParagraph && completedParagraph !== this.lastCompletedParagraph) {
                this.lastCompletedParagraph = completedParagraph;
                this.notifyParagraphCompletion(completedParagraph, currentParagraphCount, structure);
            }
        }

        // Update state
        this.previousText = currentText;
        this.previousWordCount = currentWordCount;
        this.previousSentenceCount = currentSentenceCount;
        this.previousParagraphCount = currentParagraphCount;
    }

    extractWords(text) {
        const matches = text.match(this.wordPattern);
        return matches || [];
    }

    extractSentences(text) {
        // Count sentences by finding all sentence-ending punctuation marks
        // followed by whitespace or end of text
        const sentenceMatches = text.match(this.sentencePattern) || [];
        return sentenceMatches;
    }

    extractParagraphs(text) {
        // Split text into paragraphs using blank lines (one or more empty lines)
        const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
        return paragraphs;
    }

    hasCompletedWord(currentText, currentWordCount) {
        // Check if we just added a word boundary after a word
        const lastChar = currentText.slice(-1);
        const prevLastChar = this.previousText.slice(-1);
        
        // Word completion happens when:
        // 1. Current text ends with word boundary (space/punctuation)
        // 2. Previous text ended with a word character OR was shorter
        // 3. We have at least one word
        const endsWithWordBoundary = /[\s.!?,:;]$/.test(lastChar);
        const prevEndedWithWordChar = /\w$/.test(prevLastChar) || this.previousText.length < currentText.length - 1;
        const hasWords = currentWordCount > 0;
        
        
        return endsWithWordBoundary && prevEndedWithWordChar && hasWords;
    }

    hasCompletedSentence(currentText, currentSentenceCount) {
        // A sentence is completed when:
        // 1. We have more sentences than before, AND
        // 2. The current text ends with sentence-ending punctuation followed by space or end of text
        
        if (currentSentenceCount <= this.previousSentenceCount) {
            return false;
        }
        
        // Check if the text ends with sentence-ending punctuation followed by space or end of text
        const endsWithSentenceBoundary = /[.!?]+(?:\s|$)/.test(currentText);
        
        return endsWithSentenceBoundary;
    }

    hasCompletedParagraph(currentText, currentParagraphCount) {
        // A paragraph is completed when the user adds blank lines after content
        // This should trigger immediately when blank lines are added, not when new content starts
        
        // Check if we just added blank lines (paragraph separator)
        const currentHasBlankLines = /\n\s*\n/.test(currentText);
        const previousHasBlankLines = /\n\s*\n/.test(this.previousText);
        
        // Paragraph completion happens when:
        // 1. We now have blank lines but didn't before (just added separator)
        // 2. We had some content before (not starting from empty)
        if (currentHasBlankLines && !previousHasBlankLines && this.previousText.length > 0) {
            return true;
        }
        
        return false;
    }

    getLastCompletedWord(text) {
        // Find the last completed word (before the most recent space or punctuation)
        const words = this.extractWords(text);
        if (words.length === 0) return '';
        
        // Check if the text ends with whitespace or punctuation (word boundary)
        const lastChar = text.slice(-1);
        const endsWithBoundary = /[\s.!?,:;]$/.test(lastChar);
        
        // If text ends with a boundary, the last word in our words array is completed
        if (endsWithBoundary) {
            return words[words.length - 1] || '';
        }
        
        // If no boundary at end, no completed word
        return '';
    }

    getLastCompletedSentence(text) {
        // Find the most recent completed sentence by looking for the last
        // sentence-ending punctuation and extracting the sentence before it
        
        // If text ends with sentence punctuation, extract the sentence that just ended
        if (/[.!?]+(?:\s|$)/.test(text)) {
            // Find the last sentence ending punctuation
            const matches = [...text.matchAll(/[.!?]+(?:\s|$)/g)];
            if (matches.length === 0) return '';
            
            const lastMatch = matches[matches.length - 1];
            const endIndex = lastMatch.index;
            
            // Find the start of this sentence (after the previous sentence ending, or from beginning)
            let startIndex = 0;
            if (matches.length > 1) {
                const previousMatch = matches[matches.length - 2];
                startIndex = previousMatch.index + previousMatch[0].length;
            }
            
            // Extract the sentence text (without the ending punctuation)
            const sentence = text.substring(startIndex, endIndex).trim();
            return sentence;
        }
        
        return '';
    }

    getLastCompletedParagraph(text) {
        // Return the paragraph that was just completed by adding blank lines
        // This is called when hasCompletedParagraph() returns true (when blank lines were just added)
        
        if (!/\n\s*\n/.test(text)) {
            return '';
        }
        
        // When blank lines are just added, the completed paragraph is the content before the blank lines
        // Split and get the first part (before the separator)
        const parts = text.split(/\n\s*\n/);
        if (parts.length >= 1 && parts[0].trim().length > 0) {
            return parts[0].trim();
        }
        
        return '';
    }

    onWordCompletion(callback) {
        if (typeof callback === 'function') {
            this.wordCompletionCallbacks.push(callback);
        }
    }

    onSentenceCompletion(callback) {
        if (typeof callback === 'function') {
            this.sentenceCompletionCallbacks.push(callback);
        }
    }

    onParagraphCompletion(callback) {
        if (typeof callback === 'function') {
            this.paragraphCompletionCallbacks.push(callback);
        }
    }

    removeWordCompletionCallback(callback) {
        const index = this.wordCompletionCallbacks.indexOf(callback);
        if (index > -1) {
            this.wordCompletionCallbacks.splice(index, 1);
        }
    }

    removeSentenceCompletionCallback(callback) {
        const index = this.sentenceCompletionCallbacks.indexOf(callback);
        if (index > -1) {
            this.sentenceCompletionCallbacks.splice(index, 1);
        }
    }

    removeParagraphCompletionCallback(callback) {
        const index = this.paragraphCompletionCallbacks.indexOf(callback);
        if (index > -1) {
            this.paragraphCompletionCallbacks.splice(index, 1);
        }
    }

    notifyWordCompletion(word, totalWordCount, structure = null) {
        // Calculate position information for the completed word
        const position = this.calculateWordPosition(word, this.previousText);
        this.lastCompletedWordPosition = position;
        
        // Create content association for this word
        const contentId = this.feedbackAssociationManager.associateContent(
            word, 
            'word', 
            position, 
            this.previousText
        );

        const data = {
            completedWord: word,
            totalWords: totalWordCount,
            timestamp: Date.now(),
            type: 'word',
            structure: structure,
            contentId: contentId,
            position: position
        };

        this.wordCompletionCallbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in word completion callback:', error);
            }
        });
    }

    notifySentenceCompletion(sentence, totalSentenceCount, sentenceData = null, structure = null) {
        // Calculate position information for the completed sentence
        const position = this.calculateSentencePosition(sentence, this.previousText);
        this.lastCompletedSentencePosition = position;
        
        // Create content association for this sentence
        const contentId = this.feedbackAssociationManager.associateContent(
            sentence, 
            'sentence', 
            position, 
            this.previousText
        );

        const data = {
            completedSentence: sentence,
            totalSentences: totalSentenceCount,
            timestamp: Date.now(),
            type: 'sentence',
            sentenceData: sentenceData,
            structure: structure,
            contentId: contentId,
            position: position
        };

        this.sentenceCompletionCallbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in sentence completion callback:', error);
            }
        });
    }

    notifyParagraphCompletion(paragraph, totalParagraphCount, structure = null) {
        // Calculate position information for the completed paragraph
        const position = this.calculateParagraphPosition(paragraph, this.previousText);
        this.lastCompletedParagraphPosition = position;
        
        // Create content association for this paragraph
        const contentId = this.feedbackAssociationManager.associateContent(
            paragraph, 
            'paragraph', 
            position, 
            this.previousText
        );

        const data = {
            completedParagraph: paragraph,
            totalParagraphs: totalParagraphCount,
            timestamp: Date.now(),
            type: 'paragraph',
            structure: structure,
            contentId: contentId,
            position: position
        };

        this.paragraphCompletionCallbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in paragraph completion callback:', error);
            }
        });
    }

    notifyStructureChange(structure) {
        this.structureChangeCallbacks.forEach(callback => {
            try {
                callback(structure);
            } catch (error) {
                console.error('Error in structure change callback:', error);
            }
        });
    }

    getStatistics(text = null) {
        const textToAnalyze = text || this.previousText;
        const words = this.extractWords(textToAnalyze);
        const sentences = this.extractSentences(textToAnalyze);
        
        // Get enhanced statistics from sentence data model if available
        const modelStats = this.sentenceDataModel.getStatistics();
        
        return {
            wordCount: words.length,
            sentenceCount: sentences.length,
            characterCount: textToAnalyze.length,
            characterCountNoSpaces: textToAnalyze.replace(/\s/g, '').length,
            averageWordsPerSentence: sentences.length > 0 ? Math.round((words.length / sentences.length) * 10) / 10 : 0,
            // Enhanced statistics from data model
            paragraphCount: modelStats.totalParagraphs,
            averageSentencesPerParagraph: modelStats.averageSentencesPerParagraph,
            textVersion: modelStats.textVersion
        };
    }

    getPlaceholderContent(placeholderType, fullText = null) {
        const currentText = fullText || this.previousText;
        
        switch (placeholderType) {
            case 'text':
                return currentText;
            case 'sentence':
                return this.getCurrentSentence(currentText);
            case 'word':
                return this.lastCompletedWord || this.getLastCompletedWord(currentText);
            case 'paragraph':
                return this.getCurrentParagraph(currentText);
            default:
                return currentText;
        }
    }

    getCurrentSentence(text) {
        if (!text) return '';
        
        // Find the current cursor position by looking for the end of text
        // Since we don't have cursor position here, we'll extract the current sentence
        // by finding the sentence that contains the end of the text
        
        // Split text into sentences, keeping the delimiters
        const sentenceRegex = /[.!?]+/g;
        const sentences = [];
        let lastIndex = 0;
        let match;
        
        while ((match = sentenceRegex.exec(text)) !== null) {
            // Add the sentence including the delimiter
            sentences.push(text.substring(lastIndex, match.index + match[0].length).trim());
            lastIndex = match.index + match[0].length;
        }
        
        // Add any remaining text as the current sentence (might be incomplete)
        if (lastIndex < text.length) {
            const currentSentence = text.substring(lastIndex).trim();
            if (currentSentence) {
                sentences.push(currentSentence);
            }
        }
        
        // Return the last sentence (which would be the one currently being edited)
        return sentences.length > 0 ? sentences[sentences.length - 1] : '';
    }

    // Helper method to find sentence data by content
    findSentenceDataByContent(content, structure) {
        if (!structure || !structure.sentences) return null;
        return structure.sentences.find(sentence => sentence.content === content) || null;
    }

    // Sentence data model access methods
    getSentenceById(id) {
        return this.sentenceDataModel.getSentenceById(id);
    }

    getWordById(id) {
        return this.sentenceDataModel.getWordById(id);
    }

    getParagraphById(id) {
        return this.sentenceDataModel.getParagraphById(id);
    }

    getSentencesByParagraph(paragraphId) {
        return this.sentenceDataModel.getSentencesByParagraph(paragraphId);
    }

    getWordsBySentence(sentenceId) {
        return this.sentenceDataModel.getWordsBySentence(sentenceId);
    }

    findSentencesByContent(content) {
        return this.sentenceDataModel.findSentencesByContent(content);
    }

    getCurrentStructure() {
        return this.sentenceDataModel.getCurrentStructure();
    }

    exportStructure() {
        return this.sentenceDataModel.exportStructure();
    }

    importStructure(data) {
        return this.sentenceDataModel.importStructure(data);
    }

    // Structure change callback management
    onStructureChange(callback) {
        if (typeof callback === 'function') {
            this.structureChangeCallbacks.push(callback);
        }
    }

    removeStructureChangeCallback(callback) {
        const index = this.structureChangeCallbacks.indexOf(callback);
        if (index > -1) {
            this.structureChangeCallbacks.splice(index, 1);
        }
    }

    getCurrentParagraph(text) {
        if (!text) return '';
        
        // Split text into paragraphs using blank lines (one or more empty lines)
        // This follows Markdown paragraph conventions
        const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
        
        // Return the last paragraph (which would be the one currently being edited)
        // If no blank lines exist, the entire text is considered one paragraph
        return paragraphs.length > 0 ? paragraphs[paragraphs.length - 1] : text;
    }

    reset() {
        this.previousText = '';
        this.previousWordCount = 0;
        this.previousSentenceCount = 0;
        this.previousParagraphCount = 0;
        this.lastCompletedWord = '';
        this.lastCompletedSentence = '';
        this.lastCompletedParagraph = '';
        this.sentenceDataModel.reset();
    }

    cleanup() {
        this.stopTracking();
        this.wordCompletionCallbacks = [];
        this.sentenceCompletionCallbacks = [];
        this.paragraphCompletionCallbacks = [];
        this.structureChangeCallbacks = [];
        this.sentenceDataModel.cleanup();
        this.feedbackAssociationManager.cleanup();
        this.reset();
    }

    /**
     * Calculate position information for a completed word
     * @param {string} word - The completed word
     * @param {string} text - The full text
     * @returns {Object} Position information
     */
    calculateWordPosition(word, text) {
        try {
            // Find the last occurrence of the word in the text
            const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
            let match;
            let lastMatch = null;
            
            while ((match = wordRegex.exec(text)) !== null) {
                lastMatch = match;
            }
            
            if (lastMatch) {
                const start = lastMatch.index;
                const end = start + word.length;
                const line = text.substring(0, start).split('\n').length;
                const column = start - text.lastIndexOf('\n', start - 1) - 1;
                
                return {
                    start,
                    end,
                    line,
                    column,
                    length: word.length
                };
            }
        } catch (error) {
            console.warn('Error calculating word position:', error);
        }
        
        return { start: 0, end: word.length, line: 1, column: 0, length: word.length };
    }

    /**
     * Calculate position information for a completed sentence
     * @param {string} sentence - The completed sentence
     * @param {string} text - The full text
     * @returns {Object} Position information
     */
    calculateSentencePosition(sentence, text) {
        try {
            // Find the sentence in the text
            const sentenceIndex = text.lastIndexOf(sentence);
            
            if (sentenceIndex !== -1) {
                const start = sentenceIndex;
                const end = start + sentence.length;
                const line = text.substring(0, start).split('\n').length;
                const column = start - text.lastIndexOf('\n', start - 1) - 1;
                
                return {
                    start,
                    end,
                    line,
                    column,
                    length: sentence.length
                };
            }
        } catch (error) {
            console.warn('Error calculating sentence position:', error);
        }
        
        return { start: 0, end: sentence.length, line: 1, column: 0, length: sentence.length };
    }

    /**
     * Calculate position information for a completed paragraph
     * @param {string} paragraph - The completed paragraph
     * @param {string} text - The full text
     * @returns {Object} Position information
     */
    calculateParagraphPosition(paragraph, text) {
        try {
            // Find the paragraph in the text
            const paragraphIndex = text.lastIndexOf(paragraph);
            
            if (paragraphIndex !== -1) {
                const start = paragraphIndex;
                const end = start + paragraph.length;
                const line = text.substring(0, start).split('\n').length;
                const column = start - text.lastIndexOf('\n', start - 1) - 1;
                
                return {
                    start,
                    end,
                    line,
                    column,
                    length: paragraph.length
                };
            }
        } catch (error) {
            console.warn('Error calculating paragraph position:', error);
        }
        
        return { start: 0, end: paragraph.length, line: 1, column: 0, length: paragraph.length };
    }

    /**
     * Get feedback association manager for external access
     * @returns {FeedbackAssociationManager} The feedback association manager
     */
    getFeedbackAssociationManager() {
        return this.feedbackAssociationManager;
    }
}