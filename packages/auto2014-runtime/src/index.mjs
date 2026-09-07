import fs from 'node:fs/promises';
export function readRuntimeSource() {
  return fs.readFile(new URL('./automation.js',import.meta.url),'utf8');
}
