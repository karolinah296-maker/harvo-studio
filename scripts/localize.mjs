import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sourceFiles = ["index.html", "portfolio.html", "polityka-prywatnosci.html", "dziekuje.html", "404.html"];

const normalize = (value) => value.replace(/\s+/g, " ").trim();

const collect = (html) => {
  const withoutScripts = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  const values = new Set();

  for (const match of withoutScripts.matchAll(/>([^<]+)</g)) {
    const value = normalize(match[1]);
    if (value && !/^[\d\s/|\-+.,:;()]+$/.test(value)) values.add(value);
  }

  for (const match of withoutScripts.matchAll(/\b(?:aria-label|placeholder|title|content|alt)="([^"]+)"/gi)) {
    const value = normalize(match[1]);
    if (value && !/^(?:width=device|index, follow|#|https?:)/i.test(value)) values.add(value);
  }

  for (const block of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const match of block[1].matchAll(/"(?:name|description)"\s*:\s*"([^"]+)"/g)) {
      const value = normalize(match[1]);
      if (value && !value.startsWith("http")) values.add(value);
    }
  }

  return values;
};

const neverTranslate = new Set([
  "HARVO", "S", "T", "U", "D", "I", "O", "studio", "DOMEX", "MALBUD",
  "GCS Deweloper", "Seltrans", "Ecomplex", "Forma Schodów", "Górski Szlak",
  "Bella Beauty", "Ristorante Ravello", "ArtPawilony", "LUMEX", "Karolina Harpak",
  "Harvo Studio", "kontakt@harvostudio.pl", "UI / UX", "UX/UI", "RWD", "SEO",
  "SEO-ready", "Web design", "UI design", "Outdoor", "Travel", "Craft", "Beauty",
  "Menu", "Hospitality", "Landing page", "Fitness", "Architecture", "30%", "70%",
  "100%", "24h", "FAQ", "© 2026 Harvo Studio", "adres@email.pl", "Opcjonalnie"
]);

const translateValue = async (value, language) => {
  if (neverTranslate.has(value) || !/[A-Za-zĄ-ż]/.test(value)) return value;
  const endpoint = new URL("https://translate.googleapis.com/translate_a/single");
  endpoint.searchParams.set("client", "gtx");
  endpoint.searchParams.set("sl", "pl");
  endpoint.searchParams.set("tl", language);
  endpoint.searchParams.set("dt", "t");
  endpoint.searchParams.set("q", value);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(endpoint, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (response.ok) {
      const payload = await response.json();
      return payload[0].map((part) => part[0]).join("");
    }
    await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
  }
  throw new Error(`Translation failed: ${value}`);
};

const buildTranslations = async (language) => {
  const cachePath = path.join(root, "scripts", `translations-${language}.json`);
  const cached = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, "utf8")) : {};
  const values = new Set();
  for (const file of sourceFiles) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    collect(html).forEach((value) => values.add(value));
  }

  const entries = [...values].filter((value) => !(value in cached));
  const translated = { ...cached };
  let cursor = 0;
  const workers = Array.from({ length: 5 }, async () => {
    while (cursor < entries.length) {
      const index = cursor++;
      const source = entries[index];
      translated[source] = await translateValue(source, language);
      if ((index + 1) % 25 === 0) console.error(`${language}: ${index + 1}/${entries.length}`);
    }
  });
  await Promise.all(workers);
  return translated;
};

const languageMeta = {
  en: { locale: "en_GB", label: "EN", home: "/en/" },
  de: { locale: "de_DE", label: "DE", home: "/de/" }
};

