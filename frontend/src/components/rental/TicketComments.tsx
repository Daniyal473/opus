import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';

interface TicketCommentsProps {
    ticketId?: string;
    username?: string;
    apartmentNumber?: string;
    ticketType?: string;
    ticketStatus?: string;
    className?: string; // Allow external styling
    role?: string;
}

export function TicketComments({ ticketId, username, apartmentNumber, ticketType, ticketStatus, className = '', role }: TicketCommentsProps) {
    if (role?.toLowerCase() === 'user') return null;

    const [comments, setComments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (ticketId) {
            fetchComments();
        }
    }, [ticketId]);

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
                    user: username,
                    apartment_number: apartmentNumber,
                    ticket_type: ticketType,
                    ticket_status: ticketStatus
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

    return (
        <div className={`flex flex-col h-full bg-gray-50/50 border-l border-gray-200 ${className}`}>
            <div className="p-4 border-b border-gray-200 bg-white">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    Comments
                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                        {comments.length}
                    </span>
                </h3>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <span className="text-gray-400 text-sm">Loading...</span>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <p className="text-sm">No comments yet.</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0 text-yellow-600">
                                <span className="text-xs font-bold">
                                    {(() => {
                                        const name = comment.user || '??';
                                        const parts = name.trim().split(' ');
                                        if (parts.length >= 2) {
                                            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                                        }
                                        return name.substring(0, 1).toUpperCase();
                                    })()}
                                </span>
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-900">{comment.user}</span>
                                    <span className="text-xs text-gray-500">
                                        {comment.created ? new Date(comment.created).toLocaleString(undefined, {
                                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                        }) : ''}
                                    </span>
                                </div>
                                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm text-sm text-gray-600">
                                    {comment.comment}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex items-end gap-2">
                    <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:border-transparent transition-all">
                        <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Write a comment..."
                            className="w-full bg-transparent border-none focus:ring-0 outline-none p-3 text-sm min-h-[44px] max-h-[120px] resize-none"
                            rows={1}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handlePostComment();
                                }
                            }}
                        />
                    </div>
                    <button
                        onClick={handlePostComment}
                        disabled={isSubmitting || !commentText.trim()}
                        className="p-3 bg-[var(--color-primary)] text-white rounded-xl hover:brightness-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
