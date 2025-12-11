import { useState } from 'react';
import type { Ticket } from '../../types/rental';

interface AddTicketDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (ticket: Omit<Ticket, 'id' | 'created' | 'status'>) => void;
}

export function AddTicketDialog({ isOpen, onClose, onAdd }: AddTicketDialogProps) {
    const [title, setTitle] = useState('');
    const [type, setType] = useState<Ticket['type']>('Guest Request');
    const [priority, setPriority] = useState<Ticket['priority']>('Low');
    const [description, setDescription] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd({
            title,
            type,
            priority,
            description
        });
        // Reset form
        setTitle('');
        setType('Guest Request');
        setPriority('Low');
        setDescription('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={onClose}>
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-bold text-gray-900">Create New Ticket</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
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

                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                id="type"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                                value={type}
                                onChange={(e) => setType(e.target.value as Ticket['type'])}
                            >
                                <option value="Guest Request">Guest Request</option>
                                <option value="Cleaning">Cleaning</option>
                                <option value="Maintenance">Maintenance</option>
                            </select>
                        </div>
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
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            id="description"
                            rows={3}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter ticket details..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] transition-colors"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md text-sm font-medium hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] shadow-sm transition-colors"
                        >
                            Create Ticket
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
