import { useState, useEffect, useCallback, useRef } from "react";
import InstallBanner from "./InstallBanner";
import VoiceRecorder from "./VoiceRecorder";
import {
  transcribeAudio, getInventory, addInventoryBulk, removeInventoryItem,
  getRecipes, createKitchen, verifyKitchen, saveKitchenOrder,
  getKitchenOrders, confirmKitchenOrder, assignRecipe, getAssignedRecipe,
  searchRecipeVideos,
} from "./api";
import RecipeFlow from "./RecipeFlow";

// Swiggy-inspired color palette
const S = {
  orange: "#FC8019",
  orangeLight: "#FF9A3C",
  orangeDark: "#E5720A",
  bg: "#F5F5F5",
  dark: "#282C3F",
  darker: "#1C1F2E",
  card: "#FFFFFF",
  text: "#282C3F",
  text2: "#686B78",
  text3: "#93959F",
  border: "#E9E9EB",
  green: "#48C479",
  red: "#E23744",
  yellow: "#F8CB46",
};

const platformColor = {blinkit:"#0c831f", zepto:"#8025f5", instamart:"#FC8019"};

const getSearchURL = (p, items) => {
  const q = encodeURIComponent(items[0]?.item || "grocery");
  if(p === "blinkit")   return `https://blinkit.com/s/?q=${q}`;
  if(p === "zepto")     return `https://www.zeptonow.com/search?query=${q}`;
  return `https://www.swiggy.com/instamart/search?query=${q}`;
};

// 3D Swiggy-style button
const OBtn = ({children, onClick, disabled, full, small, color, outline, danger}) => {
  const bg = disabled ? "#E9E9EB" : danger ? S.red : outline ? "transparent" : color || S.orange;
  const col = disabled ? S.text3 : outline ? (color || S.orange) : "#fff";
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: full ? "100%" : "auto",
      background: bg,
      color: col,
      border: outline ? `2px solid ${color || S.orange}` : "none",
      borderRadius: 12,
      padding: small ? "8px 16px" : "13px 24px",
      fontWeight: 700,
      fontSize: small ? 13 : 15,
      cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "inherit",
      boxShadow: disabled || outline ? "none" : `0 4px 0 ${danger ? "#B02D38" : color ? color+"aa" : S.orangeDark}, 0 6px 16px ${(color||S.orange)}33`,
      transform: "translateY(0)",
      transition: "all 0.12s ease",
      letterSpacing: "0.01em",
    }}
      onMouseDown={e => { if(!disabled) { e.currentTarget.style.transform="translateY(3px)"; e.currentTarget.style.boxShadow="none"; }}}
      onMouseUp={e => { if(!disabled) { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=`0 4px 0 ${danger?"#B02D38":S.orangeDark}, 0 6px 16px ${S.orange}33`; }}}
    >{children}</button>
  );
};

