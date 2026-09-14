"use client";

import { useEffect } from "react";

/** Registers the PWA service worker in production (and dev, if it exists). */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // Service worker registration failed — app still works as a normal web app.
      });
  }, []);
  return null;
}
