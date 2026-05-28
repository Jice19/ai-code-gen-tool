/**
 * 运行时 Bug 测试文件
 * 包含: 竞态条件, null/undefined 访问, 闭包陷阱,
 *       缺少错误处理, useEffect 无限循环, 状态不一致
 */
import { useState, useEffect, useCallback } from "react"

// 问题1: 竞态条件 — fetch 结果顺序不确定
export function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/search?q=${query}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data)
        setLoading(false)
      })
  }, [query])

  if (loading) return <div>Loading...</div>
  return <ul>{results.map((r, i) => <li key={i}>{r}</li>)}</ul>
}

// 问题2: 闭包陷阱 — setInterval 里读的是旧 state
export function Stopwatch() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds(seconds + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return <div>Elapsed: {seconds}s</div>
}

// 问题3: 没有空值检查 — .map() 在可能为 undefined 的值上
export function UserList({ users }: { users?: { name: string }[] }) {
  return (
    <ul>
      {users.map((u) => (
        <li>{u.name}</li>
      ))}
    </ul>
  )
}

// 问题4: 对象可能为 null — 没有检查
export function ProfileView({ profile }: { profile: { name: string; bio: string } | null }) {
  return (
    <div>
      <h2>{profile.name}</h2>
      <p>{profile.bio}</p>
    </div>
  )
}

// 问题5: 没有错误状态 — promise 失败没处理
export function AsyncDataLoader() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/data")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Loading...</div>
  return <pre>{JSON.stringify(data, null, 2)}</pre>
}

// 问题6: useEffect 无限循环 — object/array 作为依赖
export function UserSettings({ config }: { config: { theme: string; lang: string } }) {
  const [theme, setTheme] = useState(config.theme)

  useEffect(() => {
    setTheme(config.theme)
  }, [config])

  return <div>Theme: {theme}</div>
}

// 问题7: 内存泄漏 — fetch 未取消
export function LiveFeed() {
  const [feed, setFeed] = useState<any[]>([])

  useEffect(() => {
    let active = true

    const poll = () => {
      fetch("/api/feed")
        .then((r) => r.json())
        .then((data) => {
          setFeed(data)
          if (active) setTimeout(poll, 5000)
        })
    }
    poll()

    return () => {
      active = false
    }
  }, [])

  return (
    <ul>
      {feed.map((item, i) => (
        <li key={i}>{item.text}</li>
      ))}
    </ul>
  )
}

// 问题8: useCallback 依赖不完整
export function DebouncedButton({ onClick }: { onClick: (val: number) => void }) {
  const [count, setCount] = useState(0)

  const handleClick = useCallback(() => {
    onClick(count)
  }, [])

  return <button onClick={handleClick}>Click ({count})</button>
}

// 问题9: 同时 setState 导致 batch 问题
export function DoubleIncrement() {
  const [a, setA] = useState(0)
  const [b, setB] = useState(0)

  const increment = () => {
    setA(a + 1)
    setB(a + 1)
  }

  return (
    <div>
      <p>A: {a}, B: {b}</p>
      <button onClick={increment}>+</button>
    </div>
  )
}

// 问题10: NaN 比较 (永远 false)
export function PriceCheck({ price }: { price: number }) {
  const isFree = price === NaN
  return <div>{isFree ? "Free!" : `¥${price}`}</div>
}
