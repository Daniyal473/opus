from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Item
from .serializers import ItemSerializer
import requests
import json
from django.conf import settings
from api.password_reset_views import encrypt_password, decrypt_password
from datetime import datetime, timedelta

# Teable Configuration
TEABLE_API_URL = 'https://teable.namuve.com/api/table/tblW8KQtEUKhIyY4ARm/record'
TEABLE_TOKEN = 'teable_accns9D6q7zXSzmnz8T_6yrrJPuyniWe1otvicokIDXoV3zHZJk9CiBkm1M/nIw='

class ItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Item model.
    """
    queryset = Item.objects.all()
    serializer_class = ItemSerializer

@api_view(['GET'])
def health_check(request):

    """
    Health check endpoint.
    """
    return Response({'status': 'ok'})

@api_view(['GET'])
def get_apartment_data(request):
    try:
        response = requests.get(TEABLE_API_URL, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}'
        })
        response.raise_for_status()
        return Response(response.json())
    except requests.RequestException as e:
        print(f"Error fetching data from Teable: {e}")
        return Response({'error': 'Failed to fetch data from Teable'}, status=500)

@api_view(['GET'])
def get_ticket_options(request):
    TEABLE_TICKET_OPTIONS_URL = 'https://teable.namuve.com/api/table/tblsmAcWaXQO3pBKIW1/record'
    try:
        response = requests.get(TEABLE_TICKET_OPTIONS_URL, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}'
        })
        response.raise_for_status()
        data = response.json()
        
        # Transform the data to a simple list of options if necessary, or pass through
        # meaningful structure. The user wants "Guest" and "Foodpanda".
        # Based on probe: records -> fields -> Type
        
        options = []
        for record in data.get('records', []):
            if 'Type' in record.get('fields', {}):
                options.append(record['fields']['Type'])
                
        # Remove duplicates if any
        options = list(set(options))
        
        return Response({'options': options})
    except requests.RequestException as e:
        print(f"Error fetching ticket options from Teable: {e}")
        return Response({'error': 'Failed to fetch ticket options'}, status=500)

@api_view(['GET'])
def get_maintenance_options(request):
    TEABLE_MAINTENANCE_URL = 'https://teable.namuve.com/api/table/tbl0LE97iFDVS5RlXoo/record'
    try:
        response = requests.get(TEABLE_MAINTENANCE_URL, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}'
        })
        response.raise_for_status()
        data = response.json()
        
        options = []
        for record in data.get('records', []):
            if 'Type' in record.get('fields', {}):
                options.append(record['fields']['Type'])
                
        # Remove duplicates if any
        options = list(set(options))
        
        return Response({'options': options})
    except requests.RequestException as e:
        print(f"Error fetching maintenance options from Teable: {e}")
        return Response({'error': 'Failed to fetch maintenance options'}, status=500)

@api_view(['GET'])
def get_agents(request):
    TEABLE_AGENTS_URL = 'https://teable.namuve.com/api/table/tbl9sp7R28EfuHajL7d/record'
    try:
        response = requests.get(TEABLE_AGENTS_URL, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}'
        })
        response.raise_for_status()
        data = response.json()
        
        agents = []
        for record in data.get('records', []):
            if 'Agent' in record.get('fields', {}):
                agents.append(record['fields']['Agent'])
                
        # Remove duplicates if any
        agents = list(set(agents))
        
        return Response({'agents': agents})
    except requests.RequestException as e:
        print(f"Error fetching agents from Teable: {e}")
        return Response({'error': 'Failed to fetch agents'}, status=500)

def log_ticket_action(action, status_val, apartment_number, ticket_type=None, ticket_id=None, username=None, managed_by="System", record_id=None):
    """
    Logs ticket actions to the specific Teable table.
    """
    LOG_URL = 'https://teable.namuve.com/api/table/tblgBUXf5G1HdpzxXiW/record'
    try:
        # Avoid creating empty records if critical info is missing
        if not apartment_number:
            print("Warning: Skipping log_ticket_action due to missing apartment_number")
            return 

        # Use Field Names directly (user provided name "Ticket Type")
        payload = {
            "records": [
                {
                    "fields": {
                        "Ticket Status": status_val,
                        "Apartment Number": str(apartment_number),
                        "Action": action,
                        "Ticket Type": ticket_type,
                        "Ticket ID": ticket_id,
                        "User": username,
                    }
                }
            ],
            "fieldKeyType": "name"
        }
        
        response = requests.post(LOG_URL, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}',
            'Content-Type': 'application/json'
        }, json=payload)
        
        if response.status_code not in [200, 201]:
             print(f"Failed to log ticket action: {response.text}")
        else:
             print(f"Logged ticket action: {action} for {apartment_number} by {username}")
             
        # N8N Webhook Logging
        # Sends the same logical data to the N8N workflow
        N8N_WEBHOOK_URL = "https://n8n.namuve.com/webhook/997cf0f9-5d64-4d0e-a064-57b413e95d22"
        n8n_payload = {
            "Ticket Status": status_val,
            "Apartment Number": str(apartment_number),
            "Action": action,
            "Ticket Type": ticket_type,
            "Ticket ID": ticket_id,
            "User": username,
            "Record ID": record_id,
        }
        
        try:
            # Note: Webhook requested GET, so passing data as query params
            n8n_response = requests.get(N8N_WEBHOOK_URL, params=n8n_payload)
            if n8n_response.status_code not in [200, 201]:
                 print(f"Failed to send to N8N: {n8n_response.text}")
            else:
                 print(f"Sent to N8N: {action} for {apartment_number}")
        except Exception as n8n_err:
             print(f"Error sending to N8N: {n8n_err}")

    except Exception as e:
        print(f"Error in log_ticket_action: {e}")

@api_view(['POST'])
def log_status_change(request):
    """
    Logs a status change to the activity table and n8n webhook.
    Called from frontend when ticket status is changed via dropdown.
    """
    try:
        data = request.data
        new_status = data.get('status')
        apartment_number = data.get('apartment_number')
        ticket_type = data.get('ticket_type')
        ticket_id = data.get('ticket_id')
        username = data.get('username')
        
        record_id = data.get('record_id')
        
        if not apartment_number or not new_status:
            return Response({'error': 'Missing required fields'}, status=400)
        
        log_ticket_action(
            action="Changed status of",
            status_val=new_status,
            apartment_number=apartment_number,
            ticket_type=ticket_type,
            ticket_id=ticket_id,
            username=username,
            record_id=record_id
        )
        
        return Response({'success': True}, status=200)
    except Exception as e:
        print(f"Error in log_status_change: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def get_ticket_activities(request):
    LOG_URL = 'https://teable.namuve.com/api/table/tblgBUXf5G1HdpzxXiW/record'
    try:
        # Filter for Today OR Yesterday (Asia/Karachi)
        filter_payload = {
            "conjunction": "or",
            "filterSet": [
                {
                    "fieldId": "Created Time",
                    "operator": "is",
                    "value": {
                        "mode": "today",
                        "timeZone": "Asia/Karachi"
                    }
                },
                {
                    "fieldId": "Created Time",
                    "operator": "is",
                    "value": {
                        "mode": "yesterday",
                        "timeZone": "Asia/Karachi"
                    }
                }
            ]
        }
        
        params = {
            'filter': json.dumps(filter_payload),
            'limit': 1000
        }

        response = requests.get(LOG_URL, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}',
        }, params=params)
        
        if response.status_code == 200:
            data = response.json()
            records = data.get('records', [])
            
            # Map fields safely
            # Field IDs: 
            # Status: fldMJxZZQB5psQrDxdr
            # Apt: fldn8lKxqW0d4hcgCwh
            # Action: fldO7TD4Ygu9xg8y8SL
            
            activity_log = []
            for record in records:
                fields = record.get('fields', {})
                activity_log.append({
                    'id': record.get('id'),
                    'status': fields.get('Ticket Status') or fields.get('fldMJxZZQB5psQrDxdr', 'Unknown'),
                    'apartment': fields.get('Apartment Number') or fields.get('fldn8lKxqW0d4hcgCwh', 'Unknown'),
                    'action': fields.get('Action') or fields.get('fldO7TD4Ygu9xg8y8SL', 'Unknown'),
                    'ticketType': fields.get('Ticket Type', 'Unknown'),
                    'ticketId': fields.get('Ticket ID', 'Unknown'),
                    'username': fields.get('User', None),
                    # Teable returns createdTime in record meta if not in fields, usually
                    'createdTime': record.get('createdTime') 
                })
            
            # Sort by createdTime desc (newest first)
            activity_log.sort(key=lambda x: x['createdTime'] or '', reverse=True)
            
            return Response({'activities': activity_log})
        else:
            return Response({'error': 'Failed to fetch activities'}, status=500)
            
    except Exception as e:
        print(f"Error fetching ticket activities: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
def create_ticket(request):
    TEABLE_CREATE_URL = 'https://teable.namuve.com/api/table/tblt7O90EhETDjXraHk/record'
    TEABLE_GUESTS_URL = 'https://teable.namuve.com/api/table/tblRmHEtBZSwi7HoTCz/record'
    TEABLE_VISIT_URL = 'https://teable.namuve.com/api/table/tbl2D1gLavfJn6GMe0o/record'
    TEABLE_MAINTENANCE_URL = 'https://teable.namuve.com/api/table/tblxBUElSacHNStAJU2/record'
    TEABLE_UPLOAD_URL = 'https://teable.namuve.com/api/attachment/upload'

    try:
        # Extract data from request (supports both JSON and FormData)
        data = request.data
        
        # Primary Ticket Data
        apartment_id = data.get('apartment_id') 
        ticket_type = data.get('type')
        title = data.get('title')
        purpose = data.get('purpose')
        priority = data.get('priority')
        arrival = data.get('arrival')
        departure = data.get('departure')
        departure = data.get('departure')
        occupancy = data.get('occupancy')
        parking = data.get('parking')

        # 1. Create the Main Ticket (Standard Flow)
        try:
            apartment_id_int = int(apartment_id) if apartment_id else None
        except (ValueError, TypeError):
             apartment_id_int = None

        # If there's a visit_subtype or maintenance_subtype, set the main ticket type accordingly
        visit_subtype = data.get('visit_subtype')
        maintenance_subtype = data.get('maintenance_subtype')
        
        if visit_subtype:
            main_ticket_type = 'Visit'
        elif maintenance_subtype:
            main_ticket_type = 'Maintenance'
        else:
            main_ticket_type = ticket_type

        fields = {
            "Apartment ID ": apartment_id_int, # Note: trailing space in field name
            "Ticket Type": main_ticket_type,
            "Purpose": purpose,
            "Title": title,
            "Priority": priority,
            "Status ": "Open",
        }
        
        if arrival and arrival != 'undefined': fields["Arrival"] = arrival
        if departure and departure != 'undefined': fields["Departure"] = departure
        if occupancy:
             try:
                 fields["Occupancy"] = int(occupancy)
             except (ValueError, TypeError):
                 pass
        
        if parking and parking != 'undefined': fields["Parking"] = parking

        payload = {
            "records": [{"fields": fields}],
            "fieldKeyType": "name"
        }

        # Send to Teable (Ticket Table)
        response = requests.post(TEABLE_CREATE_URL, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}',
             'Content-Type': 'application/json'
        }, json=payload)
        response.raise_for_status()
        ticket_response_data = response.json()
        
        # 2. Handle 'In/Out' Guests (Separate Flow)
        if ticket_type == 'In/Out':
            # Extract the created Ticket ID (AutoNumber) from the response
            # Response linkage: records[0].fields['ID ']
            created_ticket_id = None
            if ticket_response_data and 'records' in ticket_response_data and len(ticket_response_data['records']) > 0:
                created_ticket_id = ticket_response_data['records'][0]['fields'].get('ID ')
            
            guests_data_json = data.get('guests_data')
            if guests_data_json:
                try:
                    guests = json.loads(guests_data_json) # Parse JSON string
                    
                    # 1. Prepare Guest Records (without attachments initially)
                    guest_records_payload = []
                    
                    for guest in guests:
                        # Use Field Names
                        guest_fields = {
                            "Name ": guest.get('name'), 
                            "CNIC / Passport": guest.get('cnic'),
                            "CNIC Expire": guest.get('cnicExpiry'),
                        }
                        
                        # Link to Ticket ID
                        if created_ticket_id:
                             try:
                                 guest_fields["Ticket ID "] = int(created_ticket_id) 
                             except:
                                 pass

                        guest_records_payload.append({"fields": guest_fields})

                    if guest_records_payload:
                        print(f"Creating {len(guest_records_payload)} guest records...")
                        guest_payload = {
                            "records": guest_records_payload,
                            "fieldKeyType": "name"
                        }
                        guest_response = requests.post(TEABLE_GUESTS_URL, headers={
                            'Authorization': f'Bearer {TEABLE_TOKEN}',
                            'Content-Type': 'application/json'
                        }, json=guest_payload)
                        guest_response.raise_for_status()
                        guest_response_data = guest_response.json()
                        print("Guest records created.")
                        
                        # 2. Upload Attachments to the created records
                        # Iterate through created records and original guest list assuming synchronous order
                        created_records = guest_response_data.get('records', [])
                        
                        # Verify lengths match to map 1:1
                        if len(created_records) == len(guests):
                            for index, record in enumerate(created_records):
                                record_id = record['id']
                                guest_index = index # Assuming order is preserved
                                
                                # Check for files for this guest index
                                for file_index in range(2): # Max 2 attachments
                                    file_key = f'guest_{guest_index}_attachment_{file_index}'
                                    if file_key in request.FILES:
                                        file_obj = request.FILES[file_key]
                                        
                                        # Upload to Record
                                        # Endpoint: /api/table/{tableId}/record/{recordId}/{fieldId}/uploadAttachment
                                        # Table: tblRmHEtBZSwi7HoTCz, Field: fldJdomUaG2ufpuQj45
                                        guest_table_id = "tblRmHEtBZSwi7HoTCz"
                                        attachment_field_id = "fldJdomUaG2ufpuQj45"
                                        
                                        upload_url = f"https://teable.namuve.com/api/table/{guest_table_id}/record/{record_id}/{attachment_field_id}/uploadAttachment"
                                        
                                        try:
                                            files = {'file': (file_obj.name, file_obj, file_obj.content_type)}
                                            upload_res = requests.post(upload_url, headers={
                                                'Authorization': f'Bearer {TEABLE_TOKEN}'
                                            }, files=files)
                                            upload_res.raise_for_status()
                                            print(f"Uploaded attachment for Guest {record_id}")
                                        except Exception as e:
                                            print(f"Failed to upload attachment {file_key} to record {record_id}: {e}")
                        
                        # Refetch guest records? Or just return the creation response + note
                        # The user wants to see the records. The `guest_response_data` has the records *before* attachment upload.
                        # We could fetch them again if critical, or just return creation info.
                        # Usually creating implies success. The upload is an enhancement.
                        
                        if isinstance(ticket_response_data, dict):
                            ticket_response_data['guests_created'] = guest_response_data

                except Exception as e:
                    print(f"Error processing guests: {e}")
                    if isinstance(ticket_response_data, dict):
                        ticket_response_data['guest_error'] = str(e)
        
        # 3. Handle 'Visit' Tickets (Separate Flow)
        # Check if there's a visit_subtype (Guest, Foodpanda, etc.), which indicates a Visit ticket
        if visit_subtype:
            # Extract the created Ticket ID (AutoNumber) from the response
            created_ticket_id = None
            if ticket_response_data and 'records' in ticket_response_data and len(ticket_response_data['records']) > 0:
                created_ticket_id = ticket_response_data['records'][0]['fields'].get('ID ')
            
            guests_data_json = data.get('guests_data')
            if guests_data_json:
                try:
                    guests = json.loads(guests_data_json) # Parse JSON string
                    
                    # 1. Prepare Visitor Records (without attachments initially)
                    visitor_records_payload = []
                    
                    for guest in guests:
                        # Use Field Names for Visit table
                        visitor_fields = {
                            "Visitor Name": guest.get('name'),  # Note: different field name
                            "CNIC / Passport": guest.get('cnic'),
                            "CNIC Expire": guest.get('cnicExpiry'),
                            "Type": visit_subtype,  # Use the actual selection (Guest, Foodpanda, etc.)
                        }
                        
                        # Link to Ticket ID
                        if created_ticket_id:
                             try:
                                 visitor_fields["Ticket ID "] = int(created_ticket_id) 
                             except:
                                 pass

                        visitor_records_payload.append({"fields": visitor_fields})

                    if visitor_records_payload:
                        print(f"Creating {len(visitor_records_payload)} visitor records...")
                        visitor_payload = {
                            "records": visitor_records_payload,
                            "fieldKeyType": "name"
                        }
                        visitor_response = requests.post(TEABLE_VISIT_URL, headers={
                            'Authorization': f'Bearer {TEABLE_TOKEN}',
                            'Content-Type': 'application/json'
                        }, json=visitor_payload)
                        visitor_response.raise_for_status()
                        visitor_response_data = visitor_response.json()
                        print("Visitor records created.")
                        
                        # 2. Upload Attachments to the created records
                        created_records = visitor_response_data.get('records', [])
                        
                        # Verify lengths match to map 1:1
                        if len(created_records) == len(guests):
                            for index, record in enumerate(created_records):
                                record_id = record['id']
                                guest_index = index
                                
                                # Check for files for this visitor index
                                for file_index in range(2): # Max 2 attachments
                                    file_key = f'guest_{guest_index}_attachment_{file_index}'
                                    if file_key in request.FILES:
                                        file_obj = request.FILES[file_key]
                                        
                                        # Upload to Visit Record
                                        # Table: tbl2D1gLavfJn6GMe0o, Field: fldqdP9sU0QwBmf6An8
                                        visit_table_id = "tbl2D1gLavfJn6GMe0o"
                                        attachment_field_id = "fldqdP9sU0QwBmf6An8"
                                        
                                        upload_url = f"https://teable.namuve.com/api/table/{visit_table_id}/record/{record_id}/{attachment_field_id}/uploadAttachment"
                                        
                                        try:
                                            files = {'file': (file_obj.name, file_obj, file_obj.content_type)}
                                            upload_res = requests.post(upload_url, headers={
                                                'Authorization': f'Bearer {TEABLE_TOKEN}'
                                            }, files=files)
                                            upload_res.raise_for_status()
                                            print(f"Uploaded attachment for Visitor {record_id}")
                                        except Exception as e:
                                            print(f"Failed to upload attachment {file_key} to visitor record {record_id}: {e}")
                        
                        if isinstance(ticket_response_data, dict):
                            ticket_response_data['visitors_created'] = visitor_response_data

                except Exception as e:
                    print(f"Error processing visitors: {e}")
                    if isinstance(ticket_response_data, dict):
                        ticket_response_data['visitor_error'] = str(e)
        
        # 4. Handle 'Maintenance' Tickets (similar to Visit)
        # Check if there's a maintenance_subtype, which indicates a Maintenance ticket
        if maintenance_subtype:
            # Extract the created Ticket ID
            created_ticket_id = None
            if ticket_response_data and 'records' in ticket_response_data and len(ticket_response_data['records']) > 0:
                created_ticket_id = ticket_response_data['records'][0]['fields'].get('ID ')
            
            # Get the agent from the request
            # maintenance_subtype is already extracted
            agent = data.get('agent')  # Agent assigned to this maintenance
            if agent:
                 print(f"Received Agent: {agent}")
            
            guests_data_json = data.get('guests_data')
            if guests_data_json:
                try:
                    guests = json.loads(guests_data_json)  # Reuse guests_data for worker info
                    
                    # 1. Prepare Worker Records (without attachments initially)
                    worker_records_payload = []
                    
                    for guest in guests:
                        # Use Field Names for Maintenance table
                        worker_fields = {
                            "Name": guest.get('name'),  # Worker/contractor name
                            "CNIC": guest.get('cnic'),
                            "CNIC Expire": guest.get('cnicExpiry'),
                            "Type": maintenance_subtype,  # Maintenance type
                        }
                        
                        # Add Agent if provided
                        if agent:
                            worker_fields["Agent"] = agent
                        
                        # Link to Ticket ID (note trailing space in field name)
                        if created_ticket_id:
                            try:
                                worker_fields["Ticket ID "] = int(created_ticket_id)
                            except:
                                pass

                        worker_records_payload.append({"fields": worker_fields})

                    if worker_records_payload:
                        print(f"Creating {len(worker_records_payload)} worker records...")
                        worker_payload = {
                            "records": worker_records_payload,
                            "fieldKeyType": "name"
                        }
                        worker_response = requests.post(TEABLE_MAINTENANCE_URL, headers={
                            'Authorization': f'Bearer {TEABLE_TOKEN}',
                            'Content-Type': 'application/json'
                        }, json=worker_payload)
                        worker_response.raise_for_status()
                        worker_response_data = worker_response.json()
                        print("Worker records created.")
                        
                        # 2. Upload Attachments to the created records
                        created_records = worker_response_data.get('records', [])
                        
                        if len(created_records) == len(guests):
                            for index, record in enumerate(created_records):
                                record_id = record['id']
                                guest_index = index
                                
                                # Check for files for this worker index
                                for file_index in range(2):  # Max 2 attachments
                                    file_key = f'guest_{guest_index}_attachment_{file_index}'
                                    if file_key in request.FILES:
                                        file_obj = request.FILES[file_key]
                                        
                                        # Upload to Maintenance Record
                                        # Table: tblxBUElSacHNStAJU2, Field: fldfyMH1DGwYsJlzTGy
                                        maintenance_table_id = "tblxBUElSacHNStAJU2"
                                        attachment_field_id = "fldfyMH1DGwYsJlzTGy"
                                        
                                        upload_url = f"https://teable.namuve.com/api/table/{maintenance_table_id}/record/{record_id}/{attachment_field_id}/uploadAttachment"
                                        
                                        try:
                                            files = {'file': (file_obj.name, file_obj, file_obj.content_type)}
                                            upload_res = requests.post(upload_url, headers={
                                                'Authorization': f'Bearer {TEABLE_TOKEN}'
                                            }, files=files)
                                            upload_res.raise_for_status()
                                            print(f"Uploaded attachment for Worker {record_id}")
                                        except Exception as e:
                                            print(f"Failed to upload attachment {file_key} to worker record {record_id}: {e}")
                        
                        if isinstance(ticket_response_data, dict):
                            ticket_response_data['workers_created'] = worker_response_data

                except Exception as e:
                    print(f"Error processing workers: {e}")
                    if isinstance(ticket_response_data, dict):
                        ticket_response_data['worker_error'] = str(e)

        # Re-fetch the created record to ensure we get computed fields like 'ID ' (Ticket ID)
        # Teable often doesn't return computed fields in the immediate POST response.
        new_ticket_id = None
        record_id = None
        if ticket_response_data and 'records' in ticket_response_data and len(ticket_response_data['records']) > 0:
             record_id = ticket_response_data['records'][0]['id']
             try:
                 refetch_url = f"{TEABLE_CREATE_URL}/{record_id}"
                 print(f"Refetching new ticket {record_id} to get computed fields...")
                 refetch_res = requests.get(refetch_url, headers={
                        'Authorization': f'Bearer {TEABLE_TOKEN}'
                 })
                 if refetch_res.status_code == 200:
                      # GET /record/{id} returns the single record object directly: { "id": "...", "fields": { ... } }
                      # We want to maintain consistency for frontend which might expect { records: [...] } from POST,
                      # BUT my frontend logic in PropertySidebar handles `data.id` (single record) or `data.records`.
                      # So passing the single record back is fine, OR we wrap it.
                      # Let's wrap it to strictly match the "records" array format if that was the original shape, 
                      # but for logging extracting ID is easier from single.
                      
                      single_record = refetch_res.json()
                      # Update local var for logging
                      new_ticket_id = single_record.get('fields', {}).get('ID ')
                      
                      # Update response data to include this single record as a list to match expected "records" shape if possible,
                      # or just return the single record if our frontend handles it.
                      # Frontend `PropertySidebar` handles `data.records` OR `data.id`.
                      # So returning the single record is compatible and cleaner.
                      ticket_response_data = single_record
                      
             except Exception as rx:
                 print(f"Refetch failed: {rx}")
                 # Fallback to whatever we had
                 new_ticket_id = ticket_response_data['records'][0]['fields'].get('ID ')

        # LOGGING ACTION: Ticket Created
        # Try to get apartment_number from request, or fallback to something else if needed
        # Frontend should send 'apartment_number'
        apt_num_log = data.get('apartment_number')
        
        if apt_num_log:
             log_ticket_action("Created", "Open", apt_num_log, ticket_type=main_ticket_type, ticket_id=str(new_ticket_id) if new_ticket_id else None, username=data.get('username'), record_id=record_id)
        # else:
             # print("LOGGING SKIPPED: ...")

        return Response(ticket_response_data, status=201)



    except requests.RequestException as e:
        print(f"Error creating ticket in Teable: {e}")
        error_msg = f"Failed to create ticket: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
             error_msg += f" | Details: {e.response.text}"
        return Response({'error': error_msg}, status=500)
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': f"Unexpected error: {str(e)}"}, status=500)

@api_view(['GET'])
def get_tickets(request):
    TEABLE_TICKETS_URL = 'https://teable.namuve.com/api/table/tblt7O90EhETDjXraHk/record'
    try:
        # Check for apartment_id filter
        apartment_id = request.query_params.get('apartment_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Construct Teable filter JSON
        params = {}
        filter_conditions = []
        
        if apartment_id:
             # Add Apartment ID filter
             # Apartment ID is a number field
             try:
                 apt_id_val = int(apartment_id)
                 filter_conditions.append({
                     "fieldId": "Apartment ID ",
                     "operator": "is",
                     "value": apt_id_val
                 })
             except ValueError:
                 pass # Invalid ID format, ignore filter or handle error

        if start_date and end_date:
            # Construct Teable filter JSON
            # The user is in Asia/Karachi (GMT+5).
            # The 'start_date' and 'end_date' from frontend are YYYY-MM-DD strings.
            # We want to filter from 00:00:00 (Start Date) to 23:59:59 (End Date) in Karachi time.
            # Since we send UTC timestamps to Teable (ending in Z), we must convert Karachi time to UTC.
            # Karachi is UTC+5. So:
            # Start: 00:00 Karachi -> Previous Day 19:00 UTC
            # End: 23:59:59 Karachi -> Same Day 18:59:59 UTC
            
            # Simple string parsing since format is fixed YYYY-MM-DD
            try:
                # Naive Start/End
                dt_start = datetime.strptime(start_date, '%Y-%m-%d')
                dt_end = datetime.strptime(end_date, '%Y-%m-%d')
                
                # Set times
                dt_start = dt_start.replace(hour=0, minute=0, second=0)
                dt_end = dt_end.replace(hour=23, minute=59, second=59)
                
                # Adjust for GMT+5 (Subtract 5 hours)
                dt_start_utc = dt_start - timedelta(hours=5)
                dt_end_utc = dt_end - timedelta(hours=5)
                
                # Format to ISO string with Z
                start_iso = dt_start_utc.isoformat(timespec='milliseconds') + 'Z'
                end_iso = dt_end_utc.isoformat(timespec='milliseconds') + 'Z'
            except ValueError:
                # Fallback in case of parsing error, though standard date input should be consistent
                start_iso = f"{start_date}T00:00:00.000Z"
                end_iso = f"{end_date}T23:59:59.000Z"

            filter_conditions.append({
                "fieldId": "Created Time ",
                "operator": "isOnOrAfter",
                "value": {
                    "mode": "exactDate",
                    "exactDate": start_iso,
                    "timeZone": "Asia/Karachi"
                }
            })
            filter_conditions.append({
                "fieldId": "Created Time ",
                "operator": "isOnOrBefore",
                "value": {
                    "mode": "exactDate",
                    "exactDate": end_iso,
                    "timeZone": "Asia/Karachi"
                }
            })

        if filter_conditions:
            filter_payload = {
                "conjunction": "and",
                "filterSet": filter_conditions
            }
            params['filter'] = json.dumps(filter_payload)
            
        # Increase limit to ensure we get all tickets for the apartment
        params['limit'] = 1000

        response = requests.get(TEABLE_TICKETS_URL, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}'
        }, params=params)
        response.raise_for_status()
        data = response.json()
        
        tickets = []
        for record in data.get('records', []):
            fields = record.get('fields', {})
            
            # Filter by apartment_id if provided
            # Note: Apartment ID is stored as number in Teable
            if apartment_id:
                rec_apt_id = fields.get('Apartment ID ')
                # Handle both string and int comparison safely
                if str(rec_apt_id) != str(apartment_id):
                    continue
            
            # Map fields to frontend Ticket interface
            ticket = {
                'id': str(fields.get('ID ')), # Convert to string for frontend
                'type': fields.get('Ticket Type', 'Unknown'),
                'title': fields.get('Title', 'No Title'),
                'status': fields.get('Status ', 'Open'),
                'priority': fields.get('Priority', 'Low'),
                'created': fields.get('Created Time '),
                'description': fields.get('Purpose', ''),
                'arrival': fields.get('Arrival'),
                'departure': fields.get('Departure'),
                'occupancy': str(fields.get('Occupancy')) if fields.get('Occupancy') else None,
                'parking': fields.get('Parking'),
                'apartmentId': fields.get('Apartment ID '),
                'apartmentNumber': fields.get('Apartment Number '),
                'teableId': record.get('id'), # Teable Record ID for updates
            }
            tickets.append(ticket)
            
        # Sort by created date descending (newest first)
        tickets.sort(key=lambda x: x['created'] or '', reverse=True)
            
        return Response({'tickets': tickets})
    except requests.RequestException as e:
        print(f"Error fetching tickets from Teable: {e}")
        return Response({'error': 'Failed to fetch tickets'}, status=500)

@api_view(['GET'])
def get_parking_requests(request):
    TEABLE_TICKETS_URL = 'https://teable.namuve.com/api/table/tblt7O90EhETDjXraHk/record'
    try:
        # Construct Teable filter JSON based on user request
        
        # Updated Filter Logic to capture Staying Guests (spans) as well
        # Logic:
        # 1. Parking iNotEmpty
        # AND
        # 2. (
        #       (Arrival <= Today AND Departure >= Today)  <-- Covers Check-in, Staying, Check-out
        #       OR
        #       Status is Closed (As per original request mostly likely so lost data isnt hidden)
        #    )

        # Updated Filter Logic:
        # 1. Parking isNotEmpty
        # 2. Status is 'Approved' (User Requirement)
        # 3. Date Range (Active Today)

        filter_payload = {
            "conjunction": "and",
            "filterSet": [
                {
                    "fieldId": "Parking",
                    "operator": "isNotEmpty",
                    "value": None
                },
                {
                    "fieldId": "Status ",
                    "operator": "is",
                    "value": "Approved"
                },
                {
                    "conjunction": "and",
                    "filterSet": [
                        {
                            "fieldId": "Arrival",
                            "operator": "isOnOrBefore",
                            "value": {
                                "mode": "today",
                                "timeZone": "Asia/Karachi"
                            }
                        },
                        {
                            "fieldId": "Departure",
                            "operator": "isOnOrAfter",
                            "value": {
                                "mode": "today",
                                "timeZone": "Asia/Karachi"
                            }
                        }
                    ]
                }
            ]
        }
        
        params = {
            'filter': json.dumps(filter_payload),
            'limit': 1000
        }

        response = requests.get(TEABLE_TICKETS_URL, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}'
        }, params=params)
        response.raise_for_status()
        data = response.json()
        
        tickets = []
        for record in data.get('records', []):
            fields = record.get('fields', {})
            
            # Map fields to frontend Ticket interface
            ticket = {
                'id': str(fields.get('ID ')),
                'type': fields.get('Ticket Type', 'Unknown'),
                'title': fields.get('Title', 'No Title'),
                'status': fields.get('Status ', 'Open'),
                'priority': fields.get('Priority', 'Low'),
                'created': fields.get('Created Time '),
                'description': fields.get('Purpose', ''),
                'arrival': fields.get('Arrival'),
                'departure': fields.get('Departure'),
                'occupancy': str(fields.get('Occupancy')) if fields.get('Occupancy') else None,
                'parking': fields.get('Parking'),
                # Try 'Check In' as per user report. Fallback to others if needed.
                'checkIn': fields.get('Check In') or fields.get('Check In Time'),
                'checkOut': fields.get('Check Out') or fields.get('Check Out Time'),
                'parkingStatus': fields.get('Parking Status'),
                'apartmentId': fields.get('Apartment ID '),
                'apartmentNumber': fields.get('Apartment Number '),
                'teableId': record.get('id'),
            }
            tickets.append(ticket)
            
        tickets.sort(key=lambda x: x['created'] or '', reverse=True)
            
        return Response({'tickets': tickets})
    except requests.RequestException as e:
        print(f"Error fetching parking tickets from Teable: {e}")
        return Response({'error': 'Failed to fetch parking tickets'}, status=500)

@api_view(['POST'])
def create_parking_log(request):
    try:
        data = request.data
        
        # Mapping fields based on user request
        # Ticket ID: fldvlN0UlLSwtyaPcW4 (number)
        # Title: fldo5RydZB3Ulv8tIgn (text)
        # Apartment Number: fldA0euiR2xzJutZaIy (number)
        # Vehicle Number: fldVP0c5cW0IimBkS1a (text)
        # Action: fld1amjYtDznOxBTuWY (text)

        try:
            ticket_id_int = int(data.get('ticket_id'))
        except (ValueError, TypeError):
             return Response({'error': 'Invalid Ticket ID'}, status=400)

        # Apartment Number is text/string in Teable
        apt_num_str = str(data.get('apartment_number') or '')
        
        # Check for ticket type to decide which table to log to
        ticket_type = data.get('ticket_type')
        
        # Default Logic (Guest)
        url = "https://teable.namuve.com/api/table/tblIevhB46wb8bWHHCT/record"
        fields = {
            "Ticket ID": ticket_id_int,
            "Title": data.get('title'),
            "Apartment Number": apt_num_str,
             # Using provided ID for Vehicle Number
            "Vehicle Number": data.get('vehicle_number') or '',
            "Action": data.get('action')
        }
        
        # Owner / Management Logic
        if ticket_type and ticket_type.lower() in ['owner', 'management']:
             url = "https://teable.namuve.com/api/table/tblBb60CCuy1rRxvJOB/record"
             # This table does not have 'Ticket ID'. Using exact Field Names from schema.
             fields = {
                 "Title": data.get('title'),
                 "Apartment Number": apt_num_str,
                 "Vehicle Number": data.get('vehicle_number') or '',
                 "Action": data.get('action')
             }
        
        # Teable expects a 'records' array
        payload = {
            "records": [
                {
                    "fields": fields
                }
            ]
        }
        
        response = requests.post(url, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}',
             'Content-Type': 'application/json'
        }, json=payload)
        
        # Check if successful
        if response.status_code not in [200, 201]:
             print(f"Teable Error: {response.text}")
             print(f"Sent Payload: {json.dumps(payload)}")
             return Response({'error': f'Failed to create record in Teable: {response.text}'}, status=response.status_code)
             
        return Response(response.json())
        
    except Exception as e:
        print(f"Error creating parking log: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def get_parking_history(request, ticket_id):
    """
    Fetches parking history for a given Ticket ID (number).
    Table: tblIevhB46wb8bWHHCT
    """
    # Get type and title from query params
    ticket_type = request.GET.get('type')
    ticket_title = request.GET.get('title')
    
    # Default: Guest Table
    url = 'https://teable.namuve.com/api/table/tblIevhB46wb8bWHHCT/record'
    filter_field = "Ticket ID"
    filter_value = int(ticket_id) if str(ticket_id).isdigit() else ticket_id
    
    # Owner / Management Logic
    if ticket_type and ticket_type.lower() in ['owner', 'management']:
         url = 'https://teable.namuve.com/api/table/tblBb60CCuy1rRxvJOB/record'
         filter_field = "Title"
         # Use the passed title, or fallback to ticket_id if title is missing (unlikely if frontend works)
         filter_value = ticket_title if ticket_title else ticket_id

    try:
        # Search for records
        filter_payload = {
             "conjunction": "and",
             "filterSet": [
                 {
                     "fieldId": filter_field, 
                     "operator": "is",
                     "value": filter_value
                 }
             ]
        }
        
        search_params = {
            'filter': json.dumps(filter_payload),
            # 'orderBy': json.dumps([{ "field": "Created Time", "order": "desc" }]) # Optional: Teable might default to creation order
        }
        
        response = requests.get(url, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}'
        }, params=search_params)
        
        if response.status_code != 200:
             return Response({'error': 'Failed to fetch parking history'}, status=response.status_code)
             
        data = response.json()
        records = data.get('records', [])
        
        history = []
        for r in records:
            fields = r.get('fields', {})
            history.append({
                'id': r.get('id'),
                'action': fields.get('Action'),
                'time': fields.get('Created Time') or r.get('createdTime'), # Fallback to record metadata
                'vehicle': fields.get('Vehicle Number'),
                'apartment': fields.get('Apartment Number'),
                'title': fields.get('Title'),
                'ticketId': fields.get('Ticket ID')
            })
            
        # Sort manually by time desc just in case
        history.sort(key=lambda x: x['time'] or '', reverse=True)
            
        return Response(history)

    except Exception as e:
        print(f"Error fetching parking history: {e}")
        return Response({'error': str(e)}, status=500)

@api_view(['GET'])
def get_owner_management_parking(request):
    """
    Fetches Owner/Management parking data from tblxOJ4jVOhzRCcSA1h
    """
    TEABLE_OWNER_MGMT_URL = 'https://teable.namuve.com/api/table/tblxOJ4jVOhzRCcSA1h/record'
    
    try:
        response = requests.get(TEABLE_OWNER_MGMT_URL, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}'
        })
        
        if response.status_code != 200:
            return Response({'error': 'Failed to fetch owner/management parking'}, status=response.status_code)
        
        data = response.json()
        records = data.get('records', [])
        
        tickets = []
        for record in records:
            fields = record.get('fields', {})
            
            # Map fields from the Owner/Management table
            ticket = {
                'id': fields.get('ID'),  # Auto number ID
                'teableId': record.get('id'),  # Teable record ID
                'title': fields.get('Title', ''),
                'parking': fields.get('Parking', ''),
                'parkingStatus': fields.get('Parking Status', ''),
                'type': fields.get('Type', ''),  # Owner or Management
                'apartmentId': fields.get('Apartment Number', ''),
                'created': fields.get('Created time') or record.get('createdTime'),
                # Set dummy values for fields that don't exist in this table
                'arrival': None,
                'departure': None,
                'checkIn': None,
                'checkOut': None,
                'status': 'Active'  # Default status
            }
            tickets.append(ticket)
        
        return Response({'tickets': tickets})
        
    except Exception as e:
        print(f"Error fetching owner/management parking: {e}")
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def get_linked_records(request):
    try:
        ticket_id = request.query_params.get('ticket_id')
        ticket_type = request.query_params.get('type')
        
        if not ticket_id:
             return Response({'error': 'Ticket ID is required'}, status=400)

        # Determine which table to query based on ticket type
        if ticket_type == 'In/Out':
             # Guest Table
             TEABLE_URL = 'https://teable.namuve.com/api/table/tblRmHEtBZSwi7HoTCz/record'
             # Search using query params list for multiple 'search' keys
             # params = {'search': [ticket_id, 'Ticket ID ', 'true']} # Requests handles lists correctly for multiple keys
             params = [
                 ('search', ticket_id),
                 ('search', 'Ticket ID '), 
                 ('search', 'true')
             ]
             
             response = requests.get(TEABLE_URL, params=params, headers={
                 'Authorization': f'Bearer {TEABLE_TOKEN}'
             })
             response.raise_for_status()
             data = response.json()
             
             records = []
             for record in data.get('records', []):
                 fields = record.get('fields', {})
                 
                 # Strict Filter: Ensure Ticket ID matches exactly (API 'search' can be fuzzy)
                 rec_ticket_id = fields.get('Ticket ID ')
                 if str(rec_ticket_id) != str(ticket_id):
                     continue
                 
                 # Process attachments to ensure 'url' is present (map from presignedUrl)
                 raw_attachments = fields.get('Attachments') or []
                 processed_attachments = []
                 for att in raw_attachments:
                     # Keep all original fields (path, token, etc.) for write-back compatibility
                     mapped_att = att.copy()
                     mapped_att['url'] = att.get('presignedUrl')
                     mapped_att['type'] = att.get('mimetype')
                     processed_attachments.append(mapped_att)

                 records.append({
                     'id': record.get('id'),
                     'name': fields.get('Name '),
                     'cnic': fields.get('CNIC / Passport'),
                     'cnicExpiry': fields.get('CNIC Expire'),
                     'checkInDate': fields.get('Check in Date '),
                     'checkOutDate': fields.get('Check out Date '),
                     'attachments': processed_attachments,
                 })
                 
             return Response({'records': records})
             
             return Response({'records': records})
             
        elif ticket_type == 'Visit':
             # Visit Table
             TEABLE_URL = 'https://teable.namuve.com/api/table/tbl2D1gLavfJn6GMe0o/record'
             params = [
                 ('search', ticket_id),
                 ('search', 'Ticket ID '), 
                 ('search', 'true')
             ]
             
             response = requests.get(TEABLE_URL, params=params, headers={
                 'Authorization': f'Bearer {TEABLE_TOKEN}'
             })
             response.raise_for_status()
             data = response.json()
             
             records = []
             for record in data.get('records', []):
                 fields = record.get('fields', {})
                 
                 # Strict Filter
                 rec_ticket_id = fields.get('Ticket ID ')
                 if str(rec_ticket_id) != str(ticket_id):
                     continue
                 
                 raw_attachments = fields.get('Attachments') or []
                 processed_attachments = []
                 for att in raw_attachments:
                     # Keep all original fields (path, token, etc.) for write-back compatibility
                     mapped_att = att.copy()
                     mapped_att['url'] = att.get('presignedUrl')
                     mapped_att['type'] = att.get('mimetype')
                     processed_attachments.append(mapped_att)

                 records.append({
                     'id': record.get('id'),
                     'name': fields.get('Visitor Name'), # Visitor Name field
                     'cnic': fields.get('CNIC / Passport'),
                     'cnicExpiry': fields.get('CNIC Expire'),
                     'checkInDate': fields.get('Check in Date '),
                     'checkOutDate': fields.get('Check out Date '),
                     'type': fields.get('Type'),
                     'attachments': processed_attachments,
                 })
                 
        elif ticket_type == 'Maintenance':
             # Logic for Maintenance table
            try:
                table_id = 'tblxBUElSacHNStAJU2'
                url = f"https://teable.namuve.com/api/table/{table_id}/record"
                
                # Fetch records filtered by Ticket ID
                # Use search parameters like Visit table
                params = [
                    ('search', ticket_id),
                    ('search', 'Ticket ID '), 
                    ('search', 'true')
                ]
                 
                print(f"Fetching Maintenance records for Ticket ID: {ticket_id}")
                response = requests.get(url, headers={'Authorization': f'Bearer {TEABLE_TOKEN}'}, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    raw_records = data.get('records', [])
                    
                    records = [] # Initialize records list for Maintenance block
                    
                    # Filter strictly in python as well just in case
                    filtered_records = []
                    for r in raw_records:
                         # Strict check string equality
                        r_ticket_id = str(r['fields'].get('Ticket ID ', ''))
                        if r_ticket_id == str(ticket_id) or r_ticket_id == f"{ticket_id}.00":
                            filtered_records.append(r)
                    
                    print(f"Found {len(filtered_records)} matching Maintenance records")
                    
                    for record in filtered_records:
                         fields = record.get('fields', {})
                         # FIX: Handle potential NoneType if Attachments is present but null
                         raw_attachments = fields.get('Attachments') or []
                         processed_attachments = []
                         
                         for att in raw_attachments:
                             # Keep all original fields (path, token, etc.) for write-back compatibility
                             mapped_att = att.copy()
                             mapped_att['url'] = att.get('presignedUrl')
                             mapped_att['type'] = att.get('mimetype')
                             processed_attachments.append(mapped_att)

                         records.append({
                             'id': record.get('id'),
                             'name': fields.get('Name'), # 'Name' field in Maintenance
                             'cnic': fields.get('CNIC'),
                             'cnicExpiry': fields.get('CNIC Expire'),
                             # Map 'Start Time ' to checkInDate
                             'checkInDate': fields.get('Start Time '),
                             # Map 'End Date ' to checkOutDate
                             'checkOutDate': fields.get('End Date '),
                             'type': fields.get('Type'),
                             'agent': fields.get('Agent'),
                             'ticket_type': 'Maintenance',
                             'attachments': processed_attachments,
                         })
                else:
                    return Response({'error': f"Teable API Error: {response.status_code} {response.text}"}, status=400)
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                print(error_trace)
                try:
                    with open('debug_error.log', 'w') as f:
                        f.write(error_trace)
                except:
                    pass
                return Response({'error': f"Internal Maintenance Error: {str(e)}"}, status=500)
                 
        return Response({'records': records})

    except requests.RequestException as e:
        print(f"Error fetching linked records: {e}")
        return Response({'error': 'Failed to fetch linked records'}, status=500)

from django.views.decorators.clickjacking import xframe_options_exempt

@api_view(['GET'])
@xframe_options_exempt
def proxy_image(request):
    image_url = request.query_params.get('url')
    print(f"Proxying Request URL: {request.get_full_path()}")
    print(f"Target Image URL: {image_url}")

    if not image_url:
        return Response({'error': 'URL is required'}, status=400)
        
    # Handle relative URLs from Teable
    if not image_url.startswith('http'):
        image_url = f"https://teable.namuve.com{image_url}"
        print(f"Corrected Relative URL to: {image_url}")
    
    try:
        # 1. Initial Request to Teable (don't follow redirects yet)
        print(f"Fetching from Teable with token length: {len(TEABLE_TOKEN) if TEABLE_TOKEN else 0}")
        response = requests.get(image_url, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}'
        }, allow_redirects=False) # Do NOT follow redirects automatically
        
        print(f"Initial Response Status: {response.status_code}")
        
        final_response = response

        # 2. Handle Redirects (e.g., to S3)
        if response.status_code in (301, 302, 303, 307, 308):
            redirect_url = response.headers.get('Location')
            print(f"Redirecting to: {redirect_url}")
            if redirect_url:
                # Follow redirect WITHOUT Authorization header
                final_response = requests.get(redirect_url, stream=True)
                print(f"Final Response Status: {final_response.status_code}")

        # 3. Check for errors
        if final_response.status_code != 200:
             print(f"Error Body: {final_response.text[:200]}")
             return Response({'error': 'Failed to retrieve image'}, status=final_response.status_code)

        # 4. Stream content back
        from django.http import StreamingHttpResponse
        
        # Determine content type: prefer query param 'type', then upstream header, then default
        content_type = request.query_params.get('type') or final_response.headers.get('Content-Type', 'application/octet-stream')
        
        return StreamingHttpResponse(
            final_response.iter_content(chunk_size=8192), 
            content_type=content_type
        )

    except Exception as e:
        print(f"Error proxying image: {e}")
        import traceback
        traceback.print_exc()
        return Response({'error': 'Failed to fetch image'}, status=500)

@api_view(['POST'])
def update_guest_status(request):
    """
    Updates the status (Check in/out Date) of a guest record.
    Payload: { "record_id": "rec...", "status": "in" | "out", "ticket_type": "In/Out" | "Visit" }
    """
    TEABLE_GUESTS_URL = 'https://teable.namuve.com/api/table/tblRmHEtBZSwi7HoTCz/record'
    TEABLE_VISIT_URL = 'https://teable.namuve.com/api/table/tbl2D1gLavfJn6GMe0o/record'
    TEABLE_MAINTENANCE_URL = 'https://teable.namuve.com/api/table/tblxBUElSacHNStAJU2/record'
    
    try:
        record_id = request.data.get('record_id')
        status = request.data.get('status') # 'in' or 'out'
        ticket_type = request.data.get('ticket_type')
        
        if not record_id or not status:
             return Response({'error': 'Record ID and Status are required'}, status=400)

        url = TEABLE_GUESTS_URL # Default
        if ticket_type == 'Visit':
            url = TEABLE_VISIT_URL
        elif ticket_type == 'Maintenance':
            url = TEABLE_MAINTENANCE_URL
             
        from datetime import datetime, timedelta, timezone
        # Force PKT (UTC+5)
        pkt_offset = timezone(timedelta(hours=5))
        now_iso = datetime.now(pkt_offset).isoformat()
        
        fields = {}
        if status == 'in':
            if ticket_type == 'Maintenance':
                fields['Start Time '] = now_iso
            else:
                fields['Check in Date '] = now_iso
        elif status == 'out':
            if ticket_type == 'Maintenance':
                fields['End Date '] = now_iso
            else:
                fields['Check out Date '] = now_iso
        else:
            return Response({'error': 'Invalid status. Use "in" or "out".'}, status=400)
            
        # Construct single record update URL
        url = f"{url}/{record_id}"
        
        payload = {
            "record": {
                "fields": fields
            },
            "fieldKeyType": "name"
        }
        
        print(f"Updating guest {record_id} status {status} at {now_iso}")
        
        response = requests.patch(url, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}',
            'Content-Type': 'application/json'
        }, json=payload)
        
        response.raise_for_status()
        
        return Response(response.json())

    except requests.RequestException as e:
        print(f"Error updating guest status: {e}")
        return Response({'error': f"Failed to update guest status: {str(e)}"}, status=500)
    except Exception as e:
        print(f"Unexpected error updating guest status: {e}")



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



@api_view(['POST'])
def create_user_proxy(request):
    """
    Proxy endpoint to create a user in Teable.
    """
    teable_url = settings.TEABLE_USER_TABLE_URL
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
    teable_url = settings.TEABLE_USER_TABLE_URL
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
    teable_url = settings.TEABLE_USER_TABLE_URL
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
    teable_url = settings.TEABLE_USER_TABLE_URL
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
    
    try:
        # Fetch records to find user
        # Note: For production, use server-side filtering. 
        # For now, fetching all and filtering in Python is reliable for the prototype.
        response = requests.get(teable_url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            records = data.get('records', [])
            
            user_found = None
            for record in records:
                fields = record.get('fields', {})
                # Check against Email field instead of Username
                db_email = fields.get('Email')
                db_password = fields.get('Password ')
                
                if db_email and db_email.lower() == username.lower():
                    # -----------------------------------------------------
                    # Check Password Reset Log Table for newer password
                    # -----------------------------------------------------
                    actual_password_to_check = db_password # Default to main table password
                    
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
                    except Exception:
                        pass
                    
                    # -----------------------------------------------------

                    # Decrypt the stored password for comparison
                    decrypted_db_pass = decrypt_password(actual_password_to_check)
                    
                    match = False
                    if decrypted_db_pass:
                         # It was encrypted, check against input
                         if decrypted_db_pass == password:
                             match = True
                    else:
                         # Fallback: Check if it matches as plain text (legacy support)
                         if actual_password_to_check == password:
                             match = True
                    
                    if match:
                        user_found = {
                            'id': record.get('id'),
                            'name': fields.get('Username ', db_email.split('@')[0]),
                            'username': fields.get('Username ', db_email.split('@')[0]),
                            'email': db_email,
                            'role': fields.get('Role ', 'user')
                        }
                        break
            
            if user_found:
                return Response({'message': 'Login successful', 'user': user_found}, status=200)
            else:
                return Response({'error': 'Invalid credentials'}, status=401)
        else:
            return Response({'error': 'Failed to query Teable', 'details': response.text}, status=response.status_code)
            
    except Exception as e:
        return Response({'error': str(e)}, status=500)
@api_view(['PATCH'])
def update_user_proxy(request, pk):
    """
    Proxy endpoint to update a user in Teable.
    """
    teable_url = settings.TEABLE_USER_TABLE_URL
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


@api_view(['PATCH'])
def update_ticket(request, record_id):
    """
    Updates a ticket in Teable.
    Payload: { "teable_id": "rec...", "fields": { "Status ": "Closed", ... }, "ticket_id": "123" }
    """
    TEABLE_TICKETS_URL = 'https://teable.namuve.com/api/table/tblt7O90EhETDjXraHk/record'
    
    try:
        # Prefer record_id from URL if provided and looks valid, else fall back to body
        teable_id = record_id if record_id and record_id != 'undefined' else request.data.get('teable_id')
        fields_to_update = request.data.get('fields')
        ticket_id_ref = request.data.get('ticket_id') # Fallback search ID (The "Name")
        ticket_type = request.data.get('ticket_type')

        if not teable_id or not fields_to_update:
             # If teable_id is missing but we have ticket_id_ref, we can search directly
             if not ticket_id_ref:
                return Response({'error': 'Teable ID (or Ticket ID) and fields are required'}, status=400)
        
        # Helper to perform update
        def perform_update(target_rec_id):
            base_url = TEABLE_TICKETS_URL
             # Switch URL based on ticket_type
            if ticket_type and ticket_type.lower() in ['owner', 'management']:
                base_url = 'https://teable.namuve.com/api/table/tblxOJ4jVOhzRCcSA1h/record'

            url = f"{base_url}/{target_rec_id}"
            payload = {
                "record": {
                    "fields": fields_to_update
                },
                "fieldKeyType": "name"
            }
            return requests.patch(url, headers={
                'Authorization': f'Bearer {TEABLE_TOKEN}',
                'Content-Type': 'application/json'
            }, json=payload)

        # 1. Try Direct Update if we have a Record ID
        if teable_id and teable_id.startswith('rec'):
             response = perform_update(teable_id)
             if response.status_code in [200, 201]:
                  # Success
                  pass 
             elif response.status_code == 404 and ticket_id_ref:
                  # 404 Not Found, try fallback search
                  print(f"Direct update failed for {teable_id} (404). Searching for Ticket ID: {ticket_id_ref}")
                  teable_id = None # Reset to trigger search
             else:
                  # Other error, raise it
                  response.raise_for_status()
                  return Response(response.json())
        
        # 2. Fallback Search logic (if teable_id is None/Invalid or 404 match failed)
        if (not teable_id or not teable_id.startswith('rec')) and ticket_id_ref:
             # Search for the record by Ticket ID
             print(f"Searching for record with Ticket ID: {ticket_id_ref}")
             
             # Construct proper Teable filter payload
             filter_payload = {
                 "conjunction": "and",
                 "filterSet": [
                     {
                         "fieldId": "ID ",
                         "operator": "is",
                         "value": int(ticket_id_ref) if str(ticket_id_ref).isdigit() else ticket_id_ref
                     }
                 ]
             }
             
             search_params = {
                 'filter': json.dumps(filter_payload)
             }
             
             # Note: Using filter instead of search param for precision
             search_res = requests.get(TEABLE_TICKETS_URL, headers={'Authorization': f'Bearer {TEABLE_TOKEN}'}, params=search_params)
             if search_res.status_code == 200:
                 search_data = search_res.json()
                 records = search_data.get('records', [])
                 if records:
                     teable_id = records[0]['id']
                     print(f"Found record {teable_id} for Ticket ID {ticket_id_ref}")
                     # Retry Update
                     response = perform_update(teable_id)
                     response.raise_for_status()
                 else:
                     return Response({'error': f"Record not found for Ticket ID: {ticket_id_ref}"}, status=404)
             else:
                 print(f"Teable Search Error: {search_res.text}")
                 return Response({'error': f'Failed to search for ticket: {search_res.text}'}, status=search_res.status_code)
        
        if not teable_id:
             return Response({'error': 'Could not identify record to update'}, status=400)

        
        # LOGGING ACTION: Ticket Updated
        apt_num_log = request.data.get('apartment_number')
        print(f"DEBUG: update_ticket Apartment Number: {apt_num_log}")
        
        if apt_num_log:
             new_status = fields_to_update.get('Status ')
             # Handle Parking Status Update Log
             if not new_status:
                  new_status = fields_to_update.get('Parking Status')
             
             print(f"DEBUG: Status Update: {new_status}")
             log_status = new_status if new_status else "Unchanged"
             
             # Try to get Ticket Type if present in fields or request, else None
             log_type = fields_to_update.get('Ticket Type') # Only if updating type
             if not log_type:
                 # If not updating type, we might want to fetch it? 
                 # For now, just logging None if not available, or check request root
                 log_type = request.data.get('ticket_type')

             log_id = request.data.get('ticket_id')
             log_ticket_action("Updated", log_status, apt_num_log, ticket_type=log_type, ticket_id=log_id, username=request.data.get('username'), record_id=teable_id)
        else:
             # print("DEBUG: Skipping logging in update_ticket - No apartment_number found")
             pass
        
        return Response(response.json())
        
    except requests.RequestException as e:
        print(f"Error updating ticket: {e}")
        error_details = str(e)
        if e.response is not None:
             error_details += f" | Response: {e.response.text}"
        return Response({'error': f"Failed to update ticket: {error_details}"}, status=500)

@api_view(['PATCH'])
def update_linked_record(request):
    """
    Updates a linked record (Guest, Visitor, Maintenance) in Teable.
    Payload: { "record_id": "rec...", "ticket_type": "In/Out", "fields": { "Name": "New Name", ... } }
    """
    try:
        record_id = request.data.get('record_id')
        ticket_type = request.data.get('ticket_type')
        fields_to_update = request.data.get('fields')
        
        if not record_id or not ticket_type or not fields_to_update:
            return Response({'error': 'Record ID, Ticket Type, and Fields are required'}, status=400)
            
        record_id = str(record_id).strip()
            
        # Determine Table ID based on Ticket Type
        if ticket_type == 'In/Out':
            table_id = 'tblRmHEtBZSwi7HoTCz'
        elif ticket_type == 'Visit':
            table_id = 'tbl2D1gLavfJn6GMe0o'
        elif ticket_type == 'Maintenance':
            table_id = 'tblxBUElSacHNStAJU2'
        else:
            return Response({'error': f'Invalid Ticket Type: {ticket_type}'}, status=400)
            
        url = f"https://teable.namuve.com/api/table/{table_id}/record/{record_id}"
        
        # Filter out frontend-only keys (lowercase) and keep only Title Case keys (Teable fields)
        # Also ensure Attachments is NOT sent here if we handled it via upload, 
        # UNLESS we are removing attachments (updating the list).
        # Teable expects Attachments to be a list of objects or null.
        sanitized_fields = {}
        for key, value in fields_to_update.items():
            # Heuristic: Teable fields usually start with Uppercase or have special chars, 
            # Frontend internal keys are lowercase (name, cnic). 
            # We only want keys that were mapped by getTeableField.
            if key[0].isupper() or key == 'Attachments': 
                 sanitized_fields[key] = value

        print(f"Updating Teable Record: {url} with fields: {list(sanitized_fields.keys())}")
        
        payload = {
            "record": {
                "fields": sanitized_fields
            },
            "fieldKeyType": "name"
        }
        
        print(f"DEBUG UPDATE: URL={url}")
        print(f"DEBUG UPDATE: TokenPrefix={TEABLE_TOKEN[:10]}")
        print(f"DEBUG UPDATE: RecordID={repr(record_id)}")
        
        response = requests.patch(url, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}',
             'Content-Type': 'application/json'
        }, json=payload)
        
        if response.status_code == 404:
             print(f"Teable returned 404. Table: {table_id}, Record: {record_id}")
             print(f"Teable 404 Response Body: {response.text}") # Detailed error
             return Response({'error': f"Record not found in Teable (404). ID: {record_id}, Table: {table_id}, Url: {url}, Body: {response.text}"}, status=404)
        
        response.raise_for_status()
        
        return Response(response.json())
        
    except requests.RequestException as e:
        print(f"Error updating linked record: {e}")
        error_msg = str(e)
        if hasattr(e, 'response') and e.response is not None:
             error_msg += f" | Body: {e.response.text}"
        return Response({'error': f"Failed to update linked record: {error_msg}"}, status=500)

@api_view(['POST'])
def upload_attachment(request):
    try:
        if 'file' not in request.FILES:
             return Response({'error': 'No file provided'}, status=400)

        file_obj = request.FILES['file']
        record_id = request.data.get('record_id', '').strip()
        ticket_type = request.data.get('ticket_type', '').strip()
        
        if not record_id or not ticket_type:
            return Response({'error': 'Record ID and Ticket Type are required for upload'}, status=400)

        # Map Ticket Type to Table ID and Attachment Field ID
        # IDs found via debug script
        CONFIG = {
            'In/Out': {'table': 'tblRmHEtBZSwi7HoTCz', 'field': 'fldJdomUaG2ufpuQj45'},
            'Visit': {'table': 'tbl2D1gLavfJn6GMe0o', 'field': 'fldqdP9sU0QwBmf6An8'},
            'Maintenance': {'table': 'tblxBUElSacHNStAJU2', 'field': 'fldfyMH1DGwYsJlzTGy'}
        }
        
        config = CONFIG.get(ticket_type)
        if not config:
            return Response({'error': f'Invalid or unsupported ticket type: {ticket_type}'}, status=400)
            
        table_id = config['table']
        field_id = config['field']

        # Specific Teable Endpoint: POST /api/table/{tableId}/record/{recordId}/{fieldId}/uploadAttachment
        TEABLE_UPLOAD_URL = f"https://teable.namuve.com/api/table/{table_id}/record/{record_id}/{field_id}/uploadAttachment"
        
        # Teable upload expects 'file' key
        files = {'file': (file_obj.name, file_obj, file_obj.content_type)}
        
        response = requests.post(TEABLE_UPLOAD_URL, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}'
        }, files=files)
        
        response.raise_for_status()
        return Response(response.json())
        
    except requests.RequestException as e:
        print(f"Error uploading attachment: {e}")
        error_details = str(e)
        if e.response is not None:
             error_details += f" | Response: {e.response.text}"
        return Response({'error': f'Failed to upload attachment: {error_details}'}, status=500)

@api_view(['POST'])
def create_ticket_comment(request):
    TEABLE_COMMENTS_URL = 'https://teable.namuve.com/api/table/tbl6lXbzV6iQHnjiu0e/record'
    
    try:
        user = request.data.get('user')
        comment = request.data.get('comment')
        ticket_id = request.data.get('ticket_id')

        if not all([user, comment, ticket_id]):
            return Response({'error': 'Missing required fields'}, status=400)

        # Ensure ticket_id is a number
        try:
            ticket_id_num = int(ticket_id)
        except (ValueError, TypeError):
             return Response({'error': 'Ticket ID must be a number'}, status=400)

        payload = {
            "records": [
                {
                    "fields": {
                        "User": user,
                        "Comments": comment,
                        "Ticket ID": ticket_id_num
                    }
                }
            ]
        }

        # Extract additional fields for logging
        apartment_number = request.data.get('apartment_number')
        ticket_type = request.data.get('ticket_type')
        ticket_status = request.data.get('ticket_status')

        # Log the action (Before or after creating comment? After logic usually better but parallel is fine)
        # We do this asynchronously or just sequentially. Sequential is fine.
        # Log the action (Always log, even if apartment is missing)
        log_ticket_action(
            action="Commented on",
            status_val=ticket_status or "Unknown",
            apartment_number=apartment_number or "Unknown",
            ticket_type=ticket_type,
            ticket_id=str(ticket_id_num),
            username=user
        )

        response = requests.post(TEABLE_COMMENTS_URL, json=payload, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}',
            'Content-Type': 'application/json'
        })
        
        response.raise_for_status()
        return Response(response.json())

    except requests.RequestException as e:
        print(f"Error creating comment in Teable: {e}")
        error_msg = 'Failed to create comment'
        if e.response is not None:
             print(e.response.text)
             try:
                 # Try to parse Teable error to give more info
                 teable_error = e.response.json()
                 error_msg = f"Teable Error: {teable_error}"
             except:
                 error_msg = f"Teable Error: {e.response.text}"
        
        return Response({'error': error_msg}, status=500)

@api_view(['GET'])
def get_ticket_comments(request):
    TEABLE_COMMENTS_URL = 'https://teable.namuve.com/api/table/tbl6lXbzV6iQHnjiu0e/record'
    ticket_id = request.query_params.get('ticket_id')

    if not ticket_id:
        return Response({'error': 'Ticket ID is required'}, status=400)

    try:
        # Ideally we use a filter here, but for now we'll fetch all and filter in Python 
        # to ensure we match the numeric Ticket ID correctly without guessing Teable's filter syntax.
        # If the table grows large, we must switch to server-side filtering.
        
        response = requests.get(TEABLE_COMMENTS_URL, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}'
        }, params={'fieldKeyType': 'name'}) # Use names to match our write structure
        
        response.raise_for_status()
        data = response.json()
        
        comments = []
        try:
            target_ticket_id = int(ticket_id)
        except ValueError:
             return Response({'error': 'Ticket ID must be a number'}, status=400)

        for record in data.get('records', []):
            fields = record.get('fields', {})
            # Check if this comment belongs to the requested ticket
            # The field name for Ticket ID is "Ticket ID"
            rec_ticket_id = fields.get('Ticket ID')
            
            if rec_ticket_id == target_ticket_id:
                comments.append({
                    'id': record.get('id'),
                    'user': fields.get('User', 'Unknown'),
                    'comment': fields.get('Comments', ''),
                    'created': fields.get('Time') or fields.get('createdTime') # Fallback if specific time field is missing
                })
        
        # Sort by created time (assuming ISO string) - Oldest first
        comments.sort(key=lambda x: x.get('created', '') or '')

        return Response({'comments': comments})

    except requests.RequestException as e:
        print(f"Error fetching comments from Teable: {e}")
        return Response({'error': 'Failed to fetch comments'}, status=500)

