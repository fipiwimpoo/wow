import * as fs from 'fs';
import * as path from 'path';

function searchDirectory(dir: string, depth: number = 0) {
  if (depth > 6) return;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'proc' || file === 'sys' || file === 'dev' || file === 'lib' || file === 'usr') {
            continue;
          }
          searchDirectory(fullPath, depth + 1);
        } else {
          const lower = file.toLowerCase();
          if (lower.includes('triangle') || lower.includes('gemini') || lower.includes('pack') || lower.includes('.zip')) {
            console.log(`FOUND FILE: ${fullPath} (Size: ${stat.size} bytes)`);
          }
        }
      } catch (err) {}
    }
  } catch (err) {}
}

console.log("--- Searching from current directory ---");
searchDirectory('.');
