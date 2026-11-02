import { useEffect, useRef, useState } from "react";
/** Smoothly animates a displayed number toward its target. */
export function useTicker(target: number) {
  const [v, setV] = useState(0);
  const cur = useRef(0);
  useEffect(() => {
    const t = setInterval(() => {
      const d = target - cur.current;
      cur.current = Math.abs(d) < 1e-9 ? target : cur.current + d * 0.15;
      setV(cur.current);
      if (cur.current === target) clearInterval(t);
    }, 40);
    return () => clearInterval(t);
  }, [target]);
  return v;
}
