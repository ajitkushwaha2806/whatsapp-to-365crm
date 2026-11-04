import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Workspace from "@/lib/models/Workspace";
import { jsonWithCors, handleCorsOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleCorsOptions();
}

async function findWorkspace(id) {
  let ws = null;
  if (id && id !== "default") {
    ws = await Workspace.findOne({ id });
    if (!ws && id.match(/^[0-9a-fA-F]{24}$/)) {
      ws = await Workspace.findById(id);
    }
    if (!ws) {
      ws = await Workspace.findOne({ workspaceCode: id.toUpperCase() });
    }
  }
  if (!ws) {
    ws = await Workspace.findOne({ isActive: true }).sort({ createdAt: -1 });
  }
  return ws;
}

// GET /api/workspaces/[id]/crm - Get 365 CRM configuration
export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const ws = await findWorkspace(id);
    if (!ws) {
      return jsonWithCors({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    const crm = ws.integrations?.crm365 || { isEnabled: false };
    return jsonWithCors({ success: true, crm365: crm });
  } catch (err) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}

// POST /api/workspaces/[id]/crm - Save 365 CRM settings
export async function POST(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const ws = await findWorkspace(id);
    if (!ws) {
      return jsonWithCors({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const crmData = await request.json();

    if (!ws.integrations) {
      ws.integrations = {};
    }

    ws.integrations.crm365 = {
      isEnabled: Boolean(crmData.isEnabled),
      apiKey: (crmData.apiKey || "").trim(),
      label: (crmData.label || "WhatsApp Lead").trim(),
      defaultComment: (crmData.defaultComment || "Lead captured via Leadio WhatsApp Extension").trim(),
      apiUrl: (crmData.apiUrl || "https://www.api.365crm.io/wpaddwebsiteleads").trim(),
      status: crmData.status || (crmData.isEnabled && crmData.apiKey ? "connected" : "disconnected"),
      lastSyncedAt: ws.integrations.crm365?.lastSyncedAt,
    };

    ws.markModified("integrations");
    await ws.save();

    return jsonWithCors({ success: true, crm365: ws.integrations.crm365 });
  } catch (err) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}

