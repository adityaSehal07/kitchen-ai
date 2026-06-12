import { useState, useEffect } from "react";

export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setShow(false);
  };

  if (!show || installed) return null;

  return (
    <div style={{
      position: "fixed", bottom: 16, left: 16, right: 16, zIndex: 999,
      background: "#1b1e23", borderRadius: 12, padding: "14px 18px",
      display: "flex", alignItems: "center", gap: 12,
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    }}>
      <div style={{
        background: "#f8d548", borderRadius: 8, width: 40, height: 40,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, flexShrink: 0,
      }}>⚡</div>
      <div style={{ flex: 1 }}>
        <p style={{ color: "#fff", fontWeight: 700, fontSize: 13, margin: 0 }}>
          Install KitchenAI
        </p>
        <p style={{ color: "rgba(255,255,255,.5)", fontSize: 11, margin: 0 }}>
          Add to home screen for quick access
        </p>
      </div>
      <button onClick={() => setShow(false)} style={{
        background: "none", border: "none", color: "rgba(255,255,255,.4)",
        fontSize: 18, cursor: "pointer", padding: "0 4px",
      }}>×</button>
      <button onClick={install} style={{
        background: "#f8d548", border: "none", borderRadius: 8,
        padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer",
        fontFamily: "inherit",
      }}>Install</button>
    </div>
  );
}