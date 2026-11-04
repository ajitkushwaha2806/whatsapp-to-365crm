import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Sheet from "@/lib/models/Sheet";
import Workspace from "@/lib/models/Workspace";
import { jsonWithCors, handleCorsOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleCorsOptions();
}

function sanitizeSelectedValues(selectedValues) {
  if (Array.isArray(selectedValues)) {
    return selectedValues
      .filter((item) => item && item.key)
      .map((item) => ({ key: String(item.key), value: String(item.value || "") }));
  }
  if (selectedValues && typeof selectedValues === "object") {
    return Object.entries(selectedValues).map(([key, value]) => ({
      key: String(key),
      value: String(value || ""),
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

// GET /api/sheets - Fetch all sheets across all Workspaces & Sheet collection
export async function GET(request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    let results = [];

    if (workspaceId) {
      const activeWs = await Workspace.findOne({
        $or: [
          { id: workspaceId },
          { workspaceCode: workspaceId.toUpperCase() },
          { _id: workspaceId.match(/^[0-9a-fA-F]{24}$/) ? workspaceId : null },
        ].filter(Boolean),
      });

      if (activeWs && activeWs.integrations?.googleSheets?.length > 0) {
        results = activeWs.integrations.googleSheets.map((s) => ({
          ...formatSheet(s),
          workspaceCode: activeWs.workspaceCode,
          workspaceId: activeWs.id,
          workspaceName: activeWs.name,
        }));
      }

      const standalone = await Sheet.find({ workspaceId }).sort({ createdAt: -1 });
      const formattedStandalone = (standalone || []).map(formatSheet);
      const seenIds = new Set(results.map((r) => r.id));
      for (const sh of formattedStandalone) {
        if (!seenIds.has(sh.id)) {
          results.push(sh);
          seenIds.add(sh.id);
        }
      }
    } else {
      // Fetch all workspaces and aggregate all their sheets
      const allWorkspaces = await Workspace.find({ isActive: true }).sort({ createdAt: -1 });
      for (const ws of allWorkspaces) {
        if (ws.integrations?.googleSheets && ws.integrations.googleSheets.length > 0) {
          ws.integrations.googleSheets.forEach((s) => {
            results.push({
              ...formatSheet(s),
              workspaceCode: ws.workspaceCode,
              workspaceId: ws.id,
              workspaceName: ws.name,
            });
          });
        }
      }

      // Also standalone sheets
      const standalone = await Sheet.find().sort({ createdAt: -1 });
      const formattedStandalone = (standalone || []).map(formatSheet);
      const seenIds = new Set(results.map((r) => r.id));
      for (const sh of formattedStandalone) {
        if (!seenIds.has(sh.id)) {
          results.push(sh);
          seenIds.add(sh.id);
        }
      }
    }

    return jsonWithCors({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error("GET /api/sheets error:", error);
    return jsonWithCors(
      { success: false, error: error.message || "Failed to fetch sheets from database" },
      { status: 500 }
    );
  }
}

// POST /api/sheets - Create a new sheet in DB and active Workspace
export async function POST(request) {
  try {
    await connectToDatabase();

    const body = await request.json();

    if (!body.name || !body.name.trim()) {
      return jsonWithCors(
        { success: false, error: "Sheet name is required" },
        { status: 400 }
      );
    }

    const safeSelectedValues = sanitizeSelectedValues(body.selectedValues);
    const sheetId = body.id || `sheet_${Date.now()}`;

    // Add to active Workspace
    const activeWs = await Workspace.findOne({ isActive: true });
    if (activeWs) {
      if (!activeWs.integrations) activeWs.integrations = {};
      if (!Array.isArray(activeWs.integrations.googleSheets)) activeWs.integrations.googleSheets = [];

      activeWs.integrations.googleSheets.push({
        id: sheetId,
        name: body.name.trim(),
        location: body.location || "Google Sheets",
        baseUrl: body.baseUrl || "",
        leadEntryKey: body.leadEntryKey || "",
        leadEntryLabel: body.leadEntryLabel || "Customer Phone / WhatsApp Lead",
        fields: Array.isArray(body.fields) ? body.fields : [],
        selectedValues: safeSelectedValues,
        isActive: body.isActive !== undefined ? body.isActive : true,
      });

      activeWs.markModified("integrations");
      await activeWs.save();
    }

    // Save in Sheet collection for fallback
    const newSheet = await Sheet.create({
      id: sheetId,
      name: body.name.trim(),
      location: body.location || "Google Sheets",
      emoji: body.emoji || "",
      baseUrl: body.baseUrl || "",
      leadEntryKey: body.leadEntryKey || "",
      leadEntryLabel: body.leadEntryLabel || "Customer Phone / WhatsApp Lead",
      assignedUsers: Array.isArray(body.assignedUsers) ? body.assignedUsers : [],
      fields: Array.isArray(body.fields) ? body.fields : [],
      selectedValues: safeSelectedValues,
      isActive: body.isActive !== undefined ? body.isActive : true,
      workspaceId: body.workspaceId || (activeWs ? activeWs.id : "default"),
      workspaceCode: activeWs ? activeWs.workspaceCode : "WS-1001",
    });

    const formatted = formatSheet(newSheet);

    return jsonWithCors({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("POST /api/sheets error:", error);
    return jsonWithCors(
      { success: false, error: error.message || "Failed to create sheet" },
      { status: 500 }
    );
  }
}
