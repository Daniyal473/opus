import { useState, useMemo, useEffect } from 'react';
import { BuildingSelector } from './BuildingSelector';
import { FloorSelector } from './FloorSelector';
import { RoomGrid } from './RoomGrid';
import { PropertySidebar } from './PropertySidebar';
import { buildings, defaultPropertyInfo } from '../../data/mockRoomData';
import { fetchApartmentData, extractFloors, transformRecordToRoomCard } from '../../services/teable';
import type { RoomCardData } from '../../types/rental';
import './rental.css';

interface RentalConsoleProps {
    onLogout?: () => void;
    onAdminPanelClick?: () => void;
    userRole?: string;
}

export function RentalConsole({ onLogout, onAdminPanelClick, userRole }: RentalConsoleProps) {
    const [selectedBuilding, setSelectedBuilding] = useState('opus');
    const [selectedFloor, setSelectedFloor] = useState('all');
    const [selectedRoom, setSelectedRoom] = useState<RoomCardData | null>(null);
    const [allRecords, setAllRecords] = useState<any[]>([]);

    // Check if user has admin access (handle case and whitespace)
    const normalizedRole = userRole?.trim().toLowerCase();
    const showAdminPanel = normalizedRole === 'super-admin' || normalizedRole === 'super admin' || normalizedRole === 'admin';

    // Fetch floors and rooms from API
    useEffect(() => {
        const loadData = async () => {
            try {
                const records = await fetchApartmentData();
                setAllRecords(records);
            } catch (error) {
                console.error("Failed to load apartment data:", error);
            }
        };
        loadData();
    }, []);

    // Derive floors from data
    const apiFloors = useMemo(() => {
        const extracted = extractFloors(allRecords);
        // Map to format expected by FloorSelector
        // Selector expects { code: string, name: string }
        const floorOptions = [
            { code: 'all', name: 'All Floors' },
            ...extracted.map(f => ({ code: f, name: f }))
        ];
        return floorOptions;
    }, [allRecords]);

    // Generate room cards from API records
    const roomCards = useMemo<RoomCardData[]>(() => {
        if (!allRecords.length) return [];

        let filteredRecords = allRecords;

        // Filter by floor
        if (selectedFloor !== 'all') {
            // Use exact match assuming extractFloors returns values that match record fields
            filteredRecords = allRecords.filter(r => r.fields['Floor'] == selectedFloor);
        }

        // Transform to RoomCardData
        return filteredRecords.map(transformRecordToRoomCard);
    }, [allRecords, selectedFloor]);

    const handleBuildingChange = (buildingId: string) => {
        setSelectedBuilding(buildingId);
        setSelectedRoom(null);
    };

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
                    <BuildingSelector
                        buildings={buildings}
                        selectedBuilding={selectedBuilding}
                        onBuildingChange={handleBuildingChange}
                        onAdminPanelClick={showAdminPanel ? onAdminPanelClick : undefined}
                    />
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
            <PropertySidebar
                selectedRoom={selectedRoom}
                defaultInfo={defaultPropertyInfo}
            />
        </div>
    );
}
