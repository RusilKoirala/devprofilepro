"use client"

import { motion, useReducedMotion } from "motion/react"

// Cards settle in as they scroll into view: a small rise out of a soft blur, staggered by `order`.
export function Reveal({ order = 0, className, children }: { order?: number; className?: string; children: React.ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28, scale: 0.97, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay: order * 0.09, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
