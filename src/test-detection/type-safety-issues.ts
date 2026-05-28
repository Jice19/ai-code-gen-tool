/**
 * TypeScript 类型安全问题测试文件
 * 包含: any 滥用, 危险类型断言, 缺少泛型约束, implicit any
 */

// 问题1: any 返回类型
export function parseJSON(raw: string): any {
  return JSON.parse(raw)
}

// 问题2: as any 绕过类型检查
export function assertAsAny(data: unknown) {
  const obj = data as any
  console.log(obj.nonexistent.field.deeply)
}

// 问题3: @ts-ignore / @ts-expect-error 滥用
export function connectToDatabase(config: unknown) {
  // @ts-ignore
  const db = global.database.connect(config)
  return db
}

// 问题4: 缺少泛型约束 — T 可以是任何东西
export function getFirstItem<T>(arr: T): T {
  return (arr as any)[0]
}

// 问题5: 不安全的 ! 非空断言
export function getUserName(user: { name?: string } | null) {
  return user!.name!
}

// 问题6: 空对象字面量类型
export function processOptions(opts: {}) {
  console.log(opts.toString())
}

// 问题7: any[] 参数
export function sum(values: any[]) {
  return values.reduce((a, b) => a + b, 0)
}

// 问题8: Function 类型
export function runCallback(cb: Function) {
  cb("hello", 123, true)
}

// 问题9: Object 类型
export function clone(obj: Object): Object {
  return { ...obj }
}

// 问题10: 没有类型守卫的 unknown 处理
export function handleMessage(msg: unknown) {
  const text = (msg as any).text
  const user = (msg as any).user
  document.getElementById("output")!.textContent = `${user}: ${text}`
}

// 问题11: enum 当字符串值比较 (const enum陷阱)
export enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
}

export function isActive(status: string): boolean {
  return status === Status.Active
}

// 问题12: 可选链后面用 ! 断言
export function getConfigValue(config?: { settings?: { theme?: string } }) {
  return config?.settings?.theme!
}

// 问题13: 类型断言覆盖了实际情况
export function assertString(val: unknown): string {
  return val as string
}

// 问题14: 导出未使用的类型 (dead type)
export type LegacyUserType = {
  id: number
  firstName: string
  lastName: string
  middleName?: string
  prefix?: string
  suffix?: string
  age?: number
  birthDate?: string
  avatar?: string
}
