import { Download, X } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { useState, useEffect } from 'react';
import type { Ticket } from '../../types/rental';

interface TicketDialogProps {
    ticket: Ticket | null;
    isOpen: boolean;
    onClose: () => void;
}

interface LinkedRecord {
    id: string;
    name: string;
    cnic: string;
    cnicExpiry?: string;
    checkInDate?: string;
    checkOutDate?: string;
    type?: string;
    agent?: string;
    attachments?: {
        id: string;
        url: string;
        name: string;
        type: string;
    }[];
}

export function TicketDialog({ ticket, isOpen, onClose }: TicketDialogProps) {
    const [linkedRecords, setLinkedRecords] = useState<LinkedRecord[]>([]);
    const [previewAttachment, setPreviewAttachment] = useState<{ url: string, name: string, type: string } | null>(null);

    const fetchLinkedRecords = () => {
        if (!ticket) return;
        // setLinkedRecords([]); // Don't reset on refresh to avoid flickering if merely updating status
        // Only fetch for supported types
        if (ticket.type === 'In/Out' || ticket.type === 'Visit' || ticket.type === 'Maintenance') {
            fetch(`${API_BASE_URL} /linked-records/ ? ticket_id = ${ticket.id}& type=${ticket.type} `)
                .then(res => res.json())
                .then(data => {
                    if (data.records) {
                        setLinkedRecords(data.records);
                    }
                })
                .catch(err => console.error("Error fetching linked records:", err));
        }
    };

    useEffect(() => {
        if (isOpen && ticket) {
            setLinkedRecords([]); // Reset only when dialog opens or ticket changes
            fetchLinkedRecords();
        }
    }, [isOpen, ticket]);

    if (!isOpen || !ticket) return null;

    const formatDateTime = (isoString: string) => {
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
    };

    const formatDate = (isoString: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return isoString;
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
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
            case 'In Progress': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
            case 'Closed': return 'text-gray-700 bg-gray-100 border-gray-200';
            default: return 'text-gray-700 bg-gray-100 border-gray-200';
        }
    };

    const handleGuestStatus = async (recordId: string, status: 'in' | 'out') => {
        // Optimistic UI update could go here, but for now we'll wait for server
        try {
            const response = await fetch(`${API_BASE_URL} /update-guest-status/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    record_id: recordId,
                    status,
                    ticket_type: ticket?.type
                }),
            });

            if (response.ok) {
                // Success feedback
                const action = status === 'in' ? 'Check-in' : 'Check-out';
                // You could use a toast here, for now alert is simple/effective
                alert(`${action} successful for guest!`);
                fetchLinkedRecords();
            } else {
                const text = await response.text();
                try {
                    const data = JSON.parse(text);
                    alert(`Error: ${data.error || 'Failed to update status'} `);
                } catch (e) {
                    console.error("Server returned non-JSON error:", text);
                    alert(`Server Error: Response was not JSON.Check console.`);
                }
            }
        } catch (error) {
            console.error("Error updating guest status:", error);
            alert("Network/Server error updating status");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={onClose}>
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        {ticket.id}
                        <span className="text-gray-400 font-normal text-sm">|</span>
                        <span className="text-sm font-medium text-gray-700">{ticket.type}</span>
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">{ticket.title}</h2>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                            Created {formatDateTime(ticket.created)}
                        </p>
                    </div>

                    <div className="flex gap-3 items-stretch">
                        <div className={`flex flex - col justify - center items - center px - 4 py - 2 rounded - lg border ${getStatusColor(ticket.status)} w - 32 flex - shrink - 0`}>
                            <span className="text-xs uppercase font-bold tracking-wider opacity-70 mb-1">Status</span>
                            <span className="font-bold text-sm text-center">{ticket.status}</span>
                        </div>
                        <div className={`flex flex - col justify - center items - center px - 4 py - 2 rounded - lg border ${getPriorityColor(ticket.priority)} w - 32 flex - shrink - 0`}>
                            <span className="text-xs uppercase font-bold tracking-wider opacity-70 mb-1">Priority</span>
                            <span className="font-bold text-sm text-center">{ticket.priority}</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex-1 flex flex-col justify-center">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Purpose</h4>
                            <p className="text-gray-800 text-sm leading-snug line-clamp-3" title={ticket.description}>{ticket.description}</p>
                        </div>
                    </div>

                    {/* Calculate Agent from linked records (Maintenance) */}
                    {(ticket.arrival || ticket.departure || ticket.occupancy) && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wide mb-2">Stay Details</h4>
                            <div className="grid grid-cols-3 gap-2">
                                {ticket.arrival && (
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500">Arrival</span>
                                        <span className="text-sm font-medium text-gray-800">{new Date(ticket.arrival).toLocaleDateString()}</span>
                                    </div>
                                )}
                                {ticket.departure && (
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500">Departure</span>
                                        <span className="text-sm font-medium text-gray-800">{new Date(ticket.departure).toLocaleDateString()}</span>
                                    </div>
                                )}
                                {ticket.occupancy && (
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500">Occupancy</span>
                                        <span className="text-sm font-medium text-gray-800">{ticket.occupancy}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {linkedRecords.length > 0 && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Guests ({linkedRecords.length})</h4>
                            {ticket.type === 'Maintenance' ? (
                                <div className="space-y-4">
                                    {linkedRecords.map(record => (
                                        <div key={record.id} className="text-sm border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-medium text-gray-900 text-base">{record.name}</div>
                                                    {record.type && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                            {record.type}
                                                        </span>
                                                    )}
                                                    {record.agent && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                            {record.agent}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    {!record.checkInDate && (
                                                        <button
                                                            onClick={() => handleGuestStatus(record.id, 'in')}
                                                            disabled={!!record.checkInDate}
                                                            className={`px - 3 py - 1 text - white text - xs font - medium rounded transition - colors h - fit ${record.checkInDate ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} `}
                                                        >
                                                            Start
                                                        </button>
                                                    )}
                                                    {record.checkInDate && (
                                                        <button
                                                            onClick={() => handleGuestStatus(record.id, 'out')}
                                                            disabled={!!record.checkOutDate}
                                                            className={`px - 3 py - 1 text - white text - xs font - medium rounded transition - colors h - fit ${record.checkOutDate ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} `}
                                                        >
                                                            End
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 mb-2">
                                                <div>
                                                    <span className="font-medium text-gray-700">CNIC:</span> {record.cnic}
                                                </div>
                                                {record.cnicExpiry && (
                                                    <div>
                                                        <span className="font-medium text-gray-700">Expires:</span> {formatDate(record.cnicExpiry)}
                                                    </div>
                                                )}
                                                {record.checkInDate && (
                                                    <div className="text-green-700 font-medium">
                                                        Start: {formatDateTime(record.checkInDate)}
                                                    </div>
                                                )}
                                                {record.checkOutDate && (
                                                    <div className="text-red-700 font-medium">
                                                        End: {formatDateTime(record.checkOutDate)}
                                                    </div>
                                                )}
                                            </div>

                                            {record.attachments && record.attachments.length > 0 && (
                                                <div>
                                                    <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Attachments</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {record.attachments.map(att => (
                                                            <button
                                                                key={att.id}
                                                                onClick={() => setPreviewAttachment({ url: att.url, name: att.name, type: att.type })}
                                                                className="text-xs bg-white border border-gray-200 hover:bg-gray-50 text-blue-600 px-2 py-1.5 rounded flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer text-left"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                                </svg>
                                                                <span className="truncate max-w-[150px]">{att.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Name
                                                </th>
                                                {ticket.type !== 'In/Out' && (
                                                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Type
                                                    </th>
                                                )}
                                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    CNIC
                                                </th>
                                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Expires
                                                </th>
                                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Attachment
                                                </th>
                                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Check In
                                                </th>
                                                <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Check Out
                                                </th>
                                                <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {linkedRecords.map(record => (
                                                <tr key={record.id}>
                                                    <td className="px-3 py-3 text-sm text-gray-900 align-top">
                                                        <div className="font-medium text-gray-900 mb-1">{record.name}</div>
                                                        <div className="flex flex-wrap gap-1 mb-2">
                                                            {record.agent && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                                    {record.agent}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {ticket.type !== 'In/Out' && (
                                                        <td className="px-3 py-3 text-sm text-gray-500 align-top whitespace-nowrap">
                                                            {record.type && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                                    {record.type}
                                                                </span>
                                                            )}
                                                        </td>
                                                    )}
                                                    <td className="px-3 py-3 text-sm text-gray-500 align-top whitespace-nowrap">
                                                        {record.cnic}
                                                    </td>
                                                    <td className="px-3 py-3 text-sm text-gray-500 align-top whitespace-nowrap">
                                                        {record.cnicExpiry ? formatDate(record.cnicExpiry) : '-'}
                                                    </td>
                                                    <td className="px-3 py-3 text-sm text-gray-500 align-top">
                                                        {record.attachments && record.attachments.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {record.attachments.map(att => (
                                                                    <button
                                                                        key={att.id}
                                                                        onClick={() => setPreviewAttachment({ url: att.url, name: att.name, type: att.type })}
                                                                        className="text-xs bg-gray-50 border border-gray-200 hover:bg-gray-100 text-blue-600 px-1.5 py-1 rounded flex items-center gap-1 transition-colors shadow-sm"
                                                                        title={att.name}
                                                                    >
                                                                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                                        </svg>
                                                                        <span className="truncate max-w-[80px]">{att.name}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-3 py-3 text-sm text-gray-500 align-top whitespace-nowrap">
                                                        {record.checkInDate ? (
                                                            <span className="text-green-700 font-medium">
                                                                {formatDateTime(record.checkInDate)}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-3 py-3 text-sm text-gray-500 align-top whitespace-nowrap">
                                                        {record.checkOutDate ? (
                                                            <span className="text-red-700 font-medium">
                                                                {formatDateTime(record.checkOutDate)}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="px-3 py-3 text-right text-sm font-medium align-top">
                                                        {(ticket.type === 'In/Out' || ticket.type === 'Visit' || ticket.type === 'Maintenance') && (
                                                            <div className="flex flex-col gap-2 items-end">
                                                                {!record.checkInDate && (
                                                                    <button
                                                                        onClick={() => handleGuestStatus(record.id, 'in')}
                                                                        disabled={!!record.checkInDate}
                                                                        className={`px - 3 py - 1 text - white text - xs font - medium rounded transition - colors w - 16 text - center ${record.checkInDate ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} `}
                                                                    >
                                                                        In
                                                                    </button>
                                                                )}
                                                                {record.checkInDate && (
                                                                    <button
                                                                        onClick={() => handleGuestStatus(record.id, 'out')}
                                                                        disabled={!!record.checkOutDate}
                                                                        className={`px - 3 py - 1 text - white text - xs font - medium rounded transition - colors w - 16 text - center ${record.checkOutDate ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} `}
                                                                    >
                                                                        Out
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                    <button
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] transition-colors"
                        onClick={onClose}
                    >
                        Close
                    </button>
                    <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md text-sm font-medium hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] shadow-sm transition-colors">
                        Update Ticket
                    </button>
                </div>
            </div>

            {/* Lightbox Overlay */}
            {
                previewAttachment && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90 p-4 animate-in fade-in duration-200"
                        onClick={() => setPreviewAttachment(null)}
                    >
                        <div className="relative max-w-4xl max-h-[90vh] w-full h-[85vh] flex flex-col items-center bg-white rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 overflow-hidden relative">
                                {previewAttachment.type === 'application/pdf' ? (
                                    <iframe
                                        src={`${API_BASE_URL} /proxy-image/ ? url = ${encodeURIComponent(previewAttachment.url)}& type=${encodeURIComponent(previewAttachment.type)} #toolbar = 0 & navpanes=0 & scrollbar=0`}
                                        className="w-full h-full"
                                        title={previewAttachment.name}
                                    />
                                ) : (
                                    <img
                                        src={`${API_BASE_URL} /proxy-image/ ? url = ${encodeURIComponent(previewAttachment.url)}& type=${encodeURIComponent(previewAttachment.type)} `}
                                        alt={previewAttachment.name}
                                        className="max-w-full max-h-full object-contain"
                                    />
                                )}
                            </div>

                            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent p-4 flex justify-between items-start">
                                <span className="text-white font-medium text-lg drop-shadow-md">{previewAttachment.name}</span>
                                <button
                                    onClick={() => setPreviewAttachment(null)}
                                    className="text-white/80 hover:text-white transition-colors bg-black/20 hover:bg-black/40 rounded-full p-2 backdrop-blur-sm"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
