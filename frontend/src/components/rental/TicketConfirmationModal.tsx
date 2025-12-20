import { X, Loader2 } from 'lucide-react';
import type { Ticket } from '../../types/rental';

interface TicketConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    ticketData: any; // Using any to match the flexible structure passed from AddTicketDialog, but ideally should be Partial<Ticket> & { guests: ... }
    roomNumber?: string;
    isSubmitting?: boolean;
}

export function TicketConfirmationModal({ isOpen, onClose, onConfirm, ticketData, roomNumber, isSubmitting = false }: TicketConfirmationModalProps) {
    if (!isOpen || !ticketData) return null;

    const {
        title,
        type,
        priority,
        description,
        occupancy,
        arrival,
        departure,
        agent,
        guests
    } = ticketData;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-900 text-lg">Confirm Ticket Details</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4 text-sm overflow-y-auto max-h-[70vh]">
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-md text-blue-800 text-center mb-4">
                        <p className="font-medium">Are you sure you want to create this ticket?</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {roomNumber && (
                            <>
                                <span className="font-semibold text-gray-500 text-right">Property:</span>
                                <span className="col-span-2 text-gray-900 font-medium">{roomNumber}</span>
                            </>
                        )}

                        <span className="font-semibold text-gray-500 text-right">Title:</span>
                        <span className="col-span-2 text-gray-900">{title}</span>

                        <span className="font-semibold text-gray-500 text-right">Type:</span>
                        <span className="col-span-2 text-gray-900">{type}</span>

                        <span className="font-semibold text-gray-500 text-right">Priority:</span>
                        <span className="col-span-2 text-gray-900">{priority}</span>

                        {description && (
                            <>
                                <span className="font-semibold text-gray-500 text-right">Purpose:</span>
                                <span className="col-span-2 text-gray-900">{description}</span>
                            </>
                        )}

                        {occupancy && (
                            <>
                                <span className="font-semibold text-gray-500 text-right">Occupancy:</span>
                                <span className="col-span-2 text-gray-900">{occupancy}</span>
                            </>
                        )}

                        {agent && (
                            <>
                                <span className="font-semibold text-gray-500 text-right">Agent:</span>
                                <span className="col-span-2 text-gray-900">{agent}</span>
                            </>
                        )}

                        {arrival && (
                            <>
                                <span className="font-semibold text-gray-500 text-right">Arrival:</span>
                                <span className="col-span-2 text-gray-900">{new Date(arrival).toLocaleString()}</span>
                            </>
                        )}

                        {departure && (
                            <>
                                <span className="font-semibold text-gray-500 text-right">Departure:</span>
                                <span className="col-span-2 text-gray-900">{new Date(departure).toLocaleString()}</span>
                            </>
                        )}
                    </div>

                    {guests && guests.length > 0 && guests[0].name && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <h4 className="font-bold text-gray-800 mb-2">Details ({guests.length})</h4>
                            <div className="space-y-2">
                                {guests.map((g: any, i: number) => (
                                    <div key={i} className="bg-gray-50 p-2 rounded border border-gray-100 text-xs">
                                        <div className="flex justify-between">
                                            <span className="font-semibold">{g.name}</span>
                                            <span className="text-gray-500">{g.cnic}</span>
                                        </div>
                                        {g.attachments && g.attachments.length > 0 && (
                                            <div className="text-gray-400 mt-1 italic">
                                                {g.attachments.length} attachment(s)
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-md font-medium hover:bg-teal-700 shadow-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                        {isSubmitting ? 'Creating...' : 'Confirm & Create'}
                    </button>
                </div>
            </div>
        </div>
    );
}
