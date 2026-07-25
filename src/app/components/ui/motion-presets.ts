// Shared spring presets — Apple-style motion vocabulary.
// Critically damped by default; reserve bounce for momentum-driven moments.

import type { Transition } from 'motion/react';

/** Default UI spring: graceful, no overshoot (damping ~1.0, response ~0.4). */
export const springSoft: Transition = { type: 'spring', bounce: 0, duration: 0.42 };

/** Snappier settle for small controls. */
export const springSnap: Transition = { type: 'spring', bounce: 0, duration: 0.3 };

/** Momentum spring: a little bounce, only after a physical action (drag / flick / commit). */
export const springBounce: Transition = { type: 'spring', bounce: 0.24, duration: 0.44 };

/** Staggered reveal container for lists / grids. */
export const staggerParent = (stagger = 0.06, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

/** Child reveal: rise + fade from the current value. */
export const riseChild = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: springSoft },
};
