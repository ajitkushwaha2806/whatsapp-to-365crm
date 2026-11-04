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

// GET /api/workspaces/[id]/sheets - List all connected Google Sheets in this workspace
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const ws = await findWorkspace(id);
    if (!ws) {
      return jsonWithCors({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    const sheets = ws.integrations?.googleSheets || [];
    return jsonWithCors({ success: true, googleSheets: sheets });
  } catch (err) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/workspaces/[id]/sheets - Connect or update a Google Sheet inside this workspace
export async function POST(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const ws = await findWorkspace(id);
    if (!ws) {
      return jsonWithCors({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const sheetData = await request.json();
    if (!sheetData.name || !sheetData.name.trim()) {
      return jsonWithCors({ success: false, error: "Google Sheet name is required" }, { status: 400 });
    }

    if (!ws.integrations) {
      ws.integrations = { googleSheets: [] };
    }
    if (!Array.isArray(ws.integrations.googleSheets)) {
      ws.integrations.googleSheets = [];
    }

    const sheetId = sheetData.id || `sheet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const existingIdx = ws.integrations.googleSheets.findIndex((s) => s.id === sheetId);

    const sheetItem = {
      id: sheetId,
      name: sheetData.name.trim(),
      location: sheetData.location || "Google Sheets",
      baseUrl: sheetData.baseUrl || "",
      leadEntryKey: sheetData.leadEntryKey || "",
      leadEntryLabel: sheetData.leadEntryLabel || "Customer Phone / WhatsApp Lead",
      fields: sheetData.fields || [],
      selectedValues: Array.isArray(sheetData.selectedValues)
        ? sheetData.selectedValues
        : Object.entries(sheetData.selectedValues || {}).map(([key, value]) => ({ key, value: String(value) })),
      isActive: sheetData.isActive !== undefined ? Boolean(sheetData.isActive) : true,
    };

    if (existingIdx >= 0) {
      ws.integrations.googleSheets[existingIdx] = sheetItem;
    } else {
      ws.integrations.googleSheets.push(sheetItem);
    }

    ws.markModified("integrations");
    await ws.save();

    return jsonWithCors({
      success: true,
      googleSheets: ws.integrations.googleSheets,
      sheet: sheetItem,
    });
  } catch (err) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/workspaces/[id]/sheets?sheetId=xxx
export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const ws = await findWorkspace(id);
    if (!ws) {
      return jsonWithCors({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const sheetId = url.searchParams.get("sheetId") || url.searchParams.get("id");

    if (!sheetId) {
      return jsonWithCors({ success: false, error: "Sheet ID is required" }, { status: 400 });
    }

    if (ws.integrations?.googleSheets) {
      ws.integrations.googleSheets = ws.integrations.googleSheets.filter((s) => s.id !== sheetId);
      ws.markModified("integrations");
      await ws.save();
    }

    return jsonWithCors({ success: true, googleSheets: ws.integrations?.googleSheets || [] });
  } catch (err) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}

