"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";

interface ToastItem {
  id: number;
  message: React.ReactNode;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const addToast = useCallback((message: React.ReactNode) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    function handler(e: Event) {
      addToast((e as CustomEvent<React.ReactNode>).detail);
    }
    window.addEventListener("app:toast", handler);
    return () => window.removeEventListener("app:toast", handler);
  }, [addToast]);

  return (
    <>
      {children}
      {mounted &&
        createPortal(
          <div
            style={{
              position: "fixed",
              bottom: 88,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "center",
              pointerEvents: "none",
              width: 280,
            }}
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                style={{
                  background: "rgba(0,0,0,0.35)",
                  backdropFilter: "blur(8px)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 500,
                  borderRadius: 9999,
                  padding: "10px 20px",
                  textAlign: "center",
                  width: "100%",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                }}
              >
                {t.message}
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
