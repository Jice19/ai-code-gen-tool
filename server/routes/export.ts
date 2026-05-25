import { Hono } from "hono"
import JSZip from "jszip"

export const zipExportRoute = new Hono()

zipExportRoute.post("/zip", async (c) => {
  try {
    const body = await c.req.json<{ files: Array<{ name: string; content: string }> }>()

    if (!body.files || !Array.isArray(body.files) || body.files.length === 0) {
      return c.json({ error: "No files provided" }, 400)
    }

    const zip = new JSZip()
    for (const file of body.files) {
      zip.file(file.name, file.content)
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })

    c.header("Content-Type", "application/zip")
    c.header("Content-Disposition", "attachment; filename=generated-project.zip")

    return c.body(zipBuffer)
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : "Zip generation failed" },
      500
    )
  }
})
