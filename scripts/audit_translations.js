const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (let file of list) {
    if (file === 'node_modules' || file === '.next') continue;
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (file.endsWith('.tsx')) {
      results.push(full);
    }
  }
  return results;
}

const frontendDir = path.join(process.cwd(), 'frontend');
const files = walk(frontendDir);
console.log('Total TSX files scanned:', files.length);

const results = [];
const jsxTextRegex = />\s*([A-Za-z][A-Za-z0-9\s,.'’!?/:;\-–—()]{3,})\s*</g;

for (let file of files) {
  const rel = path.relative(process.cwd(), file);
  const code = fs.readFileSync(file, 'utf8');
  const lines = code.split('\n');
  const hasUseLanguage = code.includes('useLanguage');

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('import ')) return;

    let match;
    while ((match = jsxTextRegex.exec(line)) !== null) {
      const text = match[1].trim();
      if (/^(true|false|null|undefined|string|number|any|void|never)$/.test(text)) continue;
      if (/^(className|onClick|style|id|key|stroke|fill)$/.test(text)) continue;
      if (text.length > 2 && /[a-zA-Z]{3,}/.test(text)) {
        if (!line.includes('t(')) {
          results.push({ file: rel, line: idx + 1, text, hasUseLanguage });
        }
      }
    }
  });
}

console.log('Total potential hardcoded JSX strings found:', results.length);

const byFile = {};
for (let r of results) {
  if (!byFile[r.file]) byFile[r.file] = [];
  byFile[r.file].push(r);
}

const sortedFiles = Object.keys(byFile).sort((a,b) => byFile[b].length - byFile[a].length);
console.log('\nTop files with hardcoded text:');
sortedFiles.slice(0, 25).forEach(f => {
  console.log(`${byFile[f].length.toString().padStart(3)} strings: ${f}`);
});

fs.writeFileSync(path.join(process.cwd(), 'audit_hardcoded_results.json'), JSON.stringify(byFile, null, 2));
console.log('\nSaved full report to audit_hardcoded_results.json');
