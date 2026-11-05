import type { AuthTokens } from '@way2meal/shared';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const KEY = 'w2m.tokens';

interface AuthState {
  /** false until tokens have been read from secure storage at startup */
  ready: boolean;
  tokens: AuthTokens | null;
  load: () => Promise<void>;
  setTokens: (tokens: AuthTokens) => Promise<void>;
  clear: () => Promise<void>;
}

/** Session tokens, persisted in the device keystore (expo-secure-store). */
export const useAuth = create<AuthState>((set) => ({
  ready: false,
  tokens: null,
  load: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      set({ tokens: raw ? (JSON.parse(raw) as AuthTokens) : null, ready: true });
    } catch {
      set({ tokens: null, ready: true });
    }
  },
  setTokens: async (tokens) => {
    await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
    set({ tokens });
  },
  clear: async () => {
    await SecureStore.deleteItemAsync(KEY).catch(() => undefined);
    set({ tokens: null });
  },
}));
