import type { RoomData } from '../types/rental';

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
        occupancy: '0 / 2',
        parking: 'N/A',
        visits: 0,
        apartmentId: 101
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
        occupancy: '2 / 3',
        parking: 'P-101',
        visits: 5,
        apartmentId: 102
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
        occupancy: '4 / 5',
        parking: 'P-202',
        visits: 2,
        apartmentId: 103
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
        occupancy: '5 / 6',
        parking: 'P-303',
        visits: 12,
        apartmentId: 104
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
        occupancy: '0 / 2',
        parking: 'N/A',
        visits: 0,
        apartmentId: 105
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
        occupancy: '0 / 3',
        parking: 'N/A',
        visits: 0,
        apartmentId: 106
    }
];


