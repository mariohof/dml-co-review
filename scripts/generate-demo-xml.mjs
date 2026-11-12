// Erzeugt src/lib/data/demo-xml.generated.ts aus den XML-Dateien in src/data/demo/.
// Der Inhalt wird per JSON.stringify eingebettet, damit er byte-genau erhalten bleibt
// (inkl. CRLF-Zeilenenden). Aufruf: node scripts/generate-demo-xml.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const srcDir = join(root, "src/data/demo")
const outFile = join(root, "src/lib/data/demo-xml.generated.ts")

const files = readdirSync(srcDir)
  .filter((name) => name.toUpperCase().endsWith(".XML"))
  .sort()

const lines = [
  "// AUTOMATISCH ERZEUGT durch scripts/generate-demo-xml.mjs — nicht von Hand bearbeiten.",
  "// Quelle: src/data/demo/*.XML",
  "",
  "export const DEMO_XML_FILES: Record<string, string> = {",
]
for (const name of files) {
  const content = readFileSync(join(srcDir, name), "utf8")
  lines.push(`  ${JSON.stringify(name)}: ${JSON.stringify(content)},`)
}
lines.push("}", "")

writeFileSync(outFile, lines.join("\n"), "utf8")
console.log(`${files.length} Dateien nach ${outFile} geschrieben`)
