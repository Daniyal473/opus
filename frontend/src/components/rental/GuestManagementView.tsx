import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, RefreshCw, Eye } from 'lucide-react';
import { fetchApartmentData, fetchTicketsByRoom, createTicket, type TeableRecord } from '../../services/teable';
import { API_BASE_URL } from '../../services/api';
import type { Ticket } from '../../types/rental';
import { AddTicketDialog } from './AddTicketDialog';
import { TicketDialog } from './TicketDialog';
import { TicketConfirmationModal } from './TicketConfirmationModal';

interface GuestManagementViewProps {
    onBack: () => void;
    username?: string;
    role?: string;
    onTicketCreated?: () => void;
}

export function GuestManagementView({ onBack, username, role, onTicketCreated }: GuestManagementViewProps) {
    const [myRooms, setMyRooms] = useState<TeableRecord[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<string>('');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Dialog States
    const [isAddTicketOpen, setIsAddTicketOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);

    // Confirmation State
    // Confirmation State
    const [pendingTicketData, setPendingTicketData] = useState<any>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Dropdown State
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [newTicketType, setNewTicketType] = useState<Ticket['type']>('In/Out');
    const [agentOptions, setAgentOptions] = useState<string[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Track URL changes (for Back/Forward)
    const [locationSearch, setLocationSearch] = useState(window.location.search);

    useEffect(() => {
        const handlePopState = () => setLocationSearch(window.location.search);
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Sync URL to selectedTicket
    useEffect(() => {
        const params = new URLSearchParams(locationSearch);
        const ticketParam = params.get('ticket');

        if (ticketParam) {
            // If already selected, do nothing
            if (selectedTicket && selectedTicket.id === ticketParam) return;

            // Find ticket in current list
            const found = tickets.find(t => t.id === ticketParam);
            if (found) {
                setSelectedTicket(found);
                setShowEditDialog(true);
            }
        } else {
            // If URL cleared, close dialog
            if (showEditDialog) {
                setShowEditDialog(false);
                setSelectedTicket(null);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationSearch, tickets]);

    // Sync selectedTicket to URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (selectedTicket && showEditDialog) {
            if (params.get('ticket') !== selectedTicket.id) {
                params.set('ticket', selectedTicket.id);
                const newUrl = `${window.location.pathname}?${params.toString()}`;
                window.history.pushState({ path: newUrl }, '', newUrl);
                setLocationSearch(window.location.search);
            }
        } else {
            if (params.has('ticket')) {
                params.delete('ticket');
                const newUrl = `${window.location.pathname}?${params.toString()}`;
                window.history.pushState({ path: newUrl }, '', newUrl);
                setLocationSearch(window.location.search);
            }
        }
    }, [selectedTicket, showEditDialog]);

    // Initial Load: Fetch Rooms managed by user
    useEffect(() => {
        const loadRooms = async () => {
            if (!username) return;
            setIsLoading(true);
            try {
                const records = await fetchApartmentData();
                // Filter where 'Managed by' == username
                // Note: Field name is 'Managed by'
                const managedRooms = records.filter(r => {
                    const manager = r.fields['Managed by'];
                    return String(manager).trim() === String(username).trim();
                });

                setMyRooms(managedRooms);

                // Auto-select first room
                if (managedRooms.length > 0) {
                    const firstId = managedRooms[0].fields['Apartment ID'];
                    if (firstId) setSelectedRoomId(String(firstId));
                }
            } catch (error) {
                console.error("Error loading rooms:", error);
            } finally {
                setIsLoading(false);
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

        loadRooms();
        fetchAgentOptions();
    }, [username]);

    // Fetch tickets when selected room changes
    const loadTickets = async () => {
        if (!selectedRoomId) {
            setTickets([]);
            return;
        }
        setIsLoading(true);
        try {
            const data = await fetchTicketsByRoom(selectedRoomId);
            // Client-side sort by date desc
            const sorted = data.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
            setTickets(sorted);
        } catch (error) {
            console.error("Error loading tickets:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTickets();
    }, [selectedRoomId]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleTicketTypeSelect = (type: Ticket['type']) => {
        setNewTicketType(type);
        setIsDropdownOpen(false);
        setIsAddTicketOpen(true);
    };

    const handleCreateTicket = async (ticketData: any) => {
        setPendingTicketData(ticketData);
        setIsConfirmOpen(true);
    };

    const confirmCreateTicket = async () => {
        if (!selectedRoomId || !pendingTicketData || isCreating) return;

        setIsCreating(true);
        try {
            await createTicket(pendingTicketData, selectedRoomId);
            // alert("Ticket created successfully!"); // Removed alert
            onTicketCreated?.(); // Trigger toast
            setPendingTicketData(null);
            setIsConfirmOpen(false);
            loadTickets(); // Refresh
        } catch (error) {
            console.error("Failed to create ticket:", error);
            alert("Failed to create ticket.");
        } finally {
            setIsCreating(false);
        }
    };

    const formatDateTime = (isoString: string) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Open': return 'bg-blue-100 text-blue-800';
            case 'Approved': return 'bg-teal-100 text-teal-800';
            case 'Closed': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };



    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">
                        Ticket Management
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    {/* Room Selector */}
                    {myRooms.length > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600">Property:</span>
                            <select
                                className="border border-gray-300 rounded-md py-1.5 px-3 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                                value={selectedRoomId}
                                onChange={(e) => setSelectedRoomId(e.target.value)}
                            >
                                {myRooms.map(room => (
                                    <option key={room.id} value={String(room.fields['Apartment ID'])}>
                                        {/* Helper to get display name for room selector inline since func removed */}
                                        {room.fields['Apartment Number '] || `Room ${room.fields['Apartment ID']}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="relative inline-block text-left" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            disabled={!selectedRoomId}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-md text-sm font-medium hover:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Plus size={16} />
                            Create Ticket
                        </button>
                        {isDropdownOpen && (
                            <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                                <div className="py-1">
                                    <button
                                        onClick={() => handleTicketTypeSelect('In/Out')}
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                    >
                                        In/Out
                                    </button>
                                    {role?.toLowerCase() !== 'user' && (
                                        <button
                                            onClick={() => handleTicketTypeSelect('Visit')}
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                        >
                                            Visit
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleTicketTypeSelect('Maintenance')}
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                    >
                                        Maintenance
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 p-6 overflow-y-auto w-full max-w-7xl mx-auto">
                {isLoading && tickets.length === 0 ? (
                    <div className="flex justify-center items-center h-64 text-gray-500 gap-2">
                        <RefreshCw className="animate-spin" size={20} /> Loading...
                    </div>
                ) : myRooms.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <p className="text-gray-500">No managed properties found associated with your account.</p>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <p className="text-gray-500 mb-2">No tickets found.</p>
                        <button
                            onClick={() => setIsAddTicketOpen(true)}
                            className="text-[var(--color-primary)] font-medium hover:underline"
                        >
                            Create your first ticket
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tickets.map((ticket) => (
                                    <tr
                                        key={ticket.id}
                                        onClick={() => {
                                            setSelectedTicket(ticket);
                                            setShowEditDialog(true);
                                        }}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.id}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={ticket.title}>{ticket.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{ticket.type}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={ticket.description}>
                                            {ticket.description}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                                                {ticket.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDateTime(ticket.created)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedTicket(ticket);
                                                    setShowEditDialog(true);
                                                }}
                                                className="flex items-center gap-1 text-[var(--color-primary)] hover:text-yellow-700 px-3 py-1 rounded-md hover:bg-yellow-50 transition-colors text-sm font-medium"
                                                title="View Ticket"
                                            >
                                                <Eye size={16} />
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            <AddTicketDialog
                isOpen={isAddTicketOpen}
                onClose={() => setIsAddTicketOpen(false)}
                onAdd={handleCreateTicket}
                roomId={selectedRoomId}
                roomNumber={myRooms.find(r => String(r.fields['Apartment ID']) === selectedRoomId)?.fields['Apartment Number '] as string}
                // Options can be passed if fetched, or default
                initialType={newTicketType}
                agentOptions={agentOptions}
                role={role}
            />

            <TicketDialog
                isOpen={showEditDialog}
                onClose={() => setShowEditDialog(false)}
                ticket={selectedTicket}
                onUpdate={loadTickets}
                role={role}
            />

            <TicketConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmCreateTicket}
                ticketData={pendingTicketData}
                roomNumber={myRooms.find(r => String(r.fields['Apartment ID']) === selectedRoomId)?.fields['Apartment Number '] as string}
                isSubmitting={isCreating}
            />
        </div>
    );
}
