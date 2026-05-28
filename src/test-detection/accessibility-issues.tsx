/**
 * Accessibility 问题测试文件
 * 包含: 缺少 aria-*, 无 alt 文本, 非语义化 HTML, 键盘陷阱, 颜色对比度不足
 */
import { useState } from "react"

// 问题1: 图片没有 alt 属性
export function ImageGallery() {
  return (
    <div>
      <img src="/hero.png" />
      <img src="/banner.jpg" />
    </div>
  )
}

// 问题2: div 模拟 button — 无 role, 无 tabIndex, 无键盘事件
export function ClickableCard() {
  return (
    <div onClick={() => alert("clicked")} className="card">
      <span>Click me</span>
    </div>
  )
}

// 问题3: form 无 label 关联
export function LoginForm() {
  return (
    <form>
      <input type="text" placeholder="username" />
      <input type="password" placeholder="password" />
      <button>Submit</button>
    </form>
  )
}

// 问题4: 自定义 checkbox — 缺少 role="checkbox", aria-checked, tabIndex
export function CustomCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <span onClick={onChange} className={checked ? "checked" : ""}>
      {checked ? "✓" : "○"}
    </span>
  )
}

// 问题5: 颜色对比度不足 — 浅灰字
export function LowContrastText() {
  return (
    <div style={{ background: "#fff" }}>
      <p style={{ color: "#ccc" }}>这条文字在各种背景下都看不清</p>
      <span style={{ color: "#ddd", fontSize: "12px" }}>更看不清</span>
    </div>
  )
}

// 问题6: 没有标题层级的页面
export function PageWithoutHeadings() {
  return (
    <div>
      <div className="title">我的页面</div>
      <div className="subtitle">核心价值</div>
      <p>大量文本内容...</p>
    </div>
  )
}

// 问题7: aria-label 在非交互元素上
export function DecorativeIcon() {
  return (
    <div aria-label="decorative star" className="star-icon">
      <svg viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </div>
  )
}

// 问题8: video 没有 captions / track
export function VideoPlayer() {
  return <video src="/promo.mp4" autoPlay controls />
}

// 问题9: ul/li 没有做 role="list" (CSS list-style: none 时 Safari 会移除语义)
export function NavigationMenu() {
  return (
    <nav>
      <ul style={{ listStyle: "none" }}>
        <li onClick={() => {}}>首页</li>
        <li onClick={() => {}}>产品</li>
        <li onClick={() => {}}>联系</li>
      </ul>
    </nav>
  )
}

// 问题10: 省略号按钮没有描述
export function EllipsisMenu() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(!open)}>...</button>
      {open && (
        <div>
          <button>编辑</button>
          <button>删除</button>
        </div>
      )}
    </>
  )
}
