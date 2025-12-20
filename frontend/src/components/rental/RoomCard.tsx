import type { RoomCardData } from '../../types/rental';

interface RoomCardProps {
    room: RoomCardData;
    isActive: boolean;
    onClick: () => void;
}

export function RoomCard({ room, isActive, onClick }: RoomCardProps) {
    return (
        <div
            className={`bg-white rounded-lg shadow-md border-l-4 border-teal-500 w-full cursor-pointer transition-all ${isActive ? 'ring-2 ring-teal-600 shadow-lg' : 'hover:shadow-lg'
                }`}
            onClick={onClick}
        >
            {/* Header */}
            <div className="p-2 border-b border-gray-200">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">{room.id}</h2>
                    <span className="bg-teal-100 text-teal-800 text-xs font-medium px-2 py-1 rounded">{room.type}</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-2 space-y-2">
                {/* Tickets */}
                <div>
                    <div className="space-y-1 text-sm ">
                        <div className="flex justify-between">
                            <div className="flex gap-2">
                                <span className="text-gray-600">All / Active:</span>
                                <span className="text-gray-900">{room.ticketCounts?.total || 0} / <span className="font-semibold">{room.ticketCounts?.active || 0}</span></span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-gray-600">In / Out:</span>
                                <span className="text-gray-900">{room.ticketCounts?.inOut || 0}</span>
                            </div>
                        </div>
                        <div className="flex justify-between pt-1">
                            <div className="flex gap-2">
                                <span className="text-gray-600">Visitor:</span>
                                <span className="text-gray-900">{room.ticketCounts?.visitor || 0}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-gray-600">Maintenance:</span>
                                <span className="text-gray-900">{room.ticketCounts?.maintenance || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details */}
                <div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <div className="flex gap-2">
                                <span className="text-gray-600">Parking:</span>
                                <span className={`font-medium`}>
                                    {room.parking || 'No'}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-gray-600">Occupancy:</span>
                                <span className="text-gray-900">{room.occupancy || '0 / 3'}</span>
                            </div>
                        </div>
                        <div className="flex justify-between py-1">
                            <div className="flex gap-2 flex-1 min-w-0 pr-2">
                                <span className="text-gray-600 shrink-0">Type:</span>
                                <span className="text-gray-900 font-bold truncate" title="Short Term Rental">Short Term</span>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <span className="text-gray-600">Visits:</span>
                                <span className="text-gray-900">{room.visits}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
