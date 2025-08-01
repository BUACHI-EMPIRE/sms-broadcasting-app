// User Management System with localStorage
class UserManager {
    constructor() {
        this.users = this.loadUsers();
        this.init();
        this.updateStats();
        this.displayUsers();
    }

    init() {
        // Form submission
        document.getElementById('userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addUser();
        });

        // Export CSV
        document.getElementById('exportCsvBtn').addEventListener('click', () => {
            this.exportToCSV();
        });

        // Clear all users
        document.getElementById('clearUsersBtn').addEventListener('click', () => {
            this.clearAllUsers();
        });

        // Search functionality
        document.getElementById('searchUsers').addEventListener('input', (e) => {
            this.searchUsers(e.target.value);
        });

        // CSV import
        document.getElementById('importCsvBtn').addEventListener('click', () => {
            this.importFromCSV();
        });

        // Phone number formatting
        document.getElementById('phone').addEventListener('input', (e) => {
            this.formatPhoneNumber(e.target);
        });
    }

    loadUsers() {
        const users = localStorage.getItem('sms_users');
        return users ? JSON.parse(users) : [];
    }

    saveUsers() {
        localStorage.setItem('sms_users', JSON.stringify(this.users));
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    addUser() {
        const formData = {
            id: this.generateId(),
            fullName: document.getElementById('fullName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            company: document.getElementById('company').value.trim(),
            location: document.getElementById('location').value.trim(),
            category: document.getElementById('category').value,
            notes: document.getElementById('notes').value.trim(),
            createdAt: new Date().toISOString()
        };

        // Validation
        if (!formData.fullName || !formData.email || !formData.phone) {
            this.showToast('error', 'Please fill in all required fields (Name, Email, Phone).');
            return;
        }

        // Email validation
        if (!this.isValidEmail(formData.email)) {
            this.showToast('error', 'Please enter a valid email address.');
            return;
        }

        // Phone validation
        if (!this.isValidGhanaPhone(formData.phone)) {
            this.showToast('error', 'Please enter a valid Ghana phone number (+233XXXXXXXXX).');
            return;
        }

        // Check for duplicate email
        if (this.users.some(user => user.email === formData.email)) {
            this.showToast('error', 'A user with this email already exists.');
            return;
        }

        // Add user
        this.users.push(formData);
        this.saveUsers();
        this.updateStats();
        this.displayUsers();
        this.clearForm();
        
        this.showToast('success', `User "${formData.fullName}" added successfully!`);
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidGhanaPhone(phone) {
        const ghanaPhoneRegex = /^\+233[2-5]\d{8}$/;
        return ghanaPhoneRegex.test(phone);
    }

    formatPhoneNumber(input) {
        let value = input.value.replace(/\D/g, '');
        
        if (value.startsWith('0')) {
            value = '233' + value.substring(1);
        } else if (!value.startsWith('233')) {
            if (value.length === 9) {
                value = '233' + value;
            }
        }
        
        if (value.startsWith('233')) {
            input.value = '+' + value;
        } else {
            input.value = value;
        }
    }

    clearForm() {
        document.getElementById('userForm').reset();
    }

    updateStats() {
        const totalUsers = this.users.length;
        const categories = new Set(this.users.map(user => user.category).filter(cat => cat));
        const companies = new Set(this.users.map(user => user.company).filter(comp => comp));

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('categoriesCount').textContent = categories.size;
        document.getElementById('companiesCount').textContent = companies.size;
    }

    displayUsers(usersToShow = null) {
        const usersList = document.getElementById('usersList');
        const users = usersToShow || this.users;

        if (users.length === 0) {
            usersList.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-users fa-3x mb-3 opacity-50"></i>
                    <p>${usersToShow ? 'No users found matching your search.' : 'No users added yet. Start by adding your first user above.'}</p>
                </div>
            `;
            return;
        }

        const usersHtml = users.map((user, index) => `
            <div class="user-item mb-3 p-3 bg-white bg-opacity-10 rounded-3" data-user-id="${user.id}">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <div class="d-flex align-items-center mb-2">
                            <div class="user-avatar me-3">
                                <i class="fas fa-user-circle fa-2x text-primary"></i>
                            </div>
                            <div>
                                <h6 class="mb-1 text-white">${user.fullName}</h6>
                                <small class="text-muted">${user.email}</small>
                            </div>
                        </div>
                        <div class="user-details">
                            <small class="text-muted d-block">
                                <i class="fas fa-phone me-1"></i>${user.phone}
                            </small>
                            ${user.company ? `<small class="text-muted d-block"><i class="fas fa-building me-1"></i>${user.company}</small>` : ''}
                            ${user.location ? `<small class="text-muted d-block"><i class="fas fa-map-marker-alt me-1"></i>${user.location}</small>` : ''}
                            ${user.category ? `<span class="badge bg-primary bg-opacity-75 mt-1">${user.category}</span>` : ''}
                        </div>
                    </div>
                    <div class="col-md-4 text-end">
                        <small class="text-muted d-block">${new Date(user.createdAt).toLocaleDateString()}</small>
                        <button class="btn btn-sm btn-outline-danger mt-2" onclick="userManager.deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                ${user.notes ? `<div class="mt-2"><small class="text-muted"><i class="fas fa-sticky-note me-1"></i>${user.notes}</small></div>` : ''}
            </div>
        `).join('');

        usersList.innerHTML = usersHtml;
    }

    searchUsers(searchTerm) {
        if (!searchTerm.trim()) {
            this.displayUsers();
            return;
        }

        const filteredUsers = this.users.filter(user => 
            user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.phone.includes(searchTerm) ||
            (user.company && user.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.location && user.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.category && user.category.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        this.displayUsers(filteredUsers);
    }

    deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user?')) {
            return;
        }

        this.users = this.users.filter(user => user.id !== userId);
        this.saveUsers();
        this.updateStats();
        this.displayUsers();
        this.showToast('success', 'User deleted successfully!');
    }

    clearAllUsers() {
        if (!confirm('Are you sure you want to delete all users? This action cannot be undone.')) {
            return;
        }

        this.users = [];
        this.saveUsers();
        this.updateStats();
        this.displayUsers();
        this.showToast('success', 'All users cleared successfully!');
    }

    exportToCSV() {
        if (this.users.length === 0) {
            this.showToast('error', 'No users to export.');
            return;
        }

        const headers = ['Full Name', 'Email', 'Phone', 'Company', 'Location', 'Category', 'Notes', 'Created Date'];
        const csvContent = [
            headers.join(','),
            ...this.users.map(user => [
                this.escapeCSV(user.fullName),
                this.escapeCSV(user.email),
                this.escapeCSV(user.phone),
                this.escapeCSV(user.company || ''),
                this.escapeCSV(user.location || ''),
                this.escapeCSV(user.category || ''),
                this.escapeCSV(user.notes || ''),
                new Date(user.createdAt).toLocaleDateString()
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `sms_users_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showToast('success', `Successfully exported ${this.users.length} users to CSV!`);
    }

    escapeCSV(field) {
        if (field === null || field === undefined) {
            return '';
        }
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    }

    importFromCSV() {
        const fileInput = document.getElementById('csvFileInput');
        const file = fileInput.files[0];

        if (!file) {
            this.showToast('error', 'Please select a CSV file to import.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csv = e.target.result;
                const lines = csv.split('\n');
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

                // Validate headers
                const requiredHeaders = ['full name', 'email', 'phone'];
                const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
                
                if (missingHeaders.length > 0) {
                    this.showToast('error', `Missing required columns: ${missingHeaders.join(', ')}`);
                    return;
                }

                let importedCount = 0;
                let skippedCount = 0;

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const values = this.parseCSVLine(line);
                    if (values.length < headers.length) continue;

                    const userData = {
                        id: this.generateId(),
                        fullName: values[headers.indexOf('full name')] || '',
                        email: values[headers.indexOf('email')] || '',
                        phone: this.formatPhoneForImport(values[headers.indexOf('phone')] || ''),
                        company: values[headers.indexOf('company')] || '',
                        location: values[headers.indexOf('location')] || '',
                        category: values[headers.indexOf('category')] || '',
                        notes: values[headers.indexOf('notes')] || '',
                        createdAt: new Date().toISOString()
                    };

                    // Validate required fields
                    if (!userData.fullName || !userData.email || !userData.phone) {
                        skippedCount++;
                        continue;
                    }

                    // Check for duplicates
                    if (this.users.some(user => user.email === userData.email)) {
                        skippedCount++;
                        continue;
                    }

                    // Validate email and phone
                    if (!this.isValidEmail(userData.email) || !this.isValidGhanaPhone(userData.phone)) {
                        skippedCount++;
                        continue;
                    }

                    this.users.push(userData);
                    importedCount++;
                }

                this.saveUsers();
                this.updateStats();
                this.displayUsers();
                fileInput.value = '';

                this.showToast('success', `Imported ${importedCount} users successfully! ${skippedCount > 0 ? `${skippedCount} entries skipped.` : ''}`);

            } catch (error) {
                this.showToast('error', 'Error reading CSV file. Please check the format.');
            }
        };

        reader.readAsText(file);
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    formatPhoneForImport(phone) {
        if (!phone) return '';
        
        let cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.startsWith('0')) {
            cleaned = '233' + cleaned.substring(1);
        } else if (!cleaned.startsWith('233') && cleaned.length === 9) {
            cleaned = '233' + cleaned;
        }
        
        return cleaned.startsWith('233') ? '+' + cleaned : phone;
    }

    showToast(type, message) {
        const toastElement = document.getElementById(type === 'success' ? 'successToast' : 'errorToast');
        const messageElement = document.getElementById(type === 'success' ? 'successMessage' : 'errorMessage');
        
        messageElement.textContent = message;
        
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
    }
}

// Initialize the user manager when the page loads
let userManager;
document.addEventListener('DOMContentLoaded', () => {
    userManager = new UserManager();
});