"use client";

import React, { useState, useMemo, useEffect } from "react";
import { X, Lightbulb, Zap, Phone, Check, Plus } from "lucide-react";
import { SAMPLE_PREFILL_URL } from "../constants/sheets";
import { detectFieldsFromUrl, encodeParam, cleanGoogleFormUrl } from "../helpers/formUrl";

export default function AddSheetModal({
  isOpen,
  onClose,
  editingSheet,
  isCreatingNew,
  teamMembers,
  onSaveSheet,
}) {
  const [wizardStep, setWizardStep] = useState(1);
  const [pastedUrl, setPastedUrl] = useState("");
  const [urlDetectedMsg, setUrlDetectedMsg] = useState("");
  const [formSheetName, setFormSheetName] = useState(editingSheet?.name || "");
  const [formBaseUrl, setFormBaseUrl] = useState(editingSheet?.baseUrl || "");
  const [formLeadEntry, setFormLeadEntry] = useState(editingSheet?.leadEntryKey || "");
  const [formLeadLabel, setFormLeadLabel] = useState(editingSheet?.leadEntryLabel || "Customer Phone / WhatsApp Lead");
  const [formAssignedUsers, setFormAssignedUsers] = useState(editingSheet?.assignedUsers || []);
  const [formFields, setFormFields] = useState([]);

  // Reset/populate form state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      if (isCreatingNew || !editingSheet) {
        setWizardStep(1);
        setPastedUrl("");
        setUrlDetectedMsg("");
        setFormSheetName("");
        setFormBaseUrl("");
        setFormLeadEntry("");
        setFormLeadLabel("Customer Phone / WhatsApp Lead");
        setFormAssignedUsers([]);
        setFormFields([]);
      } else {
        setWizardStep(2);
        setPastedUrl("");
        setUrlDetectedMsg("");
        setFormSheetName(editingSheet.name || "");
        setFormBaseUrl(cleanGoogleFormUrl(editingSheet.baseUrl || ""));
        setFormLeadEntry(editingSheet.leadEntryKey || "");
        setFormLeadLabel(editingSheet.leadEntryLabel || "Customer Phone / WhatsApp Lead");
        setFormAssignedUsers(editingSheet.assignedUsers || []);
        setFormFields(
          editingSheet.fields
            ? editingSheet.fields.map((f) => ({
                id: f.id,
                label: f.label,
                options: [...f.options],
              }))
            : []
        );
      }
    }
  }, [isOpen, editingSheet, isCreatingNew]);

  // Auto-detect fields from prefilled URL
  const handleAutoDetect = (url) => {
    try {
      const result = detectFieldsFromUrl(url, teamMembers);
      setFormBaseUrl(result.baseUrl);
      setFormLeadEntry(result.leadEntryKey);
      setFormLeadLabel(result.leadEntryLabel);
      setFormFields(result.fields);
      if (!formSheetName) {
        setFormSheetName("New Google Sheet");
      }
      setUrlDetectedMsg(`Detected ${result.fields.length + (result.leadEntryKey ? 1 : 0)} form questions!`);
      setWizardStep(2);
    } catch (err) {
      alert(err.message || "Invalid Google Form link.");
    }
  };

  const handleAddOption = (fieldIdx, optText) => {
    const trimmed = optText.trim();
    if (!trimmed) return;
    const copy = [...formFields];
    if (!copy[fieldIdx].options.includes(trimmed)) {
      copy[fieldIdx].options.push(trimmed);
      copy[fieldIdx].newOptInput = "";
      setFormFields(copy);
    }
  };

  const handleRemoveOption = (fieldIdx, optIndex) => {
    const copy = [...formFields];
    copy[fieldIdx].options.splice(optIndex, 1);
    setFormFields(copy);
  };

  const handleSave = () => {
    if (!formSheetName.trim()) {
      alert("Please enter a name for this Google Sheet.");
      setWizardStep(2);
      return;
    }
    if (!formBaseUrl.trim()) {
      alert("Please provide the Google Form Base URL.");
      setWizardStep(2);
      return;
    }
    if (!formLeadEntry.trim()) {
      alert("Please specify the question ID for customer phone/WhatsApp lead.");
      setWizardStep(3);
      return;
    }

    const compiledFields = formFields
      .filter((f) => f.id.trim().length > 0)
      .map((f) => {
        const options = f.options.length > 0 ? f.options : [f.label];
        return {
          id: f.id.trim(),
          label: f.label.trim() || f.id.trim(),
          options: options,
          defaultValue: options[0] || "",
        };
      });

    const defaultValues = {};
    compiledFields.forEach((f) => {
      defaultValues[f.id] = f.defaultValue || f.options[0] || "";
    });

    const cleanedBaseUrl = cleanGoogleFormUrl(formBaseUrl);

    onSaveSheet({
      name: formSheetName.trim(),
      baseUrl: cleanedBaseUrl,
      leadEntryKey: formLeadEntry.trim(),
      leadEntryLabel: formLeadLabel.trim() || "Customer Phone / WhatsApp Lead",
      assignedUsers: isCreatingNew ? [] : (editingSheet?.assignedUsers || []),
      fields: compiledFields,
      defaultValues,
    });
  };

  const livePreviewUrl = useMemo(() => {
    if (!formBaseUrl) return "";
    const base = cleanGoogleFormUrl(formBaseUrl);
    const parts = ["usp=pp_url"];
    if (formLeadEntry) parts.push(`${formLeadEntry}=9311507651`);
    formFields.forEach((f) => {
      if (f.id && f.options.length > 0) {
        parts.push(`${f.id}=${encodeParam(f.options[0])}`);
      }
    });
    return `${base}?${parts.join("&")}`;
  }, [formBaseUrl, formLeadEntry, formFields]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {isCreatingNew ? "Connect Google Sheet" : `Edit: ${formSheetName}`}
            </h3>
            <p className="text-[11px] text-slate-500">
              Step {wizardStep} of 3: {wizardStep === 1 ? "Paste Pre-filled Link" : wizardStep === 2 ? "Sheet Name & Access" : "Questions & Values"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step Tabs */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50/40 text-xs font-semibold text-center">
          <button
            type="button"
            onClick={() => setWizardStep(1)}
            className={`py-2.5 border-b-2 transition-all ${
              wizardStep === 1 ? "border-emerald-600 text-emerald-800 bg-white font-bold" : "border-transparent text-slate-400"
            }`}
          >
            1. Link
          </button>
          <button
            type="button"
            onClick={() => setWizardStep(2)}
            className={`py-2.5 border-b-2 transition-all ${
              wizardStep === 2 ? "border-emerald-600 text-emerald-800 bg-white font-bold" : "border-transparent text-slate-400"
            }`}
          >
            2. Details
          </button>
          <button
            type="button"
            onClick={() => setWizardStep(3)}
            className={`py-2.5 border-b-2 transition-all ${
              wizardStep === 3 ? "border-emerald-600 text-emerald-800 bg-white font-bold" : "border-transparent text-slate-400"
            }`}
          >
            3. Questions
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs">
          
          {/* STEP 1 */}
          {wizardStep === 1 && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-md p-3.5 space-y-2">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>How to get pre-filled link in 15 seconds:</span>
                </span>
                <ol className="text-[11px] text-emerald-900 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Open Google Form &rarr; click <strong>three dots (⋮)</strong> top-right.</li>
                  <li>Click <strong>&quot;Get pre-filled link&quot;</strong>.</li>
                  <li>Type sample number in the phone field and pick dropdown choices.</li>
                  <li>Click <strong>&quot;Get link&quot;</strong> &rarr; then <strong>&quot;Copy link&quot;</strong>.</li>
                </ol>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">Paste Google Form Link:</label>
                  <button
                    type="button"
                    onClick={() => {
                      setPastedUrl(SAMPLE_PREFILL_URL);
                      handleAutoDetect(SAMPLE_PREFILL_URL);
                    }}
                    className="text-[10px] text-emerald-700 hover:underline font-bold inline-flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Try Sample Link</span>
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={pastedUrl}
                  onChange={(e) => setPastedUrl(e.target.value)}
                  placeholder="https://docs.google.com/forms/d/e/.../viewform?usp=pp_url&entry.301449049=9311507651..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 outline-none focus:border-emerald-600 font-mono shadow-2xs"
                />

                <button
                  type="button"
                  onClick={() => handleAutoDetect(pastedUrl)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>🪄 Auto-Detect Form Questions</span>
                </button>

                {urlDetectedMsg && (
                  <div className="p-2.5 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-950 font-bold text-[11px]">
                    {urlDetectedMsg}
                  </div>
                )}
              </div>

              {formBaseUrl && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs"
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 */}
          {wizardStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Google Sheet / Campaign Name:</label>
                <input
                  type="text"
                  value={formSheetName}
                  onChange={(e) => setFormSheetName(e.target.value)}
                  placeholder="e.g. Sales Inbound Leads"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600 font-semibold shadow-2xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-800 block">Google Form Base URL:</label>
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="text-[11px] text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    Paste Pre-filled Link &rarr;
                  </button>
                </div>
                <input
                  type="text"
                  value={formBaseUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.includes("entry.") || val.includes("usp=pp_url")) {
                      handleAutoDetect(val);
                    } else {
                      setFormBaseUrl(cleanGoogleFormUrl(val));
                    }
                  }}
                  placeholder="https://docs.google.com/forms/d/e/.../viewform (or paste prefill link)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-mono text-[11px] outline-none"
                />
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="text-xs font-semibold text-slate-500"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={() => setWizardStep(3)}
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {wizardStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* WhatsApp Lead Field */}
              <div className="bg-emerald-50/80 border border-emerald-300 rounded-md p-3.5 space-y-2">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-800" />
                  <span>WhatsApp Lead / Phone Field:</span>
                </span>
                <p className="text-[10px] text-emerald-900">
                  WhatsApp contact number will be automatically filled here:
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Field ID:</label>
                    <input
                      type="text"
                      value={formLeadEntry}
                      onChange={(e) => setFormLeadEntry(e.target.value)}
                      placeholder="entry.301449049"
                      className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 font-mono text-emerald-900 text-xs font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Title:</label>
                    <input
                      type="text"
                      value={formLeadLabel}
                      onChange={(e) => setFormLeadLabel(e.target.value)}
                      placeholder="WhatsApp Lead"
                      className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Dropdown Questions:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFormFields([
                        ...formFields,
                        {
                          id: `entry.${Math.floor(100000000 + Math.random() * 900000000)}`,
                          label: "New Question",
                          options: [],
                        },
                      ])
                    }
                    className="text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    + Add Question
                  </button>
                </div>

                {formFields.map((field, fieldIdx) => (
                  <div key={fieldIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => {
                          const copy = [...formFields];
                          copy[fieldIdx].label = e.target.value;
                          setFormFields(copy);
                        }}
                        placeholder="Question title"
                        className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
                      />
                      <input
                        type="text"
                        value={field.id}
                        onChange={(e) => {
                          const copy = [...formFields];
                          copy[fieldIdx].id = e.target.value;
                          setFormFields(copy);
                        }}
                        placeholder="entry.XXXXXX"
                        className="w-28 bg-white border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-600 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...formFields];
                          copy.splice(fieldIdx, 1);
                          setFormFields(copy);
                        }}
                        className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Options Pills */}
                    <div className="flex flex-wrap gap-1">
                      {field.options.map((opt, optIdx) => (
                        <span
                          key={optIdx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-md text-[11px] font-semibold"
                        >
                          <span>{opt}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(fieldIdx, optIdx)}
                            className="text-emerald-700 hover:text-red-600 cursor-pointer ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {/* Add option */}
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={field.newOptInput || ""}
                          onChange={(e) => {
                            const copy = [...formFields];
                            copy[fieldIdx].newOptInput = e.target.value;
                            setFormFields(copy);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddOption(fieldIdx, field.newOptInput || "");
                            }
                          }}
                          placeholder="+ Add choice..."
                          className="bg-white border border-slate-300 rounded-md px-2 py-0.5 text-[11px] text-slate-800 outline-none w-28 focus:border-emerald-600"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddOption(fieldIdx, field.newOptInput || "")}
                          className="px-2 py-0.5 bg-slate-200 hover:bg-emerald-600 hover:text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                          title="Add option"
                        >
                          +
                        </button>
                      </div>

                      {/* Quick Choice Suggestions */}
                      {field.options.includes("Yes") && !field.options.includes("No") && (
                        <button
                          type="button"
                          onClick={() => handleAddOption(fieldIdx, "No")}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 border border-slate-300 text-slate-700 hover:bg-emerald-100 hover:text-emerald-800 font-semibold cursor-pointer"
                        >
                          + &quot;No&quot;
                        </button>
                      )}
                      {field.options.includes("No") && !field.options.includes("Yes") && (
                        <button
                          type="button"
                          onClick={() => handleAddOption(fieldIdx, "Yes")}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 border border-slate-300 text-slate-700 hover:bg-emerald-100 hover:text-emerald-800 font-semibold cursor-pointer"
                        >
                          + &quot;Yes&quot;
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Preview */}
              {livePreviewUrl && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">Test Generated Link:</span>
                    <a
                      href={livePreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-bold"
                    >
                      Open Form &rarr;
                    </a>
                  </div>
                  <p className="font-mono text-[9px] text-slate-500 truncate bg-white p-1 rounded border border-slate-200">
                    {livePreviewUrl}
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="text-xs font-semibold text-slate-500"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer"
                >
                  Save Form Setup
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
