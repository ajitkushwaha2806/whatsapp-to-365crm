import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const apiDir = path.join(process.cwd(), 'app', 'api');
const tempApiDir = path.join(process.cwd(), '.api_export_tmp');

let apiMoved = false;

try {
  // 1. Temporarily move dynamic API routes so static export doesn't throw export errors
  if (fs.existsSync(apiDir)) {
    fs.renameSync(apiDir, tempApiDir);
    apiMoved = true;
  }

  // 2. Run Next.js static build
  console.log('Building Next.js extension export...');
  execSync('BUILD_TARGET=extension npx next build --webpack', { stdio: 'inherit' });

  // 3. Run postbuild formatting script
  console.log('Running postbuild script...');
  execSync('node postbuild.mjs', { stdio: 'inherit' });

  // 4. Package extension zip
  console.log('Packaging extension zip...');
  execSync('cd out && zip -FSrq ../leadio.zip ./* && cp ../leadio.zip ../whatsapp-extension.zip', { stdio: 'inherit' });
  console.log('✅ Extension built and packaged successfully to leadio.zip');

} catch (err) {
  console.error('❌ Build failed:', err.message);
  process.exitCode = 1;
} finally {
  // Always restore API routes back to app/api
  if (apiMoved && fs.existsSync(tempApiDir)) {
    fs.renameSync(tempApiDir, apiDir);
    console.log('Restored app/api routes successfully.');
  }
}

