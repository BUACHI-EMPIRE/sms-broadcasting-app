// Modern SMS Broadcasting App JavaScript

class ModernSMSApp {
    constructor() {
        this.init();
        this.bindEvents();
    }

    init() {
        this.updateCharCount();
        this.updateSMSCount();
        this.setupFileUpload();
    }

    bindEvents() {
        // Message textarea events
        const messageTextarea = document.getElementById('message');
        if (messageTextarea) {
            messageTextarea.addEventListener('input', () => {
                this.updateCharCount();
                this.updateSMSCount();
            });
        }

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(btn.dataset.tab);
            });
        });

        // Form submission
        const form = document.getElementById('smsForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
        }

        // File upload events
        this.setupFileUploadEvents();
    }

    updateCharCount() {
        const messageTextarea = document.getElementById('message');
        const charCountElement = document.getElementById('charCount');
        
        if (messageTextarea && charCountElement) {
            const length = messageTextarea.value.length;
            const maxLength = messageTextarea.getAttribute('maxlength') || 1000;
            charCountElement.textContent = `${length}/${maxLength} characters`;
            
            // Change color based on character count
            if (length > maxLength * 0.9) {
                charCountElement.style.color = '#ff6b6b';
            } else if (length > maxLength * 0.7) {
                charCountElement.style.color = '#ffa726';
            } else {
                charCountElement.style.color = 'rgba(255, 255, 255, 0.7)';
            }
        }
    }

    updateSMSCount() {
        const messageTextarea = document.getElementById('message');
        const smsCountElement = document.getElementById('smsCount');
        
        if (messageTextarea && smsCountElement) {
            const length = messageTextarea.value.length;
            const smsCount = Math.ceil(length / 160) || 1;
            smsCountElement.textContent = `${smsCount} SMS`;
            
            // Change color for multiple SMS
            if (smsCount > 1) {
                smsCountElement.style.color = '#ffa726';
            } else {
                smsCountElement.style.color = 'rgba(255, 255, 255, 0.7)';
            }
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        // Clear form data when switching tabs
        if (tabName === 'manual') {
            document.getElementById('csvFile').value = '';
            this.clearCSVPreview();
        } else {
            document.getElementById('phoneNumbers').value = '';
        }
    }

    setupFileUpload() {
        const fileUploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('csvFile');

        if (fileUploadArea && fileInput) {
            // Click to upload
            fileUploadArea.addEventListener('click', () => {
                fileInput.click();
            });

            // Drag and drop
            fileUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileUploadArea.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                fileUploadArea.style.background = 'rgba(255, 255, 255, 0.1)';
            });

            fileUploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                fileUploadArea.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                fileUploadArea.style.background = 'transparent';
            });

            fileUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                fileUploadArea.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                fileUploadArea.style.background = 'transparent';
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFileSelect(files[0]);
                }
            });
        }
    }

    setupFileUploadEvents() {
        const fileInput = document.getElementById('csvFile');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileSelect(e.target.files[0]);
                }
            });
        }
    }

    handleFileSelect(file) {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showError('Please select a CSV file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const csvContent = e.target.result;
            this.parseCSVContent(csvContent);
        };
        reader.readAsText(file);
    }

    parseCSVContent(csvContent) {
        const lines = csvContent.split('\n').filter(line => line.trim());
        const phoneNumbers = [];
        
        lines.forEach(line => {
            const cells = line.split(',');
            cells.forEach(cell => {
                const cleaned = cell.trim().replace(/['"]/g, '');
                if (cleaned && (cleaned.startsWith('+233') || cleaned.startsWith('233'))) {
                    phoneNumbers.push(cleaned);
                }
            });
        });

        this.displayCSVPreview(phoneNumbers);
    }

    displayCSVPreview(phoneNumbers) {
        const previewElement = document.getElementById('csvPreview');
        if (!previewElement) return;

        const validCount = phoneNumbers.length;
        const displayLimit = 10;
        const displayNumbers = phoneNumbers.slice(0, displayLimit);

        previewElement.innerHTML = `
            <div class="csv-preview-content">
                <h6 class="text-white mb-3">
                    <i class="fas fa-eye me-2"></i>
                    CSV Preview (${validCount} phone numbers found)
                </h6>
                <div class="preview-numbers">
                    ${displayNumbers.map(num => `<span class="preview-number">${num}</span>`).join('')}
                    ${validCount > displayLimit ? `<span class="preview-more">+${validCount - displayLimit} more...</span>` : ''}
                </div>
            </div>
        `;

        // Store numbers for form submission
        this.csvPhoneNumbers = phoneNumbers;
    }

    clearCSVPreview() {
        const previewElement = document.getElementById('csvPreview');
        if (previewElement) {
            previewElement.innerHTML = '';
        }
        this.csvPhoneNumbers = null;
    }

    async handleFormSubmit() {
        const form = document.getElementById('smsForm');
        const sendBtn = document.getElementById('sendBtn');
        const progressCard = document.getElementById('progressCard');
        const resultsCard = document.getElementById('resultsCard');

        // Get form data
        const message = document.getElementById('message').value.trim();
        const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
        
        let phoneNumbers;
        if (activeTab === 'manual') {
            phoneNumbers = document.getElementById('phoneNumbers').value.trim();
        } else {
            phoneNumbers = this.csvPhoneNumbers || [];
        }

        // Validation
        if (!message) {
            this.showError('Please enter a message');
            return;
        }

        if (!phoneNumbers || (Array.isArray(phoneNumbers) && phoneNumbers.length === 0) || 
            (!Array.isArray(phoneNumbers) && phoneNumbers === '')) {
            this.showError('Please enter phone numbers or upload a CSV file');
            return;
        }

        // Show progress
        this.showProgress();
        this.updateButtonState(sendBtn, true);

        try {
            // Prepare data
            const formData = {
                message: message,
                phone_numbers: phoneNumbers
            };

            // Send request
            const response = await fetch('/send_sms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                // Save to localStorage
                this.saveCampaignToStorage(result.campaign);
                
                // Show results
                this.showResults(result);
                this.showSuccessToast();
                
                // Reset form
                form.reset();
                this.clearCSVPreview();
                this.updateCharCount();
                this.updateSMSCount();
            } else {
                this.showError(result.error || 'Failed to send SMS');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showError('Network error. Please try again.');
        } finally {
            this.hideProgress();
            this.updateButtonState(sendBtn, false);
        }
    }

    showProgress() {
        const progressCard = document.getElementById('progressCard');
        const resultsCard = document.getElementById('resultsCard');
        
        if (progressCard) {
            progressCard.style.display = 'block';
            progressCard.scrollIntoView({ behavior: 'smooth' });
        }
        
        if (resultsCard) {
            resultsCard.style.display = 'none';
        }

        // Simulate progress
        this.simulateProgress();
    }

    hideProgress() {
        const progressCard = document.getElementById('progressCard');
        if (progressCard) {
            progressCard.style.display = 'none';
        }
    }

    simulateProgress() {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        
        const steps = [
            { percent: 20, text: 'Validating phone numbers...' },
            { percent: 40, text: 'Preparing messages...' },
            { percent: 60, text: 'Connecting to SMS service...' },
            { percent: 80, text: 'Sending messages...' },
            { percent: 100, text: 'Completing...' }
        ];

        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep < steps.length) {
                const step = steps[currentStep];
                if (progressBar) progressBar.style.width = `${step.percent}%`;
                if (progressText) progressText.textContent = step.text;
                currentStep++;
            } else {
                clearInterval(interval);
            }
        }, 800);
    }

    showResults(result) {
        const resultsCard = document.getElementById('resultsCard');
        const resultsContent = document.getElementById('resultsContent');
        
        if (!resultsCard || !resultsContent) return;

        const campaign = result.campaign;
        const successRate = campaign.total_recipients > 0 
            ? ((campaign.successful_sends / campaign.total_recipients) * 100).toFixed(1)
            : 0;

        resultsContent.innerHTML = `
            <div class="result-stats">
                <div class="stat-item">
                    <div class="stat-value text-info">${campaign.total_recipients}</div>
                    <div class="stat-label">Total Recipients</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value text-success">${campaign.successful_sends}</div>
                    <div class="stat-label">Successful</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value text-danger">${campaign.failed_sends}</div>
                    <div class="stat-label">Failed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value text-warning">$${campaign.total_cost.toFixed(2)}</div>
                    <div class="stat-label">Total Cost</div>
                </div>
            </div>
            
            <div class="result-item">
                <h6 class="text-white mb-2">
                    <i class="fas fa-info-circle me-2"></i>
                    Campaign Summary
                </h6>
                <p class="mb-2"><strong>Success Rate:</strong> ${successRate}%</p>
                <p class="mb-2"><strong>Message Length:</strong> ${result.message_length} characters</p>
                <p class="mb-2"><strong>Campaign ID:</strong> ${campaign.id}</p>
                <p class="mb-0"><strong>Sent:</strong> ${new Date(campaign.created_at).toLocaleString()}</p>
            </div>

            ${campaign.invalid_numbers > 0 ? `
                <div class="result-item">
                    <h6 class="text-warning mb-2">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Invalid Numbers (${campaign.invalid_numbers})
                    </h6>
                    <p class="mb-0">Some phone numbers were invalid and couldn't be processed.</p>
                </div>
            ` : ''}
        `;

        resultsCard.style.display = 'block';
        resultsCard.scrollIntoView({ behavior: 'smooth' });
    }

    updateButtonState(button, loading) {
        const btnText = button.querySelector('.btn-text');
        const btnSpinner = button.querySelector('.btn-spinner');
        
        if (loading) {
            btnText.style.display = 'none';
            btnSpinner.style.display = 'inline-flex';
            button.disabled = true;
        } else {
            btnText.style.display = 'inline-flex';
            btnSpinner.style.display = 'none';
            button.disabled = false;
        }
    }

    showError(message) {
        // Create and show error toast
        const toastContainer = document.querySelector('.toast-container');
        const errorToast = document.createElement('div');
        errorToast.className = 'toast align-items-center text-white bg-danger border-0';
        errorToast.setAttribute('role', 'alert');
        errorToast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        toastContainer.appendChild(errorToast);
        const toast = new bootstrap.Toast(errorToast);
        toast.show();
        
        // Remove after hiding
        errorToast.addEventListener('hidden.bs.toast', () => {
            errorToast.remove();
        });
    }

    showSuccessToast() {
        const toast = new bootstrap.Toast(document.getElementById('successToast'));
        toast.show();
    }

    saveCampaignToStorage(campaign) {
        const campaigns = JSON.parse(localStorage.getItem('sms_campaigns') || '[]');
        campaigns.unshift(campaign); // Add to beginning
        
        // Keep only last 100 campaigns
        if (campaigns.length > 100) {
            campaigns.splice(100);
        }
        
        localStorage.setItem('sms_campaigns', JSON.stringify(campaigns));
        
        // Update statistics
        this.updateStatistics(campaign);
    }

    updateStatistics(campaign) {
        const today = new Date().toISOString().split('T')[0];
        const stats = JSON.parse(localStorage.getItem('sms_statistics') || '{}');
        
        if (!stats[today]) {
            stats[today] = {
                date: today,
                total_campaigns: 0,
                total_messages_sent: 0,
                total_successful: 0,
                total_failed: 0,
                total_cost: 0
            };
        }
        
        stats[today].total_campaigns += 1;
        stats[today].total_messages_sent += campaign.total_recipients;
        stats[today].total_successful += campaign.successful_sends;
        stats[today].total_failed += campaign.failed_sends;
        stats[today].total_cost += campaign.total_cost;
        
        localStorage.setItem('sms_statistics', JSON.stringify(stats));
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ModernSMSApp();
});

// Add some utility CSS classes dynamically
const style = document.createElement('style');
style.textContent = `
    .csv-preview-content {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1rem;
        margin-top: 1rem;
    }
    
    .preview-numbers {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
    
    .preview-number {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 6px;
        font-size: 0.9rem;
    }
    
    .preview-more {
        background: rgba(255, 193, 7, 0.3);
        color: #ffc107;
        padding: 0.25rem 0.5rem;
        border-radius: 6px;
        font-size: 0.9rem;
        font-style: italic;
    }
    
    .text-info { color: #17a2b8 !important; }
    .text-success { color: #28a745 !important; }
    .text-danger { color: #dc3545 !important; }
    .text-warning { color: #ffc107 !important; }
`;
document.head.appendChild(style);