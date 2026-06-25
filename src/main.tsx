import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Muffle harmless and expected Vite dev server WebSocket disconnect errors
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const errorMsg = event.reason?.message || String(event.reason || "");
    if (
      errorMsg.includes("WebSocket") || 
      errorMsg.includes("websocket") ||
      errorMsg.includes("WS")
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener("error", (event) => {
    const errorMsg = event.message || "";
    if (
      errorMsg.includes("WebSocket") || 
      errorMsg.includes("websocket") ||
      errorMsg.includes("WS")
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
