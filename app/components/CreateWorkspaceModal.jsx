"use client";

import React, { useState } from "react";
import { X, Building2, Plus, Sparkles, Loader2 } from "lucide-react";

export default function CreateWorkspaceModal({
  isOpen,
  onClose,
  onCreateWorkspace,
}) {
  const [workspaceName, setWorkspaceName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = workspaceName.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      await onCreateWorkspace(trimmed);
      setWorkspaceName("");
      onClose();
    } catch (err) {
      alert("Failed to create workspace: " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#DE5437]">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Create New Workspace</h3>
              <p className="text-[11px] text-slate-500">Set up a space for your staff &amp; integrations</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5">
              Workspace Name <span className="text-red-500">*</span>:
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="e.g. Sales Team, Dubai Office, Main HQ"
              required
              autoFocus
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#DE5437] shadow-2xs transition-all placeholder:font-normal placeholder:text-slate-400"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              A unique Workspace ID (<span className="font-mono text-slate-600 font-bold">WS-XXXX</span>) will be assigned automatically.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !workspaceName.trim()}
              className="px-4 py-2 bg-[#DE5437] hover:bg-[#c9452b] active:scale-[0.98] text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Workspace</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

