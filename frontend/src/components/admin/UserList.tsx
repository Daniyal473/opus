import React from 'react';
import { Users, Trash2, Edit2, Mail, Shield, ShieldAlert } from 'lucide-react';

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
}

interface UserListProps {
    users: User[];
    onDelete: (id: string) => void;
    onEdit: (user: User) => void;
}

export const UserList: React.FC<UserListProps> = ({ users, onDelete, onEdit }) => {
    const getRoleBadgeColor = (role: string) => {
        switch (role.toLowerCase()) {
            case 'admin':
                return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'super-admin':
                return 'bg-orange-100 text-orange-700 border-orange-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getRoleIcon = (role: string) => {
        if (role.toLowerCase() === 'admin') {
            return <Shield size={14} />;
        }
        if (role.toLowerCase() === 'super-admin') {
            return <ShieldAlert size={14} />;
        }
        return null;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
                    <Users size={20} className="text-white" />
                </div>
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-800">User List</h2>
                    <p className="text-sm text-gray-500 mt-1">{users.length} total users</p>
                </div>
            </div>

            {users.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users size={32} className="text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-lg font-medium">No users yet</p>
                    <p className="text-gray-400 text-sm mt-2">Create your first user to get started</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {users.map((user) => (
                        <div
                            key={user.id}
                            className="bg-gray-50 border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-[var(--color-primary)] transition-all duration-200"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-800">{user.name}</h3>
                                        <span
                                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(
                                                user.role
                                            )}`}
                                        >
                                            {getRoleIcon(user.role)}
                                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                        <Mail size={16} className="text-gray-400" />
                                        <span>{user.email}</span>
                                    </div>

                                    <p className="text-xs text-gray-400 mt-2">
                                        Created: {new Date(user.createdAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onEdit(user)}
                                        className="p-2 text-[var(--color-primary)] hover:bg-yellow-50 rounded-lg transition-colors"
                                        title="Edit user"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(user.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete user"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
