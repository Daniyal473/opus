import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Eye, User, Calendar, Building, Car, CheckCircle, LogOut } from 'lucide-react';
import { fetchParkingTickets, fetchApartmentData, updateTicket, fetchParkingHistory, fetchOwnerManagementParking } from '../../services/teable';
import type { Ticket } from '../../types/rental';
import { TicketDialog } from './TicketDialog';

interface FDOPanelViewProps {
    onBack: () => void;
    role?: string;
    onTicketUpdated?: (ticketId: string) => void;
}

const GUEST_COLUMNS = [
    { id: 'upcoming-check-in', label: 'Upcoming Stay', color: 'bg-blue-50 border-blue-200', headerColor: 'text-black' },
    { id: 'staying-guest', label: 'Staying Guest', color: 'bg-green-50 border-green-200', headerColor: 'text-black' },
    { id: 'upcoming-check-out', label: 'Upcoming Check-out', color: 'bg-orange-50 border-orange-200', headerColor: 'text-black' },
];

const OWNER_COLUMNS = [
    { id: 'owner', label: 'Owner', color: 'bg-purple-50 border-purple-200', headerColor: 'text-black' },
    { id: 'management', label: 'Management', color: 'bg-gray-50 border-gray-200', headerColor: 'text-black' },
];

interface RoomInfo {
    name: string;
    lease: string;
}

