from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Item
from .serializers import ItemSerializer
from api.password_reset_views import encrypt_password, decrypt_password


class ItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing items.
    Provides CRUD operations (Create, Read, Update, Delete).
    """
    queryset = Item.objects.all()
    serializer_class = ItemSerializer


@api_view(['GET'])
def health_check(request):
    """Simple health check endpoint."""
    return Response({
        'status': 'ok',
        'message': 'API is running successfully!'
    })


@api_view(['GET'])
def home(request):
    """Home page endpoint."""
    return Response({
        'message': 'Welcome to the API',
        'endpoints': {
            'health': '/api/health/',
            'items': '/api/items/',
            'admin': '/admin/',
            'create_user': '/api/users/create/'
        }
    })

import requests
import json
from django.conf import settings

@api_view(['POST'])
def create_user_proxy(request):
    """
    Proxy endpoint to create a user in Teable.
    """
    teable_url = settings.TEABLE_API_URL
    teable_token = settings.TEABLE_API_TOKEN
    
    if not teable_url or not teable_token:
        print("DEBUG: Missing credentials")
        return Response({'error': 'Server configuration error: Missing Teable credentials'}, status=500)
    
    # Map frontend data to Teable expected format
    # Frontend keys: name, email, password, role
    # Teable keys: "Username ", "Email", "Password ", "Role "
    try:
        data = request.data
        print(f"DEBUG: Proxing request to {teable_url}")
        
        payload = {
            "records": [
                {
                    "fields": {
                        "Username ": data.get('name'),
                        "Email": data.get('email'),
                        "Password ": encrypt_password(data.get('password')),
                        "Role ": data.get('role')
                    }
                }
            ]
        }
        
        headers = {
            'Authorization': f'Bearer {teable_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.post(teable_url, json=payload, headers=headers)
        print(f"DEBUG: Teable Status: {response.status_code}")
        print(f"DEBUG: Teable Response: {response.text}")
        
        if response.status_code in [200, 201]:
            return Response(response.json(), status=201)
        else:
            # Pass the details back to frontend
            return Response({'error': 'Failed to create user in Teable', 'details': response.text}, status=response.status_code)
            
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def list_users_proxy(request):
    """
    Proxy endpoint to list users from Teable.
    """
    teable_url = settings.TEABLE_API_URL
    teable_token = settings.TEABLE_API_TOKEN
    
    if not teable_url or not teable_token:
        return Response({'error': 'Server configuration error: Missing Teable credentials'}, status=500)
        
    headers = {
        'Authorization': f'Bearer {teable_token}',
        'Content-Type': 'application/json'
    }
    
    try:
        # Fetch all records
        response = requests.get(teable_url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            records = data.get('records', [])
            
            # Map Teable records to frontend User interface
            users = []
            for record in records:
                fields = record.get('fields', {})
                users.append({
                    'id': record.get('id'),
                    'name': fields.get('Username '), # Note the space
                    'email': fields.get('Email'),
                    'role': fields.get('Role ', 'user'), # Default to user
                    'createdAt': fields.get('Created Date and Time ', record.get('createdTime')) # Fallback to system time
                })
            
            return Response(users)
        else:
            return Response({'error': 'Failed to fetch users from Teable', 'details': response.text}, status=response.status_code)
            
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['DELETE'])
def delete_user_proxy(request, pk):
    """
    Proxy endpoint to delete a user in Teable.
    """
    teable_url = settings.TEABLE_API_URL
    teable_token = settings.TEABLE_API_TOKEN
    
    if not teable_url or not teable_token:
        return Response({'error': 'Server configuration error: Missing Teable credentials'}, status=500)
    
    # Teable expects param recordIds[] for delete
    headers = {
        'Authorization': f'Bearer {teable_token}',
        'Content-Type': 'application/json'
    }
    
    try:
        print(f"DEBUG: Attempting to delete user with PK: {pk}")
        # Teable requires array format for recordIds in query params: recordIds[]=rec...
        response = requests.delete(teable_url, params={'recordIds[]': pk}, headers=headers)
        print(f"DEBUG: Teable Delete Status: {response.status_code}")
        print(f"DEBUG: Teable Delete Response: {response.text}")
        
        if response.status_code in [200, 201]:
             return Response({'message': 'User deleted successfully'}, status=200)
        else:
             return Response({'error': 'Failed to delete user in Teable', 'details': response.text}, status=response.status_code)
             
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
def login_proxy(request):
    """
    Proxy endpoint to verify user credentials against Teable.
    """
    teable_url = settings.TEABLE_API_URL
    teable_token = settings.TEABLE_API_TOKEN
    
    if not teable_url or not teable_token:
        return Response({'error': 'Server configuration error: Missing Teable credentials'}, status=500)
    
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()
    
    if not username or not password:
        return Response({'error': 'Username and password are required'}, status=400)

    headers = {
        'Authorization': f'Bearer {teable_token}',
        'Content-Type': 'application/json'
    }
    
    debug_logs = []
    
    try:
        # Debugging environment - verify loading
        if not teable_url:
            debug_logs.append("CRITICAL: TEABLE_API_URL is missing or empty")
        if not teable_token:
            debug_logs.append("CRITICAL: TEABLE_API_TOKEN is missing or empty")
            
        debug_logs.append(f"login_proxy called for user: {username}")
        
        # Fetch records to find user
        # Note: For production, use server-side filtering. 
        # For now, fetching all and filtering in Python is reliable for the prototype.
        response = requests.get(teable_url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            records = data.get('records', [])
            debug_logs.append(f"Teable response 200. Records fetched: {len(records)}")
            
            if records:
                # Log available fields from the first record to check for naming issues
                first_fields = records[0].get('fields', {}).keys()
                debug_logs.append(f"Available fields in first record: {list(first_fields)}")
                
                # Log all emails found (temporarily for debugging)
                found_emails = [r.get('fields', {}).get('Email') for r in records]
                debug_logs.append(f"Emails in DB: {found_emails}")
            
            user_found = None
            for record in records:
                fields = record.get('fields', {})
                # Check against Email field instead of Username
                db_email = fields.get('Email')
                db_password = fields.get('Password ')
                
                if db_email and db_email.lower() == username.lower():
                    debug_logs.append(f"Found user with email: {db_email}")
                    
                    # -----------------------------------------------------
                    # Check Password Reset Log Table for newer password
                    # -----------------------------------------------------
                    actual_password_to_check = db_password # Default to main table password
                    debug_logs.append(f"Main table password present: {bool(db_password)}")
                    
                    try:
                        log_url = settings.PASSWORD_RESET_LOG_URL
                        if log_url:
                            log_resp = requests.get(log_url, headers=headers)
                            if log_resp.status_code == 200:
                                log_recs = log_resp.json().get('records', [])
                                # Find logs for this email
                                user_logs = [r for r in log_recs if r.get('fields', {}).get('Email') == db_email]
                                if user_logs:
                                    # Sort by time to get latest
                                    user_logs.sort(key=lambda x: x.get('fields', {}).get('Change Date and Time ', ''))
                                    latest_log = user_logs[-1]
                                    # Get password from log
                                    latest_log_pass = latest_log.get('fields', {}).get('Password')
                                    if latest_log_pass:
                                        actual_password_to_check = latest_log_pass
                                        debug_logs.append("Using password from Reset Log table")
                    except Exception as e:
                        debug_logs.append(f"WARN: Failed to check password log: {e}")
                        pass
                    
                    # -----------------------------------------------------

                    # Decrypt the stored password for comparison
                    decrypted_db_pass = decrypt_password(actual_password_to_check)
                    debug_logs.append(f"Decryption result: {'Success' if decrypted_db_pass else 'Failed/None'}")
                    
                    match = False
                    if decrypted_db_pass:
                         # It was encrypted, check against input
                         if decrypted_db_pass == password:
                             match = True
                             debug_logs.append("Password matched via decryption")
                         else: 
                             debug_logs.append("Password mismatch (Decrypted)")
                    else:
                         # Fallback: Check if it matches as plain text (legacy support)
                         if actual_password_to_check == password:
                             match = True
                             debug_logs.append("Password matched via plain text fallback")
                         else:
                             debug_logs.append("Password mismatch (Plain Text)")
                    
                    if match:
                        user_found = {
                            'id': record.get('id'),
                            'name': fields.get('Username ', db_email.split('@')[0]),
                            'email': db_email,
                            'role': fields.get('Role ', 'user')
                        }
                        break
            
            if user_found:
                return Response({'message': 'Login successful', 'user': user_found}, status=200)
            else:
                return Response({'error': 'Invalid credentials', 'debug_log': debug_logs}, status=401)
        else:
            return Response({'error': 'Failed to query Teable', 'details': response.text, 'debug_log': debug_logs}, status=response.status_code)
            
    except Exception as e:
        import traceback
        print("CRITICAL ERROR IN LOGIN_PROXY:")
        traceback.print_exc()
        return Response({'error': f'Internal Server Error: {str(e)}'}, status=500)
@api_view(['PATCH'])
def update_user_proxy(request, pk):
    """
    Proxy endpoint to update a user in Teable.
    """
    teable_url = settings.TEABLE_API_URL
    teable_token = settings.TEABLE_API_TOKEN
    
    if not teable_url or not teable_token:
        return Response({'error': 'Server configuration error: Missing Teable credentials'}, status=500)
    
    headers = {
        'Authorization': f'Bearer {teable_token}',
        'Content-Type': 'application/json'
    }
    
    try:
        data = request.data
        print(f"DEBUG: Attempting to update user with PK: {pk}")
        print(f"DEBUG: Received data: {data}")
        
        # Teable update payload
        payload = {
            "records": [
                {
                    "id": pk,
                    "fields": {
                        "Username ": data.get('name'),
                        "Email": data.get('email'),
                        "Role ": data.get('role')
                    }
                }
            ]
        }
        
        # Only include fields that are present in the request to avoid overwriting with None
        fields_to_update = {}
        if 'name' in data:
            fields_to_update['Username '] = data['name']
        if 'email' in data:
            fields_to_update['Email'] = data['email']
        if 'role' in data:
            fields_to_update['Role '] = data['role']
            
        if not fields_to_update:
             return Response({'error': 'No valid fields to update'}, status=400)

        payload['records'][0]['fields'] = fields_to_update
        
        # Requests doesn't support PATCH by default for some reason? No, it does.
        # However, Teable/Airtable usually use PATCH on the table URL to update records.
        response = requests.patch(teable_url, json=payload, headers=headers)
        print(f"DEBUG: Teable Update Status: {response.status_code}")
        print(f"DEBUG: Teable Update Response: {response.text}")
        
        if response.status_code in [200, 201]:
             return Response(response.json(), status=200)
        else:
             return Response({'error': 'Failed to update user in Teable', 'details': response.text}, status=response.status_code)
             
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
def reset_password_proxy(request):
    """
    Proxy endpoint to create a password reset record in Teable.
    """
    # Specific URL for password reset table
    target_url = "https://teable.namuve.com/api/table/tblBP1oph44vTnuDSuN/record"
    
    teable_token = settings.TEABLE_API_TOKEN
    
    if not teable_token:
         return Response({'error': 'Server configuration error: Missing Teable credentials'}, status=500)

    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()
    verify_password = request.data.get('verify_password', '').strip()
    
    if not username or not password or not verify_password:
        return Response({'error': 'All fields are required'}, status=400)
    
    if password != verify_password:
        return Response({'error': 'Passwords do not match'}, status=400)

    if password != verify_password:
        return Response({'error': 'Passwords do not match'}, status=400)

    # 1. Verify user exists in the main database
    main_table_url = settings.TEABLE_API_URL
    headers = {
        'Authorization': f'Bearer {teable_token}',
        'Content-Type': 'application/json'
    }
    
    user_exists = False
    user_record_id = None
    
    try:
        print(f"DEBUG: Verifying user existence for: {username}")
        # Fetch records to find user
        check_response = requests.get(main_table_url, headers=headers)
        
        if check_response.status_code == 200:
            data = check_response.json()
            records = data.get('records', [])
            
            for record in records:
                fields = record.get('fields', {})
                # Check against 'Username ' (with space as noted in other views)
                db_username = fields.get('Username ')
                if db_username == username:
                    user_exists = True
                    user_record_id = record.get('id')
                    break
        else:
            print(f"DEBUG: Failed to fetch users for verification: {check_response.text}")
            return Response({'error': 'System error: Could not verify user'}, status=500)
            
    except Exception as e:
        print(f"DEBUG: Verification exception: {str(e)}")
        return Response({'error': f'System error: {str(e)}'}, status=500)

    if not user_exists or not user_record_id:
        print(f"DEBUG: User '{username}' not found.")
        return Response({'error': 'Username not found in our records'}, status=404)

    # 2. Update the password in the MAIN user table
    try:
        print(f"DEBUG: Updating password for user ID: {user_record_id}")
        update_payload = {
            "records": [
                {
                    "id": user_record_id,
                    "fields": {
                        "Password ": password
                    }
                }
            ]
        }
        
        update_response = requests.patch(main_table_url, json=update_payload, headers=headers)
        
        if update_response.status_code not in [200, 201]:
             print(f"DEBUG: Failed to update password in main table. Status: {update_response.status_code}")
             # We might still want to log the request, or fail hard?
             # Let's fail hard for safety so they know it didn't work.
             return Response({'error': 'Failed to update password', 'details': update_response.text}, status=update_response.status_code)
             
    except Exception as e:
        print(f"DEBUG: Password update exception: {str(e)}")
        return Response({'error': f'Failed to update password: {str(e)}'}, status=500)

    # 3. Create record in Reset Password Table (Log)
    target_url = "https://teable.namuve.com/api/table/tblBP1oph44vTnuDSuN/record"
    payload = {
        "records": [
            {
                "fields": {
                    "Username": username,
                    "Password": password,
                    "Verified Password": verify_password,
                    "Status": "success" 
                }
            }
        ]
    }
    
    headers = {
        'Authorization': f'Bearer {teable_token}',
        'Content-Type': 'application/json'
    }
    
    try:
        print(f"DEBUG: Proxying reset password to {target_url}")
        # print(f"DEBUG: Payload: {payload}")
        response = requests.post(target_url, json=payload, headers=headers)
        print(f"DEBUG: Teable Status: {response.status_code}")
        print(f"DEBUG: Teable Response: {response.text}")
        
        if response.status_code in [200, 201]:
             return Response({'message': 'Password reset request submitted successfully. Status updated.'}, status=200)
        else:
             return Response({'error': 'Failed to submit reset request', 'details': response.text}, status=response.status_code)
             
    except Exception as e:
        print(f"DEBUG: Exception: {e}")
        return Response({'error': str(e)}, status=500)
