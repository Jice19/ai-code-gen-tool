import { handle } from "hono/vercel"
import { app } from "../server/app"

// Vercel serverless function — handles all /api/* routes
export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
