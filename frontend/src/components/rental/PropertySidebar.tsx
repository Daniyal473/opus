import type { RoomCardData } from '../../types/rental';
import type { PropertyInfo } from '../../types/rental';

interface PropertySidebarProps {
    selectedRoom: RoomCardData | null;
    defaultInfo: PropertyInfo;
}

export function PropertySidebar({ selectedRoom, defaultInfo }: PropertySidebarProps) {
    const info = selectedRoom
        ? {
            header: `Room ${selectedRoom.id} Property Info`,
            ownedBy: selectedRoom.owner,
            managedBy: selectedRoom.manager,
            leaseType: selectedRoom.lease,
            occupancy: selectedRoom.occupancy,
        }
        : defaultInfo;

    return (
        <aside className="right-sidebar bg-white p-4 md:p-5 border-l md:border-gray-200 overflow-y-auto">
            <div id="default-filter-section">
                <div className="details-section mb-8 border-t pt-4 border-gray-200">
                    <h3 className="text-base font-semibold mb-3">
                        <span id="prop-info-header">{info.header}</span>
                    </h3>
                    <div className="text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Owned by:</span>
                            <span className="text-[var(--color-dark-text)]">{info.ownedBy}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Managed by:</span>
                            <span className="text-[var(--color-dark-text)]">{info.managedBy}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Short-term / Long-term:</span>
                            <span className="text-[var(--color-dark-text)]">{info.leaseType}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium text-gray-600">Occupancy count:</span>
                            <span className="text-[var(--color-dark-text)]">{info.occupancy}</span>
                        </div>
                    </div>
                </div>

                <div className="room-details-filters mb-6 border-t pt-4 border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-1/2 flex flex-col items-start pr-1">
                            <h3 className="text-base font-semibold mb-2">Room Details</h3>
                            <div className="px-3 py-1 text-xs border rounded-full border-gray-400 text-gray-600 hover:bg-gray-100 cursor-pointer">
                                0 Tickets
                            </div>
                        </div>
                        <div className="w-1/2 flex flex-col items-start pl-2">
                            <h3 className="text-base font-semibold mb-2">Type of Tickets</h3>
                            <select
                                id="ticket-type"
                                className="w-full border border-gray-300 rounded-md bg-white text-xs py-1 px-2"
                                style={{
                                    backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M4.5%207.5L10%2013l5.5-5.5H4.5z%22%20fill%3D%226b7280%22%2F%3E%3C%2Fsvg%3E')`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 4px center',
                                    backgroundSize: '12px',
                                    appearance: 'none',
                                }}
                            >
                                <option value="all">All</option>
                                <option value="guest">Guest Request</option>
                                <option value="cleaning">Cleaning</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
