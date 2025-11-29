import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Transaction } from '../types';

// Stats Interface (matching backend response)
export interface FinanceStats {
    income: number;
    expense: number;
    balance: number;
}

// Keys
export const financeKeys = {
    all: ['finance'] as const,
    transactions: (filters?: any) => [...financeKeys.all, 'transactions', filters] as const,
    stats: () => [...financeKeys.all, 'stats'] as const,
};

// Hooks
export const useTransactions = (filters?: { project_id?: string; type?: string; page?: number; limit?: number }) => {
    return useQuery({
        queryKey: financeKeys.transactions(filters),
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters?.project_id) params.append('project_id', filters.project_id);
            if (filters?.type) params.append('type', filters.type);
            if (filters?.page) params.append('page', filters.page.toString());
            if (filters?.limit) params.append('limit', filters.limit.toString());

            const response = await api.get<{ data: Transaction[] }>(`/finance/transactions?${params.toString()}`);
            // Return just the array for now, or the full paginated response if needed
            return response.data.data; 
        },
    });
};

export const useFinanceStats = () => {
    return useQuery({
        queryKey: financeKeys.stats(),
        queryFn: async () => {
            const response = await api.get<FinanceStats>('/finance/stats');
            return response.data;
        },
    });
};
