'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RoleGate } from '@/components/role-gate';
import { TxStatusBanner } from '@/components/tx-status';
import { useCreateToken } from '@/hooks/use-adi-write';

interface AssetForm {
  assetType: string;
  name: string;
  isin: string;
  nominalValue: string;
  couponRate: string;
  paymentFrequency: string;
  maturityDate: string;
  tokenCount: string;
  jurisdiction: string;
  description: string;
}

const initialForm: AssetForm = {
  assetType: '',
  name: '',
  isin: '',
  nominalValue: '',
  couponRate: '',
  paymentFrequency: '',
  maturityDate: '',
  tokenCount: '',
  jurisdiction: '',
  description: '',
};

function deriveSymbol(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'RWA';
  return words.map((w) => w[0].toUpperCase()).join('').slice(0, 6);
}

const inputClass =
  'border border-black/10 bg-transparent rounded-none px-3 py-2 text-sm text-black placeholder:text-black/25 focus:border-black/30 focus:outline-none w-full';

const selectClass =
  'border border-black/10 bg-transparent rounded-none px-3 py-2 text-sm text-black focus:border-black/30 focus:outline-none w-full appearance-none';

const labelClass = 'text-xs font-medium uppercase tracking-widest text-black/30';

export default function IssueAssetPage() {
  const router = useRouter();
  const [form, setForm] = useState<AssetForm>(initialForm);
  const { createToken, status, txHash, error, reset } = useCreateToken();

  const handleChange = (field: keyof AssetForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => router.push('/vaults'), 1500);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    const maturityTimestamp = form.maturityDate
      ? Math.floor(new Date(form.maturityDate).getTime() / 1000)
      : 0;
    const supply = form.tokenCount || '0';

    createToken({
      name: form.name,
      symbol: deriveSymbol(form.name),
      isin: form.isin || 'PENDING',
      rate: Number(form.couponRate) || 0,
      maturity: maturityTimestamp,
      initialSupply: supply,
    });
  };

  return (
    <RoleGate allowed={['ADMIN', 'ISSUER']}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-black">Issue New Asset</h1>
          <p className="mt-1 text-sm text-black/45">
            Tokenize a real-world asset on the ADI chain. Tokens will be minted via
            RWATokenFactory.
          </p>
        </div>

        {status !== 'idle' && (
          <div className="mb-6">
            <TxStatusBanner
              status={status}
              txHash={txHash}
              error={error}
              successMessage="Token created on-chain. Redirecting to vaults..."
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Asset Type */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="assetType" className={labelClass}>
              Asset Type
            </label>
            <select
              id="assetType"
              value={form.assetType}
              onChange={(e) => handleChange('assetType', e.target.value)}
              className={selectClass}
            >
              <option value="" disabled>
                Select asset type
              </option>
              <option value="corporate-bond">Corporate Bond</option>
              <option value="sovereign-bond">Sovereign Bond</option>
              <option value="invoice">Invoice (Factoring)</option>
              <option value="real-estate">Real Estate</option>
              <option value="debt-title">Debt Title</option>
            </select>
          </div>

          {/* Asset Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className={labelClass}>
              Asset Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="e.g. BondToken-ACME-2026"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* ISIN */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="isin" className={labelClass}>
              ISIN
            </label>
            <input
              id="isin"
              type="text"
              placeholder="e.g. FR0014007LW0"
              value={form.isin}
              onChange={(e) => handleChange('isin', e.target.value)}
              className={inputClass}
            />
            <p className="text-xs text-black/30">
              International Securities Identification Number (12 characters)
            </p>
          </div>

          {/* Nominal Value + Token Count */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nominalValue" className={labelClass}>
                Nominal Value (USD)
              </label>
              <input
                id="nominalValue"
                type="number"
                placeholder="1000000"
                value={form.nominalValue}
                onChange={(e) => handleChange('nominalValue', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tokenCount" className={labelClass}>
                Number of Tokens
              </label>
              <input
                id="tokenCount"
                type="number"
                placeholder="1000"
                value={form.tokenCount}
                onChange={(e) => handleChange('tokenCount', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Coupon Rate + Payment Frequency */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="couponRate" className={labelClass}>
                Coupon Rate (% annual)
              </label>
              <input
                id="couponRate"
                type="number"
                step="0.1"
                placeholder="5.0"
                value={form.couponRate}
                onChange={(e) => handleChange('couponRate', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="paymentFrequency" className={labelClass}>
                Payment Frequency
              </label>
              <select
                id="paymentFrequency"
                value={form.paymentFrequency}
                onChange={(e) => handleChange('paymentFrequency', e.target.value)}
                className={selectClass}
              >
                <option value="" disabled>
                  Select frequency
                </option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi-annual">Semi-Annual</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>

          {/* Maturity Date */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="maturityDate" className={labelClass}>
              Maturity Date
            </label>
            <input
              id="maturityDate"
              type="date"
              value={form.maturityDate}
              onChange={(e) => handleChange('maturityDate', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Jurisdiction */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="jurisdiction" className={labelClass}>
              Jurisdiction
            </label>
            <select
              id="jurisdiction"
              value={form.jurisdiction}
              onChange={(e) => handleChange('jurisdiction', e.target.value)}
              className={selectClass}
            >
              <option value="" disabled>
                Select jurisdiction
              </option>
              <option value="france">France</option>
              <option value="germany">Germany</option>
              <option value="usa">United States</option>
              <option value="uk">United Kingdom</option>
              <option value="switzerland">Switzerland</option>
              <option value="luxembourg">Luxembourg</option>
            </select>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className={labelClass}>
              Description (optional)
            </label>
            <textarea
              id="description"
              placeholder="Additional details about the asset..."
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className={inputClass}
            />
          </div>

          {/* Token value preview */}
          {form.nominalValue && form.tokenCount && (
            <div className="border-t border-black/10 pt-5">
              <p className={labelClass}>Token Value Preview</p>
              <p className="mt-1 text-base font-semibold text-black">
                ${(Number(form.nominalValue) / Number(form.tokenCount)).toLocaleString()} / token
              </p>
              <p className="mt-0.5 text-xs text-black/35">
                {form.tokenCount} tokens at {form.nominalValue} USD total
              </p>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={status === 'pending' || status === 'confirming'}
              className="bg-black text-white px-6 py-2 text-sm hover:bg-black/80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {status === 'pending' ? 'Confirm in wallet...' : status === 'confirming' ? 'Confirming...' : 'Tokenize Asset'}
            </button>
          </div>
        </form>
      </div>
    </RoleGate>
  );
}
