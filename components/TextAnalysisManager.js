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
        if (currentWordCount <= this.previousWordCount) return false;
        
        // Check if the user just finished typing a word (added space or punctuation after a word)
        const lastChars = currentText.slice(-2);
        const endsWithWordBoundary = /\w[\s.!?,:;]$/.test(lastChars);
        
        return endsWithWordBoundary;
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
        
        // Check if the text ends with a word boundary
        const trimmedText = text.trim();
        const lastChar = trimmedText.slice(-1);
        
        // If last character is not a letter/number, the previous word is completed
        if (!/\w/.test(lastChar)) {
            return words[words.length - 1] || '';
        }
        
        // If we have at least 2 words and current text has word boundary indicators
        if (words.length >= 2 && /\w[\s.!?,:;]/.test(text.slice(-2))) {
            return words[words.length - 2] || '';
        }
        
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