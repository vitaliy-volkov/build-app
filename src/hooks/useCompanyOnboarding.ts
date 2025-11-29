import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Company, User } from '../types';
import { useAuth } from '../services/apiClient';

interface CreateCompanyRequest {
  name: string;
  address?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  email?: string;
  phone?: string;
  website?: string;
}

interface CreateCompanyResponse {
  success: boolean;
  message?: string;
  data: {
    company: Company;
    user: User;
  };
}

export const useCompanyOnboarding = () => {
  const { updateUser } = useAuth(); 

  return useMutation({
    mutationFn: async (data: CreateCompanyRequest) => {
      // Sanitize input: convert empty strings to undefined for optional fields
      const sanitizedData = {
        ...data,
        inn: data.inn || undefined,
        kpp: data.kpp || undefined,
        ogrn: data.ogrn || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        website: data.website || undefined,
      };

      try {
        const response = await api.post<CreateCompanyResponse>('/companies', sanitizedData);
        return response.data;
      } catch (error: any) {
        // Extract the error message from the backend response structure
        const message = error.response?.data?.error || error.response?.data?.message || 'Не удалось создать компанию';
        const details = error.response?.data?.details;
        
        // Construct a readable error object
        throw new Error(details ? `${message}: ${details}` : message);
      }
    },
    onSuccess: (response) => {
        if (response.data?.user) {
             updateUser(response.data.user);
        }
    }
  });
};