"use client";

import React, { useState, useEffect, useMemo } from "react";
import { cleanGoogleFormUrl, encodeParam, detectFieldsFromUrl } from "../helpers/formUrl";
import {
  Settings,
  Save,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  ExternalLink,
  Wand2,
  Phone,
  ListChecks,
  Users,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Star,
  FileText,
  AlertCircle,
  Database,
  Building2,
  Link2,
  Sparkles,
  Zap,
} from "lucide-react";

export default function SettingsTab({
  sheets = [],
  activeSheet,
  activeSheetId,
  onSheetChange,
  onUpdateSheet,
  onDeleteSheet,
  onOpenAddSheet,
  teamMembers = [],
}) {
  const [saveStatus, setSaveStatus] = useState("");
  const [inspectMessage, setInspectMessage] = useState("");
  const [showPrefillBox, setShowPrefillBox] = useState(false);
  const [prefillUrlInput, setPrefillUrlInput] = useState("");

  const currentSheet = useMemo(() => {
    return activeSheet || sheets.find((s) => s.id === activeSheetId) || sheets[0] || null;
  }, [activeSheet, sheets, activeSheetId]);

  // Local form state for editing
  const [sheetName, setSheetName] = useState("");
  const [location, setLocation] = useState("Google Sheets");
  const [isActive, setIsActive] = useState(true);
  const [baseUrl, setBaseUrl] = useState("");
  const [leadEntryKey, setLeadEntryKey] = useState("");
  const [leadEntryLabel, setLeadEntryLabel] = useState("");
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [fields, setFields] = useState([]);
  const [selectedValues, setSelectedValues] = useState({});

  // Populate local state whenever selected sheet changes
  useEffect(() => {
    if (currentSheet) {
      setSheetName(currentSheet.name || "");
      setLocation(currentSheet.location || "Google Sheets");
      setIsActive(currentSheet.isActive !== undefined ? currentSheet.isActive : true);
      setBaseUrl(cleanGoogleFormUrl(currentSheet.baseUrl || ""));
      setLeadEntryKey(currentSheet.leadEntryKey || "");
      setLeadEntryLabel(currentSheet.leadEntryLabel || "Customer Phone / WhatsApp Lead");
      setAssignedUsers(Array.isArray(currentSheet.assignedUsers) ? [...currentSheet.assignedUsers] : []);
      setFields(
        Array.isArray(currentSheet.fields)
          ? currentSheet.fields.map((f) => ({
              id: f.id || "",
              label: f.label || "",
              options: Array.isArray(f.options) ? [...f.options] : [],
              defaultValue: f.defaultValue || (f.options && f.options[0]) || "",
              newOptInput: "",
            }))
          : []
      );
      setSelectedValues(currentSheet.selectedValues || {});
      setSaveStatus("");
      setInspectMessage("");
    }
  }, [currentSheet]);

  // Add an option to a specific question
  const handleAddOption = (fieldIdx, optionText) => {
    const trimmed = (optionText || "").trim();
    if (!trimmed) return;
    const copy = [...fields];
    if (!copy[fieldIdx].options.includes(trimmed)) {
      copy[fieldIdx].options.push(trimmed);
      if (!copy[fieldIdx].defaultValue) {
        copy[fieldIdx].defaultValue = trimmed;
      }
      copy[fieldIdx].newOptInput = "";
      setFields(copy);
    }
  };

  // Remove an option from a specific question
  const handleRemoveOption = (fieldIdx, optIdx) => {
    const copy = [...fields];
    const removedOpt = copy[fieldIdx].options[optIdx];
    copy[fieldIdx].options.splice(optIdx, 1);
    if (copy[fieldIdx].defaultValue === removedOpt) {
      copy[fieldIdx].defaultValue = copy[fieldIdx].options[0] || "";
    }
    setFields(copy);
  };

  // Move question position up or down
  const handleMoveQuestion = (idx, direction) => {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= fields.length) return;
    const copy = [...fields];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;
    setFields(copy);
  };

  // Add a new question to the sheet
  const handleAddNewQuestion = () => {
    const randomId = `entry.${Math.floor(100000000 + Math.random() * 900000000)}`;
    setFields([
      ...fields,
      {
        id: randomId,
        label: "New Question",
        options: [],
        defaultValue: "",
        newOptInput: "",
      },
    ]);
  };

  // Remove a question
  const handleRemoveQuestion = (fieldIdx) => {
    const copy = [...fields];
    copy.splice(fieldIdx, 1);
    setFields(copy);
  };

  // Apply fields & phone entry from a prefilled URL
  const handleApplyPrefillUrl = (urlToParse) => {
    const raw = (urlToParse || prefillUrlInput || "").trim();
    if (!raw) {
      alert("Please paste a valid Google Form pre-filled link.");
      return;
    }

    try {
      const result = detectFieldsFromUrl(raw, teamMembers, leadEntryKey);
      if (result.baseUrl) {
        setBaseUrl(cleanGoogleFormUrl(result.baseUrl));
      }
      if (result.leadEntryKey) {
        setLeadEntryKey(result.leadEntryKey);
        if (result.leadEntryLabel) setLeadEntryLabel(result.leadEntryLabel);
      }

      if (Array.isArray(result.fields) && result.fields.length > 0) {
        const mappedFields = result.fields.map((f) => ({
          id: f.id,
          label: f.label || `Question (${f.id.replace("entry.", "#")})`,
          options: Array.isArray(f.options) && f.options.length > 0 ? [...f.options] : [f.label],
          defaultValue: f.options?.[0] || "",
          newOptInput: "",
        }));

        setFields(mappedFields);

        // Update default selected values
        const newSelected = { ...selectedValues };
        mappedFields.forEach((f) => {
          if (f.defaultValue) {
            newSelected[f.id] = f.defaultValue;
          }
        });
        setSelectedValues(newSelected);
      }

      const count = (result.fields?.length || 0) + (result.leadEntryKey ? 1 : 0);
      setInspectMessage(
        `✅ Detected ${count} question(s) & choices from pre-filled link! Phone entry: ${result.leadEntryKey || "Not set"}`
      );
      setPrefillUrlInput("");
      setShowPrefillBox(false);
    } catch (err) {
      alert(err.message || "Invalid Google Form pre-filled link. Make sure it contains entry.XXXX parameters.");
    }
  };

  const handleBaseUrlChange = (val) => {
    if (val.includes("entry.") || val.includes("usp=pp_url")) {
      handleApplyPrefillUrl(val);
    } else {
      setBaseUrl(cleanGoogleFormUrl(val));
    }
  };

  // Save all settings to DB
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    if (!currentSheet) return;

    if (!sheetName.trim()) {
      alert("Sheet name cannot be empty.");
      return;
    }

    const cleanedUrl = cleanGoogleFormUrl(baseUrl);
    if (!cleanedUrl) {
      alert("Please provide a valid Google Form Base URL.");
      return;
    }

    if (!leadEntryKey.trim()) {
      alert("Please specify the question entry ID for customer WhatsApp phone number.");
      return;
    }

    const compiledFields = fields
      .filter((f) => f.id.trim().length > 0)
      .map((f) => ({
        id: f.id.trim(),
        label: f.label.trim() || f.id.trim(),
        options: f.options.length > 0 ? f.options : [f.label],
        defaultValue: f.defaultValue || f.options[0] || "",
      }));

    const defaultValues = {};
    compiledFields.forEach((f) => {
      defaultValues[f.id] = selectedValues[f.id] || f.defaultValue || f.options[0] || "";
    });

    const payload = {
      name: sheetName.trim(),
      location: location.trim() || "Google Sheets",
      isActive: isActive,
      baseUrl: cleanedUrl,
      leadEntryKey: leadEntryKey.trim(),
      leadEntryLabel: leadEntryLabel.trim() || "Customer Phone / WhatsApp Lead",
      assignedUsers: assignedUsers,
      fields: compiledFields,
      selectedValues: defaultValues,
    };

    try {
      setSaveStatus("saving");
      if (onUpdateSheet) {
        await onUpdateSheet(currentSheet.id, payload);
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 4000);
    } catch (err) {
      console.error("Save error:", err);
      setSaveStatus("error");
    }
  };

  if (!sheets || sheets.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-md p-8 text-center max-w-xl mx-auto shadow-2xs space-y-4">
        <div className="w-12 h-12 bg-orange-50 text-[#DE5437] rounded-md flex items-center justify-center mx-auto">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">No Google Forms Configured</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Connect your first Google Form / Sheet to start auto-mapping WhatsApp leads and configuring form fields.
        </p>
        <button
          type="button"
          onClick={onOpenAddSheet}
          className="px-4 py-2 bg-[#DE5437] hover:bg-[#c44328] text-white font-bold rounded-md text-xs shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Connect Google Sheet</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full min-w-0 pb-28 animate-in fade-in duration-150">
      
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-md p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-4.5 h-4.5 text-[#DE5437]" />
              <span>Sheet &amp; Form Settings</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit any configuration: Sheet name, form link, prefilled answers, lead phone field, and team permissions.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saveStatus === "saving"}
              className="w-full sm:w-auto px-5 py-2 bg-[#DE5437] hover:bg-[#c44328] disabled:opacity-50 text-white font-bold rounded-md text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {saveStatus === "saving" ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : saveStatus === "saved" ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved to Database!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: Sheet & Form Basics */}
      <div className="bg-white border border-slate-200 rounded-md p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Sheet Identity &amp; Status
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-[#DE5437] rounded focus:ring-0 cursor-pointer"
              />
              <span>{isActive ? "Active Sheet" : "Paused / Disabled"}</span>
            </label>
            {baseUrl && (
              <a
                href={baseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 ml-2"
              >
                <span>Open Form</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Sheet Name */}
          <div className="sm:col-span-7">
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Campaign / Sheet Name:
            </label>
            <div className="relative flex items-center">
              <FileSpreadsheet className="w-4 h-4 text-[#DE5437] absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="e.g. Kravy & Hotel Billing"
                className="w-full h-9 bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#DE5437] shadow-2xs"
              />
            </div>
          </div>

          {/* Location / Destination Label */}
          <div className="sm:col-span-5">
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Storage / Location:
            </label>
            <div className="relative flex items-center">
              <Database className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Google Sheets"
                className="w-full h-9 bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#DE5437] shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Google Form Base / Prefill URL */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <label className="text-[11px] font-bold text-slate-700">
              Google Form URL (Prefill or Form Link):
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrefillBox(!showPrefillBox)}
                className="text-[11px] text-[#DE5437] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>{showPrefillBox ? "Hide Prefill Tool" : "Paste Pre-filled Link"}</span>
              </button>
            </div>
          </div>

          {/* Collapsible Pre-filled link auto-detector */}
          {showPrefillBox && (
            <div className="bg-orange-50/80 border border-orange-200 rounded-md p-3.5 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-orange-950 flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-[#DE5437]" />
                  <span>Auto-Detect from Pre-filled Link</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPrefillBox(false)}
                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] text-orange-900/90 leading-relaxed">
                In Google Forms: click <strong>three dots (⋮)</strong> &rarr; <strong>&quot;Get pre-filled link&quot;</strong> &rarr; fill a sample phone number &amp; select choices &rarr; click <strong>&quot;Get link&quot;</strong> and paste here:
              </p>

              <textarea
                rows={2}
                value={prefillUrlInput}
                onChange={(e) => setPrefillUrlInput(e.target.value)}
                placeholder="https://docs.google.com/forms/d/e/.../viewform?usp=pp_url&entry.301449049=9311507651&entry.794502345=..."
                className="w-full bg-white border border-orange-200 rounded-md p-2 text-xs font-mono text-slate-800 outline-none focus:border-[#DE5437] shadow-2xs"
              />

              <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleApplyPrefillUrl(prefillUrlInput)}
                  className="px-3 py-1.5 bg-[#DE5437] hover:bg-[#c44328] text-white font-bold rounded-md text-xs shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Auto-Detect Questions &amp; Phone Field</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const sample = "https://docs.google.com/forms/d/e/1FAIpQLSfd3ZYAfNIQaf2ulsFUDTu-CiiHaLyKoIE3opkXWKl9wF_0pA/viewform?usp=pp_url&entry.301449049=9311507651&entry.794502345=Kravy+Billing+Software&entry.1446357555=Arnav";
                    setPrefillUrlInput(sample);
                    handleApplyPrefillUrl(sample);
                  }}
                  className="text-[11px] text-orange-800 hover:text-orange-950 font-semibold underline cursor-pointer inline-flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" />
                  <span>Try Sample Link</span>
                </button>
              </div>
            </div>
          )}

          <input
            type="text"
            value={baseUrl}
            onChange={(e) => handleBaseUrlChange(e.target.value)}
            placeholder="https://docs.google.com/forms/d/e/.../viewform (or paste pre-filled link)"
            className="w-full h-9 bg-slate-50 border border-slate-200 rounded-md px-3 text-xs font-mono text-slate-800 outline-none focus:bg-white focus:border-[#DE5437] shadow-2xs"
          />

          {inspectMessage && (
            <div
              className={`text-[11px] font-medium rounded-md p-2 mt-1 flex items-center justify-between gap-2 ${
                inspectMessage.toLowerCase().includes("timed out") || inspectMessage.toLowerCase().includes("error")
                  ? "text-amber-900 bg-amber-50 border border-amber-200"
                  : "text-emerald-800 bg-emerald-50 border border-emerald-200"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {inspectMessage.toLowerCase().includes("timed out") || inspectMessage.toLowerCase().includes("error") ? (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                )}
                <span>{inspectMessage}</span>
              </div>
              {(inspectMessage.toLowerCase().includes("timed out") || inspectMessage.toLowerCase().includes("error")) && (
                <button
                  type="button"
                  onClick={() => setShowPrefillBox(true)}
                  className="text-[11px] text-[#DE5437] font-bold underline cursor-pointer shrink-0 inline-flex items-center gap-1"
                >
                  <Link2 className="w-3 h-3" />
                  <span>Paste Pre-filled Link &rarr;</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Customer Phone / WhatsApp Contact Field */}
      <div className="bg-white border border-slate-200 rounded-md p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Phone className="w-4 h-4 text-slate-700" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            2. Customer Contact / Lead Phone Mapping
          </h3>
        </div>

        <div className="bg-orange-50/60 border border-orange-200/80 rounded-md p-3 text-[11px] text-orange-950 leading-relaxed">
          The selected WhatsApp number or contact will be submitted into this question entry ID when running bulk submission.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Field Entry ID:
            </label>
            <input
              type="text"
              value={leadEntryKey}
              onChange={(e) => setLeadEntryKey(e.target.value)}
              placeholder="entry.301449049"
              className="w-full h-9 bg-slate-50 border border-slate-200 rounded-md px-3 text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-[#DE5437] shadow-2xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Field Display Label:
            </label>
            <input
              type="text"
              value={leadEntryLabel}
              onChange={(e) => setLeadEntryLabel(e.target.value)}
              placeholder="Customer Phone / WhatsApp Lead"
              className="w-full h-9 bg-slate-50 border border-slate-200 rounded-md px-3 text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-[#DE5437] shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: Questions & Choices Configuration */}
      <div className="bg-white border border-slate-200 rounded-md p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              3. Form Questions &amp; Choices ({fields.length})
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowPrefillBox(true)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5 text-[#DE5437]" />
              <span>Import from Pre-filled Link</span>
            </button>
            <button
              type="button"
              onClick={handleAddNewQuestion}
              className="text-xs font-bold text-[#DE5437] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Question</span>
            </button>
          </div>
        </div>

        {fields.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 space-y-3">
            <p>No questions configured yet for this form.</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowPrefillBox(true)}
                className="px-3 py-1.5 bg-orange-50 border border-orange-200 text-[#DE5437] font-bold rounded-md text-xs shadow-2xs hover:bg-orange-100 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Auto-Detect from Pre-filled Link</span>
              </button>
              <button
                type="button"
                onClick={handleAddNewQuestion}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-md text-xs shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#DE5437]" />
                <span>Add Question Manually</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            {fields.map((field, fieldIdx) => (
              <div
                key={fieldIdx}
                className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-3 shadow-2xs hover:border-slate-300 transition-colors"
              >
                {/* Question Title & ID row with Move / Delete buttons */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 self-end mb-1">
                    <button
                      type="button"
                      disabled={fieldIdx === 0}
                      onClick={() => handleMoveQuestion(fieldIdx, -1)}
                      className="w-6 h-6 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-600 flex items-center justify-center cursor-pointer"
                      title="Move Question Up"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={fieldIdx === fields.length - 1}
                      onClick={() => handleMoveQuestion(fieldIdx, 1)}
                      className="w-6 h-6 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-600 flex items-center justify-center cursor-pointer"
                      title="Move Question Down"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                      Question #{fieldIdx + 1} Label:
                    </label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => {
                        const copy = [...fields];
                        copy[fieldIdx].label = e.target.value;
                        setFields(copy);
                      }}
                      placeholder="e.g. Lead Source"
                      className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-[#DE5437]"
                    />
                  </div>

                  <div className="w-36 shrink-0">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                      Entry ID:
                    </label>
                    <input
                      type="text"
                      value={field.id}
                      onChange={(e) => {
                        const copy = [...fields];
                        copy[fieldIdx].id = e.target.value;
                        setFields(copy);
                      }}
                      placeholder="entry.794502345"
                      className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-700 outline-none focus:border-[#DE5437]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(fieldIdx)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer self-end mb-0.5"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Choices / Options row */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Available Options / Choices:
                    </label>
                    <span className="text-[10px] text-slate-400 inline-flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                      <span>= default prefilled value</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-200 rounded-md p-2">
                    {field.options.map((opt, optIdx) => {
                      const isDefault = field.defaultValue === opt;
                      return (
                        <span
                          key={optIdx}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                            isDefault
                              ? "bg-orange-50 border-orange-300 text-[#DE5437] font-bold"
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          <span
                            onClick={() => {
                              const copy = [...fields];
                              copy[fieldIdx].defaultValue = opt;
                              setFields(copy);
                              setSelectedValues((prev) => ({ ...prev, [field.id]: opt }));
                            }}
                            className="cursor-pointer inline-flex items-center gap-1"
                            title="Click to set as default value"
                          >
                            <span>{opt}</span>
                            {isDefault && <Star className="w-3 h-3 fill-amber-400 text-amber-500" />}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(fieldIdx, optIdx)}
                            className="text-slate-400 hover:text-red-600 font-bold ml-0.5 cursor-pointer"
                            title="Remove choice"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}

                    {/* Add choice input */}
                    <div className="flex items-center gap-1 ml-1">
                      <input
                        type="text"
                        value={field.newOptInput || ""}
                        onChange={(e) => {
                          const copy = [...fields];
                          copy[fieldIdx].newOptInput = e.target.value;
                          setFields(copy);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddOption(fieldIdx, field.newOptInput);
                          }
                        }}
                        placeholder="+ Add choice..."
                        className="h-7 w-28 bg-slate-50 border border-slate-200 rounded-md px-2 text-xs text-slate-800 outline-none focus:bg-white focus:border-[#DE5437]"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddOption(fieldIdx, field.newOptInput)}
                        className="h-7 px-2 bg-slate-100 hover:bg-[#DE5437] hover:text-white text-slate-700 rounded-md text-xs font-bold transition-colors cursor-pointer"
                        title="Add Choice"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Quick Suggestions */}
                    {field.options.includes("Yes") && !field.options.includes("No") && (
                      <button
                        type="button"
                        onClick={() => handleAddOption(fieldIdx, "No")}
                        className="h-6 px-1.5 text-[10px] bg-slate-100 border border-slate-200 rounded text-slate-600 hover:bg-orange-50 hover:text-[#DE5437] font-semibold cursor-pointer inline-flex items-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>&quot;No&quot;</span>
                      </button>
                    )}
                    {field.options.includes("No") && !field.options.includes("Yes") && (
                      <button
                        type="button"
                        onClick={() => handleAddOption(fieldIdx, "Yes")}
                        className="h-6 px-1.5 text-[10px] bg-slate-100 border border-slate-200 rounded text-slate-600 hover:bg-orange-50 hover:text-[#DE5437] font-semibold cursor-pointer inline-flex items-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>&quot;Yes&quot;</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: Team Access */}
      <div className="bg-white border border-slate-200 rounded-md p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              4. Team Member Access
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAssignedUsers([])}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
            >
              Allow All
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => setAssignedUsers([...teamMembers])}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
            >
              Select All
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          Staff members who can view and submit leads to this sheet:
        </p>

        <div className="flex flex-wrap gap-2">
          {teamMembers.map((item, idx) => {
            const memberName = typeof item === "string" ? item : item.name || "";
            const memberKey = typeof item === "string" ? item : item.id || item.name || idx;
            const isAssigned = assignedUsers.some(
              (u) => (typeof u === "string" ? u === memberName : u.name === memberName || (u.id && u.id === item.id))
            );
            return (
              <button
                key={memberKey}
                type="button"
                onClick={() => {
                  if (isAssigned) {
                    setAssignedUsers(
                      assignedUsers.filter((u) => (typeof u === "string" ? u !== memberName : u.name !== memberName))
                    );
                  } else {
                    setAssignedUsers([...assignedUsers, item]);
                  }
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  isAssigned
                    ? "bg-[#FFF5F2] border-[#FCD8CF] text-[#DE5437] font-bold shadow-2xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {isAssigned ? (
                  <Check className="w-3 h-3 text-[#DE5437]" />
                ) : (
                  <Plus className="w-3 h-3 text-slate-400" />
                )}
                <span>{memberName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 5: Danger Zone */}
      {sheets.length > 1 && onDeleteSheet && (
        <div className="bg-red-50/50 border border-red-200/80 rounded-md p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider">
                Delete This Sheet Setup
              </h4>
              <p className="text-[11px] text-red-700 mt-0.5">
                Permanently delete <strong>{sheetName}</strong> from database. This action cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDeleteSheet(currentSheet.id)}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md text-xs transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Sheet</span>
            </button>
          </div>
        </div>
      )}

      {/* Sticky Bottom Save Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-72 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="text-xs text-slate-500 truncate mr-3">
          Configuring: <strong className="text-slate-800">{sheetName || "Sheet"}</strong>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={saveStatus === "saving"}
          className="px-6 py-2.5 bg-[#DE5437] hover:bg-[#c44328] disabled:opacity-50 text-white font-bold rounded-md text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
        >
          {saveStatus === "saving" ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : saveStatus === "saved" ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
