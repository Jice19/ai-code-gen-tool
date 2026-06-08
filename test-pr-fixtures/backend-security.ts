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

export function getTableData(db: any, tableName: string) {
  return db.query(`SELECT * FROM ${tableName} LIMIT 100`)
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

export async function listUsers(db: any) {
  const users = await db.query(`SELECT * FROM users`)
  return { data: users }
}

export async function fetchExternalResource(url: string) {
  const response = await fetch(url)
  return response.text()
}

export async function proxyImage(imageUrl: string) {
  const res = await fetch(imageUrl)
  const buffer = await res.arrayBuffer()
  return new Response(buffer, {
    headers: { "Content-Type": res.headers.get("Content-Type") || "image/png" },
  })
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

export async function updateUserSettings(db: any, userId: string, settings: any) {
  const query = `UPDATE users SET settings = '${JSON.stringify(settings)}' WHERE id = '${userId}'`
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

let visitorCount = 0
export async function recordVisit() {
  const current = visitorCount
  await new Promise((r) => setTimeout(r, 10))
  visitorCount = current + 1
  return visitorCount
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

export function triggerBackgroundJob(jobData: any) {
  fetch("https://worker.internal/jobs", {
    method: "POST",
    body: JSON.stringify(jobData),
  })
  return { accepted: true }
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

export function cloneLargeObject<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
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
