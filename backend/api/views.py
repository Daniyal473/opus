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
        occupancy = data.get('occupancy')

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
        
        response = requests.get(TEABLE_TICKETS_URL, headers={
            'Authorization': f'Bearer {TEABLE_TOKEN}'
        })
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
            }
            tickets.append(ticket)
            
        return Response({'tickets': tickets})
    except requests.RequestException as e:
        print(f"Error fetching tickets from Teable: {e}")
        return Response({'error': 'Failed to fetch tickets'}, status=500)

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
                     processed_attachments.append({
                         'id': att.get('id'),
                         'name': att.get('name'),
                         'url': att.get('presignedUrl'), # Map presignedUrl to url
                         'type': att.get('mimetype')
                     })

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
                     processed_attachments.append({
                         'id': att.get('id'),
                         'name': att.get('name'),
                         'url': att.get('presignedUrl'),
                         'type': att.get('mimetype')
                     })

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
                             processed_attachments.append({
                                 'id': att.get('id'),
                                 'name': att.get('name'),
                                 'url': att.get('presignedUrl'),
                                 'type': att.get('mimetype')
                             })

                         records.append({
                             'id': record.get('id'),
                             'name': fields.get('Name'), # 'Name' field in Maintenance
                             'cnic': fields.get('CNIC'),
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
             
        from datetime import datetime
        now_iso = datetime.now().isoformat()
        
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
