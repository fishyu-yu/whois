import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 文件：src/lib/utils.ts
 * 用途：通用工具函数集合，提供类名合并工具 cn
 * 作者：Ryan
 * 创建日期：2025-09-25
 * 修改记录：
 * - 2025-09-25：添加中文文件头与 JSDoc 注释
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
