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
}

export interface Ticket {
    id: string;
    type: 'Guest Request' | 'Cleaning' | 'Maintenance';
    title: string;
    status: 'Open' | 'In Progress' | 'Closed';
    priority: 'Low' | 'Medium' | 'High';
    created: string;
    description: string;
}