const localizeHtml = (html, language, translations, filename) => {
  const meta = languageMeta[language];
  const translateText = (source) => {
    const key = normalize(source);
    if (!key || !translations[key]) return source;
    const leading = source.match(/^\s*/)?.[0] ?? "";
    const trailing = source.match(/\s*$/)?.[0] ?? "";
    return `${leading}${translations[key]}${trailing}`;
  };
  const translateMarkup = (markup) => markup
    .replace(/>([^<]+)</g, (match, text) => `>${translateText(text)}<`)
    .replace(/\b(aria-label|placeholder|title|content|alt)="([^"]+)"/gi, (match, attribute, value) => {
      const translated = translations[normalize(value)];
      return translated ? `${attribute}="${translated}"` : match;
    });

  const scripts = [];
  let output = html.replace(/<script\b[\s\S]*?<\/script>/gi, (script) => {
    scripts.push(script);
    return `___HARVO_SCRIPT_${scripts.length - 1}___`;
  });
  output = translateMarkup(output);
  output = output.replace(/___HARVO_SCRIPT_(\d+)___/g, (match, index) => {
    let script = scripts[Number(index)];
    if (/application\/ld\+json/i.test(script)) {
      script = script.replace(/("(?:name|description)"\s*:\s*")([^"]+)(")/g, (full, before, value, after) => {
        const translated = translations[normalize(value)];
        return translated ? `${before}${translated}${after}` : full;
      });
    }
    return script;
  });

  output = output
    .replace('<html lang="pl">', `<html lang="${language}">`)
    .replace(/og:locale" content="pl_PL"/g, `og:locale" content="${meta.locale}"`)
    .replace(/"inLanguage": "pl-PL"/g, `"inLanguage": "${language}"`)
    .replace(/(href|src)="assets\//g, '$1="../assets/')
    .replace('href="styles.css"', 'href="../styles.css"')
    .replace(/src="script\.js(\?[^\"]*)?"/g, 'src="../script.js$1"')
    .replace(/action="\/dziekuje"/g, `action="/${language}/dziekuje.html"`)
    .replace(/https:\/\/harvostudio\.pl\/(?!assets)/g, `https://harvostudio.pl/${language}/`);

  output = output.replace(/<span class="language-switcher"([\s\S]*?)<\/span>/, (switcher) => {
    return switcher
      .replace(/<a class="is-active" href="([^"]+)">PL<\/a>/, '<a href="$1">PL</a>')
      .replace(new RegExp(`<a href="([^"]+)">${meta.label}<\\/a>`), `<a class="is-active" href="$1">${meta.label}</a>`);
  });

  if (language === "en") {
    output = output
      .replace(/Estimate the project/g, "Request a quote")
      .replace(/Make an appointment/g, "Let's talk")
      .replace(/>For whom</g, ">Industries<")
      .replace('<span class="title-line">I create websites</span>\n              <span class="title-line">internet</span>\n              <span class="title-line title-line-last">For <span class="title-gradient">construction industry</span></span>', '<span class="title-line">I design websites</span>\n              <span class="title-line">for ambitious</span>\n              <span class="title-line title-line-last"><span class="title-gradient">construction companies</span></span>')
      .replace(/>DOOR</g, ">DOORS<");
  }

  const canonicalPath = filename === "index.html" ? "" : filename.replace(/\.html$/, "");
  output = output.replace(
    /<link rel="canonical" href="[^"]+" \/>/,
    `<link rel="canonical" href="https://harvostudio.pl/${language}/${canonicalPath}" />\n` +
    `    <link rel="alternate" hreflang="pl" href="https://harvostudio.pl/${canonicalPath}" />\n` +
    `    <link rel="alternate" hreflang="en" href="https://harvostudio.pl/en/${canonicalPath}" />\n` +
    `    <link rel="alternate" hreflang="de" href="https://harvostudio.pl/de/${canonicalPath}" />\n` +
    `    <link rel="alternate" hreflang="x-default" href="https://harvostudio.pl/${canonicalPath}" />`
  );

  return output;
};

const buildLanguage = async (language) => {
  if (!languageMeta[language]) throw new Error(`Unsupported language: ${language}`);
  const translations = await buildTranslations(language);
  const outputDir = path.join(root, language);
  fs.mkdirSync(outputDir, { recursive: true });
  for (const file of sourceFiles) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    fs.writeFileSync(path.join(outputDir, file), localizeHtml(source, language, translations, file));
  }
  fs.writeFileSync(path.join(root, "scripts", `translations-${language}.json`), `${JSON.stringify(translations, null, 2)}\n`);
  console.log(`Built ${language} in ${outputDir}`);
};

if (process.argv.includes("--list")) {
  for (const file of sourceFiles) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    console.log(`\n### ${file}`);
    console.log([...collect(html)].join("\n"));
  }
}

const buildIndex = process.argv.indexOf("--build");
if (buildIndex !== -1) await buildLanguage(process.argv[buildIndex + 1]);
