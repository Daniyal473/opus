import { useState, useMemo, useEffect } from 'react';
import { FloorSelector } from './FloorSelector';
import { RoomGrid } from './RoomGrid';
import { PropertySidebar } from './PropertySidebar';
import { roomData, defaultPropertyInfo } from '../../data/mockRoomData';
import type { RoomCardData, Floor } from '../../types/rental';
import opusLogo from '../../assets/opus-logo.jpg';
import { fetchApartmentData, extractFloors, transformRecordToRoomCard, type TeableRecord } from '../../services/teable';
import './rental.css';

export function RentalConsole() {
    const [floors, setFloors] = useState<Floor[]>([{ code: 'all', name: 'All' }]);
    const [allRecords, setAllRecords] = useState<TeableRecord[]>([]);
    const [selectedFloor, setSelectedFloor] = useState('all');
    const [selectedRoom, setSelectedRoom] = useState<RoomCardData | null>(null);

    // Fetch floors and rooms from API
    useEffect(() => {
        const loadData = async () => {
            const records = await fetchApartmentData();
            console.log('Raw Records from API:', records); // Debug log
            setAllRecords(records);

            const uniqueFloors = extractFloors(records);
            const floorObjects: Floor[] = [
                { code: 'all', name: 'All' },
                ...uniqueFloors.map(f => ({
                    code: f,
                    name: f
                }))
            ];

            setFloors(floorObjects);
        };

        loadData();
    }, []);

    // Generate room cards based on selected floor from API data
    const roomCards = useMemo<RoomCardData[]>(() => {
        // 1. Filter records by floor
        const filteredRecords = selectedFloor === 'all'
            ? allRecords
            : allRecords.filter(r => r.fields['Floor'] === selectedFloor);

        // 2. Transform records to RoomCardData
        // Sort by Apartment Number naturally
        const cards = filteredRecords.map(transformRecordToRoomCard);

        return cards.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }));
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
                    <div className="p-4 flex justify-center border-b border-gray-200">
                        <img
                            src={opusLogo}
                            alt="Opus Logo"
                            className="h-16 w-auto object-contain"
                        />
                    </div>
                    <FloorSelector
                        floors={floors}
                        selectedFloor={selectedFloor}
                        onFloorChange={handleFloorChange}
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

