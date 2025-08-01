// Bulk SMS Broadcasting App JavaScript

class SMSApp {
    constructor() {
        this.form = document.getElementById('smsForm');
        this.messageInput = document.getElementById('message');
        this.phoneNumbersInput = document.getElementById('phone_numbers');
        this.csvFileInput = document.getElementById('csv_file');
        this.sendBtn = document.getElementById('sendBtn');
        this.progressSection = document.getElementById('progressSection');
        this.resultsSection = document.getElementById('resultsSection');
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.updateCounters();
    }
    
    bindEvents() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Message input events
        this.messageInput.addEventListener('input', () => this.updateMessageCounter());
        this.messageInput.addEventListener('keyup', () => this.updateMessageCounter());
        
        // Phone numbers input events
        this.phoneNumbersInput.addEventListener('input', () => this.updatePhoneCounter());
        this.phoneNumbersInput.addEventListener('keyup', () => this.updatePhoneCounter());
        
        // CSV file input
        this.csvFileInput.addEventListener('change', () => this.handleCSVUpload());
    }
    
    updateMessageCounter() {
        const message = this.messageInput.value;
        const charCount = message.length;
        const smsCount = this.calculateSMSParts(message);
        
        // Update character count
        const charCountElement = document.getElementById('charCount');
        charCountElement.textContent = charCount;
        
        // Update SMS parts count
        document.getElementById('smsCount').textContent = smsCount;
        
        // Color coding for character count
        charCountElement.className = '';
        if (charCount > 1400) {
            charCountElement.classList.add('char-danger');
        } else if (charCount > 1200) {
            charCountElement.classList.add('char-warning');
        }
    }
    
    updatePhoneCounter() {
        const phoneNumbers = this.getPhoneNumbers();
        const totalCount = phoneNumbers.length;
        const validCount = phoneNumbers.filter(num => this.isValidPhoneNumber(num)).length;
        const invalidCount = totalCount - validCount;
        
        document.getElementById('phoneCount').textContent = totalCount;
        document.getElementById('validCount').textContent = validCount;
        document.getElementById('invalidCount').textContent = invalidCount;
    }
    
    updateCounters() {
        this.updateMessageCounter();
        this.updatePhoneCounter();
    }
    
    getPhoneNumbers() {
        const text = this.phoneNumbersInput.value.trim();
        if (!text) return [];
        
        return text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
    }
    
    isValidPhoneNumber(phoneNumber) {
        // Basic validation for Ghana phone numbers
        const cleaned = phoneNumber.replace(/[^\d+]/g, '');
        const ghanaPattern = /^\+233[2-5]\d{8}$|^233[2-5]\d{8}$|^0[2-5]\d{8}$|^[2-5]\d{8}$/;
        return ghanaPattern.test(cleaned);
    }
    
    calculateSMSParts(message) {
        if (!message) return 0;
        
        // Check if message contains non-GSM characters
        const gsmChars = /^[@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà\n\r\t]*$/;
        
        const isUnicode = !gsmChars.test(message);
        const maxCharsPerSMS = isUnicode ? 70 : 160;
        
        return Math.ceil(message.length / maxCharsPerSMS);
    }
    
    handleCSVUpload() {
        const file = this.csvFileInput.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvContent = e.target.result;
                const phoneNumbers = this.parseCSVContent(csvContent);
                
                if (phoneNumbers.length > 0) {
                    // Add to existing phone numbers
                    const currentNumbers = this.phoneNumbersInput.value.trim();
                    const newNumbers = phoneNumbers.join('\n');
                    
                    this.phoneNumbersInput.value = currentNumbers 
                        ? currentNumbers + '\n' + newNumbers 
                        : newNumbers;
                    
                    this.updatePhoneCounter();
                    this.showAlert('success', `Successfully loaded ${phoneNumbers.length} phone numbers from CSV file.`);
                } else {
                    this.showAlert('warning', 'No valid phone numbers found in the CSV file.');
                }
            } catch (error) {
                this.showAlert('danger', 'Error reading CSV file: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    }
    
    parseCSVContent(csvContent) {
        const phoneNumbers = [];
        const lines = csvContent.split('\n');
        
        for (const line of lines) {
            const cells = line.split(',').map(cell => cell.trim().replace(/"/g, ''));
            
            for (const cell of cells) {
                if (cell && this.looksLikePhoneNumber(cell)) {
                    phoneNumbers.push(cell);
                    break; // Only take first valid phone number per row
                }
            }
        }
        
        return phoneNumbers;
    }
    
    looksLikePhoneNumber(text) {
        const cleaned = text.replace(/[^\d+]/g, '');
        return cleaned.length >= 9 && cleaned.length <= 15;
    }
    
    async handleSubmit(e) {
        e.preventDefault();
        
        // Validate form
        if (!this.validateForm()) {
            return;
        }
        
        // Show progress
        this.showProgress();
        
        try {
            const formData = new FormData(this.form);
            
            const response = await fetch('/send_sms', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showResults(result);
            } else {
                this.showAlert('danger', result.error || 'An error occurred while sending SMS messages.');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showAlert('danger', 'Network error: ' + error.message);
        } finally {
            this.hideProgress();
        }
    }
    
    validateForm() {
        const message = this.messageInput.value.trim();
        const phoneNumbers = this.getPhoneNumbers();
        
        // Validate message
        if (!message) {
            this.showAlert('warning', 'Please enter a message to send.');
            this.messageInput.focus();
            return false;
        }
        
        if (message.length > 1600) {
            this.showAlert('warning', 'Message is too long. Maximum 1600 characters allowed.');
            this.messageInput.focus();
            return false;
        }
        
        // Validate phone numbers
        if (phoneNumbers.length === 0 && !this.csvFileInput.files[0]) {
            this.showAlert('warning', 'Please enter phone numbers or upload a CSV file.');
            this.phoneNumbersInput.focus();
            return false;
        }
        
        if (phoneNumbers.length > 300) {
            this.showAlert('warning', 'Maximum 300 phone numbers allowed.');
            this.phoneNumbersInput.focus();
            return false;
        }
        
        const validNumbers = phoneNumbers.filter(num => this.isValidPhoneNumber(num));
        if (phoneNumbers.length > 0 && validNumbers.length === 0) {
            this.showAlert('warning', 'No valid phone numbers found. Please check the format.');
            this.phoneNumbersInput.focus();
            return false;
        }
        
        return true;
    }
    
    showProgress() {
        this.sendBtn.disabled = true;
        this.sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending Messages...';
        
        this.progressSection.classList.remove('d-none');
        this.progressSection.classList.add('fadeIn');
        
        // Simulate progress
        let progress = 0;
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        
        const interval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress > 90) progress = 90;
            
            progressBar.style.width = progress + '%';
            progressText.textContent = `Sending messages... ${Math.round(progress)}%`;
        }, 500);
        
        this.progressInterval = interval;
    }
    
    hideProgress() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        
        // Complete progress bar
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        
        progressBar.style.width = '100%';
        progressText.textContent = 'Complete!';
        
        setTimeout(() => {
            this.progressSection.classList.add('d-none');
            this.sendBtn.disabled = false;
            this.sendBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send SMS Messages';
        }, 1000);
    }
    
    showResults(results) {
        const resultsContent = document.getElementById('resultsContent');
        
        let html = `
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="text-center">
                        <div class="display-6 text-primary fw-bold">${results.total_numbers}</div>
                        <small class="text-muted">Total Numbers</small>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="text-center">
                        <div class="display-6 text-success fw-bold">${results.successful_sends}</div>
                        <small class="text-muted">Successful</small>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="text-center">
                        <div class="display-6 text-danger fw-bold">${results.failed_sends}</div>
                        <small class="text-muted">Failed</small>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="text-center">
                        <div class="display-6 text-warning fw-bold">${results.invalid_numbers}</div>
                        <small class="text-muted">Invalid</small>
                    </div>
                </div>
            </div>
        `;
        
        // Success message
        if (results.successful_sends > 0) {
            html += `
                <div class="alert alert-success">
                    <i class="fas fa-check-circle me-2"></i>
                    <strong>Success!</strong> ${results.successful_sends} messages sent successfully.
                    ${results.results.total_cost ? `<br><small>Total cost: ${results.results.total_cost.toFixed(2)} KES</small>` : ''}
                </div>
            `;
        }
        
        // Failed messages
        if (results.failed_sends > 0) {
            html += `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Warning!</strong> ${results.failed_sends} messages failed to send.
                </div>
            `;
        }
        
        // Invalid numbers
        if (results.invalid_numbers > 0 && results.invalid_numbers_list.length > 0) {
            html += `
                <div class="alert alert-warning">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Invalid Numbers:</strong><br>
                    ${results.invalid_numbers_list.join('<br>')}
                    ${results.invalid_numbers > results.invalid_numbers_list.length ? `<br><small>...and ${results.invalid_numbers - results.invalid_numbers_list.length} more</small>` : ''}
                </div>
            `;
        }
        
        resultsContent.innerHTML = html;
        this.resultsSection.classList.remove('d-none');
        this.resultsSection.classList.add('slideUp');
        
        // Scroll to results
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    showAlert(type, message) {
        // Remove existing alerts
        const existingAlerts = document.querySelectorAll('.alert-temporary');
        existingAlerts.forEach(alert => alert.remove());
        
        // Create new alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-temporary fadeIn`;
        alertDiv.innerHTML = `
            <i class="fas fa-${this.getAlertIcon(type)} me-2"></i>
            ${message}
            <button type="button" class="btn-close float-end" data-bs-dismiss="alert"></button>
        `;
        
        // Insert at top of form
        this.form.parentNode.insertBefore(alertDiv, this.form);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
    
    getAlertIcon(type) {
        const icons = {
            success: 'check-circle',
            danger: 'exclamation-triangle',
            warning: 'exclamation-circle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SMSApp();
});

// Add some utility functions
window.SMSUtils = {
    formatPhoneNumber: function(phoneNumber) {
        if (!phoneNumber) return '';
        const digits = phoneNumber.replace(/[^\d]/g, '');
        
        if (digits.length >= 12 && digits.startsWith('233')) {
            return `+233 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
        }
        
        return phoneNumber;
    },
    
    validateGhanaNumber: function(phoneNumber) {
        const cleaned = phoneNumber.replace(/[^\d+]/g, '');
        return /^\+233[2-5]\d{8}$|^233[2-5]\d{8}$|^0[2-5]\d{8}$|^[2-5]\d{8}$/.test(cleaned);
    }
};
