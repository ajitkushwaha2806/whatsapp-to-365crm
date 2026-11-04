import mongoose from "mongoose";

const FieldSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    options: [{ type: String }],
    defaultValue: { type: String, default: "" },
  },
  { _id: false }
);

const KeyValueSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    value: { type: String, default: "" },
  },
  { _id: false }
);

const StaffMemberSchema = new mongoose.Schema(
  {
    id: { type: String },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    password: { type: String, default: "", trim: true },
    role: { type: String, default: "staff" },
    isActive: { type: Boolean, default: true },
    status: { type: String, default: "active" },
  },
  { _id: false }
);

const GoogleSheetIntegrationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    location: { type: String, default: "Google Sheets" },
    baseUrl: { type: String, default: "" },
    leadEntryKey: { type: String, default: "" },
    leadEntryLabel: { type: String, default: "Customer Phone / WhatsApp Lead" },
    fields: [FieldSchema],
    selectedValues: [KeyValueSchema],
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const CRM365IntegrationSchema = new mongoose.Schema(
  {
    isEnabled: { type: Boolean, default: false },
    apiKey: { type: String, default: "", trim: true }, // Authorization: Your API Key
    label: { type: String, default: "WhatsApp Lead", trim: true }, // Configuration label
    defaultComment: { type: String, default: "Lead captured via Leadio WhatsApp Extension", trim: true },
    apiUrl: { type: String, default: "https://www.api.365crm.io/wpaddwebsiteleads", trim: true },
    status: { type: String, default: "disconnected" }, // "connected" | "disconnected"
    lastSyncedAt: { type: Date },
  },
  { _id: false }
);

const WorkspaceSchema = new mongoose.Schema(
  {
    id: { type: String, index: true },
    name: { type: String, required: true, trim: true, default: "Default Workspace" },
    workspaceCode: { type: String, trim: true, index: true }, // e.g. "WS-1001"
    ownerId: { type: String, default: "system" },
    isActive: { type: Boolean, default: true },

    // 1. Staff belongs directly to Workspace (NOT to individual sheets)
    staff: [StaffMemberSchema],

    // 2. Integrations inside Workspace
    integrations: {
      googleSheets: [GoogleSheetIntegrationSchema],
      crm365: { type: CRM365IntegrationSchema, default: () => ({}) },
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook
WorkspaceSchema.pre("validate", function () {
  if (!this.id && this._id) {
    this.id = `ws_${this._id.toString()}`;
  }

  if (!this.workspaceCode) {
    this.workspaceCode = this._id
      ? `WS-${this._id.toString().slice(-4).toUpperCase()}`
      : `WS-${Math.floor(1000 + Math.random() * 9000)}`;
  } else if (!this.workspaceCode.startsWith("WS-")) {
    const clean = this.workspaceCode.replace(/^(ws|gs|sheet)[-_:\s]*/i, "").toUpperCase();
    this.workspaceCode = `WS-${clean || "1001"}`;
  }

  // Normalize staff
  if (this.staff && Array.isArray(this.staff)) {
    this.staff = this.staff
      .filter((m) => m && (typeof m === "string" ? m.trim().length > 0 : m.name && m.name.trim().length > 0))
      .map((m) => {
        if (typeof m === "string") {
          return {
            id: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: m.trim(),
            phone: "",
            password: "",
            role: "staff",
            isActive: true,
            status: "active",
          };
        }
        const active = m.isActive !== undefined ? Boolean(m.isActive) : m.status !== "inactive";
        return {
          id: m.id || `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: (m.name || "").trim(),
          phone: (m.phone || "").trim(),
          password: (m.password || "").trim(),
          role: m.role || "staff",
          isActive: active,
          status: active ? "active" : "inactive",
        };
      });
  }
});

WorkspaceSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj.id || (obj._id ? `ws_${obj._id.toString()}` : `ws_${Date.now()}`);
  obj.workspaceCode = obj.workspaceCode || (obj._id ? `WS-${obj._id.toString().slice(-4).toUpperCase()}` : "WS-101");
  
  // Format each google sheet's selectedValues to key-value map for client
  if (obj.integrations?.googleSheets && Array.isArray(obj.integrations.googleSheets)) {
    obj.integrations.googleSheets = obj.integrations.googleSheets.map((sheet) => {
      const s = { ...sheet };
      if (Array.isArray(s.selectedValues)) {
        const mapObj = {};
        s.selectedValues.forEach((item) => {
          if (item && item.key) mapObj[item.key] = item.value;
        });
        s.selectedValues = mapObj;
      } else if (!s.selectedValues) {
        s.selectedValues = {};
      }
      return s;
    });
  }
  return obj;
};

if (mongoose.models && mongoose.models.Workspace) {
  delete mongoose.models.Workspace;
}

export default mongoose.model("Workspace", WorkspaceSchema);

