"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { numberToWords, formatCurrency } from "@/lib/utils";

interface Customer {
  _id: string;
  name: string;
  mobile: string;
  email: string;
  gstNumber: string;
  address: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  gstPercent: number;
  unit: string;
}

interface InvoiceItem {
  productName: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  gstPercent: number;
  gstAmount: number;
}

export default function NewInvoicePage() {
  const router = useRouter();

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [status, setStatus] = useState<"draft" | "pending" | "paid">("draft");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState<number | null>(null);

  const [items, setItems] = useState<InvoiceItem[]>([
    { productName: "", description: "", quantity: 1, rate: 0, amount: 0, gstPercent: 0, gstAmount: 0 },
  ]);

  const [discount, setDiscount] = useState("0");
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");

  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    async function init() {
      const d = new Date();
      const today = d.toISOString().split("T")[0];
      setInvoiceDate(today);

      const [numRes, custRes, prodRes] = await Promise.all([
        fetch("/api/invoices/number"),
        fetch("/api/customers"),
        fetch("/api/products"),
      ]);

      if (numRes.ok) {
        const numData = await numRes.json();
        setInvoiceNumber(numData.invoiceNumber);
      }
      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(custData.customers);
      }
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products);
      }
    }

    init();
  }, []);

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch("");
    setShowCustomerDropdown(false);
  };

  const addItem = () => {
    setItems([...items, { productName: "", description: "", quantity: 1, rate: 0, amount: 0, gstPercent: 0, gstAmount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...items];
    const item = { ...updated[index] };

    if (field === "quantity" || field === "rate" || field === "gstPercent") {
      item[field] = typeof value === "string" ? parseFloat(value) || 0 : value;
    } else if (field === "productName" || field === "description") {
      item[field] = String(value);
    }

    item.amount = item.quantity * item.rate;
    item.gstAmount = (item.amount * item.gstPercent) / 100;
    updated[index] = item;
    setItems(updated);
  };

  const selectProduct = (index: number, product: Product) => {
    const updated = [...items];
    const item = { ...updated[index] };
    item.productName = product.name;
    item.description = product.name;
    item.rate = product.price;
    item.gstPercent = product.gstPercent;
    item.amount = item.quantity * item.rate;
    item.gstAmount = (item.amount * item.gstPercent) / 100;
    updated[index] = item;
    setItems(updated);
    setProductSearch("");
    setShowProductDropdown(null);
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const totalGst = items.reduce((sum, item) => sum + item.gstAmount, 0);
  const discountValue = discountType === "percent" ? (subtotal * parseFloat(discount || "0")) / 100 : parseFloat(discount || "0");
  const totalBeforeRound = subtotal + totalGst - discountValue;
  const rounded = Math.round(totalBeforeRound);
  const roundOff = rounded - totalBeforeRound;
  const total = rounded;

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.mobile.includes(customerSearch) ||
      c.email.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredProducts = (search: string) =>
    products.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.unit.toLowerCase().includes(search.toLowerCase())
    );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (!items.some((i) => i.productName || i.description)) {
      setError("Please add at least one item with a product name");
      setSaving(false);
      return;
    }

    const invoiceData = {
      invoiceNumber,
      invoiceDate,
      customerName: selectedCustomer?.name || "",
      customerEmail: selectedCustomer?.email || "",
      customerPhone: selectedCustomer?.mobile || "",
      customerAddress: selectedCustomer?.address || "",
      customerGstNumber: selectedCustomer?.gstNumber || "",
      items,
      subtotal,
      totalGst,
      discount: discountValue,
      discountType,
      roundOff,
      total,
      status,
      notes,
    };

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create invoice");
      } else {
        const data = await res.json();
        router.push(`/invoices/${data.invoice._id}/preview`);
      }
    } catch {
      setError("Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Invoice</h1>
          <p className="mt-1 text-sm text-gray-600">Fill in the details to generate a new invoice.</p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Invoice Header */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              id="invoiceNumber"
              label="Invoice Number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              required
            />
            <Input
              id="invoiceDate"
              label="Invoice Date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "pending" | "paid")}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer Selection */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Customer</h2>
          {selectedCustomer ? (
            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div>
                <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                <p className="text-sm text-gray-600">
                  {selectedCustomer.mobile && selectedCustomer.mobile}
                  {selectedCustomer.mobile && selectedCustomer.email && " · "}
                  {selectedCustomer.email}
                </p>
                {selectedCustomer.gstNumber && (
                  <p className="text-xs text-gray-500">GST: {selectedCustomer.gstNumber}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search customer by name, mobile, or email..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {showCustomerDropdown && customerSearch && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {filteredCustomers.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-gray-500">No customers found</div>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <button
                        key={customer._id}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-gray-50"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          <p className="text-xs text-gray-500">{customer.mobile} {customer.email}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
              {showCustomerDropdown && !customerSearch && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {customers.slice(0, 10).map((customer) => (
                    <button
                      key={customer._id}
                      type="button"
                      onClick={() => selectCustomer(customer)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-xs text-gray-500">{customer.mobile}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Line Items */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Items</h2>
            <Button type="button" variant="ghost" size="sm" onClick={addItem}>
              <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </Button>
          </div>

          <div className="divide-y divide-gray-100">
            {items.map((item, index) => (
              <div key={index} className="px-6 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="mb-2 relative">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Select or type product name..."
                      value={item.productName}
                      onChange={(e) => {
                        updateItem(index, "productName", e.target.value);
                        updateItem(index, "description", e.target.value);
                        setProductSearch(e.target.value);
                        setShowProductDropdown(index);
                      }}
                      onFocus={() => { setProductSearch(""); setShowProductDropdown(index); }}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {showProductDropdown === index && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                      {filteredProducts(productSearch).length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500">No products found</div>
                      ) : (
                        filteredProducts(productSearch).slice(0, 10).map((product) => (
                          <button
                            key={product._id}
                            type="button"
                            onClick={() => selectProduct(index, product)}
                            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-gray-50"
                          >
                            <div>
                              <p className="font-medium text-gray-900">{product.name}</p>
                              <p className="text-xs text-gray-500">{formatCurrency(product.price)} / {product.unit} · GST: {product.gstPercent}%</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <Input
                    id={`qty-${index}`}
                    label="Qty"
                    type="number"
                    min="1"
                    value={item.quantity.toString()}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                  />
                  <Input
                    id={`rate-${index}`}
                    label="Rate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.rate.toString()}
                    onChange={(e) => updateItem(index, "rate", e.target.value)}
                  />
                  <Input
                    id={`gst-${index}`}
                    label="GST %"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={item.gstPercent.toString()}
                    onChange={(e) => updateItem(index, "gstPercent", e.target.value)}
                  />
                  <div className="flex items-end">
                    <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                      <p className="text-xs text-gray-500">Amount</p>
                      <p className="font-medium text-gray-900">{formatCurrency(item.amount)}</p>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                      <p className="text-xs text-gray-500">GST</p>
                      <p className="font-medium text-gray-900">{formatCurrency(item.gstAmount)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Notes */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">Notes</h2>
            <textarea
              rows={4}
              placeholder="Additional notes or terms..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">GST</span>
                <span className="font-medium text-gray-900">{formatCurrency(totalGst)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Discount</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "fixed" | "percent")}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fixed">$</option>
                  <option value="percent">%</option>
                </select>
                <span className="ml-auto text-sm font-medium text-red-600">-{formatCurrency(discountValue)}</span>
              </div>
              {roundOff !== 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Round Off</span>
                  <span className={`font-medium ${roundOff >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {roundOff >= 0 ? "+" : ""}{formatCurrency(roundOff)}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-base font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(total)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 italic">{numberToWords(total)}</p>
            </div>

            <div className="mt-6 flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => { setStatus("draft"); }}>
                Save as Draft
              </Button>
              <Button type="submit" className="flex-1" loading={saving}>
                Create Invoice
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
