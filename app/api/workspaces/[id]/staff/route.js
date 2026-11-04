import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Workspace from "@/lib/models/Workspace";
import { jsonWithCors, handleCorsOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleCorsOptions();
}

async function findWorkspace(id) {
  let ws = await Workspace.findOne({ id });
  if (!ws && id.match(/^[0-9a-fA-F]{24}$/)) {
    ws = await Workspace.findById(id);
  }
  if (!ws) {
    ws = await Workspace.findOne({ workspaceCode: id.toUpperCase() });
  }
  return ws;
}

// GET /api/workspaces/[id]/staff - Get staff belonging directly to this workspace
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const ws = await findWorkspace(id);
    if (!ws) {
      return jsonWithCors({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    return jsonWithCors({ success: true, staff: ws.staff || [] });
  } catch (err) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/workspaces/[id]/staff - Add or update staff member in this workspace
export async function POST(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const ws = await findWorkspace(id);
    if (!ws) {
      return jsonWithCors({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const body = await request.json();
    const { id: memberId, name, phone, password, isActive, status, role } = body || {};

    if (!name || !name.trim()) {
      return jsonWithCors({ success: false, error: "Staff member name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();
    const active = isActive !== undefined ? Boolean(isActive) : status !== "inactive";

    if (!Array.isArray(ws.staff)) {
      ws.staff = [];
    }

    const existingIdx = ws.staff.findIndex(
      (m) => (memberId && m.id === memberId) || (phone && m.phone === phone.trim()) || m.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existingIdx >= 0) {
      // Update existing
      ws.staff[existingIdx].name = trimmedName;
      if (phone !== undefined) ws.staff[existingIdx].phone = phone.trim();
      if (password) ws.staff[existingIdx].password = password.trim();
      if (role) ws.staff[existingIdx].role = role;
      ws.staff[existingIdx].isActive = active;
      ws.staff[existingIdx].status = active ? "active" : "inactive";
    } else {
      // Add new staff
      ws.staff.push({
        id: memberId || `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: trimmedName,
        phone: (phone || "").trim(),
        password: (password || "").trim(),
        role: role || "staff",
        isActive: active,
        status: active ? "active" : "inactive",
      });
    }

    ws.markModified("staff");
    await ws.save();

    return jsonWithCors({ success: true, staff: ws.staff });
  } catch (err) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/workspaces/[id]/staff?memberId=xxx
export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const ws = await findWorkspace(id);
    if (!ws) {
      return jsonWithCors({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const memberId = url.searchParams.get("memberId") || url.searchParams.get("id");

    if (!memberId) {
      return jsonWithCors({ success: false, error: "Member ID is required" }, { status: 400 });
    }

    ws.staff = (ws.staff || []).filter((m) => m.id !== memberId && m.name !== memberId);
    ws.markModified("staff");
    await ws.save();

    return jsonWithCors({ success: true, staff: ws.staff });
  } catch (err) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}

