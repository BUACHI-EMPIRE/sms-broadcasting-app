import re
import csv
import io
from typing import List, Optional

def clean_phone_number(phone_number: str) -> str:
    """Clean and format phone number"""
    if not phone_number:
        return ""
    
    # Remove all non-digit characters except +
    cleaned = re.sub(r'[^\d+]', '', phone_number.strip())
    
    # Handle different formats
    if cleaned.startswith('0'):
        # Remove leading zero and add Ghana country code
        cleaned = '+233' + cleaned[1:]
    elif cleaned.startswith('233'):
        # Add + if missing
        cleaned = '+' + cleaned
    elif not cleaned.startswith('+'):
        # Assume Ghana number if no country code
        if len(cleaned) == 9:
            cleaned = '+233' + cleaned
    
    return cleaned

def validate_phone_numbers(phone_numbers: List[str]) -> tuple:
    """Validate a list of phone numbers and return valid and invalid numbers"""
    if not phone_numbers:
        return [], []
    
    # Ghana phone number pattern
    ghana_pattern = r'^\+233[2-5]\d{8}$'
    
    valid_numbers = []
    invalid_numbers = []
    
    for number in phone_numbers:
        if not number:
            continue
            
        # Clean the number first
        cleaned_number = clean_phone_number(number)
        
        if re.match(ghana_pattern, cleaned_number):
            valid_numbers.append(cleaned_number)
        else:
            invalid_numbers.append(number)
    
    return valid_numbers, invalid_numbers

def validate_single_phone_number(phone_number: str) -> bool:
    """Validate a single phone number"""
    if not phone_number:
        return False
    
    # Ghana phone number pattern
    ghana_pattern = r'^\+233[2-5]\d{8}$'
    return bool(re.match(ghana_pattern, phone_number))

def parse_csv_content(csv_content: str) -> List[str]:
    """Parse CSV content and extract phone numbers"""
    phone_numbers = []
    
    try:
        # Try to parse as CSV
        csv_reader = csv.reader(io.StringIO(csv_content))
        
        for row_num, row in enumerate(csv_reader, 1):
            if not row:
                continue
                
            # Try each column to find phone numbers
            for cell in row:
                if cell and cell.strip():
                    # Check if this looks like a phone number
                    cleaned_cell = re.sub(r'[^\d+]', '', cell.strip())
                    if len(cleaned_cell) >= 9:  # Minimum phone number length
                        phone_numbers.append(cell.strip())
                        break  # Only take first valid phone number per row
    
    except Exception as e:
        # If CSV parsing fails, try to extract phone numbers from plain text
        lines = csv_content.split('\n')
        for line in lines:
            line = line.strip()
            if line:
                # Look for phone number patterns in the line
                phone_matches = re.findall(r'[\+]?[\d\s\-\(\)]{9,}', line)
                for match in phone_matches:
                    cleaned_match = re.sub(r'[^\d+]', '', match)
                    if len(cleaned_match) >= 9:
                        phone_numbers.append(match.strip())
    
    return phone_numbers

def parse_phone_numbers_from_input(phone_numbers_input):
    """Parse phone numbers from manual input - handles multiple numbers separated by commas or newlines"""
    if not phone_numbers_input or not isinstance(phone_numbers_input, str):
        return []
    
    # Split by commas and newlines
    numbers = []
    for line in phone_numbers_input.split('\n'):
        for number in line.split(','):
            number = number.strip()
            if number:
                numbers.append(number)
    
    return numbers

def format_phone_number_for_display(phone_number: str) -> str:
    """Format phone number for display purposes"""
    if not phone_number:
        return ""
    
    # Remove + and format as XXX XXX XXXX
    digits = re.sub(r'[^\d]', '', phone_number)
    
    if len(digits) >= 12 and digits.startswith('233'):
        # Ghana format: +233 XXX XXX XXX
        return f"+233 {digits[3:6]} {digits[6:9]} {digits[9:]}"
    
    return phone_number

def count_sms_parts(message: str) -> int:
    """Count how many SMS parts a message will be split into"""
    if not message:
        return 0
    
    # Standard SMS is 160 characters for GSM 7-bit
    # Unicode messages are 70 characters per part
    
    # Check if message contains non-GSM characters
    gsm_chars = set("@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà\n\r\t")
    
    is_unicode = any(char not in gsm_chars for char in message)
    
    if is_unicode:
        # Unicode SMS: 70 characters per part
        return (len(message) + 69) // 70
    else:
        # GSM 7-bit SMS: 160 characters per part
        return (len(message) + 159) // 160
