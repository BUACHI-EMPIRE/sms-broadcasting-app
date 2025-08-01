import os
import logging
from flask import Flask, render_template, request, jsonify, flash, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
from sms_service import SMSService
from utils import validate_phone_numbers, parse_csv_content, clean_phone_number
import json
from datetime import datetime, date
from enum import Enum


class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure the database
database_url = os.environ.get("DATABASE_URL")
if not database_url:
    raise RuntimeError("DATABASE_URL environment variable is not set")

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
# Initialize the app with the extension
db.init_app(app)

# Initialize SMS service
sms_service = SMSService()


class SMSStatus(Enum):
    PENDING = 'pending'
    SUCCESS = 'success'
    FAILED = 'failed'


class SMSCampaign(db.Model):
    """Model for storing SMS campaigns"""
    __tablename__ = 'sms_campaigns'
    
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.Text, nullable=False)
    total_recipients = db.Column(db.Integer, nullable=False, default=0)
    successful_sends = db.Column(db.Integer, nullable=False, default=0)
    failed_sends = db.Column(db.Integer, nullable=False, default=0)
    invalid_numbers = db.Column(db.Integer, nullable=False, default=0)
    total_cost = db.Column(db.Float, nullable=False, default=0.0)
    status = db.Column(db.Enum(SMSStatus), nullable=False, default=SMSStatus.PENDING)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # Relationship to SMS records
    sms_records = db.relationship('SMSRecord', backref='campaign', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<SMSCampaign {self.id}: {self.total_recipients} recipients>'


class SMSRecord(db.Model):
    """Model for storing individual SMS sending records"""
    __tablename__ = 'sms_records'
    
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('sms_campaigns.id'), nullable=False)
    phone_number = db.Column(db.String(20), nullable=False)
    status = db.Column(db.Enum(SMSStatus), nullable=False, default=SMSStatus.PENDING)
    message_id = db.Column(db.String(100), nullable=True)  # From SMS provider
    cost = db.Column(db.Float, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    sent_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<SMSRecord {self.id}: {self.phone_number} - {self.status.value}>'


class InvalidPhoneNumber(db.Model):
    """Model for storing invalid phone numbers from campaigns"""
    __tablename__ = 'invalid_phone_numbers'
    
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('sms_campaigns.id'), nullable=False)
    phone_number = db.Column(db.String(50), nullable=False)
    reason = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<InvalidPhoneNumber {self.id}: {self.phone_number}>'


class SMSStatistics(db.Model):
    """Model for storing daily SMS statistics"""
    __tablename__ = 'sms_statistics'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, unique=True)
    total_campaigns = db.Column(db.Integer, nullable=False, default=0)
    total_messages_sent = db.Column(db.Integer, nullable=False, default=0)
    total_successful = db.Column(db.Integer, nullable=False, default=0)
    total_failed = db.Column(db.Integer, nullable=False, default=0)
    total_cost = db.Column(db.Float, nullable=False, default=0.0)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<SMSStatistics {self.date}: {self.total_messages_sent} messages>'


# Create database tables
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    """Main page with the SMS form"""
    return render_template('index.html')

