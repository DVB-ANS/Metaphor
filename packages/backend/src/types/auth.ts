// ─── Auth Types ─────────────────────────────────────────────────

export interface NonceRecord {
  nonce: string;
  address: string;
  createdAt: number;
}

export interface AuthPayload {
  address: string;
  roles: string[];
  iat: number;
  exp: number;
}

export interface LoginBody {
  address: string;
  signature: string;
  message: string;
}

export type RoleName = 'ADMIN' | 'ISSUER' | 'INVESTOR' | 'AUDITOR';
