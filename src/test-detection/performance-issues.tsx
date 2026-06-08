/**
 * 性能问题测试文件
 * 包含: 缺少 memo/useMemo/useCallback, render 中大量计算, 未防抖,
 *       JSX 中内联对象/函数, 不必要的 re-render
 */
import { useState, useEffect, memo } from "react"

// 问题1: render 中排序 — 每次渲染都重新计算
export function SortedList({ items }: { items: { id: number; name: string }[] }) {
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name))
  return (
    <ul>
      {sorted.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}

// 问题2: JSX 中内联对象 — 每次都是新引用
export function InlineStyleCard({ text }: { text: string }) {
  return <div style={{ padding: "16px", margin: "8px", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>{text}</div>
}

// 问题3: JSX 中内联函数 — 子组件每次都重新渲染
export function InlineHandlerList({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((item, i) => (
        <ListItem key={i} item={item} onDelete={() => console.log("delete", i)} />
      ))}
    </ul>
  )
}

const ListItem = memo(function ListItem({ item, onDelete }: { item: string; onDelete: () => void }) {
  return (
    <li>
      {item} <button onClick={onDelete}>✕</button>
    </li>
  )
})

// 问题4: useEffect 没有依赖数组 — 每次渲染都执行
export function FrequentLogger({ message }: { message: string }) {
  useEffect(() => {
    console.log("render:", message)
  })
  return <div>{message}</div>
}

// 问题5: 没有防抖的实时搜索
export function LiveSearch({ onSearch }: { onSearch: (q: string) => void }) {
  const [query, setQuery] = useState("")
  return (
    <input
      value={query}
      onChange={(e) => {
        setQuery(e.target.value)
        onSearch(e.target.value)
      }}
    />
  )
}

// 问题6: 子组件不 memo — 父组件 state 变了全部重渲染
export function Dashboard() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
      <Header title="Dashboard" />
      <Sidebar links={["Home", "Profile", "Settings"]} />
      <MainContent count={count} />
      <Footer />
    </div>
  )
}

function Header({ title }: { title: string }) {
  return <h1>{title}</h1>
}

function Sidebar({ links }: { links: string[] }) {
  return <ul>{links.map((l) => <li key={l}>{l}</li>)}</ul>
}

function MainContent({ count }: { count: number }) {
  return <div>Count: {count}</div>
}

function Footer() {
  return <footer>© 2024</footer>
}

// 问题7: 列表 index 作为 key
export function TodoList({ todos }: { todos: { text: string }[] }) {
  const [list, setList] = useState(todos)
  return (
    <ul>
      {list.map((todo, i) => (
        <li key={i}>
          {todo.text}
          <button onClick={() => setList(list.filter((_, j) => j !== i))}>✕</button>
        </li>
      ))}
    </ul>
  )
}

// 问题8: 没有 lazy load / code split 的大组件
export function HeavyChart({ data }: { data: number[] }) {
  // 模拟大量计算
  const avg = data.reduce((a, b) => a + b, 0) / data.length
  const stddev = Math.sqrt(
    data.reduce((sum, v) => sum + (v - avg) ** 2, 0) / data.length
  )
  const sorted = [...data].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]

  return (
    <div className="chart">
      <svg width="800" height="400">
        {data.map((d, i) => (
          <rect key={i} x={i * 10} y={400 - d} width={8} height={d} fill="blue" />
        ))}
      </svg>
      <p>Avg: {avg}, Median: {median}, StdDev: {stddev}</p>
    </div>
  )
}