export function FDOPanelView({ onBack, role, onTicketUpdated }: FDOPanelViewProps) {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [roomMap, setRoomMap] = useState<Record<string, RoomInfo>>({});
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [showEditDialog, setShowEditDialog] = useState(false);

    const [activeTab, setActiveTab] = useState<'guest' | 'owner'>('guest');

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [ticketsData, apartmentsData, ownerMgmtData] = await Promise.all([
                fetchParkingTickets(),
                fetchApartmentData(),
                fetchOwnerManagementParking()
            ]);

            // Map Apartments
            const map: Record<string, RoomInfo> = {};
            apartmentsData.forEach(apt => {
                const name = apt.fields['Apartment Number '] || apt.fields['Apartment ID'] || apt.id;
                const lease = apt.fields['Category'] || 'Unknown';

                const info = { name: String(name), lease: String(lease) };

                if (apt.fields['Apartment ID']) map[apt.fields['Apartment ID']] = info;
                map[apt.id] = info;
            });
            setRoomMap(map);

            // Combine guest tickets and owner/management tickets
            const allTickets = [...ticketsData, ...ownerMgmtData];
            setTickets(allTickets);
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCardClick = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setShowEditDialog(true);
    };

    const handleTicketUpdate = (updatedTicket?: Ticket) => {
        loadData();
        if (updatedTicket && onTicketUpdated) {
            onTicketUpdated(updatedTicket.id);
        }
    };

    const handleCheckIn = async (e: React.MouseEvent, ticket: Ticket) => {
        e.stopPropagation();
        if (!ticket.teableId) return;

        setIsLoading(true);
        try {
            const now = new Date().toISOString();
            await updateTicket(ticket.teableId, { checkIn: now });
            await loadData();
        } catch (error) {
            console.error("Failed to check in:", error);
            alert("Failed to mark check-in");
            setIsLoading(false);
        }
    };

    const handleCheckOut = async (e: React.MouseEvent, ticket: Ticket) => {
        e.stopPropagation();
        if (!ticket.teableId) return;

        setIsLoading(true);
        try {
            const now = new Date().toISOString();
            await updateTicket(ticket.teableId, { checkOut: now });
            await loadData();
        } catch (error) {
            console.error("Failed to check out:", error);
            alert("Failed to mark check-out");
            setIsLoading(false);
        }
    };

    // --- History Modal Logic ---
    const [showHistoryDialog, setShowHistoryDialog] = useState(false);
    const [selectedHistoryTicket, setSelectedHistoryTicket] = useState<Ticket | null>(null);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const handleHistory = async (ticket: Ticket) => {
        setSelectedHistoryTicket(ticket);
        setShowHistoryDialog(true);
        setHistoryData([]);
        setIsLoadingHistory(true);

        try {
            const data = await fetchParkingHistory(String(ticket.id), ticket.type, ticket.title);
            setHistoryData(data);
        } catch (error) {
            console.error("Failed to fetch history:", error);
            alert("Failed to load history");
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const getColumns = () => activeTab === 'guest' ? GUEST_COLUMNS : OWNER_COLUMNS;

    const getTicketsForColumn = (columnId: string, allTickets: Ticket[]) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (activeTab === 'guest') {
            return allTickets.filter(t => {
                // Only include tickets from guest API (those without a meaningful 'type' field)
                // Owner/Management tickets will have type = 'Owner' or 'Management'
                const hasOwnerMgmtType = t.type && (t.type.toLowerCase() === 'owner' || t.type.toLowerCase() === 'management');
                if (hasOwnerMgmtType) return false;

                const todayStr = new Date().toLocaleDateString('en-CA');
                const departureStr = t.departure ? t.departure.split('T')[0] : null;

                const isCheckInNotEmpty = !!t.checkIn && t.checkIn.trim() !== '';
                const isDepartureToday = departureStr === todayStr;

                if (columnId === 'upcoming-check-in') {
                    return !isCheckInNotEmpty;
                } else if (columnId === 'staying-guest') {
                    return isCheckInNotEmpty && !isDepartureToday;
                } else if (columnId === 'upcoming-check-out') {
                    return isCheckInNotEmpty && isDepartureToday;
                }
                return false;
            });
        } else {
            // Owner/Management tab - filter by Type field
            return allTickets.filter(t => {
                if (!t.type) return false; // Only include tickets from owner/management API

                const ticketType = (t.type || '').toLowerCase();

                if (columnId === 'owner') {
                    return ticketType === 'owner';
                } else if (columnId === 'management') {
                    return ticketType === 'management';
                }
                return false;
            });
        }
    };

    const columns = getColumns();

    // Helper to format date nicely (e.g., "1 Jan, 2026")
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch { return dateStr; }
    };

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch { return dateStr; }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm relative">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">Ticket Requests</h1>
                </div>

                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('guest')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'guest'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Guest
                    </button>
                    <button
                        onClick={() => setActiveTab('owner')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'owner'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Owner/Management
                    </button>
                </div>

                <div className="flex items-center">
                    <button onClick={() => loadData()} className="p-2 text-gray-500 hover:text-gray-700">
                        <RefreshCw size={20} />
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-x-auto overflow-y-hidden p-6">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full text-gray-500">
                        <RefreshCw className="animate-spin mr-2" /> Loading...
                    </div>
                ) : (
                    <div className="flex gap-6 h-full min-w-max">
                        {columns.map(col => {
                            const colTickets = getTicketsForColumn(col.id, tickets);
                            return (
                                <div key={col.id} className={`flex-shrink-0 w-96 flex flex-col rounded-xl border ${col.color} bg-opacity-40`}>
                                    <div className={`p-4 font-bold text-lg ${col.headerColor || 'text-gray-700'} border-b border-gray-200/50 flex justify-between items-center`}>
                                        <span>{col.label}</span>
                                        <span className="bg-gray-800 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {colTickets.length}
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {colTickets.length === 0 ? (
                                            <div className="text-center py-8 text-gray-400 text-sm">No tickets</div>
                                        ) : (
                                            colTickets.map(ticket => {

                                                return (
                                                    <div
                                                        key={ticket.id}
                                                        className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all relative group"
                                                    >
                                                        {/* Top Row: ID */}
                                                        <div className="flex justify-between items-start mb-1.5">
                                                            <div className="text-gray-500 text-sm font-mono flex items-center gap-1">
                                                                <span className="text-gray-400">#</span>{ticket.id}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-gray-600 text-xs font-medium whitespace-nowrap bg-gray-50 px-2 py-1 rounded">
                                                                <Building size={14} />
                                                                {roomMap[String(ticket.apartmentId)]?.name || ticket.apartmentId || 'Unknown'}
                                                            </div>
                                                        </div>

                                                        {/* User & Apartment */}
                                                        {/* User & Parking */}
                                                        <div className="flex justify-between items-center mb-2 gap-2">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                <div className="bg-gray-100 p-1.5 rounded-full text-gray-600 flex-shrink-0">
                                                                    <User size={16} />
                                                                </div>
                                                                <div className="font-bold text-gray-800 text-sm leading-tight truncate">
                                                                    {ticket.title}
                                                                </div>
                                                            </div>
                                                            {/* Show parking in header only for guest tickets (NOT Owner/Management) */}
                                                            {ticket.parking && !(ticket.type && (ticket.type.toLowerCase() === 'owner' || ticket.type.toLowerCase() === 'management')) && (
                                                                <span className="bg-blue-50 text-blue-700 border border-blue-100 text-sm font-bold px-2 py-1 rounded flex items-center gap-1">
                                                                    <Car size={14} />
                                                                    {ticket.parking}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Dates */}
                                                        <div className="space-y-2 mb-2">
                                                            <div className="flex items-center text-gray-700 text-sm font-medium">
                                                                {(ticket.type && (ticket.type.toLowerCase() === 'owner' || ticket.type.toLowerCase() === 'management')) ? (
                                                                    // For Owner/Management: Show Parking Number
                                                                    <>
                                                                        <Car size={14} className="mr-2 text-gray-400" />
                                                                        <span className="font-bold text-gray-800">{ticket.parking || 'No Parking Assigned'}</span>
                                                                    </>
                                                                ) : (
                                                                    // For Guests: Show Dates
                                                                    <>
                                                                        <Calendar size={14} className="mr-2 text-gray-400" />
                                                                        <span>{formatDate(ticket.arrival)} – {formatDate(ticket.departure)}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            {(ticket.checkIn || ticket.checkOut) && (
                                                                <div className="flex flex-col gap-1 text-sm mt-2">
                                                                    {ticket.checkIn && (
                                                                        <div className="flex items-start gap-2 text-emerald-800">
                                                                            <CheckCircle size={16} className="mt-0.5 text-emerald-700 fill-emerald-100" />
                                                                            <div>
                                                                                <span className="font-semibold">Check-In: </span>
                                                                                <span>{new Date(ticket.checkIn).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {ticket.checkOut && (
                                                                        <div className="flex items-start gap-2 text-red-900">
                                                                            <LogOut size={16} className="mt-0.5 text-red-700" />
                                                                            <div>
                                                                                <span className="font-semibold">Check-Out: </span>
                                                                                <span>{new Date(ticket.checkOut).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="border-t border-gray-100 my-1"></div>

                                                        {/* Footer Actions */}
                                                        <div className="flex items-center justify-between pt-1">
                                                            <div>
                                                                <div className="flex items-center gap-1">
                                                                    {/* Only show Preview button for guest tickets (NOT Owner/Management) */}
                                                                    {!(ticket.type && (ticket.type.toLowerCase() === 'owner' || ticket.type.toLowerCase() === 'management')) && (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleCardClick(ticket); }}
                                                                            className="px-3 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center"
                                                                            title="Preview"
                                                                        >
                                                                            <Eye size={16} />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleHistory(ticket); }}
                                                                        className="px-3 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center"
                                                                        title="View History"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-history"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" /><path d="M3 3v9h9" /><path d="M12 7v5l4 2" /></svg>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Primary Action Button - Only for guest tickets (NOT Owner/Management) */}
                                                            {!(ticket.type && (ticket.type.toLowerCase() === 'owner' || ticket.type.toLowerCase() === 'management')) && (
                                                                <>
                                                                    {(!ticket.checkIn) && (
                                                                        <button
                                                                            onClick={(e) => handleCheckIn(e, ticket)}
                                                                            className="flex items-center gap-2 px-3 py-1 border-2 border-green-700 text-green-700 font-bold text-xs rounded-lg hover:bg-green-50 transition-colors"
                                                                        >
                                                                            Mark Check In
                                                                        </button>
                                                                    )}
                                                                    {(ticket.checkIn && !ticket.checkOut) && (
                                                                        <button
                                                                            onClick={(e) => handleCheckOut(e, ticket)}
                                                                            className="flex items-center gap-2 px-3 py-1 border-2 border-red-700 text-red-700 font-bold text-xs rounded-lg hover:bg-red-50 transition-colors"
                                                                        >
                                                                            Mark Check Out
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
                }
            </main >

            <TicketDialog
                isOpen={showEditDialog}
                onClose={() => setShowEditDialog(false)}
                ticket={selectedTicket}
                onUpdate={handleTicketUpdate}
                role={role}
            />

            {/* History Modal */}
            {showHistoryDialog && selectedHistoryTicket && (
                <div className="fixed inset-0 z-50 flex justify-center items-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Parking History</h3>
                                <p className="text-xs text-gray-500 font-mono mt-0.5">#{selectedHistoryTicket.id} • {selectedHistoryTicket.title}</p>
                            </div>
                            <button
                                onClick={() => setShowHistoryDialog(false)}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                            {isLoadingHistory ? (
                                <div className="flex justify-center py-8 text-gray-400">
                                    <RefreshCw className="animate-spin mr-2" /> Loading history...
                                </div>
                            ) : historyData.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    No parking history found
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {historyData.map((log: any, index: number) => (
                                        <div key={log.id} className="relative flex gap-4 group">
                                            {/* Timeline Line Segment */}
                                            {index !== historyData.length - 1 && (
                                                <div className="absolute left-[0.95rem] top-8 bottom-[-1rem] w-0.5 bg-gray-100 group-last:hidden"></div>
                                            )}

                                            {/* Icon */}
                                            <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${log.action === 'In'
                                                ? 'bg-green-50 border-green-200 text-green-600'
                                                : log.action === 'Out'
                                                    ? 'bg-red-50 border-red-200 text-red-600'
                                                    : 'bg-gray-50 border-gray-200 text-gray-500'
                                                }`}>
                                                {log.action === 'In' ? <Car size={16} /> : <LogOut size={16} className="ml-0.5" />}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100 hover:border-gray-200 transition-colors">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`font-bold text-sm ${log.action === 'In' ? 'text-green-700' : log.action === 'Out' ? 'text-red-700' : 'text-gray-700'
                                                        }`}>
                                                        Logged {log.action}
                                                    </span>
                                                    <span className="text-xs text-gray-400 whitespace-nowrap">
                                                        {formatDateTime(log.time)}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-600 flex items-center gap-3">
                                                    {log.vehicle && (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-medium text-gray-500">Vehicle:</span>
                                                            <span className="font-mono bg-white px-1.5 rounded border border-gray-200">{log.vehicle}</span>
                                                        </div>
                                                    )}
                                                    {log.apartment && (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-medium text-gray-500">Room:</span>
                                                            <span>{log.apartment}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-right">
                            <button
                                onClick={() => setShowHistoryDialog(false)}
                                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 shadow-sm transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
