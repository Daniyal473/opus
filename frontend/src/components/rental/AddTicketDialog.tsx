import { useState, useEffect } from 'react';
import type { Ticket } from '../../types/rental';

interface AddTicketDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (ticket: Omit<Ticket, 'id' | 'created' | 'status'>) => void;
    initialType?: Ticket['type'];
    roomId?: string;
    ticketOptions?: string[];
    maintenanceOptions?: string[];
    agentOptions?: string[];
}

export function AddTicketDialog({ isOpen, onClose, onAdd, initialType = 'In/Out', roomId, ticketOptions = [], maintenanceOptions = [], agentOptions = [] }: AddTicketDialogProps) {
    const [title, setTitle] = useState('');
    const [type, setType] = useState<Ticket['type']>(initialType);
    const [visitType, setVisitType] = useState(''); // Separate state for Visit subtype
    const [maintenanceType, setMaintenanceType] = useState(''); // Separate state for Maintenance subtype
    const [priority, setPriority] = useState<Ticket['priority']>('Low');
    const [description, setDescription] = useState('');
    const [occupancy, setOccupancy] = useState('');
    const [agent, setAgent] = useState('');
    const [arrival, setArrival] = useState('');
    const [departure, setDeparture] = useState('');
    // Guest List State
    const [guests, setGuests] = useState<{
        name: string;
        cnic: string;
        cnicExpiry: string;
        attachments: File[];
    }[]>([{ name: '', cnic: '', cnicExpiry: '', attachments: [] }]);

    // Update type when initialType changes
    useEffect(() => {
        if (isOpen) {
            // For 'Visit', if options are available and current choice is not one of them,
            // we could default to the first option. But simpler is just reset to initialType first.
            // If the user selects something else, this useEffect won't re-run unless initialType changes again.
            // Wait, if initialType is 'Visit' (Cleaning alias), and user picks 'Guest' (from dynamic options),
            // 'Guest' != 'Visit'.
            // If we just setType(initialType), it sets to 'Visit'.
            // User changes to 'Guest'. 'initialType' is still 'Visit'. 'isOpen' is still true.
            // This useEffect only runs on [isOpen, initialType] change. So it won't reset on internal 'type' change. Correct.
            setType(initialType);
        }
    }, [isOpen, initialType]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Determine the effective type (handling defaults if user didn't change dropdown)
        let finalType = type;
        if (initialType === 'Visit') {
            finalType = visitType || (ticketOptions.length > 0 ? ticketOptions[0] : 'Guest');
        } else if (initialType === 'Maintenance') {
            finalType = maintenanceType || (maintenanceOptions.length > 0 ? maintenanceOptions[0] : 'Work Permit');
        }

        onAdd({
            title,
            type: finalType,
            priority,
            description,
            occupancy,
            agent,
            arrival,
            departure,
            guests,
        });
        // Reset form
        setTitle('');
        setType(initialType);
        setVisitType('');
        setMaintenanceType('');
        setPriority('Low');
        setDescription('');
        setOccupancy('');
        setAgent('');
        setArrival('');
        setDeparture('');
        setGuests([{ name: '', cnic: '', cnicExpiry: '', attachments: [] }]);
        onClose();
    };

    const handleGuestChange = (index: number, field: string, value: string | File[]) => {
        const newGuests = [...guests];
        if (field === 'attachments') {
            newGuests[index] = { ...newGuests[index], attachments: value as File[] };
        } else {
            newGuests[index] = { ...newGuests[index], [field]: value as string };
        }
        setGuests(newGuests);
    };

    const addGuestRow = () => {
        if (guests.length < 5) {
            setGuests([...guests, { name: '', cnic: '', cnicExpiry: '', attachments: [] }]);
        }
    };

    const removeGuestRow = (index: number) => {
        if (guests.length > 1) {
            const newGuests = guests.filter((_, i) => i !== index);
            setGuests(newGuests);
        }
    };

    const removeAttachment = (guestIndex: number, fileIndex: number) => {
        const newGuests = [...guests];
        const newAttachments = [...newGuests[guestIndex].attachments];
        newAttachments.splice(fileIndex, 1);
        newGuests[guestIndex] = { ...newGuests[guestIndex], attachments: newAttachments };
        setGuests(newGuests);
    };

    const handleAttachmentChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            const currentFiles = guests[index].attachments;

            if (currentFiles.length + newFiles.length > 2) {
                alert('Max 2 attachments allowed per row');
                e.target.value = ''; // Clear input to allow retry
                return;
            }

            handleGuestChange(index, 'attachments', [...currentFiles, ...newFiles]);
            e.target.value = ''; // Clear input after adding
        }
    };

    const displayType = type;
    const dialogTitle = roomId
        ? `Create New ${displayType} Ticket for room ${roomId}`
        : 'Create New Ticket';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={onClose}>
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header - Fixed */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    <h3 className="font-bold text-gray-900">{dialogTitle}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="p-6 overflow-y-auto flex-1">
                    <form id="ticket-form" onSubmit={handleSubmit} className="space-y-4">

                        {/* Row 1: Title and Occupancy and Purpose */}
                        <div className="flex gap-4 items-start">
                            <div className="flex-1">
                                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    id="title"
                                    type="text"
                                    required
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Extra Towels"
                                />
                            </div>
                            <div className="w-32">
                                <label htmlFor="occupancy" className="block text-sm font-medium text-gray-700 mb-1">Occupancy</label>
                                <input
                                    id="occupancy"
                                    type="text"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                    value={occupancy}
                                    onChange={(e) => setOccupancy(e.target.value)}
                                    placeholder="e.g. 2"
                                />
                            </div>

                            {/* Agent Dropdown (Maintenance Only) */}
                            {initialType === 'Maintenance' && (
                                <div className="flex-1">
                                    <label htmlFor="agent" className="block text-sm font-medium text-gray-700 mb-1">Agent</label>
                                    <select
                                        id="agent"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                        value={agent}
                                        onChange={(e) => setAgent(e.target.value)}
                                    >
                                        <option value="">Select Agent</option>
                                        {agentOptions.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            )}



                            <div className="flex-[2]">
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                                <textarea
                                    id="description"
                                    rows={1}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Enter ticket details..."
                                    style={{ height: '38px', minHeight: '38px', resize: 'none' }}
                                />
                            </div>
                        </div>

                        {/* Row 2: Type, Priority, Arrival, Departure */}
                        <div className="flex gap-4">
                            {/* Type */}
                            {initialType === 'Maintenance' && (
                                <div className="flex-1">
                                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select
                                        id="type"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                        value={maintenanceType || (maintenanceOptions.length > 0 ? maintenanceOptions[0] : 'Work Permit')}
                                        onChange={(e) => setMaintenanceType(e.target.value)}
                                    >
                                        {maintenanceOptions.length > 0 ? (
                                            maintenanceOptions.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))
                                        ) : (
                                            <option value="Work Permit">Work Permit</option>
                                        )}
                                    </select>
                                </div>
                            )}

                            {initialType === 'Visit' && (
                                <div className="flex-1">
                                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select
                                        id="type"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                        value={visitType || (ticketOptions.length > 0 ? ticketOptions[0] : 'Guest')}
                                        onChange={(e) => setVisitType(e.target.value)}
                                    >
                                        {ticketOptions.length > 0 ? (
                                            ticketOptions.map((opt) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))
                                        ) : (
                                            <>
                                                <option value="Cleaning">Guest</option>
                                                <option value="Guest Request">Foodpanda</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            )}

                            {/* Priority */}
                            <div className="flex-1">
                                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <select
                                    id="priority"
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as Ticket['priority'])}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>

                            {/* Arrival (Conditional) */}
                            {(initialType === 'In/Out' || initialType === 'Visit' || initialType === 'Maintenance') && (
                                <div className="flex-1">
                                    <label htmlFor="arrival" className="block text-sm font-medium text-gray-700 mb-1">
                                        {initialType === 'Maintenance' ? 'Start Time' : 'Arrival'}
                                    </label>
                                    <input
                                        id="arrival"
                                        type="datetime-local"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                        value={arrival}
                                        onChange={(e) => setArrival(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Departure (Conditional) */}
                            {(initialType === 'In/Out' || initialType === 'Visit' || initialType === 'Maintenance') && (
                                <div className="flex-1">
                                    <label htmlFor="departure" className="block text-sm font-medium text-gray-700 mb-1">
                                        {initialType === 'Maintenance' ? 'End Time' : 'Departure'}
                                    </label>
                                    <input
                                        id="departure"
                                        type="datetime-local"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                        value={departure}
                                        onChange={(e) => setDeparture(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Guests Rows */}
                        <div className="space-y-4">
                            {guests.map((guest, index) => (
                                <div key={index} className="flex gap-4 items-start">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                        <input
                                            type="text"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                            value={guest.name}
                                            onChange={(e) => handleGuestChange(index, 'name', e.target.value)}
                                            placeholder="Guest Name"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">CNIC</label>
                                        <input
                                            type="text"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                            value={guest.cnic}
                                            onChange={(e) => handleGuestChange(index, 'cnic', e.target.value)}
                                            placeholder="Identity Number"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">CNIC Expire</label>
                                        <input
                                            type="date"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                            value={guest.cnicExpiry}
                                            onChange={(e) => handleGuestChange(index, 'cnicExpiry', e.target.value)}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (Max 2)</label>
                                        <div className="space-y-2">
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*,application/pdf"
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 placeholder-transparent"
                                                onChange={(e) => handleAttachmentChange(index, e)}
                                                disabled={guest.attachments.length >= 2}
                                            />
                                            {/* File List */}
                                            {guest.attachments.length > 0 && (
                                                <div className="space-y-1">
                                                    {guest.attachments.map((file, fileIndex) => (
                                                        <div key={fileIndex} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded border border-gray-200 text-xs">
                                                            <span className="truncate max-w-[150px]" title={file.name}>{file.name}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeAttachment(index, fileIndex)}
                                                                className="text-gray-400 hover:text-red-500 ml-2"
                                                                title="Remove file"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {guests.length > 1 && index > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => removeGuestRow(index)}
                                            className="mb-2 p-2 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Remove Guest"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Add Guest Button */}
                        {initialType !== 'Maintenance' && guests.length < 5 && (
                            <button
                                type="button"
                                onClick={addGuestRow}
                                className="flex items-center text-sm text-[var(--color-primary)] hover:text-opacity-80 font-medium"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                Add Guest
                            </button>
                        )}
                    </form>
                </div>

                {/* Footer - Fixed */}
                <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                    <button
                        type="button"
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] transition-colors"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="ticket-form"
                        className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md text-sm font-medium hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] shadow-sm transition-colors"
                    >
                        Create Ticket
                    </button>
                </div>
            </div>
        </div>
    );
}
