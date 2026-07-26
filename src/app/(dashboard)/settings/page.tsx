"use client";

import { useEffect, useRef, useState } from "react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface PrinterSettings {
  pageSize: string;
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
  showHeader: boolean;
  showFooter: boolean;
  printCopies: number;
}

interface SettingsData {
  invoicePrefix: string;
  currency: string;
  currencySymbol: string;
  theme: "light" | "dark" | "system";
  printerSettings: PrinterSettings;
}

const currencies = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
];

const pageSizes = ["A4", "A5", "Letter", "Legal"];

const emptyPrinter: PrinterSettings = {
  pageSize: "A4",
  marginTop: "10mm",
  marginBottom: "10mm",
  marginLeft: "10mm",
  marginRight: "10mm",
  showHeader: true,
  showFooter: true,
  printCopies: 1,
};

const emptySettings: SettingsData = {
  invoicePrefix: "INV",
  currency: "INR",
  currencySymbol: "₹",
  theme: "light",
  printerSettings: emptyPrinter,
};

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const fetchedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const result = await res.json();
        const s = result.settings;
        setData({
          invoicePrefix: s.invoicePrefix || "INV",
          currency: s.currency || "INR",
          currencySymbol: s.currencySymbol || "₹",
          theme: s.theme || "light",
          printerSettings: {
            pageSize: s.printerSettings?.pageSize || "A4",
            marginTop: s.printerSettings?.marginTop || "10mm",
            marginBottom: s.printerSettings?.marginBottom || "10mm",
            marginLeft: s.printerSettings?.marginLeft || "10mm",
            marginRight: s.printerSettings?.marginRight || "10mm",
            showHeader: s.printerSettings?.showHeader ?? true,
            showFooter: s.printerSettings?.showFooter ?? true,
            printCopies: s.printerSettings?.printCopies || 1,
          },
        });
      }
    } catch {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const result = await res.json();
        setError(result.error || "Failed to save settings");
      } else {
        setMessage("Settings saved successfully!");
      }
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    setBacking(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/settings/backup");
      if (!res.ok) throw new Error("Backup failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage("Backup downloaded successfully!");
    } catch {
      setError("Failed to create backup");
    } finally {
      setBacking(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile || !confirmRestore) return;
    setRestoring(true);
    setError("");
    setMessage("");

    try {
      const text = await restoreFile.text();
      const backup = JSON.parse(text);

      if (!backup.data) {
        setError("Invalid backup file format");
        setRestoring(false);
        return;
      }

      const res = await fetch("/api/settings/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backup),
      });

      if (!res.ok) {
        const result = await res.json();
        setError(result.error || "Restore failed");
      } else {
        setMessage("Data restored successfully! Reloading...");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch {
      setError("Failed to restore data. The file may be corrupted.");
    } finally {
      setRestoring(false);
      setConfirmRestore(false);
      setRestoreFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure your invoice and application preferences.
        </p>
      </div>

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

      <form onSubmit={handleSave} className="space-y-6">
        {/* Invoice Prefix */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Invoice Prefix</h2>
            <p className="mt-1 text-sm text-gray-500">
              Customize the prefix used for invoice numbers (e.g., INV, BILL, ORD).
            </p>
          </div>
          <div className="px-6 py-4">
            <Input
              id="invoicePrefix"
              label="Invoice Prefix"
              value={data.invoicePrefix}
              onChange={(e) =>
                setData({ ...data, invoicePrefix: e.target.value.toUpperCase() })
              }
              placeholder="INV"
            />
            <p className="mt-2 text-xs text-gray-500">
              Preview: <span className="font-mono font-medium">{data.invoicePrefix}-0001</span>
            </p>
          </div>
        </div>

        {/* Currency */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Currency</h2>
            <p className="mt-1 text-sm text-gray-500">
              Select the currency used for invoices.
            </p>
          </div>
          <div className="space-y-4 px-6 py-4">
            <div>
              <label
                htmlFor="currency"
                className="block text-sm font-medium text-gray-700"
              >
                Currency
              </label>
              <select
                id="currency"
                value={data.currency}
                onChange={(e) => {
                  const code = e.target.value;
                  const curr = currencies.find((c) => c.code === code);
                  setData({
                    ...data,
                    currency: code,
                    currencySymbol: curr?.symbol || "",
                  });
                }}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
            <Input
              id="currencySymbol"
              label="Currency Symbol"
              value={data.currencySymbol}
              onChange={(e) =>
                setData({ ...data, currencySymbol: e.target.value })
              }
              placeholder="₹"
            />
            <p className="text-xs text-gray-500">
              Preview: <span className="font-medium">{data.currencySymbol}1,000.00</span> ({data.currency})
            </p>
          </div>
        </div>

        {/* Theme */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Theme</h2>
            <p className="mt-1 text-sm text-gray-500">
              Choose your preferred appearance.
            </p>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-3 gap-3">
              {(["light", "dark", "system"] as const).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => setData({ ...data, theme })}
                  className={`rounded-lg border-2 p-4 text-center transition-colors ${
                    data.theme === theme
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    {theme === "light" && (
                      <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    )}
                    {theme === "dark" && (
                      <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )}
                    {theme === "system" && (
                      <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium capitalize">{theme}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Printer Settings */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Printer Settings</h2>
            <p className="mt-1 text-sm text-gray-500">
              Configure how invoices are printed.
            </p>
          </div>
          <div className="space-y-4 px-6 py-4">
            <div>
              <label
                htmlFor="pageSize"
                className="block text-sm font-medium text-gray-700"
              >
                Page Size
              </label>
              <select
                id="pageSize"
                value={data.printerSettings.pageSize}
                onChange={(e) =>
                  setData({
                    ...data,
                    printerSettings: {
                      ...data.printerSettings,
                      pageSize: e.target.value,
                    },
                  })
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              >
                {pageSizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="marginTop"
                label="Top Margin"
                value={data.printerSettings.marginTop}
                onChange={(e) =>
                  setData({
                    ...data,
                    printerSettings: {
                      ...data.printerSettings,
                      marginTop: e.target.value,
                    },
                  })
                }
                placeholder="10mm"
              />
              <Input
                id="marginBottom"
                label="Bottom Margin"
                value={data.printerSettings.marginBottom}
                onChange={(e) =>
                  setData({
                    ...data,
                    printerSettings: {
                      ...data.printerSettings,
                      marginBottom: e.target.value,
                    },
                  })
                }
                placeholder="10mm"
              />
              <Input
                id="marginLeft"
                label="Left Margin"
                value={data.printerSettings.marginLeft}
                onChange={(e) =>
                  setData({
                    ...data,
                    printerSettings: {
                      ...data.printerSettings,
                      marginLeft: e.target.value,
                    },
                  })
                }
                placeholder="10mm"
              />
              <Input
                id="marginRight"
                label="Right Margin"
                value={data.printerSettings.marginRight}
                onChange={(e) =>
                  setData({
                    ...data,
                    printerSettings: {
                      ...data.printerSettings,
                      marginRight: e.target.value,
                    },
                  })
                }
                placeholder="10mm"
              />
            </div>

            <Input
              id="printCopies"
              label="Number of Copies"
              type="number"
              value={String(data.printerSettings.printCopies)}
              onChange={(e) =>
                setData({
                  ...data,
                  printerSettings: {
                    ...data.printerSettings,
                    printCopies: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)),
                  },
                })
              }
              placeholder="1"
            />

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.printerSettings.showHeader}
                  onChange={(e) =>
                    setData({
                      ...data,
                      printerSettings: {
                        ...data.printerSettings,
                        showHeader: e.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show header on print</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.printerSettings.showFooter}
                  onChange={(e) =>
                    setData({
                      ...data,
                      printerSettings: {
                        ...data.printerSettings,
                        showFooter: e.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show footer on print</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Save Settings
          </Button>
        </div>
      </form>

      {/* Backup & Restore */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Backup & Restore</h2>
          <p className="mt-1 text-sm text-gray-500">
            Export or import your invoices, customers, products, and settings.
          </p>
        </div>
        <div className="space-y-4 px-6 py-4">
          {/* Backup */}
          <div>
            <h3 className="text-sm font-medium text-gray-900">Export Data</h3>
            <p className="mt-1 text-xs text-gray-500">
              Download all your data as a JSON backup file.
            </p>
            <div className="mt-3">
              <Button
                type="button"
                variant="secondary"
                loading={backing}
                onClick={handleBackup}
              >
                <svg className="mr-2 inline h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Backup
              </Button>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Restore */}
          <div>
            <h3 className="text-sm font-medium text-gray-900">Import Data</h3>
            <p className="mt-1 text-xs text-gray-500">
              Restore data from a backup file. This will replace all existing data.
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setRestoreFile(file);
                      setConfirmRestore(false);
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {restoreFile && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={confirmRestore}
                      onChange={(e) => setConfirmRestore(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">
                      I understand this will replace all current data
                    </span>
                  </label>
                </div>
              )}

              <Button
                type="button"
                variant="danger"
                loading={restoring}
                onClick={handleRestore}
                disabled={!restoreFile || !confirmRestore}
              >
                <svg className="mr-2 inline h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Restore Data
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
