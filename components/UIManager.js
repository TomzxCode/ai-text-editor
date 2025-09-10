class UIManager {
    constructor(elements) {
        this.elements = elements;
        this.currentMobilePanel = 'editor';
        this.isResizing = false;
        this.currentResizer = null;
        this.snapThreshold = 50; // pixels from edge to snap to hidden
        this.minWidth = 200; // minimum width before snapping
        
        // Feedback filtering state
        this.isFilteringFeedback = false;
        this.currentHoveredContentId = null;
        this.showAllItemsEnabled = true;
        this.allFeedbackItems = [];
        
        this.setupEventListeners();
        this.setupMobileNavigation();
        this.setupResizeHandles();
        this.createFeedbackFooter();
    }

    setupEventListeners() {
        this.elements.closeExplorer.addEventListener('click', () => {
            this.closePanel('fileExplorer');
        });

        this.elements.closeSidebar.addEventListener('click', () => {
            this.closePanel('aiSidebar');
        });

        // Setup pull tab event listeners
        const leftPullTab = document.getElementById('leftPullTab');
        const rightPullTab = document.getElementById('rightPullTab');
        
        if (leftPullTab) {
            leftPullTab.addEventListener('mousedown', (e) => {
                this.startPullTab(e, 'left');
            });
        }
        
        if (rightPullTab) {
            rightPullTab.addEventListener('mousedown', (e) => {
                this.startPullTab(e, 'right');
            });
        }

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
        
        // Initialize sidebar state
        this.restoreSidebarStates();

        // Set up feedback association listeners
        this.setupFeedbackAssociationListeners();
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
        
        // If no saved tab or saved tab doesn't exist, set feedback as default
        this.switchToTab('feedback');
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
            const newWidth = e.clientX - rect.left;
            
            if (newWidth < this.snapThreshold) {
                // Snap to hidden
                this.hideSidebar('left');
            } else {
                const clampedWidth = Math.max(this.minWidth, Math.min(500, newWidth));
                this.elements.fileExplorer.style.width = clampedWidth + 'px';
                localStorage.setItem('fileExplorerWidth', clampedWidth.toString());
                this.showSidebar('left');
            }
        } else if (this.currentResizer === 'right') {
            const newWidth = rect.right - e.clientX;
            
            if (newWidth < this.snapThreshold) {
                // Snap to hidden
                this.hideSidebar('right');
            } else {
                const clampedWidth = Math.max(250, Math.min(600, newWidth));
                this.elements.aiSidebar.style.width = clampedWidth + 'px';
                localStorage.setItem('aiSidebarWidth', clampedWidth.toString());
                this.showSidebar('right');
            }
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

    displayFeedback(data) {
        // This method now only handles final completion signal
        // Individual placeholders are handled directly by AIService
        
        if (!data.isComplete) {
            // Don't do anything for non-complete updates
            return;
        }
        
        // Clean up any progress indicators
        const container = this.elements.feedbackContainer;
        const progressIndicator = container.querySelector('.analysis-progress');
        if (progressIndicator) {
            setTimeout(() => {
                if (progressIndicator && progressIndicator.parentNode) {
                    progressIndicator.remove();
                }
            }, 1000);
        }

        // Update hover highlighting system
        this.updateHoverHighlighting();
    }

    showFeedbackError(message) {
        const container = this.elements.feedbackContainer;
        
        // Clear any existing content including initial placeholder
        const initialPlaceholder = document.getElementById('initialPlaceholder');
        if (initialPlaceholder) {
            initialPlaceholder.remove();
        }
        
        container.innerHTML = `
            <div class="feedback-item error">
                <h4>⚠️ Connection Issue</h4>
                <p>${message}</p>
                <p><small>Please check your internet connection and try again.</small></p>
            </div>
        `;
    }

    restoreInitialPlaceholder() {
        const container = this.elements.feedbackContainer;
        // Only restore if container is empty or only has error messages
        if (container.children.length === 0 || container.querySelector('.error')) {
            container.innerHTML = `
                <div class="feedback-item placeholder-message" id="initialPlaceholder">
                    <h4>🤖 AI Assistant</h4>
                    <p>Open a file or start typing to get AI-powered writing suggestions.</p>
                    <p><small>The AI will analyze your text and provide feedback for style, grammar, structure, and more.</small></p>
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

    hideSidebar(side) {
        const leftPullTab = document.getElementById('leftPullTab');
        const rightPullTab = document.getElementById('rightPullTab');
        
        if (side === 'left') {
            this.elements.fileExplorer.classList.add('hidden');
            this.elements.leftResize.classList.add('hidden');
            leftPullTab.classList.remove('hidden');
            localStorage.setItem('leftSidebarVisible', 'false');
        } else if (side === 'right') {
            this.elements.aiSidebar.classList.add('hidden');
            this.elements.rightResize.classList.add('hidden');
            rightPullTab.classList.remove('hidden');
            localStorage.setItem('rightSidebarVisible', 'false');
        }
    }

    showSidebar(side) {
        const leftPullTab = document.getElementById('leftPullTab');
        const rightPullTab = document.getElementById('rightPullTab');
        
        if (side === 'left') {
            this.elements.fileExplorer.classList.remove('hidden');
            this.elements.leftResize.classList.remove('hidden');
            leftPullTab.classList.add('hidden');
            localStorage.setItem('leftSidebarVisible', 'true');
        } else if (side === 'right') {
            this.elements.aiSidebar.classList.remove('hidden');
            this.elements.rightResize.classList.remove('hidden');
            rightPullTab.classList.add('hidden');
            localStorage.setItem('rightSidebarVisible', 'true');
        }
    }

    startPullTab(e, side) {
        this.isResizing = true;
        this.currentResizer = side;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
        
        // Show sidebar immediately when starting to pull
        this.showSidebar(side);
        
        // Set initial width for smooth transition
        if (side === 'left') {
            const savedWidth = localStorage.getItem('fileExplorerWidth') || '250';
            this.elements.fileExplorer.style.width = savedWidth + 'px';
        } else if (side === 'right') {
            const savedWidth = localStorage.getItem('aiSidebarWidth') || '300';
            this.elements.aiSidebar.style.width = savedWidth + 'px';
        }
    }

    restoreSidebarStates() {
        const leftVisible = localStorage.getItem('leftSidebarVisible');
        const rightVisible = localStorage.getItem('rightSidebarVisible');
        
        // Default to visible if no preference is stored
        if (leftVisible === 'false') {
            this.hideSidebar('left');
        } else {
            this.showSidebar('left');
        }

        if (rightVisible === 'false') {
            this.hideSidebar('right');
        } else {
            this.showSidebar('right');
        }
    }

    /**
     * Updates the hover highlighting system for content-feedback associations
     */
    updateHoverHighlighting() {
        // Store current feedback items for filtering
        this.storeFeedbackItems();
        
        // Set up hover event listeners for all feedback items
        // This will be called after feedback items are added to the DOM
        setTimeout(() => {
            this.setupHoverEventListeners();
        }, 100);
    }

    /**
     * Sets up hover event listeners for bidirectional highlighting
     */
    setupHoverEventListeners() {
        // Clear any existing listeners to avoid duplicates
        this.clearHoverEventListeners();

        // Set up feedback item hover listeners - check for items with association data
        const feedbackItems = document.querySelectorAll('.feedback-item[data-content-id]');
        console.log('Found feedback items with data-content-id:', feedbackItems.length);
        
        feedbackItems.forEach(item => {
            console.log('Setting up hover for item:', {
                contentId: item.dataset.contentId,
                contentType: item.dataset.contentType,
                associatedContent: item.dataset.associatedContent
            });
            
            const hoverHandler = (e) => this.handleFeedbackItemHover(e, item);
            const leaveHandler = (e) => this.handleFeedbackItemLeave(e, item);
            
            item.addEventListener('mouseenter', hoverHandler);
            item.addEventListener('mouseleave', leaveHandler);
            
            // Store handlers for cleanup
            item._hoverHandler = hoverHandler;
            item._leaveHandler = leaveHandler;
        });

        // Set up editor content hover listeners
        this.setupEditorHoverListeners();
    }

    /**
     * Clears existing hover event listeners
     */
    clearHoverEventListeners() {
        const feedbackItems = document.querySelectorAll('.feedback-item');
        feedbackItems.forEach(item => {
            if (item._hoverHandler) {
                item.removeEventListener('mouseenter', item._hoverHandler);
                item.removeEventListener('mouseleave', item._leaveHandler);
                delete item._hoverHandler;
                delete item._leaveHandler;
            }
        });
    }

    /**
     * Handles hovering over a feedback item
     */
    handleFeedbackItemHover(event, feedbackItem) {
        const contentId = feedbackItem.dataset.contentId;
        const contentType = feedbackItem.dataset.contentType;
        const associatedContent = feedbackItem.dataset.associatedContent;
        
        console.log('Feedback item hover:', {
            contentId,
            contentType, 
            associatedContent
        });
        
        if (!contentId || !associatedContent) {
            console.log('Missing content data for hover');
            return;
        }

        // Add visual indicator to feedback item
        feedbackItem.classList.add('feedback-item-highlighted');
        
        // Highlight the associated content in the editor
        this.highlightContentInEditor(associatedContent, contentType, contentId);
    }

    /**
     * Handles leaving hover on a feedback item
     */
    handleFeedbackItemLeave(event, feedbackItem) {
        const contentId = feedbackItem.dataset.contentId;
        
        // Remove visual indicator from feedback item
        feedbackItem.classList.remove('feedback-item-highlighted');
        
        // Remove content highlighting in editor
        this.removeContentHighlightInEditor(contentId);
    }

    /**
     * Sets up editor hover listeners to highlight feedback when hovering over content
     */
    setupEditorHoverListeners() {
        const editorManager = window.app?.editorManager;
        if (!editorManager || !editorManager.editor) {
            console.log('EditorManager or editor not available');
            return;
        }

        // Get CodeMirror instance
        const editor = editorManager.editor;
        
        // Set up mouseover event on editor
        const editorElement = editor.getWrapperElement();
        
        // Clear existing editor listeners first
        if (editorElement._editorHoverHandler) {
            editorElement.removeEventListener('mousemove', editorElement._editorHoverHandler);
            editorElement.removeEventListener('mouseleave', editorElement._editorLeaveHandler);
        }
        
        const hoverHandler = (e) => this.handleEditorHover(e, editor);
        const leaveHandler = (e) => this.handleEditorLeave(e, editor);
        
        editorElement.addEventListener('mousemove', hoverHandler);
        editorElement.addEventListener('mouseleave', leaveHandler);
        
        // Store handlers for cleanup
        editorElement._editorHoverHandler = hoverHandler;
        editorElement._editorLeaveHandler = leaveHandler;
        
        console.log('Editor hover listeners set up');
    }

    /**
     * Handles hovering over content in the editor
     */
    handleEditorHover(event, editor) {
        const pos = editor.coordsChar({ left: event.clientX, top: event.clientY });
        const textAnalysisManager = window.app?.textAnalysisManager;
        
        if (!textAnalysisManager) return;
        
        const feedbackAssociationManager = textAnalysisManager.getFeedbackAssociationManager();
        if (!feedbackAssociationManager) return;

        // Find content association at this position
        const associations = feedbackAssociationManager.getAllContentAssociations();
        const hoveredAssociation = this.findAssociationAtPosition(pos, associations, editor);
        
        if (hoveredAssociation && hoveredAssociation.contentId !== this.currentHoveredContentId) {
            // Clear previous highlighting
            if (this.currentHoveredContentId) {
                this.removeAllHighlighting();
            }
            
            this.currentHoveredContentId = hoveredAssociation.contentId;
            this.currentHoveredAssociation = hoveredAssociation;
            
            // Highlight associated feedback items
            this.highlightAssociatedFeedbackItems(hoveredAssociation.contentId);
            
            // Filter feedback items if not showing all
            if (!this.showAllItemsEnabled) {
                this.filterFeedbackItems(hoveredAssociation.contentId);
            }
        } else if (!hoveredAssociation && this.currentHoveredContentId) {
            // Mouse moved to area without content associations
            this.clearHoverState();
        }
    }

    /**
     * Handles leaving hover on editor
     */
    handleEditorLeave(event, editor) {
        this.clearHoverState();
    }

    /**
     * Finds content association at a specific editor position
     */
    findAssociationAtPosition(pos, associations, editor) {
        const line = pos.line;
        const ch = pos.ch;
        const currentText = editor.getValue();
        
        // Calculate absolute position in text
        const lines = currentText.split('\n');
        let absolutePos = 0;
        for (let i = 0; i < line; i++) {
            absolutePos += lines[i].length + 1; // +1 for newline
        }
        absolutePos += ch;
        
        // Find association that contains this position
        return associations.find(association => {
            const pos = association.position;
            return pos && absolutePos >= pos.start && absolutePos <= pos.end;
        });
    }

    /**
     * Highlights content in the editor
     */
    highlightContentInEditor(content, contentType, contentId) {
        console.log('Highlighting content in editor:', {
            content,
            contentType,
            contentId
        });
        
        const editorManager = window.app?.editorManager;
        if (!editorManager || !editorManager.editor) {
            console.log('Editor not available for highlighting');
            return;
        }

        const editor = editorManager.editor;
        const currentText = editor.getValue();
        
        console.log('Current text length:', currentText.length);
        console.log('Looking for content:', content);
        
        // Find the content in the current text
        const startIndex = currentText.lastIndexOf(content);
        console.log('Found content at index:', startIndex);
        
        if (startIndex === -1) {
            console.log('Content not found in editor text');
            return;
        }
        
        const endIndex = startIndex + content.length;
        
        // Convert to CodeMirror position
        const startPos = editor.posFromIndex(startIndex);
        const endPos = editor.posFromIndex(endIndex);
        
        console.log('CodeMirror positions:', { startPos, endPos });
        
        // Create text marker for highlighting
        const marker = editor.markText(startPos, endPos, {
            className: `content-highlight content-highlight-${contentType}`,
            title: `Associated with feedback (${contentType})`
        });
        
        console.log('Created marker:', marker);
        
        // Store marker for cleanup
        this.contentHighlightMarkers = this.contentHighlightMarkers || new Map();
        this.contentHighlightMarkers.set(contentId, marker);
    }

    /**
     * Removes content highlighting in editor
     */
    removeContentHighlightInEditor(contentId) {
        if (!this.contentHighlightMarkers) return;
        
        const marker = this.contentHighlightMarkers.get(contentId);
        if (marker) {
            marker.clear();
            this.contentHighlightMarkers.delete(contentId);
        }
    }

    /**
     * Highlights feedback items associated with content
     */
    highlightAssociatedFeedbackItems(contentId) {
        const feedbackItems = document.querySelectorAll(`.feedback-item[data-content-id="${contentId}"]`);
        feedbackItems.forEach(item => {
            item.classList.add('feedback-item-highlighted');
        });
    }

    /**
     * Removes all highlighting
     */
    removeAllHighlighting() {
        // Remove feedback item highlighting
        const highlightedItems = document.querySelectorAll('.feedback-item-highlighted');
        highlightedItems.forEach(item => {
            item.classList.remove('feedback-item-highlighted');
        });
        
        // Remove editor content highlighting
        if (this.contentHighlightMarkers) {
            this.contentHighlightMarkers.forEach(marker => marker.clear());
            this.contentHighlightMarkers.clear();
        }
    }


    /**
     * Escapes HTML content for safe display
     */
    escapeHTML(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Sets up listeners for feedback association changes
     */
    setupFeedbackAssociationListeners() {
        // Wait for the app to be initialized
        const checkForApp = () => {
            if (window.app && window.app.textAnalysisManager) {
                const feedbackAssociationManager = window.app.textAnalysisManager.getFeedbackAssociationManager();
                if (feedbackAssociationManager) {
                    // Listen for content changes
                    feedbackAssociationManager.onContentChange((changeType, data) => {
                        this.handleFeedbackAssociationChange(changeType, data);
                    });
                } else {
                    // Try again in 100ms
                    setTimeout(checkForApp, 100);
                }
            } else {
                // Try again in 100ms
                setTimeout(checkForApp, 100);
            }
        };

        // Start checking
        setTimeout(checkForApp, 100);
    }

    /**
     * Handles feedback association changes
     */
    handleFeedbackAssociationChange(changeType, data) {
        switch (changeType) {
            case 'feedbackAdded':
            case 'feedbackRemoved':
            case 'contentRemoved':
                // Update hover highlighting system when associations change
                this.updateHoverHighlighting();
                break;
            case 'cleanup':
                // Remove feedback items from DOM when content is deleted
                if (data.feedbackItemsToRemove) {
                    this.removeFeedbackItemsFromDOM(data.feedbackItemsToRemove);
                }
                // Update hover highlighting system when associations change
                this.updateHoverHighlighting();
                break;
            case 'reset':
                // Clear all highlighting when associations are reset
                this.removeAllHighlighting();
                this.clearHoverEventListeners();
                break;
            case 'imported':
                // Update highlighting after import
                this.updateHoverHighlighting();
                break;
        }
    }

    /**
     * Removes feedback items from the DOM when their associated content is deleted
     * @param {Array} feedbackItemsToRemove - Array of feedback items to remove
     */
    removeFeedbackItemsFromDOM(feedbackItemsToRemove) {
        feedbackItemsToRemove.forEach(item => {
            console.log('Removing feedback item from DOM:', item);
            
            // Find feedback items by data attribute
            const feedbackElements = document.querySelectorAll(`[data-feedback-id="${item.feedbackId}"]`);
            
            if (feedbackElements.length === 0) {
                // Try to find by content ID and prompt name combination
                const alternativeFeedbackElements = document.querySelectorAll(`[data-content-id="${item.contentId}"]`);
                alternativeFeedbackElements.forEach(element => {
                    const heading = element.querySelector('h4');
                    if (heading && heading.textContent.includes(item.promptName)) {
                        this.removeFeedbackElement(element, item);
                    }
                });
            } else {
                // Remove all matching elements
                feedbackElements.forEach(element => {
                    this.removeFeedbackElement(element, item);
                });
            }
        });
    }

    /**
     * Removes a single feedback element from the DOM with animation
     * @param {Element} element - The feedback element to remove
     * @param {Object} itemInfo - Information about the item being removed
     */
    removeFeedbackElement(element, itemInfo) {
        console.log(`Removing feedback for deleted content: "${itemInfo.content}" (${itemInfo.promptName})`);
        
        // Add removal animation
        element.style.transition = 'all 0.3s ease';
        element.style.opacity = '0';
        element.style.transform = 'translateX(-20px)';
        element.style.maxHeight = '0';
        element.style.marginBottom = '0';
        element.style.padding = '0';
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
                console.log('Feedback item removed from DOM');
            }
        }, 300);
    }

    /**
     * Creates the feedback footer with show all items checkbox
     */
    createFeedbackFooter() {
        // Only create footer if it doesn't already exist
        if (document.getElementById('feedbackFooter')) return;
        
        const feedbackTabContent = document.getElementById('feedbackTabContent');
        if (!feedbackTabContent) return;
        
        const footer = document.createElement('div');
        footer.id = 'feedbackFooter';
        footer.className = 'feedback-footer';
        footer.innerHTML = `
            <div class="feedback-footer-content">
                <label class="checkbox-label">
                    <input type="checkbox" id="showAllItemsCheckbox" checked>
                    <span class="checkbox-text">Show all items</span>
                </label>
            </div>
        `;
        
        feedbackTabContent.appendChild(footer);
        
        // Add event listener to checkbox
        const checkbox = footer.querySelector('#showAllItemsCheckbox');
        checkbox.addEventListener('change', (e) => {
            this.handleShowAllItemsToggle(e.target.checked);
        });
    }

    /**
     * Handles the show all items checkbox toggle
     * @param {boolean} showAll - Whether to show all items or filter
     */
    handleShowAllItemsToggle(showAll) {
        this.showAllItemsEnabled = showAll;
        
        if (showAll) {
            // Show all feedback items
            this.restoreAllFeedbackItems();
        } else {
            // If currently hovering over content, filter to that content
            if (this.currentHoveredContentId) {
                this.filterFeedbackItems(this.currentHoveredContentId);
            } else {
                // No content currently hovered, show all but mark as filtered mode
                this.restoreAllFeedbackItems();
            }
        }
    }

    /**
     * Stores current feedback items for later restoration
     */
    storeFeedbackItems() {
        const container = this.elements.feedbackContainer;
        if (!container) return;
        
        this.allFeedbackItems = Array.from(container.querySelectorAll('.feedback-item:not(.placeholder-message)'));
    }

    /**
     * Filters feedback items to show only those associated with the given content ID
     * @param {string} contentId - The content ID to filter by
     */
    filterFeedbackItems(contentId) {
        const container = this.elements.feedbackContainer;
        if (!container) return;
        
        const allItems = container.querySelectorAll('.feedback-item:not(.placeholder-message)');
        let visibleCount = 0;
        
        allItems.forEach(item => {
            const itemContentId = item.dataset.contentId;
            if (itemContentId === contentId) {
                // Show items associated with this content
                item.style.display = '';
                item.classList.add('feedback-item-filtered');
                visibleCount++;
            } else {
                // Hide other items
                item.style.display = 'none';
                item.classList.remove('feedback-item-filtered');
            }
        });
        
        // Show placeholder if no items are visible
        this.togglePlaceholder(visibleCount === 0);
    }

    /**
     * Restores all feedback items to visible state
     */
    restoreAllFeedbackItems() {
        const container = this.elements.feedbackContainer;
        if (!container) return;
        
        const allItems = container.querySelectorAll('.feedback-item:not(.placeholder-message)');
        
        allItems.forEach(item => {
            item.style.display = '';
            item.classList.remove('feedback-item-filtered');
        });
        
        // Hide placeholder when showing all items
        this.togglePlaceholder(allItems.length === 0);
    }

    /**
     * Clears hover state and restores normal display
     */
    clearHoverState() {
        this.removeAllHighlighting();
        this.currentHoveredAssociation = null;
        this.currentHoveredContentId = null;
        
        // If in show all mode, restore all items
        if (this.showAllItemsEnabled) {
            this.restoreAllFeedbackItems();
        }
    }

    /**
     * Toggles the visibility of the placeholder message
     * @param {boolean} show - Whether to show the placeholder
     */
    togglePlaceholder(show) {
        const container = this.elements.feedbackContainer;
        if (!container) return;
        
        let placeholder = container.querySelector('.placeholder-message');
        
        if (show) {
            // Show placeholder if it doesn't exist or is hidden
            if (!placeholder) {
                // Create placeholder if it doesn't exist
                placeholder = document.createElement('div');
                placeholder.className = 'feedback-item placeholder-message';
                placeholder.id = 'dynamicPlaceholder';
                placeholder.innerHTML = `
                    <h4>🤖 AI Assistant</h4>
                    <p>Open a file or start typing to get AI-powered writing suggestions.</p>
                    <p><small>The AI will analyze your text and provide feedback for style, grammar, structure, and more.</small></p>
                `;
                // Insert at the beginning of the container, before the footer
                const footer = container.querySelector('.feedback-footer');
                if (footer) {
                    container.insertBefore(placeholder, footer);
                } else {
                    container.appendChild(placeholder);
                }
            }
            placeholder.style.display = '';
        } else {
            // Hide placeholder
            if (placeholder) {
                placeholder.style.display = 'none';
            }
        }
    }
}