"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const ToastContext = createContext({
  message: "",
  showToast: (() => undefined) as (message: string) => void,
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((nextMessage: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(nextMessage);
    timer.current = setTimeout(() => setMessage(""), 2400);
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <ToastContext.Provider value={{ message, showToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function ToastOutlet({ variant = "app" }: { variant?: "home" | "app" }) {
  const { message } = useContext(ToastContext);
  const className =
    variant === "home"
      ? `site-toast${message ? " is-visible" : ""}`
      : `toast${message ? " show" : ""}`;
  return (
    <div
      className={`app-toast ${className}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {message}
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext).showToast;
}
