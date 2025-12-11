import type { RoomCardData } from '../../types/rental';

interface RoomCardProps {
    room: RoomCardData;
    isActive: boolean;
    onClick: () => void;
}

export function RoomCard({ room, isActive, onClick }: RoomCardProps) {
    return (
        <div
            className={`room-card bg-white ${isActive ? 'active' : ''}`}
            onClick={onClick}
        >
            <div className="room-header">
                <span className="room-number">{room.id}</span>
                <span className="room-type-badge secondary-bg-gray">{room.type}</span>
            </div>

            {/* Metrics Grid - Compact 4-column layout */}
            <div className="mt-3 space-y-3">
                {/* Tickets Row */}
                <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tickets</div>
                    <div className="grid grid-cols-4 gap-1">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-gray-500 font-semibold uppercase truncate">Active</span>
                            <span className="text-base font-bold text-gray-800 leading-none">5/3</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] text-gray-500 font-semibold uppercase truncate">Guest</span>
                            <span className="text-base font-bold text-gray-800 leading-none">0</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] text-gray-500 font-semibold uppercase truncate">Maint</span>
                            <span className="text-base font-bold text-gray-800 leading-none">0</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] text-gray-500 font-semibold uppercase truncate">In/Out</span>
                            <span className="text-base font-bold text-gray-800 leading-none">0</span>
                        </div>
                    </div>
                </div>

                {/* Details Row */}
                <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Details</div>
                    <div className="grid grid-cols-4 gap-1">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-gray-500 font-semibold uppercase truncate">Occ</span>
                            <span className="text-base font-bold text-gray-800 leading-none">{room.occupancy || '0/3'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] text-gray-500 font-semibold uppercase truncate">Type</span>
                            <span className="text-base font-bold text-gray-800 leading-none truncate" title={room.type}>{room.type}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] text-gray-500 font-semibold uppercase truncate">Park</span>
                            <span className="text-base font-bold text-gray-800 leading-none">{room.parking || 'No'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] text-gray-500 font-semibold uppercase truncate">Visit</span>
                            <span className="text-base font-bold text-gray-800 leading-none">{room.visits}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
