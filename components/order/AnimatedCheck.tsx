"use client";

import { motion } from "framer-motion";

export function AnimatedCheck() {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--success)] text-4xl text-white"
    >
      ✓
    </motion.div>
  );
}
