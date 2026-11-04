import connectToDatabase from "@/lib/db";
import Sheet from "@/lib/models/Sheet";
import { jsonWithCors, handleCorsOptions } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return handleCorsOptions();
}

async function findSheetById(id) {
  if (!id) return null;
  let sheet = await Sheet.findOne({ id });
  if (sheet) return sheet;

  if (id.match(/^[0-9a-fA-F]{24}$/)) {
    sheet = await Sheet.findById(id);
    if (sheet) return sheet;
  }

  const stripped = id.replace(/^sheet_/, "");
  if (stripped.match(/^[0-9a-fA-F]{24}$/)) {
    sheet = await Sheet.findById(stripped);
    if (sheet) return sheet;
  }

  sheet = await Sheet.findOne({ id: `sheet_${id}` });
  return sheet;
}

function normalizeStaffMember(m) {
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
}

// GET /api/sheets/[id]/staff - Get staff members belonging to this sheet workspace
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const sheet = await findSheetById(id);

    if (!sheet) {
      return jsonWithCors({ success: false, error: "Sheet workspace not found" }, { status: 404 });
    }

    const staffList = (sheet.assignedUsers || []).map(normalizeStaffMember);
    return jsonWithCors({
      success: true,
      sheetId: sheet.id || sheet._id.toString(),
      sheetName: sheet.name,
      data: staffList,
      count: staffList.length,
    });
  } catch (error) {
    console.error("GET /api/sheets/[id]/staff error:", error);
    return jsonWithCors({ success: false, error: error.message || "Failed to load staff" }, { status: 500 });
  }
}

// POST /api/sheets/[id]/staff - Add or update staff member in this sheet workspace
export async function POST(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const sheet = await findSheetById(id);

    if (!sheet) {
      return jsonWithCors({ success: false, error: "Sheet workspace not found" }, { status: 404 });
    }

    const body = await request.json();
    if (!body || !body.name || !body.name.trim()) {
      return jsonWithCors({ success: false, error: "Staff member name is required" }, { status: 400 });
    }

    const incomingStaff = normalizeStaffMember(body);
    const existingList = (sheet.assignedUsers || []).map(normalizeStaffMember);

    const incomingCleanPhone = incomingStaff.phone ? incomingStaff.phone.replace(/\D/g, "") : "";
    const existingIndex = existingList.findIndex((m) => {
      if (incomingStaff.id && m.id && m.id === incomingStaff.id) return true;
      if (incomingCleanPhone && m.phone) {
        const mClean = m.phone.replace(/\D/g, "");
        if (mClean && mClean === incomingCleanPhone) return true;
      }
      return false;
    });

    if (existingIndex >= 0) {
      existingList[existingIndex] = {
        ...existingList[existingIndex],
        ...incomingStaff,
      };
    } else {
      existingList.push(incomingStaff);
    }

    sheet.assignedUsers = existingList;
    await sheet.save();

    return jsonWithCors({
      success: true,
      message: existingIndex >= 0 ? "Staff member updated" : "Staff member added to sheet",
      data: sheet.assignedUsers,
      sheetId: sheet.id || sheet._id.toString(),
      sheetName: sheet.name,
    });
  } catch (error) {
    console.error("POST /api/sheets/[id]/staff error:", error);
    return jsonWithCors({ success: false, error: error.message || "Failed to save staff member" }, { status: 500 });
  }
}

// DELETE /api/sheets/[id]/staff - Remove staff member from this sheet workspace
export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const sheet = await findSheetById(id);

    if (!sheet) {
      return jsonWithCors({ success: false, error: "Sheet workspace not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const targetIdOrName = url.searchParams.get("staffId") || url.searchParams.get("name");

    let bodyTarget = null;
    try {
      const body = await request.json();
      bodyTarget = body.staffId || body.id || body.name;
    } catch {}

    const toDelete = targetIdOrName || bodyTarget;
    if (!toDelete) {
      return jsonWithCors({ success: false, error: "Staff member identifier is required" }, { status: 400 });
    }

    const currentList = (sheet.assignedUsers || []).map(normalizeStaffMember);
    const filtered = currentList.filter(
      (m) => m.id !== toDelete && m.name.toLowerCase() !== toDelete.toLowerCase()
    );

    sheet.assignedUsers = filtered;
    await sheet.save();

    return jsonWithCors({
      success: true,
      message: `Staff member removed from ${sheet.name}`,
      data: sheet.assignedUsers,
      sheetId: sheet.id || sheet._id.toString(),
      sheetName: sheet.name,
    });
  } catch (error) {
    console.error("DELETE /api/sheets/[id]/staff error:", error);
    return jsonWithCors({ success: false, error: error.message || "Failed to remove staff member" }, { status: 500 });
  }
}

