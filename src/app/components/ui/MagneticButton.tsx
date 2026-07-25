'use client';

import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from 'motion/react';
import { useRef, type ReactNode, type ComponentPropsWithoutRef } from 'react';

type MagneticButtonProps = ComponentPropsWithoutRef<typeof motion.button> & {
  children: ReactNode;
  /** Max pull toward the cursor, in px. */
  strength?: number;
};

/**
 * A button whose content is magnetically pulled toward the pointer.
 * Uses motion values (not React state) so tracking never triggers re-renders
 * — per the skills' performance rule. Disabled under reduced motion.
 */
export default function MagneticButton({
  children,
  strength = 8,
  ...props
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 240, damping: 18, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 240, damping: 18, mass: 0.3 });

  const handleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    x.set((dx / (r.width / 2)) * strength);
    y.set((dy / (r.height / 2)) * strength);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      onPointerUp={reset}
      style={{ x: sx, y: sy }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
