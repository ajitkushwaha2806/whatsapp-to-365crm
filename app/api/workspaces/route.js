import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Workspace from "@/lib/models/Workspace";
import { jsonWithCors, handleCorsOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleCorsOptions();
}

// GET /api/workspaces - Fetch all workspaces
export async function GET() {
  try {
    await connectToDatabase();
    const workspaces = await Workspace.find({ isActive: true }).sort({ createdAt: -1 });
    const formatted = (workspaces || []).map((w) => (typeof w.toJSON === "function" ? w.toJSON() : w));
    return jsonWithCors({ success: true, workspaces: formatted });
  } catch (error) {
    console.error("[API Workspaces GET Error]:", error);
    return jsonWithCors({ success: false, error: error.message || "Failed to load workspaces" }, { status: 500 });
  }
}

// POST /api/workspaces - Create new workspace
export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const name = (body.name || "").trim() || "New Workspace";
    const workspaceCode = body.workspaceCode ? body.workspaceCode.trim().toUpperCase() : undefined;

    const newWs = await Workspace.create({
      name,
      workspaceCode,
      ownerId: body.ownerId || "system",
      isActive: true,
      staff: body.staff || [],
      integrations: {
        googleSheets: body.googleSheets || [],
        crm365: body.crm365 || { isEnabled: false },
      },
    });

    return jsonWithCors({ success: true, workspace: newWs.toJSON() }, { status: 201 });
  } catch (error) {
    console.error("[API Workspaces POST Error]:", error);
    return jsonWithCors({ success: false, error: error.message || "Failed to create workspace" }, { status: 500 });
  }
}

