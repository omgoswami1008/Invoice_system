"use client";

import { useEffect, useRef, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface BankDetails {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
}

interface CompanyData {
  companyName: string;
  address: string;
  mobileNumber: string;
  bankDetails: BankDetails;
  signature: string;
}

const emptyData: CompanyData = {
  companyName: "",
  address: "",
  mobileNumber: "",
  bankDetails: {
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    branch: "",
  },
  signature: "",
};

export default function CompanySettingsPage() {
  const [data, setData] = useState<CompanyData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function loadSettings() {
      try {
        const res = await fetch("/api/company-settings");
        if (res.ok) {
          const result = await res.json();
          setData({
            companyName: result.settings.companyName || "",
            address: result.settings.address || "",
            mobileNumber: result.settings.mobileNumber || "",
            bankDetails: {
              bankName: result.settings.bankDetails?.bankName || "",
              accountHolderName: result.settings.bankDetails?.accountHolderName || "",
              accountNumber: result.settings.bankDetails?.accountNumber || "",
              ifscCode: result.settings.bankDetails?.ifscCode || "",
              branch: result.settings.bankDetails?.branch || "",
            },
            signature: result.settings.signature || "",
          });
        }
      } catch {
        setError("Failed to load company settings");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleBankChange = (field: keyof BankDetails, value: string) => {
    setData({
      ...data,
      bankDetails: { ...data.bankDetails, [field]: value },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/company-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        setError(result.error || "Failed to save settings");
      } else {
        setMessage("Company settings saved successfully!");
      }
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your company information for invoices.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {message && (
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-sm text-green-700">{message}</p>
          </div>
        )}
        {error && (
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Company Information */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Company Information</h2>
          </div>
          <div className="space-y-4 px-6 py-4">
            <Input
              id="companyName"
              label="Company Name"
              value={data.companyName}
              onChange={(e) => setData({ ...data, companyName: e.target.value })}
              placeholder="Your Company Name"
            />
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                id="address"
                rows={3}
                value={data.address}
                onChange={(e) => setData({ ...data, address: e.target.value })}
                placeholder="Company address"
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <Input
              id="mobileNumber"
              label="Mobile Number"
              value={data.mobileNumber}
              onChange={(e) => setData({ ...data, mobileNumber: e.target.value })}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>
        </div>

        {/* Bank Details */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Bank Details</h2>
          </div>
          <div className="space-y-4 px-6 py-4">
            <Input
              id="bankName"
              label="Bank Name"
              value={data.bankDetails.bankName}
              onChange={(e) => handleBankChange("bankName", e.target.value)}
              placeholder="e.g. State Bank of India"
            />
            <Input
              id="accountHolderName"
              label="Account Holder Name"
              value={data.bankDetails.accountHolderName}
              onChange={(e) => handleBankChange("accountHolderName", e.target.value)}
              placeholder="Account holder name"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="accountNumber"
                label="Account Number"
                value={data.bankDetails.accountNumber}
                onChange={(e) => handleBankChange("accountNumber", e.target.value)}
                placeholder="Account number"
              />
              <Input
                id="ifscCode"
                label="IFSC Code"
                value={data.bankDetails.ifscCode}
                onChange={(e) => handleBankChange("ifscCode", e.target.value)}
                placeholder="IFSC code"
              />
            </div>
            <Input
              id="branch"
              label="Branch"
              value={data.bankDetails.branch}
              onChange={(e) => handleBankChange("branch", e.target.value)}
              placeholder="Branch name"
            />
          </div>
        </div>

        {/* Signature */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Signature</h2>
          </div>
          <div className="px-6 py-4">
            <Input
              id="signature"
              label="Authorized Signature"
              value={data.signature}
              onChange={(e) => setData({ ...data, signature: e.target.value })}
              placeholder="Authorized signatory name"
            />
            <p className="mt-1 text-xs text-gray-500">
              This name will appear on invoices as the authorized signatory.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
