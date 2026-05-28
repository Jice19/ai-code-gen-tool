import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { readFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { app } from "./app"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Serve static files in production (only when running standalone, not on Vercel)
const distPath = join(__dirname, "..", "dist")
if (existsSync(distPath)) {
  app.use("/*", serveStatic({ root: distPath }))
  app.get("*", async (c) => {
    try {
      const html = readFileSync(join(distPath, "index.html"), "utf-8")
      return c.html(html)
    } catch {
      return c.text("Not found", 404)
    }
  })
}

const port = Number(process.env.PORT) || 3001
const host = process.env.HOST || "0.0.0.0"
console.log(`Server running on http://${host}:${port}`)

serve({ fetch: app.fetch, port, hostname: host })
