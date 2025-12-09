import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { Item, CreateItemDto } from '../types';
import './ItemManager.css';

export function ItemManager() {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [healthStatus, setHealthStatus] = useState<string>('');
    const [newItem, setNewItem] = useState<CreateItemDto>({
        title: '',
        description: '',
    });

    useEffect(() => {
        checkHealth();
        fetchItems();
    }, []);

    const checkHealth = async () => {
        try {
            const health = await apiService.healthCheck();
            setHealthStatus(health.message);
        } catch (err) {
            console.error('Health check failed:', err);
            setHealthStatus('Backend connection failed');
        }
    };

    const fetchItems = async () => {
        try {
            setLoading(true);
            const data = await apiService.getItems();
            setItems(data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch items. Make sure Django backend is running on port 8000.');
            console.error('Error fetching items:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.title.trim()) return;

        try {
            await apiService.createItem(newItem);
            setNewItem({ title: '', description: '' });
            fetchItems();
        } catch (err) {
            setError('Failed to create item');
            console.error('Error creating item:', err);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await apiService.deleteItem(id);
            fetchItems();
        } catch (err) {
            setError('Failed to delete item');
            console.error('Error deleting item:', err);
        }
    };

    return (
        <div className="item-manager">
            <div className="status-bar">
                <span className={`status-indicator ${healthStatus.includes('successfully') ? 'healthy' : 'error'}`}>
                    ●
                </span>
                <span className="status-text">{healthStatus || 'Checking connection...'}</span>
            </div>

            <h1>Item Manager</h1>
            <p className="subtitle">TypeScript Frontend ↔ Django Backend</p>

            <form onSubmit={handleCreate} className="create-form">
                <div className="form-group">
                    <input
                        type="text"
                        placeholder="Item title"
                        value={newItem.title}
                        onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                        className="input-field"
                    />
                    <textarea
                        placeholder="Description (optional)"
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        className="input-field textarea"
                        rows={3}
                    />
                </div>
                <button type="submit" className="btn-primary">
                    Add Item
                </button>
            </form>

            {error && (
                <div className="error-message">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {loading ? (
                <div className="loading">Loading items...</div>
            ) : (
                <div className="items-grid">
                    {items.length === 0 ? (
                        <div className="empty-state">
                            <p>No items yet. Create one above!</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={item.id} className="item-card">
                                <div className="item-header">
                                    <h3>{item.title}</h3>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="btn-delete"
                                        aria-label="Delete item"
                                    >
                                        ×
                                    </button>
                                </div>
                                {item.description && <p className="item-description">{item.description}</p>}
                                <div className="item-footer">
                                    <span className="item-date">
                                        {new Date(item.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
