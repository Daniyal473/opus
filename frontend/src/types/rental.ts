export type RoomStatus = 'unoccupied' | 'occupied' | 'checking-out' | 'maintenance';

export interface RoomData {
    type: string;
    size: string;
    status: RoomStatus;
    details: string;
    colorClass: string;
    textClass: string;
    owner: string;
    manager: string;
    lease: string;
    occupancy: string;
    parking: string; // New field
    visits: number; // New field
    apartmentId: number; // Correct internal ID from API
}

export interface PropertyInfo {
    header: string;
    ownedBy: string;
    managedBy: string;
    leaseType: string;
    occupancy: string;
}

export interface Building {
    id: string;
    name: string;
}

export interface Floor {
    code: string;
    name: string;
}

export interface RoomCardData {
    id: string;
    type: string;
    size: string;
    status: RoomStatus;
    details: string;
    colorClass: string;
    textClass: string;
    owner: string;
    manager: string;
    lease: string;
    occupancy: string;
    parking: string; // New field
    visits: number; // New field
    apartmentId: number; // Correct internal ID from API
    ticketCounts?: {
        total: number;
        active: number;
        inOut: number;
        visitor: number;
        maintenance: number;
    };
}

export interface Ticket {
    id: string;
    type: string;
    title: string;
    status: 'Open' | 'Under Review' | 'Approved' | 'Closed';
    priority: 'Low' | 'Medium' | 'High';
    created: string;
    description: string;
    occupancy?: string;
    agent?: string; // Assigned agent
    // New structure
    guests?: {
        name: string;
        cnic: string;
        cnicExpiry: string;
        attachments: File[];
    }[];
    // Retain legacy fields optional for compatibility if needed, but preferably clean up
    arrival?: string;
    departure?: string;
    apartmentId?: number; // Linked apartment ID
    apartmentNumber?: string; // Room Number (e.g. 101)
    teableId?: string; // ID for updates
}
