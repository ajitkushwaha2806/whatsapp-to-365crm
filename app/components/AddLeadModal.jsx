"use client";

import React, { useState } from "react";

export default function AddLeadModal({ isOpen, onClose, onAddLead }) {
  const [lead, setLead] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!lead.trim()) return;
    onAddLead(lead.trim());
    setLead("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xs p-5 space-y-4 shadow-xl">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Add Lead Manually</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Enter contact phone or name to queue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={lead}
            onChange={(e) => setLead(e.target.value)}
            placeholder="e.g. 9876543210"
            autoFocus
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-900 outline-none focus:bg-white focus:border-emerald-600 shadow-2xs"
          />

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs"
            >
              Add to Queue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

