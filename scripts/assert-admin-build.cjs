const fs = require("fs")
const path = require("path")

if (process.env.DISABLE_MEDUSA_ADMIN === "true") {
  console.log("DISABLE_MEDUSA_ADMIN=true — skipping official Admin build check")
  process.exit(0)
}

const indexPath = path.join(
  process.cwd(),
  ".medusa/server/public/admin/index.html"
)

if (!fs.existsSync(indexPath)) {
  console.error(
    `Official Admin was not built. Missing ${indexPath}. ` +
      "Unset DISABLE_MEDUSA_ADMIN during build, give Node more memory " +
      "(NODE_OPTIONS=--max-old-space-size=4096), then run `npx medusa build`."
  )
  process.exit(1)
}

console.log("Official Admin build found:", indexPath)
