import { useState, useEffect, useCallback } from "react";
import InstallBanner from "./InstallBanner";
import VoiceRecorder from "./VoiceRecorder";
import {
  transcribeAudio, getInventory, addInventoryBulk, removeInventoryItem,
  getRecipes, createKitchen, verifyKitchen, saveKitchenOrder,
  getKitchenOrders, confirmKitchenOrder, assignRecipe, getAssignedRecipe,
  searchRecipeVideos,
} from "./api";

const Y="#f8d548",BG="#0d1117",BG2="#1b2333",WH="#ffffff",GR="#f3f4f6",GR2="#e9eaec";
const TX="#1b1e23",TX2="#6b7280",GN="#0c7c3a",RD="#e53935";
const platformColor={blinkit:"#0c831f",zepto:"#8025f5",instamart:"#FC8019"};
const getSearchURL=(p,items)=>{
  const q=encodeURIComponent(items[0]?.item||"grocery");
  if(p==="blinkit") return `https://blinkit.com/s/?q=${q}`;
  if(p==="zepto") return `https://www.zeptonow.com/search?query=${q}`;
  return `https://www.swiggy.com/instamart/search?query=${q}`;
};

const YBtn=({children,onClick,disabled,full,small,color,outline})=>(
  <button onClick={onClick} disabled={disabled} style={{
    width:full?"100%":"auto",
    background:disabled?"#e5e7eb":outline?"transparent":color||Y,
    color:disabled?TX2:outline?(color||TX):TX,
    border:outline?`2px solid ${color||Y}`:"none",
    borderRadius:10,padding:small?"7px 14px":"12px 24px",
    fontWeight:700,fontSize:small?12:14,cursor:disabled?"not-allowed":"pointer",
    fontFamily:"inherit",transition:"all .15s",
    boxShadow:(!disabled&&!outline)?"0 2px 8px rgba(248,213,72,.3)":"none",
  }}>{children}</button>
);

const Card=({children,style={}})=>(
  <div style={{background:WH,borderRadius:16,padding:"20px 22px",border:`1px solid ${GR2}`,boxShadow:"0 1px 4px rgba(0,0,0,.06)",...style}}>{children}</div>
);