const Card = ({children, style={}}) => (
  <div style={{background: S.card, borderRadius: 16, padding: "20px 22px", border: `1px solid ${S.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", ...style}}>
    {children}
  </div>
);

const Spinner = () => (
  <div style={{display:"flex", justifyContent:"center", padding: 32}}>
    <div style={{width:32, height:32, border:`3px solid ${S.border}`, borderTop:`3px solid ${S.orange}`, borderRadius:"50%", animation:"spin .8s linear infinite"}}/>
  </div>
);

const Tag = ({children, color=S.orange}) => (
  <span style={{background: color+"18", color, border:`1px solid ${color}33`, borderRadius: 99, padding:"3px 10px", fontSize:11, fontWeight:700, letterSpacing:"0.04em"}}>
    {children}
  </span>
);

/* ── VIDEO MODAL ──────────────────────────────────────────── */
function VideoModal({video, onClose, onSend, sent}) {
  if(!video) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:3000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{width:"100%",maxWidth:620,background:S.darker,borderRadius:20,overflow:"hidden",border:"1px solid rgba(255,255,255,.1)"}} onClick={e=>e.stopPropagation()}>
        <div style={{position:"relative",paddingBottom:"56.25%",height:0}}>
          <iframe
            src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1&rel=0`}
            style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none"}}
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen title={video.title}
          />
        </div>
        <div style={{padding:"16px 20px"}}>
          <p style={{color:"#fff",fontWeight:700,fontSize:14,margin:"0 0 4px",lineHeight:1.4}}>{video.title}</p>
          <p style={{color:"rgba(255,255,255,.45)",fontSize:12,margin:"0 0 14px"}}>{video.channel}</p>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            {[["👁",video.views],["👍",video.likes],video.duration&&["⏱",video.duration]].filter(Boolean).map(([icon,val],i)=>(
              <span key={i} style={{background:"rgba(255,255,255,.08)",color:"rgba(255,255,255,.65)",borderRadius:8,padding:"5px 12px",fontSize:12}}>{icon} {val}</span>
            ))}
            {onSend && (
              <button onClick={e=>{e.stopPropagation();onSend(video);}} disabled={!!sent} style={{
                marginLeft:"auto",background:sent?S.green:S.orange,border:"none",
                borderRadius:10,padding:"10px 20px",fontWeight:700,fontSize:13,
                cursor:sent?"not-allowed":"pointer",color:"#fff",fontFamily:"inherit",
                boxShadow:sent?"none":`0 4px 0 ${S.orangeDark}`,
                transition:"all .2s",
              }}>{sent?"✓ Sent to cook!":"👩‍🍳 Send to cook"}</button>
            )}
            <button onClick={onClose} style={{background:"rgba(255,255,255,.08)",border:"none",borderRadius:10,padding:"10px 14px",color:"rgba(255,255,255,.5)",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── VIDEO SEARCH PANEL ───────────────────────────────────── */
function VideoSearchPanel({recipe, cuisine, onAssign, showAssign, onClose}) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("views");
  const [selected, setSelected] = useState(null);
  const [sentVideoId, setSentVideoId] = useState(null); // track which ONE video was sent
  const isSendingRef = useRef(false); // hard lock

  useEffect(() => {
    isSendingRef.current = false;
    setSentVideoId(null);
    setLoading(true);
    searchRecipeVideos(recipe, cuisine, 12)
      .then(d => setVideos(d.videos || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [recipe, cuisine]);

  // This is the ONLY send function — called for exactly one video
  const handleSend = async (video) => {
    if(isSendingRef.current) return; // hard block concurrent calls
    if(sentVideoId) return; // already sent one
    isSendingRef.current = true;
    setSentVideoId(video.video_id);
    try {
      await onAssign(video); // calls handleAssign in SisterInterface
    } catch(e) {
      setSentVideoId(null); // reset on error
    } finally {
      isSendingRef.current = false;
    }
  };

  const sorted = sortBy === "default" ? [...videos] :
    [...videos].sort((a,b) => sortBy==="views" ? b.view_count-a.view_count : b.like_count-a.like_count);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:2000,display:"flex",flexDirection:"column"}} onClick={onClose}>
      <div style={{marginTop:"auto",background:S.card,borderRadius:"24px 24px 0 0",maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 -12px 40px rgba(0,0,0,.15)"}} onClick={e=>e.stopPropagation()}>
        {/* Handle */}
        <div style={{padding:"12px 20px 0",textAlign:"center"}}>
          <div style={{width:40,height:4,background:S.border,borderRadius:99,margin:"0 auto"}}/>
        </div>
        {/* Header */}
        <div style={{padding:"14px 20px 12px",borderBottom:`1px solid ${S.border}`,display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}>
            <h2 style={{fontSize:17,fontWeight:700,color:S.text,margin:0}}>{recipe}</h2>
            <p style={{fontSize:12,color:S.text2,margin:"2px 0 0"}}>{videos.length} videos • tap to watch</p>
          </div>
          <div style={{display:"flex",gap:6}}>
            {[["views","👁"],["likes","👍"],["default","🔀"]].map(([key,icon])=>(
              <button key={key} onClick={()=>setSortBy(key)} style={{
                padding:"6px 10px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                background:sortBy===key?S.dark:S.bg,
                color:sortBy===key?S.orange:S.text2,
                border:`1px solid ${sortBy===key?S.dark:S.border}`,
              }}>{icon}</button>
            ))}
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:"50%",background:S.bg,border:"none",cursor:"pointer",fontSize:18,color:S.text2,fontFamily:"inherit"}}>×</button>
        </div>

        {/* Videos list */}
        <div style={{overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
          {loading ? <Spinner/> : sorted.map((v, i) => (
            <div key={`${v.video_id}-${i}`} style={{display:"flex",background:S.bg,borderRadius:14,overflow:"hidden",border:`1px solid ${S.border}`,cursor:"pointer",transition:"transform .1s"}}
              onClick={() => setSelected(v)}
              onMouseDown={e=>e.currentTarget.style.transform="scale(0.98)"}
              onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
            >
              {/* Thumbnail */}
              <div style={{position:"relative",flexShrink:0,width:130,height:75}}>
                <img src={v.thumbnail} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
                <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{width:30,height:30,background:"rgba(255,0,0,.9)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{color:"#fff",fontSize:10,marginLeft:2}}>▶</span>
                  </div>
                </div>
                {v.duration && <span style={{position:"absolute",bottom:4,right:4,background:"rgba(0,0,0,.8)",color:"#fff",fontSize:10,padding:"2px 5px",borderRadius:4,fontWeight:600}}>{v.duration}</span>}
              </div>
              {/* Info */}
              <div style={{flex:1,padding:"10px 12px",display:"flex",flexDirection:"column",justifyContent:"space-between",minWidth:0}}>
                <p style={{fontSize:12,fontWeight:600,color:S.text,margin:0,lineHeight:1.35,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{v.title}</p>
                <div>
                  <p style={{fontSize:11,color:S.text2,margin:"0 0 3px"}}>{v.channel}</p>
                  <div style={{display:"flex",gap:8}}>
                    <span style={{fontSize:11,color:S.text3}}>👁 {v.views}</span>
                    <span style={{fontSize:11,color:S.text3}}>👍 {v.likes}</span>
                  </div>
                </div>
              </div>
              {/* Send button — only ONE video can be sent */}
              {showAssign && (
                <button
                  onClick={e => { e.stopPropagation(); e.preventDefault(); handleSend(v); }}
                  disabled={!!sentVideoId}
                  style={{
                    background: sentVideoId===v.video_id ? S.green : sentVideoId ? "#ccc" : S.dark,
                    border:"none", color:"#fff",
                    fontWeight:700, fontSize:11, padding:"0 14px",
                    cursor: sentVideoId ? "not-allowed" : "pointer",
                    fontFamily:"inherit", flexShrink:0,
                    borderLeft:`1px solid ${S.border}`,
                    lineHeight:1.4, minWidth:64, textAlign:"center",
                    transition:"background .2s",
                  }}
                >{sentVideoId===v.video_id ? "✓ Sent!" : "Send to cook"}</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <VideoModal
          video={selected}
          onClose={() => setSelected(null)}
          onSend={showAssign ? handleSend : null}
          sent={sentVideoId === selected?.video_id}
        />
      )}
    </div>
  );
}

/* ── SHARED PANTRY ────────────────────────────────────────── */
function PantryView({readOnly=false}) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setInventory((await getInventory()).items || []); }
    catch(e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <h2 style={{fontSize:17,fontWeight:700,color:S.text,margin:0}}>Kitchen pantry</h2>
          <p style={{fontSize:12,color:S.text2,margin:"2px 0 0"}}>{inventory.length} items in stock</p>
        </div>
        <button onClick={load} style={{background:S.bg,border:`1px solid ${S.border}`,color:S.text2,borderRadius:10,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>↻ Refresh</button>
      </div>
      {loading ? <Spinner/> : inventory.length === 0 ? (
        <div style={{textAlign:"center",padding:"36px 0",background:S.bg,borderRadius:12}}>
          <div style={{fontSize:36,marginBottom:10}}>🧺</div>
          <p style={{fontSize:13,color:S.text2,margin:0}}>Pantry is empty</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
          {inventory.map(item => (
            <div key={item.id} style={{background:`linear-gradient(135deg,${S.bg},#eef0f2)`,border:`1px solid ${S.border}`,borderRadius:12,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
              <div>
                <p style={{fontSize:13,fontWeight:700,textTransform:"capitalize",color:S.text,margin:"0 0 4px"}}>{item.item}</p>
                <span style={{fontSize:11,color:S.text2,background:"#fff",display:"inline-block",padding:"2px 8px",borderRadius:6,border:`1px solid ${S.border}`}}>{item.quantity}</span>
              </div>
              {!readOnly && (
                <button onClick={() => removeInventoryItem(item.item).then(load)} style={{background:"none",border:"none",color:"#ccc",cursor:"pointer",fontSize:18,lineHeight:1,padding:0,fontFamily:"inherit"}}>×</button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ── LANDING PAGE ─────────────────────────────────────────── */
function LandingPage({onSister, onMaid}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const join = async () => {
    const trimmed = code.trim().toUpperCase();
    if(!trimmed || trimmed.length !== 6) return setError("Enter a valid 6-digit code");
    setLoading(true); setError("");
    try {
      await verifyKitchen(trimmed);
      onMaid(trimmed);
    } catch(e) {
      setError("Invalid code. Ask your employer for the correct code.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg, ${S.darker} 0%, #2D3250 50%, ${S.darker} 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden"}}>
      {/* Background decoration */}
      <div style={{position:"absolute",top:-120,right:-80,width:350,height:350,background:`radial-gradient(circle, ${S.orange}22 0%, transparent 70%)`,pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-100,left:-60,width:300,height:300,background:"radial-gradient(circle, #6C63FF22 0%, transparent 70%)",pointerEvents:"none"}}/>

      <div style={{width:"100%",maxWidth:420,position:"relative",zIndex:1}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{width:76,height:76,background:`linear-gradient(135deg,${S.orange},${S.orangeDark})`,borderRadius:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 18px",boxShadow:`0 8px 0 ${S.orangeDark}cc, 0 12px 32px ${S.orange}44`}}>⚡</div>
          <h1 style={{color:"#fff",fontSize:30,fontWeight:800,margin:"0 0 6px",letterSpacing:"-.02em"}}>KitchenAI</h1>
          <p style={{color:"rgba(255,255,255,.45)",fontSize:14,margin:0}}>Your smart kitchen companion</p>
        </div>

        {/* Owner card */}
        <div style={{background:"rgba(255,255,255,.07)",backdropFilter:"blur(12px)",borderRadius:20,padding:"24px",marginBottom:14,border:"1px solid rgba(255,255,255,.12)"}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
            <div style={{width:48,height:48,background:"linear-gradient(135deg,#667eea,#764ba2)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,boxShadow:"0 4px 0 #4a3880"}}>👩‍💼</div>
            <div>
              <h2 style={{fontSize:16,fontWeight:700,color:"#fff",margin:0}}>I'm the owner</h2>
              <p style={{fontSize:12,color:"rgba(255,255,255,.5)",margin:0}}>Create kitchen & manage everything</p>
            </div>
          </div>
          <OBtn full onClick={onSister}>Create my kitchen →</OBtn>
        </div>

        {/* Maid card */}
        <div style={{background:"rgba(255,255,255,.07)",backdropFilter:"blur(12px)",borderRadius:20,padding:"24px",border:"1px solid rgba(255,255,255,.12)"}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
            <div style={{width:48,height:48,background:"linear-gradient(135deg,#25d366,#128c7e)",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,boxShadow:"0 4px 0 #0d6b50"}}>👩‍🍳</div>
            <div>
              <h2 style={{fontSize:16,fontWeight:700,color:"#fff",margin:0}}>I'm the cook / maid</h2>
              <p style={{fontSize:12,color:"rgba(255,255,255,.5)",margin:0}}>Enter code from your employer</p>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <input
              value={code}
              onChange={e => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0,6))}
              placeholder="ABC123"
              maxLength={6}
              style={{flex:1,padding:"13px 16px",borderRadius:12,border:`2px solid ${code.length===6?"rgba(248,213,72,.6)":"rgba(255,255,255,.15)"}`,background:"rgba(255,255,255,.08)",color:"#fff",fontSize:20,fontWeight:800,letterSpacing:"0.15em",outline:"none",fontFamily:"inherit",textAlign:"center"}}
              onKeyDown={e => e.key==="Enter" && join()}
            />
            <OBtn onClick={join} disabled={loading || code.length !== 6}>{loading ? "..." : "Join"}</OBtn>
          </div>
          {error && <p style={{fontSize:12,color:"#f87171",margin:"10px 0 0",background:"rgba(239,68,68,.1)",borderRadius:8,padding:"8px 12px"}}>{error}</p>}
        </div>
      </div>
    </div>
  );
}

/* ── NAV ──────────────────────────────────────────────────── */
function Nav({tabs, activeTab, setTab, kitchenCode, onLeave}) {
  return (
    <nav style={{background:S.dark,position:"sticky",top:0,zIndex:500,boxShadow:"0 2px 8px rgba(0,0,0,.2)"}}>
      {/* Top row: logo + exit */}
      <div style={{display:"flex",alignItems:"center",padding:"10px 16px 0",gap:10}}>
        <div style={{width:28,height:28,background:`linear-gradient(135deg,${S.orange},${S.orangeDark})`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>⚡</div>
        <span style={{color:"#fff",fontWeight:800,fontSize:15,flex:1}}>KitchenAI</span>
        {kitchenCode && <span style={{background:"rgba(255,255,255,.08)",color:"rgba(255,255,255,.5)",borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:700,letterSpacing:"0.06em",flexShrink:0}}>{kitchenCode}</span>}
        <button onClick={onLeave} style={{
          background:"rgba(239,68,68,.2)",border:"1.5px solid rgba(239,68,68,.5)",
          color:"#fca5a5",cursor:"pointer",fontSize:12,fontFamily:"inherit",
          padding:"6px 12px",borderRadius:8,fontWeight:700,flexShrink:0,
          boxShadow:"0 2px 0 rgba(239,68,68,.3)",
        }}>✕ Exit</button>
      </div>
      {/* Bottom row: tabs */}
      <div style={{display:"flex",padding:"0 8px"}}>
        {tabs.map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex:1,background:"none",border:"none",
            color: activeTab===key ? S.orange : "rgba(255,255,255,.4)",
            fontWeight: activeTab===key ? 700 : 500,
            fontSize:12,cursor:"pointer",padding:"10px 4px",
            borderBottom: activeTab===key ? `2px solid ${S.orange}` : "2px solid transparent",
            fontFamily:"inherit",transition:"all .15s",whiteSpace:"nowrap",
          }}>{label}</button>
        ))}
      </div>
    </nav>
  );
}

/* ── MAID INTERFACE ───────────────────────────────────────── */
function MaidInterface({kitchenCode, onLeave}) {
  const [tab, setTab] = useState("send");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [assignedRecipe, setAssignedRecipe] = useState(null);
  const [videoPanel, setVideoPanel] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);

  useEffect(() => {
    const load = async () => {
      try { const d = await getAssignedRecipe(kitchenCode); if(d.recipe) setAssignedRecipe(d.recipe); }
      catch(e) {}
    };
    load();
    const poll = setInterval(load, 5000);
    return () => clearInterval(poll);
  }, [kitchenCode]);

  const handleTranscribe = async () => {
    if(!currentFile) return;
    setLoading(true); setError(null);
    try { setResult(await transcribeAudio(currentFile)); }
    catch(e) { setError(e.response?.data?.detail || "Could not process. Try again!"); }
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
    <div style={{minHeight:"100vh",background:S.bg}}>
      <Nav tabs={[["send","📦 Orders"],["pantry","🧺 Pantry"],["recipe","👩‍🍳 Recipe"]]} activeTab={tab} setTab={setTab} kitchenCode={kitchenCode} onLeave={onLeave}/>

      <div style={{maxWidth:480,margin:"0 auto",padding:"20px 16px",display:"flex",flexDirection:"column",gap:16}}>

        {tab==="send" && (!sent ? (
          <Card>
            <h2 style={{fontSize:18,fontWeight:700,color:S.text,margin:"0 0 4px"}}>Send grocery list</h2>
            <p style={{fontSize:13,color:S.text2,margin:"0 0 20px"}}>Record what's missing and send to your employer</p>
            {!result ? (
              <VoiceRecorder onFileReady={setCurrentFile} onTranscribe={handleTranscribe} loading={loading}/>
            ) : (
              <>
                <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:"12px 16px",marginBottom:16}}>
                  <p style={{fontSize:11,fontWeight:700,color:"#92400e",margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Heard this</p>
                  <p style={{fontSize:13,color:"#78350f",fontStyle:"italic",margin:0,lineHeight:1.5}}>"{result.transcript}"</p>
                </div>
                <div style={{marginBottom:18}}>
                  <p style={{fontSize:12,fontWeight:700,color:S.text2,margin:"0 0 10px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Items found ({result.grocery_list.length})</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    {result.grocery_list.map((g,i) => (
                      <div key={i} style={{background:S.bg,borderRadius:10,padding:"10px 14px",border:`1px solid ${S.border}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
                        <p style={{fontSize:13,fontWeight:700,textTransform:"capitalize",color:S.text,margin:"0 0 2px"}}>{g.item}</p>
                        <p style={{fontSize:11,color:S.text2,margin:0}}>{g.quantity}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={() => {setResult(null); setCurrentFile(null);}} style={{flex:1,padding:"12px",borderRadius:12,border:`1px solid ${S.border}`,background:"#fff",color:S.text2,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Re-record</button>
                  <OBtn onClick={sendToSister} disabled={loading}>{loading ? "Sending..." : "Send to employer ✓"}</OBtn>
                </div>
              </>
            )}
            {error && <p style={{fontSize:13,color:S.red,marginTop:12,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"10px 14px"}}>{error}</p>}
          </Card>
        ) : (
          <Card style={{textAlign:"center",padding:"44px 20px"}}>
            <div style={{fontSize:52,marginBottom:14}}>✅</div>
            <h2 style={{fontSize:20,fontWeight:700,color:S.text,margin:"0 0 6px"}}>List sent!</h2>
            <p style={{fontSize:13,color:S.text2,margin:"0 0 24px"}}>Your employer will review and place the order</p>
            <OBtn onClick={() => {setSent(false); setResult(null); setCurrentFile(null);}}>Send another list</OBtn>
          </Card>
        ))}

        {tab==="pantry" && <PantryView readOnly={true}/>}

        {tab==="recipe" && (
          <RecipeFlow kitchenCode={kitchenCode} role="maid"/>
        )}
      </div>

      {videoPanel && <VideoSearchPanel recipe={videoPanel.recipe} cuisine="Indian" showAssign={false} onClose={() => setVideoPanel(null)} onAssign={() => {}}/>}
    </div>
  );
}

/* ── SISTER INTERFACE ─────────────────────────────────────── */
function SisterInterface({kitchenCode, onLeave}) {
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [cuisine, setCuisine] = useState("");
  const [vegFilter, setVegFilter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [videoPanel, setVideoPanel] = useState(null);
  const [toast, setToast] = useState("");
  const sendingRef = useRef(false);

  const shareLink = `${window.location.origin}?code=${kitchenCode}`;

  const loadOrders = useCallback(async () => {
    try { setOrders((await getKitchenOrders(kitchenCode)).orders || []); }
    catch(e) {}
  }, [kitchenCode]);

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    try { setRecipes((await getRecipes(cuisine||null, 8, vegFilter)).recipes || []); }
    catch(e) { setRecipes([]); }
    finally { setLoading(false); }
  }, [cuisine, vegFilter]);

  useEffect(() => {
    loadOrders();
    const poll = setInterval(loadOrders, 5000);
    return () => clearInterval(poll);
  }, [loadOrders]);

  useEffect(() => { if(tab==="recipes") loadRecipes(); }, [tab, loadRecipes]);

  const handleConfirm = async (id) => {
    await confirmKitchenOrder(kitchenCode, id);
    await loadOrders();
  };

  const handleAssign = async (recipe, video) => {
    if(sendingRef.current) return;
    sendingRef.current = true;
    try {
      await assignRecipe(kitchenCode, {
        recipe_name: recipe.name,
        youtube_url: `https://www.youtube.com/watch?v=${video.video_id}`,
        youtube_title: video.title,
        channel: video.channel,
      });
      setToast(`"${recipe.name}" sent to your cook! 👩‍🍳`);
      setTimeout(() => setToast(""), 3000);
      setVideoPanel(null);
    } catch(e) {
      console.error(e);
    } finally {
      setTimeout(() => { sendingRef.current = false; }, 2000);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cuisines = ["","Indian","Bengali","Chinese","Italian","Continental"];
  const matchColor = s => s>=80 ? S.green : s>=50 ? S.orange : S.red;

  return (
    <div style={{minHeight:"100vh",background:S.bg}}>
      <Nav tabs={[["orders","📦 Orders"],["pantry","🧺 Pantry"],["recipes","🍳 Recipes"]]} activeTab={tab} setTab={setTab} kitchenCode={kitchenCode} onLeave={onLeave}/>

      <div style={{maxWidth:880,margin:"0 auto",padding:"20px 16px"}}>

        {/* Toast */}
        {toast && (
          <div style={{background:`linear-gradient(135deg,${S.green},#2da55c)`,color:"#fff",borderRadius:12,padding:"13px 20px",marginBottom:14,fontWeight:700,fontSize:14,boxShadow:`0 4px 0 #1a7a3d, 0 6px 20px ${S.green}44`}}>
            ✅ {toast}
          </div>
        )}

        {/* Kitchen code banner */}
        <div style={{background:`linear-gradient(135deg,${S.dark},${S.darker})`,borderRadius:18,padding:"18px 22px",marginBottom:18,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",boxShadow:`0 6px 0 #0d0f18, 0 10px 32px rgba(0,0,0,.25)`}}>
          <div style={{flex:1}}>
            <p style={{fontSize:11,color:"rgba(255,255,255,.4)",margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.1em"}}>Your kitchen code</p>
            <p style={{fontSize:26,fontWeight:800,color:S.orange,margin:0,letterSpacing:"0.2em"}}>{kitchenCode}</p>
          </div>
          <button onClick={copyLink} style={{
            background: copied ? "rgba(72,196,121,.2)" : "rgba(255,255,255,.08)",
            border: `1px solid ${copied ? S.green : "rgba(255,255,255,.15)"}`,
            color:"#fff",borderRadius:12,padding:"10px 20px",fontWeight:700,
            fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .2s",
          }}>{copied ? "✓ Copied!" : "Share with maid"}</button>
        </div>

        {/* ORDERS TAB */}
        {tab==="orders" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {orders.length===0 ? (
              <Card style={{textAlign:"center",padding:"48px 20px"}}>
                <div style={{fontSize:44,marginBottom:14}}>📭</div>
                <h2 style={{fontSize:17,fontWeight:700,color:S.text,margin:"0 0 8px"}}>No orders yet</h2>
                <p style={{fontSize:13,color:S.text2,margin:"0 0 20px"}}>Share your kitchen code with the maid</p>
                <OBtn onClick={copyLink}>{copied ? "Copied!" : "Copy kitchen link"}</OBtn>
              </Card>
            ) : orders.map(order => (
              <Card key={order.id} style={{background:"linear-gradient(135deg,#fff,#fafbfc)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                  <div>
                    <h3 style={{fontSize:15,fontWeight:700,color:S.text,margin:"0 0 3px"}}>{order.grocery_list.length} items requested</h3>
                    <p style={{fontSize:12,color:S.text2,margin:0}}>{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <Tag color={S.yellow}>⏳ Pending</Tag>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:8,marginBottom:16}}>
                  {order.grocery_list.map((g,i) => (
                    <div key={i} style={{background:S.bg,borderRadius:10,padding:"9px 12px",border:`1px solid ${S.border}`}}>
                      <p style={{fontSize:13,fontWeight:700,textTransform:"capitalize",color:S.text,margin:"0 0 2px"}}>{g.item}</p>
                      <p style={{fontSize:11,color:S.text2,margin:0}}>{g.quantity}</p>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["blinkit","zepto","instamart"].map(p => (
                    <a key={p} href={getSearchURL(p,order.grocery_list)} target="_blank" rel="noreferrer" style={{
                      flex:1,minWidth:80,background:"#fff",border:`2px solid ${platformColor[p]}`,
                      color:platformColor[p],borderRadius:10,padding:"10px",fontWeight:700,
                      fontSize:12,textAlign:"center",textDecoration:"none",display:"block",
                      boxShadow:`0 3px 0 ${platformColor[p]}66`,
                    }}>{p.charAt(0).toUpperCase()+p.slice(1)}</a>
                  ))}
                  <OBtn onClick={() => handleConfirm(order.id)} color={S.green}>✓ Bought</OBtn>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab==="pantry" && <PantryView readOnly={false}/>}

        {/* RECIPES TAB */}
        {tab==="recipes" && (
          <RecipeFlow kitchenCode={kitchenCode} role="sister"/>
        )}

      </div>

      {videoPanel && (
        <VideoSearchPanel
          recipe={videoPanel.recipe}
          cuisine={videoPanel.cuisine}
          showAssign={true}
          onClose={() => setVideoPanel(null)}
          onAssign={video => handleAssign(videoPanel.recipeObj, video)}
        />
      )}
      <InstallBanner/>
    </div>
  );
}

/* ── ROOT APP ─────────────────────────────────────────────── */
export default function App() {
  const [role, setRole] = useState(null);
  const [kitchenCode, setKitchenCode] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if(code) {
      setKitchenCode(code.toUpperCase());
      setRole("maid");
      localStorage.setItem("kitchenCode", code.toUpperCase());
      localStorage.setItem("kitchenRole", "maid");
      return;
    }
    const sc = localStorage.getItem("kitchenCode");
    const sr = localStorage.getItem("kitchenRole");
    if(sc && sr) { setKitchenCode(sc); setRole(sr); }
  }, []);

  const handleSister = async () => {
    setCreating(true);
    try {
      const d = await createKitchen("My Kitchen");
      setKitchenCode(d.code);
      setRole("sister");
      localStorage.setItem("kitchenCode", d.code);
      localStorage.setItem("kitchenRole", "sister");
    } catch(e) { console.error(e); }
    finally { setCreating(false); }
  };

  const handleMaid = code => {
    setKitchenCode(code);
    setRole("maid");
    localStorage.setItem("kitchenCode", code);
    localStorage.setItem("kitchenRole", "maid");
  };

  const handleLeave = () => {
    localStorage.removeItem("kitchenCode");
    localStorage.removeItem("kitchenRole");
    setRole(null);
    setKitchenCode(null);
    window.history.replaceState({}, "", window.location.pathname);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
        html { overflow-x: hidden !important; }
        body { font-family: 'DM Sans', system-ui, sans-serif; background: #F5F5F5; -webkit-font-smoothing: antialiased; overflow-x: hidden !important; width: 100vw !important; }
        #root { overflow-x: hidden; width: 100%; }
        @keyframes spin { to { transform: rotate(360deg); } }
        input, textarea { user-select: text !important; -webkit-user-select: text !important; }
        a { text-decoration: none; }
      `}</style>

      {creating && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,backdropFilter:"blur(4px)"}}>
          <div style={{background:"#fff",borderRadius:20,padding:"36px 48px",textAlign:"center",boxShadow:"0 8px 0 #ccc, 0 16px 40px rgba(0,0,0,.2)"}}>
            <Spinner/>
            <p style={{fontSize:14,color:S.text2,marginTop:16,fontWeight:600}}>Creating your kitchen...</p>
          </div>
        </div>
      )}

      {!role && <LandingPage onSister={handleSister} onMaid={handleMaid}/>}
      {role==="maid" && kitchenCode && <MaidInterface kitchenCode={kitchenCode} onLeave={handleLeave}/>}
      {role==="sister" && kitchenCode && <SisterInterface kitchenCode={kitchenCode} onLeave={handleLeave}/>}
    </>
  );
}
