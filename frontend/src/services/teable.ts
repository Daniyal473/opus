import axios from 'axios';
import { API_BASE_URL } from './api';
import type { RoomCardData, RoomStatus, Ticket } from '../types/rental';

const TEABLE_API_URL = `${API_BASE_URL}/apartments/`;

// Field Names (API returns names by default)
const FIELDS = {
    APARTMENT_NUMBER: 'Apartment Number ',  // Note the trailing space from API response
    FLOOR: 'Floor',
    OWNER: 'Owner',
    CATEGORY: 'Category',
    MANAGED_BY: 'Managed by',
    OCCUPANCY: 'Occupancy',
    PARKING_ALLOWED: 'Parking Allowed',
    START_DATE: 'Start Date',
    END_DATE: 'End Date',
    APARTMENT_ID: 'Apartment ID'
};

export interface TeableRecord {
    id: string;
    fields: {
        [key: string]: any;
    };
}

export interface TeableResponse {
    records: TeableRecord[];
}

export const fetchApartmentData = async (): Promise<TeableRecord[]> => {
    try {
        const response = await axios.get<TeableResponse>(TEABLE_API_URL);
        return response.data.records;
    } catch (error) {
        console.error('Error fetching data from Teable:', error);
        return [];
    }
};

export const extractFloors = (records: TeableRecord[]): string[] => {
    const floors = new Set<string>();
    records.forEach(record => {
        const floor = record.fields[FIELDS.FLOOR];
        if (floor) {
            floors.add(String(floor));
        }
    });

    // Sort floors: Ground/GF first, then numerical order (1st, 2nd, 10th etc)
    return Array.from(floors).sort((a, b) => {
        // Normalize strings for comparison
        const normA = a.toLowerCase().trim();
        const normB = b.toLowerCase().trim();

        // Handle Ground floor
        if (normA.includes('ground') || normA === 'gf') return -1;
        if (normB.includes('ground') || normB === 'gf') return 1;

        // Extract numbers
        const numA = parseInt(a.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.replace(/\D/g, '')) || 0;

        if (numA !== numB) {
            return numA - numB;
        }

        return a.localeCompare(b);
    });
};

export const transformRecordToRoomCard = (record: TeableRecord): RoomCardData => {
    const fields = record.fields;
    const roomNumber = fields[FIELDS.APARTMENT_NUMBER] || `Room-${record.id}`;
    const category = fields[FIELDS.CATEGORY] || 'Unknown';

    // Status is technically required by type but not used for display anymore
    // Defaulting to 'unoccupied' (neutral)
    const status: RoomStatus = 'unoccupied';

    return {
        id: roomNumber,
        type: category,
        size: '',
        status: status,
        details: '',
        colorClass: '',
        textClass: '',
        owner: fields[FIELDS.OWNER] || '',
        manager: fields[FIELDS.MANAGED_BY] || '',
        lease: category.includes('Short') ? 'Short-term' : category.includes('Long') ? 'Long-term' : 'Owner',
        occupancy: fields[FIELDS.OCCUPANCY] || '0 / 3',
        parking: fields[FIELDS.PARKING_ALLOWED] || 'No', // Map parking
        visits: 0, // Default visits
        apartmentId: fields['Apartment ID'] // Map internal ID direct string
    };
};

export const fetchTickets = async (startDate?: string, endDate?: string): Promise<Ticket[]> => {
    try {
        let url = `${API_BASE_URL}/tickets/`;
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const response = await axios.get<{ tickets: any[] }>(url);
        if (response.data && response.data.tickets) {
            return response.data.tickets.map((record: any) => ({
                id: record.id,
                type: record.type,
                created: record.created,
                status: record.status,
                priority: record.priority,
                title: record.title,
                description: record.description,
                arrival: record.arrival,
                departure: record.departure,
                occupancy: record.occupancy,
                apartmentId: record.apartmentId,
                teableId: record.teableId,
            }));
        }
        return [];
    } catch (error) {
        console.error("Error fetching tickets:", error);
        return [];
    }
};

