import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const logoPath = path.join(process.cwd(), "public", "logo.png");

if (fs.existsSync(logoPath)) {
  console.log("Generating icon16, icon48, icon128 from public/logo.png...");
  execSync("sips -z 128 128 public/logo.png --out public/icon128.png", { stdio: "inherit" });
  execSync("sips -z 48 48 public/logo.png --out public/icon48.png", { stdio: "inherit" });
  execSync("sips -z 16 16 public/logo.png --out public/icon16.png", { stdio: "inherit" });
  console.log("✅ Successfully updated icons from logo!");
} else {
  console.error("❌ public/logo.png not found.");
}
