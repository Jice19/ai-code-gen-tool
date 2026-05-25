import { Hono } from "hono"
import { cors } from "hono/cors"
import { serve } from "@hono/node-server"
import { zipExportRoute } from "./routes/export"

const app = new Hono()

app.use("/*", cors({ origin: "*" }))

app.route("/api/export", zipExportRoute)

app.get("/api/health", (c) => c.json({ status: "ok" }))

const port = Number(process.env.PORT) || 3001
console.log(`Backend server running on http://localhost:${port}`)

serve({ fetch: app.fetch, port })
