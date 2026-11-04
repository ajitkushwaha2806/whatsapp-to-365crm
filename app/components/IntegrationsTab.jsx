"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Building2,
  Plug,
  Plus,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Settings,
  Trash2,
  Loader2,
  Save,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Tag,
  MessageSquare,
  Globe,
  RefreshCw,
  ShieldCheck,
  Layers,
} from "lucide-react";

export default function IntegrationsTab({
  workspace,
  googleSheets = [],
  crmConfig = {},
  onOpenAddSheet,
  onEditSheet,
  onDeleteSheet,
  onSaveCRM,
  onTestCRM,
}) {
  const [selectedIntegration, setSelectedIntegration] = useState("all"); // "all" | "sheets" | "365crm"

  // 365 CRM State
  const [crmEnabled, setCrmEnabled] = useState(Boolean(crmConfig?.isEnabled));
  const [apiKey, setApiKey] = useState(crmConfig?.apiKey || "");
  const [label, setLabel] = useState(crmConfig?.label || "WhatsApp Lead");
  const [defaultComment, setDefaultComment] = useState(
    crmConfig?.defaultComment || "Lead captured via Leadio WhatsApp Extension"
  );
  const [showApiKey, setShowApiKey] = useState(false);

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message?: string, error?: string }
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (crmConfig) {
      setCrmEnabled(Boolean(crmConfig.isEnabled));
      setApiKey(crmConfig.apiKey || "");
      setLabel(crmConfig.label || "WhatsApp Lead");
      setDefaultComment(
        crmConfig.defaultComment || "Lead captured via Leadio WhatsApp Extension"
      );
    }
  }, [crmConfig]);

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, error: "Please provide an API Key before testing." });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestCRM({
        apiKey: apiKey.trim(),
        label: label.trim(),
      });
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, error: err.message || "Failed to reach 365 CRM API" });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveCRM = async (e) => {
    e?.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSaveCRM({
        isEnabled: crmEnabled,
        apiKey: apiKey.trim(),
        label: label.trim() || "WhatsApp Lead",
        defaultComment: defaultComment.trim(),
        apiUrl: "https://www.api.365crm.io/wpaddwebsiteleads",
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Error saving 365 CRM configuration: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-md p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-orange-50 border border-orange-200 flex items-center justify-center text-[#DE5437] shrink-0">
              <Plug className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Workspace Integrations
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {workspace?.workspaceCode || "WS-1001"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your destination integrations for leads captured via WhatsApp.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAddSheet}
              className="py-1.5 px-3 bg-[#DE5437] hover:bg-[#c9452b] text-white rounded-md text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Google Sheet</span>
            </button>
          </div>
        </div>

        {/* Integration Selection Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSelectedIntegration("all")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              selectedIntegration === "all"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Integrations (2)
          </button>
          <button
            type="button"
            onClick={() => setSelectedIntegration("sheets")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              selectedIntegration === "sheets"
                ? "bg-emerald-700 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>1. Google Sheet ({googleSheets.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedIntegration("365crm")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              selectedIntegration === "365crm"
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>2. 365 CRM {crmEnabled && "✓"}</span>
          </button>
        </div>
      </div>

      {/* OPTION 1: GOOGLE SHEET INTEGRATION */}
      {(selectedIntegration === "all" || selectedIntegration === "sheets") && (
        <div className="bg-white border border-slate-200 rounded-md p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <FileSpreadsheet className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                    Option 1
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Google Sheet Integration
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {googleSheets.length} Connected
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Connect multiple Google Sheets to this workspace via Google Forms pre-filled link.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenAddSheet}
              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect Another Sheet</span>
            </button>
          </div>

          {/* List of Connected Sheets */}
          {googleSheets.length === 0 ? (
            <div className="text-center py-7 border border-dashed border-slate-200 rounded-md p-4 space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No Google Sheets connected yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Connect your Google Sheet using a pre-filled form URL to start exporting WhatsApp leads.
              </p>
              <button
                type="button"
                onClick={onOpenAddSheet}
                className="mt-1 py-1.5 px-3 bg-emerald-600 text-white rounded-md text-xs font-semibold cursor-pointer"
              >
                + Connect Google Sheet
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {googleSheets.map((sheet) => {
                const isSheetActive = sheet.isActive !== undefined ? sheet.isActive : true;
                return (
                  <div
                    key={sheet.id}
                    className="border border-slate-200/90 rounded-md p-3.5 hover:border-slate-300 transition-all bg-slate-50/40 flex flex-col justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isSheetActive ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          />
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {sheet.name}
                          </h4>
                        </div>

                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200 shrink-0">
                          {sheet.fields?.length || 0} Questions
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 font-mono truncate mt-1">
                        {sheet.baseUrl || "Google Form viewform link"}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditSheet && onEditSheet(sheet)}
                          className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[11px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Settings className="w-3 h-3 text-slate-500" />
                          <span>Configure Questions</span>
                        </button>

                        {sheet.baseUrl && (
                          <a
                            href={sheet.baseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            title="Open Google Form"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteSheet && onDeleteSheet(sheet.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Disconnect Sheet"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* OPTION 2: 365 CRM INTEGRATION */}
      {(selectedIntegration === "all" || selectedIntegration === "365crm") && (
        <form
          onSubmit={handleSaveCRM}
          className="bg-white border border-slate-200 rounded-md p-4 sm:p-5 shadow-2xs space-y-4"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Building2 className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                    Option 2
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    365 CRM Integration (api.365crm.io)
                  </h3>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      crmEnabled
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {crmEnabled ? "Active" : "Disabled"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Posts leads to <code className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px]">https://www.api.365crm.io/wpaddwebsiteleads</code>
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={crmEnabled}
                onChange={(e) => setCrmEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
              <span className="ml-2 text-xs font-bold text-slate-700">
                {crmEnabled ? "Enabled" : "Off"}
              </span>
            </label>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3 rounded-md text-xs flex items-start gap-2 animate-in fade-in ${
                testResult.success
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
                  : "bg-red-50 border border-red-200 text-red-900"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-bold">{testResult.success ? "Success: " : "Connection Error: "}</span>
                <span>{testResult.message || testResult.error}</span>
              </div>
            </div>
          )}

          {/* API Specification Info Box */}
          <div className="bg-blue-50/50 border border-blue-200/70 rounded-md p-3 text-[11px] text-slate-700 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-blue-950">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>365 CRM API Contract</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono bg-white p-2.5 rounded border border-blue-100">
              <div>
                <span className="text-slate-400 block">POST ENDPOINT:</span>
                <span className="font-semibold text-slate-800 break-all">https://www.api.365crm.io/wpaddwebsiteleads</span>
              </div>
              <div>
                <span className="text-slate-400 block">HEADERS:</span>
                <span className="text-slate-800">Authorization: &lt;Your API Key&gt;</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block">PAYLOAD FIELDS:</span>
                <span className="text-emerald-700 font-semibold">customerName*</span>,{" "}
                <span className="text-emerald-700 font-semibold">customerMobile*</span>,{" "}
                <span className="text-slate-600">customerEmail</span>,{" "}
                <span className="text-slate-600">customerComment</span>,{" "}
                <span className="text-blue-700 font-semibold">label</span>
              </div>
            </div>
          </div>

          {/* Form Fields: API Key & Configuration Labels */}
          <div className="space-y-3.5">
            {/* 1. Authorization API Key */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Authorization API Key <span className="text-red-500">*</span>:
              </label>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your 365 CRM Authorization API Key"
                  required={crmEnabled}
                  className="w-full h-9 bg-slate-50 border border-slate-200 rounded-md pl-9 pr-10 text-xs font-mono text-slate-900 outline-none focus:bg-white focus:border-blue-500 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Passed in the request header: <code className="font-mono text-slate-600">Authorization: Your API Key</code>
              </span>
            </div>

            {/* 2. Configuration Label */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Configuration Label (Campaign / Category) <span className="text-red-500">*</span>:
              </label>
              <div className="relative flex items-center">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. WhatsApp Inbound, Website Leads, Leadio"
                  required={crmEnabled}
                  className="w-full h-9 bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-blue-500 shadow-2xs"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Sent in the JSON body: <code className="font-mono text-slate-600">&quot;label&quot;: &quot;{label || 'Your Label'}&quot;</code>
              </span>
            </div>

            {/* 3. Default Comment Template */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                Default Comment Prefix / Note:
              </label>
              <div className="relative flex items-center">
                <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={defaultComment}
                  onChange={(e) => setDefaultComment(e.target.value)}
                  placeholder="Lead captured via Leadio WhatsApp Extension"
                  className="w-full h-9 bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 shadow-2xs"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Sent in the JSON body: <code className="font-mono text-slate-600">&quot;customerComment&quot;</code> along with staff &amp; timestamp info.
              </span>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !apiKey.trim()}
              className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Testing API Key...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Test API Connection</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>Configuration Saved!</span>
                </span>
              )}
              <button
                type="submit"
                disabled={isSaving}
                className="py-1.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save 365 CRM Config</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
