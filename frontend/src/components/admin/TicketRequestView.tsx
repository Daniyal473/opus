import './TicketRequestView.css';
import { useState, useEffect } from 'react';
import { ArrowLeft, Eye } from 'lucide-react';
import { fetchTickets, updateTicket, fetchApartmentData } from '../../services/teable';
import { API_BASE_URL } from '../../services/api';
import type { Ticket } from '../../types/rental';
import { TicketDialog } from '../rental/TicketDialog';

interface TicketRequestViewProps {
    onBack: () => void;
    role?: string;
}

export function TicketRequestView({ onBack, role }: TicketRequestViewProps) {
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



    const loadData = async (start?: string, end?: string) => {
        setIsLoading(true);
        try {
            // Use current state if not passed args (args used for initial load or button click)
            const s = start !== undefined ? start : startDate;
            const e = end !== undefined ? end : endDate;

            // Fetch Data in parallel
            const [ticketsData, apartmentsData] = await Promise.all([
                fetchTickets(s, e),
                fetchApartmentData()
            ]);

            // Create Room Map
            const map: Record<string, string> = {};
            apartmentsData.forEach(apt => {
                // Use 'Apartment Number ' (with space) or fallback
                const name = apt.fields['Apartment Number '] || apt.fields['Apartment ID'] || apt.id;
                // Map by both 'Apartment ID' (internal string ID) and record ID to be safe
                if (apt.fields['Apartment ID']) map[apt.fields['Apartment ID']] = String(name);
                map[apt.id] = String(name);
            });
            setRoomMap(map);

            // Sort Tickets by date desc
            const sorted = ticketsData.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
            setTickets(sorted);


        } catch (error) {
            console.error("Error loading ticket requests:", error);
        } finally {
            setIsLoading(false);
        }
    };

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

    useEffect(() => {
        loadData();
    }, []);

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

        loadData(startDate, endDate);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Open': return 'bg-blue-100 text-blue-800';
            case 'Approved': return 'bg-teal-100 text-teal-800';
            case 'Closed': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
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
                        Ticket Requests
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
                                                        className="flex items-center gap-1 text-[var(--color-primary)] hover:text-teal-700 px-2 py-1 rounded hover:bg-teal-50 transition-colors text-xs font-medium border border-teal-200"
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
                onClose={() => setShowEditDialog(false)}
                ticket={selectedTicket}
                onUpdate={() => {
                    // Quick reload logic
                    // Use current state dates
                    loadData(startDate, endDate);
                    setShowEditDialog(false);
                    setSelectedTicket(null);
                }}
                ticketOptions={ticketOptions}
                maintenanceOptions={maintenanceOptions}
                agentOptions={agentOptions}
                role={role}
            />
        </div>
    );
}
