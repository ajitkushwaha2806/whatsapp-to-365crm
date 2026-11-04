import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Workspace from "@/lib/models/Workspace";
import { testCRM365Connection } from "@/lib/crm365";
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

// POST /api/workspaces/[id]/crm/test - Test connection to Microsoft Dynamics 365 CRM
export async function POST(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const ws = await findWorkspace(id);
    if (!ws) {
      return jsonWithCors({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const crmConfig = {
      apiKey: body.apiKey || ws.integrations?.crm365?.apiKey,
      label: body.label || ws.integrations?.crm365?.label || "Leadio Test",
      apiUrl: body.apiUrl || ws.integrations?.crm365?.apiUrl || "https://www.api.365crm.io/wpaddwebsiteleads",
    };

    const testResult = await testCRM365Connection(crmConfig);

    if (testResult.success) {
      if (ws.integrations?.crm365) {
        ws.integrations.crm365.status = "connected";
        ws.markModified("integrations");
        await ws.save();
      }
    }

    return jsonWithCors(testResult);
  } catch (err) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}

