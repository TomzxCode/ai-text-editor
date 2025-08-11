class UsageTracker {
    constructor() {
        this.llmCallStorage = new LLMCallStorage();
        this.refreshInterval = null;
        this.autoRefreshEnabled = true;
    }

    initialize() {
        this.setupUI();
        this.bindEvents();
        this.refreshData();
        
        if (this.autoRefreshEnabled) {
            this.startAutoRefresh();
        }
    }

    setupUI() {
        const container = document.getElementById('usageTabContent');
        if (!container) return;

        container.innerHTML = `
            <div class="usage-section">
                <div class="section-header">
                    <h4>Usage Statistics</h4>
                    <div class="usage-controls">
                        <button class="btn-small" id="refreshUsageBtn" title="Refresh Data">🔄</button>
                        <button class="btn-small" id="exportUsageBtn" title="Export Data">📥</button>
                        <button class="btn-small" id="clearUsageBtn" title="Clear History">🗑️</button>
                    </div>
                </div>
                
                <div class="usage-overview">
                    <div class="usage-stats-grid">
                        <div class="usage-stat-card">
                            <h5>Total Calls</h5>
                            <span class="usage-stat-value" id="totalCallsValue">0</span>
                        </div>
                        <div class="usage-stat-card">
                            <h5>Total Tokens</h5>
                            <span class="usage-stat-value" id="totalTokensValue">0</span>
                        </div>
                        <div class="usage-stat-card">
                            <h5>Input Tokens</h5>
                            <span class="usage-stat-value" id="inputTokensValue">0</span>
                        </div>
                        <div class="usage-stat-card">
                            <h5>Output Tokens</h5>
                            <span class="usage-stat-value" id="outputTokensValue">0</span>
                        </div>
                    </div>
                </div>

                <div class="usage-filters">
                    <div class="filter-group">
                        <label for="dateRangeFilter">Date Range:</label>
                        <select id="dateRangeFilter" class="filter-select">
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">Last 7 Days</option>
                            <option value="month">Last 30 Days</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="sessionFilter">Session:</label>
                        <select id="sessionFilter" class="filter-select">
                            <option value="all">All Sessions</option>
                            <option value="current">Current Session</option>
                            <!-- Populated dynamically -->
                        </select>
                    </div>
                    <div class="custom-date-range" id="customDateRange" style="display: none;">
                        <input type="date" id="startDate" class="filter-input">
                        <span>to</span>
                        <input type="date" id="endDate" class="filter-input">
                        <button class="btn-small" id="applyDateRangeBtn">Apply</button>
                    </div>
                </div>

                <div class="usage-details">
                    <div class="section-header">
                        <h4 id="usageDetailsTitle">Usage by Prompt</h4>
                    </div>
                    <div class="prompt-usage-list" id="promptUsageList">
                        <!-- Populated dynamically -->
                    </div>
                </div>

                <div class="usage-history">
                    <div class="section-header">
                        <h4>Recent Calls</h4>
                        <div class="history-controls">
                            <input type="text" id="searchCallsInput" class="search-input" placeholder="Search calls...">
                            <select id="callsLimitSelect" class="filter-select">
                                <option value="50">Last 50</option>
                                <option value="100">Last 100</option>
                                <option value="500">Last 500</option>
                                <option value="all">All</option>
                            </select>
                        </div>
                    </div>
                    <div class="calls-list" id="callsList">
                        <!-- Populated dynamically -->
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        document.getElementById('refreshUsageBtn')?.addEventListener('click', () => this.refreshData());
        document.getElementById('exportUsageBtn')?.addEventListener('click', () => this.exportUsage());
        document.getElementById('clearUsageBtn')?.addEventListener('click', () => this.clearUsage());
        
        document.getElementById('dateRangeFilter')?.addEventListener('change', (e) => this.handleDateRangeChange(e));
        document.getElementById('sessionFilter')?.addEventListener('change', () => this.refreshData());
        document.getElementById('applyDateRangeBtn')?.addEventListener('click', () => this.applyCustomDateRange());
        
        document.getElementById('searchCallsInput')?.addEventListener('input', (e) => this.handleSearchChange(e));
        document.getElementById('callsLimitSelect')?.addEventListener('change', () => this.refreshCallsList());
    }

    handleDateRangeChange(e) {
        const value = e.target.value;
        const customRange = document.getElementById('customDateRange');
        
        if (value === 'custom') {
            customRange.style.display = 'flex';
        } else {
            customRange.style.display = 'none';
            this.refreshData();
        }
    }

    applyCustomDateRange() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (startDate && endDate) {
            this.refreshData();
        }
    }

    handleSearchChange(e) {
        const searchTerm = e.target.value.toLowerCase();
        this.refreshCallsList(searchTerm);
    }

    refreshData() {
        this.populateSessionFilter();
        this.updateOverviewStats();
        this.updatePromptUsage();
        this.refreshCallsList();
    }

    populateSessionFilter() {
        const sessionFilter = document.getElementById('sessionFilter');
        if (!sessionFilter) return;

        const allCalls = this.llmCallStorage.getAllCalls();
        const sessions = new Set();
        
        allCalls.forEach(call => {
            if (call.sessionId) {
                sessions.add(call.sessionId);
            }
        });

        // Get current session ID from SessionManager
        const currentSessionId = window.app?.sessionManager?.getCurrentSessionId();

        // Keep existing options and add new sessions
        const existingOptions = Array.from(sessionFilter.options).map(opt => opt.value);
        const staticOptions = ['all', 'current'];

        sessions.forEach(sessionId => {
            if (!existingOptions.includes(sessionId)) {
                const option = document.createElement('option');
                option.value = sessionId;
                option.textContent = `Session ${sessionId.slice(0, 8)}...`;
                sessionFilter.appendChild(option);
            }
        });

        // Remove session options that no longer exist
        Array.from(sessionFilter.options).forEach(option => {
            if (!staticOptions.includes(option.value) && !sessions.has(option.value)) {
                option.remove();
            }
        });
    }

    updateOverviewStats() {
        const calls = this.getFilteredCalls();
        const stats = this.calculateStats(calls);

        document.getElementById('totalCallsValue').textContent = stats.totalCalls;
        document.getElementById('totalTokensValue').textContent = stats.totalTokens.toLocaleString();
        document.getElementById('inputTokensValue').textContent = stats.inputTokens.toLocaleString();
        document.getElementById('outputTokensValue').textContent = stats.outputTokens.toLocaleString();
    }

    updatePromptUsage() {
        const calls = this.getFilteredCalls();
        const sessionFilter = document.getElementById('sessionFilter')?.value || 'all';
        const promptStats = {};

        // Update the section title based on session filter
        const titleElement = document.getElementById('usageDetailsTitle');
        if (titleElement) {
            if (sessionFilter === 'current') {
                titleElement.textContent = 'Usage by Prompt (Current Session)';
            } else if (sessionFilter !== 'all') {
                titleElement.textContent = `Usage by Prompt (Session ${sessionFilter.slice(0, 8)}...)`;
            } else {
                titleElement.textContent = 'Usage by Prompt';
            }
        }

        calls.forEach(call => {
            const prompt = call.promptIdentifier;
            if (!promptStats[prompt]) {
                promptStats[prompt] = {
                    calls: 0,
                    totalTokens: 0,
                    inputTokens: 0,
                    outputTokens: 0,
                    lastUsed: call.timestamp,
                    sessions: new Set()
                };
            }
            
            promptStats[prompt].calls++;
            if (call.sessionId) {
                promptStats[prompt].sessions.add(call.sessionId);
            }
            if (call.usage) {
                promptStats[prompt].totalTokens += call.usage.total_tokens || 0;
                promptStats[prompt].inputTokens += call.usage.input_tokens || 0;
                promptStats[prompt].outputTokens += call.usage.output_tokens || 0;
            }
            
            if (new Date(call.timestamp) > new Date(promptStats[prompt].lastUsed)) {
                promptStats[prompt].lastUsed = call.timestamp;
            }
        });

        const container = document.getElementById('promptUsageList');
        container.innerHTML = '';

        const sortedPrompts = Object.entries(promptStats).sort((a, b) => b[1].calls - a[1].calls);

        if (sortedPrompts.length === 0) {
            container.innerHTML = '<p class="no-data">No usage data found for the selected period.</p>';
            return;
        }

        sortedPrompts.forEach(([prompt, stats]) => {
            const promptCard = document.createElement('div');
            promptCard.className = 'prompt-usage-card';
            
            // Show session count only if viewing all sessions
            const sessionInfo = sessionFilter === 'all' && stats.sessions.size > 1 
                ? `<div class="usage-detail">
                    <span class="detail-label">Sessions:</span>
                    <span class="detail-value">${stats.sessions.size}</span>
                   </div>`
                : '';

            promptCard.innerHTML = `
                <div class="prompt-usage-header">
                    <h5>${this.escapeHTML(prompt)}</h5>
                    <span class="usage-badge">${stats.calls} calls</span>
                </div>
                <div class="prompt-usage-details">
                    <div class="usage-detail">
                        <span class="detail-label">Total Tokens:</span>
                        <span class="detail-value">${stats.totalTokens.toLocaleString()}</span>
                    </div>
                    <div class="usage-detail">
                        <span class="detail-label">Input/Output:</span>
                        <span class="detail-value">${stats.inputTokens.toLocaleString()} / ${stats.outputTokens.toLocaleString()}</span>
                    </div>
                    <div class="usage-detail">
                        <span class="detail-label">Last Used:</span>
                        <span class="detail-value">${this.formatTimestamp(stats.lastUsed)}</span>
                    </div>
                    ${sessionInfo}
                </div>
            `;
            container.appendChild(promptCard);
        });
    }

    refreshCallsList(searchTerm = '') {
        const calls = this.getFilteredCalls();
        const limit = document.getElementById('callsLimitSelect')?.value || '50';
        
        let filteredCalls = calls;
        if (searchTerm) {
            filteredCalls = calls.filter(call => 
                call.promptIdentifier.toLowerCase().includes(searchTerm) ||
                call.sessionId?.toLowerCase().includes(searchTerm)
            );
        }

        if (limit !== 'all') {
            filteredCalls = filteredCalls.slice(0, parseInt(limit));
        }

        const container = document.getElementById('callsList');
        container.innerHTML = '';

        if (filteredCalls.length === 0) {
            container.innerHTML = '<p class="no-data">No calls found.</p>';
            return;
        }

        filteredCalls.forEach(call => {
            const callItem = document.createElement('div');
            callItem.className = 'call-item';
            callItem.innerHTML = `
                <div class="call-header">
                    <span class="call-prompt">${this.escapeHTML(call.promptIdentifier)}</span>
                    <span class="call-timestamp">${this.formatTimestamp(call.timestamp)}</span>
                </div>
                <div class="call-details">
                    ${call.usage ? `
                        <span class="call-stat">Tokens: ${(call.usage.total_tokens || 0).toLocaleString()}</span>
                        <span class="call-stat">In: ${(call.usage.input_tokens || 0).toLocaleString()}</span>
                        <span class="call-stat">Out: ${(call.usage.output_tokens || 0).toLocaleString()}</span>
                    ` : '<span class="call-stat">No usage data</span>'}
                    ${call.sessionId ? `<span class="call-session" title="${call.sessionId}">Session: ${call.sessionId.slice(0, 8)}... ${this.isCurrentSession(call.sessionId) ? '(Current)' : ''}</span>` : ''}
                </div>
            `;
            container.appendChild(callItem);
        });
    }

    getFilteredCalls() {
        const dateRange = document.getElementById('dateRangeFilter')?.value || 'all';
        const sessionFilter = document.getElementById('sessionFilter')?.value || 'all';
        let calls = this.llmCallStorage.getAllCalls();

        // Apply date filtering
        switch (dateRange) {
            case 'today':
                const today = new Date().toDateString();
                calls = calls.filter(call => new Date(call.timestamp).toDateString() === today);
                break;
            case 'week':
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                calls = calls.filter(call => new Date(call.timestamp) >= weekAgo);
                break;
            case 'month':
                const monthAgo = new Date();
                monthAgo.setDate(monthAgo.getDate() - 30);
                calls = calls.filter(call => new Date(call.timestamp) >= monthAgo);
                break;
            case 'custom':
                const startDate = document.getElementById('startDate')?.value;
                const endDate = document.getElementById('endDate')?.value;
                if (startDate && endDate) {
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999); // Include the entire end date
                    calls = calls.filter(call => {
                        const callDate = new Date(call.timestamp);
                        return callDate >= start && callDate <= end;
                    });
                }
                break;
        }

        // Apply session filtering
        switch (sessionFilter) {
            case 'current':
                const currentSessionId = window.app?.sessionManager?.getCurrentSessionId();
                if (currentSessionId) {
                    calls = calls.filter(call => call.sessionId === currentSessionId);
                }
                break;
            case 'all':
                // No filtering needed
                break;
            default:
                // Filter by specific session ID
                calls = calls.filter(call => call.sessionId === sessionFilter);
                break;
        }

        return calls.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    calculateStats(calls) {
        return calls.reduce((stats, call) => {
            stats.totalCalls++;
            if (call.usage) {
                stats.totalTokens += call.usage.total_tokens || 0;
                stats.inputTokens += call.usage.input_tokens || 0;
                stats.outputTokens += call.usage.output_tokens || 0;
            }
            return stats;
        }, {
            totalCalls: 0,
            totalTokens: 0,
            inputTokens: 0,
            outputTokens: 0
        });
    }

    exportUsage() {
        try {
            const exportData = this.llmCallStorage.exportHistory();
            const blob = new Blob([exportData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `llm-usage-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            window.app?.notificationManager?.showNotification('Usage data exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting usage data:', error);
            window.app?.notificationManager?.showNotification('Failed to export usage data', 'error');
        }
    }

    clearUsage() {
        if (confirm('Are you sure you want to clear all usage history? This action cannot be undone.')) {
            this.llmCallStorage.clearHistory();
            this.refreshData();
            window.app?.notificationManager?.showNotification('Usage history cleared', 'success');
        }
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // Less than 1 minute
            return 'Just now';
        } else if (diff < 3600000) { // Less than 1 hour
            return `${Math.floor(diff / 60000)}m ago`;
        } else if (diff < 86400000) { // Less than 1 day
            return `${Math.floor(diff / 3600000)}h ago`;
        } else if (date.toDateString() === now.toDateString()) {
            return 'Today ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleString([], { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        }
    }

    isCurrentSession(sessionId) {
        const currentSessionId = window.app?.sessionManager?.getCurrentSessionId();
        return currentSessionId === sessionId;
    }

    escapeHTML(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Refresh every 30 seconds when the usage tab is active
        this.refreshInterval = setInterval(() => {
            const usageTab = document.getElementById('usageTabContent');
            if (usageTab && !usageTab.classList.contains('hidden')) {
                this.refreshData();
            }
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    destroy() {
        this.stopAutoRefresh();
    }
}