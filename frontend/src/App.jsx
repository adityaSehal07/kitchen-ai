import { useState, useEffect, useCallback, useRef } from "react";
import "./theme.css";
import InstallBanner from "./InstallBanner";
import VoiceRecorder from "./VoiceRecorder";
import RecipeFlow from "./RecipeFlow";
import MaidPushToTalk from "./MaidPushToTalk";
import { destroyKitchen } from "./api";
import PriceCompare from "./PriceCompare";
import {
  transcribeAudio, getInventory, addInventoryBulk, removeInventoryItem,
  createKitchen, verifyKitchen, saveKitchenOrder,
  getKitchenOrders, confirmKitchenOrder, assignRecipe, getAssignedRecipe,
} from "./api";

/* ── THEME HOOK ──────────────────────────────────────────── */
function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("kitchenai-theme");
    return saved ? saved === "dark" : true; // default dark
  });

  useEffect(() => {
    document.body.classList.toggle("light-mode", !dark);
    localStorage.setItem("kitchenai-theme", dark ? "dark" : "light");
  }, [dark]);

  return [dark, () => setDark(d => !d)];
}

/* ── THEME TOGGLE ────────────────────────────────────────── */
function ThemeToggle({ dark, onToggle }) {
  return (
    <button onClick={onToggle} title={dark ? "Switch to light mode" : "Switch to dark mode"} style={{
      width: 48, height: 26,
      background: dark ? "rgba(197,168,128,0.15)" : "rgba(197,168,128,0.3)",
      border: "1px solid var(--border-strong)",
      borderRadius: 99, cursor: "pointer", position: "relative",
      transition: "var(--transition)", flexShrink: 0, padding: 0,
    }}>
      {/* Track icons */}
      <span style={{position:"absolute",left:5,top:"50%",transform:"translateY(-50%)",fontSize:11,opacity:dark?0.3:0}}>☀️</span>
      <span style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",fontSize:11,opacity:dark?1:0.3}}>🌙</span>
      {/* Sliding capsule */}
      <span style={{
        position:"absolute", top:3,
        width:18, height:18, borderRadius:"50%",
        background:"var(--gold-gradient)",
        boxShadow:"0 1px 4px rgba(0,0,0,0.3)",
        left: dark ? "calc(100% - 21px)" : 3,
        transition:"left 0.3s cubic-bezier(0.4,0,0.2,1)",
        display:"block",
      }}/>
    </button>
  );
}

/* ── LOGO SVG ────────────────────────────────────────────── */
function Logo({size=32}) {
  return (
    <img src="/logo.png" alt="KitchenAI"
      style={{width:size, height:size, objectFit:"contain", filter:"drop-shadow(0 0 6px rgba(197,168,128,0.4))"}}
    />
  );
}

/* ── GOLD BUTTON ─────────────────────────────────────────── */
function GBtn({children, onClick, disabled, full, small, outline, green, danger}) {
  const bg = disabled ? "var(--bg-elevated)" :
    outline ? "transparent" :
    green ? "var(--green)" :
    danger ? "var(--red)" :
    "var(--gold-gradient)";
  const col = disabled ? "var(--text-tertiary)" :
    outline ? "var(--gold)" : "#1C1E21";
  const shadow = disabled || outline ? "none" :
    green ? "0 4px 16px rgba(61,170,107,0.3)" :
    "var(--shadow-btn)";

  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: full ? "100%" : "auto",
      background: bg, color: col,
      border: outline ? "1px solid var(--border-strong)" : "none",
      borderRadius: "var(--radius-md)",
      padding: small ? "8px 16px" : "13px 24px",
      fontWeight: 600, fontSize: small ? 13 : 14,
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "inherit", letterSpacing: "0.03em",
      boxShadow: shadow, transition: "var(--transition)",
    }}
      onMouseDown={e => { if(!disabled) e.currentTarget.style.transform = "translateY(2px)"; }}
      onMouseUp={e => { if(!disabled) e.currentTarget.style.transform = "translateY(0)"; }}
    >{children}</button>
  );
}

