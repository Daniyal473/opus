import type { RoomData, PropertyInfo, Building, Floor } from '../types/rental';

export const roomData: RoomData[] = [
    {
        type: '(S)',
        size: 'Studio',
        status: 'unoccupied',
        details: 'Unoccupied',
        colorClass: 'bg-white border border-gray-200',
        textClass: 'text-gray-400',
        owner: 'Alpha Investors',
        manager: 'Namuve',
        lease: 'Short-term',
        occupancy: '0 / 2'
    },
    {
        type: '(1B)',
        size: '1 Bed',
        status: 'occupied',
        details: 'Guest Name',
        colorClass: 'status-occupied',
        textClass: 'status-text',
        owner: 'Beta Properties',
        manager: 'Globex',
        lease: 'Short-term',
        occupancy: '2 / 3'
    },
    {
        type: '(2B)',
        size: '2 Bed',
        status: 'checking-out',
        details: 'Test Reservation',
        colorClass: 'status-checking-out bg-white border border-gray-200',
        textClass: 'text-[var(--color-checking-out)]',
        owner: 'Alpha Investors',
        manager: 'Namuve',
        lease: 'Long-term',
        occupancy: '4 / 5'
    },
    {
        type: '(3B)',
        size: '3 Bed',
        status: 'occupied',
        details: 'Mr Irfan',
        colorClass: 'status-occupied',
        textClass: 'status-text',
        owner: 'Beta Properties',
        manager: 'Globex',
        lease: 'Short-term',
        occupancy: '5 / 6'
    },
    {
        type: '(S)',
        size: 'Studio',
        status: 'maintenance',
        details: 'A/C Broken',
        colorClass: 'bg-white border-l-4 border-[var(--color-maintenance)]',
        textClass: 'text-[var(--color-maintenance)]',
        owner: 'Gamma Holdings',
        manager: 'Namuve',
        lease: 'Short-term',
        occupancy: '0 / 2'
    },
    {
        type: '(1B)',
        size: '1 Bed',
        status: 'unoccupied',
        details: 'Unoccupied',
        colorClass: 'bg-white border border-gray-200',
        textClass: 'text-gray-400',
        owner: 'Alpha Investors',
        manager: 'Globex',
        lease: 'Long-term',
        occupancy: '0 / 3'
    }
];

export const defaultPropertyInfo: PropertyInfo = {
    header: 'Property Information',
    ownedBy: 'Alpha Investors',
    managedBy: 'Namuve',
    leaseType: 'Short-term',
    occupancy: '4 / 6'
};

export const buildings: Building[] = [
    { id: 'all', name: 'All' },
    { id: 'opus', name: 'The Opus' }
];

export const floors: Floor[] = [
    { code: 'all', name: 'All' },
    { code: 'GF', name: 'Ground Floor' },
    { code: '1F', name: '1st Floor' },
    { code: '2F', name: '2nd Floor' },
    { code: '3F', name: '3rd Floor' },
    { code: '4F', name: '4th Floor' },
    { code: '5F', name: '5th Floor' },
    { code: '6F', name: '6th Floor' },
    { code: '7F', name: '7th Floor' },
    { code: '8F', name: '8th Floor' },
    { code: '9F', name: '9th Floor' },
    { code: '10F', name: '10th Floor' }
];
