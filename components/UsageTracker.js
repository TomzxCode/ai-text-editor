class UsageTracker {
    constructor() {
        this.llmCallStorage = new LLMCallStorage();
        this.refreshInterval = null;
        this.autoRefreshEnabled = true;
    }

    async initialize() {
        this.setupUI();
        this.bindEvents();
        
        try {
            // Show loading state
            this.showLoadingState();
            
            // Wait for LLMCallStorage to be fully initialized before loading data
            await this.llmCallStorage.waitForInitialization();
            await this.refreshData();
            
            if (this.autoRefreshEnabled) {
                this.startAutoRefresh();
            }
        } catch (error) {
            console.error('Error initializing UsageTracker:', error);
            this.showErrorState('Failed to initialize usage tracking');
        }
    }

    showLoadingState() {
        // Set loading text for overview stats
        document.getElementById('totalCallsValue').textContent = 'Loading...';
        document.getElementById('totalTokensValue').textContent = 'Loading...';
        document.getElementById('inputTokensValue').textContent = 'Loading...';
        document.getElementById('outputTokensValue').textContent = 'Loading...';
        document.getElementById('totalDurationValue').textContent = 'Loading...';
        document.getElementById('avgDurationValue').textContent = 'Loading...';
    }

    showErrorState(message) {
        // Set error text for overview stats
        document.getElementById('totalCallsValue').textContent = 'Error';
        document.getElementById('totalTokensValue').textContent = 'Error';
        document.getElementById('inputTokensValue').textContent = 'Error';
        document.getElementById('outputTokensValue').textContent = 'Error';
        document.getElementById('totalDurationValue').textContent = 'Error';
        document.getElementById('avgDurationValue').textContent = 'Error';
        
        console.error('UsageTracker error:', message);
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
                        <div class="usage-stat-card">
                            <h5>Total Time</h5>
                            <span class="usage-stat-value" id="totalDurationValue">0s</span>
                        </div>
                        <div class="usage-stat-card">
                            <h5>Avg Time</h5>
                            <span class="usage-stat-value" id="avgDurationValue">0s</span>
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
                    <div class="filter-group">
                        <label for="providerFilter">Provider:</label>
                        <select id="providerFilter" class="filter-select">
                            <option value="all">All Providers</option>
                            <!-- Populated dynamically -->
                        </select>
                    </div>
                    <div class="filter-group">
                        <label for="modelFilter">Model:</label>
                        <select id="modelFilter" class="filter-select">
                            <option value="all">All Models</option>
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

                <!-- Usage Subtabs -->
                <div class="usage-subtabs">
                    <div class="subtab-nav">
                        <button class="subtab-btn active" id="overviewSubtab" data-subtab="overview">Overview</button>
                        <button class="subtab-btn" id="promptsSubtab" data-subtab="prompts">By Prompt</button>
                        <button class="subtab-btn" id="callsSubtab" data-subtab="calls">Recent Calls</button>
                    </div>
                    
                    <!-- Overview Subtab Content -->
                    <div class="subtab-content active" id="overviewSubtabContent">
                        <div class="usage-summary">
                            <p>Usage overview and statistics are displayed above. Switch to "By Prompt" or "Recent Calls" tabs for detailed data.</p>
                        </div>
                    </div>
                    
                    <!-- Prompts Subtab Content -->
                    <div class="subtab-content" id="promptsSubtabContent">
                        <div class="usage-details">
                            <div class="section-header">
                                <h4 id="usageDetailsTitle">Usage by Prompt</h4>
                            </div>
                            <div class="prompt-usage-list" id="promptUsageList">
                                <!-- Populated dynamically -->
                            </div>
                        </div>
                    </div>
                    
                    <!-- Calls Subtab Content -->
                    <div class="subtab-content" id="callsSubtabContent">
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
                </div>
            </div>
        `;

        // Initialize searchable dropdowns after HTML is created
        this.initializeSearchableFilters();
    }

    initializeSearchableFilters() {
        // Initialize all filter dropdowns as searchable
        window.searchableDropdown.init('dateRangeFilter', {
            searchEnabled: true,
            searchPlaceholderValue: 'Search date ranges...',
            placeholder: false
        });

        window.searchableDropdown.init('sessionFilter', {
            searchEnabled: true,
            searchPlaceholderValue: 'Search sessions...',
            placeholder: false
        });

        window.searchableDropdown.init('providerFilter', {
            searchEnabled: true,
            searchPlaceholderValue: 'Search providers...',
            placeholder: false
        });

        window.searchableDropdown.init('modelFilter', {
            searchEnabled: true,
            searchPlaceholderValue: 'Search models...',
            placeholder: false
        });

        window.searchableDropdown.init('callsLimitSelect', {
            searchEnabled: true,
            searchPlaceholderValue: 'Search limits...',
            placeholder: false
        });
    }

    bindEvents() {
        document.getElementById('refreshUsageBtn')?.addEventListener('click', async () => await this.refreshData());
        document.getElementById('exportUsageBtn')?.addEventListener('click', async () => await this.exportUsage());
        document.getElementById('clearUsageBtn')?.addEventListener('click', async () => await this.clearUsage());
        
        window.searchableDropdown.addEventListener('dateRangeFilter', 'change', (e) => this.handleDateRangeChange(e));
        window.searchableDropdown.addEventListener('sessionFilter', 'change', async () => await this.refreshData());
        window.searchableDropdown.addEventListener('providerFilter', 'change', async () => await this.refreshData());
        window.searchableDropdown.addEventListener('modelFilter', 'change', async () => await this.refreshData());
        document.getElementById('applyDateRangeBtn')?.addEventListener('click', async () => await this.applyCustomDateRange());
        
        document.getElementById('searchCallsInput')?.addEventListener('input', (e) => this.handleSearchChange(e));
        window.searchableDropdown.addEventListener('callsLimitSelect', 'change', async () => await this.refreshCallsList());

        // Subtab navigation
        document.getElementById('overviewSubtab')?.addEventListener('click', () => this.switchSubtab('overview'));
        document.getElementById('promptsSubtab')?.addEventListener('click', () => this.switchSubtab('prompts'));
        document.getElementById('callsSubtab')?.addEventListener('click', () => this.switchSubtab('calls'));
    }

    handleDateRangeChange(e) {
        const value = e.detail.value;
        const customRange = document.getElementById('customDateRange');
        
        if (value === 'custom') {
            customRange.style.display = 'flex';
        } else {
            customRange.style.display = 'none';
            this.refreshData().catch(console.error);
        }
    }

    async applyCustomDateRange() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (startDate && endDate) {
            await this.refreshData();
        }
    }

    handleSearchChange(e) {
        const searchTerm = e.target.value.toLowerCase();
        this.refreshCallsList(searchTerm).catch(console.error);
    }

    async refreshData() {
        await this.populateSessionFilter();
        await this.populateProviderFilter();
        await this.populateModelFilter();
        await this.updateOverviewStats();
        await this.updatePromptUsage();
        await this.refreshCallsList();
    }

    async populateSessionFilter() {
        // Use the enhanced storage statistics for more efficient data retrieval
        const stats = await this.llmCallStorage.getUsageStatistics();
        const sessions = new Set();
        
        // Extract sessions from the aggregated stats
        Object.keys(stats.callsByDate || {}).forEach(date => {
            // Get calls for each date to extract session IDs
            // This is a simplified approach - we could enhance LLMCallStorage to provide session stats directly
        });
        
        // For now, fall back to getting all calls to extract sessions
        const allCalls = await this.llmCallStorage.getAllCalls();
        allCalls.forEach(call => {
            if (call.sessionId) {
                sessions.add(call.sessionId);
            }
        });

        // Get current session ID from SessionManager
        const currentSessionId = window.app?.sessionManager?.getCurrentSessionId();

        // Create choices array
        const sessionChoices = [
            { value: 'all', label: 'All Sessions' },
            { value: 'current', label: 'Current Session' }
        ];

        sessions.forEach(sessionId => {
            sessionChoices.push({
                value: sessionId,
                label: `Session ${sessionId.slice(0, 8)}...`
            });
        });

        window.searchableDropdown.setChoices('sessionFilter', sessionChoices);
    }

    async populateProviderFilter() {
        // Use the enhanced storage statistics for more efficient data retrieval
        const stats = await this.llmCallStorage.getUsageStatistics();
        const providers = Object.keys(stats.callsByProvider || {});

        // Create choices array
        const providerChoices = [
            { value: 'all', label: 'All Providers' }
        ];

        providers.forEach(provider => {
            providerChoices.push({
                value: provider,
                label: provider.charAt(0).toUpperCase() + provider.slice(1)
            });
        });

        window.searchableDropdown.setChoices('providerFilter', providerChoices);
    }

    async populateModelFilter() {
        // Use the enhanced storage statistics for more efficient data retrieval
        const stats = await this.llmCallStorage.getUsageStatistics();
        const models = Object.keys(stats.callsByModel || {});

        // Create choices array
        const modelChoices = [
            { value: 'all', label: 'All Models' }
        ];

        models.forEach(model => {
            modelChoices.push({
                value: model,
                label: model
            });
        });

        window.searchableDropdown.setChoices('modelFilter', modelChoices);
    }

    async updateOverviewStats() {
        // Use filtered calls to calculate stats that match the current filters
        const calls = await this.getFilteredCalls();
        const stats = this.calculateStats(calls);

        document.getElementById('totalCallsValue').textContent = stats.totalCalls;
        document.getElementById('totalTokensValue').textContent = stats.totalTokens.toLocaleString();
        document.getElementById('inputTokensValue').textContent = stats.inputTokens.toLocaleString();
        document.getElementById('outputTokensValue').textContent = stats.outputTokens.toLocaleString();
        document.getElementById('totalDurationValue').textContent = this.formatDuration(stats.totalDuration);
        document.getElementById('avgDurationValue').textContent = this.formatDuration(stats.avgDuration);
    }

    async updatePromptUsage() {
        const calls = await this.getFilteredCalls();
        const sessionFilter = window.searchableDropdown.getValue('sessionFilter') || 'all';
        const providerFilter = window.searchableDropdown.getValue('providerFilter') || 'all';
        const modelFilter = window.searchableDropdown.getValue('modelFilter') || 'all';
        const promptStats = {};

        // Update the section title based on active filters
        const titleElement = document.getElementById('usageDetailsTitle');
        if (titleElement) {
            let title = 'Usage by Prompt';
            const filters = [];
            
            if (sessionFilter === 'current') {
                filters.push('Current Session');
            } else if (sessionFilter !== 'all') {
                filters.push(`Session ${sessionFilter.slice(0, 8)}...`);
            }
            
            if (providerFilter !== 'all') {
                filters.push(`${providerFilter.charAt(0).toUpperCase() + providerFilter.slice(1)} Provider`);
            }
            
            if (modelFilter !== 'all') {
                filters.push(`${modelFilter} Model`);
            }
            
            if (filters.length > 0) {
                title += ` (${filters.join(', ')})`;
            }
            
            titleElement.textContent = title;
        }

        calls.forEach(call => {
            const prompt = call.promptIdentifier;
            if (!promptStats[prompt]) {
                promptStats[prompt] = {
                    calls: 0,
                    totalTokens: 0,
                    inputTokens: 0,
                    outputTokens: 0,
                    totalDuration: 0,
                    avgDuration: 0,
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
            if (call.duration && typeof call.duration === 'number') {
                promptStats[prompt].totalDuration += call.duration;
            }
            
            if (new Date(call.timestamp) > new Date(promptStats[prompt].lastUsed)) {
                promptStats[prompt].lastUsed = call.timestamp;
            }
        });

        // Calculate average duration for each prompt
        Object.values(promptStats).forEach(stats => {
            if (stats.calls > 0) {
                stats.avgDuration = stats.totalDuration / stats.calls;
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
                        <span class="detail-label">Total Time:</span>
                        <span class="detail-value">${this.formatDuration(stats.totalDuration)}</span>
                    </div>
                    <div class="usage-detail">
                        <span class="detail-label">Avg Time:</span>
                        <span class="detail-value">${this.formatDuration(stats.avgDuration)}</span>
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

    async refreshCallsList(searchTerm = '') {
        const calls = await this.getFilteredCalls();
        const limit = window.searchableDropdown.getValue('callsLimitSelect') || '50';
        
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
                    ${call.duration ? `<span class="call-stat">Time: ${this.formatDuration(call.duration)}</span>` : ''}
                    ${call.provider ? `<span class="call-provider">Provider: ${call.provider.charAt(0).toUpperCase() + call.provider.slice(1)}</span>` : ''}
                    ${call.model ? `<span class="call-model">Model: ${call.model}</span>` : ''}
                    ${call.sessionId ? `<span class="call-session" title="${call.sessionId}">Session: ${call.sessionId.slice(0, 8)}... ${this.isCurrentSession(call.sessionId) ? '(Current)' : ''}</span>` : ''}
                </div>
            `;
            container.appendChild(callItem);
        });
    }

    async getFilteredCalls() {
        const dateRange = window.searchableDropdown.getValue('dateRangeFilter') || 'all';
        const sessionFilter = window.searchableDropdown.getValue('sessionFilter') || 'all';
        const providerFilter = window.searchableDropdown.getValue('providerFilter') || 'all';
        const modelFilter = window.searchableDropdown.getValue('modelFilter') || 'all';
        let calls = await this.llmCallStorage.getAllCalls();

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

        // Apply provider filtering
        if (providerFilter !== 'all') {
            calls = calls.filter(call => call.provider === providerFilter);
        }

        // Apply model filtering
        if (modelFilter !== 'all') {
            calls = calls.filter(call => call.model === modelFilter);
        }

        return calls.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    calculateStats(calls) {
        const stats = calls.reduce((stats, call) => {
            stats.totalCalls++;
            if (call.usage) {
                stats.totalTokens += call.usage.total_tokens || 0;
                stats.inputTokens += call.usage.input_tokens || 0;
                stats.outputTokens += call.usage.output_tokens || 0;
            }
            if (call.duration && typeof call.duration === 'number') {
                stats.totalDuration += call.duration;
            }
            return stats;
        }, {
            totalCalls: 0,
            totalTokens: 0,
            inputTokens: 0,
            outputTokens: 0,
            totalDuration: 0,
            avgDuration: 0
        });

        // Calculate average duration
        if (stats.totalCalls > 0) {
            stats.avgDuration = stats.totalDuration / stats.totalCalls;
        }

        return stats;
    }

    async exportUsage() {
        try {
            const exportData = await this.llmCallStorage.exportHistory();
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

    async clearUsage() {
        if (confirm('Are you sure you want to clear all usage history? This action cannot be undone.')) {
            await this.llmCallStorage.clearHistory();
            await this.refreshData();
            window.app?.notificationManager?.showNotification('Usage history cleared', 'success');
        }
    }

    formatDuration(durationMs) {
        if (!durationMs || typeof durationMs !== 'number') {
            return '0s';
        }
        
        if (durationMs < 1000) {
            return Math.round(durationMs) + 'ms';
        } else if (durationMs < 60000) {
            return (durationMs / 1000).toFixed(1) + 's';
        } else if (durationMs < 3600000) {
            const minutes = Math.floor(durationMs / 60000);
            const seconds = Math.floor((durationMs % 60000) / 1000);
            return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
        } else {
            const hours = Math.floor(durationMs / 3600000);
            const minutes = Math.floor((durationMs % 3600000) / 60000);
            return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
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
                this.refreshData().catch(console.error);
            }
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    switchSubtab(subtabName) {
        // Remove active class from all subtab buttons
        document.querySelectorAll('.subtab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Remove active class from all subtab content
        document.querySelectorAll('.subtab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Add active class to selected subtab button
        document.getElementById(`${subtabName}Subtab`)?.classList.add('active');

        // Add active class to selected subtab content
        document.getElementById(`${subtabName}SubtabContent`)?.classList.add('active');

        // Load data for the selected subtab
        if (subtabName === 'prompts') {
            this.updatePromptUsage().catch(console.error);
        } else if (subtabName === 'calls') {
            this.refreshCallsList().catch(console.error);
        }
    }

    destroy() {
        this.stopAutoRefresh();
    }
}