const fs = require("fs")
const path = require("path")

const src = path.join(process.cwd(), ".medusa/server/public/admin")
const dest = path.join(process.cwd(), "public/admin")

if (!fs.existsSync(src)) {
  console.log("No .medusa/server/public/admin to sync")
  process.exit(0)
}

fs.cpSync(src, dest, { recursive: true })
console.log("Synced official Admin to public/admin")
