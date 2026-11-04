import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Workspace from "@/lib/models/Workspace";
import { jsonWithCors, handleCorsOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleCorsOptions();
}

async function findWorkspaceByIdOrCode(id) {
  let ws = await Workspace.findOne({ id });
  if (!ws && id.match(/^[0-9a-fA-F]{24}$/)) {
    ws = await Workspace.findById(id);
  }
  if (!ws) {
    ws = await Workspace.findOne({ workspaceCode: id.toUpperCase() });
  }
  return ws;
}

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const ws = await findWorkspaceByIdOrCode(id);
    if (!ws) {
      return jsonWithCors({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    return jsonWithCors({ success: true, workspace: ws.toJSON() });
  } catch (err) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const ws = await findWorkspaceByIdOrCode(id);
    if (!ws) {
      return jsonWithCors({ success: false, error: "Workspace not found" }, { status: 404 });
    }

    const body = await request.json();
    if (body.name) ws.name = body.name.trim();
    if (body.workspaceCode) ws.workspaceCode = body.workspaceCode.trim().toUpperCase();
    if (body.integrations) {
      if (body.integrations.googleSheets) {
        ws.integrations.googleSheets = body.integrations.googleSheets;
      }
      if (body.integrations.crm365) {
        ws.integrations.crm365 = { ...ws.integrations.crm365, ...body.integrations.crm365 };
      }
    }
    if (body.staff) {
      ws.staff = body.staff;
    }

    await ws.save();
    return jsonWithCors({ success: true, workspace: ws.toJSON() });
  } catch (err) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const ws = await findWorkspaceByIdOrCode(id);
    if (!ws) {
      return jsonWithCors({ success: false, error: "Workspace not found" }, { status: 404 });
    }
    ws.isActive = false;
    await ws.save();
    return jsonWithCors({ success: true, message: "Workspace deactivated" });
  } catch (err) {
    return jsonWithCors({ success: false, error: err.message }, { status: 500 });
  }
}

