"use client";

import { useState } from "react";
import Button from "./Button";

interface PrintCopiesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: (copies: number) => void;
}

export default function PrintCopiesDialog({ isOpen, onClose, onPrint }: PrintCopiesDialogProps) {
  const [copies, setCopies] = useState(1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">Print Invoice</h3>
        <p className="mt-1 text-sm text-gray-600">How many copies do you want to print?</p>

        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            onClick={() => setCopies(Math.max(1, copies - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-lg font-bold text-gray-700 hover:bg-gray-50"
          >
            -
          </button>
          <input
            type="number"
            min={1}
            max={20}
            value={copies}
            onChange={(e) => {
              const v = parseInt(e.target.value) || 1;
              setCopies(Math.max(1, Math.min(20, v)));
            }}
            className="h-10 w-20 rounded-lg border border-gray-300 text-center text-lg font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setCopies(Math.min(20, copies + 1))}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 text-lg font-bold text-gray-700 hover:bg-gray-50"
          >
            +
          </button>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={() => { onPrint(copies); onClose(); }}>
            Print {copies} {copies === 1 ? "Copy" : "Copies"}
          </Button>
        </div>
      </div>
    </div>
  );
}
