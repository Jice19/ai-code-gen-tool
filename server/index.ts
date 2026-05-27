import { Hono } from "hono"
import { cors } from "hono/cors"
import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"
import { zipExportRoute } from "./routes/export"

const app = new Hono()

app.use("/*", cors({ origin: "*" }))

app.route("/api/export", zipExportRoute)

app.get("/api/health", (c) => c.json({ status: "ok" }))

// Serve static files in production
const distPath = join(import.meta.dirname, "..", "dist")
if (existsSync(distPath)) {
  app.use("/*", serveStatic({ root: distPath }))
  // SPA fallback: serve index.html for non-file routes
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
