# Modern Bulk SMS Broadcasting App

A beautiful, modern web application for sending bulk SMS messages to multiple recipients using Africa's Talking API. Features a stunning glassmorphism design, localStorage-based data storage, and comprehensive user management capabilities.

## ✨ Features

### 🚀 SMS Broadcasting
- Send SMS to up to 300 Ghana phone numbers simultaneously
- Support for manual phone number entry and CSV file uploads
- Real-time character counting and SMS part calculation
- Comprehensive delivery tracking and status reporting
- Campaign history with detailed analytics

### 👥 User Management
- Complete user database with contact information
- CSV import/export functionality for bulk user management
- Advanced search and filtering capabilities
- User categorization and notes system
- Real-time statistics dashboard

### 🎨 Modern Design
- Beautiful glassmorphism interface with smooth animations
- Responsive design that works on all devices
- Dark theme with gradient backgrounds
- Enhanced navigation with hover effects
- Professional typography and spacing

### 💾 Data Storage
- Client-side localStorage for fast, offline-capable data management
- No database setup required - works instantly
- Campaign history and user data persistence
- Statistics tracking and analytics

## 🛠️ Technologies Used

- **Backend**: Python Flask
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **UI Framework**: Bootstrap 5
- **Icons**: Font Awesome
- **SMS Service**: Africa's Talking API
- **Data Storage**: Browser localStorage
- **Design**: Modern glassmorphism with CSS blur effects

## 📋 Prerequisites

- Python 3.7+
- Africa's Talking API credentials (for SMS functionality)
- Modern web browser with localStorage support

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd sms-broadcasting-app
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   Create a `.env` file or set environment variables:
   ```bash
   export AFRICAS_TALKING_USERNAME="your-username"
   export AFRICAS_TALKING_API_KEY="your-api-key"
   export SESSION_SECRET="your-secret-key"
   ```

4. **Run the application**
   ```bash
   python main.py
   ```

5. **Open in browser**
   Navigate to `http://localhost:5000`

## 📱 SMS Setup

### Sandbox Mode (Testing)
The app runs in sandbox mode by default using test credentials. SMS messages won't be delivered but you can test all functionality.

### Production Mode
1. Sign up for [Africa's Talking](https://africastalking.com)
2. Get your production API credentials
3. Update environment variables with production credentials
4. Purchase SMS credits in your Africa's Talking account

## 🎯 Usage

### Sending SMS Messages
1. Navigate to the home page
2. Compose your message (160 characters per SMS part)
3. Add phone numbers manually or upload a CSV file
4. Click "Send SMS" to broadcast your message
5. View delivery status and campaign details

### Managing Users
1. Go to the "Users" page
2. Add users individually using the form
3. Import users in bulk via CSV upload
4. Search and filter your user database
5. Export user data as CSV for external use

### Viewing Analytics
1. Check the "Statistics" page for overall performance
2. Review "Campaigns" for detailed message history
3. Track delivery rates and costs over time

## 📊 CSV File Formats

### User Import CSV Format
```csv
Full Name,Email,Phone,Company,Location,Category,Notes
John Doe,john@example.com,+233501234567,ABC Corp,Accra,Customer,VIP client
Jane Smith,jane@example.com,+233507654321,XYZ Ltd,Kumasi,Partner,Regular contact
```

### Phone Numbers CSV Format
```csv
+233501234567
+233507654321
+233501111111
```

## 🔧 Configuration

### Environment Variables
- `AFRICAS_TALKING_USERNAME`: Your Africa's Talking username
- `AFRICAS_TALKING_API_KEY`: Your Africa's Talking API key
- `SESSION_SECRET`: Flask session secret key (optional)

### Phone Number Format
- Supports Ghana phone numbers in format: `+233XXXXXXXXX`
- Automatically formats numbers from various input formats
- Validates phone numbers before sending

## 🎨 Customization

### Styling
- Modify `static/css/modern.css` for design changes
- Update CSS variables for color scheme adjustments
- Customize glassmorphism effects and animations

### Functionality
- Extend user fields in `static/js/users.js`
- Add new statistics in `static/js/localStorage.js`
- Customize SMS templates and validation

## 🔒 Security

- Environment variables for sensitive API credentials
- Client-side data validation and sanitization
- Session management with secret keys
- Phone number format validation

## 📈 Performance

- localStorage for fast data access
- Minimal server-side processing
- Responsive design with optimized images
- Efficient CSS with modern techniques

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please open an issue in the GitHub repository or contact the development team.

## 🙏 Acknowledgments

- [Africa's Talking](https://africastalking.com) for SMS API services
- [Bootstrap](https://getbootstrap.com) for UI components
- [Font Awesome](https://fontawesome.com) for icons
- [Flask](https://flask.palletsprojects.com) for the web framework

---

**Made with ❤️ for efficient bulk SMS communication**