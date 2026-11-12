import nextVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    // shadcn/ui-Komponenten werden nicht verändert (CLAUDE.md); Skelett-Breiten nutzen bewusst Zufallswerte
    files: ["src/components/ui/**"],
    rules: { "react-hooks/purity": "off" },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
      "src/lib/data/demo-xml.generated.ts",
    ],
  },
]

export default config
