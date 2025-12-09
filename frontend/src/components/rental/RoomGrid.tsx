import { RoomCard } from './RoomCard';
import type { RoomCardData } from '../../types/rental';

interface RoomGridProps {
    rooms: RoomCardData[];
    selectedRoomId: string | null;
    onRoomSelect: (room: RoomCardData) => void;
}

export function RoomGrid({ rooms, selectedRoomId, onRoomSelect }: RoomGridProps) {
    if (rooms.length === 0) {
        return (
            <div className="text-gray-500 p-4">
                No rooms found for this selection.
            </div>
        );
    }

    return (
        <div>
            {rooms.map((room) => (
                <RoomCard
                    key={room.id}
                    room={room}
                    isActive={selectedRoomId === room.id}
                    onClick={() => onRoomSelect(room)}
                />
            ))}
        </div>
    );
}
