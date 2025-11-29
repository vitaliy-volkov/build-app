import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Project } from '../types';

// Keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: string) => [...projectKeys.lists(), { filters }] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// Types
interface ProjectsResponse {
  data: Project[];
  total: number;
  page: number;
  limit: number;
}

// Hooks
export const useProjects = (params?: { page?: number; limit?: number; sort_by?: string }) => {
  return useQuery({
    queryKey: projectKeys.list(JSON.stringify(params)),
    queryFn: async () => {
      const response = await api.get<ProjectsResponse>('/projects', { params });
      return response.data;
    },
  });
};

export const useProject = (id: string) => {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const response = await api.get<{ project: Project }>(`/projects/${id}`);
      return response.data.project;
    },
    enabled: !!id,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newProject: Partial<Project>) => {
      const response = await api.post<{ project: Project }>('/projects', newProject);
      return response.data.project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
      const response = await api.put<{ project: Project }>(`/projects/${id}`, data);
      return response.data.project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(data.id) });
    },
  });
};
