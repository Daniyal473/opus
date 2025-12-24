import { useState, useEffect } from 'react';
import type { Ticket } from '../../types/rental';
import { API_BASE_URL } from '../../services/api';
import { updateTicket, uploadAttachment, updateLinkedRecord } from '../../services/teable';
import { TicketComments } from './TicketComments';

interface TicketDialogProps {
    ticket: Ticket | null;
    isOpen: boolean;
    onClose: () => void;

    onUpdate?: (updatedTicket?: Ticket) => void; // Callback to refresh data (optimistically)
    ticketOptions?: string[];
    maintenanceOptions?: string[];
    agentOptions?: string[];
    role?: string;
    apartmentNumber?: string; // Explicit fallback if ticket doesn't have it
    apartmentId?: string;
    username?: string;
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

export function TicketDialog({ ticket, isOpen, onClose, onUpdate, ticketOptions = [], maintenanceOptions = [], agentOptions = [], role, apartmentNumber, username }: TicketDialogProps) {
    const [linkedRecords, setLinkedRecords] = useState<LinkedRecord[]>([]);
    const [isLoadingGuests, setIsLoadingGuests] = useState(false);
    const [previewAttachment, setPreviewAttachment] = useState<{ url: string, name: string, type: string } | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Internal state for ticket details to support optimistic updates
    // and ignore stale data from parent re-fetches
    const [displayTicket, setDisplayTicket] = useState<Ticket | null>(ticket);

    const [editForm, setEditForm] = useState<Partial<Ticket>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setDisplayTicket(ticket);
    }, [ticket]);

    const fetchLinkedRecords = async () => {
        if (!ticket) return;

        // Only fetch for supported types
        if (ticket.type === 'In/Out' || ticket.type === 'Visit' || ticket.type === 'Maintenance') {
            setIsLoadingGuests(true);
            try {
                // Add timestamp to prevent caching
                const res = await fetch(`${API_BASE_URL}/linked-records/?ticket_id=${ticket.id}&type=${ticket.type}&_t=${new Date().getTime()}`);
                const data = await res.json();
                if (data.records) {
                    setLinkedRecords(data.records);
                }
            } catch (err) {
                console.error("Error fetching linked records:", err);
            } finally {
                setIsLoadingGuests(false);
            }
        }
    };

    const [guestEdits, setGuestEdits] = useState<Record<string, Record<string, any>>>({});

    useEffect(() => {
        if (isOpen && ticket) {
            setDisplayTicket(ticket); // Initialize/Reset display ticket
            setLinkedRecords([]); // Reset only when dialog opens or ticket changes
            fetchLinkedRecords();
            setIsEditing(false); // Reset edit mode
            setGuestEdits({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, ticket]); // Update when ticket object changes (after re-fetch)

    const handleEditClick = () => {
        if (!ticket) return;
        setEditForm({
            title: ticket.title,
            description: ticket.description,
            status: ticket.status,
            priority: ticket.priority,
            occupancy: ticket.occupancy,
            arrival: ticket.arrival,
            departure: ticket.departure,
        });

        // Pre-populate guest edits
        const initialGuestEdits: Record<string, any> = {};
        linkedRecords.forEach(rec => {
            initialGuestEdits[rec.id] = {
                name: rec.name,
                cnic: rec.cnic,
                cnicExpiry: rec.cnicExpiry,
                type: rec.type,
                agent: rec.agent,
                paramAttachments: rec.attachments ? [...rec.attachments] : [],
                newAttachments: []
            };
        });
        setGuestEdits(initialGuestEdits);

        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditForm({});
        setGuestEdits({});
    };

    const handleSaveEdit = async () => {
        if (!ticket || !ticket.teableId) {
            alert("Cannot update this ticket (missing Record ID).");
            return;
        }

        // Validation Check
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const rec of linkedRecords) {
            const editVals = guestEdits[rec.id] || {};
            const paramCount = editVals.paramAttachments?.length || 0;
            const newCount = editVals.newAttachments?.length || 0;
            const finalAttachmentsCount = paramCount + newCount;

            console.log(`Debug Attachment Valid: Guest=${rec.id}, Param=${paramCount}, New=${newCount}, Total=${finalAttachmentsCount}`);

            // 1. Mandatory Attachments
            if (finalAttachmentsCount === 0) {
                alert(`Please ensure at least one attachment for ${rec.name || 'Guest'}.`);
                return;
            }

            // 2. Future CNIC Expiry
            // Use edited value if present (could be empty string), otherwise fallback to record value
            const effectiveExpiry = editVals.cnicExpiry !== undefined ? editVals.cnicExpiry : rec.cnicExpiry;

            if (!effectiveExpiry || effectiveExpiry.trim() === '') {
                alert(`CNIC Expiry is required for ${rec.name || 'Guest'}.`);
                return;
            }

            if (effectiveExpiry) {
                const expiryDate = new Date(effectiveExpiry);
                expiryDate.setHours(0, 0, 0, 0);

                if (expiryDate <= today) {
                    alert(`CNIC Expiry for ${rec.name || 'Guest'} must be a future date.`);
                    return;
                }
            }

            // 3. Mandatory Name
            const effectiveName = editVals.name !== undefined ? editVals.name : rec.name;
            if (!effectiveName || effectiveName.trim() === '') {
                alert(`Name is required for guest/record.`);
                return;
            }

            // 4. Mandatory CNIC
            const effectiveCNIC = editVals.cnic !== undefined ? editVals.cnic : rec.cnic;
            if (!effectiveCNIC || effectiveCNIC.trim() === '') {
                alert(`CNIC is required for ${effectiveName || 'Guest'}.`);
                return;
            }

            // 5. Mandatory Type (Only for Visit/Maintenance)
            if (ticket.type !== 'In/Out') {
                const effectiveType = editVals.type !== undefined ? editVals.type : rec.type;
                if (!effectiveType || effectiveType.trim() === '') {
                    alert(`Type is required for ${effectiveName || 'Guest'}.`);
                    return;
                }
            }
        }

        // B. Main Ticket Validation
        // Helper to get effective value (edit > original)
        const getValue = (key: keyof Ticket) => {
            return (editForm as any)[key] !== undefined ? (editForm as any)[key] : (ticket as any)[key];
        }

        const effTitle = getValue('title');
        if (!effTitle || effTitle.trim() === '') {
            alert('Ticket Title is required.');
            return;
        }

        const effDesc = getValue('description');
        if (!effDesc || effDesc.trim() === '') {
            alert('Purpose/Description is required.');
            return;
        }

        // Only check these if they are relevant/visible (which they are for tickets usually)
        // Check Occupancy
        const effOccupancy = getValue('occupancy');
        if (!effOccupancy || String(effOccupancy).trim() === '') {
            alert('Occupancy is required.');
            return;
        }

        const effArrival = getValue('arrival');
        if (!effArrival) {
            alert('Arrival Date is required.');
            return;
        }

        const effDeparture = getValue('departure');
        if (!effDeparture) {
            alert('Departure Date is required.');
            return;
        }


        setIsSaving(true);
        try {
            const promises = [];

            // 1. Update Main Ticket
            if (Object.keys(editForm).length > 0) {
                // Use ticket's own number or the passed prop fallback
                const aptNum = ticket.apartmentNumber || apartmentNumber;
                promises.push(updateTicket(ticket.teableId, editForm, aptNum, ticket.type, ticket.id, username));
            }

            // 2. Update Linked Records (Guests)
            const guestIds = Object.keys(guestEdits);
            if (guestIds.length > 0 && ticket) {
                const ticketType = ticket.type; // Use prop directly, it's validated above

                for (const recordId of guestIds) {
                    const edits = guestEdits[recordId];
                    if (!edits) continue;

                    // A. Sync Deletions (Update paramAttachments)
                    // If paramAttachments differs from original, update it.
                    // Actually, simpler to just update if it exists in edits, the backend will replace the list.
                    if (edits.paramAttachments) {
                        // We always send the current state of paramAttachments.
                        // Any original attachment NOT in this list is effectively deleted.
                        await updateLinkedRecord(recordId, ticketType, {
                            [getTeableField(ticketType, 'attachments')]: edits.paramAttachments.length > 0 ? edits.paramAttachments : null
                        });
                    }

                    // B. Sync Uploads (newAttachments)
                    if (edits.newAttachments && edits.newAttachments.length > 0) {
                        for (const file of edits.newAttachments) {
                            await uploadAttachment(file, recordId, ticketType);
                        }
                    }

                    // C. Field Updates (Name, CNIC, Expiry, Type)
                    const fieldsPayload: Record<string, any> = {};
                    Object.keys(edits).forEach(key => {
                        // Skip internal keys
                        if (['name', 'cnic', 'cnicExpiry', 'type', 'paramAttachments', 'newAttachments', 'agent'].includes(key)) return;
                        fieldsPayload[key] = edits[key];
                    });

                    // Manual mapping
                    if (edits.name !== undefined) fieldsPayload[getTeableField(ticketType, 'name')] = edits.name;
                    if (edits.cnic !== undefined) fieldsPayload[getTeableField(ticketType, 'cnic')] = edits.cnic;
                    if (edits.cnicExpiry !== undefined) fieldsPayload[getTeableField(ticketType, 'expiry')] = edits.cnicExpiry;
                    if (edits.type !== undefined) fieldsPayload[getTeableField(ticketType, 'type')] = edits.type;
                    if (edits.agent !== undefined) fieldsPayload[getTeableField(ticketType, 'agent')] = edits.agent;


                    if (Object.keys(fieldsPayload).length > 0) {
                        await updateLinkedRecord(recordId, ticketType, fieldsPayload);
                    }
                }
            }

            await Promise.all(promises);



            // Optimistic Update: Update local displayTicket immediately
            const updatedTicketData: Ticket = {
                ...ticket, // Base on original
                ...displayTicket, // Merge any previous local updates
                ...editForm, // Merge form changes
            } as Ticket;

            if (displayTicket) {
                setDisplayTicket(updatedTicketData);
            }

            // Call parent update with the new data
            if (onUpdate) {
                onUpdate(updatedTicketData);
            }

            // Optimistic Update: Update local state immediately before fetching
            // This prevents "stale data" flicker if the API index is slow
            setLinkedRecords(prevRecords => prevRecords.map(record => {
                const updates = guestEdits[record.id];
                if (updates) {
                    return {
                        ...record,
                        ...updates
                    };
                }
                return record;
            }));

            // Refresh data (Background confirmation)

            // Refresh data (Background confirmation)
            // We fetch linked records again to get the updated attachment URLs and confirming server state.
            // A small delay helps ensure Teable has indexed the changes (especially uploads).
            setTimeout(() => {
                fetchLinkedRecords();
            }, 1000);

            if (onUpdate) onUpdate(); // Reload ticket (parent)

            setIsEditing(false);
            setGuestEdits({});

        } catch (error) {
            console.error("Failed to update ticket or records", error);
            alert("Failed to save some updates. Please check console.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !displayTicket) return null; // Use displayTicket instead of prop

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

    const formatDateForInput = (isoString: string) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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

    const handleGuestStatus = async (recordId: string, status: 'in' | 'out') => {
        // Optimistic UI update could go here, but for now we'll wait for server
        try {
            const response = await fetch(`${API_BASE_URL}/update-guest-status/`, {
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
                    alert(`Error: ${data.error || 'Failed to update status'}`);
                } catch (e) {
                    console.error("Server returned non-JSON error:", text);
                    alert(`Server Error: Response was not JSON. Check console.`);
                }
            }
        } catch (error) {
            console.error("Error updating guest status:", error);
            alert("Network/Server error updating status");
        }
    };


    const getTeableField = (ticketType: string | undefined, field: 'name' | 'cnic' | 'expiry' | 'attachments' | 'type' | 'agent') => {
        if (field === 'cnic') {
            if (ticketType === 'Maintenance') return 'CNIC';
            return 'CNIC / Passport';
        }
        if (field === 'expiry') return 'CNIC Expire';
        if (field === 'attachments') return 'Attachments';
        if (field === 'type') return 'Type';
        if (field === 'agent') return 'Agent';

        switch (ticketType) {
            case 'In/Out':
                if (field === 'name') return 'Name ';
                break;
            case 'Visit':
                if (field === 'name') return 'Visitor Name';
                break;
            case 'Maintenance':
                if (field === 'name') return 'Name';
                break;
        }
        return field; // Fallback
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div
                className={`bg-white rounded-lg shadow-xl w-full ${displayTicket.type !== 'Cleaning' ? 'max-w-6xl' : 'max-w-2xl'} h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        {displayTicket.id}
                        <span className="text-gray-400 font-normal text-sm">|</span>
                        <span className="text-sm font-medium text-gray-700">{displayTicket.type}</span>
                    </h3>
                    <div className="flex items-center gap-2">

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
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden relative">
                    <div className="flex flex-col flex-1 h-full overflow-hidden border-b md:border-b-0 md:border-r border-gray-200 relative">

                        <div className="p-6 space-y-5 overflow-y-auto flex-1">
                            <div>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="w-full text-xl font-bold text-gray-900 border-b border-gray-300 focus:border-[var(--color-primary)] focus:outline-none px-1 py-0.5 mb-1"
                                        value={editForm.title || ''}
                                        onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                        placeholder="Ticket Title"
                                    />
                                ) : (
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">{displayTicket.title}</h2>
                                )}
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                    Created {formatDateTime(displayTicket.created)}
                                </p>
                            </div>

                            <div className="flex gap-3 items-stretch">
                                <div className={`flex flex-col justify-center items-center px-4 py-2 rounded-lg border ${!isEditing ? getStatusColor(displayTicket.status) : 'border-gray-300 bg-gray-50'} w-32 flex-shrink-0`}>
                                    <span className="text-xs uppercase font-bold tracking-wider opacity-70 mb-1">Status</span>
                                    {isEditing ? (
                                        <select
                                            className="w-full bg-transparent text-sm font-bold text-center focus:outline-none cursor-pointer"
                                            value={editForm.status || 'Open'}
                                            onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                                        >
                                            <option value="Open">Open</option>
                                            <option value="Under Review">Under Review</option>
                                            <option value="Approved">Approved</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    ) : (
                                        <span className="font-bold text-sm text-center">{displayTicket.status}</span>
                                    )}
                                </div>
                                <div className={`flex flex-col justify-center items-center px-4 py-2 rounded-lg border ${!isEditing ? getPriorityColor(displayTicket.priority) : 'border-gray-300 bg-gray-50'} w-32 flex-shrink-0`}>
                                    <span className="text-xs uppercase font-bold tracking-wider opacity-70 mb-1">Priority</span>
                                    {isEditing ? (
                                        <select
                                            className="w-full bg-transparent text-sm font-bold text-center focus:outline-none cursor-pointer"
                                            value={editForm.priority || 'Low'}
                                            onChange={e => setEditForm({ ...editForm, priority: e.target.value as any })}
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                        </select>
                                    ) : (
                                        <span className="font-bold text-sm text-center">{displayTicket.priority}</span>
                                    )}
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex-1 flex flex-col justify-center">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Purpose</h4>
                                    {isEditing ? (
                                        <textarea
                                            className="w-full bg-white border border-gray-300 rounded p-1 text-sm text-gray-800 leading-snug focus:outline-none focus:border-[var(--color-primary)] resize-none"
                                            rows={3}
                                            value={editForm.description || ''}
                                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                        />
                                    ) : (
                                        <p className="text-gray-800 text-sm leading-snug line-clamp-3" title={displayTicket.description}>{displayTicket.description}</p>
                                    )}
                                </div>
                            </div>

                            {/* Calculate Stay Details (only show if data exists OR if in edit mode for relevant types) */}
                            {(displayTicket.arrival || displayTicket.departure || displayTicket.occupancy || isEditing) && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <h4 className="text-xs font-bold text-blue-500 uppercase tracking-wide mb-2">Stay Details</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500 mb-0.5">Arrival</span>
                                            {isEditing ? (
                                                <input
                                                    type="date"
                                                    className="text-sm border border-gray-300 rounded px-1 py-0.5 w-full"
                                                    value={editForm.arrival ? formatDateForInput(editForm.arrival) : ''}
                                                    onChange={e => setEditForm({ ...editForm, arrival: e.target.value })}
                                                />
                                            ) : displayTicket.arrival ? (
                                                <span className="text-sm font-medium text-gray-800">{new Date(displayTicket.arrival).toLocaleDateString()}</span>
                                            ) : <span className="text-sm text-gray-400">-</span>}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500 mb-0.5">Departure</span>
                                            {isEditing ? (
                                                <input
                                                    type="date"
                                                    className="text-sm border border-gray-300 rounded px-1 py-0.5 w-full"
                                                    value={editForm.departure ? formatDateForInput(editForm.departure) : ''}
                                                    onChange={e => setEditForm({ ...editForm, departure: e.target.value })}
                                                />
                                            ) : displayTicket.departure ? (
                                                <span className="text-sm font-medium text-gray-800">{new Date(displayTicket.departure).toLocaleDateString()}</span>
                                            ) : <span className="text-sm text-gray-400">-</span>}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500 mb-0.5">Occupancy</span>
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    className="text-sm border border-gray-300 rounded px-1 py-0.5 w-full"
                                                    value={editForm.occupancy || ''}
                                                    onChange={e => setEditForm({ ...editForm, occupancy: e.target.value })}
                                                />
                                            ) : displayTicket.occupancy ? (
                                                <span className="text-sm font-medium text-gray-800">{displayTicket.occupancy}</span>
                                            ) : <span className="text-sm text-gray-400">-</span>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(linkedRecords.length > 0 || isLoadingGuests) && (
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Guests ({linkedRecords.length})</h4>

                                    {isLoadingGuests ? (
                                        <div className="flex justify-center items-center py-4">
                                            <div className="w-6 h-6 border-2 border-gray-200 border-t-[var(--color-primary)] rounded-full animate-spin"></div>
                                        </div>
                                    ) : displayTicket.type === 'Maintenance' ? (
                                        <div className="space-y-4">
                                            {linkedRecords.map(record => (
                                                <div key={record.id} className="text-sm border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div className="flex items-center gap-2">
                                                            {isEditing ? (
                                                                <input
                                                                    className="font-medium text-gray-900 text-base border-b border-gray-300 focus:border-[var(--color-primary)] focus:outline-none px-1 max-w-[150px]"
                                                                    value={guestEdits[record.id]?.name !== undefined ? guestEdits[record.id].name : record.name}
                                                                    onChange={(e) => setGuestEdits({
                                                                        ...guestEdits,
                                                                        [record.id]: {
                                                                            ...guestEdits[record.id],
                                                                            name: e.target.value,
                                                                        }
                                                                    })}
                                                                    placeholder="Name"
                                                                />
                                                            ) : (
                                                                <div className="font-medium text-gray-900 text-base">{record.name}</div>
                                                            )}

                                                            {isEditing ? (
                                                                <>
                                                                    {displayTicket.type === 'Maintenance' ? (
                                                                        <select
                                                                            className="ml-2 text-xs border-b border-gray-300 focus:border-[var(--color-primary)] focus:outline-none bg-transparent"
                                                                            value={guestEdits[record.id]?.type !== undefined ? guestEdits[record.id].type : (record.type || (maintenanceOptions.length > 0 ? maintenanceOptions[0] : ''))}
                                                                            onChange={(e) => setGuestEdits({
                                                                                ...guestEdits,
                                                                                [record.id]: { ...guestEdits[record.id], type: e.target.value }
                                                                            })}
                                                                        >
                                                                            {maintenanceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                        </select>
                                                                    ) : (
                                                                        <select
                                                                            className="ml-2 text-xs border-b border-gray-300 focus:border-[var(--color-primary)] focus:outline-none bg-transparent"
                                                                            value={guestEdits[record.id]?.type !== undefined ? guestEdits[record.id].type : (record.type || '')}
                                                                            onChange={(e) => setGuestEdits({
                                                                                ...guestEdits,
                                                                                [record.id]: { ...guestEdits[record.id], type: e.target.value }
                                                                            })}
                                                                        >
                                                                            <option value="">Type</option>
                                                                            {ticketOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                        </select>
                                                                    )}

                                                                    {/* Agent Dropdown */}
                                                                    <select
                                                                        className="ml-2 w-24 text-xs border-b border-gray-300 focus:border-[var(--color-primary)] focus:outline-none bg-transparent"
                                                                        value={guestEdits[record.id]?.agent !== undefined ? guestEdits[record.id].agent : (record.agent || (agentOptions.length > 0 ? agentOptions[0] : ''))}
                                                                        onChange={(e) => setGuestEdits({
                                                                            ...guestEdits,
                                                                            [record.id]: { ...guestEdits[record.id], agent: e.target.value }
                                                                        })}
                                                                    >
                                                                        {agentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                    </select>
                                                                </>
                                                            ) : (
                                                                <>
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
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {role?.toLowerCase() !== 'user' && (
                                                                <>
                                                                    {!record.checkInDate && (
                                                                        <button
                                                                            onClick={() => handleGuestStatus(record.id, 'in')}
                                                                            disabled={!!record.checkInDate}
                                                                            className={`px-3 py-1 text-white text-xs font-medium rounded transition-colors h-fit ${record.checkInDate ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                                                                        >
                                                                            Start
                                                                        </button>
                                                                    )}
                                                                    {record.checkInDate && (
                                                                        <button
                                                                            onClick={() => handleGuestStatus(record.id, 'out')}
                                                                            disabled={!!record.checkOutDate}
                                                                            className={`px-3 py-1 text-white text-xs font-medium rounded transition-colors h-fit ${record.checkOutDate ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                                                                        >
                                                                            End
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 mb-2">
                                                        <div>
                                                            <span className="font-medium text-gray-700">CNIC / Passport:</span>
                                                            {isEditing ? (
                                                                <input
                                                                    className="ml-1 border-b border-gray-300 focus:border-[var(--color-primary)] focus:outline-none w-32"
                                                                    value={guestEdits[record.id]?.cnic !== undefined ? guestEdits[record.id].cnic : (record.cnic || '')}
                                                                    onChange={(e) => setGuestEdits({
                                                                        ...guestEdits,
                                                                        [record.id]: {
                                                                            ...guestEdits[record.id],
                                                                            cnic: e.target.value,
                                                                        }
                                                                    })}
                                                                />
                                                            ) : (
                                                                ` ${record.cnic || '-'}`
                                                            )}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-gray-700">Expires:</span>
                                                            {isEditing ? (
                                                                <input
                                                                    type="date"
                                                                    className="ml-1 border-b border-gray-300 focus:border-[var(--color-primary)] focus:outline-none"
                                                                    value={guestEdits[record.id]?.cnicExpiry ? formatDateForInput(guestEdits[record.id].cnicExpiry) : (record.cnicExpiry ? formatDateForInput(record.cnicExpiry) : '')}
                                                                    onChange={(e) => setGuestEdits({
                                                                        ...guestEdits,
                                                                        [record.id]: {
                                                                            ...guestEdits[record.id],
                                                                            cnicExpiry: e.target.value,
                                                                            [getTeableField(displayTicket.type, 'expiry')]: e.target.value
                                                                        }
                                                                    })}
                                                                />
                                                            ) : (
                                                                ` ${record.cnicExpiry ? formatDate(record.cnicExpiry) : '-'}`
                                                            )}
                                                        </div>
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

                                                    {
                                                        (isEditing || (record.attachments && record.attachments.length > 0)) && (
                                                            <div>
                                                                <div className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Attachments</div>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {isEditing ? (
                                                                        <>
                                                                            {/* Display existing attachments (paramAttachments) */}
                                                                            {(guestEdits[record.id]?.paramAttachments || []).map((att: any, idx: number) => (
                                                                                <div key={`existing-${idx}`} className="relative group">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            const editState = guestEdits[record.id] || {};
                                                                                            const currentParams = editState.paramAttachments || [];

                                                                                            const updatedParams = currentParams.filter((_: any, i: number) => i !== idx);

                                                                                            setGuestEdits({
                                                                                                ...guestEdits,
                                                                                                [record.id]: {
                                                                                                    ...editState,
                                                                                                    paramAttachments: updatedParams
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                                                    >
                                                                                        &times;
                                                                                    </button>
                                                                                    <div className="text-xs bg-gray-50 border border-gray-200 px-2 py-1.5 rounded flex items-center gap-1.5 cursor-pointer" onClick={() => setPreviewAttachment(att)}>
                                                                                        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                                                        </svg>
                                                                                        <span className="truncate max-w-[100px]">{att.name}</span>
                                                                                    </div>
                                                                                </div>
                                                                            ))}

                                                                            {/* Display new attachments (newAttachments) */}
                                                                            {(guestEdits[record.id]?.newAttachments || []).map((file: File, idx: number) => (
                                                                                <div key={`new-${idx}`} className="relative group">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            const editState = guestEdits[record.id] || {};
                                                                                            const currentNew = editState.newAttachments || [];

                                                                                            const updatedNew = currentNew.filter((_: any, i: number) => i !== idx);

                                                                                            setGuestEdits({
                                                                                                ...guestEdits,
                                                                                                [record.id]: {
                                                                                                    ...editState,
                                                                                                    newAttachments: updatedNew
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                                                    >
                                                                                        &times;
                                                                                    </button>
                                                                                    <div className="text-xs bg-green-50 border border-green-200 px-2 py-1.5 rounded flex items-center gap-1.5 text-green-700">
                                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                                                                        </svg>
                                                                                        <span className="truncate max-w-[100px]">{file.name}</span>
                                                                                    </div>
                                                                                </div>
                                                                            ))}

                                                                            {/* Add Attachment Button */}
                                                                            {(() => {
                                                                                const editState = guestEdits[record.id] || {};
                                                                                const totalCount = (editState.paramAttachments?.length || 0) + (editState.newAttachments?.length || 0);

                                                                                if (totalCount < 2) return (
                                                                                    <label className="cursor-pointer text-xs bg-blue-50 border border-dashed border-blue-300 text-blue-600 px-2 py-1.5 rounded flex items-center gap-1 hover:bg-blue-100 transition-colors">
                                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                                                                        </svg>
                                                                                        <span>Add</span>
                                                                                        <input
                                                                                            type="file"
                                                                                            multiple
                                                                                            className="hidden"
                                                                                            onChange={(e) => {
                                                                                                if (e.target.files && e.target.files.length > 0) {
                                                                                                    const newFiles = Array.from(e.target.files);
                                                                                                    const currentTotal = totalCount;

                                                                                                    if (currentTotal + newFiles.length > 2) {
                                                                                                        alert("You can only have a maximum of 2 attachments.");
                                                                                                        return;
                                                                                                    }

                                                                                                    setGuestEdits({
                                                                                                        ...guestEdits,
                                                                                                        [record.id]: {
                                                                                                            ...editState,
                                                                                                            newAttachments: [...(editState.newAttachments || []), ...newFiles]
                                                                                                        }
                                                                                                    });
                                                                                                }
                                                                                            }}
                                                                                        />
                                                                                    </label>
                                                                                );
                                                                                return null;
                                                                            })()}
                                                                        </>
                                                                    ) : (
                                                                        (record.attachments || []).map((att: any) => (
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
                                                                        ))
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    }
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                                                            Name
                                                        </th>
                                                        {displayTicket.type !== 'In/Out' && (
                                                            <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Type
                                                            </th>
                                                        )}
                                                        <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            CNIC / Passport
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
                                                        {role?.toLowerCase() !== 'user' && (
                                                            <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                Actions
                                                            </th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {linkedRecords.map(record => (
                                                        <tr key={record.id}>
                                                            <td className="px-3 py-3 text-sm text-gray-900 align-top">
                                                                {isEditing ? (
                                                                    <input
                                                                        className="w-full text-sm border-b border-gray-300 focus:border-[var(--color-primary)] focus:outline-none py-0.5"
                                                                        value={guestEdits[record.id]?.name !== undefined ? guestEdits[record.id].name : record.name}
                                                                        onChange={(e) => setGuestEdits({
                                                                            ...guestEdits,
                                                                            [record.id]: {
                                                                                ...guestEdits[record.id],
                                                                                name: e.target.value,
                                                                                [getTeableField(displayTicket.type, 'name')]: e.target.value
                                                                            }
                                                                        })}
                                                                        placeholder="Name"
                                                                    />
                                                                ) : (
                                                                    <div className="font-medium text-gray-900 mb-1">{record.name}</div>
                                                                )}
                                                                <div className="flex flex-wrap gap-1 mb-2">
                                                                    {record.agent && (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                                            {record.agent}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            {displayTicket.type !== 'In/Out' && (
                                                                <td className="px-3 py-3 text-sm text-gray-500 align-top whitespace-nowrap min-w-[140px]">
                                                                    {isEditing ? (
                                                                        <select
                                                                            className="w-full text-sm border-b border-gray-300 focus:border-[var(--color-primary)] focus:outline-none py-0.5 bg-transparent"
                                                                            value={guestEdits[record.id]?.type || record.type || ''}
                                                                            onChange={(e) => setGuestEdits({
                                                                                ...guestEdits,
                                                                                [record.id]: {
                                                                                    ...guestEdits[record.id],
                                                                                    type: e.target.value,
                                                                                    [getTeableField(displayTicket.type, 'type')]: e.target.value
                                                                                }
                                                                            })}
                                                                        >
                                                                            <option value="">Select Type</option>
                                                                            {(displayTicket.type === 'Visit' ? ticketOptions : maintenanceOptions).map(opt => (
                                                                                <option key={opt} value={opt}>{opt}</option>
                                                                            ))}
                                                                        </select>
                                                                    ) : (
                                                                        record.type && (
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                                                {record.type}
                                                                            </span>
                                                                        )
                                                                    )}
                                                                </td>
                                                            )}
                                                            <td className="px-3 py-3 text-sm text-gray-500 align-top whitespace-nowrap">
                                                                {isEditing ? (
                                                                    <input
                                                                        className="w-full text-sm border-b border-gray-300 focus:border-[var(--color-primary)] focus:outline-none py-0.5"
                                                                        value={guestEdits[record.id]?.cnic !== undefined ? guestEdits[record.id].cnic : (record.cnic || '')}
                                                                        onChange={(e) => setGuestEdits({
                                                                            ...guestEdits,
                                                                            [record.id]: {
                                                                                ...guestEdits[record.id],
                                                                                cnic: e.target.value,
                                                                                [getTeableField(displayTicket.type, 'cnic')]: e.target.value
                                                                            }
                                                                        })}
                                                                    />
                                                                ) : (
                                                                    record.cnic || '-'
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-3 text-sm text-gray-500 align-top whitespace-nowrap">
                                                                {isEditing ? (
                                                                    <input
                                                                        type="date"
                                                                        className="w-full text-sm border-b border-gray-300 focus:border-[var(--color-primary)] focus:outline-none py-0.5"
                                                                        value={guestEdits[record.id]?.cnicExpiry ? formatDateForInput(guestEdits[record.id].cnicExpiry) : (record.cnicExpiry ? formatDateForInput(record.cnicExpiry) : '')}
                                                                        onChange={(e) => setGuestEdits({
                                                                            ...guestEdits,
                                                                            [record.id]: {
                                                                                ...guestEdits[record.id],
                                                                                cnicExpiry: e.target.value,
                                                                                [getTeableField(displayTicket.type, 'expiry')]: e.target.value
                                                                            }
                                                                        })}
                                                                    />
                                                                ) : (
                                                                    record.cnicExpiry ? formatDate(record.cnicExpiry) : '-'
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-3 text-sm text-gray-500 align-top">
                                                                {(isEditing || (record.attachments && record.attachments.length > 0)) ? (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {isEditing ? (
                                                                            <>
                                                                                {/* Display existing attachments (paramAttachments) */}
                                                                                {(guestEdits[record.id]?.paramAttachments || []).map((att: any, idx: number) => (
                                                                                    <div key={`existing-${idx}`} className="relative group">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                setGuestEdits(prev => {
                                                                                                    const editState = prev[record.id] || {};
                                                                                                    const currentParams = editState.paramAttachments || [];
                                                                                                    return {
                                                                                                        ...prev,
                                                                                                        [record.id]: {
                                                                                                            ...editState,
                                                                                                            paramAttachments: currentParams.filter((_: any, i: number) => i !== idx)
                                                                                                        }
                                                                                                    };
                                                                                                });
                                                                                            }}
                                                                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                                                        >
                                                                                            &times;
                                                                                        </button>
                                                                                        <div className="text-xs bg-gray-50 border border-gray-200 px-1.5 py-1 rounded flex items-center gap-1">
                                                                                            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                                                                            </svg>
                                                                                            <span className="truncate max-w-[80px]">{att.name}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}

                                                                                {/* Display new attachments (newAttachments) */}
                                                                                {(guestEdits[record.id]?.newAttachments || []).map((file: File, idx: number) => (
                                                                                    <div key={`new-${idx}`} className="relative group">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                setGuestEdits(prev => {
                                                                                                    const editState = prev[record.id] || {};
                                                                                                    const currentNew = editState.newAttachments || [];
                                                                                                    return {
                                                                                                        ...prev,
                                                                                                        [record.id]: {
                                                                                                            ...editState,
                                                                                                            newAttachments: currentNew.filter((_: any, i: number) => i !== idx)
                                                                                                        }
                                                                                                    };
                                                                                                });
                                                                                            }}
                                                                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3 h-3 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                                                        >
                                                                                            &times;
                                                                                        </button>
                                                                                        <div className="text-xs bg-green-50 border border-green-200 px-1.5 py-1 rounded flex items-center gap-1 text-green-700">
                                                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                                                                            </svg>
                                                                                            <span className="truncate max-w-[80px]">{file.name}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}

                                                                                {/* Add Attachment Button */}
                                                                                {(() => {
                                                                                    const editState = guestEdits[record.id] || {};
                                                                                    const totalCount = (editState.paramAttachments?.length || 0) + (editState.newAttachments?.length || 0);

                                                                                    if (totalCount < 2) return (
                                                                                        <label className="cursor-pointer text-xs bg-blue-50 border border-dashed border-blue-300 text-blue-600 px-1.5 py-1 rounded flex items-center gap-1 hover:bg-blue-100 transition-colors">
                                                                                            <span>+</span>
                                                                                            <input
                                                                                                type="file"
                                                                                                multiple
                                                                                                className="hidden"
                                                                                                onChange={(e) => {
                                                                                                    if (e.target.files && e.target.files.length > 0) {
                                                                                                        const newFiles = Array.from(e.target.files);
                                                                                                        const currentTotal = totalCount;

                                                                                                        if (currentTotal + newFiles.length > 2) {
                                                                                                            alert("You can only have a maximum of 2 attachments.");
                                                                                                            return;
                                                                                                        }

                                                                                                        setGuestEdits(prev => ({
                                                                                                            ...prev,
                                                                                                            [record.id]: {
                                                                                                                ...editState,
                                                                                                                newAttachments: [...(editState.newAttachments || []), ...newFiles]
                                                                                                            }
                                                                                                        }));
                                                                                                    }
                                                                                                }}
                                                                                            />
                                                                                        </label>
                                                                                    );
                                                                                    return null;
                                                                                })()}
                                                                            </>
                                                                        ) : (
                                                                            (record.attachments || []).map(att => (
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
                                                                            ))
                                                                        )}
                                                                    </div>
                                                                ) : (isEditing ? (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        <label className="cursor-pointer text-xs bg-blue-50 border border-dashed border-blue-300 text-blue-600 px-1.5 py-1 rounded flex items-center gap-1 hover:bg-blue-100 transition-colors">
                                                                            <span>+</span>
                                                                            <input
                                                                                type="file"
                                                                                className="hidden"
                                                                                onChange={async (e) => {
                                                                                    if (e.target.files && e.target.files[0]) {
                                                                                        try {
                                                                                            const file = e.target.files[0];
                                                                                            if (!displayTicket?.type) return;
                                                                                            const result = await uploadAttachment(file, record.id, displayTicket.type);
                                                                                            const currentAtts = [...(guestEdits[record.id]?.attachments || [])];
                                                                                            currentAtts.push(result);
                                                                                            setGuestEdits({
                                                                                                ...guestEdits,
                                                                                                [record.id]: {
                                                                                                    ...guestEdits[record.id],
                                                                                                    attachments: currentAtts,
                                                                                                    [getTeableField(displayTicket.type, 'attachments')]: currentAtts
                                                                                                }
                                                                                            });
                                                                                        } catch (err: any) {
                                                                                            alert(`Failed to upload attachment: ${err.message}`);
                                                                                        }
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </label>
                                                                    </div>
                                                                ) : '-')}
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
                                                            {role?.toLowerCase() !== 'user' && (
                                                                <td className="px-3 py-3 text-right text-sm font-medium align-top">
                                                                    {(displayTicket.type === 'In/Out' || displayTicket.type === 'Visit' || displayTicket.type === 'Maintenance') && (

                                                                        <div className="flex flex-col gap-2 items-end">
                                                                            {!record.checkInDate && (
                                                                                <button
                                                                                    onClick={() => handleGuestStatus(record.id, 'in')}
                                                                                    disabled={!!record.checkInDate}
                                                                                    className={`px-3 py-1 text-white text-xs font-medium rounded transition-colors w-16 text-center ${record.checkInDate ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                                                                                >
                                                                                    In
                                                                                </button>
                                                                            )}
                                                                            {record.checkInDate && (
                                                                                <button
                                                                                    onClick={() => handleGuestStatus(record.id, 'out')}
                                                                                    disabled={!!record.checkOutDate}
                                                                                    className={`px-3 py-1 text-white text-xs font-medium rounded transition-colors w-16 text-center ${record.checkOutDate ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                                                                                >
                                                                                    Out
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            )}
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
                            {isEditing ? (
                                <>
                                    <button
                                        className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                                        onClick={handleCancelEdit}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md text-sm font-medium hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] shadow-sm transition-colors"
                                        onClick={handleSaveEdit}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </>
                            ) : (
                                role?.toLowerCase() !== 'user' && role?.toLowerCase() !== 'fdo' && !isLoadingGuests && (
                                    <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md text-sm font-medium hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] shadow-sm transition-colors" onClick={() => {
                                        handleEditClick();
                                    }}>
                                        Edit Ticket
                                    </button>
                                )
                            )}
                        </div>
                    </div>

                    {displayTicket.type !== 'Cleaning' && role?.toLowerCase() !== 'user' && (
                        <div className="w-full md:w-[400px] h-full bg-gray-50 flex flex-col flex-shrink-0 border-l border-gray-200">
                            <TicketComments
                                ticketId={displayTicket.id}
                                username={username}
                                apartmentNumber={displayTicket.apartmentNumber || apartmentNumber} // Fallback to prop (from PropertySidebar) if ticket is missing it
                                ticketType={displayTicket.type}
                                ticketStatus={displayTicket.status}
                                className="bg-gray-50 flex-1"
                                role={role}
                            />
                        </div>
                    )}
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
                                        src={`${API_BASE_URL}/proxy-image/?url=${encodeURIComponent(previewAttachment.url)}&type=${encodeURIComponent(previewAttachment.type)}#toolbar=0&navpanes=0&scrollbar=0`}
                                        className="w-full h-full"
                                        title={previewAttachment.name}
                                    />
                                ) : (
                                    <img
                                        src={`${API_BASE_URL}/proxy-image/?url=${encodeURIComponent(previewAttachment.url)}&type=${encodeURIComponent(previewAttachment.type)}`}
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
