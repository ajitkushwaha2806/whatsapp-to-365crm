"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Users,
  Lock,
  Eye,
  EyeOff,
  Phone,
  Mail,
  User,
  Building2,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { loginAdmin, registerAdmin, loginStaff } from "@/lib/api/auth";

export default function StaffLoginView({ onLoginSuccess, onAdminLogin }) {
  // Role selector: "admin" | "staff"
  const [role, setRole] = useState("admin");

  // Admin Mode: "login" | "register"
  const [adminMode, setAdminMode] = useState("login");
  const [adminName, setAdminName] = useState("");
  const [adminCompanyName, setAdminCompanyName] = useState("");
  const [adminIdentifier, setAdminIdentifier] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Staff Form State
  const [workspaceId, setWorkspaceId] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [showStaffPassword, setShowStaffPassword] = useState(false);

  // Shared UI states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Pre-fill last used workspace ID
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["lastWorkspaceId", "lastSheetId"], (res) => {
        if (res.lastWorkspaceId) setWorkspaceId(res.lastWorkspaceId);
        else if (res.lastSheetId) setWorkspaceId(res.lastSheetId);
      });
    } else if (typeof window !== "undefined") {
      const saved =
        localStorage.getItem("lastWorkspaceId") ||
        localStorage.getItem("lastSheetId");
      if (saved) setWorkspaceId(saved);
    }
  }, []);

  const clearMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  // --- Handle Admin Submit ---
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    const trimmedIdentifier = adminIdentifier.trim();
    const trimmedPw = adminPassword.trim();

    if (!trimmedIdentifier) {
      setErrorMsg("Please enter your registered phone number.");
      return;
    }

    if (!trimmedPw) {
      setErrorMsg("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      if (adminMode === "register") {
        const trimmedName = adminName.trim();
        const trimmedCompany = adminCompanyName.trim();
        if (!trimmedName) {
          setErrorMsg("Please enter your full name.");
          setIsLoading(false);
          return;
        }
        if (!trimmedCompany) {
          setErrorMsg("Please enter your Company / Business name.");
          setIsLoading(false);
          return;
        }

        const res = await registerAdmin({
          name: trimmedName,
          companyName: trimmedCompany,
          identifier: trimmedIdentifier,
          password: trimmedPw,
        });

        if (res && res.success && res.user) {
          setSuccessMsg(`Welcome, ${trimmedName}! Default workspace "${trimmedCompany}" created.`);
          setTimeout(() => {
            if (onAdminLogin) onAdminLogin(res.user, res.workspace);
          }, 600);
        } else {
          setErrorMsg(res?.error || "Registration failed.");
        }
      } else {
        const res = await loginAdmin({
          identifier: trimmedIdentifier,
          password: trimmedPw,
        });

        if (res && res.success && res.user) {
          if (onAdminLogin) {
            onAdminLogin(res.user, res.workspace);
          }
        } else {
          setErrorMsg(res?.error || "Invalid admin credentials.");
        }
      }
    } catch (err) {
      console.error("Admin auth failed:", err);
      setErrorMsg(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };


  // --- Handle Staff Submit ---
  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    const trimmedWs = workspaceId.trim();
    const trimmedPhone = staffPhone.trim();
    const trimmedPw = staffPassword.trim();

    if (!trimmedPhone) {
      setErrorMsg("Please enter your registered phone number.");
      return;
    }

    if (!trimmedPw) {
      setErrorMsg("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await loginStaff({
        workspaceId: trimmedWs,
        phone: trimmedPhone,
        password: trimmedPw,
      });

      if (res && res.success && res.user) {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ lastWorkspaceId: trimmedWs });
        } else if (typeof window !== "undefined") {
          localStorage.setItem("lastWorkspaceId", trimmedWs);
        }

        if (onLoginSuccess) {
          onLoginSuccess(res.user, res.accessibleSheets || [], res.workspace);
        }
      } else {
        setErrorMsg(res?.error || "Invalid staff credentials.");
      }
    } catch (err) {
      console.error("Staff login failed:", err);
      setErrorMsg(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/80 flex flex-col justify-center items-center p-3 sm:p-4 selection:bg-orange-100 selection:text-orange-900 font-sans">
      <div className="w-full max-w-[390px] bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xl shadow-slate-200/50 space-y-4 transition-all">
        
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl mx-auto overflow-hidden shadow-md shadow-orange-500/15 flex items-center justify-center bg-white border border-slate-100">
            <img src="/icon128.png" alt="Leadio Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center justify-center gap-1.5">
              <span>Leadio</span>
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-orange-50 text-[#DE5437] border border-orange-200/60 rounded-full uppercase tracking-wider">
                Pro
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              WhatsApp Leads &rarr; 365 CRM &amp; Google Sheets
            </p>
          </div>
        </div>


        {/* 2-Role Tab Selector: Admin vs Staff */}
        <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-xl text-xs font-semibold border border-slate-200/60">
          <button
            type="button"
            onClick={() => {
              setRole("admin");
              clearMessages();
            }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              role === "admin"
                ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200/70"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${role === "admin" ? "text-[#DE5437]" : "text-slate-400"}`} />
            <span>Admin</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRole("staff");
              clearMessages();
            }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              role === "staff"
                ? "bg-white text-slate-900 shadow-xs font-bold border border-slate-200/70"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className={`w-3.5 h-3.5 ${role === "staff" ? "text-[#DE5437]" : "text-slate-400"}`} />
            <span>Staff Portal</span>
          </button>
        </div>

        {/* Feedback Alert Messages */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 flex items-start gap-2 text-xs text-red-800 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-tight text-[11px] font-medium">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-start gap-2 text-xs text-emerald-800 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-tight text-[11px] font-medium">{successMsg}</span>
          </div>
        )}

        {/* ---------------- 1. ADMIN AUTHENTICATION ---------------- */}
        {role === "admin" && (
          <div className="space-y-3 pt-0.5 animate-in fade-in duration-150">
            <form onSubmit={handleAdminSubmit} className="space-y-3">
              {/* If in register mode: Name & Company Name */}
              {adminMode === "register" && (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        required
                        autoFocus
                        className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#DE5437] focus:ring-2 focus:ring-[#DE5437]/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-700">
                        Company / Business Name <span className="text-red-500">*</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Default Workspace</span>
                    </div>
                    <div className="relative flex items-center">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        value={adminCompanyName}
                        onChange={(e) => setAdminCompanyName(e.target.value)}
                        placeholder="e.g. Hero Motors, Dubai Office"
                        required
                        className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#DE5437] focus:ring-2 focus:ring-[#DE5437]/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Phone Number */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="tel"
                    value={adminIdentifier}
                    onChange={(e) => setAdminIdentifier(e.target.value)}
                    placeholder="e.g. 9311507651"
                    required
                    autoFocus={adminMode === "login"}
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#DE5437] focus:ring-2 focus:ring-[#DE5437]/20 shadow-2xs transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder={adminMode === "register" ? "Create a secure password" : "Enter admin password"}
                    required
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#DE5437] focus:ring-2 focus:ring-[#DE5437]/20 shadow-2xs transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-[#DE5437] hover:bg-[#c44328] active:scale-[0.99] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm shadow-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{adminMode === "register" ? "Creating account..." : "Signing in..."}</span>
                  </>
                ) : (
                  <>
                    <span>{adminMode === "register" ? "Create Admin Account" : "Sign In as Admin"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Login / Register */}
            <div className="pt-2 text-center border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                {adminMode === "login" ? "Need a new admin account?" : "Already have an account?"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAdminMode(adminMode === "login" ? "register" : "login");
                  clearMessages();
                }}
                className="font-bold text-[#DE5437] hover:text-[#c44328] cursor-pointer text-[11px]"
              >
                {adminMode === "login" ? "Register here" : "Sign in here"}
              </button>
            </div>


          </div>
        )}

        {/* ---------------- 2. STAFF AUTHENTICATION ---------------- */}
        {role === "staff" && (
          <div className="space-y-3.5 pt-0.5 animate-in fade-in duration-150">
            <form onSubmit={handleStaffSubmit} className="space-y-3">
              {/* Workspace ID (Optional) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700">
                    Workspace ID <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">e.g. WS-1001</span>
                </div>
                <div className="relative flex items-center">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={workspaceId}
                    onChange={(e) => setWorkspaceId(e.target.value)}
                    placeholder="WS-XXXX (Leave blank to auto-detect)"
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#DE5437] focus:ring-2 focus:ring-[#DE5437]/20 shadow-2xs uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal transition-all"
                  />
                </div>
              </div>

              {/* Staff Registered Phone */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Registered Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="tel"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    required
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#DE5437] focus:ring-2 focus:ring-[#DE5437]/20 shadow-2xs transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type={showStaffPassword ? "text" : "password"}
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="Enter staff password"
                    required
                    className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#DE5437] focus:ring-2 focus:ring-[#DE5437]/20 shadow-2xs transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStaffPassword(!showStaffPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  >
                    {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-[#DE5437] hover:bg-[#c44328] active:scale-[0.99] disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-sm shadow-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="p-2.5 bg-slate-50/90 border border-slate-200/70 rounded-xl text-[11px] text-slate-500 leading-relaxed text-center">
              <span>Need access? Ask your Workspace Admin to add your phone number in Team Management.</span>
            </div>


          </div>
        )}

      </div>
    </div>
  );
}
