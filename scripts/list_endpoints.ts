import fs from 'fs';

const spec = JSON.parse(fs.readFileSync('docs/openapi.json', 'utf8'));
let count = 0;
const list: { tag: string; method: string; path: string; summary: string }[] = [];

for (const [path, methods] of Object.entries(spec.paths as Record<string, any>)) {
  for (const [method, detail] of Object.entries(methods as Record<string, any>)) {
    count++;
    list.push({
      tag: detail.tags?.[0] || 'Unknown',
      method: method.toUpperCase(),
      path,
      summary: detail.summary || '',
    });
  }
}

console.log(`Total endpoints found: ${count}`);
console.log(JSON.stringify(list, null, 2));
