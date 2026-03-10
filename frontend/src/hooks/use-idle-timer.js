import { useEffect, useRef, useCallback } from "react";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

/**
 * Detects user inactivity.
 * @param {object} options
 * @param {number} options.idleTimeout  - ms until considered idle (triggers onIdle)
 * @param {number} options.warnBefore   - ms before idle to show warning (triggers onWarn)
 * @param {function} options.onWarn     - called when warning threshold is reached
 * @param {function} options.onIdle     - called when idle timeout is reached
 */
export function useIdleTimer({ idleTimeout, warnBefore, onWarn, onIdle }) {
  const idleTimerRef = useRef(null);
  const warnTimerRef = useRef(null);

  const resetTimer = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(warnTimerRef.current);

    warnTimerRef.current = setTimeout(onWarn, idleTimeout - warnBefore);
    idleTimerRef.current = setTimeout(onIdle, idleTimeout);
  }, [idleTimeout, warnBefore, onWarn, onIdle]);

  useEffect(() => {
    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, resetTimer, { passive: true })
    );
    resetTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, resetTimer)
      );
      clearTimeout(idleTimerRef.current);
      clearTimeout(warnTimerRef.current);
    };
  }, [resetTimer]);
}
