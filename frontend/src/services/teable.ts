import axios from 'axios';
import type { RoomCardData, RoomStatus } from '../types/rental';

import { API_BASE_URL } from '../config';

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
