import os
import logging
import africastalking
from typing import List, Dict, Any
import time

class SMSService:
    """Service class for handling SMS operations using Africa's Talking API"""
    
    def __init__(self):
        """Initialize the SMS service with Africa's Talking credentials"""
        self.username = os.getenv('AFRICAS_TALKING_USERNAME', 'sandbox')
        self.api_key = os.getenv('AFRICAS_TALKING_API_KEY', 'atsk_81203dd12fa6cd66166260befdbd00713b14fad045035385059ec0c60e7f5aa4380328b9')
        
        # Initialize Africa's Talking
        try:
            africastalking.initialize(self.username, self.api_key)
            self.sms = africastalking.SMS
            logging.info("Africa's Talking SMS service initialized successfully")
        except Exception as e:
            logging.error(f"Failed to initialize Africa's Talking: {str(e)}")
            self.sms = None
    
    def send_single_sms(self, message: str, phone_number: str) -> Dict[str, Any]:
        """Send SMS to a single phone number"""
        try:
            if not self.sms:
                return {
                    'success': False,
                    'error': 'SMS service not initialized',
                    'phone_number': phone_number
                }
            
            # Send SMS
            response = self.sms.send(message, [phone_number])
            
            # Parse response
            if response and 'SMSMessageData' in response:
                recipients = response['SMSMessageData'].get('Recipients', [])
                if recipients:
                    recipient = recipients[0]
                    status = recipient.get('status')
                    if status == 'Success':
                        return {
                            'success': True,
                            'phone_number': phone_number,
                            'message_id': recipient.get('messageId'),
                            'cost': recipient.get('cost')
                        }
                    else:
                        return {
                            'success': False,
                            'error': f"SMS failed with status: {status}",
                            'phone_number': phone_number
                        }
            
            return {
                'success': False,
                'error': 'Invalid response from SMS service',
                'phone_number': phone_number
            }
            
        except Exception as e:
            logging.error(f"Error sending SMS to {phone_number}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'phone_number': phone_number
            }
    
    def send_bulk_sms(self, message: str, phone_numbers: List[str]) -> Dict[str, Any]:
        """Send SMS to multiple phone numbers with progress tracking"""
        results = {
            'successful': 0,
            'failed': 0,
            'details': [],
            'total_cost': 0.0
        }
        
        logging.info(f"Starting bulk SMS send to {len(phone_numbers)} numbers")
        
        for i, phone_number in enumerate(phone_numbers):
            try:
                # Send SMS
                result = self.send_single_sms(message, phone_number)
                results['details'].append(result)
                
                if result['success']:
                    results['successful'] += 1
                    # Extract cost if available
                    cost_str = result.get('cost', '0')
                    try:
                        # Remove currency prefix and convert to float
                        cost = float(cost_str.replace('KES', '').replace('USD', '').strip())
                        results['total_cost'] += cost
                    except (ValueError, AttributeError):
                        pass
                else:
                    results['failed'] += 1
                
                # Small delay to avoid rate limiting
                if i < len(phone_numbers) - 1:
                    time.sleep(0.1)
                
                # Log progress every 10 messages
                if (i + 1) % 10 == 0:
                    logging.info(f"Processed {i + 1}/{len(phone_numbers)} messages")
                    
            except Exception as e:
                logging.error(f"Error processing phone number {phone_number}: {str(e)}")
                results['failed'] += 1
                results['details'].append({
                    'success': False,
                    'error': str(e),
                    'phone_number': phone_number
                })
        
        logging.info(f"Bulk SMS completed. Success: {results['successful']}, Failed: {results['failed']}")
        return results
    
    def send_bulk_sms_with_database(self, message: str, phone_numbers: List[str], campaign_id: int) -> Dict[str, Any]:
        """Send SMS to multiple phone numbers with database logging"""
        from datetime import datetime
        
        results = {
            'successful': 0,
            'failed': 0,
            'details': [],
            'total_cost': 0.0
        }
        
        logging.info(f"Starting bulk SMS send to {len(phone_numbers)} numbers for campaign {campaign_id}")
        
        # Import here to avoid circular imports
        from app import db, SMSRecord, SMSStatus
        
        for i, phone_number in enumerate(phone_numbers):
            # Create SMS record
            sms_record = SMSRecord()
            sms_record.campaign_id = campaign_id
            sms_record.phone_number = phone_number
            sms_record.status = SMSStatus.PENDING
            db.session.add(sms_record)
            db.session.flush()  # Get the record ID
            
            try:
                # Send SMS
                result = self.send_single_sms(message, phone_number)
                results['details'].append(result)
                
                if result['success']:
                    results['successful'] += 1
                    sms_record.status = SMSStatus.SUCCESS
                    sms_record.message_id = result.get('message_id')
                    sms_record.sent_at = datetime.utcnow()
                    
                    # Extract and store cost
                    cost_str = result.get('cost', '0')
                    try:
                        cost = float(cost_str.replace('KES', '').replace('USD', '').strip())
                        sms_record.cost = cost
                        results['total_cost'] += cost
                    except (ValueError, AttributeError):
                        sms_record.cost = 0.0
                else:
                    results['failed'] += 1
                    sms_record.status = SMSStatus.FAILED
                    sms_record.error_message = result.get('error', 'Unknown error')
                
                # Small delay to avoid rate limiting
                if i < len(phone_numbers) - 1:
                    time.sleep(0.1)
                
                # Log progress every 10 messages
                if (i + 1) % 10 == 0:
                    logging.info(f"Processed {i + 1}/{len(phone_numbers)} messages")
                    db.session.commit()  # Commit progress periodically
                    
            except Exception as e:
                logging.error(f"Error processing phone number {phone_number}: {str(e)}")
                results['failed'] += 1
                sms_record.status = SMSStatus.FAILED
                sms_record.error_message = str(e)
                results['details'].append({
                    'success': False,
                    'error': str(e),
                    'phone_number': phone_number
                })
        
        # Final commit
        db.session.commit()
        
        logging.info(f"Bulk SMS completed. Success: {results['successful']}, Failed: {results['failed']}")
        return results
    
    def get_service_status(self) -> Dict[str, Any]:
        """Check if the SMS service is properly configured"""
        return {
            'initialized': self.sms is not None,
            'username': self.username,
            'api_key_configured': bool(self.api_key and self.api_key != 'your-api-key-here')
        }
