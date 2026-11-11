import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const errors = [];

for (const language of ["en", "de"]) {
  const localeDir = path.join(root, language);
  const files = fs.readdirSync(localeDir).filter((file) => file.endsWith(".html"));
  if (files.length !== 5) errors.push(`${language}: expected 5 HTML files, found ${files.length}`);

  for (const file of files) {
    const filename = path.join(localeDir, file);
    const html = fs.readFileSync(filename, "utf8");
    if (!html.includes(`<html lang="${language}">`)) errors.push(`${language}/${file}: wrong lang`);
    if (/d="[^"]*(?:WITH|FÜR|FOR)[^"]*"/.test(html)) errors.push(`${language}/${file}: translated SVG path`);
    if ([...html.matchAll(/rel="alternate" hreflang=/g)].length !== (file === "index.html" || file === "portfolio.html" || file === "polityka-prywatnosci.html" ? 4 : 0)) {
      errors.push(`${language}/${file}: wrong alternate-link count`);
    }
    if (file === "index.html" && !html.includes(`action="/${language}/dziekuje.html"`)) errors.push(`${language}/${file}: wrong form action`);

    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const reference = match[1].split(/[?#]/)[0];
      if (!reference || /^(?:https?:|mailto:|tel:|#|\/)/.test(reference)) continue;
      const target = path.resolve(path.dirname(filename), reference);
      if (!fs.existsSync(target)) errors.push(`${language}/${file}: missing ${reference}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Locale validation passed: 10 HTML files, no missing local references.");
