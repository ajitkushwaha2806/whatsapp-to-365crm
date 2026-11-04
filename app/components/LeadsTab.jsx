"use client";

import React from "react";
import {
  Settings,
  Phone,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  X,
  Zap,
  Loader2,
  FileSpreadsheet,
  Building2,
  ArrowRight,
  ChevronDown,
  Pencil,
} from "lucide-react";

export default function LeadsTab({
  leads = [],
  activeSheet,
  activeWorkspace,
  sheets = [],
  activeSheetId,
  onSheetChange,
  onUpdateFieldValue,
  onRemoveLead,
  onClearLeads,
  onOpenAddLead,
  onAutoSubmit,
  isSubmitting,
  submitProgress,
  leadStatuses = {},
  onOpenEditSheet,
  onOpenAddSheet,
  onNavigateTab,
  onUpdateLead,
  isStaff = false,
}) {
  const crm = activeWorkspace?.integrations?.crm365;
  const isCrmConnected = Boolean(
    crm && (crm.apiKey || crm.status === "connected" || crm.isEnabled !== false) &&
    crm.isEnabled !== false
  );
  const isSheetConnected = Boolean(activeSheet?.baseUrl || (sheets && sheets.length > 0 && activeSheet));

  return (
    <div className="space-y-4 pb-24 animate-in fade-in duration-200">
      
      {/* 1. Target Destination Banners */}
      
      {/* 365 CRM Connected Banner */}
      {isCrmConnected && (
        <div className="bg-white border border-blue-200/90 rounded-xl p-3.5 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-xs text-slate-900 truncate">
                    365 CRM Connected
                  </h2>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                  Label: <span className="font-semibold text-slate-700">{crm.label || "WhatsApp Lead"}</span> • Direct API Sync
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Sheets Connected Banner */}
      {isSheetConnected && (
        <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200/60 flex items-center justify-center text-[#DE5437] shrink-0">
                <FileSpreadsheet className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {sheets.length > 1 ? (
                    <div className="relative inline-block max-w-[180px]">
                      <select
                        value={activeSheetId || activeSheet?.id}
                        onChange={(e) => onSheetChange && onSheetChange(e.target.value)}
                        className="font-bold text-xs text-slate-900 bg-transparent border-b border-dashed border-slate-300 pr-5 truncate cursor-pointer focus:outline-hidden"
                      >
                        {sheets.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name || s.sheetName}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  ) : (
                    <h2 className="font-bold text-xs text-slate-900 truncate">
                      {activeSheet?.name || "Connected Sheet"}
                    </h2>
                  )}
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                    Google Sheet
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                  {activeSheet?.fields?.length || 0} form question{activeSheet?.fields?.length === 1 ? "" : "s"} configured
                </p>
              </div>
            </div>

            {onOpenEditSheet && !isStaff && (
              <button
                type="button"
                onClick={() => onOpenEditSheet(activeSheet)}
                className="text-xs font-semibold text-[#DE5437] hover:text-[#b93b22] bg-orange-50 hover:bg-orange-100 px-2.5 py-1.5 rounded-lg border border-orange-200/70 transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Edit Form</span>
              </button>
            )}
          </div>

          {activeSheet?.leadEntryKey && (
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 text-[11px]">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>Lead Phone Field:</span>
              </span>
              <code className="font-mono font-bold text-[#DE5437] bg-white border border-slate-200 px-2 py-0.5 rounded">
                {activeSheet.leadEntryKey}
              </code>
            </div>
          )}
        </div>
      )}

      {/* Neither connected */}
      {!isCrmConnected && !isSheetConnected && (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-4 text-center space-y-2 shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-orange-50 text-[#DE5437] flex items-center justify-center mx-auto">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">No Destination Connected</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Connect 365 CRM or a Google Sheet to start syncing WhatsApp leads.
            </p>
          </div>
          {onNavigateTab && !isStaff && (
            <button
              type="button"
              onClick={() => onNavigateTab("integrations")}
              className="px-3 py-1.5 bg-[#DE5437] hover:bg-[#c44328] text-white font-bold text-xs rounded-lg shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer mt-1"
            >
              <span>Connect 365 CRM or Sheet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 2. Form Dropdown Choices (if active sheet has questions) */}
      {activeSheet && activeSheet.fields && activeSheet.fields.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Form Dropdown Choices
          </span>

          <div className="space-y-3">
            {activeSheet.fields.map((field) => {
              const currentVal =
                activeSheet.selectedValues?.[field.id] || field.defaultValue || field.options[0] || "";

              return (
                <div key={field.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span className="truncate" title={field.label}>
                      {field.label}:
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">#{field.id}</span>
                  </div>

                  {field.options && field.options.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {field.options.map((opt) => {
                        const isSelected = currentVal === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => onUpdateFieldValue(field.id, opt)}
                            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#DE5437] text-white shadow-xs font-bold"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={currentVal}
                      onChange={(e) => onUpdateFieldValue(field.id, e.target.value)}
                      placeholder={`Enter ${field.label}`}
                      className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-[#DE5437]"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Captured WhatsApp Leads List */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Queued Leads
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#DE5437] font-bold text-[10px]">
              {leads.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onOpenAddLead}
              className="text-xs font-semibold text-[#DE5437] hover:text-[#b93b22] bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg border border-orange-200/70 transition-colors cursor-pointer"
            >
              + Add Lead
            </button>
            {leads.length > 0 && (
              <button
                type="button"
                onClick={onClearLeads}
                className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200 transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Real-time Rate Limited Progress Bar */}
        {isSubmitting && leads.length > 0 && (
          <div className="bg-orange-50 border border-orange-200/90 rounded-xl p-3 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#DE5437]" />
                <span>Posting 1 lead at a time (rate-limited)...</span>
              </span>
              <span className="font-mono font-bold text-[#DE5437] text-[11px]">
                {submitProgress} / {leads.length} ({Math.round(((submitProgress) / leads.length) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-orange-200/60 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#DE5437] h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.round(((submitProgress) / leads.length) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {leads.length === 0 ? (
          <div className="text-center py-8 text-slate-400 space-y-1.5">
            <MessageSquare className="w-7 h-7 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">No leads queued yet</p>
            <p className="text-[11px]">Select chats on WhatsApp Web or click "+ Add Lead" above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leads.map((lead, idx) => {
              const status = leadStatuses[lead];

              return (
                <div
                  key={idx}
                  className="p-3 bg-slate-50/80 border border-slate-200/70 rounded-lg flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#DE5437] font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                      {lead.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      {lead.includes("•") ? (
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-800 truncate block">
                            {lead.split("•")[0].trim()}
                          </span>
                          <span className="text-[11px] font-mono text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                            <span>📱</span>
                            <span>{lead.split("•")[1].trim()}</span>
                          </span>
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-800 truncate block">
                            {lead}
                          </span>
                          {!/^\+?[0-9]{7,15}$/.test(lead.replace(/[\s-]/g, "")) && !status && (
                            <span className="text-[10px] text-amber-600 font-medium block mt-0.5">
                              ⚠️ No mobile number (click ✏️ to add)
                            </span>
                          )}
                        </div>
                      )}
                      {status && (
                        <div className="flex flex-col mt-0.5">
                          {status === "done" || status?.status === "done" ? (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>Synced</span>
                            </span>
                          ) : status === "filling" || status?.status === "filling" ? (
                            <span className="text-[10px] font-medium text-amber-600 flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin text-amber-600 shrink-0" />
                              <span>Syncing...</span>
                            </span>
                          ) : (
                            <div className="space-y-0.5 mt-0.5 max-w-[220px]">
                              <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                                <span>Failed</span>
                              </span>
                              <p className="text-[10px] text-red-600 bg-red-50/90 border border-red-200/60 rounded px-1.5 py-0.5 font-medium leading-tight break-words">
                                {status?.error || status?.message || (typeof status === "string" && status !== "error" ? status : "Please enter a valid mobile number")}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {onUpdateLead && (
                      <button
                        type="button"
                        onClick={() => {
                          const currentMobile = lead.match(/\+?[0-9]{7,15}/)?.[0] || "";
                          const updated = prompt(
                            `Edit lead for 365 CRM:\n(Enter valid mobile number for "${lead}")`,
                            currentMobile || lead
                          );
                          if (updated && updated.trim()) {
                            onUpdateLead(lead, updated.trim());
                          }
                        }}
                        className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit lead / phone number"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveLead(lead)}
                      className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove lead"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Action Button */}
      {leads.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onAutoSubmit}
            disabled={isSubmitting}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isSubmitting
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-[#DE5437] hover:bg-[#c44328] active:scale-[0.99] shadow-orange-500/25"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  Syncing ({submitProgress} of {leads.length})...
                </span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>
                  {isCrmConnected && isSheetConnected
                    ? `Sync ${leads.length} Leads to 365 CRM & Sheet`
                    : isCrmConnected
                    ? `Sync ${leads.length} Leads to 365 CRM`
                    : isSheetConnected
                    ? `Auto-Submit ${leads.length} Leads to Sheet`
                    : `Sync ${leads.length} Leads`}
                </span>
              </>
            )}
          </button>
        </div>
      )}

    </div>
  );
}
