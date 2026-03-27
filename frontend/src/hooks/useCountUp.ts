import { useEffect, useRef, useState } from 'react';
export function useCountUp(target: number, duration = 900): number {
  const [v, setV] = useState(0);
  const raf = useRef(0);
  const t0  = useRef(0);
  useEffect(() => {
    if (!target) { setV(0); return; }
    t0.current = performance.now();
    function tick(now: number) {
      const p = Math.min((now - t0.current) / duration, 1);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    }
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return v;
}
