import connectToDatabase from "@/lib/db";
import Sheet from "@/lib/models/Sheet";
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

async function findSheetById(id) {
  if (!id) return null;
  // 1. Direct match on id field
  let sheet = await Sheet.findOne({ id });
  if (sheet) return sheet;

  // 2. Direct match on _id if id is valid ObjectId
  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    sheet = await Sheet.findById(id);
    if (sheet) return sheet;
  }

  // 3. Match on stripped "sheet_" prefix if it wraps an ObjectId
  const stripped = id.replace(/^sheet_/, "");
  if (stripped.match(/^[0-9a-fA-F]{24}$/)) {
    sheet = await Sheet.findById(stripped);
    if (sheet) return sheet;
  }

  // 4. Try matching with sheet_ prefix
  sheet = await Sheet.findOne({ id: `sheet_${id}` });
  return sheet;
}

// GET /api/sheets/[id] - Fetch single sheet
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const sheet = await findSheetById(id);
    if (!sheet) {
      return jsonWithCors(
        { success: false, error: "Sheet not found" },
        { status: 404 }
      );
    }

    return jsonWithCors({ success: true, data: formatSheet(sheet) });
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

    const sheet = await findSheetById(id);
    if (!sheet) {
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

    const sheet = await findSheetById(id);
    if (!sheet) {
      return jsonWithCors(
        { success: false, error: "Sheet not found" },
        { status: 404 }
      );
    }

    await Sheet.deleteOne({ _id: sheet._id });

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
