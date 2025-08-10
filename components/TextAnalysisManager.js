class TextAnalysisManager {
    constructor() {
        this.previousText = '';
        this.previousWordCount = 0;
        this.previousSentenceCount = 0;
        this.wordCompletionCallbacks = [];
        this.sentenceCompletionCallbacks = [];
        
        // Regex patterns for word and sentence detection
        this.wordPattern = /\b\w+\b/g;
        this.sentencePattern = /[.!?]+(?:\s|$)/g;
        
        // State tracking
        this.lastCompletedWord = '';
        this.lastCompletedSentence = '';
        this.isTrackingActive = false;
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
        
        const currentWordCount = currentWords.length;
        const currentSentenceCount = currentSentences.length;


        // Check for word completion
        if (this.hasCompletedWord(currentText, currentWordCount)) {
            const completedWord = this.getLastCompletedWord(currentText);
            if (completedWord && completedWord !== this.lastCompletedWord) {
                this.lastCompletedWord = completedWord;
                this.notifyWordCompletion(completedWord, currentWordCount);
            }
        }

        // Check for sentence completion
        if (this.hasCompletedSentence(currentText, currentSentenceCount)) {
            const completedSentence = this.getLastCompletedSentence(currentText);
            if (completedSentence && completedSentence !== this.lastCompletedSentence) {
                this.lastCompletedSentence = completedSentence;
                this.notifySentenceCompletion(completedSentence, currentSentenceCount);
            }
        }

        // Update state
        this.previousText = currentText;
        this.previousWordCount = currentWordCount;
        this.previousSentenceCount = currentSentenceCount;
    }

    extractWords(text) {
        const matches = text.match(this.wordPattern);
        return matches || [];
    }

    extractSentences(text) {
        // Split by sentence-ending punctuation, filter out empty sentences
        const sentences = text.split(this.sentencePattern)
            .map(s => s.trim())
            .filter(s => s.length > 0);
        return sentences;
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
        if (currentSentenceCount <= this.previousSentenceCount) return false;
        
        // Check if the text ends with sentence-ending punctuation followed by space or end of text
        const endsWithSentenceBoundary = /[.!?]+(\s|$)/.test(currentText);
        
        return endsWithSentenceBoundary;
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
        const sentences = this.extractSentences(text);
        if (sentences.length === 0) return '';
        
        // If text ends with sentence punctuation, the last sentence is completed
        if (/[.!?]+(\s|$)/.test(text)) {
            return sentences[sentences.length - 1] || '';
        }
        
        // If we have multiple sentences and current sentence is incomplete
        if (sentences.length >= 2) {
            return sentences[sentences.length - 2] || '';
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

    notifyWordCompletion(word, totalWordCount) {
        const data = {
            completedWord: word,
            totalWords: totalWordCount,
            timestamp: Date.now(),
            type: 'word'
        };

        this.wordCompletionCallbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in word completion callback:', error);
            }
        });
    }

    notifySentenceCompletion(sentence, totalSentenceCount) {
        const data = {
            completedSentence: sentence,
            totalSentences: totalSentenceCount,
            timestamp: Date.now(),
            type: 'sentence'
        };

        this.sentenceCompletionCallbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in sentence completion callback:', error);
            }
        });
    }

    getStatistics(text = null) {
        const textToAnalyze = text || this.previousText;
        const words = this.extractWords(textToAnalyze);
        const sentences = this.extractSentences(textToAnalyze);
        
        return {
            wordCount: words.length,
            sentenceCount: sentences.length,
            characterCount: textToAnalyze.length,
            characterCountNoSpaces: textToAnalyze.replace(/\s/g, '').length,
            averageWordsPerSentence: sentences.length > 0 ? Math.round((words.length / sentences.length) * 10) / 10 : 0
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

    reset() {
        this.previousText = '';
        this.previousWordCount = 0;
        this.previousSentenceCount = 0;
        this.lastCompletedWord = '';
        this.lastCompletedSentence = '';
    }

    cleanup() {
        this.stopTracking();
        this.wordCompletionCallbacks = [];
        this.sentenceCompletionCallbacks = [];
        this.reset();
    }
}