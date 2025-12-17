# Dynamic OTP-based password reset endpoints (No storage)
import os
import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .otp_manager import OTPManager

@api_view(['POST'])
def request_password_reset(request):
    """
    Step 1: Request password reset with email
    Generates deterministic TOTP secret from email (same email = same secret, no storage needed)
    """
    email = request.data.get('email', '').strip()
    
    if not email:
        return Response({'error': 'Email is required'}, status=400)
    
    # Verify email exists in Teable
    teable_base_url = os.getenv('TEABLE_API_URL')
    teable_token = os.getenv('TEABLE_API_TOKEN')
    
    headers = {
        'Authorization': f'Bearer {teable_token}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(teable_base_url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            records = data.get('records', [])
            
            user_found = False
            
            for record in records:
                fields = record.get('fields', {})
                db_email = fields.get('Email', '').strip()
                
                if db_email.lower() == email.lower():
                    user_found = True
                    break
            
            if not user_found:
                return Response({'error': 'Email not found'}, status=404)
            
            # Generate deterministic secret from email (always same for same email)
            secret = OTPManager.generate_deterministic_secret(email)
            print(f"DEBUG: Generated deterministic secret for {email}")
            
            # Generate QR code
            provisioning_uri = OTPManager.get_provisioning_uri(secret, email)
            qr_code_base64 = OTPManager.generate_qr_code(provisioning_uri)
            
            # Return secret and QR code (user can scan multiple times, always same QR)
            return Response({
                'message': 'Scan QR code with Google Authenticator (you only need to scan once)',
                'email': email,
                'secret': secret,
                'qr_code': qr_code_base64,
                'provisioning_uri': provisioning_uri
            }, status=200)
            
        else:
            return Response({'error': 'Failed to verify email'}, status=500)
            
    except Exception as e:
        print(f"DEBUG: Exception in request_password_reset: {str(e)}")
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
def verify_otp(request):
    """
    Step 2: Verify OTP from Google Authenticator (dynamic verification)
    """
    email = request.data.get('email', '').strip()
    otp = request.data.get('otp', '').strip()
    secret = request.data.get('secret', '').strip()  # Frontend sends secret back
    
    print(f"DEBUG verify_otp - email: '{email}', otp: '{otp}', secret: '{secret}'")
    print(f"DEBUG verify_otp - request.data: {request.data}")
    
    if not email or not otp or not secret:
        missing = []
        if not email:
            missing.append('email')
        if not otp:
            missing.append('otp')
        if not secret:
            missing.append('secret')
        error_msg = f'Missing fields: {", ".join(missing)}'
        print(f"DEBUG verify_otp - ERROR: {error_msg}")
        return Response({'error': error_msg}, status=400)
    
    # Verify OTP dynamically (no storage lookup)
    print(f"DEBUG verify_otp - Verifying OTP...")
    if OTPManager.verify_totp_token(secret, otp):
        print(f"DEBUG verify_otp - OTP verification SUCCESS")
        return Response({'message': 'OTP verified successfully'}, status=200)
    else:
        print(f"DEBUG verify_otp - OTP verification FAILED")
        return Response({'error': 'Invalid OTP'}, status=400)


@api_view(['POST'])
def reset_password_with_otp(request):
    """
    Step 3: Reset password after OTP verification (dynamic verification)
    """
    email = request.data.get('email', '').strip()
    otp = request.data.get('otp', '').strip()
    secret = request.data.get('secret', '').strip()  # Frontend sends secret
    password = request.data.get('password', '').strip()
    verify_password = request.data.get('verify_password', '').strip()
    
    if not all([email, otp, secret, password, verify_password]):
        return Response({'error': 'All fields are required'}, status=400)
    
    if password != verify_password:
        return Response({'error': 'Passwords do not match'}, status=400)
    
    # Verify OTP one more time before password reset
    if not OTPManager.verify_totp_token(secret, otp):
        return Response({'error': 'Invalid OTP. Please try again.'}, status=400)
    
    # Update password in Teable
    teable_base_url = os.getenv('TEABLE_API_URL')
    teable_token = os.getenv('TEABLE_API_TOKEN')
    
    headers = {
        'Authorization': f'Bearer {teable_token}',
        'Content-Type': 'application/json'
    }
    
    try:
        # Find user by email
        response = requests.get(teable_base_url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            records = data.get('records', [])
            
            user_found = False
            user_id = None
            
            for record in records:
                fields = record.get('fields', {})
                db_email = fields.get('Email', '').strip()
                
                if db_email.lower() == email.lower():
                    user_found = True
                    user_id = record.get('id')
                    break
            
            if not user_found:
                return Response({'error': 'User not found'}, status=404)
            
            # Update password only (no TOTP secret storage needed - deterministic generation)
            update_url = f"{teable_base_url}/{user_id}"
            update_payload = {
                "record": {
                    "fields": {
                        "Password ": password  # Note the space after "Password"
                    }
                }
            }
            
            update_response = requests.patch(update_url, json=update_payload, headers=headers)
            
            if update_response.status_code in [200, 201]:
                return Response({'message': 'Password reset successfully'}, status=200)
            else:
                print(f"DEBUG: Failed to update password. Status: {update_response.status_code}")
                print(f"DEBUG: Response: {update_response.text}")
                return Response({
                    'error': 'Failed to update password',
                    'details': update_response.text
                }, status=500)
        else:
            return Response({'error': 'Failed to find user'}, status=500)
            
    except Exception as e:
        print(f"DEBUG: Exception in reset_password_with_otp: {str(e)}")
        return Response({'error': str(e)}, status=500)