/* ── CARD ────────────────────────────────────────────────── */
function Card({children, style={}}) {
  return (
    <div style={{
      background: "var(--bg-card)",
      borderRadius: "var(--radius-lg)",
      padding: "24px",
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow-card)",
      animation: "fadeIn 0.3s ease",
      ...style,
    }}>{children}</div>
  );
}

/* ── SPINNER ─────────────────────────────────────────────── */
function Spinner() {
  return (
    <div style={{display:"flex",justifyContent:"center",padding:40}}>
      <div style={{width:28,height:28,border:"2px solid var(--border)",borderTop:"2px solid var(--gold)",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
    </div>
  );
}

/* ── ANIMATED BACKGROUND ─────────────────────────────────── */
function AnimatedBg() {
  return (
    <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
      <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle, rgba(197,168,128,0.06) 0%, transparent 70%)",top:"-15%",right:"-10%",animation:"blob1 10s ease-in-out infinite"}}/>
      <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle, rgba(108,99,255,0.04) 0%, transparent 70%)",bottom:"-10%",left:"-8%",animation:"blob2 12s ease-in-out infinite"}}/>
      <div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle, rgba(61,170,107,0.04) 0%, transparent 70%)",top:"45%",left:"55%",animation:"blob3 14s ease-in-out infinite"}}/>
    </div>
  );
}

