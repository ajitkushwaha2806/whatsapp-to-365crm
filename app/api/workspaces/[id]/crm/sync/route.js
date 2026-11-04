import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Workspace from "@/lib/models/Workspace";
import { syncLeadToCRM365 } from "@/lib/crm365";
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

// POST /api/workspaces/[id]/crm/sync - Sync a WhatsApp lead to Dynamics 365 CRM
export async function POST(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const ws = await findWorkspace(id);
    if (!ws) {
      return jsonWithCors({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const crm = ws.integrations?.crm365;
    if (!crm || !crm.isEnabled) {
      return jsonWithCors({ success: false, error: "365 CRM integration is not enabled for this workspace" }, { status: 400 });
    }

    const body = await request.json();
    const lead = body.lead;

    if (!lead || !lead.phone) {
      return jsonWithCors({ success: false, error: "Lead phone number is required" }, { status: 400 });
    }

    const syncResult = await syncLeadToCRM365(crm, lead);

    // Update lastSyncedAt
    ws.integrations.crm365.lastSyncedAt = new Date();
    ws.markModified("integrations");
    await ws.save();

    return jsonWithCors({
      success: true,
      message: "Lead synced to 365 CRM successfully",
      record: syncResult.record,
    });
  } catch (err) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}

