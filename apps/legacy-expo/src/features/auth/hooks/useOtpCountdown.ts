import { useState, useEffect, useCallback } from 'react';

export function useOtpCountdown(initialSeconds: number = 45) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) return;

    const timer = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds]);

  const restart = useCallback((newSeconds?: number) => {
    setSeconds(newSeconds ?? initialSeconds);
  }, [initialSeconds]);

  return {
    seconds,
    isActive: seconds > 0,
    isFinished: seconds === 0,
    restart,
  };
}
