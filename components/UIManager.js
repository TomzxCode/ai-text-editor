class UIManager {
    constructor(elements) {
        this.elements = elements;
        this.currentMobilePanel = 'editor';
        this.isResizing = false;
        this.currentResizer = null;
        
        this.setupEventListeners();
        this.setupMobileNavigation();
        this.setupResizeHandles();
    }

    setupEventListeners() {
        this.elements.closeExplorer.addEventListener('click', () => {
            this.closePanel('fileExplorer');
        });

        this.elements.closeSidebar.addEventListener('click', () => {
            this.closePanel('aiSidebar');
        });

        this.elements.fileSearchInput.addEventListener('input', (e) => {
            this.handleFileSearch(e.target.value);
        });

        this.elements.searchClear.addEventListener('click', () => {
            this.clearFileSearch();
        });

        // Tab functionality
        this.setupTabNavigation();

        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        // Restore saved tab state
        this.restoreActiveTab();

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                this.switchToTab(targetTab);
            });
        });
    }

    switchToTab(targetTab) {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        // Remove active class from all buttons and contents
        tabButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked button and corresponding content
        const targetButton = document.querySelector(`[data-tab="${targetTab}"]`);
        const targetContent = document.getElementById(`${targetTab}TabContent`);
        
        if (targetButton && targetContent) {
            targetButton.classList.add('active');
            targetContent.classList.add('active');
            
            // Save active tab to localStorage
            localStorage.setItem('activeTab', targetTab);
        }
    }

    restoreActiveTab() {
        const savedTab = localStorage.getItem('activeTab');
        if (savedTab) {
            // Check if the saved tab exists
            const savedTabButton = document.querySelector(`[data-tab="${savedTab}"]`);
            if (savedTabButton) {
                this.switchToTab(savedTab);
                return;
            }
        }
        
        // If no saved tab or saved tab doesn't exist, set recommendations as default
        this.switchToTab('recommendations');
    }

    setupMobileNavigation() {
        this.setupSwipeGestures();
        this.updateMobileNavigation('editor');
    }

    setupSwipeGestures() {
        let startX = 0;
        let startY = 0;
        let startTime = 0;
        const minSwipeDistance = 50;
        const maxSwipeTime = 500;
        const maxVerticalDistance = 100;

        const handleTouchStart = (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startTime = Date.now();
        };

        const handleTouchEnd = (e) => {
            if (!e.changedTouches || e.changedTouches.length === 0) return;

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const endTime = Date.now();

            const deltaX = endX - startX;
            const deltaY = endY - startY;
            const deltaTime = endTime - startTime;

            if (Math.abs(deltaX) > minSwipeDistance && 
                Math.abs(deltaY) < maxVerticalDistance && 
                deltaTime < maxSwipeTime) {
                
                if (deltaX > 0) {
                    if (this.currentMobilePanel === 'ai') {
                        this.showMobilePanel('editor');
                    } else {
                        this.showMobilePanel('files');
                    }
                } else {
                    if (this.currentMobilePanel === 'files') {
                        this.showMobilePanel('editor');
                    } else {
                        this.showMobilePanel('ai');
                    }
                }
            }
        };

        const mainContent = document.querySelector('.main-content');
        mainContent.addEventListener('touchstart', handleTouchStart, { passive: true });
        mainContent.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    setupResizeHandles() {
        const savedLeftWidth = localStorage.getItem('fileExplorerWidth');
        const savedRightWidth = localStorage.getItem('aiSidebarWidth');
        
        if (savedLeftWidth) {
            this.elements.fileExplorer.style.width = savedLeftWidth + 'px';
        }
        if (savedRightWidth) {
            this.elements.aiSidebar.style.width = savedRightWidth + 'px';
        }

        this.elements.leftResize.addEventListener('mousedown', (e) => {
            this.startResize(e, 'left');
        });

        this.elements.rightResize.addEventListener('mousedown', (e) => {
            this.startResize(e, 'right');
        });

        document.addEventListener('mousemove', (e) => {
            this.handleResize(e);
        });

        document.addEventListener('mouseup', () => {
            this.stopResize();
        });
    }

    startResize(e, side) {
        this.isResizing = true;
        this.currentResizer = side;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    }

    handleResize(e) {
        if (!this.isResizing) return;

        const mainContent = document.querySelector('.main-content');
        const rect = mainContent.getBoundingClientRect();

        if (this.currentResizer === 'left') {
            const newWidth = Math.max(200, Math.min(500, e.clientX - rect.left));
            this.elements.fileExplorer.style.width = newWidth + 'px';
            localStorage.setItem('fileExplorerWidth', newWidth.toString());
        } else if (this.currentResizer === 'right') {
            const newWidth = Math.max(250, Math.min(600, rect.right - e.clientX));
            this.elements.aiSidebar.style.width = newWidth + 'px';
            localStorage.setItem('aiSidebarWidth', newWidth.toString());
        }
    }

    stopResize() {
        if (this.isResizing) {
            this.isResizing = false;
            this.currentResizer = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    }

    renderFileTree(fileStructure, onFileClick) {
        const fileTree = this.elements.fileTree;
        fileTree.innerHTML = '';

        if (!fileStructure || Object.keys(fileStructure).length === 0) {
            fileTree.innerHTML = '<p class="no-files">No directory selected</p>';
            this.elements.fileSearch.style.display = 'none';
            return;
        }

        this.elements.fileSearch.style.display = 'block';
        const treeHTML = this.renderFileStructure(fileStructure, 0, onFileClick);
        fileTree.innerHTML = treeHTML;
        this.attachFileTreeListeners(onFileClick);

        const searchTerm = this.elements.fileSearchInput.value;
        if (searchTerm) {
            this.handleFileSearch(searchTerm);
        }
    }

    renderFileStructure(structure, level = 0, onFileClick) {
        let html = '';
        
        for (const [name, content] of Object.entries(structure)) {
            if (content._isFile) {
                const icon = this.getFileIcon(name);
                const path = content._path;
                const fileName = name;
                const filePath = level > 0 ? path.substring(0, path.lastIndexOf('/')) : '';
                
                html += `
                    <div class="file-item" data-path="${path}" data-name="${fileName.toLowerCase()}" data-fullpath="${path.toLowerCase()}" style="margin-left: ${level * 20}px;">
                        <span class="file-icon">${icon}</span>
                        <span class="file-name">${fileName}</span>
                        ${filePath ? `<span class="file-path">${filePath}</span>` : ''}
                    </div>
                `;
            } else {
                html += `
                    <div class="file-item directory" data-name="${name.toLowerCase()}" data-fullpath="${name.toLowerCase()}" style="margin-left: ${level * 20}px;">
                        <span class="file-icon">📁</span>
                        <span class="file-name">${name}</span>
                    </div>
                `;
                html += this.renderFileStructure(content, level + 1, onFileClick);
            }
        }
        
        return html;
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            'js': '📄',
            'html': '🌐',
            'css': '🎨',
            'json': '📋',
            'md': '📝',
            'txt': '📄',
            'py': '🐍',
            'java': '☕',
            'cpp': '⚙️',
            'c': '⚙️',
            'php': '🐘',
            'rb': '💎',
            'go': '🐹',
            'rs': '🦀'
        };
        return icons[ext] || '📄';
    }

    attachFileTreeListeners(onFileClick) {
        const fileItems = document.querySelectorAll('.file-item');
        fileItems.forEach(item => {
            item.addEventListener('click', () => {
                if (item.dataset.path) {
                    onFileClick(item.dataset.path);
                }
            });
        });
    }

    handleFileSearch(searchTerm) {
        const fileItems = this.elements.fileTree.querySelectorAll('.file-item');
        const clearBtn = this.elements.searchClear;
        
        if (searchTerm.trim()) {
            clearBtn.classList.add('visible');
        } else {
            clearBtn.classList.remove('visible');
            fileItems.forEach(item => {
                item.classList.remove('filtered');
                this.removeHighlights(item);
            });
            return;
        }

        const searchLower = searchTerm.toLowerCase();
        
        fileItems.forEach(item => {
            const fileName = item.dataset.name || '';
            const fullPath = item.dataset.fullpath || '';
            
            const fileNameMatch = fileName.includes(searchLower);
            const pathMatch = fullPath.includes(searchLower);
            const isMatch = fileNameMatch || pathMatch;
            
            if (isMatch) {
                item.classList.remove('filtered');
                if (fileNameMatch) {
                    this.highlightSearchTerm(item, searchTerm, 'filename');
                } else {
                    this.highlightSearchTerm(item, searchTerm, 'path');
                }
            } else {
                item.classList.add('filtered');
                this.removeHighlights(item);
            }
        });
    }

    highlightSearchTerm(item, searchTerm, highlightType = 'filename') {
        const searchLower = searchTerm.toLowerCase();
        
        if (highlightType === 'filename') {
            const fileNameSpan = item.querySelector('.file-name');
            if (!fileNameSpan) return;
            
            const originalText = fileNameSpan.textContent;
            const originalLower = originalText.toLowerCase();
            
            if (originalLower.includes(searchLower)) {
                const startIndex = originalLower.indexOf(searchLower);
                const endIndex = startIndex + searchTerm.length;
                
                const before = originalText.substring(0, startIndex);
                const match = originalText.substring(startIndex, endIndex);
                const after = originalText.substring(endIndex);
                
                fileNameSpan.innerHTML = `${before}<span class="search-highlight">${match}</span>${after}`;
            }
        } else if (highlightType === 'path') {
            const filePathSpan = item.querySelector('.file-path');
            if (!filePathSpan) return;
            
            const originalText = filePathSpan.textContent;
            const originalLower = originalText.toLowerCase();
            
            if (originalLower.includes(searchLower)) {
                const startIndex = originalLower.indexOf(searchLower);
                const endIndex = startIndex + searchTerm.length;
                
                const before = originalText.substring(0, startIndex);
                const match = originalText.substring(startIndex, endIndex);
                const after = originalText.substring(endIndex);
                
                filePathSpan.innerHTML = `${before}<span class="search-highlight">${match}</span>${after}`;
            }
        }
    }

    removeHighlights(item) {
        const fileNameSpan = item.querySelector('.file-name');
        if (fileNameSpan) {
            const highlightSpan = fileNameSpan.querySelector('.search-highlight');
            if (highlightSpan) {
                fileNameSpan.textContent = fileNameSpan.textContent;
            }
        }
        
        const filePathSpan = item.querySelector('.file-path');
        if (filePathSpan) {
            const highlightSpan = filePathSpan.querySelector('.search-highlight');
            if (highlightSpan) {
                filePathSpan.textContent = filePathSpan.textContent;
            }
        }
    }

    clearFileSearch() {
        this.elements.fileSearchInput.value = '';
        this.handleFileSearch('');
        this.elements.fileSearchInput.focus();
    }

    updateActiveFileInTree(filePath) {
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-path="${filePath}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    showMobilePanel(panel) {
        this.elements.fileExplorer.classList.remove('active');
        this.elements.aiSidebar.classList.remove('active');
        
        if (panel === 'files') {
            this.elements.fileExplorer.classList.add('active');
        } else if (panel === 'ai') {
            this.elements.aiSidebar.classList.add('active');
        }
        
        this.currentMobilePanel = panel;
        this.updateMobileNavigation(panel);
    }

    updateMobileNavigation(activePanel) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (activePanel === 'files') {
            this.elements.filesNavBtn.classList.add('active');
        } else if (activePanel === 'ai') {
            this.elements.aiNavBtn.classList.add('active');
        } else {
            this.elements.editorNavBtn.classList.add('active');
        }
    }

    closePanel(panelId) {
        const panel = document.getElementById(panelId);
        panel.classList.remove('active');
        this.currentMobilePanel = 'editor';
        this.updateMobileNavigation('editor');
    }

    handleKeyboardShortcuts(event, callbacks) {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
            event.preventDefault();
            callbacks.save();
        } else if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            callbacks.newFile();
        } else if (event.key === 'Escape') {
            this.elements.fileExplorer.classList.remove('active');
            this.elements.aiSidebar.classList.remove('active');
            this.currentMobilePanel = 'editor';
            this.updateMobileNavigation('editor');
        }
    }

    showLoading(show) {
        this.elements.loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    displayRecommendations(data) {
        // This method now only handles final completion signal
        // Individual placeholders are handled directly by AIService
        
        if (!data.isComplete) {
            // Don't do anything for non-complete updates
            return;
        }
        
        // Clean up any progress indicators
        const container = this.elements.recommendationsContainer;
        const progressIndicator = container.querySelector('.analysis-progress');
        if (progressIndicator) {
            setTimeout(() => {
                if (progressIndicator && progressIndicator.parentNode) {
                    progressIndicator.remove();
                }
            }, 1000);
        }
    }

    showRecommendationError(message) {
        const container = this.elements.recommendationsContainer;
        
        // Clear any existing content including initial placeholder
        const initialPlaceholder = document.getElementById('initialPlaceholder');
        if (initialPlaceholder) {
            initialPlaceholder.remove();
        }
        
        container.innerHTML = `
            <div class="recommendation-item error">
                <h4>⚠️ Connection Issue</h4>
                <p>${message}</p>
                <p><small>Please check your internet connection and try again.</small></p>
            </div>
        `;
    }

    restoreInitialPlaceholder() {
        const container = this.elements.recommendationsContainer;
        // Only restore if container is empty or only has error messages
        if (container.children.length === 0 || container.querySelector('.error')) {
            container.innerHTML = `
                <div class="recommendation-item placeholder-message" id="initialPlaceholder">
                    <h4>🤖 AI Assistant</h4>
                    <p>Open a file or start typing to get AI-powered writing suggestions.</p>
                    <p><small>The AI will analyze your text and provide recommendations for style, grammar, structure, and more.</small></p>
                </div>
            `;
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
}