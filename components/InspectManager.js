class InspectManager {
    constructor() {
        this.currentView = 'structure';
        this.currentFilter = '';
        this.currentStructure = null;
        
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.elements = {
            tab: document.getElementById('inspectTab'),
            tabContent: document.getElementById('inspectTabContent'),
            sentenceCount: document.getElementById('sentenceCount'),
            wordCountInspect: document.getElementById('wordCountInspect'),
            paragraphCount: document.getElementById('paragraphCount'),
            textVersion: document.getElementById('textVersion'),
            refreshBtn: document.getElementById('refreshInspectBtn'),
            viewSelect: document.getElementById('inspectView'),
            filterInput: document.getElementById('inspectFilter'),
            content: document.getElementById('inspectContent')
        };
    }

    setupEventListeners() {
        // View change
        this.elements.viewSelect?.addEventListener('change', (e) => {
            this.currentView = e.target.value;
            this.renderCurrentView();
        });

        // Filter change
        this.elements.filterInput?.addEventListener('input', (e) => {
            this.currentFilter = e.target.value.toLowerCase();
            this.renderCurrentView();
        });

        // Refresh button
        this.elements.refreshBtn?.addEventListener('click', () => {
            this.refresh();
        });

        // Tab visibility tracking - simplified approach
        this.elements.tab?.addEventListener('click', () => {
            // Small delay to ensure tab content is visible before refreshing
            setTimeout(() => this.refresh(), 100);
        });
    }

    updateStructure(structure) {
        this.currentStructure = structure;
        this.updateStats(structure);
        
        // Always render if the inspect tab is currently active
        if (this.isTabActive()) {
            this.renderCurrentView();
        }
    }

    updateStats(structure) {
        if (!structure || !structure.stats) return;

        const stats = structure.stats;
        
        if (this.elements.sentenceCount) {
            this.elements.sentenceCount.textContent = stats.totalSentences || 0;
        }
        
        if (this.elements.wordCountInspect) {
            this.elements.wordCountInspect.textContent = stats.totalWords || 0;
        }
        
        if (this.elements.paragraphCount) {
            this.elements.paragraphCount.textContent = stats.totalParagraphs || 0;
        }
        
        if (this.elements.textVersion) {
            this.elements.textVersion.textContent = stats.textVersion || 0;
        }
    }

    refresh() {
        // This will be called by the main app to provide fresh structure data
        if (window.aiTextEditor && window.aiTextEditor.textAnalysisManager) {
            const structure = window.aiTextEditor.textAnalysisManager.getCurrentStructure();
            this.updateStructure(structure);
        }
    }

    renderCurrentView() {
        if (!this.currentStructure) {
            this.renderPlaceholder();
            return;
        }

        switch (this.currentView) {
            case 'sentences':
                this.renderSentences();
                break;
            case 'paragraphs':
                this.renderParagraphs();
                break;
            case 'words':
                this.renderWords();
                break;
            case 'structure':
                this.renderFullStructure();
                break;
            default:
                this.renderSentences();
        }
    }

    renderPlaceholder() {
        if (!this.elements.content) return;
        
        this.elements.content.innerHTML = `
            <div class="inspect-placeholder">
                <p>📝 Start typing in the editor to see text structure analysis</p>
                <p><small>This panel shows real-time breakdown of sentences, words, and paragraphs with unique identifiers.</small></p>
            </div>
        `;
    }

    renderSentences() {
        if (!this.currentStructure.sentences) {
            this.renderPlaceholder();
            return;
        }

        let sentences = this.currentStructure.sentences;
        
        // Apply filter
        if (this.currentFilter) {
            sentences = sentences.filter(s => 
                s.content.toLowerCase().includes(this.currentFilter) ||
                s.id.toLowerCase().includes(this.currentFilter)
            );
        }

        let html = '';
        sentences.forEach((sentence, index) => {
            const isNew = sentence.isNew ? 'highlight-new' : '';
            
            html += `
                <div class="structure-item sentence-item" data-id="${sentence.id}">
                    <div class="structure-title">Sentence ${index + 1}</div>
                    <div class="structure-meta">
                        <span class="structure-id">ID: ${sentence.id}</span> • 
                        <span class="structure-position">Pos: ${sentence.position.start}-${sentence.position.end}</span> • 
                        <span class="structure-stats">${sentence.wordCount} words</span>
                        ${sentence.isNew ? ' • <span style="color: #28a745;">NEW</span>' : ''}
                    </div>
                    <div class="structure-content ${isNew}">
                        "${sentence.content}"
                    </div>
                </div>
            `;
        });

        if (html === '') {
            html = '<div class="inspect-placeholder"><p>No sentences match your filter.</p></div>';
        }

        this.elements.content.innerHTML = html;
        this.addClickHandlers();
    }

    renderParagraphs() {
        if (!this.currentStructure.paragraphs) {
            this.renderPlaceholder();
            return;
        }

        let paragraphs = this.currentStructure.paragraphs;
        
        // Apply filter
        if (this.currentFilter) {
            paragraphs = paragraphs.filter(p => 
                p.content.toLowerCase().includes(this.currentFilter) ||
                p.id.toLowerCase().includes(this.currentFilter)
            );
        }

        let html = '';
        paragraphs.forEach((paragraph, index) => {
            const previewContent = paragraph.content.length > 100 
                ? paragraph.content.substring(0, 100) + '...'
                : paragraph.content;
            
            html += `
                <div class="structure-item paragraph-item" data-id="${paragraph.id}">
                    <div class="structure-title">Paragraph ${index + 1}</div>
                    <div class="structure-meta">
                        <span class="structure-id">ID: ${paragraph.id}</span> • 
                        <span class="structure-position">Pos: ${paragraph.position.start}-${paragraph.position.end}</span> • 
                        <span class="structure-stats">${paragraph.sentences.length} sentences, ${paragraph.wordCount} words</span>
                    </div>
                    <div class="structure-content">
                        "${previewContent}"
                    </div>
                </div>
            `;
        });

        if (html === '') {
            html = '<div class="inspect-placeholder"><p>No paragraphs match your filter.</p></div>';
        }

        this.elements.content.innerHTML = html;
        this.addClickHandlers();
    }

    renderWords() {
        if (!this.currentStructure.words) {
            this.renderPlaceholder();
            return;
        }

        let words = this.currentStructure.words;
        
        // Apply filter
        if (this.currentFilter) {
            words = words.filter(w => 
                w.content.toLowerCase().includes(this.currentFilter) ||
                w.id.toLowerCase().includes(this.currentFilter)
            );
        }

        let html = '<div class="words-grid">';
        words.forEach((word, index) => {
            const isNew = word.isNew ? 'highlight-new' : '';
            
            html += `
                <div class="word-chip ${isNew}" data-id="${word.id}" title="ID: ${word.id} | Position: ${word.position.start}-${word.position.end}">
                    ${word.content}
                    <span class="word-id">#${index + 1}</span>
                </div>
            `;
        });
        html += '</div>';

        if (words.length === 0) {
            html = '<div class="inspect-placeholder"><p>No words match your filter.</p></div>';
        }

        this.elements.content.innerHTML = html;
        this.addClickHandlers();
    }

    renderFullStructure() {
        if (!this.currentStructure) {
            this.renderPlaceholder();
            return;
        }

        let html = `
            <div class="structure-item">
                <div class="structure-title">Text Structure Overview</div>
                <div class="structure-content">
                    <strong>Statistics:</strong><br>
                    Sentences: ${this.currentStructure.stats.totalSentences}<br>
                    Words: ${this.currentStructure.stats.totalWords}<br>
                    Paragraphs: ${this.currentStructure.stats.totalParagraphs}<br>
                    Version: ${this.currentStructure.stats.textVersion}<br>
                    Avg Words/Sentence: ${this.currentStructure.stats.averageWordsPerSentence}<br>
                    Avg Sentences/Paragraph: ${this.currentStructure.stats.averageSentencesPerParagraph}
                </div>
            </div>
        `;

        // Show paragraphs with their sentences
        if (this.currentStructure.paragraphs) {
            this.currentStructure.paragraphs.forEach((paragraph, pIndex) => {
                html += `
                    <div class="structure-item paragraph-item" data-id="${paragraph.id}">
                        <div class="structure-title">Paragraph ${pIndex + 1}</div>
                        <div class="structure-meta">
                            <span class="structure-id">ID: ${paragraph.id}</span> • 
                            <span class="structure-stats">${paragraph.sentences.length} sentences</span>
                        </div>
                `;

                // Show sentences in this paragraph
                paragraph.sentences.forEach(sentenceId => {
                    const sentence = this.currentStructure.sentences.find(s => s.id === sentenceId);
                    if (sentence) {
                        const isNew = sentence.isNew ? 'highlight-new' : '';
                        html += `
                            <div class="sentence-item-nested" data-id="${sentence.id}" style="margin: 0.5rem 0; padding: 0.5rem; background: #1a1a1a; border-radius: 4px; cursor: pointer; transition: background 0.2s ease;">
                                <div style="font-size: 0.8rem; color: #888; margin-bottom: 0.25rem;">
                                    Sentence ID: ${sentence.id} • ${sentence.wordCount} words
                                </div>
                                <div class="${isNew}">"${sentence.content}"</div>
                            </div>
                        `;
                    }
                });

                html += `</div>`;
            });
        }

        this.elements.content.innerHTML = html;
        this.addClickHandlers();
    }

    addClickHandlers() {
        // Add click handlers for interactive elements
        this.elements.content.querySelectorAll('[data-id]').forEach(element => {
            element.addEventListener('click', (e) => {
                // Stop event bubbling to prevent parent elements from triggering
                e.stopPropagation();
                
                const id = e.currentTarget.dataset.id;
                this.highlightInEditor(id);
            });
        });
    }

    highlightInEditor(id) {
        // Find the element by ID and highlight it in the editor
        if (!this.currentStructure) return;

        let targetElement = null;
        let targetType = '';

        // Check sentences
        targetElement = this.currentStructure.sentences.find(s => s.id === id);
        if (targetElement) targetType = 'sentence';

        // Check words
        if (!targetElement) {
            targetElement = this.currentStructure.words.find(w => w.id === id);
            if (targetElement) targetType = 'word';
        }

        // Check paragraphs
        if (!targetElement) {
            targetElement = this.currentStructure.paragraphs.find(p => p.id === id);
            if (targetElement) targetType = 'paragraph';
        }

        if (targetElement && window.aiTextEditor && window.aiTextEditor.editorManager) {
            // Highlight the text in the editor
            const start = targetElement.position.start;
            const end = targetElement.position.end;
            
            try {
                window.aiTextEditor.editorManager.highlightRange(start, end);
                
                // Show notification
                if (window.aiTextEditor.notificationManager) {
                    window.aiTextEditor.notificationManager.success(
                        `Highlighted ${targetType}: "${targetElement.content.substring(0, 30)}${targetElement.content.length > 30 ? '...' : ''}"`
                    );
                }
            } catch (error) {
                console.error('Error highlighting in editor:', error);
            }
        }
    }

    // Export current structure for debugging/analysis
    exportStructure() {
        if (!this.currentStructure) return null;
        
        const exportData = {
            timestamp: new Date().toISOString(),
            stats: this.currentStructure.stats,
            sentences: this.currentStructure.sentences,
            words: this.currentStructure.words,
            paragraphs: this.currentStructure.paragraphs
        };

        // Download as JSON file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `text-structure-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        return exportData;
    }

    isTabActive() {
        // Check if the inspect tab is currently active by looking at the DOM
        if (!this.elements.tab || !this.elements.tabContent) return false;
        
        // The UIManager uses 'active' class to control tab visibility
        // Check if either the tab button or content has the active class
        const isTabButtonActive = this.elements.tab.classList.contains('active');
        const isTabContentActive = this.elements.tabContent.classList.contains('active');
        
        return isTabButtonActive && isTabContentActive;
    }

    cleanup() {
        this.currentStructure = null;
    }
}