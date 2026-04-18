/**
 * tsc 先输出 .js，再按目标格式改名为 .mjs / .cjs，并修正相对路径与 source map。
 * 用法: node scripts/rewrite-dist-extensions.mjs <dist/cjs|dist/esm> <cjs|mjs>
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? '');
const targetExt = process.argv[3] ?? '';

if (!root || !['cjs', 'mjs'].includes(targetExt)) {
  console.error(
    'Usage: node scripts/rewrite-dist-extensions.mjs <distDir> <cjs|mjs>',
  );
  process.exit(1);
}

/** 相对路径中的 .js -> .mjs / .cjs（import / export / require） */
function patchRelativeJsImports(content, ext) {
  return content.replace(
    /(['"])(\.\/[^'"]+)\.js\1/g,
    (_m, q, base) => `${q}${base}.${ext}${q}`,
  );
}

function patchSourceMappingUrlComment(content, ext) {
  return content.replace(
    /\/\/# sourceMappingURL=([^\s]+)\.js\.map/g,
    `//# sourceMappingURL=$1.${ext}.map`,
  );
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}

function patchDeclarationFile(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  text = patchRelativeJsImports(text, targetExt);
  fs.writeFileSync(filePath, text);
}

function rewriteJsOutput(jsPath) {
  const dir = path.dirname(jsPath);
  const base = path.basename(jsPath, '.js');
  const mapPath = path.join(dir, `${base}.js.map`);
  const outPath = path.join(dir, `${base}.${targetExt}`);

  let code = fs.readFileSync(jsPath, 'utf8');
  code = patchRelativeJsImports(code, targetExt);
  code = patchSourceMappingUrlComment(code, targetExt);
  fs.writeFileSync(outPath, code);
  fs.unlinkSync(jsPath);

  if (fs.existsSync(mapPath)) {
    const raw = fs.readFileSync(mapPath, 'utf8');
    const j = JSON.parse(raw);
    if (typeof j.file === 'string' && j.file.endsWith('.js')) {
      j.file = `${base}.${targetExt}`;
    }
    const newMapPath = path.join(dir, `${base}.${targetExt}.map`);
    fs.writeFileSync(newMapPath, JSON.stringify(j));
    fs.unlinkSync(mapPath);
  }
}

const allFiles = walkFiles(root);

for (const p of allFiles) {
  if (p.endsWith('.tsbuildinfo')) {
    fs.unlinkSync(p);
    continue;
  }
  if (p.endsWith('.d.ts')) {
    patchDeclarationFile(p);
  }
}

for (const p of allFiles) {
  if (!p.endsWith('.js')) continue;
  if (p.endsWith('.d.js')) continue;
  rewriteJsOutput(p);
}
