import connectToDatabase from "@/lib/db";
import Sheet from "@/lib/models/Sheet";
import Workspace from "@/lib/models/Workspace";
import { jsonWithCors, handleCorsOptions } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

function sanitizeSelectedValues(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (typeof input === "object") {
    return Object.entries(input).map(([key, value]) => ({
      key,
      value: typeof value === "string" ? value : String(value || ""),
    }));
  }
  return [];
}

function formatSheet(sheetDoc) {
  if (!sheetDoc) return null;
  const obj = typeof sheetDoc.toJSON === "function" ? sheetDoc.toJSON() : { ...sheetDoc };
  obj.id = obj.id || (obj._id ? `sheet_${obj._id.toString()}` : `sheet_${Date.now()}`);
  const rawCode = obj.workspaceCode || (obj._id ? obj._id.toString().slice(-4).toUpperCase() : "101");
  const suffix = rawCode.replace(/^(ws|gs|sheet)[-_:\s]*/i, "").toUpperCase() || "101";
  obj.workspaceCode = `WS-${suffix}`;
  obj.sheetCode = obj.workspaceCode;
  if (Array.isArray(obj.selectedValues)) {
    const mapObj = {};
    obj.selectedValues.forEach((item) => {
      if (item && item.key) mapObj[item.key] = item.value;
    });
    obj.selectedValues = mapObj;
  } else if (!obj.selectedValues) {
    obj.selectedValues = {};
  }
  return obj;
}

async function findSheetTarget(id) {
  if (!id) return null;

  // 1. Standalone Sheet collection match
  let sheet = await Sheet.findOne({ id });
  if (sheet) return { type: "standalone", sheet };

  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    sheet = await Sheet.findById(id);
    if (sheet) return { type: "standalone", sheet };
  }

  const stripped = id.replace(/^sheet_/, "");
  if (stripped.match(/^[0-9a-fA-F]{24}$/)) {
    sheet = await Sheet.findById(stripped);
    if (sheet) return { type: "standalone", sheet };
  }

  sheet = await Sheet.findOne({ id: `sheet_${id}` });
  if (sheet) return { type: "standalone", sheet };

  // 2. Search inside Workspace.integrations.googleSheets
  const workspaces = await Workspace.find({ "integrations.googleSheets": { $exists: true, $ne: [] } });
  for (const ws of workspaces) {
    const sheets = ws.integrations?.googleSheets || [];
    const idx = sheets.findIndex(
      (s) =>
        s.id === id ||
        s.id === stripped ||
        s.id === `sheet_${id}` ||
        (s._id && s._id.toString() === id) ||
        (s._id && s._id.toString() === stripped)
    );
    if (idx >= 0) {
      return { type: "workspace", ws, sheet: sheets[idx], index: idx };
    }
  }

  return null;
}

// GET /api/sheets/[id] - Fetch single sheet
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const target = await findSheetTarget(id);
    if (!target) {
      return jsonWithCors(
        { success: false, error: "Sheet not found" },
        { status: 404 }
      );
    }

    if (target.type === "workspace") {
      const formatted = {
        ...formatSheet(target.sheet),
        workspaceCode: target.ws.workspaceCode,
        workspaceId: target.ws.id,
        workspaceName: target.ws.name,
      };
      return jsonWithCors({ success: true, data: formatted });
    }

    return jsonWithCors({ success: true, data: formatSheet(target.sheet) });
  } catch (error) {
    console.error("GET /api/sheets/[id] error:", error);
    return jsonWithCors(
      { success: false, error: error.message || "Failed to fetch sheet" },
      { status: 500 }
    );
  }
}

// PUT /api/sheets/[id] - Update sheet
export async function PUT(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();

    const target = await findSheetTarget(id);
    if (!target) {
      return jsonWithCors(
        { success: false, error: "Sheet not found" },
        { status: 404 }
      );
    }

    const allowedFields = [
      "name",
      "location",
      "emoji",
      "baseUrl",
      "leadEntryKey",
      "leadEntryLabel",
      "assignedUsers",
      "fields",
      "isActive",
      "workspaceCode",
      "workspaceId",
    ];

    if (target.type === "workspace") {
      const sheet = target.sheet;
      allowedFields.forEach((key) => {
        if (body[key] !== undefined) {
          sheet[key] = body[key];
        }
      });

      if (body.selectedValues !== undefined) {
        sheet.selectedValues = sanitizeSelectedValues(body.selectedValues);
      }

      target.ws.markModified("integrations");
      await target.ws.save();

      const formatted = {
        ...formatSheet(sheet),
        workspaceCode: target.ws.workspaceCode,
        workspaceId: target.ws.id,
        workspaceName: target.ws.name,
      };

      return jsonWithCors({
        success: true,
        data: formatted,
        message: "Sheet updated successfully",
      });
    }

    // Standalone sheet
    const sheet = target.sheet;
    allowedFields.forEach((key) => {
      if (body[key] !== undefined) {
        sheet[key] = body[key];
      }
    });

    if (body.selectedValues !== undefined) {
      sheet.selectedValues = sanitizeSelectedValues(body.selectedValues);
    }

    await sheet.save();

    return jsonWithCors({
      success: true,
      data: formatSheet(sheet),
      message: "Sheet updated successfully",
    });
  } catch (error) {
    console.error("PUT /api/sheets/[id] error:", error);
    return jsonWithCors(
      { success: false, error: error.message || "Failed to update sheet" },
      { status: 500 }
    );
  }
}

// DELETE /api/sheets/[id] - Delete sheet
export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const target = await findSheetTarget(id);
    if (!target) {
      return jsonWithCors(
        { success: false, error: "Sheet not found" },
        { status: 404 }
      );
    }

    if (target.type === "workspace") {
      target.ws.integrations.googleSheets.splice(target.index, 1);
      target.ws.markModified("integrations");
      await target.ws.save();

      return jsonWithCors({
        success: true,
        message: "Sheet deleted successfully",
        id,
      });
    }

    await Sheet.deleteOne({ _id: target.sheet._id });

    return jsonWithCors({
      success: true,
      message: "Sheet deleted successfully",
      id,
    });
  } catch (error) {
    console.error("DELETE /api/sheets/[id] error:", error);
    return jsonWithCors(
      { success: false, error: error.message || "Failed to delete sheet" },
      { status: 500 }
    );
  }
}
