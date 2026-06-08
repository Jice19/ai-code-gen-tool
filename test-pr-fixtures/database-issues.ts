export function findUserByEmail(db: any, email: string) {
  return db.query(`SELECT * FROM users WHERE email = '${email}'`)
}

export function listOrders(db: any, sortBy: string, direction: string) {
  return db.query(`SELECT * FROM orders ORDER BY ${sortBy} ${direction} LIMIT 50`)
}

export function searchProducts(db: any, keyword: string) {
  return db.query(`SELECT * FROM products WHERE name LIKE '%${keyword}%'`)
}

export function resetAllUserCredits(db: any) {
  return db.query(`UPDATE users SET credits = 0`)
}

export function clearExpiredSessions(db: any) {
  return db.query(`DELETE FROM sessions`)
}

export function getAllTransactions(db: any) {
  return db.query(`SELECT * FROM transactions`)
}

export async function getUsersWithOrders(db: any) {
  const users = await db.query(`SELECT * FROM users WHERE status = 'active'`)
  const result = []
  for (const user of users) {
    const orders = await db.query(
      `SELECT * FROM orders WHERE user_id = '${user.id}'`
    )
    result.push({ ...user, orders })
  }
  return result
}

export async function getArticlesWithAuthors(db: any) {
  const articles = await db.query(`SELECT * FROM articles LIMIT 50`)
  for (const article of articles) {
    const author = await db.query(
      `SELECT * FROM users WHERE id = '${article.author_id}'`
    )
    article.author = author
  }
  return articles
}

export function listUsersPage(db: any, page: number, pageSize: number) {
  const offset = (page - 1) * pageSize
  return db.query(`SELECT * FROM users ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`)
}

export function searchByJsonField(db: any, metaKey: string, metaValue: string) {
  return db.query(
    `SELECT * FROM events WHERE metadata->>'${metaKey}' = '${metaValue}'`
  )
}

export function findUserOrders(db: any, userId: string, status: string) {
  return db.query(
    `SELECT * FROM orders WHERE user_id = '${userId}' AND status = '${status}' ORDER BY created_at DESC`
  )
}

export async function createOrderWithPayment(
  db: any,
  orderData: { userId: string; amount: number; items: any[] }
) {
  const conn = await db.getConnection()
  await conn.query("BEGIN")
  try {
    const orderResult = await conn.query(
      `INSERT INTO orders (user_id, amount) VALUES ('${orderData.userId}', ${orderData.amount}) RETURNING id`
    )
    const orderId = orderResult[0].id

    const paymentRes = await fetch("https://api.payment.com/charge", {
      method: "POST",
      body: JSON.stringify({ orderId, amount: orderData.amount }),
    })

    if (paymentRes.ok) {
      await conn.query(
        `UPDATE orders SET status = 'paid' WHERE id = '${orderId}'`
      )
      await conn.query("COMMIT")
    } else {
      throw new Error("Payment failed")
    }
    return { orderId, success: true }
  } catch (err) {
    throw err
  } finally {
    conn.release()
  }
}

export async function transferCredits(db: any, fromId: string, toId: string, amount: number) {
  await db.query("BEGIN")
  await db.query(`UPDATE users SET credits = credits - ${amount} WHERE id = '${fromId}'`)
  await db.query(`UPDATE users SET credits = credits + ${amount} WHERE id = '${toId}'`)
  await db.query("COMMIT")
}

export async function runReport(db: any, reportType: string) {
  const conn = await db.getConnection()
  const data = await conn.query(`SELECT * FROM reports WHERE type = '${reportType}'`)
  conn.release()
  return data
}

export const migration_001 = `
  ALTER TABLE users
    DROP COLUMN legacy_field,
    MODIFY COLUMN email TEXT NOT NULL;
`

export const migration_002 = `
  ALTER TABLE orders
    DROP FOREIGN KEY fk_orders_user_id,
    DROP COLUMN user_id;
`