/* ── PANTRY ──────────────────────────────────────────────── */
function PantryView({readOnly=false}) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async()=>{
    setLoading(true);
    try{setInventory((await getInventory()).items||[]);}catch(e){}finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);

  return (
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h2 style={{fontSize:17,fontWeight:700,color:"var(--text-primary)",margin:0,letterSpacing:"0.02em"}}>Kitchen Pantry</h2>
          <p style={{fontSize:12,color:"var(--text-secondary)",margin:"3px 0 0"}}>{inventory.length} items in stock</p>
        </div>
        <button onClick={load} style={{background:"var(--bg-elevated)",border:"1px solid var(--border)",color:"var(--text-secondary)",borderRadius:"var(--radius-sm)",padding:"8px 14px",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.02em"}}>↻ Refresh</button>
      </div>
      {loading?<Spinner/>:inventory.length===0?(
        <div style={{textAlign:"center",padding:"40px 0",background:"var(--bg-elevated)",borderRadius:"var(--radius-md)"}}>
          <div style={{fontSize:36,marginBottom:10}}>🧺</div>
          <p style={{fontSize:13,color:"var(--text-secondary)",margin:0}}>Pantry is empty</p>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
          {inventory.map(item=>(
            <div key={item.id} style={{background:"var(--bg-elevated)",border:"1px solid var(--border)",borderRadius:"var(--radius-md)",padding:"14px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <p style={{fontSize:13,fontWeight:600,textTransform:"capitalize",color:"var(--text-primary)",margin:"0 0 5px",letterSpacing:"0.01em"}}>{item.item}</p>
                <span style={{fontSize:11,color:"var(--text-secondary)",background:"var(--bg-card)",display:"inline-block",padding:"2px 8px",borderRadius:99,border:"1px solid var(--border)"}}>{item.quantity}</span>
              </div>
              {!readOnly&&(
                <button onClick={()=>removeInventoryItem(item.item).then(load)} style={{background:"none",border:"none",color:"var(--text-tertiary)",cursor:"pointer",fontSize:18,lineHeight:1,padding:0,fontFamily:"inherit",transition:"color 0.2s"}}
                  onMouseEnter={e=>e.target.style.color="var(--red)"}
                  onMouseLeave={e=>e.target.style.color="var(--text-tertiary)"}
                >×</button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ── SHARED VIDEO MODAL ──────────────────────────────────── */
function SharedVideoModal({video, kitchenCode, onClose}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [recipeName, setRecipeName] = useState("");

  const send = async () => {
    if(!kitchenCode||sending) return;
    setSending(true);
    try {
      await assignRecipe(kitchenCode, {
        recipe_name: recipeName||"Recipe from YouTube",
        youtube_url: video.url||`https://www.youtube.com/watch?v=${video.video_id}`,
        youtube_title: video.title, channel:"YouTube",
      });
      setSent(true);
      setTimeout(()=>{setSent(false);onClose();},2000);
    }catch(e){console.error(e);}
    finally{setSending(false);}
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(8px)"}}>
      <div style={{background:"var(--bg-card)",borderRadius:"var(--radius-xl)",padding:"28px",width:"100%",maxWidth:420,border:"1px solid var(--border)",boxShadow:"0 24px 60px rgba(0,0,0,0.4)"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:22}}>
          <div style={{width:46,height:46,background:"linear-gradient(135deg,#ff0000,#cc0000)",borderRadius:"var(--radius-md)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{color:"#fff",fontSize:18}}>▶</span>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontSize:13,fontWeight:600,color:"var(--text-primary)",margin:0,lineHeight:1.3,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{video.title||"YouTube Video"}</p>
            <p style={{fontSize:11,color:"var(--text-secondary)",margin:"3px 0 0"}}>Shared from YouTube</p>
          </div>
        </div>
        <label style={{fontSize:12,fontWeight:600,color:"var(--text-secondary)",display:"block",marginBottom:6,letterSpacing:"0.05em",textTransform:"uppercase"}}>Recipe name</label>
        <input value={recipeName} onChange={e=>setRecipeName(e.target.value)} placeholder="e.g. Aloo Dum, Dal Tadka..."
          style={{width:"100%",padding:"13px 16px",borderRadius:"var(--radius-md)",border:`1px solid ${recipeName?"var(--gold)":"var(--border)"}`,background:"var(--bg-input)",color:"var(--text-primary)",fontSize:14,outline:"none",fontFamily:"inherit",marginBottom:20,boxSizing:"border-box",transition:"border-color 0.2s"}}/>
        {!kitchenCode&&<div style={{background:"var(--red-bg)",border:"1px solid var(--red-border)",borderRadius:"var(--radius-md)",padding:"12px 14px",marginBottom:16}}><p style={{fontSize:13,color:"var(--red)",margin:0}}>⚠️ Login as owner first.</p></div>}
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:"12px",borderRadius:"var(--radius-md)",border:"1px solid var(--border)",background:"transparent",color:"var(--text-secondary)",fontWeight:500,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          <GBtn onClick={send} disabled={!kitchenCode||sending||sent}>{sent?"✓ Sent!":sending?"Sending...":"Send to cook 👩‍🍳"}</GBtn>
        </div>
      </div>
    </div>
  );
}

/* ── LANDING PAGE ────────────────────────────────────────── */
function LandingPage({onSister, onMaid, dark, onToggleTheme}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const join = async () => {
    const t = code.trim().toUpperCase();
    if(!t||t.length!==6) return setError("Enter a valid 6-digit code");
    setLoading(true); setError("");
    try { await verifyKitchen(t); onMaid(t); }
    catch(e) { setError("Invalid code. Ask your employer."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:"var(--bg-primary)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden",transition:"var(--transition)"}}>
      <AnimatedBg/>

      {/* Theme toggle top right */}
      <div style={{position:"absolute",top:20,right:20,zIndex:10}}>
        <ThemeToggle dark={dark} onToggle={onToggleTheme}/>
      </div>

      <div style={{width:"100%",maxWidth:400,position:"relative",zIndex:1}}>
        {/* Logo + wordmark */}
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{animation:"logoFloat 4s ease-in-out infinite",display:"inline-block",marginBottom:20}}>
            <Logo size={90}/>
          </div>
          <h1 style={{color:"var(--text-primary)",fontSize:30,fontWeight:700,margin:"0 0 6px",letterSpacing:"-0.02em"}}>
            kitchen <span style={{background:"var(--gold-gradient)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>ai</span>
          </h1>
          <p style={{color:"var(--text-secondary)",fontSize:14,margin:0,letterSpacing:"0.02em"}}>Your intelligent kitchen companion</p>
        </div>

        {/* Owner card */}
        <div style={{background:"var(--bg-card)",borderRadius:"var(--radius-xl)",padding:"24px",marginBottom:12,border:"1px solid var(--border)",boxShadow:"var(--shadow-card)",animation:"fadeIn 0.4s ease"}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
            <div style={{width:46,height:46,background:"linear-gradient(135deg,#667eea,#764ba2)",borderRadius:"var(--radius-md)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>👩‍💼</div>
            <div>
              <h2 style={{fontSize:15,fontWeight:600,color:"var(--text-primary)",margin:0,letterSpacing:"0.01em"}}>I'm the owner</h2>
              <p style={{fontSize:12,color:"var(--text-secondary)",margin:0}}>Create kitchen & manage everything</p>
            </div>
          </div>
          <GBtn full onClick={onSister}>Create my kitchen →</GBtn>
        </div>

        {/* Maid card */}
        <div style={{background:"var(--bg-card)",borderRadius:"var(--radius-xl)",padding:"24px",border:"1px solid var(--border)",boxShadow:"var(--shadow-card)",animation:"fadeIn 0.5s ease",marginBottom:24}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
            <div style={{width:46,height:46,background:"linear-gradient(135deg,#25d366,#128c7e)",borderRadius:"var(--radius-md)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>👩‍🍳</div>
            <div>
              <h2 style={{fontSize:15,fontWeight:600,color:"var(--text-primary)",margin:0,letterSpacing:"0.01em"}}>I'm the cook / maid</h2>
              <p style={{fontSize:12,color:"var(--text-secondary)",margin:0}}>Enter code from your employer</p>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <input value={code} onChange={e=>setCode(e.target.value.replace(/[^A-Za-z0-9]/g,'').toUpperCase().slice(0,6))}
              placeholder="ABC123" maxLength={6}
              style={{flex:1,padding:"13px 16px",borderRadius:"var(--radius-md)",border:`1px solid ${code.length===6?"var(--gold)":"var(--border)"}`,background:"var(--bg-input)",color:"var(--text-primary)",fontSize:20,fontWeight:700,letterSpacing:"0.2em",outline:"none",fontFamily:"inherit",textAlign:"center",transition:"border-color 0.2s"}}
              onKeyDown={e=>e.key==="Enter"&&join()}
            />
            <GBtn onClick={join} disabled={loading||code.length!==6}>{loading?"...":"Join"}</GBtn>
          </div>
          {error&&<p style={{fontSize:12,color:"var(--red)",margin:"10px 0 0",background:"var(--red-bg)",borderRadius:"var(--radius-sm)",padding:"8px 12px",border:"1px solid var(--red-border)"}}>{error}</p>}
        </div>

        {/* Share instructions */}
        <div style={{background:"var(--bg-card)",borderRadius:"var(--radius-lg)",padding:"16px 18px",border:"1px solid var(--border)",marginBottom:20}}>
          <p style={{fontSize:11,fontWeight:600,color:"var(--gold)",margin:"0 0 10px",textTransform:"uppercase",letterSpacing:"0.08em"}}>📱 Share recipes from YouTube</p>
          {["1. Install KitchenAI → Add to Home Screen","2. Open YouTube → find a recipe video","3. Tap Share → select KitchenAI","4. Cook receives the video instantly!"].map((s,i)=>(
            <p key={i} style={{fontSize:12,color:"var(--text-secondary)",margin:"0 0 4px",lineHeight:1.5}}>{s}</p>
          ))}
        </div>

        <p style={{textAlign:"center",fontSize:11,color:"var(--text-tertiary)",letterSpacing:"0.04em"}}>
          Crafted by <span style={{background:"var(--gold-gradient)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontWeight:600}}>@sehal07</span>
        </p>
      </div>
    </div>
  );
}

/* ── NAV ────────────────────────────────────────────────── */
function Nav({tabs, activeTab, setTab, kitchenCode, onLeave, dark, onToggleTheme}) {
  return (
    <nav style={{background:"var(--bg-card)",position:"sticky",top:0,zIndex:500,borderBottom:"1px solid var(--border)",transition:"var(--transition)"}}>
      <div style={{display:"flex",alignItems:"center",padding:"10px 16px 6px",gap:10}}>
        <Logo size={26}/>
        <span style={{fontWeight:700,fontSize:15,flex:1,letterSpacing:"-0.01em",color:"var(--text-primary)"}}>
          kitchen <span style={{background:"var(--gold-gradient)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>ai</span>
        </span>
        {kitchenCode&&<span style={{background:"var(--bg-elevated)",color:"var(--gold)",borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:700,letterSpacing:"0.12em",border:"1px solid var(--border-strong)",flexShrink:0}}>{kitchenCode}</span>}
        <ThemeToggle dark={dark} onToggle={onToggleTheme}/>
        <button onClick={onLeave} style={{background:"var(--red-bg)",border:"1px solid var(--red-border)",color:"var(--red)",cursor:"pointer",fontSize:11,fontFamily:"inherit",padding:"6px 11px",borderRadius:"var(--radius-sm)",fontWeight:600,flexShrink:0,letterSpacing:"0.02em"}}>✕ Exit</button>
      </div>
      <div style={{display:"flex",padding:"0 8px",borderTop:"1px solid var(--border)"}}>
        {tabs.map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{
            flex:1,background:"none",border:"none",
            color:activeTab===key?"var(--gold)":"var(--text-secondary)",
            fontWeight:activeTab===key?600:400,
            fontSize:12,cursor:"pointer",padding:"9px 4px",
            borderBottom:activeTab===key?"2px solid var(--gold)":"2px solid transparent",
            fontFamily:"inherit",transition:"var(--transition)",whiteSpace:"nowrap",
            letterSpacing:"0.02em",
          }}>{label}</button>
        ))}
      </div>
    </nav>
  );
}

/* ── MAID INTERFACE ──────────────────────────────────────── */
function MaidInterface({kitchenCode, onLeave, dark, onToggleTheme}) {
  const [tab, setTab] = useState("send");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);

  const handleTranscribe = async () => {
    if(!currentFile) return;
    setLoading(true); setError(null);
    try { setResult(await transcribeAudio(currentFile)); }
    catch(e) { setError(e.response?.data?.detail||"Could not process. Try again!"); }
    finally { setLoading(false); }
  };

  const sendToSister = async () => {
    if(!result) return;
    setLoading(true);
    try { await saveKitchenOrder(kitchenCode, result.grocery_list); setSent(true); }
    catch(e) { setError("Failed to send. Try again."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:"var(--bg-primary)",transition:"var(--transition)"}}>
      <Nav tabs={[["send","📦 Orders"],["pantry","🧺 Pantry"],["recipe","👩‍🍳 Recipe"]]} activeTab={tab} setTab={setTab} kitchenCode={kitchenCode} onLeave={onLeave} dark={dark} onToggleTheme={onToggleTheme}/>
      <div style={{maxWidth:480,margin:"0 auto",padding:"24px 16px",display:"flex",flexDirection:"column",gap:18}}>

        {tab==="send"&&(!sent?(
          <Card>
            <h2 style={{fontSize:18,fontWeight:700,color:"var(--text-primary)",margin:"0 0 4px",letterSpacing:"-0.01em"}}>Send Grocery List</h2>
            <p style={{fontSize:13,color:"var(--text-secondary)",margin:"0 0 22px"}}>Record missing items and send to your employer</p>
            {!result?(
              <VoiceRecorder onFileReady={setCurrentFile} onTranscribe={handleTranscribe} loading={loading}/>
            ):(
              <>
                <div style={{background:"var(--bg-elevated)",borderRadius:"var(--radius-md)",padding:"14px 16px",marginBottom:18,border:"1px solid var(--border)"}}>
                  <p style={{fontSize:10,fontWeight:600,color:"var(--gold)",margin:"0 0 5px",textTransform:"uppercase",letterSpacing:"0.08em"}}>Transcript</p>
                  <p style={{fontSize:13,color:"var(--text-secondary)",fontStyle:"italic",margin:0,lineHeight:1.6}}>"{result.transcript}"</p>
                </div>
                <div style={{marginBottom:20}}>
                  <p style={{fontSize:10,fontWeight:600,color:"var(--text-secondary)",margin:"0 0 12px",textTransform:"uppercase",letterSpacing:"0.08em"}}>Items found — {result.grocery_list.length}</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {result.grocery_list.map((g,i)=>(
                      <div key={i} style={{background:"var(--bg-elevated)",borderRadius:"var(--radius-md)",padding:"12px 14px",border:"1px solid var(--border)"}}>
                        <p style={{fontSize:13,fontWeight:600,textTransform:"capitalize",color:"var(--text-primary)",margin:"0 0 3px"}}>{g.item}</p>
                        <p style={{fontSize:11,color:"var(--text-secondary)",margin:0}}>{g.quantity}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>{setResult(null);setCurrentFile(null);}} style={{flex:1,padding:"12px",borderRadius:"var(--radius-md)",border:"1px solid var(--border)",background:"transparent",color:"var(--text-secondary)",fontWeight:500,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Re-record</button>
                  <GBtn onClick={sendToSister} disabled={loading}>{loading?"Sending...":"Send to employer ✓"}</GBtn>
                </div>
              </>
            )}
            {error&&<p style={{fontSize:13,color:"var(--red)",marginTop:14,background:"var(--red-bg)",border:"1px solid var(--red-border)",borderRadius:"var(--radius-md)",padding:"10px 14px"}}>{error}</p>}
          </Card>
        ):(
          <Card style={{textAlign:"center",padding:"48px 24px"}}>
            <div style={{fontSize:52,marginBottom:16}}>✅</div>
            <h2 style={{fontSize:20,fontWeight:700,color:"var(--text-primary)",margin:"0 0 6px",letterSpacing:"-0.01em"}}>List Sent!</h2>
            <p style={{fontSize:13,color:"var(--text-secondary)",margin:"0 0 24px"}}>Your employer will review and place the order</p>
            <GBtn onClick={()=>{setSent(false);setResult(null);setCurrentFile(null);}}>Send Another List</GBtn>
          </Card>
        ))}

        {tab==="pantry"&&<PantryView readOnly={true}/>}
        {tab==="recipe"&&<RecipeFlow kitchenCode={kitchenCode} role="maid"/>}
      </div>
    </div>
  );
}

/* ── SISTER INTERFACE ────────────────────────────────────── */
function SisterInterface({kitchenCode, onLeave, dark, onToggleTheme}) {
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");
  const [priceCompareOrder, setPriceCompareOrder] = useState(null);

  const shareLink = `${window.location.origin}?code=${kitchenCode}`;

  const loadOrders = useCallback(async()=>{
    try{setOrders((await getKitchenOrders(kitchenCode)).orders||[]);}catch(e){}
  },[kitchenCode]);

  useEffect(()=>{
    loadOrders();
    const poll=setInterval(loadOrders,5000);
    return()=>clearInterval(poll);
  },[loadOrders]);

  const handleConfirm = async(id)=>{
    await confirmKitchenOrder(kitchenCode,id);
    await loadOrders();
    setToast("Items added to pantry ✓");
    setTimeout(()=>setToast(""),3000);
  };

  const copyLink=()=>{
    navigator.clipboard.writeText(shareLink);
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  const platformColor={blinkit:"#0c831f",zepto:"#8025f5",instamart:"#FC8019"};
  const getSearchURL=(p,items)=>{
    const q=encodeURIComponent(items[0]?.item||"grocery");
    if(p==="blinkit") return `https://blinkit.com/s/?q=${q}`;
    if(p==="zepto") return `https://www.zeptonow.com/search?query=${q}`;
    return `https://www.swiggy.com/instamart/search?query=${q}`;
  };

  return (
    <div style={{minHeight:"100vh",background:"var(--bg-primary)",transition:"var(--transition)"}}>
      <Nav tabs={[["orders","📦 Orders"],["pantry","🧺 Pantry"],["recipes","🍳 Recipes"]]} activeTab={tab} setTab={setTab} kitchenCode={kitchenCode} onLeave={onLeave} dark={dark} onToggleTheme={onToggleTheme}/>

      <div style={{maxWidth:880,margin:"0 auto",padding:"24px 16px"}}>
        {toast&&(
          <div style={{background:"var(--green-bg)",border:"1px solid var(--green-border)",color:"var(--green)",borderRadius:"var(--radius-md)",padding:"13px 18px",marginBottom:16,fontWeight:600,fontSize:14,animation:"fadeIn 0.3s ease"}}>{toast}</div>
        )}

        {/* Kitchen code banner */}
        <div style={{background:"var(--bg-card)",borderRadius:"var(--radius-xl)",padding:"20px 24px",marginBottom:20,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",border:"1px solid var(--border-strong)",boxShadow:"var(--shadow-card)"}}>
          <div style={{flex:1}}>
            <p style={{fontSize:10,color:"var(--gold)",margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:600}}>Your Kitchen Code</p>
            <p style={{fontSize:28,fontWeight:800,color:"var(--text-primary)",margin:0,letterSpacing:"0.2em",fontFamily:"'Inter',monospace"}}>{kitchenCode}</p>
          </div>
          <GBtn onClick={copyLink} outline>{copied?"✓ Copied":"Share with maid"}</GBtn>
        </div>

        {tab==="orders"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {orders.length===0?(
              <Card style={{textAlign:"center",padding:"52px 24px"}}>
                <div style={{fontSize:44,marginBottom:16}}>📭</div>
                <h2 style={{fontSize:18,fontWeight:700,color:"var(--text-primary)",margin:"0 0 8px",letterSpacing:"-0.01em"}}>No orders yet</h2>
                <p style={{fontSize:13,color:"var(--text-secondary)",margin:"0 0 22px"}}>Share your kitchen code with the maid</p>
                <GBtn onClick={copyLink}>{copied?"Copied!":"Copy kitchen link"}</GBtn>
              </Card>
            ):orders.map(order=>(
              <Card key={order.id}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                  <div>
                    <h3 style={{fontSize:15,fontWeight:600,color:"var(--text-primary)",margin:"0 0 3px",letterSpacing:"0.01em"}}>{order.grocery_list.length} items requested</h3>
                    <p style={{fontSize:12,color:"var(--text-secondary)",margin:0}}>{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <span style={{background:"rgba(197,168,128,0.1)",border:"1px solid rgba(197,168,128,0.3)",color:"var(--gold)",borderRadius:99,padding:"4px 12px",fontSize:11,fontWeight:600,letterSpacing:"0.04em"}}>⏳ Pending</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:8,marginBottom:18}}>
                  {order.grocery_list.map((g,i)=>(
                    <div key={i} style={{background:"var(--bg-elevated)",borderRadius:"var(--radius-md)",padding:"10px 12px",border:"1px solid var(--border)"}}>
                      <p style={{fontSize:13,fontWeight:600,textTransform:"capitalize",color:"var(--text-primary)",margin:"0 0 2px"}}>{g.item}</p>
                      <p style={{fontSize:11,color:"var(--text-secondary)",margin:0}}>{g.quantity}</p>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["blinkit","zepto","instamart"].map(p=>(
                    <a key={p} href={getSearchURL(p,order.grocery_list)} target="_blank" rel="noreferrer" style={{flex:1,minWidth:80,background:"transparent",border:`1.5px solid ${platformColor[p]}`,color:platformColor[p],borderRadius:"var(--radius-md)",padding:"10px",fontWeight:600,fontSize:12,textAlign:"center",display:"block",letterSpacing:"0.02em"}}>{p.charAt(0).toUpperCase()+p.slice(1)}</a>
                  ))}
                  <GBtn green onClick={()=>handleConfirm(order.id)}>✓ Bought</GBtn>
                </div>
                <button onClick={()=>setPriceCompareOrder(order)} style={{
                  width:"100%",marginTop:10,padding:"11px",borderRadius:"var(--radius-md)",
                  background:"var(--bg-elevated)",border:"1px solid var(--border-strong)",
                  color:"var(--gold)",fontWeight:600,fontSize:13,cursor:"pointer",
                  fontFamily:"inherit",letterSpacing:"0.02em",display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                }}>🔍 Compare prices across platforms</button>
              </Card>
            ))}
          </div>
        )}

        {tab==="pantry"&&<PantryView readOnly={false}/>}
        {tab==="recipes"&&<RecipeFlow kitchenCode={kitchenCode} role="sister"/>}
      </div>
      <InstallBanner/>
      {priceCompareOrder && <PriceCompare groceryList={priceCompareOrder.grocery_list} onClose={()=>setPriceCompareOrder(null)}/>}
    </div>
  );
}

/* ── ROOT APP ────────────────────────────────────────────── */
export default function App() {
  const [dark, toggleTheme] = useTheme();
  const [role, setRole] = useState(null);
  const [kitchenCode, setKitchenCode] = useState(null);
  const [creating, setCreating] = useState(false);
  const [sharedVideo, setSharedVideo] = useState(null);

  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    const sv=params.get("sv"), st=params.get("st"), su=params.get("su");
    if(params.get("share")==="1"||sv||su) {
      if(sv||su) setSharedVideo({video_id:sv||"",title:decodeURIComponent(st||"YouTube Video"),url:decodeURIComponent(su||"")});
      window.history.replaceState({},"","/");
    }
    const code=params.get("code");
    if(code){setKitchenCode(code.toUpperCase());setRole("maid");localStorage.setItem("kitchenCode",code.toUpperCase());localStorage.setItem("kitchenRole","maid");return;}
    const sc=localStorage.getItem("kitchenCode"), sr=localStorage.getItem("kitchenRole");
    if(sc&&sr){setKitchenCode(sc);setRole(sr);}
  },[]);

  const handleSister=async()=>{
    setCreating(true);
    try{const d=await createKitchen("My Kitchen");setKitchenCode(d.code);setRole("sister");localStorage.setItem("kitchenCode",d.code);localStorage.setItem("kitchenRole","sister");}
    catch(e){console.error(e);}finally{setCreating(false);}
  };

  const handleMaid=code=>{setKitchenCode(code);setRole("maid");localStorage.setItem("kitchenCode",code);localStorage.setItem("kitchenRole","maid");};
  const handleLeave=async()=>{
    const savedRole=localStorage.getItem("kitchenRole");
    const savedCode=localStorage.getItem("kitchenCode");
    if(savedRole==="sister"&&savedCode){
      try{await destroyKitchen(savedCode);}catch(e){console.error(e);}
    }
    localStorage.removeItem("kitchenCode");
    localStorage.removeItem("kitchenRole");
    setRole(null);setKitchenCode(null);
    window.history.replaceState({},"","/");
  };

  return (
    <>
      {creating&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,backdropFilter:"blur(8px)"}}>
          <div style={{background:"var(--bg-card)",borderRadius:"var(--radius-xl)",padding:"40px 52px",textAlign:"center",border:"1px solid var(--border)"}}>
            <Spinner/><p style={{fontSize:14,color:"var(--text-secondary)",marginTop:16,fontWeight:500,letterSpacing:"0.02em"}}>Creating your kitchen...</p>
          </div>
        </div>
      )}
      {!role&&<LandingPage onSister={handleSister} onMaid={handleMaid} dark={dark} onToggleTheme={toggleTheme}/>}
      {role==="maid"&&kitchenCode&&<MaidPushToTalk kitchenCode={kitchenCode} onExit={handleLeave}/>}
      {role==="sister"&&kitchenCode&&<SisterInterface kitchenCode={kitchenCode} onLeave={handleLeave} dark={dark} onToggleTheme={toggleTheme}/>}
      {sharedVideo&&<SharedVideoModal video={sharedVideo} kitchenCode={role==="sister"?kitchenCode:null} onClose={()=>setSharedVideo(null)}/>}
    </>
  );
}
