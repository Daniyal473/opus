import { useState } from 'react';
import type { RoomCardData, PropertyInfo, Ticket } from '../../types/rental';
import { TicketDialog } from './TicketDialog';
import { AddTicketDialog } from './AddTicketDialog';

interface PropertySidebarProps {
    selectedRoom: RoomCardData | null;
    defaultInfo: PropertyInfo;
}

// Dummy tickets data - move to state in a real app, keeping outside component for now to persist across re-renders for this demo
let initialTickets: Ticket[] = [
    {
        id: 'T-001',
        type: 'Guest Request',
        title: 'Extra Towels Needed',
        status: 'Open',
        priority: 'Low',
        created: '2 hours ago',
        description: 'Guest requested 2 additional towels'
    },
    {
        id: 'T-002',
        type: 'Cleaning',
        title: 'Deep Cleaning Required',
        status: 'In Progress',
        priority: 'Medium',
        created: '5 hours ago',
        description: 'Scheduled deep cleaning for checkout'
    },
    {
        id: 'T-003',
        type: 'Maintenance',
        title: 'A/C Not Cooling',
        status: 'Open',
        priority: 'High',
        created: '1 day ago',
        description: 'Air conditioning unit needs repair'
    },
    {
        id: 'T-004',
        type: 'Guest Request',
        title: 'Late Checkout Request',
        status: 'Closed',
        priority: 'Low',
        created: '2 days ago',
        description: 'Guest requested 2pm checkout'
    }
];

export function PropertySidebar({ selectedRoom, defaultInfo }: PropertySidebarProps) {
    const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [isAddTicketOpen, setIsAddTicketOpen] = useState(false);

    const info = selectedRoom
        ? {
            header: `Room ${selectedRoom.id} Property Info`,
            ownedBy: selectedRoom.owner,
            managedBy: selectedRoom.manager,
            leaseType: selectedRoom.lease,
            occupancy: selectedRoom.occupancy,
        }
        : defaultInfo;

    const handleAddTicket = (newTicket: Omit<Ticket, 'id' | 'created' | 'status'>) => {
        const ticket: Ticket = {
            id: `T-00${tickets.length + 1}`,
            ...newTicket,
            status: 'Open',
            created: 'Just now'
        };
        setTickets([ticket, ...tickets]);
        initialTickets = [ticket, ...tickets]; // Update the persistent store
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'High': return 'text-red-600 bg-red-50';
            case 'Medium': return 'text-orange-600 bg-orange-50';
            case 'Low': return 'text-green-600 bg-green-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Open': return 'text-blue-600 bg-blue-50';
            case 'In Progress': return 'text-yellow-600 bg-yellow-50';
            case 'Closed': return 'text-gray-600 bg-gray-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    return (
        <>
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
                                    {tickets.length} Tickets
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

                    {/* Tickets List */}
                    <div className="tickets-list border-t pt-4 border-gray-200">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-base font-semibold">Tickets</h3>
                            <button
                                onClick={() => setIsAddTicketOpen(true)}
                                className="p-1 rounded-full hover:bg-gray-100 text-[var(--color-primary)] transition-colors"
                                title="Add New Ticket"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-3">
                            {tickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    className="ticket-card bg-gray-50 border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer hover:bg-gray-100 transform transition-transform duration-150 active:scale-[0.99]"
                                    onClick={() => setSelectedTicket(ticket)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-semibold text-gray-700">{ticket.id}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(ticket.status)}`}>
                                                    {ticket.status}
                                                </span>
                                            </div>
                                            <h4 className="text-sm font-medium text-gray-900">{ticket.title}</h4>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(ticket.priority)}`}>
                                            {ticket.priority}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-2">{ticket.description}</p>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-500">{ticket.type}</span>
                                        <span className="text-xs text-gray-400">{ticket.created}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </aside>

            <TicketDialog
                ticket={selectedTicket}
                isOpen={!!selectedTicket}
                onClose={() => setSelectedTicket(null)}
            />

            <AddTicketDialog
                isOpen={isAddTicketOpen}
                onClose={() => setIsAddTicketOpen(false)}
                onAdd={handleAddTicket}
            />
        </>
    );
}
