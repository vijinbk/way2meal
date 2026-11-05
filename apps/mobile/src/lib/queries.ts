import { useQuery } from '@tanstack/react-query';
import type { PublicConfig, ResolvedMenu, Role } from '@way2meal/shared';
import { useAuth } from './auth-store';
import { api } from './api';

export interface Profile {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  role: Role;
  dietaryNote: string | null;
  defaultFlavourId: string | null;
}

export const useConfig = () =>
  useQuery({
    queryKey: ['config'],
    queryFn: () => api<PublicConfig>('/config'),
    staleTime: 5 * 60_000,
  });

export const useMenu = (from: string, to: string) =>
  useQuery({
    queryKey: ['menu', from, to],
    queryFn: () => api<ResolvedMenu[]>(`/menu?from=${from}&to=${to}`),
    staleTime: 60_000,
  });

export const useProfile = () => {
  const signedIn = useAuth((s) => s.tokens !== null);
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api<Profile>('/me', { auth: true }),
    enabled: signedIn,
  });
};
