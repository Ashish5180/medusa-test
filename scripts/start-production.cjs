const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")

const root = process.cwd()
const serverDir = path.join(root, ".medusa/server")
const builtIndex = path.join(serverDir, "public/admin/index.html")
const rootIndex = path.join(root, "public/admin/index.html")
const adminDisabled = process.env.DISABLE_MEDUSA_ADMIN === "true"

if (!adminDisabled && fs.existsSync(builtIndex) && !fs.existsSync(rootIndex)) {
  fs.cpSync(path.dirname(builtIndex), path.dirname(rootIndex), { recursive: true })
}

if (!adminDisabled && !fs.existsSync(builtIndex) && !fs.existsSync(rootIndex)) {
  console.error(
    "Official Admin index.html is missing. The last build skipped Admin " +
      "(DISABLE_MEDUSA_ADMIN=true) or ran out of memory. Rebuild with " +
      "DISABLE_MEDUSA_ADMIN unset and NODE_OPTIONS=--max-old-space-size=4096."
  )
  process.exit(1)
}

const cwd = fs.existsSync(path.join(serverDir, "medusa-config.js"))
  ? serverDir
  : root

const child = spawn("npx", ["medusa", "start"], {
  cwd,
  stdio: "inherit",
  env: process.env,
  shell: true,
})

child.on("exit", (code) => process.exit(code ?? 1))
