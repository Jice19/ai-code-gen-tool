/**
 * 代码坏味道 / 不良实践测试文件
 * 包含: 直接 DOM 操作, 缺少 useEffect 清理, God Component,
 *       props 透传过多, 嵌套三元, 魔法数字, 过深的回调嵌套
 */
import { useState, useEffect, useRef, useCallback } from "react"

// 问题1: 直接 DOM 操作获取值
export function FormWithDOM() {
  const handleSubmit = () => {
    const name = (document.getElementById("name") as HTMLInputElement).value
    const email = (document.getElementById("email") as HTMLInputElement).value
    alert(`${name}: ${email}`)
  }
  return (
    <div>
      <input id="name" />
      <input id="email" />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  )
}

// 问题2: useEffect 没有清理 — setInterval 泄漏
export function LiveClock() {
  const [time, setTime] = useState(new Date().toLocaleTimeString())
  useEffect(() => {
    setInterval(() => {
      setTime(new Date().toLocaleTimeString())
    }, 1000)
  })
  return <div>{time}</div>
}

// 问题3: 空 useEffect 但缺少清理 — EventListener 泄漏
export function TrackMouse() {
  const [pos, setPos] = useState({ x: 0, y: 0 })
  useEffect(() => {
    document.addEventListener("mousemove", (e) => {
      setPos({ x: e.clientX, y: e.clientY })
    })
  }, [])
  return (
    <div>
      Mouse at {pos.x}, {pos.y}
    </div>
  )
}

// 问题4: God Component — 一个组件做了太多事
export function UserDashboard() {
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<"asc" | "desc">("asc")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [canEdit, setCanEdit] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
  }, [])

  const filtered = users
    .filter((u) => u.name.includes(search))
    .sort((a, b) =>
      sort === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    )

  return (
    <div>
      <input value={search} onChange={(e) => setSearch(e.target.value)} />
      <select value={sort} onChange={(e) => setSort(e.target.value as any)}>
        <option value="asc">A-Z</option>
        <option value="desc">Z-A</option>
      </select>
      <table>
        <tbody>
          {filtered.map((u) => (
            <tr key={u.id}>
              <td>{editingId === u.id ? <input value={editName} onChange={(e) => setEditName(e.target.value)} /> : u.name}</td>
              <td>{editingId === u.id ? <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} /> : u.email}</td>
              <td>
                {editingId === u.id ? (
                  <>
                    <button onClick={() => { setUsers(users.map((x) => (x.id === u.id ? { ...x, name: editName, email: editEmail } : x))); setEditingId(null) }}>Save</button>
                    <button onClick={() => setEditingId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditingId(u.id); setEditName(u.name); setEditEmail(u.email) }}>Edit</button>
                    <button onClick={() => { setDeleteId(u.id); setShowConfirm(true) }}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showConfirm && (
        <div>
          <p>Sure?</p>
          <button onClick={() => { setUsers(users.filter((u) => u.id !== deleteId)); setShowConfirm(false) }}>Yes</button>
          <button onClick={() => setShowConfirm(false)}>No</button>
        </div>
      )}
    </div>
  )
}

// 问题5: React query 在 try-catch 里 — 违反 hooks 规则
export function ConditionalHook() {
  const [error, setError] = useState<Error | null>(null)
  try {
    useEffect(() => {
      fetch("/api/data").catch(setError)
    }, [])
  } catch (e) {
    return <div>Error</div>
  }
  return <div>Data</div>
}

// 问题6: 魔法数字
export function PriceFormatter({ price }: { price: number }) {
  const fee = price * 0.029 + 0.3
  const discount = price > 100 ? price * 0.15 : price > 50 ? price * 0.1 : 0
  return <div>Final: ¥{(price + fee - discount) * 1.13}</div>
}

// 问题7: 过深的回调嵌套
export function NestedCallbacks() {
  const [a, setA] = useState(0)
  return (
    <div>
      <button
        onClick={() => {
          setA((prev) => {
            const newA = prev + 1
            if (newA > 10) {
              setTimeout(() => {
                setA(0)
                setTimeout(() => {
                  console.log("reset done")
                  setTimeout(() => {
                    alert("all done")
                  }, 500)
                }, 500)
              }, 1000)
            }
            return newA
          })
        }}
      >
        +1
      </button>
    </div>
  )
}

// 问题8: 重复的代码 — 多个组件有同结构逻辑
export function UserEmailField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [error, setError] = useState("")
  const validateEmail = () => {
    if (!value.includes("@")) setError("Invalid email")
    else setError("")
  }
  return (
    <div>
      <input value={value} onChange={(e) => onChange(e.target.value)} onBlur={validateEmail} />
      {error && <span>{error}</span>}
    </div>
  )
}

export function UserPhoneField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [error, setError] = useState("")
  const validatePhone = () => {
    if (value.length !== 11) setError("Invalid phone")
    else setError("")
  }
  return (
    <div>
      <input value={value} onChange={(e) => onChange(e.target.value)} onBlur={validatePhone} />
      {error && <span>{error}</span>}
    </div>
  )
}
