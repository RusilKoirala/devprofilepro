"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"

// Shows one item at a time and flips the next one up into place. Reduced motion: the first item stays.
export function Cycler({ items, interval = 2600, className }: { items: React.ReactNode[]; interval?: number; className?: string }) {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (reduce || items.length < 2) return
    let timer: ReturnType<typeof setInterval>
    const start = setTimeout(() => {
      setIndex((i) => (i + 1) % items.length)
      timer = setInterval(() => setIndex((i) => (i + 1) % items.length), interval)
    }, interval)
    return () => { clearTimeout(start); clearInterval(timer) }
  }, [reduce, items.length, interval])

  return (
    <span className={cn("relative inline-grid overflow-hidden align-middle [perspective:600px]", className)}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={index}
          className="col-start-1 row-start-1 inline-flex items-center justify-center"
          initial={{ y: "70%", opacity: 0, rotateX: -70 }}
          animate={{ y: "0%", opacity: 1, rotateX: 0 }}
          exit={{ y: "-70%", opacity: 0, rotateX: 70 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {items[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
