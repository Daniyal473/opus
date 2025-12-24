import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';

interface TicketCommentsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    ticketId?: string;
    username?: string;
}

export function TicketCommentsDialog({ isOpen, onClose, ticketId, username }: TicketCommentsDialogProps) {
    const [comments, setComments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && ticketId) {
            fetchComments();
        }
    }, [isOpen, ticketId]);

    const fetchComments = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/get-comments/?ticket_id=${ticketId}`);
            if (response.ok) {
                const data = await response.json();
                setComments(data.comments || []);
            }
        } catch (error) {
            console.error("Failed to fetch comments:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePostComment = async () => {
        if (!commentText.trim() || !ticketId || !username) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/create-comment/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    comment: commentText,
                    ticket_id: ticketId,
                    user: username
                }),
            });

            if (response.ok) {
                setCommentText('');
                fetchComments(); // Refresh comments after posting
            } else {
                const errorData = await response.json();
                console.error('Failed to post comment:', errorData);
            }
        } catch (error) {
            console.error('Error posting comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800">Ticket #{ticketId}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
                        {isLoading ? (
                            <div className="flex justify-center p-4">
                                <span className="text-gray-400 text-sm">Loading comments...</span>
                            </div>
                        ) : comments.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">
                                <p>No comments yet. Be the first to reply!</p>
                            </div>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="flex gap-4">
                                    <img
                                        className="w-[40px] h-[40px] rounded-full object-cover border-2 border-gray-100"
                                        alt={comment.user}
                                        src={`https://ui-avatars.com/api/?name=${comment.user}&background=random`}
                                    />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                <h5 className="font-semibold text-gray-800 text-sm">{comment.user}</h5>
                                                <span className="text-xs text-gray-400">
                                                    {comment.created ? new Date(comment.created).toLocaleString() : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-gray-600 text-sm leading-relaxed">
                                            {comment.comment}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer - Input */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <div className="flex gap-4">
                        <img
                            className="w-10 h-10 rounded-full object-cover border border-gray-200"
                            alt="Current User"
                            src={`https://ui-avatars.com/api/?name=${username || 'User'}&background=random`}
                        />
                        <div className="flex-1">
                            <textarea
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none resize-none transition-all disabled:opacity-50"
                                rows={2}
                                placeholder="Write a comment..."
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                disabled={isSubmitting}
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    className="bg-[var(--color-primary)] text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:brightness-90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={handlePostComment}
                                    disabled={isSubmitting || !commentText.trim()}
                                >
                                    {isSubmitting ? 'Posting...' : 'Post Comment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
