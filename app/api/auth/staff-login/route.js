import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Workspace from "@/lib/models/Workspace";
import Sheet from "@/lib/models/Sheet";
import { jsonWithCors, handleCorsOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleCorsOptions();
}

const cleanSuffix = (str) =>
  String(str || "")
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/^(ws|gs|sheet|s)[-_:\s]*/i, "");

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { sheetId, workspaceId, phone, name, password, identifier } = body || {};

    const inputWorkspaceCode = (workspaceId || sheetId || "").trim();
    const inputPhone = (phone || identifier || name || "").trim();
    const inputPassword = (password || "").trim();

    if (!inputPhone) {
      return jsonWithCors({ success: false, error: "Please enter your registered phone number" }, { status: 400 });
    }

    if (!inputPassword) {
      return jsonWithCors({ success: false, error: "Please enter your password" }, { status: 400 });
    }

    const allWorkspaces = await Workspace.find({ isActive: true });
    const cleanPhone = inputPhone.replace(/\D/g, "");

    // If Workspace ID is omitted, search across ALL workspaces by phone and password
    if (!inputWorkspaceCode) {
      let foundWs = null;
      let foundStaff = null;

      for (const ws of allWorkspaces) {
        const staffList = Array.isArray(ws.staff) ? ws.staff : [];
        const matched = staffList.find((member) => {
          const mPhone = String(member.phone || "").replace(/\D/g, "");
          const mName = String(member.name || "").trim().toLowerCase();
          const phoneMatches =
            (cleanPhone && mPhone && (mPhone === cleanPhone || mPhone.endsWith(cleanPhone) || cleanPhone.endsWith(mPhone))) ||
            mName === inputPhone.toLowerCase();
          return phoneMatches && member.password === inputPassword;
        });

        if (matched) {
          foundWs = ws;
          foundStaff = matched;
          break;
        }
      }

      if (foundWs && foundStaff) {
        const wsObj = foundWs.toJSON ? foundWs.toJSON() : foundWs;
        return jsonWithCors({
          success: true,
          user: {
            id: foundStaff.id || `staff_${foundStaff.name}`,
            name: foundStaff.name,
            phone: foundStaff.phone,
            role: "staff",
            workspaceId: foundWs.id,
            workspaceCode: foundWs.workspaceCode,
            workspaceName: foundWs.name,
            crm: foundWs.integrations?.crm365,
          },
          workspace: wsObj,
          accessibleSheets: foundWs.integrations?.googleSheets || [],
          crm: foundWs.integrations?.crm365,
        });
      }

      return jsonWithCors(
        { success: false, error: "No staff account found with this phone number and password." },
        { status: 401 }
      );
    }

    const inputClean = inputWorkspaceCode.toLowerCase();
    const inputSuffix = cleanSuffix(inputWorkspaceCode);

    // 2. Look in Workspace model with specified workspace code
    let targetWs = allWorkspaces.find((w) => {
      const wId = (w.id || "").toLowerCase();
      const wCode = (w.workspaceCode || "").toLowerCase();
      const wSuffix = cleanSuffix(w.workspaceCode);
      const wMongoId = (w._id ? w._id.toString() : "").toLowerCase();

      return (
        wCode === inputClean ||
        wId === inputClean ||
        (inputSuffix.length >= 2 && (wSuffix === inputSuffix || wCode.endsWith(inputSuffix) || wMongoId.endsWith(inputSuffix)))
      );
    });

    if (targetWs) {
      const staffList = Array.isArray(targetWs.staff) ? targetWs.staff : [];
      const cleanPhone = inputPhone.replace(/\D/g, "");

      const matchedStaff = staffList.find((member) => {
        const mPhone = String(member.phone || "").replace(/\D/g, "");
        const mName = String(member.name || "").trim().toLowerCase();
        const mPassword = String(member.password || "").trim();

        const phoneMatches =
          (cleanPhone && mPhone && (mPhone === cleanPhone || mPhone.endsWith(cleanPhone) || cleanPhone.endsWith(mPhone))) ||
          mName === inputPhone.toLowerCase();

        const passwordMatches = mPassword === inputPassword;
        return phoneMatches && passwordMatches;
      });

      if (!matchedStaff) {
        return jsonWithCors(
          { success: false, error: "Invalid staff phone number or password for this workspace." },
          { status: 401 }
        );
      }

      if (matchedStaff.isActive === false || matchedStaff.status === "inactive") {
        return jsonWithCors(
          { success: false, error: "Your account is marked inactive in this workspace. Contact your administrator." },
          { status: 403 }
        );
      }

      return jsonWithCors({
        success: true,
        user: {
          id: matchedStaff.id,
          name: matchedStaff.name,
          phone: matchedStaff.phone,
          role: "staff",
          isActive: true,
          workspaceId: targetWs.id,
          workspaceCode: targetWs.workspaceCode,
          workspaceName: targetWs.name,
        },
        workspace: targetWs.toJSON(),
        accessibleSheets: targetWs.integrations?.googleSheets || [],
        crm: targetWs.integrations?.crm365,
      });
    }

    // 3. Fallback: check legacy Sheet collection if not yet migrated
    const allSheets = await Sheet.find({});
    const targetSheet = allSheets.find((s) => {
      const sId = (s.id || "").toLowerCase();
      const sCode = (s.workspaceCode || "").toLowerCase();
      const sCodeSuffix = cleanSuffix(s.workspaceCode);
      const sMongoId = (s._id ? s._id.toString() : "").toLowerCase();

      return (
        sCode === inputClean ||
        sId === inputClean ||
        (inputSuffix.length >= 2 && (sCodeSuffix === inputSuffix || sCode.endsWith(inputSuffix) || sMongoId.endsWith(inputSuffix)))
      );
    });

    if (targetSheet) {
      const staffList = Array.isArray(targetSheet.assignedUsers) ? targetSheet.assignedUsers : [];
      const cleanPhone = inputPhone.replace(/\D/g, "");

      const matchedStaff = staffList.find((member) => {
        const mPhone = String(member.phone || "").replace(/\D/g, "");
        const mName = String(member.name || "").trim().toLowerCase();
        const mPassword = String(member.password || "").trim();

        const phoneMatches =
          (cleanPhone && mPhone && (mPhone === cleanPhone || mPhone.endsWith(cleanPhone) || cleanPhone.endsWith(mPhone))) ||
          mName === inputPhone.toLowerCase();

        return phoneMatches && mPassword === inputPassword;
      });

      if (!matchedStaff) {
        return jsonWithCors(
          { success: false, error: "Invalid staff credentials." },
          { status: 401 }
        );
      }

      return jsonWithCors({
        success: true,
        user: {
          id: matchedStaff.id,
          name: matchedStaff.name,
          phone: matchedStaff.phone,
          role: "staff",
          isActive: true,
          workspaceCode: targetSheet.workspaceCode || "WS-1001",
        },
        accessibleSheets: [targetSheet],
      });
    }

    return jsonWithCors(
      { success: false, error: `No workspace found matching "${inputWorkspaceCode}". Please check your Workspace ID.` },
      { status: 404 }
    );
  } catch (error) {
    console.error("[Staff Login API Error]:", error);
    return jsonWithCors({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
