import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { Header } from './Header';
import { UserForm } from './UserForm';
import { UserList, type User } from './UserList';
import { Modal } from '../ui/Modal';
import { Toast } from '../ui/Toast';

import { EditUserModal } from './EditUserModal';

interface AdminDashboardProps {
    onLogout?: () => void;
    onResetPassword?: () => void;
    onBack?: () => void;
    username?: string;
    onUserUpdated?: (user: User) => void;
    refreshTrigger?: string; // Trigger to force data refresh
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onResetPassword, onBack, username, onUserUpdated, refreshTrigger }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Modal state
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);

    // Edit Modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);

    // Fetch users on mount AND when refreshTrigger changes (page refresh)
    useEffect(() => {
        fetchUsers();
    }, [refreshTrigger]);

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/`);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to fetch users:', errorData);
                throw new Error(errorData.error || 'Failed to fetch users');
            }

            const data = await response.json();
            // Ensure data is an array before setting it
            if (Array.isArray(data)) {
                setUsers(data);
            } else {
                console.error('API returned non-array data:', data);
                setUsers([]);
            }
        } catch (error: any) {
            console.error('Error fetching users:', error);
            setToast({ message: error.message || 'Failed to fetch users', type: 'error' });
        } finally {
            // setLoading(false);
        }
    };

    const handleCreateUser = async (userData: any) => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/create/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create user');
            }

            // Note: Teable returns the created record nested in records array.
            const teableRecord = data.records?.[0];
            const newUser: User = {
                id: teableRecord?.id || Date.now().toString(),
                name: userData.name,
                email: userData.email,
                role: userData.role,
                createdAt: new Date().toISOString()
            };

            setUsers([newUser, ...users]);
            setToast({ message: 'User created successfully!', type: 'success' });
        } catch (error: any) {
            console.error('Error creating user:', error);
            setToast({ message: error.message, type: 'error' });
        }
    };

    const handleEditUser = (user: User) => {
        setUserToEdit(user);
        setEditModalOpen(true);
    };

    const handleUpdateUser = async (id: string, updates: { name: string; email: string; role: string }) => {
        console.log('Updating user:', id, updates);
        try {
            const response = await fetch(`${API_BASE_URL}/users/${id}/update/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update user');
            }

            // Update local state
            setUsers(users.map(user =>
                user.id === id ? { ...user, ...updates } : user
            ));

            setToast({ message: 'User updated successfully!', type: 'success' });
            if (onUserUpdated && userToEdit) {
                const updatedUser: User = { ...userToEdit, ...updates };
                onUserUpdated(updatedUser);
            }
            setEditModalOpen(false);
            setUserToEdit(null);
        } catch (error: any) {
            console.error('Error updating user:', error);
            setToast({ message: error.message, type: 'error' });
        }
    };

    const handleDeleteUser = (userId: string) => {
        setUserToDelete(userId);
        setDeleteModalOpen(true);
    };

    const confirmDeleteUser = async () => {
        if (userToDelete) {
            try {
                const response = await fetch(`${API_BASE_URL}/users/${userToDelete}/delete/`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to delete user');
                }

                // If successful, update UI
                setUsers(users.filter(user => user.id !== userToDelete));
                setToast({ message: 'User deleted successfully!', type: 'success' });
            } catch (error: any) {
                console.error('Error deleting user:', error);
                setToast({ message: error.message, type: 'error' });
            } finally {
                setDeleteModalOpen(false);
                setUserToDelete(null);
            }
        }
    };

    console.log('AdminDashboard is rendering with users:', users);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            <Header onLogout={onLogout} onResetPassword={onResetPassword} onBack={onBack} userName={username} />

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* User Form */}
                    <div>
                        <UserForm onSubmit={handleCreateUser} />
                    </div>

                    {/* User List */}
                    <div>
                        <UserList users={users} onDelete={handleDeleteUser} onEdit={handleEditUser} />
                    </div>
                </div>
            </main>

            <Modal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDeleteUser}
                title="Delete User"
                message="Are you sure you want to delete this user? This action cannot be undone."
                confirmText="Delete User"
                type="danger"
            />

            <EditUserModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                onSave={handleUpdateUser}
                user={userToEdit}
            />

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};
