import type { RoomCardData } from '../../types/rental';

interface RoomCardProps {
    room: RoomCardData;
    isActive: boolean;
    onClick: () => void;
}

export function RoomCard({ room, isActive, onClick }: RoomCardProps) {
    // Determine CSS classes based on status - matching original HTML exactly
    let statusClass = '';

    if (room.status === 'occupied') {
        statusClass = 'status-occupied';
    } else if (room.status === 'checking-out') {
        statusClass = 'status-checking-out';
    } else if (room.status === 'maintenance') {
        statusClass = 'status-maintenance';
    } else {
        statusClass = 'status-unoccupied';
    }

    const secondaryBg = room.status === 'occupied' ? 'secondary-bg-white' : 'secondary-bg-gray';

    return (
        <div
            className={`room-card ${statusClass} ${isActive ? 'active' : ''}`}
            onClick={onClick}
        >
            <div className="room-header">
                <span className="room-number">{room.id}</span>
                <span className={`room-type-badge ${secondaryBg}`}>{room.type}</span>
            </div>
            <p className="room-size">{room.size}</p>
            <p className="room-details">{room.details}</p>
            <p className={`room-status ${room.textClass}`}>
                {room.status.replace('-', ' ').toUpperCase()}
            </p>
        </div>
    );
}
