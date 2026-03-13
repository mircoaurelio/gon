#!/usr/bin/env node
/**
 * Recalculates manifest from project folders at repo root (gon/, hung/, ...).
 * Paths use the folder name, e.g. gon/1.jpeg not img/1.jpeg.
 *
 * Writes:
 *   - img/manifest.json  (central manifest with projects[] for the app)
 *   - gon/manifest.json, hung/manifest.json, ... (per-project manifest with anchor, library, audio)
 *
 * Run: node generate-manifest.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const IMG_DIR = path.join(ROOT, 'img');
const CENTRAL_MANIFEST_PATH = path.join(IMG_DIR, 'manifest.json');

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const AUDIO_EXT = new Set(['.mp3', '.m4a', '.wav', '.ogg', '.aac']);

function getExt(name) {
  return path.extname(name).toLowerCase();
}

function isImage(name) {
  return IMAGE_EXT.has(getExt(name));
}

function isAudio(name) {
  return AUDIO_EXT.has(getExt(name));
}

// Project folders at repo root (e.g. gon, hung) – skip img and other non-project dirs
const SKIP_DIRS = new Set(['img', 'node_modules', '.git', 'scripts']);
const rootEntries = fs.readdirSync(ROOT, { withFileTypes: true });
const projectDirs = rootEntries
  .filter((e) => e.isDirectory() && !e.name.startsWith('.') && !SKIP_DIRS.has(e.name))
  .map((e) => e.name);

const projects = [];

for (const dirName of projectDirs) {
  const dirPath = path.join(ROOT, dirName);
  let files;
  try {
    files = fs.readdirSync(dirPath);
  } catch (err) {
    continue;
  }
  const images = files.filter(isImage).sort();
  const audios = files.filter(isAudio).sort();
  if (images.length === 0 && audios.length === 0) continue;

  const prefix = `${dirName}/`;
  const anchor = images.length ? [prefix + images[0]] : [];
  const library = images.length > 1 ? images.slice(1).map((f) => prefix + f) : [];

  // Audio: for gon and hung, keep the file in the img/ folder so it is served from the same static root.
  let audio = '';
  if (audios.length) {
    const audioFile = audios[0];
    audio = (dirName === 'gon' || dirName === 'hung') ? `img/${audioFile}` : `${prefix}${audioFile}`;
  }

  const project = {
    id: dirName.toLowerCase(),
    name: dirName === 'gon' ? 'GON' : dirName.charAt(0).toUpperCase() + dirName.slice(1).toLowerCase(),
    audio,
    anchor,
    library,
  };
  projects.push(project);

  // Per-project manifest (e.g. gon/manifest.json) with paths like gon/...
  const perProjectManifest = {
    anchor,
    library,
    audio,
  };
  const perPath = path.join(dirPath, 'manifest.json');
  fs.writeFileSync(perPath, JSON.stringify(perProjectManifest, null, 2), 'utf8');
  console.log('Wrote', perPath);
}

if (projects.length === 0) {
  projects.push({
    id: 'gon',
    name: 'GON',
    audio: 'img/GÖN.mp3.mp3',
    anchor: ['gon/1.jpeg'],
    library: [],
  });
}

// Central manifest for the app
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });
const centralManifest = { projects };
fs.writeFileSync(CENTRAL_MANIFEST_PATH, JSON.stringify(centralManifest, null, 2), 'utf8');
console.log('Wrote', CENTRAL_MANIFEST_PATH, 'with', projects.length, 'project(s):', projects.map((p) => p.id).join(', '));
