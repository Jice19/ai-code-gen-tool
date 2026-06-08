/**
 * 安全问题测试文件
 * 包含: XSS, dangerouslySetInnerHTML, eval, 不安全URL, 未脱敏输入, 硬编码密钥
 */
import { useState } from "react"

// 问题1: dangerouslySetInnerHTML 直接使用用户输入
export function UserComment({ text }: { text: string }) {
  return <div dangerouslySetInnerHTML={{ __html: text }} />
}

// 问题2: 使用 eval 动态执行代码
export function DynamicCalculator({ expression }: { expression: string }) {
  const calc = () => {
    const result = eval(expression)
    return result
  }
  return <div>Result: {calc()}</div>
}

// 问题3: href 使用未验证的输入 (javascript: 协议注入)
export function UserLink({ url }: { url: string }) {
  return <a href={url}>用户链接</a>
}

// 问题4: target="_blank" 没有 noopener noreferrer
export function ExternalAd({ link }: { link: string }) {
  return (
    <a href={link} target="_blank">
      查看广告
    </a>
  )
}

// 问题5: 内联事件处理器中的字符串拼接 XSS
export function ProfileCard({ username }: { username: string }) {
  return (
    <div
      onMouseEnter={() => {
        const el = document.getElementById("greeting")
        if (el) el.innerHTML = "Welcome, " + username
      }}
    >
      <span id="greeting" />
    </div>
  )
}

// 问题6: 硬编码 API 密钥 / Token
const API_SECRET = "sk-proj-abc123def456ghi789jklmno"
const MAPS_API_KEY = "AIzaSyD-xxxxxxxxxxxxxx"

export function fetchAPIData() {
  return fetch("https://api.example.com/data", {
    headers: {
      Authorization: `Bearer ${API_SECRET}`,
      "X-Maps-Key": MAPS_API_KEY,
    },
  })
}

// 问题7: JSONP 风格不安全脚本注入
export function loadExternalScript(src: string) {
  const script = document.createElement("script")
  script.src = src
  document.body.appendChild(script)
}

// 问题8: new Function 动态创建函数
export function createFilterFunction(filterCode: string) {
  return new Function("item", `return ${filterCode}`)
}

// 问题9: innerHTML 注入 — 搜索词高亮直接在 DOM 里拼接
export function SearchHighlight({ text, keyword }: { text: string; keyword: string }) {
  const highlighted = text.replace(
    new RegExp(keyword, "gi"),
    (m) => `<mark>${m}</mark>`
  )
  return <p dangerouslySetInnerHTML={{ __html: highlighted }} />
}

// 问题10: 不安全的 postMessage (没有验证 origin)
export function CrossOriginMessaging() {
  window.addEventListener("message", (event) => {
    const data = JSON.parse(event.data)
    document.getElementById("remote-content")!.innerHTML = data.html
  })
  return <div id="remote-content" />
}

// 问题11: 密码明文存储在 state 里
export function PasswordForm() {
  const [password, setPassword] = useState("")
  return (
    <form>
      <input
        type="text"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button>Login</button>
    </form>
  )
}

// 问题12: console.log 泄露敏感数据
export function UserDebugPanel({ user }: { user: { id: string; token: string; ssn: string } }) {
  console.log("[DEBUG] user data:", user)
  return <div>User: {user.id}</div>
}
