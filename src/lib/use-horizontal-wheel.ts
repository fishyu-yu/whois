"use client"
import { useEffect } from "react"

/**
 * 让带有 data-scroll-x-wheel 的元素支持用鼠标滚轮进行横向滚动。
 * 默认将纵向滚动（deltaY）映射为横向 scrollLeft 改变，仅当内容溢出时生效。
 * @param selector CSS 选择器，默认 '[data-scroll-x-wheel]'
 */
export function useHorizontalWheel(selector: string = "[data-scroll-x-wheel]") {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector))
    if (!elements.length) return

    const handler = (e: WheelEvent) => {
      const target = e.currentTarget as HTMLElement | null
      if (!target) return
      const canScroll = target.scrollWidth > target.clientWidth
      if (!canScroll) return

      const dy = (e as WheelEvent).deltaY || 0
      const dx = (e as WheelEvent).deltaX || 0
      // 当纵向滚动更明显时，将其映射为横向滚动
      if (Math.abs(dy) >= Math.abs(dx)) {
        target.scrollLeft += dy
        // 阻止默认的页面纵向滚动，否则体验不佳
        e.preventDefault()
      }
    }

    elements.forEach(el => el.addEventListener("wheel", handler, { passive: false }))
    return () => {
      elements.forEach(el => el.removeEventListener("wheel", handler))
    }
  }, [selector])
}

export default useHorizontalWheel