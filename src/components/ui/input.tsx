/**
 * 文件：src/components/ui/input.tsx
 * 用途：文本输入框组件，统一样式与交互状态
 * 作者：Ryan
 * 创建日期：2025-09-25
 * 修改记录：
 * - 2025-09-25：添加中文文件头与 JSDoc 注释
 */
"use client"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Input 输入组件
 * 提供一致的外观、禁用状态与无障碍支持
 * @example
 * <Input type="text" placeholder="请输入" />
 * @property type - 输入类型，如 text/password/email 等
 * @property disabled - 禁用输入
 * @property aria-label - 无障碍标签
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] transition-base outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "h-10 rounded-md",
        className
      )}
      {...props}
    />
  )
}

export { Input }
