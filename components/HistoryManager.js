class HistoryManager {
    constructor() {
        this.llmCallStorage = new LLMCallStorage();
        this.currentView = 'timeline'; // timeline, files, search
        this.currentPage = 0;
        this.itemsPerPage = 20;
        this.searchTerm = '';
        this.selectedFile = null;
        this.selectedPrompt = null;
    }

    async initialize() {
        this.setupUI();
        this.bindEvents();
        
        // Wait for LLMCallStorage to be fully initialized before loading data
        await this.llmCallStorage.waitForInitialization();
        await this.loadHistory();
    }

    setupUI() {
        const container = document.getElementById('historyTabContent');
        if (!container) return;

        container.innerHTML = `
            <div class="history-section">
                <div class="section-header">
                    <h4>Feedback History</h4>
                    <div class="history-controls">
                        <button class="btn-small" id="refreshHistoryBtn" title="Refresh">🔄</button>
                        <button class="btn-small" id="exportHistoryBtn" title="Export">📥</button>
                        <button class="btn-small" id="clearHistoryBtn" title="Clear All">🗑️</button>
                    </div>
                </div>
                
                <div class="history-filters">
                    <div class="filter-row">
                        <input type="text" id="historySearchInput" class="search-input" placeholder="Search feedback content, prompts, or files...">
                        <select id="historyViewSelect" class="filter-select">
                            <option value="timeline">Timeline View</option>
                            <option value="files">By Files</option>
                            <option value="prompts">By Prompts</option>
                        </select>
                    </div>
                    <div class="filter-row" id="fileFilterRow" style="display: none;">
                        <select id="fileFilter" class="filter-select">
                            <option value="">All Files</option>
                        </select>
                        <select id="promptFilter" class="filter-select">
                            <option value="">All Prompts</option>
                        </select>
                    </div>
                </div>

                <div class="history-stats" id="historyStats">
                    <!-- Populated dynamically -->
                </div>

                <div class="history-content-container" id="historyContent">
                    <div class="loading-message">Loading history...</div>
                </div>

                <div class="history-pagination" id="historyPagination" style="display: none;">
                    <button class="btn-small" id="prevPageBtn" disabled>Previous</button>
                    <span id="pageInfo">Page 1</span>
                    <button class="btn-small" id="nextPageBtn">Next</button>
                </div>
            </div>
        `;
    }

    bindEvents() {
        document.getElementById('refreshHistoryBtn')?.addEventListener('click', () => this.loadHistory());
        document.getElementById('exportHistoryBtn')?.addEventListener('click', () => this.exportHistory());
        document.getElementById('clearHistoryBtn')?.addEventListener('click', () => this.clearHistory());
        
        document.getElementById('historySearchInput')?.addEventListener('input', (e) => this.handleSearch(e));
        document.getElementById('historyViewSelect')?.addEventListener('change', (e) => this.handleViewChange(e));
        document.getElementById('fileFilter')?.addEventListener('change', (e) => this.handleFileFilter(e));
        document.getElementById('promptFilter')?.addEventListener('change', (e) => this.handlePromptFilter(e));
        
        document.getElementById('prevPageBtn')?.addEventListener('click', () => this.previousPage());
        document.getElementById('nextPageBtn')?.addEventListener('click', () => this.nextPage());
    }

    async loadHistory() {
        try {
            const container = document.getElementById('historyContent');
            container.innerHTML = '<div class="loading-message">Loading history...</div>';

            // Load stats
            await this.updateStats();
            
            // Load filters
            await this.updateFilters();
            
            // Load content based on current view
            switch (this.currentView) {
                case 'timeline':
                    await this.loadTimelineView();
                    break;
                case 'files':
                    await this.loadFilesView();
                    break;
                case 'prompts':
                    await this.loadPromptsView();
                    break;
            }
        } catch (error) {
            console.error('Error loading history:', error);
            const container = document.getElementById('historyContent');
            container.innerHTML = '<div class="error-message">Failed to load history</div>';
        }
    }

    async updateStats() {
        try {
            const stats = await this.llmCallStorage.getFeedbackStats();
            const statsContainer = document.getElementById('historyStats');
            
            statsContainer.innerHTML = `
                <div class="stats-row">
                    <div class="stat-item">
                        <span class="stat-value">${stats.totalFeedback}</span>
                        <span class="stat-label">Total Feedback</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${stats.filesWithFeedback}</span>
                        <span class="stat-label">Files</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${stats.promptsUsed.length}</span>
                        <span class="stat-label">Prompts</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${stats.providersUsed.length}</span>
                        <span class="stat-label">Providers</span>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    async updateFilters() {
        try {
            // Update file filter
            const files = await this.llmCallStorage.getFilesWithFeedback();
            const fileFilter = document.getElementById('fileFilter');
            fileFilter.innerHTML = '<option value="">All Files</option>';
            
            files.forEach(filePath => {
                const fileName = filePath ? filePath.split('/').pop() || filePath : 'Untitled';
                const option = document.createElement('option');
                option.value = filePath;
                option.textContent = fileName;
                fileFilter.appendChild(option);
            });

            // Update prompt filter
            const stats = await this.llmCallStorage.getFeedbackStats();
            const promptFilter = document.getElementById('promptFilter');
            promptFilter.innerHTML = '<option value="">All Prompts</option>';
            
            stats.promptsUsed.forEach(promptName => {
                const option = document.createElement('option');
                option.value = promptName;
                option.textContent = promptName;
                promptFilter.appendChild(option);
            });
        } catch (error) {
            console.error('Error updating filters:', error);
        }
    }

    async loadTimelineView() {
        try {
            let calls;
            
            if (this.searchTerm) {
                calls = await this.llmCallStorage.searchFeedback(this.searchTerm, 100);
            } else {
                calls = await this.llmCallStorage.getRecentFeedback(100);
            }

            // Apply filters
            if (this.selectedFile) {
                calls = calls.filter(call => call.filePath === this.selectedFile);
            }
            if (this.selectedPrompt) {
                calls = calls.filter(call => call.promptIdentifier === this.selectedPrompt);
            }

            const container = document.getElementById('historyContent');
            
            if (calls.length === 0) {
                container.innerHTML = '<div class="no-history">No feedback history found</div>';
                return;
            }

            // Paginate
            const startIndex = this.currentPage * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const paginatedCalls = calls.slice(startIndex, endIndex);

            // Render timeline
            container.innerHTML = paginatedCalls.map(call => this.renderFeedbackItem(call)).join('');
            
            // Update pagination
            this.updatePagination(calls.length);

        } catch (error) {
            console.error('Error loading timeline view:', error);
            const container = document.getElementById('historyContent');
            container.innerHTML = '<div class="error-message">Failed to load timeline</div>';
        }
    }

    async loadFilesView() {
        try {
            const files = await this.llmCallStorage.getFilesWithFeedback();
            const container = document.getElementById('historyContent');
            
            if (files.length === 0) {
                container.innerHTML = '<div class="no-history">No files with feedback found</div>';
                return;
            }

            let html = '<div class="files-view">';
            
            for (const filePath of files) {
                const fileName = filePath ? filePath.split('/').pop() || filePath : 'Untitled';
                const fileHistory = await this.llmCallStorage.getFileHistory(filePath);
                
                html += `
                    <div class="file-group">
                        <div class="file-header" onclick="this.parentElement.querySelector('.file-content').style.display = this.parentElement.querySelector('.file-content').style.display === 'none' ? 'block' : 'none'">
                            <h5>📄 ${this.escapeHTML(fileName)}</h5>
                            <span class="feedback-count">${fileHistory.length} feedback items</span>
                        </div>
                        <div class="file-content" style="display: none;">
                            ${fileHistory.slice(0, 10).map(call => this.renderFeedbackItem(call)).join('')}
                            ${fileHistory.length > 10 ? `<div class="more-items">... and ${fileHistory.length - 10} more items</div>` : ''}
                        </div>
                    </div>
                `;
            }
            
            html += '</div>';
            container.innerHTML = html;

        } catch (error) {
            console.error('Error loading files view:', error);
            const container = document.getElementById('historyContent');
            container.innerHTML = '<div class="error-message">Failed to load files view</div>';
        }
    }

    async loadPromptsView() {
        try {
            const stats = await this.llmCallStorage.getFeedbackStats();
            const container = document.getElementById('historyContent');
            
            if (stats.promptsUsed.length === 0) {
                container.innerHTML = '<div class="no-history">No prompts found</div>';
                return;
            }

            let html = '<div class="prompts-view">';
            
            for (const promptName of stats.promptsUsed) {
                const promptHistory = await this.llmCallStorage.getCallsByPrompt(promptName);
                
                html += `
                    <div class="prompt-group">
                        <div class="prompt-header" onclick="this.parentElement.querySelector('.prompt-content').style.display = this.parentElement.querySelector('.prompt-content').style.display === 'none' ? 'block' : 'none'">
                            <h5>💬 ${this.escapeHTML(promptName)}</h5>
                            <span class="feedback-count">${promptHistory.length} feedback items</span>
                        </div>
                        <div class="prompt-content" style="display: none;">
                            ${promptHistory.slice(0, 10).map(call => this.renderFeedbackItem(call)).join('')}
                            ${promptHistory.length > 10 ? `<div class="more-items">... and ${promptHistory.length - 10} more items</div>` : ''}
                        </div>
                    </div>
                `;
            }
            
            html += '</div>';
            container.innerHTML = html;

        } catch (error) {
            console.error('Error loading prompts view:', error);
            const container = document.getElementById('historyContent');
            container.innerHTML = '<div class="error-message">Failed to load prompts view</div>';
        }
    }

    renderFeedbackItem(call) {
        const date = new Date(call.timestamp);
        const fileName = call.filePath ? call.filePath.split('/').pop() || call.filePath : 'Untitled';
        const duration = call.duration ? this.formatDuration(call.duration) : 'N/A';
        
        // Extract plain text from HTML content for preview
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = call.feedbackContent || '';
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        const preview = textContent.length > 200 ? textContent.substring(0, 200) + '...' : textContent;

        return `
            <div class="history-item ${call.responseType}">
                <div class="history-header">
                    <div class="history-meta">
                        <strong>${this.escapeHTML(call.promptIdentifier)}</strong>
                        <span class="history-file">📄 ${this.escapeHTML(fileName)}</span>
                        <span class="history-date">${date.toLocaleString()}</span>
                        <span class="history-provider">${call.provider} • ${call.model}</span>
                        <span class="history-duration">${duration}</span>
                    </div>
                    <button class="btn-small expand-btn" onclick="this.parentElement.parentElement.querySelector('.history-content').style.display = this.parentElement.parentElement.querySelector('.history-content').style.display === 'none' ? 'block' : 'none'; this.textContent = this.textContent === '▼' ? '▲' : '▼'">▼</button>
                </div>
                <div class="history-preview">${this.escapeHTML(preview)}</div>
                <div class="history-content" style="display: none;">
                    ${call.feedbackContent || '<em>No content available</em>'}
                    ${call.usage ? `
                        <div class="usage-info">
                            <small>Tokens: ${call.usage.input_tokens || 0} in, ${call.usage.output_tokens || 0} out</small>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    updatePagination(totalItems) {
        const pagination = document.getElementById('historyPagination');
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';
        
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const pageInfo = document.getElementById('pageInfo');
        
        prevBtn.disabled = this.currentPage === 0;
        nextBtn.disabled = this.currentPage >= totalPages - 1;
        pageInfo.textContent = `Page ${this.currentPage + 1} of ${totalPages}`;
    }

    handleSearch(e) {
        this.searchTerm = e.target.value.trim();
        this.currentPage = 0;
        this.loadHistory();
    }

    handleViewChange(e) {
        this.currentView = e.target.value;
        this.currentPage = 0;
        
        const fileFilterRow = document.getElementById('fileFilterRow');
        if (this.currentView === 'timeline') {
            fileFilterRow.style.display = 'flex';
        } else {
            fileFilterRow.style.display = 'none';
        }
        
        this.loadHistory();
    }

    handleFileFilter(e) {
        this.selectedFile = e.target.value || null;
        this.currentPage = 0;
        this.loadHistory();
    }

    handlePromptFilter(e) {
        this.selectedPrompt = e.target.value || null;
        this.currentPage = 0;
        this.loadHistory();
    }

    previousPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.loadHistory();
        }
    }

    nextPage() {
        this.currentPage++;
        this.loadHistory();
    }

    async exportHistory() {
        try {
            const data = await this.llmCallStorage.exportHistory();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `feedback-history-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            window.app?.notificationManager?.showNotification('History exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting history:', error);
            window.app?.notificationManager?.showNotification('Failed to export history', 'error');
        }
    }

    async clearHistory() {
        if (confirm('Are you sure you want to clear all feedback history? This action cannot be undone.')) {
            try {
                await this.llmCallStorage.clearHistory();
                await this.loadHistory();
                window.app?.notificationManager?.showNotification('History cleared successfully', 'success');
            } catch (error) {
                console.error('Error clearing history:', error);
                window.app?.notificationManager?.showNotification('Failed to clear history', 'error');
            }
        }
    }

    formatDuration(durationMs) {
        if (!durationMs || typeof durationMs !== 'number') {
            return '0s';
        }
        
        if (durationMs < 1000) {
            return `${Math.round(durationMs)}ms`;
        } else {
            return `${(durationMs / 1000).toFixed(1)}s`;
        }
    }

    escapeHTML(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}