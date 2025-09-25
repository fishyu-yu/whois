/**
 * 文件：src/components/theme-provider.tsx
 * 用途：封装 next-themes 的 ThemeProvider，用于全局主题管理
 * 作者：Ryan
 * 创建日期：2025-09-25
 * 修改记录：
 * - 2025-09-25：添加中文文件头与 JSDoc 注释
 */
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ComponentProps } from "react"

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>

/**
 * ThemeProvider 组件
 * 说明：透传 NextThemesProvider 的所有属性，统一在应用根部使用
 * @param props - 组件属性（如 defaultTheme、attribute、enableSystem 等）
 * @returns JSX.Element
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}