from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.mail import send_mail
from django.conf import settings
from cryptography.fernet import Fernet
import base64
import secrets
import hashlib
from datetime import datetime, timedelta
import requests
import traceback
import pytz

# Encryption helper functions
def get_fernet_key():
    """Derive a consistent Fernet key from Django SECRET_KEY"""
    # Use SHA256 to ensure 32 bytes, then base64 encode
    key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(key)

def encrypt_password(password):
    f = Fernet(get_fernet_key())
    return f.encrypt(password.encode()).decode()

def decrypt_password(encrypted_password):
    try:
        f = Fernet(get_fernet_key())
        return f.decrypt(encrypted_password.encode()).decode()
    except Exception:
        return None

# In-memory storage for reset tokens (use Redis or database in production)
reset_tokens = {}

@api_view(['POST'])
def forgot_password(request):
    email = request.data.get('email')
    
    if not email:
        return Response({'error': 'Email is required'}, status=400)
    
    try:
        teable_url = settings.TEABLE_USER_TABLE_URL
        teable_token = settings.TEABLE_API_TOKEN
        
        # Check if email exists in Teable
        headers = {
            'Authorization': f'Bearer {teable_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(teable_url, headers=headers)
        
        print(f'\n📡 Teable API Status: {response.status_code}')
        
        if response.status_code != 200:
            print(f'❌ Teable API Error: {response.text}')
            return Response({'error': 'Failed to fetch users'}, status=500)
        
        data = response.json()
        users = data.get('records', [])
        
        print(f'Found {len(users)} users')
        
        user_found = False
        
        for user in users:
            user_email = user.get('fields', {}).get('Email', '')
            if user_email.lower() == email.lower():
                user_found = True
                print(f'✅ Email found: {email}')
                break
        
        if not user_found:
            print(f'❌ Email not found: {email}')
            return Response({'error': 'Email address not found'}, status=404)
        
        # Generate reset token
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        # Store token with expiry (30 minutes)
        reset_tokens[token_hash] = {
            'email': email,
            'expires': datetime.now() + timedelta(minutes=30)
        }
        
        # Generate reset link
        # Generate reset link
        base_url = request.headers.get('Origin', 'http://localhost:5173')
        reset_link = f'{base_url}/reset-password?token={token}'
        
        # Send via n8n webhook (no credentials stored here!)
        try:
            n8n_webhook_url = settings.N8N_WEBHOOK_URL
            
            print(f'\n🔗 n8n Webhook URL: {n8n_webhook_url}')
            
            payload = {
                'email': email,
                'reset_link': reset_link,
                'subject': 'Password Reset Request',
                'message': f'Click the link below to reset your password:\n\n{reset_link}'
            }
            
            print(f'📤 Sending to n8n: {payload}')
            
            response = requests.post(n8n_webhook_url, json=payload, timeout=10)
            
            print(f'📥 n8n Response Status: {response.status_code}')
            print(f'📥 n8n Response Body: {response.text}')
            
            if response.status_code == 200:
                print(f'\n✅ Password reset email sent via n8n to: {email}\n')
            else:
                print(f'\n❌ n8n webhook failed with status {response.status_code}\n')
                
        except Exception as e:
            print(f'\n❌ Error calling n8n: {str(e)}')
            print(traceback.format_exc())
        
        return Response({'message': 'Password reset link sent to email'}, status=200)
        
    except Exception as e:
        print(f'\n❌ ERROR in forgot_password:')
        print(traceback.format_exc())
        return Response({'error': 'An error occurred'}, status=500)


@api_view(['POST'])
def reset_password(request):
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    
    if not token or not new_password:
        return Response({'error': 'Token and new password are required'}, status=400)
    
    # Hash the token to lookup
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    # Check if token exists and is valid
    if token_hash not in reset_tokens:
        return Response({'error': 'Invalid or expired reset link'}, status=400)
    
    token_data = reset_tokens[token_hash]
    
    # Check if token is expired
    if datetime.now() > token_data['expires']:
        del reset_tokens[token_hash]
        return Response({'error': 'Reset link has expired'}, status=400)
    
    email = token_data['email']
    
    try:
        teable_url = settings.TEABLE_USER_TABLE_URL
        teable_token = settings.TEABLE_API_TOKEN
        
        headers = {
            'Authorization': f'Bearer {teable_token}',
            'Content-Type': 'application/json'
        }
        
        # Get user record
        response = requests.get(teable_url, headers=headers)
        
        if response.status_code != 200:
            return Response({'error': 'Failed to fetch users'}, status=500)
        
        users = response.json().get('records', [])
        user_record = None
        
        for user in users:
            if user.get('fields', {}).get('Email', '').lower() == email.lower():
                user_record = user
                break
        
        if not user_record:
            return Response({'error': 'User not found'}, status=404)
        
        # Check password reset log table for most recent password
        try:
            log_url = settings.PASSWORD_RESET_LOG_URL
            if log_url:
                log_response = requests.get(log_url, headers=headers)
                if log_response.status_code == 200:
                    log_records = log_response.json().get('records', [])
                    # Find all password reset records for this email
                    user_logs = [r for r in log_records if r.get('fields', {}).get('Email') == email]
                    if user_logs:
                        # Sort by timestamp to get truly most recent
                        user_logs.sort(key=lambda x: x.get('fields', {}).get('Change Date and Time ', ''))
                        # Try both field names (with and without trailing space)
                        most_recent_fields = user_logs[-1].get('fields', {})
                        most_recent_password = most_recent_fields.get('Password ', '') or most_recent_fields.get('Password', '')
                        # Check if new password matches the decrypted password
                        decrypted_stored = decrypt_password(most_recent_password)
                        
                        # If decryption fails (e.g. old hashed password), try verifying as hash as fallback or skip
                        if decrypted_stored:
                            if decrypted_stored == new_password:
                                return Response({'error': 'Please use a different password. This password is already in use.'}, status=400)
                        # Fallback for old hashed passwords (optional, but good for transition)
                        # elif most_recent_password == new_password (for plain text) or handled elsewhere
        except Exception as e:
            print(f'⚠️ Exception checking password history: {e}')
            traceback.print_exc()
        
        # Also check current password in user table
        current_password = user_record.get('fields', {}).get('Password ', '')
        decrypted_current = decrypt_password(current_password)
        if decrypted_current and decrypted_current == new_password:
            return Response({'error': 'Please use a different password. This password is already in use.'}, status=400)
        
        # Update password in Teable
        record_id = user_record.get('id')
        
        print(f'\n✅ Email verified: {email}')
        print(f'📝 Logging password reset to table')
        
        # Log password reset to password reset table ONLY
        try:
            log_url = settings.PASSWORD_RESET_LOG_URL
            if not log_url:
                return Response({'error': 'Password reset log URL not configured'}, status=500)
            
            # Get current time in Pakistan timezone (PKT = UTC+5)
            pakistan_tz = pytz.timezone('Asia/Karachi')
            current_time_pkt = datetime.now(pakistan_tz).strftime('%Y-%m-%d %H:%M:%S')
            
            # Encrypt the password (two-way) so it can be decoded later
            encrypted_password = encrypt_password(new_password)
            
            log_payload = {
                "records": [
                    {
                        "fields": {
                            "Email": email,
                            "Password": encrypted_password,
                            "Verified Password": encrypted_password,
                            "Status": "Success",
                            "Change Date and Time ": current_time_pkt
                        }
                    }
                ]
            }
            
            print(f'📤 Log Payload: {log_payload}')
            log_response = requests.post(log_url, headers=headers, json=log_payload)
            print(f'📥 Log Response Status: {log_response.status_code}')
            print(f'📥 Log Response: {log_response.text}')
            
            if log_response.status_code not in [200, 201]:
                print(f'❌ Failed to log password reset')
                return Response({'error': 'Failed to log password reset'}, status=500)
            
            print(f'✅ Password reset logged successfully at {current_time_pkt}')
        except Exception as log_error:
            print(f'⚠️ Exception logging password reset: {log_error}')
            print(f'📋 Full traceback:')
            traceback.print_exc()
            return Response({'error': f'Failed to log password reset: {str(log_error)}'}, status=500)
        
        # Delete used token
        del reset_tokens[token_hash]
        
        print(f'\n✅ Password reset successfully for: {email}\n')
        
        return Response({'message': 'Password reset successfully'}, status=200)
        
    except Exception as e:
        print(f'\n❌ ERROR in reset_password:')
        print(traceback.format_exc())
        return Response({'error': 'An error occurred'}, status=500)
