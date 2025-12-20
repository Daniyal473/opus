import { useState, useEffect, useRef, useCallback } from 'react';
import type { RoomCardData, Ticket } from '../../types/rental';
import { API_BASE_URL } from '../../services/api';
import { TicketDialog } from './TicketDialog';
import { AddTicketDialog } from './AddTicketDialog';
import { TicketConfirmationModal } from './TicketConfirmationModal';

interface PropertySidebarProps {
    selectedRoom: RoomCardData | null;
    role?: string;
}



function formatDateTime(isoString: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    });
}

export function PropertySidebar({ selectedRoom, role }: PropertySidebarProps) {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [isAddTicketOpen, setIsAddTicketOpen] = useState(false);
    const [isTicketDropdownOpen, setIsTicketDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [ticketOptions, setTicketOptions] = useState<string[]>([]);
    const [maintenanceOptions, setMaintenanceOptions] = useState<string[]>([]);
    const [agentOptions, setAgentOptions] = useState<string[]>([]);
    const [filterType, setFilterType] = useState<string>('all');

    // Confirmation State
    const [pendingTicketData, setPendingTicketData] = useState<any>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsTicketDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const fetchTicketOptions = async () => {
            try {
                // Adjust URL based on your dev environment setup. Assuming proxy or direct access.
                // If cors usage is an issue, we might need a clearer path or proxy.
                // Given the existing context, I'll try the direct localhost path.
                const response = await fetch(`${API_BASE_URL}/ticket-options/`);
                if (response.ok) {
                    const data = await response.json();
                    setTicketOptions(data.options || []);
                } else {
                    console.error('Failed to fetch ticket options');
                }
            } catch (error) {
                console.error('Error fetching ticket options:', error);
            }
        };

        const fetchMaintenanceOptions = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/maintenance-options/`);
                if (response.ok) {
                    const data = await response.json();
                    setMaintenanceOptions(data.options || []);
                } else {
                    console.error('Failed to fetch maintenance options');
                }
            } catch (error) {
                console.error('Error fetching maintenance options:', error);
            }
        };

        const fetchAgentOptions = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/agents/`);
                if (response.ok) {
                    const data = await response.json();
                    setAgentOptions(data.agents || []);
                } else {
                    console.error('Failed to fetch agent options');
                }
            } catch (error) {
                console.error('Error fetching agent options:', error);
            }
        };

        fetchTicketOptions();
        fetchMaintenanceOptions();
        fetchAgentOptions();
    }, []);

    const fetchTickets = useCallback(async () => {
        if (!selectedRoom) {
            setTickets([]);
            return;
        }
        try {
            // Fetch tickets filtered by the selected room's internal Apartment ID
            const response = await fetch(`${API_BASE_URL}/tickets/?apartment_id=${selectedRoom.apartmentId}`);
            if (response.ok) {
                const data = await response.json();
                setTickets(data.tickets || []);
            } else {
                console.error('Failed to fetch tickets');
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        }
    }, [selectedRoom]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const [newTicketType, setNewTicketType] = useState<string>('In/Out');

    const handleTicketTypeSelect = (type: Ticket['type']) => {
        setNewTicketType(type);
        setIsTicketDropdownOpen(false);
        setIsAddTicketOpen(true);
    };

    const info = selectedRoom
        ? {
            header: `Room ${selectedRoom.id} Property Info`,
            ownedBy: selectedRoom.owner,
            managedBy: selectedRoom.manager,
            leaseType: selectedRoom.lease,
            occupancy: selectedRoom.occupancy,
        }
        : null;

    const handleAddTicket = async (newTicket: Omit<Ticket, 'id' | 'created' | 'status'>) => {
        setPendingTicketData(newTicket);
        setIsConfirmOpen(true);
    };

    const confirmCreateTicket = async () => {
        if (!selectedRoom || !pendingTicketData || isCreating) return;

        setIsCreating(true);
        try {
            const newTicket = pendingTicketData;
            // Use the correct internal apartment ID from the API mapping
            console.log('Selected Room Data:', selectedRoom);
            const apartmentId = selectedRoom.apartmentId;
            console.log('Extracted Apartment ID:', apartmentId);

            // Use FormData to allow file uploads
            const formData = new FormData();
            formData.append('apartment_id', String(apartmentId));

            // Always send the original type value
            formData.append('type', newTicket.type);

            // If type is one of the Visit subtypes (Guest, Foodpanda, etc.), send it as visit_subtype
            const visitSubtypes = ticketOptions; // Dynamic list from API
            if (visitSubtypes.includes(newTicket.type)) {
                formData.append('visit_subtype', newTicket.type);
                console.log('Sending visit_subtype:', newTicket.type);
            }

            // If type is one of the Maintenance subtypes (AC Repair, etc.) or 'Maintenance'
            const maintenanceSubtypes = maintenanceOptions;
            if (maintenanceSubtypes.includes(newTicket.type) || newTicket.type === 'Maintenance' || newTicket.type === 'Work Permit') {
                formData.append('maintenance_subtype', newTicket.type);
                console.log('Sending maintenance_subtype:', newTicket.type);
            }

            formData.append('title', newTicket.title);
            formData.append('purpose', newTicket.description); // Mapping description to purpose
            formData.append('priority', newTicket.priority);
            if (newTicket.arrival) formData.append('arrival', newTicket.arrival);
            if (newTicket.departure) formData.append('departure', newTicket.departure);
            if (newTicket.occupancy) formData.append('occupancy', newTicket.occupancy);
            if (newTicket.agent) {
                formData.append('agent', newTicket.agent);
                console.log('Sending Agent:', newTicket.agent);
            }

            // Handle Guests and Attachments for In/Out tickets
            if (newTicket.guests && newTicket.guests.length > 0) {
                // Serialize generic guest data
                const guestsMeta = newTicket.guests.map((g: any) => ({
                    name: g.name,
                    cnic: g.cnic,
                    cnicExpiry: g.cnicExpiry
                }));
                formData.append('guests_data', JSON.stringify(guestsMeta));

                // Append files
                newTicket.guests.forEach((guest: any, index: number) => {
                    if (guest.attachments) {
                        guest.attachments.forEach((file: File, fileIndex: number) => {
                            formData.append(`guest_${index}_attachment_${fileIndex}`, file);
                        });
                    }
                });
            }

            const response = await fetch(`${API_BASE_URL}/tickets/create/`, {
                method: 'POST',
                // Header for Content-Type is set automatically by browser with boundary for FormData
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to create ticket in backend');
            }

            const data = await response.json();
            console.log('Ticket created successfully', data);

            // Clean up
            setPendingTicketData(null);
            setIsConfirmOpen(false);

            // Refresh ticket list
            fetchTickets();

        } catch (error) {
            console.error('Error creating ticket:', error);
            alert('Failed to save ticket to database.');
        } finally {
            setIsCreating(false);
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'High': return 'text-red-700 bg-red-100 border-red-200';
            case 'Medium': return 'text-orange-700 bg-orange-100 border-orange-200';
            case 'Low': return 'text-green-700 bg-green-100 border-green-200';
            default: return 'text-gray-700 bg-gray-100 border-gray-200';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Open': return 'text-blue-700 bg-blue-100 border-blue-200';
            case 'Under Review': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
            case 'Approved': return 'text-teal-700 bg-teal-100 border-teal-200';
            case 'Closed': return 'text-gray-700 bg-gray-100 border-gray-200';
            default: return 'text-gray-700 bg-gray-100 border-gray-200';
        }
    };

    const filteredTickets = tickets.filter(ticket =>
        filterType === 'all' || ticket.type === filterType
    );

    return (
        <>
            <aside className="right-sidebar bg-white p-4 md:p-5 border-l md:border-gray-200 overflow-y-auto">
                <div id="default-filter-section">
                    <div className="details-section mb-8 border-t pt-4 border-gray-200">
                        <h3 className="text-base font-semibold mb-3">
                            <span id="prop-info-header">{info ? info.header : 'Property Info'}</span>
                        </h3>
                        {info ? (
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
                        ) : (
                            <div className="text-sm text-gray-500 italic">
                                Select a room to view details.
                            </div>
                        )}
                    </div>

                    <div className="room-details-filters mb-6 border-t pt-4 border-gray-200">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-1/2 flex flex-col items-start pr-1">
                                <h3 className="text-base font-semibold mb-2">Room Details</h3>
                                <div className="px-3 py-1 text-xs border rounded-full border-gray-400 text-gray-600 hover:bg-gray-100 cursor-pointer">
                                    {filteredTickets.length} Tickets
                                </div>
                            </div>
                            <div className="w-1/2 flex flex-col items-start pl-2">
                                <h3 className="text-base font-semibold mb-2">Type of Tickets</h3>
                                <select
                                    id="ticket-type"
                                    className="w-full border border-gray-300 rounded-md bg-white text-xs py-1 px-2"
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    style={{
                                        backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M4.5%207.5L10%2013l5.5-5.5H4.5z%22%20fill%3D%226b7280%22%2F%3E%3C%2Fsvg%3E')`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 4px center',
                                        backgroundSize: '12px',
                                        appearance: 'none',
                                    }}
                                >
                                    <option value="all">All</option>
                                    <option value="In/Out">In/Out</option>
                                    <option value="Visit">Visit</option>
                                    <option value="Maintenance">Maintenance</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Tickets List */}
                    <div className="tickets-list border-t pt-4 border-gray-200">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-base font-semibold">Tickets</h3>
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsTicketDropdownOpen(!isTicketDropdownOpen)}
                                    disabled={!selectedRoom}
                                    className="flex items-center gap-1 px-2 py-1 rounded hover:bg-teal-200 transition-colors bg-teal-100 text-teal-800 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-teal-100"
                                    title={selectedRoom ? "Add New Ticket" : "Select a room first"}
                                >
                                    <span>Add New Ticket</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                    </svg>
                                </button>

                                {isTicketDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200 py-1">
                                        <button
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            onClick={() => handleTicketTypeSelect('In/Out')}
                                        >
                                            In/Out
                                        </button>
                                        {role?.toLowerCase() !== 'user' && (
                                            <button
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                                onClick={() => handleTicketTypeSelect('Visit')}
                                            >
                                                Visit
                                            </button>
                                        )}
                                        <button
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            onClick={() => handleTicketTypeSelect('Maintenance')}
                                        >
                                            Maintenance
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3">
                            {filteredTickets.map((ticket) => (
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
                                        <span className="text-xs text-gray-400">{formatDateTime(ticket.created)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </aside >

            <TicketDialog
                ticket={selectedTicket}
                isOpen={!!selectedTicket}
                onClose={() => setSelectedTicket(null)}
                onUpdate={fetchTickets}
                ticketOptions={ticketOptions}
                maintenanceOptions={maintenanceOptions}
                agentOptions={agentOptions}
                role={role}
            />

            <AddTicketDialog
                isOpen={isAddTicketOpen}
                onClose={() => setIsAddTicketOpen(false)}
                onAdd={handleAddTicket}
                initialType={newTicketType}
                roomId={selectedRoom?.id}
                roomNumber={selectedRoom?.id} // Assuming ID is the display number here based on prior usage
                ticketOptions={ticketOptions}
                maintenanceOptions={maintenanceOptions}
                agentOptions={agentOptions}
                role={role}
            />

            <TicketConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmCreateTicket}
                ticketData={pendingTicketData}
                roomNumber={selectedRoom?.id}
                isSubmitting={isCreating}
            />
        </>
    );
}