@app.route('/send_sms', methods=['POST'])
def send_sms():
    """Handle SMS sending request"""
    try:
        # Get form data
        message = request.form.get('message', '').strip()
        phone_numbers_text = request.form.get('phone_numbers', '').strip()
        csv_file = request.files.get('csv_file')
        
        # Validate message
        if not message:
            return jsonify({
                'success': False,
                'error': 'Message is required'
            }), 400
            
        if len(message) > 1600:  # SMS length limit
            return jsonify({
                'success': False,
                'error': 'Message is too long. Maximum 1600 characters allowed.'
            }), 400
        
        # Collect phone numbers
        phone_numbers = []
        
        # From textarea
        if phone_numbers_text:
            textarea_numbers = [line.strip() for line in phone_numbers_text.split('\n') if line.strip()]
            phone_numbers.extend(textarea_numbers)
        
        # From CSV file
        if csv_file and csv_file.filename:
            try:
                csv_content = csv_file.read().decode('utf-8')
                csv_numbers = parse_csv_content(csv_content)
                phone_numbers.extend(csv_numbers)
            except Exception as e:
                logging.error(f"CSV parsing error: {str(e)}")
                return jsonify({
                    'success': False,
                    'error': f'Error reading CSV file: {str(e)}'
                }), 400
        
        # Validate phone numbers
        if not phone_numbers:
            return jsonify({
                'success': False,
                'error': 'At least one phone number is required'
            }), 400
            
        if len(phone_numbers) > 300:
            return jsonify({
                'success': False,
                'error': 'Maximum 300 phone numbers allowed'
            }), 400
        
        # Clean and validate phone numbers
        valid_numbers = []
        invalid_numbers = []
        
        for number in phone_numbers:
            cleaned_number = clean_phone_number(number)
            if validate_phone_numbers([cleaned_number]):
                valid_numbers.append(cleaned_number)
            else:
                invalid_numbers.append(number)
        
        if not valid_numbers:
            return jsonify({
                'success': False,
                'error': 'No valid phone numbers found'
            }), 400
        
        # Create SMS campaign record
        
        campaign = SMSCampaign()
        campaign.message = message
        campaign.total_recipients = len(phone_numbers)
        campaign.invalid_numbers = len(invalid_numbers)
        db.session.add(campaign)
        db.session.flush()  # Get the campaign ID
        
        # Store invalid phone numbers
        for invalid_number in invalid_numbers:
            invalid_record = InvalidPhoneNumber()
            invalid_record.campaign_id = campaign.id
            invalid_record.phone_number = invalid_number
            invalid_record.reason = 'Invalid format'
            db.session.add(invalid_record)
        
        # Send SMS messages
        results = sms_service.send_bulk_sms_with_database(message, valid_numbers, campaign.id)
        
        # Update campaign with results
        campaign.successful_sends = results['successful']
        campaign.failed_sends = results['failed']
        campaign.total_cost = results.get('total_cost', 0.0)
        campaign.status = SMSStatus.SUCCESS if results['failed'] == 0 else SMSStatus.FAILED
        campaign.completed_at = datetime.utcnow()
        
        # Update daily statistics
        today = date.today()
        stats = SMSStatistics.query.filter_by(date=today).first()
        if not stats:
            stats = SMSStatistics()
            stats.date = today
            stats.total_campaigns = 1
            stats.total_messages_sent = len(valid_numbers)
            stats.total_successful = results['successful']
            stats.total_failed = results['failed']
            stats.total_cost = results.get('total_cost', 0.0)
            db.session.add(stats)
        else:
            stats.total_campaigns += 1
            stats.total_messages_sent += len(valid_numbers)
            stats.total_successful += results['successful']
            stats.total_failed += results['failed']
            stats.total_cost += results.get('total_cost', 0.0)
            stats.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        # Prepare response
        response_data = {
            'success': True,
            'campaign_id': campaign.id,
            'total_numbers': len(phone_numbers),
            'valid_numbers': len(valid_numbers),
            'invalid_numbers': len(invalid_numbers),
            'successful_sends': results['successful'],
            'failed_sends': results['failed'],
            'invalid_numbers_list': invalid_numbers[:10],  # Show first 10 invalid numbers
            'message_length': len(message),
            'total_cost': results.get('total_cost', 0.0),
            'results': results
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error in send_sms: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'An unexpected error occurred: {str(e)}'
        }), 500

@app.route('/campaigns')
def campaigns():
    """View all SMS campaigns"""
    campaigns = SMSCampaign.query.order_by(SMSCampaign.created_at.desc()).limit(50).all()
    return render_template('campaigns.html', campaigns=campaigns)

@app.route('/campaign/<int:campaign_id>')
def campaign_details(campaign_id):
    """View details of a specific campaign"""
    campaign = SMSCampaign.query.get_or_404(campaign_id)
    sms_records = SMSRecord.query.filter_by(campaign_id=campaign_id).all()
    invalid_numbers = InvalidPhoneNumber.query.filter_by(campaign_id=campaign_id).all()
    
    return render_template('campaign_details.html', 
                         campaign=campaign, 
                         sms_records=sms_records,
                         invalid_numbers=invalid_numbers)

@app.route('/statistics')
def statistics():
    """View SMS statistics"""
    from sqlalchemy import func
    
    # Daily statistics for the last 30 days
    daily_stats = SMSStatistics.query.order_by(SMSStatistics.date.desc()).limit(30).all()
    
    # Overall statistics
    total_campaigns = SMSCampaign.query.count()
    total_messages = db.session.query(func.sum(SMSCampaign.successful_sends + SMSCampaign.failed_sends)).scalar() or 0
    total_successful = db.session.query(func.sum(SMSCampaign.successful_sends)).scalar() or 0
    total_cost = db.session.query(func.sum(SMSCampaign.total_cost)).scalar() or 0.0
    
    overall_stats = {
        'total_campaigns': total_campaigns,
        'total_messages': total_messages,
        'total_successful': total_successful,
        'total_failed': total_messages - total_successful,
        'total_cost': total_cost,
        'success_rate': (total_successful / total_messages * 100) if total_messages > 0 else 0
    }
    
    return render_template('statistics.html', 
                         daily_stats=daily_stats,
                         overall_stats=overall_stats)

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy', 
        'service': 'SMS Broadcasting App', 
        'database': 'connected',
        'sms_environment': 'sandbox' if sms_service.username == 'sandbox' else 'production',
        'api_configured': bool(sms_service.api_key and sms_service.api_key != 'your-api-key-here')
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
