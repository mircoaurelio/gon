#!/usr/bin/env node
/**
 * Generates img/manifest.json from the current contents of the img/ folder.
 * Run after changing files in img/ so the app uses the new set.
 *
 * Convention:
 * - First image (alphabetically; "1.*" preferred) = major beat anchor
 * - All other images = library assets
 * - First .mp3 file = default audio
 *
 * Usage: node generate-img-manifest.js
 */

const fs = require('fs');
const path = require('path');

const IMG_DIR = path.join(__dirname, 'img');
const MANIFEST_PATH = path.join(IMG_DIR, 'manifest.json');

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']);
const AUDIO_EXT = new Set(['.mp3', '.m4a', '.ogg', '.wav']);

function getExt(name) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function main() {
  if (!fs.existsSync(IMG_DIR)) {
    console.error('Folder img/ not found.');
    process.exit(1);
  }
  const names = fs.readdirSync(IMG_DIR).filter((n) => {
    const full = path.join(IMG_DIR, n);
    return fs.statSync(full).isFile();
  });
  const images = names.filter((n) => IMAGE_EXT.has(getExt(n))).sort((a, b) => a.localeCompare(b));
  const audioFiles = names.filter((n) => AUDIO_EXT.has(getExt(n))).sort((a, b) => a.localeCompare(b));

  let anchor = [];
  let library = [];
  const oneMatch = images.find((n) => /^1\./i.test(n));
  if (oneMatch) {
    anchor = ['img/' + oneMatch];
    library = images.filter((n) => n !== oneMatch).map((n) => 'img/' + n);
  } else if (images.length) {
    anchor = ['img/' + images[0]];
    library = images.slice(1).map((n) => 'img/' + n);
  }
  const audio = audioFiles.length ? 'img/' + audioFiles[0] : '';

  const manifest = { anchor, library, audio };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Wrote', MANIFEST_PATH);
  console.log('  anchor:', manifest.anchor.length, 'file(s)');
  console.log('  library:', manifest.library.length, 'file(s)');
  console.log('  audio:', manifest.audio || '(none)');
}

main();
