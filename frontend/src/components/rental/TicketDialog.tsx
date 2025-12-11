import type { Ticket } from '../../types/rental';

interface TicketDialogProps {
    ticket: Ticket | null;
    isOpen: boolean;
    onClose: () => void;
}

export function TicketDialog({ ticket, isOpen, onClose }: TicketDialogProps) {
    if (!isOpen || !ticket) return null;

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={onClose}>
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
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

                <div className="p-6 space-y-5">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">{ticket.title}</h2>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                            Created {ticket.created}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <div className={`flex flex-col items-center px-4 py-2 rounded-lg border ${getStatusColor(ticket.status)} flex-1`}>
                            <span className="text-xs uppercase font-bold tracking-wider opacity-70 mb-1">Status</span>
                            <span className="font-bold">{ticket.status}</span>
                        </div>
                        <div className={`flex flex-col items-center px-4 py-2 rounded-lg border ${getPriorityColor(ticket.priority)} flex-1`}>
                            <span className="text-xs uppercase font-bold tracking-wider opacity-70 mb-1">Priority</span>
                            <span className="font-bold">{ticket.priority}</span>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Description</h4>
                        <p className="text-gray-800 text-sm leading-relaxed">{ticket.description}</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
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
            </div>
        </div>
    );
}
