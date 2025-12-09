export interface Item {
    id: number;
    title: string;
    description: string;
    created_at: string;
    updated_at: string;
}

export interface CreateItemDto {
    title: string;
    description?: string;
}

export interface HealthResponse {
    status: string;
    message: string;
}
