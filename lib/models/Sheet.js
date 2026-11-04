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
    isActive: { type: Boolean, default: true },
    status: { type: String, default: "active" },
  },
  { _id: false }
);

const SheetSchema = new mongoose.Schema(
  {
    id: { type: String, index: true },
    name: { type: String, required: true, trim: true },
    location: { type: String, default: "Google Sheets" },
    emoji: { type: String, default: "" },
    baseUrl: { type: String, default: "" },
    leadEntryKey: { type: String, default: "" },
    leadEntryLabel: { type: String, default: "Customer Phone / WhatsApp Lead" },
    assignedUsers: [StaffMemberSchema],
    fields: [FieldSchema],
    selectedValues: [KeyValueSchema],
    isActive: { type: Boolean, default: true },
    workspaceCode: { type: String, trim: true },
    workspaceId: { type: String, default: "default" },
    createdBy: { type: String, default: "system" },
  },
  {
    timestamps: true,
  }
);

// Pre-validate to ensure `id` is populated, selectedValues is converted to array, and assignedUsers is normalized
SheetSchema.pre("validate", function () {
  if (!this.id && this._id) {
    this.id = `sheet_${this._id.toString()}`;
  }

  if (!this.workspaceCode) {
    this.workspaceCode = this._id
      ? `WS-${this._id.toString().slice(-4).toUpperCase()}`
      : `WS-${Math.floor(1000 + Math.random() * 9000)}`;
  } else if (!this.workspaceCode.startsWith("WS-")) {
    const clean = this.workspaceCode.replace(/^(ws|gs|sheet)[-_:\s]*/i, "").toUpperCase();
    this.workspaceCode = `WS-${clean || "1001"}`;
  }

  if (this.assignedUsers && Array.isArray(this.assignedUsers)) {
    this.assignedUsers = this.assignedUsers
      .filter((m) => m && (typeof m === "string" ? m.trim().length > 0 : m.name && m.name.trim().length > 0))
      .map((m) => {
        if (typeof m === "string") {
          return {
            id: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: m.trim(),
            phone: "",
            password: "",
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
          isActive: active,
          status: active ? "active" : "inactive",
        };
      });
  }

  if (this.selectedValues && !Array.isArray(this.selectedValues)) {
    if (typeof this.selectedValues === "object") {
      this.selectedValues = Object.entries(this.selectedValues).map(([key, value]) => ({
        key,
        value: typeof value === "string" ? value : String(value || ""),
      }));
    }
  }
});

// Format output to client so selectedValues returns as a clean { [key]: value } object
SheetSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj.id || (obj._id ? `sheet_${obj._id.toString()}` : `sheet_${Date.now()}`);
  obj.workspaceCode = obj.workspaceCode || (obj._id ? `WS-${obj._id.toString().slice(-4).toUpperCase()}` : "WS-101");
  if (Array.isArray(obj.selectedValues)) {
    const mapObj = {};
    obj.selectedValues.forEach((item) => {
      if (item && item.key) {
        mapObj[item.key] = item.value;
      }
    });
    obj.selectedValues = mapObj;
  } else if (!obj.selectedValues) {
    obj.selectedValues = {};
  }
  return obj;
};

if (mongoose.models && mongoose.models.Sheet) {
  delete mongoose.models.Sheet;
}

export default mongoose.model("Sheet", SheetSchema);
