/**
 * Converts StyleSheet.create({... colors ...}) module styles into
 * useTheme() + useMemo factories so light/dark updates at runtime.
 */
import fs from 'fs';
import path from 'path';

const roots = [
  path.resolve('app'),
  path.resolve('src/components'),
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function ensureImport(source, name, from) {
  if (source.includes(`useTheme`) && from.includes('ThemeState')) return source;
  if (source.includes(`from '${from}'`) || source.includes(`from "${from}"`)) {
    return source.replace(
      new RegExp(`import\\s*{([^}]*)}\\s*from\\s*['"]${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`),
      (m, names) => {
        if (names.includes(name)) return m;
        return `import { ${names.trim().replace(/\s+$/, '')}, ${name} } from '${from}'`;
      },
    );
  }
  const themeImport = source.match(/import\s*{[^}]*}\s*from\s*['"][^'"]*theme['"]/);
  if (themeImport) {
    return source.replace(themeImport[0], `${themeImport[0]}\nimport { ${name} } from '${from}';`);
  }
  return `import { ${name} } from '${from}';\n${source}`;
}

function relThemeState(file) {
  const rel = path.relative(path.dirname(file), path.resolve('src/state/ThemeState')).replace(/\\/g, '/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function processFile(file) {
  let source = fs.readFileSync(file, 'utf8');
  if (!source.includes('from ') || !/theme['"]/.test(source)) return false;
  if (!source.includes('StyleSheet.create')) return false;
  if (source.includes('useTheme()') && source.includes('makeStyles')) return false;
  if (file.includes('ThemeState')) return false;

  const createMatch = source.match(/\nconst styles = StyleSheet\.create\((\{[\s\S]*?\n\})\);/);
  if (!createMatch) return false;

  const stylesObj = createMatch[1];
  if (!stylesObj.includes('colors.')) return false;

  // Skip files that already export multiple style sheets or unusual patterns
  if ((source.match(/StyleSheet\.create/g) || []).length !== 1) return false;

  const themeStatePath = relThemeState(file);
  let next = source;

  if (!next.includes("from 'react'") && !next.includes('from "react"')) {
    if (next.includes("from 'react-native'")) {
      next = next.replace(
        /import\s*{([^}]*)}\s*from\s*['"]react-native['"]/,
        (m, names) => {
          const parts = names.split(',').map((s) => s.trim()).filter(Boolean);
          if (!parts.includes('useMemo')) {
            // useMemo comes from react
          }
          return m;
        },
      );
    }
    next = `import { useMemo } from 'react';\n${next}`;
  } else {
    next = next.replace(
      /import\s*{([^}]*)}\s*from\s*['"]react['"]/,
      (m, names) => {
        if (names.includes('useMemo')) return m;
        return `import { ${names.trim()}, useMemo } from 'react'`;
      },
    );
    if (!next.includes('useMemo') && next.match(/import\s+React\s+from\s+['"]react['"]/)) {
      // fine — use React.useMemo
    } else if (!next.includes('useMemo')) {
      next = `import { useMemo } from 'react';\n${next}`;
    }
  }

  if (!next.includes('useTheme')) {
    next = ensureImport(next, 'useTheme', themeStatePath);
  }

  // Find default export function or named export component
  const compMatch = next.match(/export default function (\w+)/);
  if (!compMatch) return false;
  const compName = compMatch[1];
  const funcStart = next.indexOf(`export default function ${compName}`);
  const brace = next.indexOf('{', funcStart);
  if (brace < 0) return false;

  const hookInsert = `\n  const { colors } = useTheme();\n  const styles = useMemo(() => makeStyles(colors), [colors]);`;
  if (!next.slice(brace, brace + 200).includes('useTheme()')) {
    next = `${next.slice(0, brace + 1)}${hookInsert}${next.slice(brace + 1)}`;
  }

  next = next.replace(
    /\nconst styles = StyleSheet\.create\((\{[\s\S]*?\n\})\);/,
    `\nfunction makeStyles(colors) {\n  return StyleSheet.create($1);\n}`,
  );

  // Remove colors from static theme import if only used in styles — keep if used in JSX
  fs.writeFileSync(file, next);
  return true;
}

let count = 0;
for (const root of roots) {
  for (const file of walk(root)) {
    try {
      if (processFile(file)) {
        count += 1;
        console.log('updated', path.relative(process.cwd(), file));
      }
    } catch (error) {
      console.error('fail', file, error.message);
    }
  }
}
console.log(`done ${count} files`);