const GlassCard=({children,style={}})=>(
  <div style={{background:"rgba(255,255,255,.06)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderRadius:16,padding:"20px 22px",border:"1px solid rgba(255,255,255,.12)",...style}}>{children}</div>
);

const Spinner=()=>(
  <div style={{display:"flex",justifyContent:"center",padding:24}}>
    <div style={{width:28,height:28,border:`3px solid rgba(248,213,72,.2)`,borderTop:`3px solid ${Y}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
  </div>
);

/* ── VIDEO PLAYER MODAL ───────────────────────────────────── */
function VideoModal({video,onClose,onAssign,showAssign}) {
  if(!video) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.9)",zIndex:2000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{width:"100%",maxWidth:640,background:BG2,borderRadius:20,overflow:"hidden",border:"1px solid rgba(255,255,255,.1)",boxShadow:"0 24px 80px rgba(0,0,0,.6)"}} onClick={e=>e.stopPropagation()}>
        <div style={{position:"relative",paddingBottom:"56.25%",height:0}}>
          <iframe src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1`}
            style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none"}}
            allow="autoplay; encrypted-media" allowFullScreen title={video.title}/>
        </div>
        <div style={{padding:"16px 20px"}}>
          <h3 style={{color:WH,fontSize:15,fontWeight:700,margin:"0 0 4px",lineHeight:1.3}}>{video.title}</h3>
          <p style={{color:"rgba(255,255,255,.45)",fontSize:13,margin:"0 0 14px"}}>{video.channel}</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            {[["👁",video.views],["👍",video.likes],video.duration&&["⏱",video.duration]].filter(Boolean).map(([icon,val],i)=>(
              <span key={i} style={{background:"rgba(255,255,255,.08)",color:"rgba(255,255,255,.6)",borderRadius:8,padding:"5px 12px",fontSize:12}}>{icon} {val}</span>
            ))}
            {showAssign && (
              <button onClick={()=>onAssign(video)} style={{marginLeft:"auto",background:Y,border:"none",borderRadius:10,padding:"9px 18px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px rgba(248,213,72,.3)"}}>👩‍🍳 Send to cook</button>
            )}
            <button onClick={onClose} style={{background:"rgba(255,255,255,.08)",border:"none",borderRadius:10,padding:"9px 14px",color:"rgba(255,255,255,.5)",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── VIDEO SEARCH PANEL ───────────────────────────────────── */
function VideoSearchPanel({recipe,cuisine,onAssign,showAssign,onClose}) {
  const [videos,setVideos]=useState([]);
  const [loading,setLoading]=useState(true);
  const [sortBy,setSortBy]=useState("views");
  const [selected,setSelected]=useState(null);

  useEffect(()=>{
    searchRecipeVideos(recipe,cuisine,6).then(d=>setVideos(d.videos||[])).catch(()=>{}).finally(()=>setLoading(false));
  },[recipe,cuisine]);

  const sorted=[...videos].sort((a,b)=>sortBy==="views"?b.view_count-a.view_count:b.like_count-a.like_count);

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:1000,display:"flex",flexDirection:"column"}} onClick={onClose}>
      <div style={{marginTop:"auto",background:WH,borderRadius:"24px 24px 0 0",maxHeight:"88vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 -8px 40px rgba(0,0,0,.2)"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"16px 20px 12px",borderBottom:`1px solid ${GR2}`}}>
          <div style={{width:40,height:4,background:GR2,borderRadius:99,margin:"0 auto 14px"}}/>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1}}>
              <h2 style={{fontSize:17,fontWeight:700,color:TX,margin:0}}>{recipe}</h2>
              <p style={{fontSize:12,color:TX2,margin:0}}>{videos.length} videos · tap to watch in-app</p>
            </div>
            <div style={{display:"flex",gap:6}}>
              {[["views","👁"],["likes","👍"]].map(([key,icon])=>(
                <button key={key} onClick={()=>setSortBy(key)} style={{padding:"6px 12px",borderRadius:99,border:`1.5px solid ${sortBy===key?BG:GR2}`,background:sortBy===key?BG:WH,color:sortBy===key?Y:TX2,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{icon} {key}</button>
              ))}
            </div>
            <button onClick={onClose} style={{width:32,height:32,borderRadius:"50%",background:GR,border:"none",cursor:"pointer",fontSize:18,color:TX2,fontFamily:"inherit"}}>×</button>
          </div>
        </div>
        <div style={{overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
          {loading?<Spinner/>:sorted.map((v,i)=>(
            <div key={i} style={{display:"flex",gap:0,background:GR,borderRadius:12,overflow:"hidden",border:`1px solid ${GR2}`,cursor:"pointer",boxShadow:"0 1px 3px rgba(0,0,0,.05)",transition:"transform .1s"}}
              onClick={()=>setSelected(v)}
              onMouseDown={e=>e.currentTarget.style.transform="scale(0.99)"}
              onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
            >
              <div style={{position:"relative",flexShrink:0,width:128,height:72}}>
                <img src={v.thumbnail} alt={v.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.25)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{width:32,height:32,background:"rgba(255,0,0,.9)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(0,0,0,.3)"}}>
                    <span style={{color:WH,fontSize:11,marginLeft:2}}>▶</span>
                  </div>
                </div>
                {v.duration&&<span style={{position:"absolute",bottom:4,right:4,background:"rgba(0,0,0,.8)",color:WH,fontSize:10,padding:"2px 6px",borderRadius:5,fontWeight:600}}>{v.duration}</span>}
              </div>
              <div style={{flex:1,padding:"10px 12px",display:"flex",flexDirection:"column",justifyContent:"space-between",minWidth:0}}>
                <p style={{fontSize:12,fontWeight:600,color:TX,margin:0,lineHeight:1.35,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{v.title}</p>
                <div>
                  <p style={{fontSize:11,color:TX2,margin:"0 0 4px",fontWeight:500}}>{v.channel}</p>
                  <div style={{display:"flex",gap:10}}>
                    <span style={{fontSize:11,color:TX2}}>👁 {v.views}</span>
                    <span style={{fontSize:11,color:TX2}}>👍 {v.likes}</span>
                  </div>
                </div>
              </div>
              {showAssign&&(
                <button onClick={e=>{e.stopPropagation();onAssign(v);}} style={{background:BG,border:"none",color:Y,fontWeight:700,fontSize:11,padding:"0 14px",cursor:"pointer",fontFamily:"inherit",flexShrink:0,borderLeft:`1px solid rgba(255,255,255,.08)`,lineHeight:1.3}}>Send<br/>to cook</button>
              )}
            </div>
          ))}
        </div>
      </div>
      {selected&&<VideoModal video={selected} onClose={()=>setSelected(null)} onAssign={v=>{onAssign(v);setSelected(null);}} showAssign={showAssign}/>}
    </div>
  );
}

/* ── SHARED PANTRY ────────────────────────────────────────── */
function PantryView({readOnly=false}) {
  const [inventory,setInventory]=useState([]);
  const [loading,setLoading]=useState(true);
  const load=useCallback(async()=>{
    setLoading(true);
    try{setInventory((await getInventory()).items||[]);}catch(e){}finally{setLoading(false);}
  },[]);
  useEffect(()=>{load();},[load]);
  return (
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <h2 style={{fontSize:16,fontWeight:700,color:TX,margin:0}}>Kitchen pantry</h2>
          <p style={{fontSize:12,color:TX2,margin:"2px 0 0"}}>{inventory.length} items in stock</p>
        </div>
        <button onClick={load} style={{background:GR,border:`1px solid ${GR2}`,color:TX2,borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>↻ Refresh</button>
      </div>
      {loading?<Spinner/>:inventory.length===0?(
        <div style={{textAlign:"center",padding:"28px 0",background:GR,borderRadius:12}}>
          <div style={{fontSize:32,marginBottom:8}}>🧺</div>
          <p style={{fontSize:13,color:TX2,margin:0}}>Pantry is empty</p>
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8}}>
          {inventory.map(item=>(
            <div key={item.id} style={{background:"linear-gradient(135deg,#f8fafc,#f1f5f9)",border:`1px solid ${GR2}`,borderRadius:12,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
              <div>
                <p style={{fontSize:13,fontWeight:700,textTransform:"capitalize",color:TX,margin:"0 0 4px"}}>{item.item}</p>
                <span style={{fontSize:11,color:TX2,background:WH,display:"inline-block",padding:"2px 8px",borderRadius:6,border:`1px solid ${GR2}`}}>{item.quantity}</span>
              </div>
              {!readOnly&&(
                <button onClick={()=>removeInventoryItem(item.item).then(load)} style={{background:"none",border:"none",color:"#cbd5e1",cursor:"pointer",fontSize:18,lineHeight:1,padding:0,marginLeft:4,fontFamily:"inherit"}}>×</button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ── LANDING PAGE ─────────────────────────────────────────── */
function LandingPage({onSister,onMaid}) {
  const [code,setCode]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  const join=async()=>{
    if(!code.trim()) return setError("Enter a kitchen code");
    setLoading(true);setError("");
    try{await verifyKitchen(code.trim().toUpperCase());onMaid(code.trim().toUpperCase());}
    catch(e){setError("Invalid code. Ask your employer.");}
    finally{setLoading(false);}
  };

  return (
    <div style={{minHeight:"100vh",background:`radial-gradient(ellipse at 20% 50%, rgba(37,99,235,.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(248,213,72,.1) 0%, transparent 50%), ${BG}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,position:"relative",overflow:"hidden"}}>
      {/* Decorative blobs */}
      <div style={{position:"absolute",top:-100,right:-100,width:300,height:300,background:"rgba(248,213,72,.05)",borderRadius:"50%",filter:"blur(60px)"}}/>
      <div style={{position:"absolute",bottom:-80,left:-80,width:250,height:250,background:"rgba(37,99,235,.08)",borderRadius:"50%",filter:"blur(50px)"}}/>

      <div style={{width:"100%",maxWidth:400,position:"relative",zIndex:1}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:44}}>
          <div style={{width:72,height:72,background:`linear-gradient(135deg,${Y},#f59e0b)`,borderRadius:20,display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,margin:"0 auto 18px",boxShadow:`0 8px 32px rgba(248,213,72,.35), 0 0 0 1px rgba(248,213,72,.2)`}}>⚡</div>
          <h1 style={{color:WH,fontSize:28,fontWeight:800,margin:"0 0 6px",letterSpacing:"-.02em"}}>KitchenAI</h1>
          <p style={{color:"rgba(255,255,255,.4)",fontSize:14,margin:0}}>Smart kitchen, simplified</p>
        </div>

        {/* Owner card */}
        <GlassCard style={{marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
            <div style={{width:44,height:44,background:"linear-gradient(135deg,#667eea,#764ba2)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>👩‍💼</div>
            <div>
              <h2 style={{fontSize:16,fontWeight:700,color:WH,margin:0}}>I'm the owner</h2>
              <p style={{fontSize:12,color:"rgba(255,255,255,.5)",margin:0}}>Manage groceries & recipes</p>
            </div>
          </div>
          <YBtn full onClick={onSister}>Create my kitchen →</YBtn>
        </GlassCard>

        {/* Maid card */}
        <GlassCard>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
            <div style={{width:44,height:44,background:"linear-gradient(135deg,#25d366,#128c7e)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>👩‍🍳</div>
            <div>
              <h2 style={{fontSize:16,fontWeight:700,color:WH,margin:0}}>I'm the cook / maid</h2>
              <p style={{fontSize:12,color:"rgba(255,255,255,.5)",margin:0}}>Enter code from your employer</p>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="ABC123" maxLength={6}
              style={{flex:1,padding:"11px 16px",borderRadius:10,border:`1.5px solid ${code?"rgba(248,213,72,.5)":"rgba(255,255,255,.15)"}`,background:"rgba(255,255,255,.08)",color:WH,fontSize:18,fontWeight:700,letterSpacing:"0.12em",outline:"none",fontFamily:"inherit"}}
              onKeyDown={e=>e.key==="Enter"&&join()}
            />
            <YBtn onClick={join} disabled={loading}>{loading?"...":"Join"}</YBtn>
          </div>
          {error&&<p style={{fontSize:12,color:"#f87171",margin:"8px 0 0"}}>{error}</p>}
        </GlassCard>
      </div>
    </div>
  );
}

/* ── MAID INTERFACE ───────────────────────────────────────── */
function MaidInterface({kitchenCode,onLeave}) {
  const [tab,setTab]=useState("send");
  const [loading,setLoading]=useState(false);
  const [result,setResult]=useState(null);
  const [sent,setSent]=useState(false);
  const [error,setError]=useState(null);
  const [assignedRecipe,setAssignedRecipe]=useState(null);
  const [videoPanel,setVideoPanel]=useState(null);
  const [currentFile,setCurrentFile]=useState(null);

  useEffect(()=>{
    const load=async()=>{try{const d=await getAssignedRecipe(kitchenCode);if(d.recipe)setAssignedRecipe(d.recipe);}catch(e){}};
    load();const poll=setInterval(load,5000);return()=>clearInterval(poll);
  },[kitchenCode]);

  const handleTranscribe=async()=>{
    if(!currentFile)return;
    setLoading(true);setError(null);
    try{setResult(await transcribeAudio(currentFile));}
    catch(e){setError("Could not process. Try again!");}
    finally{setLoading(false);}
  };

  const sendToSister=async()=>{
    if(!result)return;
    setLoading(true);
    try{await saveKitchenOrder(kitchenCode,result.grocery_list);setSent(true);}
    catch(e){setError("Failed to send. Try again.");}
    finally{setLoading(false);}
  };

  return (
    <div style={{minHeight:"100vh",background:"#f8fafc"}}>
      <nav style={{background:BG,padding:"0 20px",display:"flex",alignItems:"center",position:"sticky",top:0,zIndex:100,borderBottom:"1px solid rgba(255,255,255,.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginRight:"auto",padding:"13px 0"}}>
          <div style={{width:30,height:30,background:`linear-gradient(135deg,${Y},#f59e0b)`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>⚡</div>
          <span style={{color:WH,fontWeight:700,fontSize:15,letterSpacing:"-.01em"}}>KitchenAI</span>
          <span style={{background:"rgba(255,255,255,.08)",color:"rgba(255,255,255,.5)",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600,letterSpacing:"0.06em"}}>{kitchenCode}</span>
        </div>
        {[["send","Orders"],["pantry","Pantry"],["recipe","Recipe"]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{background:"none",border:"none",color:tab===key?Y:"rgba(255,255,255,.4)",fontWeight:tab===key?700:500,fontSize:13,cursor:"pointer",padding:"15px 12px",borderBottom:tab===key?`2px solid ${Y}`:"2px solid transparent",fontFamily:"inherit"}}>{label}</button>
        ))}
        <button onClick={onLeave} style={{background:"none",border:"none",color:"rgba(255,255,255,.25)",cursor:"pointer",fontSize:12,fontFamily:"inherit",marginLeft:6}}>Exit</button>
      </nav>

      <div style={{maxWidth:480,margin:"0 auto",padding:"20px 16px",display:"flex",flexDirection:"column",gap:14}}>

        {tab==="send"&&(!sent?(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Card>
              <h2 style={{fontSize:17,fontWeight:700,color:TX,margin:"0 0 4px"}}>Send grocery list</h2>
              <p style={{fontSize:13,color:TX2,margin:"0 0 18px"}}>Record or upload what's missing from the kitchen</p>
              {!result?(
                <VoiceRecorder onFileReady={setCurrentFile} onTranscribe={handleTranscribe} loading={loading}/>
              ):(
                <>
                  <div style={{background:"linear-gradient(135deg,#fffbeb,#fef3c7)",border:"1px solid #fde68a",borderRadius:12,padding:"12px 16px",marginBottom:14}}>
                    <p style={{fontSize:11,fontWeight:700,color:"#92400e",margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Heard this</p>
                    <p style={{fontSize:13,color:"#78350f",fontStyle:"italic",margin:0,lineHeight:1.5}}>"{result.transcript}"</p>
                  </div>
                  <div style={{marginBottom:16}}>
                    <p style={{fontSize:12,fontWeight:700,color:TX2,margin:"0 0 10px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Items found ({result.grocery_list.length})</p>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {result.grocery_list.map((g,i)=>(
                        <div key={i} style={{background:"linear-gradient(135deg,#f8fafc,#f1f5f9)",borderRadius:10,padding:"10px 14px",border:`1px solid ${GR2}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
                          <p style={{fontSize:13,fontWeight:700,textTransform:"capitalize",color:TX,margin:"0 0 2px"}}>{g.item}</p>
                          <p style={{fontSize:11,color:TX2,margin:0}}>{g.quantity}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>{setResult(null);setCurrentFile(null);}} style={{flex:1,padding:"11px",borderRadius:10,border:`1px solid ${GR2}`,background:WH,color:TX2,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Re-record</button>
                    <YBtn onClick={sendToSister} disabled={loading}>{loading?"Sending...":"Send to employer ✓"}</YBtn>
                  </div>
                </>
              )}
              {error&&<p style={{fontSize:13,color:RD,marginTop:12,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"10px 14px"}}>{error}</p>}
            </Card>
          </div>
        ):(
          <Card style={{textAlign:"center",padding:"40px 20px"}}>
            <div style={{fontSize:52,marginBottom:14}}>✅</div>
            <h2 style={{fontSize:19,fontWeight:700,color:TX,margin:"0 0 6px"}}>List sent!</h2>
            <p style={{fontSize:13,color:TX2,margin:"0 0 22px",lineHeight:1.5}}>Your employer will review and place the order</p>
            <YBtn onClick={()=>{setSent(false);setResult(null);setCurrentFile(null);}}>Send another list</YBtn>
          </Card>
        ))}

        {tab==="pantry"&&<PantryView readOnly={true}/>}

        {tab==="recipe"&&(assignedRecipe?(
          <Card>
            <div style={{background:`linear-gradient(135deg,${BG},${BG2})`,borderRadius:12,padding:"16px 18px",marginBottom:16}}>
              <p style={{fontSize:11,color:Y,fontWeight:700,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.08em"}}>Cook this today</p>
              <h2 style={{fontSize:22,fontWeight:700,color:WH,margin:0}}>{assignedRecipe.name}</h2>
            </div>
            {assignedRecipe.youtube_url&&(
              <button onClick={()=>setVideoPanel({recipe:assignedRecipe.name,cuisine:"Indian"})} style={{
                width:"100%",background:`linear-gradient(135deg,#1a1a2e,#16213e)`,border:"1px solid rgba(255,255,255,.1)",borderRadius:14,padding:"16px 18px",
                display:"flex",alignItems:"center",gap:14,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 20px rgba(0,0,0,.2)",
              }}>
                <div style={{width:52,height:52,background:"linear-gradient(135deg,#ff0000,#cc0000)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 4px 16px rgba(255,0,0,.3)"}}>
                  <span style={{color:WH,fontSize:22}}>▶</span>
                </div>
                <div style={{textAlign:"left"}}>
                  <p style={{fontSize:14,fontWeight:700,color:WH,margin:"0 0 3px"}}>{assignedRecipe.youtube_title||"Watch recipe video"}</p>
                  <p style={{fontSize:12,color:"rgba(255,255,255,.45)",margin:0}}>{assignedRecipe.channel} · Tap to watch</p>
                </div>
                <span style={{marginLeft:"auto",color:"rgba(255,255,255,.3)",fontSize:20}}>→</span>
              </button>
            )}
          </Card>
        ):(
          <Card style={{textAlign:"center",padding:"44px 20px"}}>
            <div style={{fontSize:40,marginBottom:14}}>🍳</div>
            <h2 style={{fontSize:16,fontWeight:700,color:TX,margin:"0 0 6px"}}>No recipe assigned yet</h2>
            <p style={{fontSize:13,color:TX2,margin:0}}>Your employer will assign a recipe</p>
          </Card>
        ))}
      </div>
      {videoPanel&&<VideoSearchPanel recipe={videoPanel.recipe} cuisine={videoPanel.cuisine} showAssign={false} onClose={()=>setVideoPanel(null)} onAssign={()=>{}}/>}
    </div>
  );
}

/* ── SISTER INTERFACE ─────────────────────────────────────── */
function SisterInterface({kitchenCode,onLeave}) {
  const [tab,setTab]=useState("orders");
  const [orders,setOrders]=useState([]);
  const [recipes,setRecipes]=useState([]);
  const [cuisine,setCuisine]=useState("");
  const [vegFilter,setVegFilter]=useState(null); // null=all, true=veg, false=nonveg
  const [assignedRecipes,setAssignedRecipes]=useState(new Set()); // track sent recipes
  const [loading,setLoading]=useState(false);
  const [copied,setCopied]=useState(false);
  const [videoPanel,setVideoPanel]=useState(null);
  const [toast,setToast]=useState("");

  const shareLink=`${window.location.origin}?code=${kitchenCode}`;
  const loadOrders=useCallback(async()=>{try{setOrders((await getKitchenOrders(kitchenCode)).orders||[]);}catch(e){};},[kitchenCode]);
  const loadRecipes=useCallback(async()=>{setLoading(true);try{setRecipes((await getRecipes(cuisine||null,8,vegFilter)).recipes||[]);}catch(e){setRecipes([]);}finally{setLoading(false);};},[cuisine,vegFilter]);

  useEffect(()=>{loadOrders();const p=setInterval(loadOrders,5000);return()=>clearInterval(p);},[loadOrders]);
  useEffect(()=>{if(tab==="recipes")loadRecipes();},[tab,loadRecipes]);

  const handleConfirm=async(id)=>{await confirmKitchenOrder(kitchenCode,id);await loadOrders();};
  const handleAssign=async(recipe,video)=>{
    const key=`${recipe.name}-${video?.video_id}`;
    if(assignedRecipes.has(key)) return; // prevent duplicate sends
    setAssignedRecipes(prev=>new Set([...prev,key]));
    await assignRecipe(kitchenCode,{recipe_name:recipe.name,youtube_url:video?.video_id?`https://www.youtube.com/watch?v=${video.video_id}`:recipe.youtube_video?.url,youtube_title:video?.title||recipe.youtube_video?.title,channel:video?.channel||recipe.youtube_video?.channel});
    setToast(`"${recipe.name}" sent to your cook! 👩‍🍳`);setTimeout(()=>setToast(""),3000);setVideoPanel(null);
  };
  const copyLink=()=>{navigator.clipboard.writeText(shareLink);setCopied(true);setTimeout(()=>setCopied(false),2000);};
  const cuisines=["","Indian","Bengali","Chinese","Italian","Continental"];
  const matchColor=s=>s>=80?GN:s>=50?"#d97706":RD;

  return (
    <div style={{minHeight:"100vh",background:"#f8fafc"}}>
      <nav style={{background:BG,padding:"0 20px",display:"flex",alignItems:"center",position:"sticky",top:0,zIndex:100,borderBottom:"1px solid rgba(255,255,255,.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginRight:"auto",padding:"13px 0"}}>
          <div style={{width:30,height:30,background:`linear-gradient(135deg,${Y},#f59e0b)`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>⚡</div>
          <span style={{color:WH,fontWeight:700,fontSize:15,letterSpacing:"-.01em"}}>KitchenAI</span>
        </div>
        {[["orders","Orders"],["pantry","Pantry"],["recipes","Recipes"]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{background:"none",border:"none",color:tab===key?Y:"rgba(255,255,255,.4)",fontWeight:tab===key?700:500,fontSize:13,cursor:"pointer",padding:"15px 12px",borderBottom:tab===key?`2px solid ${Y}`:"2px solid transparent",fontFamily:"inherit"}}>{label}</button>
        ))}
        <button onClick={onLeave} style={{background:"none",border:"none",color:"rgba(255,255,255,.25)",cursor:"pointer",fontSize:12,fontFamily:"inherit",marginLeft:6}}>Exit</button>
      </nav>

      <div style={{maxWidth:860,margin:"0 auto",padding:"20px 16px"}}>
        {toast&&<div style={{background:`linear-gradient(135deg,${GN},#0f9154)`,color:WH,borderRadius:12,padding:"13px 20px",marginBottom:14,fontWeight:600,fontSize:14,boxShadow:"0 4px 16px rgba(12,124,58,.3)"}}>✅ {toast}</div>}

        {/* Kitchen code banner */}
        <div style={{background:`linear-gradient(135deg,${BG},${BG2})`,borderRadius:16,padding:"16px 20px",marginBottom:16,display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",border:"1px solid rgba(255,255,255,.08)",boxShadow:"0 4px 24px rgba(0,0,0,.2)"}}>
          <div style={{flex:1}}>
            <p style={{fontSize:11,color:"rgba(255,255,255,.4)",margin:"0 0 3px",textTransform:"uppercase",letterSpacing:"0.08em"}}>Your kitchen code</p>
            <p style={{fontSize:24,fontWeight:800,color:Y,margin:0,letterSpacing:"0.18em",fontVariantNumeric:"tabular-nums"}}>{kitchenCode}</p>
          </div>
          <button onClick={copyLink} style={{background:copied?"rgba(12,124,58,.3)":"rgba(255,255,255,.08)",border:`1px solid ${copied?"rgba(12,124,58,.5)":"rgba(255,255,255,.15)"}`,color:WH,borderRadius:10,padding:"10px 18px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}>
            {copied?"✓ Link copied":"Share with maid"}
          </button>
        </div>

        {/* ORDERS */}
        {tab==="orders"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {orders.length===0?(
              <Card style={{textAlign:"center",padding:"44px 20px"}}>
                <div style={{fontSize:40,marginBottom:14}}>📭</div>
                <h2 style={{fontSize:16,fontWeight:700,color:TX,margin:"0 0 6px"}}>No orders yet</h2>
                <p style={{fontSize:13,color:TX2,margin:"0 0 18px"}}>Share your kitchen code with the maid so she can send grocery lists</p>
                <YBtn onClick={copyLink}>{copied?"Copied!":"Copy kitchen link"}</YBtn>
              </Card>
            ):orders.map(order=>(
              <Card key={order.id} style={{background:"linear-gradient(135deg,#ffffff,#fafbfc)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                  <div>
                    <h3 style={{fontSize:15,fontWeight:700,color:TX,margin:"0 0 3px"}}>{order.grocery_list.length} items requested</h3>
                    <p style={{fontSize:12,color:TX2,margin:0}}>{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <span style={{background:"linear-gradient(135deg,#fffbeb,#fef3c7)",border:"1px solid #fde68a",color:"#92400e",borderRadius:99,padding:"4px 12px",fontSize:11,fontWeight:700}}>Pending</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:8,marginBottom:16}}>
                  {order.grocery_list.map((g,i)=>(
                    <div key={i} style={{background:"linear-gradient(135deg,#f8fafc,#f1f5f9)",borderRadius:10,padding:"9px 12px",border:`1px solid ${GR2}`}}>
                      <p style={{fontSize:13,fontWeight:700,textTransform:"capitalize",color:TX,margin:"0 0 2px"}}>{g.item}</p>
                      <p style={{fontSize:11,color:TX2,margin:0}}>{g.quantity}</p>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["blinkit","zepto","instamart"].map(p=>(
                    <a key={p} href={getSearchURL(p,order.grocery_list)} target="_blank" rel="noreferrer" style={{flex:1,minWidth:80,background:WH,border:`2px solid ${platformColor[p]}`,color:platformColor[p],borderRadius:10,padding:"9px",fontWeight:700,fontSize:12,textAlign:"center",textDecoration:"none",display:"block",transition:"all .15s"}}>{p.charAt(0).toUpperCase()+p.slice(1)}</a>
                  ))}
                  <YBtn onClick={()=>handleConfirm(order.id)} color={GN}>✓ Bought</YBtn>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab==="pantry"&&<PantryView readOnly={false}/>}

        {tab==="recipes"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",gap:8,marginBottom:2}}>
              {[[null,"🍽 All"],[true,"🟢 Veg only"],[false,"🍗 Non-veg"]].map(([val,label])=>(
                <button key={String(val)} onClick={()=>setVegFilter(val)} style={{flex:1,padding:"9px",borderRadius:10,border:`1.5px solid ${vegFilter===val?(val===true?"#16a34a":val===false?"#dc2626":BG):GR2}`,background:vegFilter===val?(val===true?"#f0fdf4":val===false?"#fff1f2":BG):WH,color:vegFilter===val?(val===true?"#16a34a":val===false?"#dc2626":Y):TX2,fontWeight:vegFilter===val?700:500,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{label}</button>
              ))}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {cuisines.map(c=>(
                <button key={c} onClick={()=>setCuisine(c)} style={{padding:"8px 18px",borderRadius:99,border:`1.5px solid ${cuisine===c?BG:GR2}`,background:cuisine===c?BG:WH,color:cuisine===c?Y:TX2,fontWeight:cuisine===c?700:500,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .15s",boxShadow:cuisine===c?"0 2px 8px rgba(0,0,0,.2)":"none"}}>{c||"All cuisines"}</button>
              ))}
            </div>
            {loading?<Spinner/>:(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
                {recipes.map((recipe,i)=>(
                  <div key={i} style={{background:WH,borderRadius:16,overflow:"hidden",border:`1px solid ${GR2}`,boxShadow:"0 2px 8px rgba(0,0,0,.06)",transition:"transform .15s, box-shadow .15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,.1)";}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,.06)";}}
                  >
                    <div style={{height:5,background:GR}}>
                      <div style={{height:"100%",width:`${recipe.match_score}%`,background:matchColor(recipe.match_score),transition:"width .6s",borderRadius:"0 99px 99px 0"}}/>
                    </div>
                    <div style={{padding:"16px 18px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                        <div style={{flex:1,marginRight:10}}>
                          <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 5px",color:TX,letterSpacing:"-.01em"}}>{recipe.name}</h3>
                          <span style={{fontSize:11,background:GR,border:`1px solid ${GR2}`,borderRadius:99,padding:"3px 10px",color:TX2,fontWeight:500}}>{recipe.cuisine}</span>
                        </div>
                        <div style={{background:recipe.match_score>=80?"#f0fdf4":recipe.match_score>=50?"#fffbeb":"#fef2f2",borderRadius:10,padding:"6px 10px",textAlign:"center",minWidth:52}}>
                          <p style={{fontSize:17,fontWeight:800,color:matchColor(recipe.match_score),margin:0}}>{recipe.match_score}%</p>
                          <p style={{fontSize:10,color:matchColor(recipe.match_score),margin:0,opacity:.7}}>match</p>
                        </div>
                      </div>
                      {recipe.matching_ingredients.length>0&&(
                        <div style={{marginBottom:10,display:"flex",flexWrap:"wrap",gap:4}}>
                          {recipe.matching_ingredients.map((ing,j)=>(
                            <span key={j} style={{fontSize:11,background:"#f0fdf4",border:"1px solid #bbf7d0",color:GN,borderRadius:6,padding:"2px 8px",fontWeight:500}}>✓ {ing}</span>
                          ))}
                        </div>
                      )}
                      <button onClick={()=>setVideoPanel({recipe:recipe.name,cuisine:recipe.cuisine,recipeObj:recipe})} style={{
                        width:"100%",marginTop:8,background:`linear-gradient(135deg,${BG},${BG2})`,border:"none",borderRadius:10,padding:"11px 16px",
                        color:WH,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",
                        display:"flex",alignItems:"center",gap:10,boxShadow:"0 2px 8px rgba(0,0,0,.15)",transition:"opacity .15s",
                      }}>
                        <div style={{width:26,height:26,background:"linear-gradient(135deg,#ff0000,#cc0000)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{color:WH,fontSize:10}}>▶</span>
                        </div>
                        Watch videos & send to cook
                        <span style={{marginLeft:"auto",color:Y,fontSize:14}}>→</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {videoPanel&&<VideoSearchPanel recipe={videoPanel.recipe} cuisine={videoPanel.cuisine} showAssign={true} onClose={()=>setVideoPanel(null)} onAssign={v=>handleAssign(videoPanel.recipeObj,v)}/>}
      <InstallBanner/>
    </div>
  );
}

/* ── ROOT APP ─────────────────────────────────────────────── */
export default function App() {
  const [role,setRole]=useState(null);
  const [kitchenCode,setKitchenCode]=useState(null);
  const [creating,setCreating]=useState(false);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.search);
    const code=params.get("code");
    if(code){setKitchenCode(code.toUpperCase());setRole("maid");return;}
    const sc=localStorage.getItem("kitchenCode");
    const sr=localStorage.getItem("kitchenRole");
    if(sc&&sr){setKitchenCode(sc);setRole(sr);}
  },[]);

  const handleSister=async()=>{
    setCreating(true);
    try{const d=await createKitchen("My Kitchen");setKitchenCode(d.code);setRole("sister");localStorage.setItem("kitchenCode",d.code);localStorage.setItem("kitchenRole","sister");}
    catch(e){console.error(e);}finally{setCreating(false);}
  };

  const handleMaid=code=>{setKitchenCode(code);setRole("maid");localStorage.setItem("kitchenCode",code);localStorage.setItem("kitchenRole","maid");};
  const handleLeave=()=>{localStorage.removeItem("kitchenCode");localStorage.removeItem("kitchenRole");setRole(null);setKitchenCode(null);window.history.replaceState({},"","?");};

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',system-ui,sans-serif;background:#f8fafc;-webkit-font-smoothing:antialiased;}
        @keyframes spin{to{transform:rotate(360deg);}}
        a:hover{opacity:.82;transition:opacity .15s;}
        input:focus{border-color:rgba(248,213,72,.6)!important;outline:none;box-shadow:0 0 0 3px rgba(248,213,72,.15);}
        button:active:not(:disabled){transform:scale(0.97);}
        audio{accent-color:${Y};}
      `}</style>

      {creating&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,backdropFilter:"blur(4px)"}}>
          <div style={{background:WH,borderRadius:20,padding:"36px 44px",textAlign:"center",boxShadow:"0 24px 80px rgba(0,0,0,.3)"}}>
            <Spinner/><p style={{fontSize:14,color:TX2,marginTop:14,fontWeight:500}}>Creating your kitchen...</p>
          </div>
        </div>
      )}

      {!role&&<LandingPage onSister={handleSister} onMaid={handleMaid}/>}
      {role==="maid"&&kitchenCode&&<MaidInterface kitchenCode={kitchenCode} onLeave={handleLeave}/>}
      {role==="sister"&&kitchenCode&&<SisterInterface kitchenCode={kitchenCode} onLeave={handleLeave}/>}
    </>
  );
}
