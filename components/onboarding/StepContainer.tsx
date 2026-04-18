"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

export const stepVariants: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 52 : -52,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 340, damping: 30 },
  },
  exit: (dir: number) => ({
    x: dir < 0 ? 52 : -52,
    opacity: 0,
    transition: { duration: 0.18, ease: "easeIn" },
  }),
};

interface StepContainerProps {
  direction: number;
  children: ReactNode;
}

export default function StepContainer({ direction, children }: StepContainerProps) {
  return (
    <motion.div custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit">
      {children}
    </motion.div>
  );
}
