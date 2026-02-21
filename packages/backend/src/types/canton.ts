// ─── Canton / Daml Types ─────────────────────────────────────
// Maps to Daml templates: ConfidentialVault, VaultInvitation, TradeRequest,
// TradeSettlement, AuditInvitation, AuditRight, TradeProposal, TradeAgreement

export type VaultStatus = 'Active' | 'Frozen' | 'Closed';
export type AssetType = 'Bond' | 'Invoice' | 'Mortgage' | 'Equity';
export type VisibilityLevel = 'owner' | 'counterparty' | 'auditor';
export type TradeStatus = 'pending' | 'accepted' | 'rejected';
export type InvitationStatus = 'pending' | 'accepted' | 'declined';

export interface CantonAsset {
  assetId: string;
  assetType: AssetType;
  name: string;
  isin: string;
  nominalValue: number;
  couponRate: number;
  maturityDate: string;
  issuerName: string;
}

export interface CantonParty {
  party: string; // Daml party identifier
  role: VisibilityLevel;
  displayName: string;
}

export interface CantonVault {
  contractId: string;
  owner: string; // Daml party
  vaultId: string;
  vaultName: string;
  description: string;
  status: VaultStatus;
  assets: CantonAsset[];
  totalValue: number;
  counterparties: string[]; // Daml party identifiers
}

export interface VaultInvitation {
  contractId: string;
  vaultOwner: string; // party
  invitee: string; // party
  vaultId: string;
  vaultName: string;
}

export interface TradeRequest {
  contractId: string;
  vaultOwner: string;
  requester: string;
  vaultId: string;
  assetId: string;
  offeredPrice: number;
  notes: string;
}

// ─── Request Bodies ──────────────────────────────────────────

export interface CreateVaultBody {
  name: string;
  vaultId?: string;
  description?: string;
  owner?: string; // defaults to env party
}

export interface DepositAssetBody {
  assetId: string;
  assetType?: AssetType;
  name: string;
  isin?: string;
  nominalValue: number;
  couponRate: number;
  maturityDate: string;
  jurisdiction?: string;
  rating?: string;
}

export interface InvitePartyBody {
  to: string; // party identifier
  vaultName?: string;
}

export interface RequestTradeBody {
  assetId?: string;
  assetName?: string; // fallback for assetId
  price: number;
  message?: string;
}

export interface AddCounterpartyBody {
  party: string;
}
