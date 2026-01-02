import './TicketRequestView.css';
import { useState, useEffect } from 'react';
import { useDataCache } from '../../hooks/useDataCache';
import { ArrowLeft, Eye } from 'lucide-react';
import { fetchTickets, updateTicket, fetchApartmentData } from '../../services/teable';
import { API_BASE_URL } from '../../services/api';
import type { Ticket } from '../../types/rental';
import { TicketDialog } from '../rental/TicketDialog';

interface TicketRequestViewProps {
    onBack: () => void;
    role?: string;
    username?: string;
    onTicketUpdated?: (ticketId: string) => void;
    pageTitle?: string;
}

export function TicketRequestView({ onBack, role, username, onTicketUpdated, pageTitle }: TicketRequestViewProps) {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [roomMap, setRoomMap] = useState<Record<string, string>>({}); // ID -> Name
    const [ticketOptions, setTicketOptions] = useState<string[]>([]);
    const [maintenanceOptions, setMaintenanceOptions] = useState<string[]>([]);
    const [agentOptions, setAgentOptions] = useState<string[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

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


    // Default dates: Today - 3 days to Today + 3 days
    // Using local time YYYY-MM-DD format
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 3);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });



    // State for Active Search Params (to trigger cache update only on 'Start')
    const [activeParams, setActiveParams] = useState({ start: startDate, end: endDate });

    const { data: cachedData, isLoading: isCacheLoading, refetch } = useDataCache<{ tickets: Ticket[], roomMap: Record<string, string> }>(
        `ticket_requests_${activeParams.start}_${activeParams.end}`,
        async () => {
            const [ticketsData, apartmentsData] = await Promise.all([
                fetchTickets(activeParams.start, activeParams.end),
                fetchApartmentData()
            ]);

            // Create Room Map
            const map: Record<string, string> = {};
            apartmentsData.forEach(apt => {
                const name = apt.fields['Apartment Number '] || apt.fields['Apartment ID'] || apt.id;
                if (apt.fields['Apartment ID']) map[apt.fields['Apartment ID']] = String(name);
                map[apt.id] = String(name);
            });

            // Sort Tickets
            const sorted = ticketsData.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

            return { tickets: sorted, roomMap: map };
        },
        120000 // 2 minutes
    );

    // Sync Cache to State
    useEffect(() => {
        if (cachedData) {
            setTickets(cachedData.tickets);
            setRoomMap(cachedData.roomMap);
        }
    }, [cachedData]);

    useEffect(() => {
        setIsLoading(isCacheLoading);
    }, [isCacheLoading]);

    // Fetch Options on Mount
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [ticketRes, maintRes, agentRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/ticket-options/`),
                    fetch(`${API_BASE_URL}/maintenance-options/`),
                    fetch(`${API_BASE_URL}/agents/`)
                ]);

                if (ticketRes.ok) {
                    const json = await ticketRes.json();
                    setTicketOptions(json.options || []);
                }
                if (maintRes.ok) {
                    const json = await maintRes.json();
                    setMaintenanceOptions(json.options || []);
                }
                if (agentRes.ok) {
                    const json = await agentRes.json();
                    setAgentOptions(json.agents || []);
                }
            } catch (error) {
                console.error("Error fetching options:", error);
            }
        };
        fetchOptions();
    }, []);

    // Initial load handled by hook
    // useEffect(() => {
    //     loadData();
    // }, []);

    const handleSearch = () => {
        if (!startDate || !endDate) {
            alert("Please select both start and end dates.");
            return;
        }
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
            alert("Start date must be before End date.");
            return;
        }

        const differenceInTime = end.getTime() - start.getTime();
        const differenceInDays = differenceInTime / (1000 * 3600 * 24);

        if (differenceInDays > 30) {
            alert("Date range cannot exceed 31 days.");
            return;
        }

        // Update active params to trigger refetch via hook key change
        setActiveParams({ start: startDate, end: endDate });
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

    const formatDateTime = (isoString: string) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const filteredTickets = tickets.filter(ticket => {
        const searchLower = searchTerm.toLowerCase();
        const roomName = ticket.apartmentId ? (roomMap[String(ticket.apartmentId)] || ticket.apartmentId) : '-';

        if (statusFilter !== 'All' && ticket.status !== statusFilter) return false;

        return (
            ticket.id.toLowerCase().includes(searchLower) ||
            String(roomName).toLowerCase().includes(searchLower) ||
            ticket.type.toLowerCase().includes(searchLower) ||
            ticket.title.toLowerCase().includes(searchLower) ||
            ticket.priority.toLowerCase().includes(searchLower) ||
            (ticket.description || '').toLowerCase().includes(searchLower) ||
            (ticket.occupancy || '').toLowerCase().includes(searchLower) ||
            ticket.status.toLowerCase().includes(searchLower) ||
            formatDateTime(ticket.arrival as string).toLowerCase().includes(searchLower) ||
            formatDateTime(ticket.departure as string).toLowerCase().includes(searchLower) ||
            formatDateTime(ticket.created).toLowerCase().includes(searchLower)
        );
    });

    const handleTicketUpdate = (updatedTicket?: Ticket) => {
        if (updatedTicket) {
            setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
            if (onTicketUpdated) onTicketUpdated(updatedTicket.id);
        } else {
            refetch();
            // Don't trigger toast here - TicketDialog calls onUpdate twice
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
                        {pageTitle || 'Ticket Requests'}
                    </h1>
                </div>

                <div className="ticket-request-search-container">
                    <div className="ticket-request-date-container">
                        <span className="ticket-request-date-label">From:</span>
                        <input
                            type="date"
                            className="ticket-request-date-input"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            title="From Date"
                        />
                        <span className="ticket-request-date-label">To:</span>
                        <input
                            type="date"
                            className="ticket-request-date-input"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            title="To Date"
                        />
                        <button
                            className="ticket-request-start-button"
                            onClick={handleSearch}
                        >
                            Start
                        </button>
                        <span className="text-xs text-gray-500 ml-2 italic">
                            (Based on Created Date)
                        </span>
                    </div>
                    <div className="ticket-request-search-wrapper">
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="ticket-request-search-input"
                        />
                        <div className="ticket-request-search-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="text-sm text-gray-500 font-medium">
                        {filteredTickets.length} Requests
                    </div>
                </div>
            </header>

            <main className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-[100%] mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {isLoading ? (
                        <div className="p-8 text-center text-gray-500">Loading requests...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arrival</th>
                                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departure</th>
                                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occ</th>
                                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            <div className="flex items-center">
                                                Status
                                                <select
                                                    value={statusFilter}
                                                    onChange={(e) => setStatusFilter(e.target.value)}
                                                    className="text-xs border-gray-300 rounded focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] p-0 pl-1 pr-1 bg-transparent font-normal normal-case"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <option value="All">All</option>
                                                    <option value="Open">Open</option>
                                                    <option value="Under Review">Under Review</option>
                                                    <option value="Approved">Approved</option>
                                                    <option value="Closed">Closed</option>
                                                </select>
                                            </div>
                                        </th>
                                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredTickets.map((ticket) => (
                                        <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {ticket.id}
                                            </td>
                                            <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {ticket.apartmentId ? (roomMap[String(ticket.apartmentId)] || ticket.apartmentId) : '-'}
                                            </td>
                                            <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {ticket.type}
                                            </td>
                                            <td className="px-2 py-4 text-sm text-gray-900 max-w-[150px] truncate" title={ticket.title}>
                                                {ticket.title}
                                            </td>
                                            <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${ticket.priority === 'High' ? 'bg-red-100 text-red-800' :
                                                        ticket.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-green-100 text-green-800'}`}>
                                                    {ticket.priority}
                                                </span>
                                            </td>
                                            <td className="px-2 py-4 text-sm text-gray-500 max-w-[150px] truncate" title={ticket.description}>
                                                {ticket.description || '-'}
                                            </td>
                                            <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDateTime(ticket.arrival as string)}
                                            </td>
                                            <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDateTime(ticket.departure as string)}
                                            </td>
                                            <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {ticket.occupancy || '-'}
                                            </td>
                                            <td className="px-2 py-4 whitespace-nowrap">
                                                <select
                                                    value={ticket.status}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={async (e) => {
                                                        const newStatus = e.target.value as any;
                                                        if (!ticket.teableId) {
                                                            alert("Error: Ticket ID missing.");
                                                            return;
                                                        }

                                                        // Optimistic update
                                                        setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: newStatus } : t));

                                                        try {
                                                            await updateTicket(ticket.teableId, { status: newStatus });
                                                            if (onTicketUpdated) onTicketUpdated(ticket.id);

                                                            // Log status change to activity table and n8n webhook
                                                            try {
                                                                await fetch(`${API_BASE_URL}/log-status-change/`, {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({
                                                                        status: newStatus,
                                                                        apartment_number: roomMap[String(ticket.apartmentId)] || ticket.apartmentId,
                                                                        ticket_type: ticket.type,
                                                                        ticket_id: ticket.id,
                                                                        username: username,
                                                                        record_id: ticket.teableId
                                                                    })
                                                                });
                                                            } catch (logErr) {
                                                                console.error("Failed to log status change:", logErr);
                                                            }
                                                        } catch (error) {
                                                            console.error("Error updating status:", error);
                                                            alert("Failed to update status.");
                                                            // Revert
                                                            setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: ticket.status } : t));
                                                        }
                                                    }}
                                                    className={`block w-full text-xs font-semibold rounded-full border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 py-1 pl-2 pr-6 
                                                        ${getStatusColor(ticket.status)} border-0 ring-1 ring-inset ring-gray-200 cursor-pointer`}
                                                >
                                                    <option value="Open">Open</option>
                                                    <option value="Under Review">Under Review</option>
                                                    <option value="Approved">Approved</option>
                                                    <option value="Closed">Closed</option>
                                                </select>
                                            </td>
                                            <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDateTime(ticket.created)}
                                            </td>
                                            <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTicket(ticket);
                                                            setShowEditDialog(true);
                                                        }}
                                                        className="flex items-center gap-1 text-[var(--color-primary)] hover:text-yellow-700 px-2 py-1 rounded hover:bg-yellow-50 transition-colors text-xs font-medium border border-yellow-200"
                                                        title="View Details"
                                                    >
                                                        <Eye size={14} />
                                                        View
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredTickets.length === 0 && (
                                <div className="p-8 text-center text-gray-500">No results found. Try adjusting the date range or search terms.</div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <TicketDialog
                isOpen={showEditDialog}
                onClose={() => {
                    setShowEditDialog(false);
                    setSelectedTicket(null);
                }}
                ticket={selectedTicket}
                onUpdate={handleTicketUpdate}
                ticketOptions={ticketOptions}
                maintenanceOptions={maintenanceOptions}
                agentOptions={agentOptions}
                role={role}
                username={username}
                apartmentNumber={selectedTicket && selectedTicket.apartmentId ? (roomMap[String(selectedTicket.apartmentId)] || String(selectedTicket.apartmentId)) : undefined}
            />
        </div>
    );
}
