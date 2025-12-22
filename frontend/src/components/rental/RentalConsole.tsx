import { useState, useMemo, useEffect } from 'react';
import { fetchApartmentData, fetchTickets, transformRecordToRoomCard, extractFloors, type TeableRecord } from '../../services/teable';
import { FloorSelector } from './FloorSelector';
import { RoomGrid } from './RoomGrid';
import { PropertySidebar } from './PropertySidebar';

import { Settings } from 'lucide-react';
import opusLogo from '../../assets/opus-logo.jpg';
import type { RoomCardData, Ticket } from '../../types/rental';
import './rental.css';

interface RentalConsoleProps {
    onLogout?: () => void;
    onAdminPanelClick?: () => void;
    onTicketRequestClick?: () => void;
    onGuestManagementClick?: () => void;
    userRole?: string;
    username?: string;
}

export function RentalConsole({ onLogout, onAdminPanelClick, onTicketRequestClick, onGuestManagementClick, userRole, username }: RentalConsoleProps) {
    const [selectedFloor, setSelectedFloor] = useState('all');
    const [selectedRoom, setSelectedRoom] = useState<RoomCardData | null>(null);
    const [allRecords, setAllRecords] = useState<TeableRecord[]>([]);
    const [allTickets, setAllTickets] = useState<Ticket[]>([]);
    // Check if user has admin access (handle case and whitespace)
    console.log("RentalConsole received userRole:", userRole);
    const normalizedRole = userRole?.trim().toLowerCase();

    // Permission to see the Admin Panel button (Super Admin only)
    const showAdminPanel = normalizedRole === 'super-admin' || normalizedRole === 'super admin';

    // Permission to see all rooms (Super Admin + Admin)
    const canSeeAllRooms = showAdminPanel || normalizedRole === 'admin' || normalizedRole === 'fdo';

    // 1. Filter by User Access first (Centralized Logic)
    const filteredRecordsByUser = useMemo(() => {
        let records = allRecords;
        if (!canSeeAllRooms && username) {
            records = records.filter(r => {
                const managedBy = r.fields['Managed by'];
                // Check if managedBy matches username
                return String(managedBy).trim() === String(username).trim();
            });
        }
        return records;
    }, [allRecords, canSeeAllRooms, username]);

    // Derive floors from Filtered API data
    const apiFloors = useMemo(() => {
        if (filteredRecordsByUser.length === 0) return [{ code: 'all', name: 'All' }];

        const extracted = extractFloors(filteredRecordsByUser);
        const dynamicFloors = extracted.map(f => ({ code: f, name: f })); // Map to Floor interface

        return [{ code: 'all', name: 'All' }, ...dynamicFloors];
    }, [filteredRecordsByUser]);

    // Fetch floors and rooms from API
    useEffect(() => {
        const loadData = async () => {
            const [records, tickets] = await Promise.all([
                fetchApartmentData(),
                fetchTickets()
            ]);
            console.log('Raw Records from API:', records);
            console.log('Tickets from API:', tickets);
            setAllRecords(records);
            setAllTickets(tickets);
        };
        loadData();
    }, []);



    // ... (rest of code)
    // In JSX:
    /*
                    <BuildingSelector
                        buildings={buildings}
                        selectedBuilding={selectedBuilding}
                        onBuildingChange={handleBuildingChange}
                        onAdminPanelClick={showAdminPanel ? onAdminPanelClick : undefined}
                    />
    */

    // Generate room cards based on selected floor
    const roomCards = useMemo<RoomCardData[]>(() => {
        let sourceData = filteredRecordsByUser;

        // Filter records by floor
        const filteredRecords = selectedFloor === 'all'
            ? sourceData
            : sourceData.filter(r => String(r.fields['Floor']).trim() === selectedFloor);

        return filteredRecords.map(r => {
            const room = transformRecordToRoomCard(r);

            // Aggregate tickets for this room
            // Note: apartmentId in room is number, in ticket is number (if converted)
            // But checking rental.ts, RoomCardData.apartmentId is number. Ticket.apartmentId is number.

            const roomTickets = allTickets.filter(t => Number(t.apartmentId) === Number(room.apartmentId));

            room.ticketCounts = {
                total: roomTickets.length,
                active: roomTickets.filter(t => t.status !== 'Closed').length,
                inOut: roomTickets.filter(t => t.type === 'In / Out' || t.type === 'Check-in / Check-out' || t.type === 'In/Out').length,
                visitor: roomTickets.filter(t => t.type === 'Visitor' || t.type === 'Visit' || t.type === 'Guest' || t.type === 'Cleaning').length,
                maintenance: roomTickets.filter(t => t.type === 'Maintenance' || t.type === 'Work Permit').length
            };
            return room;
        });

    }, [selectedFloor, filteredRecordsByUser, allTickets]);


    const handleFloorChange = (floorCode: string) => {
        setSelectedFloor(floorCode);
        setSelectedRoom(null);
    };

    const handleRoomSelect = (room: RoomCardData) => {
        setSelectedRoom(room);
    };

    return (
        <div className="grid-container">
            {/* Left Sidebar */}
            <aside className="left-sidebar bg-white border-r border-gray-300 shadow-sm overflow-y-auto">
                <div className="p-0">
                    <div className="p-0 border-b border-gray-200 flex justify-center">
                        <img src={opusLogo} alt="Opus Portal" className="h-25 max-w-full object-contain" />
                    </div>

                    {/* Guest Management Button */}
                    {!canSeeAllRooms && onGuestManagementClick && (
                        <div
                            className="px-4 py-2 text-xs font-medium cursor-pointer hover:bg-teal-50 flex items-center gap-2 bg-teal-50 text-teal-600 border-b border-gray-300"
                            onClick={onGuestManagementClick}
                        >

                            <span className="font-medium">Ticket Management</span>
                        </div>
                    )}

                    {/* Admin Panel Button */}
                    {showAdminPanel && onAdminPanelClick && (
                        <div
                            className="px-4 py-2 text-xs font-medium cursor-pointer hover:bg-blue-50 flex items-center gap-2 bg-blue-50 text-blue-600 border-b border-gray-300"
                            onClick={onAdminPanelClick}
                        >
                            <Settings size={16} />
                            <span className="font-medium">Admin Panel</span>
                        </div>
                    )}

                    {/* Ticket Request Button */}
                    {canSeeAllRooms && onTicketRequestClick && normalizedRole !== 'fdo' && (
                        <div
                            className="px-4 py-2 text-xs font-medium cursor-pointer hover:bg-teal-50 flex items-center gap-2 bg-teal-50 text-teal-600 border-b border-gray-300"
                            onClick={onTicketRequestClick}
                        >

                            <span className="font-medium">Ticket Request</span>
                        </div>
                    )}

                    <FloorSelector
                        floors={apiFloors}
                        selectedFloor={selectedFloor}
                        onFloorChange={handleFloorChange}
                        onLogout={onLogout}
                    />
                </div>
            </aside>

            {/* Main Room Grid */}
            <main className="room-grid p-4 overflow-y-auto">
                <RoomGrid
                    rooms={roomCards}
                    selectedRoomId={selectedRoom?.id || null}
                    onRoomSelect={handleRoomSelect}
                />
            </main>

            {/* Right Sidebar */}
            {(canSeeAllRooms || selectedRoom) && (
                <PropertySidebar
                    selectedRoom={selectedRoom}
                    role={userRole}
                />
            )}
        </div>
    );
}
