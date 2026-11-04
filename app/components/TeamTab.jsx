"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Users,
  Plus,
  Trash2,
  Edit2,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Hash,
} from "lucide-react";
import { formatSheetId } from "../helpers/formUrl";

export default function TeamTab({
  activeSheet,
  teamMembers = [],
  onOpenAddMember,
  onEditMember,
  onToggleStatus,
  onDeleteMember,
}) {
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const togglePasswordReveal = (id) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopy = (id, text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sheetIdCode = activeSheet ? formatSheetId(activeSheet) : "";

  return (
    <div className="w-full min-w-0 space-y-3 sm:space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Workspace Staff Header */}
      <div className="bg-white border border-slate-200 rounded-md p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-md bg-orange-50 border border-orange-200/80 flex items-center justify-center text-[#DE5437] shrink-0 mt-0.5 sm:mt-0">
              <Users className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  Workspace Staff &amp; Team
                </h2>
                <span className="text-[9px] font-bold bg-orange-50 border border-orange-200 text-[#DE5437] px-1.5 py-0.2 rounded-md shrink-0">
                  Workspace
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                Staff members added to this workspace can log in to capture WhatsApp leads and push to connected Google Sheets or 365 CRM.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {sheetIdCode && (
              <button
                type="button"
                onClick={() => handleCopy("sheet_code", sheetIdCode)}
                className="text-[10px] sm:text-[11px] font-bold px-2 py-1.5 rounded-md bg-orange-50 hover:bg-orange-100 text-[#DE5437] border border-orange-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Click to copy Workspace ID for staff login"
              >
                <Hash className="w-3 h-3 text-[#DE5437]" />
                <span>
                  Workspace ID: <strong>{sheetIdCode}</strong>
                </span>
                {copiedId === "sheet_code" ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3 text-orange-400" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onOpenAddMember}
              className="px-3.5 py-1.5 bg-[#DE5437] hover:bg-[#c44328] active:scale-95 text-white font-bold rounded-md text-xs inline-flex items-center justify-center gap-1.5 shadow-xs shadow-orange-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff Member</span>
            </button>
          </div>
        </div>
      </div>

      {/* Staff List for this Workspace */}
      <div className="bg-white border border-slate-200 rounded-md p-3.5 sm:p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-500" />
            <span>Workspace Staff ({teamMembers.length})</span>
          </span>
          <span className="text-[11px] text-slate-400">
            {teamMembers.length === 0 ? "No staff assigned" : "Sheet Staff"}
          </span>
        </div>

        {teamMembers.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-md flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800">No staff members assigned to this sheet</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto">
                Each sheet has its own staff with individual name, phone number, password, and active status.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAddMember}
              className="px-4 py-2 bg-[#DE5437] hover:bg-[#c44328] text-white font-bold rounded-md text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Staff Member</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {teamMembers.map((item, idx) => {
              const member =
                typeof item === "string"
                  ? { id: `m_${idx}`, name: item, phone: "", password: "", isActive: true, status: "active" }
                  : item;

              const memberId = member.id || `m_${idx}`;
              const isMemberActive =
                member.isActive !== undefined ? Boolean(member.isActive) : member.status !== "inactive";
              const isPasswordRevealed = Boolean(revealedPasswords[memberId]);

              return (
                <div
                  key={memberId}
                  className={`border rounded-md p-4 transition-all space-y-3 relative ${
                    isMemberActive
                      ? "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                      : "bg-slate-50/70 border-slate-200/60 opacity-80"
                  }`}
                >
                  {/* Top Row: Name + Status Badge + Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-md bg-orange-50 border border-orange-200 text-[#DE5437] font-bold text-xs flex items-center justify-center shrink-0">
                        {member.name ? member.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{member.name}</h4>
                        {/* Interactive Status Toggle Badge */}
                        <button
                          type="button"
                          onClick={() => onToggleStatus && onToggleStatus(member)}
                          className={`mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 transition-colors cursor-pointer ${
                            isMemberActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100"
                              : "bg-slate-200/80 text-slate-600 border border-slate-300 hover:bg-slate-300"
                          }`}
                          title="Click to toggle Active/Inactive"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isMemberActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`}
                          />
                          <span>{isMemberActive ? "Active" : "Inactive"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {onEditMember && (
                        <button
                          type="button"
                          onClick={() => onEditMember(member)}
                          className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-md transition-colors cursor-pointer"
                          title="Edit Staff Member"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteMember(member)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors cursor-pointer"
                        title={`Remove ${member.name} from this sheet`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Details Card (Phone & Password) */}
                  <div className="bg-slate-50 border border-slate-200/70 rounded-md p-2.5 space-y-2 text-xs">
                    {/* Phone Number */}
                    <div className="flex items-center justify-between gap-2 text-slate-600">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium truncate">
                          {member.phone ? member.phone : <span className="text-slate-400 italic">No phone</span>}
                        </span>
                      </div>
                      {member.phone && (
                        <button
                          type="button"
                          onClick={() => handleCopy(`p_${memberId}`, member.phone)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                          title="Copy Phone Number"
                        >
                          {copiedId === `p_${memberId}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Password */}
                    <div className="flex items-center justify-between gap-2 text-slate-600 pt-1 border-t border-slate-200/50">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-[11px] truncate">
                          {member.password ? (
                            isPasswordRevealed ? (
                              member.password
                            ) : (
                              "••••••••"
                            )
                          ) : (
                            <span className="text-slate-400 italic">No password</span>
                          )}
                        </span>
                      </div>
                      {member.password && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => togglePasswordReveal(memberId)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                            title={isPasswordRevealed ? "Hide password" : "Show password"}
                          >
                            {isPasswordRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(`pw_${memberId}`, member.password)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                            title="Copy Password"
                          >
                            {copiedId === `pw_${memberId}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
