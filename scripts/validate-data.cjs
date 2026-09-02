const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'axis-data.json'), 'utf8'));
const errors = [];

function requireArray(value, name) {
  if (!Array.isArray(value)) errors.push(`${name} must be an array`);
}

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) errors.push(`${name} must be an object`);
}

function localAssetFile(ref) {
  if (!ref || typeof ref !== 'string' || /^https?:\/\//i.test(ref)) return null;
  const normalized = ref.replace(/\\/g, '/');
  const match = normalized.match(/Sanatazm\/endfield-axis-tool\/(.+)$/i);
  return match ? match[1] : normalized;
}

function checkAsset(ref, label) {
  const local = localAssetFile(ref);
  if (!local) return;
  const target = path.resolve(root, local);
  if (!target.startsWith(root) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    errors.push(`${label} references missing asset: ${ref}`);
  }
}

requireArray(data.bgAssets, 'bgAssets');
requireArray(data.skillTypes, 'skillTypes');
requireObject(data.charAssets, 'charAssets');
requireObject(data.attrHex, 'attrHex');
requireObject(data.skillAttrMap, 'skillAttrMap');
requireArray(data.orderedChars, 'orderedChars');

const skillTypes = data.skillTypes || [];
const attrNames = new Set(Object.keys(data.attrHex || {}));
const ordered = data.orderedChars || [];
const duplicates = ordered.filter((name, index) => ordered.indexOf(name) !== index);
for (const name of new Set(duplicates)) errors.push(`orderedChars has duplicate character: ${name}`);

for (const ref of data.bgAssets || []) checkAsset(ref, 'bgAssets');

for (const name of ordered) {
  if (!data.charAssets[name]) errors.push(`orderedChars contains missing character: ${name}`);
}

for (const [name, assets] of Object.entries(data.charAssets || {})) {
  if (!assets || typeof assets !== 'object') {
    errors.push(`${name} asset entry must be an object`);
    continue;
  }
  checkAsset(assets.avatar, `${name}.avatar`);
  if (!assets.skills || typeof assets.skills !== 'object') {
    errors.push(`${name}.skills must be an object`);
    continue;
  }
  for (const skillType of skillTypes) {
    if (!Object.prototype.hasOwnProperty.call(assets.skills, skillType)) {
      errors.push(`${name}.skills missing ${skillType}`);
    }
    checkAsset(assets.skills[skillType], `${name}.${skillType}`);
  }
}

for (const [name, attrs] of Object.entries(data.skillAttrMap || {})) {
  if (!data.charAssets[name]) errors.push(`skillAttrMap contains missing character: ${name}`);
  for (const skillType of skillTypes) {
    const attr = attrs && attrs[skillType];
    if (!attrNames.has(attr)) errors.push(`${name}.${skillType} has unknown attr: ${attr}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Axis data valid: ${ordered.length} ordered characters, ${Object.keys(data.charAssets || {}).length} asset entries.`);
