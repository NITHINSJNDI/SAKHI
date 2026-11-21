import { useEffect, useRef, useState } from "react";

import { successHaptic } from "./haptics";

/** A seconds countdown for relief-tip timers: tap to start / pause, tap again at 0 to restart. */
export function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const leftRef = useRef(seconds);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      leftRef.current = Math.max(0, leftRef.current - 1);
      setLeft(leftRef.current);
      if (leftRef.current === 0) {
        setRunning(false);
        successHaptic();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const toggle = () => {
    if (leftRef.current === 0) {
      leftRef.current = seconds;
      setLeft(seconds);
      setRunning(true);
    } else setRunning((r) => !r);
  };

  return { left, running, toggle };
}
