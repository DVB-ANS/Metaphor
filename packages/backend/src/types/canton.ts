// ─── Canton / Daml Types ─────────────────────────────────────
// Maps to Dev B's Daml templates: ConfidentialVault, VaultInvitation, TradeRequest

export type VaultStatus = 'active' | 'frozen' | 'closed';
export type VisibilityLevel = 'owner' | 'counterparty' | 'auditor';
export type TradeStatus = 'pending' | 'accepted' | 'rejected';
export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface CantonAsset {
  assetId: string;
  name: string;
  nominalValue: number;
  couponRate: number;
  maturityDate: string;
  jurisdiction: string;
  rating: string;
}

export interface CantonParty {
  party: string; // Daml party identifier
  role: VisibilityLevel;
  displayName: string;
}

export interface CantonVault {
  contractId: string;
  owner: string; // Daml party
  name: string;
  status: VaultStatus;
  assets: CantonAsset[];
  counterparties: CantonParty[];
  createdAt: string;
}

export interface VaultInvitation {
  contractId: string;
  vaultId: string;
  from: string; // party
  to: string; // party
  role: VisibilityLevel;
  status: InvitationStatus;
  createdAt: string;
}

export interface TradeRequest {
  contractId: string;
  vaultId: string;
  from: string;
  to: string;
  assetName: string;
  amount: number;
  price: number;
  status: TradeStatus;
  message?: string;
  createdAt: string;
}

// ─── Request Bodies ──────────────────────────────────────────

export interface CreateVaultBody {
  name: string;
  owner?: string; // defaults to env party
}

export interface DepositAssetBody {
  assetId: string;
  name: string;
  nominalValue: number;
  couponRate: number;
  maturityDate: string;
  jurisdiction: string;
  rating: string;
}

export interface InvitePartyBody {
  to: string; // party identifier
  role: VisibilityLevel;
}

export interface RequestTradeBody {
  to: string;
  assetName: string;
  amount: number;
  price: number;
  message?: string;
}

export interface AddCounterpartyBody {
  party: string;
  role: VisibilityLevel;
  displayName: string;
}
