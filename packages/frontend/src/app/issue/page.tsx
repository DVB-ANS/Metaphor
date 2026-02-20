'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface AssetForm {
  assetType: string;
  name: string;
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
  nominalValue: '',
  couponRate: '',
  paymentFrequency: '',
  maturityDate: '',
  tokenCount: '',
  jurisdiction: '',
  description: '',
};

const BottomGradient = () => {
  return (
    <>
      <span className="absolute inset-x-0 -bottom-px block h-px w-full bg-gradient-to-r from-transparent via-neutral-400 to-transparent opacity-0 transition duration-500 group-hover/btn:opacity-100" />
      <span className="absolute inset-x-10 -bottom-px mx-auto block h-px w-1/2 bg-gradient-to-r from-transparent via-neutral-500 to-transparent opacity-0 blur-sm transition duration-500 group-hover/btn:opacity-100" />
    </>
  );
};

const LabelInputContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn('flex w-full flex-col space-y-2', className)}>
      {children}
    </div>
  );
};

export default function IssueAssetPage() {
  const [form, setForm] = useState<AssetForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof AssetForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Mock submit — will be wired to ADI contracts via backend in Phase 3
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    alert('Asset tokenization submitted (mock). Will be connected to ADI contracts.');
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="shadow-input rounded-none bg-white p-4 md:rounded-2xl md:p-8 dark:bg-black">
        <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-200">
          Issue New Asset
        </h2>
        <p className="mt-2 max-w-sm text-sm text-neutral-600 dark:text-neutral-300">
          Tokenize a real-world asset on the ADI chain. Tokens will be minted via
          RWATokenFactory.
        </p>

        <form className="my-8" onSubmit={handleSubmit}>
          {/* Asset Type */}
          <LabelInputContainer className="mb-4">
            <Label htmlFor="assetType">Asset Type</Label>
            <div className="group/btn relative overflow-hidden">
              <Select
                value={form.assetType}
                onValueChange={(v) => handleChange('assetType', v)}
              >
                <SelectTrigger className="dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]">
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corporate-bond">Corporate Bond</SelectItem>
                  <SelectItem value="sovereign-bond">Sovereign Bond</SelectItem>
                  <SelectItem value="invoice">Invoice (Factoring)</SelectItem>
                  <SelectItem value="real-estate">Real Estate</SelectItem>
                  <SelectItem value="debt-title">Debt Title</SelectItem>
                </SelectContent>
              </Select>
              <BottomGradient />
            </div>
          </LabelInputContainer>

          {/* Name */}
          <LabelInputContainer className="mb-4">
            <Label htmlFor="name">Asset Name</Label>
            <div className="group/btn relative overflow-hidden">
              <Input
                id="name"
                placeholder="e.g. BondToken-ACME-2026"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]"
              />
              <BottomGradient />
            </div>
          </LabelInputContainer>

          {/* Nominal Value + Token Count */}
          <div className="mb-4 flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
            <LabelInputContainer>
              <Label htmlFor="nominalValue">Nominal Value (USD)</Label>
              <div className="group/btn relative overflow-hidden">
                <Input
                  id="nominalValue"
                  type="number"
                  placeholder="1000000"
                  value={form.nominalValue}
                  onChange={(e) => handleChange('nominalValue', e.target.value)}
                  className="dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]"
                />
                <BottomGradient />
              </div>
            </LabelInputContainer>
            <LabelInputContainer>
              <Label htmlFor="tokenCount">Number of Tokens</Label>
              <div className="group/btn relative overflow-hidden">
                <Input
                  id="tokenCount"
                  type="number"
                  placeholder="1000"
                  value={form.tokenCount}
                  onChange={(e) => handleChange('tokenCount', e.target.value)}
                  className="dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]"
                />
                <BottomGradient />
              </div>
            </LabelInputContainer>
          </div>

          {/* Coupon Rate + Frequency */}
          <div className="mb-4 flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
            <LabelInputContainer>
              <Label htmlFor="couponRate">Coupon Rate (% annual)</Label>
              <div className="group/btn relative overflow-hidden">
                <Input
                  id="couponRate"
                  type="number"
                  step="0.1"
                  placeholder="5.0"
                  value={form.couponRate}
                  onChange={(e) => handleChange('couponRate', e.target.value)}
                  className="dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]"
                />
                <BottomGradient />
              </div>
            </LabelInputContainer>
            <LabelInputContainer>
              <Label htmlFor="paymentFrequency">Payment Frequency</Label>
              <div className="group/btn relative overflow-hidden">
                <Select
                  value={form.paymentFrequency}
                  onValueChange={(v) => handleChange('paymentFrequency', v)}
                >
                  <SelectTrigger className="dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
                <BottomGradient />
              </div>
            </LabelInputContainer>
          </div>

          {/* Maturity Date */}
          <LabelInputContainer className="mb-4">
            <Label htmlFor="maturityDate">Maturity Date</Label>
            <div className="group/btn relative overflow-hidden">
              <Input
                id="maturityDate"
                type="date"
                value={form.maturityDate}
                onChange={(e) => handleChange('maturityDate', e.target.value)}
                className="dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]"
              />
              <BottomGradient />
            </div>
          </LabelInputContainer>

          {/* Jurisdiction */}
          <LabelInputContainer className="mb-4">
            <Label htmlFor="jurisdiction">Jurisdiction</Label>
            <div className="group/btn relative overflow-hidden">
              <Select
                value={form.jurisdiction}
                onValueChange={(v) => handleChange('jurisdiction', v)}
              >
                <SelectTrigger className="dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]">
                  <SelectValue placeholder="Select jurisdiction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="france">France</SelectItem>
                  <SelectItem value="germany">Germany</SelectItem>
                  <SelectItem value="usa">United States</SelectItem>
                  <SelectItem value="uk">United Kingdom</SelectItem>
                  <SelectItem value="switzerland">Switzerland</SelectItem>
                  <SelectItem value="luxembourg">Luxembourg</SelectItem>
                </SelectContent>
              </Select>
              <BottomGradient />
            </div>
          </LabelInputContainer>

          {/* Description */}
          <LabelInputContainer className="mb-8">
            <Label htmlFor="description">Description (optional)</Label>
            <div className="group/btn relative overflow-hidden">
              <Textarea
                id="description"
                placeholder="Additional details about the asset..."
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]"
              />
              <BottomGradient />
            </div>
          </LabelInputContainer>

          {/* Token value preview */}
          {form.nominalValue && form.tokenCount && (
            <>
              <div className="my-8 h-[1px] w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent dark:via-neutral-700" />
              <div className="mb-8 rounded-lg bg-gray-50 p-4 dark:bg-zinc-900 dark:shadow-[0px_0px_1px_1px_#262626]">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Token Value Preview</p>
                <p className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
                  ${(Number(form.nominalValue) / Number(form.tokenCount)).toLocaleString()} / token
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {form.tokenCount} tokens at {form.nominalValue} USD total
                </p>
              </div>
            </>
          )}

          <button
            className="group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-black to-neutral-600 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-800 dark:from-zinc-900 dark:to-zinc-900 dark:shadow-[0px_1px_0px_0px_#27272a_inset,0px_-1px_0px_0px_#27272a_inset]"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Tokenize Asset \u2192'}
            <BottomGradient />
          </button>
        </form>
      </div>
    </div>
  );
}
