class NotificationManager {
    constructor() {
        this.notifications = [];
    }

    show(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 1001;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            background-color: ${this.getBackgroundColor(type)};
            max-width: 400px;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(notification);
        this.notifications.push(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            this.remove(notification);
        }, duration);
        
        return notification;
    }

    remove(notification) {
        if (!notification.parentNode) return;
        
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications = this.notifications.filter(n => n !== notification);
        }, 300);
    }

    getBackgroundColor(type) {
        const colors = {
            'success': '#10b981',
            'error': '#ef4444',
            'warning': '#f59e0b',
            'info': '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    clear() {
        this.notifications.forEach(notification => {
            this.remove(notification);
        });
    }

    stack(messages, type = 'info', duration = 3000) {
        const delay = 200;
        messages.forEach((message, index) => {
            setTimeout(() => {
                this.show(message, type, duration);
            }, index * delay);
        });
    }

    confirm(message, onConfirm, onCancel) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1002;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;

        const messageEl = document.createElement('p');
        messageEl.textContent = message;
        messageEl.style.marginBottom = '20px';

        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: center;
        `;

        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = 'Confirm';
        confirmBtn.style.cssText = `
            padding: 8px 16px;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            padding: 8px 16px;
            background: #6b7280;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;

        confirmBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            if (onConfirm) onConfirm();
        });

        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
            if (onCancel) onCancel();
        });

        buttonsContainer.appendChild(confirmBtn);
        buttonsContainer.appendChild(cancelBtn);
        dialog.appendChild(messageEl);
        dialog.appendChild(buttonsContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        return overlay;
    }
}