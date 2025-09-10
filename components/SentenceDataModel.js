class SentenceDataModel {
    constructor() {
        this.sentences = new Map();
        this.words = new Map();
        this.paragraphs = new Map();
        this.textVersion = 0;

        // Regex patterns
        this.sentencePattern = /[.!?]+(?:\s|$)/g;
        this.wordPattern = /\b\w+\b/g;
        this.paragraphPattern = /\n\s*\n/g;

        // Tracking state
        this.lastAnalyzedText = '';
        this.sentenceOrder = [];
    }

    generateId() {
        return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
    }

    hashContent(content) {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    analyzeText(text) {
        if (text === this.lastAnalyzedText) {
            return this.getCurrentStructure();
        }

        this.textVersion++;
        const newStructure = this.parseText(text);
        this.updateDataModel(newStructure);
        this.lastAnalyzedText = text;

        return this.getCurrentStructure();
    }

    parseText(text) {
        const structure = {
            sentences: [],
            words: [],
            paragraphs: [],
            textVersion: this.textVersion
        };

        // Parse paragraphs
        const paragraphs = text.split(this.paragraphPattern);
        let globalWordIndex = 0;
        let globalSentenceIndex = 0;

        paragraphs.forEach((paragraphText, paragraphIndex) => {
            if (paragraphText.trim().length === 0) return;

            const paragraphStartPos = text.indexOf(paragraphText);
            const paragraphId = this.generateId();
            const paragraphHash = this.hashContent(paragraphText.trim());

            const paragraphData = {
                id: paragraphId,
                content: paragraphText.trim(),
                hash: paragraphHash,
                position: {
                    start: paragraphStartPos,
                    end: paragraphStartPos + paragraphText.length,
                    index: paragraphIndex
                },
                sentences: [],
                wordCount: 0
            };

            // Parse sentences within paragraph
            const sentences = [];
            let remainingText = paragraphText;
            let lastIndex = 0;

            // Use regex to find sentence boundaries while preserving punctuation
            let match;
            this.sentencePattern.lastIndex = 0; // Reset regex state

            while ((match = this.sentencePattern.exec(paragraphText)) !== null) {
                const sentenceEnd = match.index + match[0].length;
                const sentenceText = paragraphText.substring(lastIndex, sentenceEnd);
                sentences.push(sentenceText);
                lastIndex = sentenceEnd;
            }

            // Add any remaining text as the last sentence if it doesn't end with punctuation
            if (lastIndex < paragraphText.length) {
                const remainingSentence = paragraphText.substring(lastIndex);
                if (remainingSentence.trim().length > 0) {
                    sentences.push(remainingSentence);
                }
            }

            let paragraphWordCount = 0;
            let sentenceStartInParagraph = 0;

            sentences.forEach((sentenceText, sentenceIndex) => {
                const trimmedSentence = sentenceText.trim();
                if (trimmedSentence.length === 0) return;

                const sentenceStartPos = paragraphStartPos + paragraphText.indexOf(trimmedSentence, sentenceStartInParagraph);
                const sentenceHash = this.hashContent(trimmedSentence);

                // Check if this sentence already exists (for copy/paste detection)
                const existingSentenceId = this.findSentenceByHash(sentenceHash);
                const sentenceId = existingSentenceId || this.generateId();

                const sentenceData = {
                    id: sentenceId,
                    content: trimmedSentence,
                    hash: sentenceHash,
                    position: {
                        start: sentenceStartPos,
                        end: sentenceStartPos + trimmedSentence.length,
                        globalIndex: globalSentenceIndex,
                        paragraphIndex: sentenceIndex
                    },
                    paragraphId: paragraphId,
                    words: [],
                    wordCount: 0,
                    isNew: !existingSentenceId,
                    lastModified: existingSentenceId ? this.sentences.get(existingSentenceId)?.lastModified : Date.now(),
                    isAIGenerated: existingSentenceId ? this.sentences.get(existingSentenceId)?.isAIGenerated || false : false
                };

                // Parse words within sentence
                const words = trimmedSentence.match(this.wordPattern) || [];
                let wordStartInSentence = 0;

                words.forEach((wordText, wordIndex) => {
                    const wordStartInSentencePos = trimmedSentence.indexOf(wordText, wordStartInSentence);
                    const wordStartPos = sentenceStartPos + wordStartInSentencePos;
                    const wordHash = this.hashContent(wordText.toLowerCase());

                    const existingWordId = this.findWordByHashAndPosition(wordHash, wordStartPos);
                    const wordId = existingWordId || this.generateId();

                    const wordData = {
                        id: wordId,
                        content: wordText,
                        hash: wordHash,
                        position: {
                            start: wordStartPos,
                            end: wordStartPos + wordText.length,
                            globalIndex: globalWordIndex,
                            sentenceIndex: wordIndex,
                            paragraphIndex: paragraphIndex
                        },
                        sentenceId: sentenceId,
                        paragraphId: paragraphId,
                        isNew: !existingWordId,
                        lastModified: existingWordId ? this.words.get(existingWordId)?.lastModified : Date.now(),
                        isAIGenerated: existingWordId ? this.words.get(existingWordId)?.isAIGenerated || false : false
                    };

                    sentenceData.words.push(wordId);
                    structure.words.push(wordData);

                    wordStartInSentence = wordStartInSentencePos + wordText.length;
                    globalWordIndex++;
                    paragraphWordCount++;
                });

                sentenceData.wordCount = words.length;
                paragraphData.sentences.push(sentenceId);
                structure.sentences.push(sentenceData);

                sentenceStartInParagraph += trimmedSentence.length;
                globalSentenceIndex++;
            });

            paragraphData.wordCount = paragraphWordCount;
            structure.paragraphs.push(paragraphData);
        });

        return structure;
    }

    findSentenceByHash(hash) {
        for (const [id, sentence] of this.sentences) {
            if (sentence.hash === hash) {
                return id;
            }
        }
        return null;
    }

    findWordByHashAndPosition(hash, position) {
        for (const [id, word] of this.words) {
            if (word.hash === hash && Math.abs(word.position.start - position) < 10) {
                return id;
            }
        }
        return null;
    }

    updateDataModel(newStructure) {
        // Clear old data
        this.sentences.clear();
        this.words.clear();
        this.paragraphs.clear();
        this.sentenceOrder = [];

        // Add new data
        newStructure.sentences.forEach(sentence => {
            this.sentences.set(sentence.id, sentence);
            this.sentenceOrder.push(sentence.id);
        });

        newStructure.words.forEach(word => {
            this.words.set(word.id, word);
        });

        newStructure.paragraphs.forEach(paragraph => {
            this.paragraphs.set(paragraph.id, paragraph);
        });
    }

    getCurrentStructure() {
        return {
            sentences: Array.from(this.sentences.values()),
            words: Array.from(this.words.values()),
            paragraphs: Array.from(this.paragraphs.values()),
            textVersion: this.textVersion,
            stats: this.getStatistics()
        };
    }

    getSentenceById(id) {
        return this.sentences.get(id);
    }

    getWordById(id) {
        return this.words.get(id);
    }

    getParagraphById(id) {
        return this.paragraphs.get(id);
    }

    getSentencesByParagraph(paragraphId) {
        const paragraph = this.paragraphs.get(paragraphId);
        return paragraph ? paragraph.sentences.map(id => this.sentences.get(id)) : [];
    }

    getWordsBySentence(sentenceId) {
        const sentence = this.sentences.get(sentenceId);
        return sentence ? sentence.words.map(id => this.words.get(id)) : [];
    }

    findSentencesByContent(content) {
        const searchHash = this.hashContent(content.trim());
        return Array.from(this.sentences.values()).filter(sentence =>
            sentence.hash === searchHash || sentence.content.includes(content)
        );
    }

    trackSentenceModification(oldContent, newContent, position) {
        const oldHash = this.hashContent(oldContent.trim());
        const newHash = this.hashContent(newContent.trim());

        // If content changed, this becomes a new sentence
        if (oldHash !== newHash) {
            return {
                isModified: true,
                oldId: this.findSentenceByHash(oldHash),
                newId: this.generateId(),
                timestamp: Date.now()
            };
        }

        return {
            isModified: false,
            existingId: this.findSentenceByHash(oldHash)
        };
    }

    getStatistics() {
        return {
            totalSentences: this.sentences.size,
            totalWords: this.words.size,
            totalParagraphs: this.paragraphs.size,
            textVersion: this.textVersion,
            averageWordsPerSentence: this.sentences.size > 0 ?
                Math.round((this.words.size / this.sentences.size) * 10) / 10 : 0,
            averageSentencesPerParagraph: this.paragraphs.size > 0 ?
                Math.round((this.sentences.size / this.paragraphs.size) * 10) / 10 : 0
        };
    }

    exportStructure() {
        return {
            sentences: Array.from(this.sentences.entries()),
            words: Array.from(this.words.entries()),
            paragraphs: Array.from(this.paragraphs.entries()),
            sentenceOrder: this.sentenceOrder,
            textVersion: this.textVersion,
            timestamp: Date.now()
        };
    }

    importStructure(data) {
        this.sentences = new Map(data.sentences);
        this.words = new Map(data.words);
        this.paragraphs = new Map(data.paragraphs);
        this.sentenceOrder = data.sentenceOrder || [];
        this.textVersion = data.textVersion || 0;
    }

    markContentAsAIGenerated(startPosition, endPosition) {
        // Mark sentences and words within the given range as AI-generated
        for (const sentence of this.sentences.values()) {
            if (sentence.position.start >= startPosition && sentence.position.end <= endPosition) {
                sentence.isAIGenerated = true;
                sentence.lastModified = Date.now();

                // Also mark words in this sentence as AI-generated
                for (const wordId of sentence.words) {
                    const word = this.words.get(wordId);
                    if (word) {
                        word.isAIGenerated = true;
                        word.lastModified = Date.now();
                    }
                }
            }
        }
    }

    isContentAIGenerated(position) {
        // Check if content at a specific position was AI-generated
        for (const sentence of this.sentences.values()) {
            if (position >= sentence.position.start && position <= sentence.position.end) {
                return sentence.isAIGenerated || false;
            }
        }
        return false;
    }

    getLastCompletedParagraph() {
        // Get the most recently completed paragraph
        const sortedParagraphs = Array.from(this.paragraphs.values())
            .sort((a, b) => b.position.globalIndex - a.position.globalIndex);
        return sortedParagraphs[0] || null;
    }

    getLastCompletedSentence() {
        // Get the most recently completed sentence
        const sortedSentences = Array.from(this.sentences.values())
            .sort((a, b) => b.position.globalIndex - a.position.globalIndex);
        return sortedSentences[0] || null;
    }

    getLastCompletedWord() {
        // Get the most recently completed word
        const sortedWords = Array.from(this.words.values())
            .sort((a, b) => b.position.globalIndex - a.position.globalIndex);
        return sortedWords[0] || null;
    }

    reset() {
        this.sentences.clear();
        this.words.clear();
        this.paragraphs.clear();
        this.sentenceOrder = [];
        this.textVersion = 0;
        this.lastAnalyzedText = '';
    }

    cleanup() {
        this.reset();
    }
}