export const updateTicket = async (teableId: string, updates: Partial<Ticket>, apartmentNumber?: string, ticketType?: string, ticketId?: string, username?: string) => {
    try {
        // Map frontend fields to backend/Teable fields
        const fields: any = {};
        if (updates.status) fields["Status "] = updates.status;
        if (updates.priority) fields["Priority"] = updates.priority;
        if (updates.title) fields["Title"] = updates.title;
        if (updates.description) fields["Purpose"] = updates.description;
        if (updates.occupancy) fields["Occupancy"] = parseInt(updates.occupancy as string); // Assuming occupancy can be string from input
        if (updates.arrival) fields["Arrival"] = updates.arrival;
        if (updates.departure) fields["Departure"] = updates.departure;

        const response = await fetch(`${API_BASE_URL}/update-ticket/${teableId}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                teable_id: teableId,
                fields: fields,
                apartment_number: apartmentNumber, // Pass for logging
                ticket_type: ticketType, // Pass for logging
                ticket_id: ticketId, // Pass for logging
                username: username // Pass for logging
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to update ticket');
        }

        return await response.json();
    } catch (error) {
        console.error("Error updating ticket:", error);
        throw error;
    }
};
export const updateLinkedRecord = async (recordId: string, ticketType: string, updates: Record<string, any>) => {
    try {
        const response = await fetch(`${API_BASE_URL}/linked-records/update/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                record_id: recordId,
                ticket_type: ticketType,
                fields: updates
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to update linked record');
        }

        return await response.json();
    } catch (error) {
        console.error("Error updating linked record:", error);
        throw error;
    }
};

export const uploadAttachment = async (file: File, recordId: string, ticketType: string) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('record_id', recordId);
        formData.append('ticket_type', ticketType);

        const response = await fetch(`${API_BASE_URL}/attachments/upload/`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to upload attachment');
        }

        return await response.json();
    } catch (error) {
        console.error("Error uploading attachment:", error);
        throw error;
    }
};

export const fetchTicketsByRoom = async (apartmentId: string): Promise<Ticket[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/tickets/?apartment_id=${apartmentId}`);
        if (response.ok) {
            const data = await response.json();
            return data.tickets || [];
        } else {
            console.error('Failed to fetch tickets');
            return [];
        }
    } catch (error) {
        console.error('Error fetching tickets:', error);
        return [];
    }
};

export const createTicket = async (newTicket: Omit<Ticket, 'id' | 'created' | 'status'>, apartmentId: string | number, ticketOptions: string[] = [], maintenanceOptions: string[] = [], username?: string, apartmentNumber?: string) => {
    try {
        // Use FormData to allow file uploads
        const formData = new FormData();
        formData.append('apartment_id', String(apartmentId));
        if (apartmentNumber) {
            formData.append('apartment_number', apartmentNumber);
        }

        // Always send the original type value
        formData.append('type', newTicket.type);

        if (username) {
            formData.append('username', username);
        }

        // If type is one of the Visit subtypes (Guest, Foodpanda, etc.), send it as visit_subtype
        // We accept ticketOptions as arg or default to empty if not passed, but ideally should be passed
        if (ticketOptions.includes(newTicket.type)) {
            formData.append('visit_subtype', newTicket.type);
        }

        // If type is one of the Maintenance subtypes (AC Repair, etc.) or 'Maintenance'
        if (maintenanceOptions.includes(newTicket.type) || newTicket.type === 'Maintenance' || newTicket.type === 'Work Permit') {
            formData.append('maintenance_subtype', newTicket.type);
        }

        formData.append('title', newTicket.title);
        formData.append('purpose', newTicket.description); // Mapping description to purpose
        formData.append('priority', newTicket.priority);
        if (newTicket.arrival) formData.append('arrival', newTicket.arrival);
        if (newTicket.departure) formData.append('departure', newTicket.departure);
        if (newTicket.occupancy) formData.append('occupancy', String(newTicket.occupancy));
        if (newTicket.agent) {
            formData.append('agent', newTicket.agent);
        }

        // Handle Guests and Attachments for In/Out tickets
        if (newTicket.guests && newTicket.guests.length > 0) {
            // Serialize generic guest data
            const guestsMeta = newTicket.guests.map(g => ({
                name: g.name,
                cnic: g.cnic,
                cnicExpiry: g.cnicExpiry
            }));
            formData.append('guests_data', JSON.stringify(guestsMeta));

            // Append files
            newTicket.guests.forEach((guest, index) => {
                if (guest.attachments) {
                    guest.attachments.forEach((file, fileIndex) => {
                        formData.append(`guest_${index}_attachment_${fileIndex}`, file);
                    });
                }
            });
        }

        const response = await fetch(`${API_BASE_URL}/create-ticket/`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to create ticket');
        }

        return await response.json();
    } catch (error) {
        console.error("Error creating ticket:", error);
        throw error;
    }
};


