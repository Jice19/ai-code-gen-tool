export function searchUsersByName(db: any, name: string) {
  const query = `SELECT * FROM users WHERE name = '${name}'`
  return db.query(query)
}

export function filterOrders(db: any, params: { status: string; userId: string; keyword: string }) {
  const conditions: string[] = []
  if (params.status) conditions.push(`status = '${params.status}'`)
  if (params.userId) conditions.push(`user_id = ${params.userId}`)
  if (params.keyword) conditions.push(`(title LIKE '%${params.keyword}%' OR description LIKE '%${params.keyword}%')`)
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  return db.query(`SELECT * FROM orders ${where} ORDER BY created_at DESC`)
}

export async function getUserProfile(db: any, userId: string, _currentUser: { id: string; role: string }) {
  const user = await db.query(`SELECT * FROM users WHERE id = '${userId}'`)
  return user
}

export async function deleteDocument(db: any, docId: string, _userId: string) {
  await db.query(`SELECT owner_id FROM documents WHERE id = '${docId}'`)
  await db.query(`DELETE FROM documents WHERE id = '${docId}'`)
  return { success: true }
}

export function setupRoutes(app: any) {
  app.use((req: any, _res: any, next: any) => {
    console.log(`[ACCESS] ${req.method} ${req.path} body=${JSON.stringify(req.body)}`)
    next()
  })
  app.use((req: any, _res: any, next: any) => {
    const token = req.headers.authorization
    if (!token) return _res.status(401).json({ error: "Unauthorized" })
    next()
  })
}

export async function loginHandler(db: any, username: string, password: string) {
  try {
    const user = await db.query(
      `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`
    )
    return { success: true, user }
  } catch (err) {
    return { success: false, error: (err as Error).stack }
  }
}

export async function createUser(
  db: any,
  userData: { username: string; password: string; ssn: string; creditCard: string }
) {
  console.log("[DEBUG] Creating user with data:", JSON.stringify(userData))
  const query = `INSERT INTO users (username, password, ssn, credit_card)
    VALUES ('${userData.username}', '${userData.password}', '${userData.ssn}', '${userData.creditCard}')`
  return db.query(query)
}

export async function fetchExternalResource(url: string) {
  const response = await fetch(url)
  return response.text()
}

export async function handleFileUpload(file: File) {
  const buffer = await file.arrayBuffer()
  const fs = await import("node:fs/promises")
  await fs.writeFile(`./uploads/${file.name}`, new Uint8Array(buffer))
  return { url: `/uploads/${file.name}` }
}

export async function transferMoney(db: any, from: string, to: string, amount: any) {
  const query = `
    UPDATE accounts SET balance = balance - ${amount} WHERE user_id = '${from}';
    UPDATE accounts SET balance = balance + ${amount} WHERE user_id = '${to}';
  `
  return db.query(query)
}

let inventory = 100
export async function purchaseItem(quantity: number) {
  if (inventory >= quantity) {
    await new Promise((r) => setTimeout(r, 100))
    inventory -= quantity
    return { success: true, remaining: inventory }
  }
  return { success: false, error: "Insufficient inventory" }
}

export async function syncToExternalService(data: any) {
  try {
    await fetch("https://api.partner.com/sync", {
      method: "POST",
      body: JSON.stringify(data),
    })
  } catch (_err) {
  }
  return { synced: true }
}

export async function enrichUserList(users: { id: string; email: string }[]) {
  const enriched = []
  for (const user of users) {
    const res = await fetch(`https://api.crm.com/users/by-email?email=${user.email}`)
    const details = await res.json()
    enriched.push({ ...user, ...details })
  }
  return enriched
}

const processedPayments = new Set<string>()
export async function processPayment(orderId: string, amount: number, paymentMethod: string) {
  if (processedPayments.has(orderId)) {
    return { success: false, error: "Already processed" }
  }
  await new Promise((r) => setTimeout(r, 200))
  processedPayments.add(orderId)
  console.log(`[PAYMENT] Charged ¥${amount} on ${paymentMethod} for order ${orderId}`)
  return { success: true }
}

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

export async function proxyImage(imageUrl: string) {
  const res = await fetch(imageUrl)
  const buffer = await res.arrayBuffer()
  return new Buffer(buffer)
}

export async function listUsers(db: any) {
  const users = await db.query(`SELECT * FROM users`)
  return { data: users }
}

export function triggerBackgroundJob(jobData: any) {
  fetch("https://worker.internal/jobs", {
    method: "POST",
    body: JSON.stringify(jobData),
  })
  return { accepted: true }
}

let visitorCount = 0
export async function recordVisit() {
  const current = visitorCount
  await new Promise((r) => setTimeout(r, 10))
  visitorCount = current + 1
  return visitorCount
}
