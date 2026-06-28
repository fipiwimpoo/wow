import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string, depth: number = 0) {
  if (depth > 8) return;
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const full = path.join(dir, file);
      try {
        const s = fs.statSync(full);
        if (s.isDirectory()) {
          if (file === 'proc' || file === 'sys' || file === 'dev') {
            continue;
          }
          walk(full, depth + 1);
        } else {
          const lower = full.toLowerCase();
          if (lower.includes('triangle') || lower.includes('gemini') || lower.includes('pack')) {
            console.log(`FOUND PATH: ${full} (${s.size} bytes)`);
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}

console.log("Searching all paths...");
walk('/');
console.log("Done.");
