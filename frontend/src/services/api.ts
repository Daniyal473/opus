import axios from 'axios';
import type { Item, CreateItemDto, HealthResponse } from '../types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// API Service
export const apiService = {
    // Health check
    healthCheck: async (): Promise<HealthResponse> => {
        const response = await api.get<HealthResponse>('/health/');
        return response.data;
    },

    // Get all items
    getItems: async (): Promise<Item[]> => {
        const response = await api.get<Item[]>('/items/');
        return response.data;
    },

    // Get single item
    getItem: async (id: number): Promise<Item> => {
        const response = await api.get<Item>(`/items/${id}/`);
        return response.data;
    },

    // Create item
    createItem: async (data: CreateItemDto): Promise<Item> => {
        const response = await api.post<Item>('/items/', data);
        return response.data;
    },

    // Update item
    updateItem: async (id: number, data: Partial<CreateItemDto>): Promise<Item> => {
        const response = await api.patch<Item>(`/items/${id}/`, data);
        return response.data;
    },

    // Delete item
    deleteItem: async (id: number): Promise<void> => {
        await api.delete(`/items/${id}/`);
    },
};
