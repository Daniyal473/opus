import { useState, useMemo } from 'react';
import { BuildingSelector } from './BuildingSelector';
import { FloorSelector } from './FloorSelector';
import { RoomGrid } from './RoomGrid';
import { PropertySidebar } from './PropertySidebar';
import { buildings, floors, roomData, defaultPropertyInfo } from '../../data/mockRoomData';
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
        const floorsToRender = selectedFloor === 'all'
            ? floors.filter(f => f.code !== 'all').map(f => f.code)
            : [selectedFloor];

        const cards: RoomCardData[] = [];
        floorsToRender.forEach(floorCode => {
            roomData.forEach((data, index) => {
                const roomNumber = `${floorCode}-${(10 + index).toString()}`;
                cards.push({
                    id: roomNumber,
                    ...data,
                });
            });
        });

        return cards;
    }, [selectedFloor]);

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
                        floors={floors}
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
