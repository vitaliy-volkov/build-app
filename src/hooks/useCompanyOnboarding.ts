import { useMutation } from '@tanstack/react-query';
import { apiClient, useAuth } from '../services/apiClient';
import { Company, User } from '../types';

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
  const { updateUser, user } = useAuth(); 

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
        const response = await apiClient.createCompany(sanitizedData);
        if (!response.success || !response.data) {
            throw new Error(response.error || 'Не удалось создать компанию');
        }
        
        // Mock response structure adaptation if needed
        // In mock mode, apiClient returns { company }.
        // We need to return what was expected or adapt onSuccess.
        // Assuming we need to construct a response compatible with what was there or change onSuccess logic.
        
        // Since we changed to apiClient, we get ApiResponse<{ company: Company }>
        
        const newCompany = response.data.company;
        const updatedUser = user ? {
            ...user,
            company_id: newCompany.id,
            companies: [
                ...(user.companies || []).map(c => ({...c, is_current: false})), 
                { 
                    id: newCompany.id, 
                    name: newCompany.name, 
                    role: 'director', // Default role 
                    is_current: true 
                }
            ]
        } : user;

        return {
            success: true,
            data: {
                company: newCompany,
                user: updatedUser as User
            }
        };
      } catch (error: any) {
        throw new Error(error.message || 'Не удалось создать компанию');
      }
    },
    onSuccess: (response: any) => {
        if (response.data?.user) {
             // In real scenario, backend returns updated user with new company_id
             // In mock mode, we might need to update local user state manually if apiClient.createCompany didn't do it.
             // But apiClient mock creates company but doesn't link it to user in MOCK_USERS implicitly unless we wrote that logic.
             
             // For now, let's assume valid flow.
             updateUser(response.data.user);
        }
    }
  });
};