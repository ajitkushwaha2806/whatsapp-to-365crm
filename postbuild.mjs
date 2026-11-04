import fs from 'fs';
import path from 'path';

const OUT_DIR = path.join(process.cwd(), 'out');

// 1. Rename files and directories starting with `_` to `ext_`
function renameFilesAndDirectories(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    let newName = file;
    let newPath = fullPath;
    
    if (file.startsWith('_')) {
      newName = file.replace(/^_/, 'ext_');
      newPath = path.join(dir, newName);
      fs.renameSync(fullPath, newPath);
    }
    
    if (stat.isDirectory()) {
      renameFilesAndDirectories(newPath);
    }
  }
}

// 2. Replace references and extract inline scripts
function replaceReferences(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      replaceReferences(fullPath);
    } else {
      // Only process text files
      if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.txt')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        
        // Use replaceAll with strings to avoid regex overlap issues
        content = content.replaceAll('/_next/', 'ext_next/');
        content = content.replaceAll('"/_next"', '"ext_next"');
        content = content.replaceAll('/_not-found', 'ext_not-found');
        content = content.replaceAll('"/_not-found"', '"ext_not-found"');
        content = content.replaceAll('__next', 'ext_next'); // Handle __next
        
        // Extract inline scripts
        if (file.endsWith('.html')) {
          let scriptCounter = 0;
          // Extract <script> content
          content = content.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, scriptBody) => {
            if (attrs.includes('src=') || !scriptBody.trim()) {
              return match;
            }
            scriptCounter++;
            const scriptFileName = `inline-script-${path.basename(file, '.html')}-${scriptCounter}.js`;
            const scriptPath = path.join(dir, scriptFileName);
            fs.writeFileSync(scriptPath, scriptBody);
            // Append type="text/javascript" if not present to ensure execution
            return `<script src="${scriptFileName}" type="text/javascript" ${attrs}></script>`;
          });
          
          // Remove inline event handlers (onerror, onload, onclick)
          content = content.replace(/ (onload|onerror|onclick)=["'][^"']*["']/gi, '');
        }
        
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

renameFilesAndDirectories(OUT_DIR);
replaceReferences(OUT_DIR);

// Ensure no invalid CSP in manifest
const manifestPath = path.join(OUT_DIR, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.content_security_policy) {
    delete manifest.content_security_policy; // Remove the invalid CSP
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }
}

console.log('Successfully formatted Next.js output for Chrome Extension');
