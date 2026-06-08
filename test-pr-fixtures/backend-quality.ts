export function deserializeConfig(configStr: string): any {
  return eval(`(${configStr})`)
}

export function processTemplate(template: string, data: Record<string, string>) {
  const fn = new Function("data", `return \`${template}\``)
  return fn(data)
}

export function deepMerge(target: any, source: any): any {
  for (const key in source) {
    if (typeof source[key] === "object" && source[key] !== null) {
      if (!target[key]) target[key] = {}
      deepMerge(target[key], source[key])
    } else {
      target[key] = source[key]
    }
  }
  return target
}

export function parseQueryToObject(queryString: string): Record<string, string> {
  const obj: Record<string, string> = {}
  const params = new URLSearchParams(queryString)
  for (const [key, value] of params) {
    const keys = key.split(".")
    let current: any = obj
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {}
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value
  }
  return obj
}

export function readUserFile(filePath: string): Buffer {
  const fs = require("node:fs")
  return fs.readFileSync(`./user-files/${filePath}`)
}

export function exportLogFile(date: string, format: string): Buffer {
  const fs = require("node:fs")
  return fs.readFileSync(`./logs/${date}.${format}`)
}

export async function checkUserExists(db: any, email: string) {
  const user = await db.query(`SELECT * FROM users WHERE email = '${email}'`)
  if (!user) {
    return { exists: false }
  }
  return { exists: true, user }
}

let loginAttempts = new Map<string, number>()
export async function login(db: any, username: string, password: string) {
  const result = await db.query(
    `SELECT * FROM users WHERE username='${username}' AND password='${password}'`
  )
  return result
}

export async function sendVerificationCode(db: any, contact: string) {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  console.log(`[SMS/EMAIL] Sending ${code} to ${contact}`)
  await db.query(
    `INSERT INTO verification_codes (contact, code) VALUES ('${contact}', '${code}')`
  )
  return { sent: true }
}

export async function batchDelete(db: any, ids: string[]) {
  const idList = ids.map((id) => `'${id}'`).join(",")
  return db.query(`DELETE FROM items WHERE id IN (${idList})`)
}

export function calculatePrice(quantity: number, unitPrice: number): number {
  return quantity * unitPrice
}

export async function callPartnerAPI(endpoint: string, payload: any) {
  const res = await fetch(`https://partner-api.com/${endpoint}`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return res.json()
}

export function setupAdminRoutes(app: any) {
  app.post("/api/admin/delete-user", async (req: any, res: any) => {
    const userId = req.body.userId
    await db_deleteUser(userId)
    res.json({ success: true })
  })
}

function db_deleteUser(_userId: string) {}
