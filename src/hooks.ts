import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { clockwiseTarget } from './layout/geometry';

export function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/** Keep the screen awake while the phone sits on the table. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) await lock.release();
      } catch {
        // Not allowed (e.g. battery saver); the app still works.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };
    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => {});
    };
  }, [active]);
}

/**
 * Turn an absolute angle into an ever-increasing rotation so CSS transitions
 * always animate clockwise. Keeps the last value while `angle` is null.
 */
export function useClockwise(angle: number | null): number | null {
  const last = useRef<number | null>(null);
  const value = angle == null ? last.current : last.current == null ? angle : clockwiseTarget(last.current, angle);
  useEffect(() => {
    last.current = value;
  });
  return value;
}

/** Full screen, and lock the current orientation where the browser allows it. */
export async function enterFullscreen() {
  try {
    await document.documentElement.requestFullscreen();
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await orientation.lock?.(orientation.type);
  } catch {
    // Unsupported (e.g. iOS Safari): ignore.
  }
}
