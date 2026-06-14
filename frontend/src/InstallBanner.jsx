import { useState, useEffect } from "react";

export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    if(window.matchMedia("(display-mode: standalone)").matches ||
       window.navigator.standalone === true) {
      setIsStandalone(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Show after 3 seconds if not installed
    const timer = setTimeout(() => {
      if(!window.matchMedia("(display-mode: standalone)").matches) {
        setShow(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  const install = async () => {
    if(prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if(outcome === "accepted") setInstalled(true);
    } else {
      // iOS / no prompt — show instructions
      alert("To install:\n\niPhone: Tap Share → Add to Home Screen\n\nAndroid: Tap menu (⋮) → Add to Home Screen");
    }
    setShow(false);
  };

  if(isStandalone || installed || !show) return null;

  return (
    <div style={{
      position:"fixed", bottom:16, left:16, right:16, zIndex:9998,
      background:"#282C3F",
      borderRadius:16, padding:"14px 16px",
      display:"flex", alignItems:"center", gap:12,
      boxShadow:"0 8px 0 #0d0f18, 0 12px 40px rgba(0,0,0,.4)",
      border:"1px solid rgba(255,255,255,.1)",
      animation:"slideUp .3s ease",
    }}>
      <div style={{
        width:44, height:44,
        background:"linear-gradient(135deg,#FC8019,#E5720A)",
        borderRadius:12, display:"flex", alignItems:"center",
        justifyContent:"center", fontSize:22, flexShrink:0,
        boxShadow:"0 3px 0 #b85500",
      }}>⚡</div>
      <div style={{flex:1, minWidth:0}}>
        <p style={{color:"#fff",fontWeight:700,fontSize:14,margin:0}}>Install KitchenAI</p>
        <p style={{color:"rgba(255,255,255,.5)",fontSize:12,margin:0}}>Add to home screen for best experience</p>
      </div>
      <button onClick={() => setShow(false)} style={{
        background:"none",border:"none",color:"rgba(255,255,255,.3)",
        fontSize:20,cursor:"pointer",padding:"0 4px",flexShrink:0,
        fontFamily:"inherit",
      }}>×</button>
      <button onClick={install} style={{
        background:"#FC8019",border:"none",borderRadius:10,
        padding:"9px 16px",fontWeight:700,fontSize:13,
        cursor:"pointer",color:"#fff",fontFamily:"inherit",
        flexShrink:0,boxShadow:"0 3px 0 #E5720A",
      }}>Install</button>
    </div>
  );
}
