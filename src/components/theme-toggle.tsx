/**
 * 文件：src/components/theme-toggle.tsx
 * 用途：提供主题切换的下拉按钮，支持浅色/深色/系统
 * 作者：Ryan
 * 创建日期：2025-09-25
 * 修改记录：
 * - 2025-09-25：添加中文文件头与 JSDoc 注释
 */
"use client"

import * as React from "react"
import { Check, Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * ThemeToggle 主题切换组件
 * 提供浅色/深色/系统三种主题选择
 * @returns JSX.Element
 */
export function ThemeToggle() {
  /** 来自 next-themes 的 setTheme，用于设置当前主题 */
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="切换主题" className="relative text-muted-foreground hover:text-foreground">
          <Sun aria-hidden="true" className="size-5 rotate-0 opacity-100 transition-[transform,opacity] duration-150 dark:-rotate-90 dark:opacity-0" />
          <Moon aria-hidden="true" className="absolute size-5 rotate-90 opacity-0 transition-[transform,opacity] duration-150 dark:rotate-0 dark:opacity-100" />
          <span className="sr-only">切换主题</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-40 rounded-xl border-border p-1.5 shadow-lg duration-150">
        {[
          { value: "light", label: "浅色", Icon: Sun },
          { value: "dark", label: "深色", Icon: Moon },
          { value: "system", label: "系统", Icon: Monitor },
        ].map(({ value, label, Icon }) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)} aria-label={label} aria-current={theme === value ? "true" : undefined} className="min-h-11 gap-2.5 rounded-lg px-3">
            <Icon aria-hidden="true" className="size-4" />
            <span>{label}</span>
            {theme === value && <Check aria-hidden="true" className="ml-auto size-4 text-foreground" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
