class SessionManager {
    constructor() {
        this.currentSessionId = this.generateSessionId();
        this.sessionStartTime = new Date().toISOString();
        
        console.log('New editing session started:', this.currentSessionId);
    }

    generateSessionId() {
        // Generate a unique session ID based on timestamp and random components
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `session_${timestamp}_${random}`;
    }

    getCurrentSessionId() {
        return this.currentSessionId;
    }

    getSessionStartTime() {
        return this.sessionStartTime;
    }

    getSessionInfo() {
        return {
            sessionId: this.currentSessionId,
            startTime: this.sessionStartTime,
            duration: Date.now() - new Date(this.sessionStartTime).getTime()
        };
    }

    // Optional: Method to manually start a new session (e.g., for "New Session" button)
    startNewSession() {
        this.currentSessionId = this.generateSessionId();
        this.sessionStartTime = new Date().toISOString();
        console.log('New editing session started:', this.currentSessionId);
        return this.currentSessionId;
    }
}