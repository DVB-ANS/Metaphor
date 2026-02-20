'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Issue New Asset</h1>
        <p className="text-muted-foreground">
          Tokenize a real-world asset on the ADI chain
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Asset Details</CardTitle>
            <CardDescription>
              Fill in the asset parameters. Tokens will be minted via RWATokenFactory on ADI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Asset Type */}
            <div className="space-y-2">
              <Label htmlFor="assetType">Asset Type</Label>
              <Select
                value={form.assetType}
                onValueChange={(v) => handleChange('assetType', v)}
              >
                <SelectTrigger>
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
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Asset Name</Label>
              <Input
                id="name"
                placeholder="e.g. BondToken-ACME-2026"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>

            {/* Nominal Value + Token Count */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nominalValue">Nominal Value (USD)</Label>
                <Input
                  id="nominalValue"
                  type="number"
                  placeholder="1000000"
                  value={form.nominalValue}
                  onChange={(e) => handleChange('nominalValue', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tokenCount">Number of Tokens</Label>
                <Input
                  id="tokenCount"
                  type="number"
                  placeholder="1000"
                  value={form.tokenCount}
                  onChange={(e) => handleChange('tokenCount', e.target.value)}
                />
              </div>
            </div>

            {/* Coupon Rate + Frequency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="couponRate">Coupon Rate (% annual)</Label>
                <Input
                  id="couponRate"
                  type="number"
                  step="0.1"
                  placeholder="5.0"
                  value={form.couponRate}
                  onChange={(e) => handleChange('couponRate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentFrequency">Payment Frequency</Label>
                <Select
                  value={form.paymentFrequency}
                  onValueChange={(v) => handleChange('paymentFrequency', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semi-annual">Semi-Annual</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Maturity Date */}
            <div className="space-y-2">
              <Label htmlFor="maturityDate">Maturity Date</Label>
              <Input
                id="maturityDate"
                type="date"
                value={form.maturityDate}
                onChange={(e) => handleChange('maturityDate', e.target.value)}
              />
            </div>

            {/* Jurisdiction */}
            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <Select
                value={form.jurisdiction}
                onValueChange={(v) => handleChange('jurisdiction', v)}
              >
                <SelectTrigger>
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
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Additional details about the asset..."
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
              />
            </div>

            {/* Token value preview */}
            {form.nominalValue && form.tokenCount && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Token Value Preview</p>
                <p className="text-lg font-bold">
                  ${(Number(form.nominalValue) / Number(form.tokenCount)).toLocaleString()} / token
                </p>
                <p className="text-xs text-muted-foreground">
                  {form.tokenCount} tokens at {form.nominalValue} USD total
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Tokenize Asset'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
