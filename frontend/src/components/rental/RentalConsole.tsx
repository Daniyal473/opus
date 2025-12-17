import { useState, useMemo, useEffect } from 'react';
import { fetchApartmentData, transformRecordToRoomCard, extractFloors, type TeableRecord } from '../../services/teable';
import { FloorSelector } from './FloorSelector';
import { RoomGrid } from './RoomGrid';
import { PropertySidebar } from './PropertySidebar';

import { Settings } from 'lucide-react';
import opusLogo from '../../assets/opus-logo.jpg';
import type { RoomCardData } from '../../types/rental';
import './rental.css';

interface RentalConsoleProps {
    onLogout?: () => void;
    onAdminPanelClick?: () => void;
    userRole?: string;
}

export function RentalConsole({ onLogout, onAdminPanelClick, userRole }: RentalConsoleProps) {
    const [selectedFloor, setSelectedFloor] = useState('all');
    const [selectedRoom, setSelectedRoom] = useState<RoomCardData | null>(null);
    const [allRecords, setAllRecords] = useState<TeableRecord[]>([]);

    // Derive floors from API data
    const apiFloors = useMemo(() => {
        if (allRecords.length === 0) return [{ code: 'all', name: 'All' }];

        const extracted = extractFloors(allRecords);
        const dynamicFloors = extracted.map(f => ({ code: f, name: f })); // Map to Floor interface

        return [{ code: 'all', name: 'All' }, ...dynamicFloors];
    }, [allRecords]);

    // Fetch floors and rooms from API
    useEffect(() => {
        const loadData = async () => {
            const records = await fetchApartmentData();
            console.log('Raw Records from API:', records); // Debug log
            setAllRecords(records);
        };
        loadData();
    }, []);

    // Check if user has admin access (handle case and whitespace)
    console.log("RentalConsole received userRole:", userRole);
    const normalizedRole = userRole?.trim().toLowerCase();
    const showAdminPanel = normalizedRole === 'super-admin' || normalizedRole === 'super admin' || normalizedRole === 'admin';

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
        const sourceData = allRecords;

        // Filter records by floor
        const filteredRecords = selectedFloor === 'all'
            ? sourceData
            : sourceData.filter(r => String(r.fields['Floor']).trim() === selectedFloor);

        return filteredRecords.map(transformRecordToRoomCard);

    }, [selectedFloor, allRecords]);



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
            />
        </div>
    );
}
