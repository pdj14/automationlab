import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_URL = 'https://linear.app/';

function toNormalizedColor(value) {
  if (!value) return null;
  const v = value.trim();
  // Already rgb/rgba/hsl/hsla
  if (/^rgba?\(/i.test(v) || /^hsla?\(/i.test(v)) return v;
  // Hex formats #rgb, #rgba, #rrggbb, #rrggbbaa
  if (/^#([0-9a-f]{3,8})$/i.test(v)) return v.toLowerCase();
  return null;
}

async function extractTheme(page) {
  return await page.evaluate(() => {
    function safeGetCssRules(styleSheet) {
      try {
        return styleSheet.cssRules || [];
      } catch (e) {
        return [];
      }
    }

    const root = document.documentElement;
    const computedRoot = getComputedStyle(root);

    // Collect CSS variable names
    const cssVarNames = new Set();

    // From :root inline style
    for (const name of Array.from(root.style)) {
      if (name.startsWith('--')) cssVarNames.add(name);
    }

    // From all style rules
    for (const sheet of Array.from(document.styleSheets)) {
      const rules = safeGetCssRules(sheet);
      for (const rule of Array.from(rules)) {
        // Handle nested rules (e.g., @media)
        if (rule.cssRules) {
          for (const nestedRule of Array.from(rule.cssRules)) {
            if (nestedRule.style) {
              for (const name of Array.from(nestedRule.style)) {
                if (name.startsWith('--')) cssVarNames.add(name);
              }
            }
          }
        }
        if (rule.style) {
          for (const name of Array.from(rule.style)) {
            if (name.startsWith('--')) cssVarNames.add(name);
          }
        }
      }
    }

    const cssVariables = {};
    for (const varName of Array.from(cssVarNames)) {
      const value = computedRoot.getPropertyValue(varName).trim();
      if (value) cssVariables[varName] = value;
    }

    // Fonts: gather common element computed font-family plus @font-face
    const sampleSelectors = ['html', 'body', 'h1', 'h2', 'h3', 'p', 'button', 'input', 'textarea', 'code', 'pre'];
    const fontFamilies = new Set();
    for (const sel of sampleSelectors) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const fam = getComputedStyle(el).fontFamily;
      if (fam) fontFamilies.add(fam);
    }

    const fontFaces = [];
    for (const sheet of Array.from(document.styleSheets)) {
      const rules = safeGetCssRules(sheet);
      for (const rule of Array.from(rules)) {
        const scan = (r) => {
          if (r.constructor && r.constructor.name === 'CSSFontFaceRule') {
            const s = r.style;
            fontFaces.push({
              fontFamily: s.getPropertyValue('font-family')?.trim() || null,
              src: s.getPropertyValue('src')?.trim() || null,
              fontStyle: s.getPropertyValue('font-style')?.trim() || null,
              fontWeight: s.getPropertyValue('font-weight')?.trim() || null,
              fontDisplay: s.getPropertyValue('font-display')?.trim() || null,
            });
          }
        };
        if (rule.cssRules) {
          for (const nested of Array.from(rule.cssRules)) scan(nested);
        } else {
          scan(rule);
        }
      }
    }

    // Extract color-like values from variables
    const colorValues = new Set();
    const colorPatterns = [
      /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
      /^rgba?\([^)]+\)$/i,
      /^hsla?\([^)]+\)$/i,
    ];
    for (const [name, value] of Object.entries(cssVariables)) {
      const v = String(value).trim();
      if (colorPatterns.some((re) => re.test(v))) {
        colorValues.add(v);
      }
    }

    return {
      source: location.href,
      timestamp: new Date().toISOString(),
      cssVariables,
      fonts: {
        fontFamilies: Array.from(fontFamilies),
        fontFaces,
      },
      colors: Array.from(colorValues),
    };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });

  // Best-effort: accept cookie banners if present to avoid overlays
  try {
    const candidates = [
      'button:has-text("Accept")',
      'button:has-text("Agree")',
      'button:has-text("OK")',
      '[role="button"]:has-text("Accept")',
    ];
    for (const sel of candidates) {
      const el = await page.$(sel);
      if (el) { await el.click({ timeout: 2000 }); break; }
    }
  } catch {}

  // Give the page a moment to settle
  await page.waitForTimeout(1500);

  const theme = await extractTheme(page);

  const outPath = path.resolve(path.join(__dirname, '..', 'public', 'linearTheme.json'));
  fs.writeFileSync(outPath, JSON.stringify(theme, null, 2), 'utf-8');

  console.log(JSON.stringify(theme, null, 2));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


