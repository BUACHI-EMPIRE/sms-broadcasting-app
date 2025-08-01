import os
import logging
from flask import Flask, render_template, request, jsonify
from werkzeug.middleware.proxy_fix import ProxyFix
from sms_service import SMSService
from utils import validate_phone_numbers, parse_csv_content, clean_phone_number, parse_phone_numbers_from_input
import json
from datetime import datetime, date

# Setup logging
logging.basicConfig(level=logging.DEBUG)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "your-secret-key-here")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Initialize SMS service
sms_service = SMSService()

@app.route('/')
def index():
    """Main page with SMS form"""
    return render_template('index_modern.html')

@app.route('/send_sms', methods=['POST'])
def send_sms():
    """Send SMS messages using localStorage for data management"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        message = data.get('message', '').strip()
        phone_numbers_input = data.get('phone_numbers', '')
        
        if not message:
            return jsonify({
                'success': False,
                'error': 'Message is required'
            }), 400
        
        # Parse phone numbers from input or CSV content
        if isinstance(phone_numbers_input, str):
            # Check if it contains CSV-like content (commas, multiple lines)
            if ',' in phone_numbers_input or '\n' in phone_numbers_input:
                # Check if it's CSV format or just multiple phone numbers
                if phone_numbers_input.strip().startswith('+233') or any(line.strip().startswith('+233') for line in phone_numbers_input.split('\n')):
                    # Multiple phone numbers input
                    phone_numbers = parse_phone_numbers_from_input(phone_numbers_input)
                else:
                    # CSV content
                    phone_numbers = parse_csv_content(phone_numbers_input)
            else:
                # Single phone number
                phone_numbers = [phone_numbers_input.strip()]
        else:
            phone_numbers = phone_numbers_input
        
        if not phone_numbers:
            return jsonify({
                'success': False,
                'error': 'No phone numbers provided'
            }), 400
        
        # Validate phone numbers
        valid_numbers, invalid_numbers = validate_phone_numbers(phone_numbers)
        
        if not valid_numbers:
            return jsonify({
                'success': False,
                'error': 'No valid phone numbers found',
                'invalid_numbers': invalid_numbers
            }), 400
        
        # Limit to 300 numbers
        if len(valid_numbers) > 300:
            return jsonify({
                'success': False,
                'error': f'Too many phone numbers. Maximum allowed is 300, but {len(valid_numbers)} were provided.'
            }), 400
        
        # Send SMS messages
        results = sms_service.send_bulk_sms(message, valid_numbers)
        
        # Create response data for localStorage
        campaign_data = {
            'id': datetime.now().strftime('%Y%m%d_%H%M%S'),
            'message': message,
            'total_recipients': len(phone_numbers),
            'valid_numbers': len(valid_numbers),
            'invalid_numbers': len(invalid_numbers),
            'successful_sends': results['successful'],
            'failed_sends': results['failed'],
            'total_cost': results.get('total_cost', 0.0),
            'created_at': datetime.now().isoformat(),
            'details': results['details'],
            'invalid_numbers_list': invalid_numbers[:10]
        }
        
        response_data = {
            'success': True,
            'campaign': campaign_data,
            'message_length': len(message),
            'results': results
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        logging.error(f"Error in send_sms: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'An unexpected error occurred: {str(e)}'
        }), 500

@app.route('/campaigns')
def campaigns():
    """View all SMS campaigns (client-side with localStorage)"""
    return render_template('campaigns_modern.html')

@app.route('/statistics')
def statistics():
    """View SMS statistics (client-side with localStorage)"""
    return render_template('statistics_modern.html')

@app.route('/users')
def users():
    """User management page"""
    return render_template('users_modern.html')

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy', 
        'service': 'SMS Broadcasting App (localStorage)', 
        'storage': 'localStorage',
        'sms_environment': 'sandbox' if sms_service.username == 'sandbox' else 'production',
        'api_configured': bool(sms_service.api_key and sms_service.api_key != 'your-api-key-here')
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)