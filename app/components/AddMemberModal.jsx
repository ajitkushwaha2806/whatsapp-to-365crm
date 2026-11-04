"use client";

import React, { useState, useEffect } from "react";
import { User, Phone, Lock, Eye, EyeOff, ShieldCheck, X } from "lucide-react";

export default function AddMemberModal({
  isOpen,
  onClose,
  onAddMember,
  editingMember = null,
  sheetName = "this sheet",
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (editingMember) {
      setName(typeof editingMember === "string" ? editingMember : editingMember.name || "");
      setPhone(typeof editingMember === "object" ? editingMember.phone || "" : "");
      setPassword(typeof editingMember === "object" ? editingMember.password || "" : "");
      setIsActive(
        typeof editingMember === "object"
          ? editingMember.isActive !== undefined
            ? Boolean(editingMember.isActive)
            : editingMember.status !== "inactive"
          : true
      );
    } else {
      setName("");
      setPhone("");
      setPassword("");
      setIsActive(true);
      setShowPassword(false);
    }
  }, [editingMember, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const memberPayload = {
      id: editingMember?.id || `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      phone: phone.trim(),
      password: password.trim(),
      isActive: Boolean(isActive),
      status: isActive ? "active" : "inactive",
    };

    onAddMember(memberPayload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-md w-full max-w-md p-5 space-y-4 shadow-xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-[#DE5437]" />
              <span>{editingMember ? "Edit Staff Member" : "Add Staff Member"}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Google Sheet: <strong className="text-slate-700">{sheetName}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* 1. Name */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Staff Member Name <span className="text-red-500">*</span>:
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                required
                autoFocus
                className="w-full h-9 bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#DE5437] shadow-2xs"
              />
            </div>
          </div>

          {/* 2. Phone Number */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Phone Number:
            </label>
            <div className="relative flex items-center">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full h-9 bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#DE5437] shadow-2xs"
              />
            </div>
          </div>

          {/* 3. Password */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Access Password:
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Staff login password"
                className="w-full h-9 bg-slate-50 border border-slate-200 rounded-md pl-9 pr-9 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#DE5437] shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* 4. Active / Inactive Status */}
          <div className="pt-1">
            <label className="text-[11px] font-bold text-slate-700 block mb-1.5">
              Account Status:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsActive(true)}
                className={`py-2 px-3 rounded-md text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  isActive
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs ring-1 ring-emerald-500/20"
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
                <span>Active</span>
              </button>

              <button
                type="button"
                onClick={() => setIsActive(false)}
                className={`py-2 px-3 rounded-md text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  !isActive
                    ? "bg-slate-100 border-slate-400 text-slate-800 shadow-2xs ring-1 ring-slate-400/20"
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${!isActive ? "bg-slate-500" : "bg-slate-300"}`} />
                <span>Inactive</span>
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#DE5437] hover:bg-[#c44328] text-white font-bold rounded-md text-xs shadow-xs transition-colors cursor-pointer"
            >
              {editingMember ? "Save Changes" : "Add to Sheet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
