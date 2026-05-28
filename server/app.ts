import { Hono } from "hono"
import { cors } from "hono/cors"
import { zipExportRoute } from "./routes/export"

const app = new Hono()

app.use("/*", cors({ origin: "*" }))

app.route("/api/export", zipExportRoute)

app.get("/api/health", (c) => c.json({ status: "ok" }))

export { app }
