import { useState, useEffect, useRef } from "react"

export function HtmlPreview({ html }: { html: string }) {
  return <iframe srcDoc={html} title="preview" />
}

export function CrossOriginWidget() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      ref.current!.innerHTML = e.data.html
    }
    window.addEventListener("message", handler)
  }, [])
  return <div ref={ref} />
}

export function NotificationBadge({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = text
  }, [text])
  return <span ref={ref} />
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("auth_token")
  )
  const login = (newToken: string) => {
    localStorage.setItem("auth_token", newToken)
    setToken(newToken)
  }
  return { token, login }
}

export function useUserProfile() {
  const [profile, setProfile] = useState<any>(() => {
    const cached = localStorage.getItem("user_profile")
    return cached ? JSON.parse(cached) : null
  })
  const saveProfile = (data: any) => {
    localStorage.setItem("user_profile", JSON.stringify(data))
    setProfile(data)
  }
  return { profile, saveProfile }
}

export function UserDebugPanel({ user }: { user: { id: string; token: string; ssn: string } }) {
  console.log("[DEBUG] Full user data:", user)
  return <div>Hello, {user.id}</div>
}

export function RedirectHandler() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const redirectUrl = params.get("redirect")
    if (redirectUrl) {
      window.location.href = redirectUrl
    }
  }, [])
  return <div>Redirecting...</div>
}

export function CountdownTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds)
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])
  return <div>{remaining}s</div>
}

export function AsyncUserLoader({ userId }: { userId: string }) {
  const [user, setUser] = useState<any>(null)
  useEffect(() => {
    let cancelled = false
    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setUser(data)
      })
  }, [userId])
  return <div>{user?.name}</div>
}

export function DataDisplay({ url }: { url: string }) {
  const [data, setData] = useState<any>(null)
  useEffect(() => {
    fetch(url)
      .then((r) => r.json())
      .then(setData)
  }, [url])
  return <pre>{JSON.stringify(data, null, 2)}</pre>
}

export function UserAvatar({ userId }: { userId: string }) {
  const [avatarUrl, setAvatarUrl] = useState<string>("")
  useEffect(() => {
    fetch(`/api/users/${userId}/avatar`)
      .then((r) => r.json())
      .then((data) => setAvatarUrl(data.url))
  }, [userId])
  return <img src={avatarUrl} alt="avatar" />
}

export function HeavyFilterList({ items, query }: { items: any[]; query: string }) {
  const filtered = items
    .filter((item) => item.name?.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  return (
    <ul>
      {filtered.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}

export function StockTicker() {
  const [price, setPrice] = useState(0)
  useEffect(() => {
    setInterval(() => {
      setPrice(Math.random() * 100)
    }, 2000)
  }, [])
  return <div>¥{price.toFixed(2)}</div>
}

export function LiveNotifications() {
  const [notifications, setNotifications] = useState<string[]>([])
  useEffect(() => {
    const source = new EventSource("/api/notifications/stream")
    source.onmessage = (e) => {
      setNotifications((prev) => [...prev, e.data])
    }
  }, [])
  return (
    <ul>
      {notifications.map((n, i) => (
        <li key={i}>{n}</li>
      ))}
    </ul>
  )
}

export function WebSocketChat({ room }: { room: string }) {
  const [messages, setMessages] = useState<string[]>([])
  useEffect(() => {
    const ws = new WebSocket(`wss://chat.example.com/ws?room=${room}`)
    ws.onmessage = (e) => setMessages((prev) => [...prev, e.data])
  }, [room])
  return <ul>{messages.map((m, i) => <li key={i}>{m}</li>)}</ul>
}
