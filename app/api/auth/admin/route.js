import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/lib/models/User";
import Workspace from "@/lib/models/Workspace";
import { jsonWithCors, handleCorsOptions } from "@/lib/cors";

export async function OPTIONS() {
  return handleCorsOptions();
}

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { action = "login", name, companyName, company, identifier, email, phone, password } = body || {};

    const inputIdentifier = String(identifier || email || phone || "").trim();
    const inputPassword = String(password || "").trim();

    if (!inputPassword) {
      return jsonWithCors(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    // --- 1. REGISTRATION ---
    if (action === "register") {
      const inputName = String(name || "").trim();
      const inputCompany = String(companyName || company || "").trim();

      if (!inputName) {
        return jsonWithCors(
          { success: false, error: "Please enter your full name" },
          { status: 400 }
        );
      }
      if (!inputCompany) {
        return jsonWithCors(
          { success: false, error: "Please enter your Company / Business name (this will be your default workspace)" },
          { status: 400 }
        );
      }
      if (!inputIdentifier) {
        return jsonWithCors(
          { success: false, error: "Email or phone number is required" },
          { status: 400 }
        );
      }

      // Check if user already exists
      const isEmail = inputIdentifier.includes("@");
      const query = isEmail
        ? { email: inputIdentifier.toLowerCase() }
        : { phone: inputIdentifier };

      const existingUser = await User.findOne(query);
      if (existingUser) {
        return jsonWithCors(
          { success: false, error: "An account with this email/phone already exists. Please sign in." },
          { status: 400 }
        );
      }

      const newUser = await User.create({
        name: inputName,
        companyName: inputCompany,
        email: isEmail ? inputIdentifier.toLowerCase() : "",
        phone: !isEmail ? inputIdentifier : "",
        password: inputPassword,
        role: "admin",
        isActive: true,
      });

      // The company name automatically becomes their default workspace!
      const companyWs = await Workspace.create({
        name: inputCompany,
        workspaceCode: "WS-1001",
        ownerId: newUser._id.toString(),
        isActive: true,
        staff: [],
        integrations: {
          googleSheets: [],
          crm365: {
            isEnabled: false,
            apiKey: "",
            label: inputCompany,
            defaultComment: `Lead captured via Leadio for ${inputCompany}`,
            apiUrl: "https://www.api.365crm.io/wpaddwebsiteleads",
            status: "disconnected",
          },
        },
      });

      return jsonWithCors({
        success: true,
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          companyName: newUser.companyName,
          email: newUser.email,
          phone: newUser.phone,
          role: "admin",
          isActive: true,
        },
        workspace: companyWs.toJSON ? companyWs.toJSON() : companyWs,
        message: "Admin account and company workspace registered successfully",
      });
    }

    // --- 2. LOGIN ---
    if (!inputIdentifier) {
      return jsonWithCors(
        { success: false, error: "Please enter your phone number" },
        { status: 400 }
      );
    }

    // Search in DB
    const isEmail = inputIdentifier.includes("@");
    const cleanDigits = inputIdentifier.replace(/\D/g, "");
    const last10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

    const userQuery = isEmail
      ? { email: inputIdentifier.toLowerCase(), role: "admin" }
      : {
          $or: [
            { phone: inputIdentifier },
            ...(cleanDigits ? [
              { phone: cleanDigits },
              { phone: new RegExp(`${last10}$`) },
              { phone: `+91${last10}` },
              { phone: `+91 ${last10}` },
            ] : []),
            { email: inputIdentifier.toLowerCase() },
            { name: new RegExp(`^${inputIdentifier}$`, "i") },
          ],
          role: "admin",
        };

    const user = await User.findOne(userQuery);
    if (!user) {
      return jsonWithCors(
        { success: false, error: "Admin account not found. Please check your credentials or register." },
        { status: 404 }
      );
    }

    if (user.password !== inputPassword) {
      return jsonWithCors(
        { success: false, error: "Incorrect password. Please try again." },
        { status: 401 }
      );
    }

    const userWorkspace = await Workspace.findOne({
      $or: [
        { ownerId: user._id.toString() },
        { name: user.companyName },
      ],
      isActive: true,
    }).sort({ createdAt: -1 });

    return jsonWithCors({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        companyName: user.companyName,
        email: user.email,
        phone: user.phone,
        role: "admin",
        isActive: user.isActive,
      },
      workspace: userWorkspace ? (userWorkspace.toJSON ? userWorkspace.toJSON() : userWorkspace) : null,
    });
  } catch (error) {
    console.error("Admin auth error:", error);
    return jsonWithCors(
      { success: false, error: "Authentication failed: " + error.message },
      { status: 500 }
    );
  }
}

