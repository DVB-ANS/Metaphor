'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { api, setToken, getToken } from '@/lib/api';

export type RoleName = 'ADMIN' | 'ISSUER' | 'INVESTOR' | 'AUDITOR';

interface AuthState {
  jwt: string | null;
  address: string | null;
  roles: RoleName[];
  isAuthenticated: boolean;
  isSigningIn: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
  hasRole: (role: RoleName) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();

  const [jwt, setJwt] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleName[]>([]);
  const [authedAddress, setAuthedAddress] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const saved = getToken();
    if (saved && address) {
      // Validate existing token
      api.get<{ address: string; roles: RoleName[] }>('/api/auth/me')
        .then((data) => {
          if (data.address === address.toLowerCase()) {
            setJwt(saved);
            setAuthedAddress(data.address);
            setRoles(data.roles);
          } else {
            // Token is for a different address
            setToken(null);
          }
        })
        .catch(() => {
          // Token expired or backend unreachable — clear silently
          setToken(null);
        });
    }
  }, [address]);

  // Clear auth if wallet disconnects or address changes
  useEffect(() => {
    if (!isConnected || (authedAddress && address && address.toLowerCase() !== authedAddress)) {
      setJwt(null);
      setAuthedAddress(null);
      setRoles([]);
      setToken(null);
      setError(null);
    }
  }, [isConnected, address, authedAddress]);

  const signIn = useCallback(async () => {
    if (!address) {
      setError('Connect your wallet first');
      return;
    }

    setIsSigningIn(true);
    setError(null);

    try {
      // Step 1: Request nonce from backend
      const { message } = await api.post<{ nonce: string; message: string }>(
        '/api/auth/nonce',
        { address },
      );

      // Step 2: Sign the message with the wallet
      const signature = await signMessageAsync({ message });

      // Step 3: Send signature to backend for verification + JWT
      const { token, address: authed, roles: userRoles } = await api.post<{
        token: string;
        address: string;
        roles: RoleName[];
      }>('/api/auth/login', { address, signature, message });

      // Step 4: Store token and update state
      setToken(token);
      setJwt(token);
      setAuthedAddress(authed);
      setRoles(userRoles);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      setError(msg);
    } finally {
      setIsSigningIn(false);
    }
  }, [address, signMessageAsync]);

  const signOut = useCallback(() => {
    setToken(null);
    setJwt(null);
    setAuthedAddress(null);
    setRoles([]);
    setError(null);
  }, []);

  const hasRole = useCallback(
    (role: RoleName) => roles.includes(role),
    [roles],
  );

  return (
    <AuthContext.Provider
      value={{
        jwt,
        address: authedAddress,
        roles,
        isAuthenticated: !!jwt,
        isSigningIn,
        error,
        signIn,
        signOut,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
