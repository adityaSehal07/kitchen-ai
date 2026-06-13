import { useState, useEffect, useCallback } from "react";
import InstallBanner from "./InstallBanner";
import {
  transcribeAudio, getInventory, addInventoryBulk, removeInventoryItem,
  getRecipes, createKitchen, verifyKitchen, saveKitchenOrder,
  getKitchenOrders, confirmKitchenOrder, assignRecipe, getAssignedRecipe,
  searchRecipeVideos,
} from "./api";

const Y="#f8d548",BG="#1b1e23",WH="#ffffff",GR="#f3f4f6",GR2="#e9eaec";
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
    borderRadius:8,padding:small?"7px 14px":"11px 22px",
    fontWeight:700,fontSize:small?12:14,cursor:disabled?"not-allowed":"pointer",
    fontFamily:"inherit",transition:"opacity .15s",
  }}>{children}</button>
);

const Card=({children,style={}})=>(
  <div style={{background:WH,borderRadius:12,padding:"18px 20px",border:`1px solid ${GR2}`,...style}}>{children}</div>
);

const Spinner=()=>(
  <div style={{display:"flex",justifyContent:"center",padding:24}}>
    <div style={{width:28,height:28,border:`3px solid ${GR2}`,borderTop:`3px solid ${Y}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
  </div>
);

/* ── VIDEO PLAYER MODAL ───────────────────────────────────── */
function VideoModal({video, onClose, onAssign, showAssign}) {
  if(!video) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:1000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{width:"100%",maxWidth:640,background:BG,borderRadius:16,overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
        {/* YouTube embed */}
        <div style={{position:"relative",paddingBottom:"56.25%",height:0}}>
          <iframe
            src={`https://www.youtube.com/embed/${video.video_id}?autoplay=1`}
            style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none"}}
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={video.title}
          />
        </div>
        <div style={{padding:"16px 18px"}}>
          <h3 style={{color:WH,fontSize:15,fontWeight:700,margin:"0 0 6px",lineHeight:1.3}}>{video.title}</h3>
          <p style={{color:"rgba(255,255,255,.5)",fontSize:13,margin:"0 0 12px"}}>{video.channel}</p>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.7)",borderRadius:6,padding:"4px 10px",fontSize:12}}>👁 {video.views} views</span>
            <span style={{background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.7)",borderRadius:6,padding:"4px 10px",fontSize:12}}>👍 {video.likes}</span>
            {video.duration && <span style={{background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.7)",borderRadius:6,padding:"4px 10px",fontSize:12}}>⏱ {video.duration}</span>}
            {showAssign && (
              <button onClick={()=>onAssign(video)} style={{marginLeft:"auto",background:Y,border:"none",borderRadius:8,padding:"8px 16px",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                👩‍🍳 Send to cook
              </button>
            )}
            <button onClick={onClose} style={{background:"rgba(255,255,255,.1)",border:"none",borderRadius:8,padding:"8px 14px",color:"rgba(255,255,255,.6)",cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Close</button>
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
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(()=>{
    const load = async()=>{
      setLoading(true);
      try {
        const data = await searchRecipeVideos(recipe, cuisine, 6);
        setVideos(data.videos||[]);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  },[recipe, cuisine]);

  const sorted = [...videos].sort((a,b)=>{
    if(sortBy==="views") return b.view_count - a.view_count;
    if(sortBy==="likes") return b.like_count - a.like_count;
    return 0;
  });

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:999,display:"flex",flexDirection:"column"}} onClick={onClose}>
      <div style={{marginTop:"auto",background:WH,borderRadius:"20px 20px 0 0",maxHeight:"85vh",overflow:"hidden",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${GR2}`,display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}>
            <h2 style={{fontSize:16,fontWeight:700,color:TX,margin:0}}>{recipe}</h2>
            <p style={{fontSize:12,color:TX2,margin:0}}>{videos.length} videos found</p>
          </div>
          {/* Sort filters */}
          <div style={{display:"flex",gap:6}}>
            {[["views","👁 Views"],["likes","👍 Likes"]].map(([key,label])=>(
              <button key={key} onClick={()=>setSortBy(key)} style={{
                padding:"5px 12px",borderRadius:99,border:`1.5px solid ${sortBy===key?BG:GR2}`,
                background:sortBy===key?BG:WH,color:sortBy===key?Y:TX2,
                fontWeight:sortBy===key?700:500,fontSize:12,cursor:"pointer",fontFamily:"inherit",
              }}>{label}</button>
            ))}
          </div>
          <button onClick={onClose} style={{background:GR,border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:18,fontFamily:"inherit",color:TX2}}>×</button>
        </div>

        {/* Videos */}
        <div style={{overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
          {loading ? <Spinner/> : sorted.map((video,i)=>(
            <div key={i} style={{display:"flex",gap:12,background:GR,borderRadius:10,overflow:"hidden",border:`1px solid ${GR2}`,cursor:"pointer"}} onClick={()=>setSelectedVideo(video)}>
              {/* Thumbnail */}
              <div style={{position:"relative",flexShrink:0,width:120,height:68}}>
                <img src={video.thumbnail} alt={video.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.3)"}}>
                  <div style={{width:28,height:28,background:"rgba(255,0,0,.9)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{color:WH,fontSize:10,marginLeft:2}}>▶</span>
                  </div>
                </div>
                {video.duration && <span style={{position:"absolute",bottom:4,right:4,background:"rgba(0,0,0,.8)",color:WH,fontSize:10,padding:"2px 5px",borderRadius:4}}>{video.duration}</span>}
              </div>
              {/* Info */}
              <div style={{flex:1,padding:"8px 10px 8px 0",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
                <p style={{fontSize:12,fontWeight:600,color:TX,margin:0,lineHeight:1.3,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{video.title}</p>
                <div>
                  <p style={{fontSize:11,color:TX2,margin:"0 0 4px"}}>{video.channel}</p>
                  <div style={{display:"flex",gap:8}}>
                    <span style={{fontSize:11,color:TX2}}>👁 {video.views}</span>
                    <span style={{fontSize:11,color:TX2}}>👍 {video.likes}</span>
                  </div>
                </div>
              </div>
              {/* Send to cook */}
              {showAssign && (
                <button onClick={e=>{e.stopPropagation();onAssign(video);}} style={{
                  background:BG,border:"none",color:Y,fontWeight:700,fontSize:11,
                  padding:"0 12px",cursor:"pointer",fontFamily:"inherit",flexShrink:0,
                  borderLeft:`1px solid ${GR2}`,
                }}>Send to<br/>cook</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Video player modal */}
      {selectedVideo && (
        <VideoModal
          video={selectedVideo}
          onClose={()=>setSelectedVideo(null)}
          onAssign={v=>{onAssign(v);setSelectedVideo(null);}}
          showAssign={showAssign}
        />
      )}
    </div>
  );
}

/* ── SHARED PANTRY ────────────────────────────────────────── */
function PantryView({readOnly=false}) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async()=>{
    setLoading(true);
    try { setInventory((await getInventory()).items||[]); }
    catch(e) { console.error(e); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  const handleRemove = async(name)=>{
    await removeInventoryItem(name);
    await load();
  };

  return (
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div>
          <h2 style={{fontSize:16,fontWeight:700,color:TX,margin:0}}>Kitchen pantry</h2>
          <p style={{fontSize:12,color:TX2,margin:"2px 0 0"}}>{inventory.length} items in stock</p>
        </div>
        <button onClick={load} style={{background:GR,border:`1px solid ${GR2}`,color:TX2,borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Refresh</button>
      </div>
      {loading ? <Spinner/> : inventory.length===0 ? (
        <div style={{textAlign:"center",padding:"28px 0",background:GR,borderRadius:10}}>
          <div style={{fontSize:32,marginBottom:8}}>🧺</div>
          <p style={{fontSize:13,color:TX2,margin:0}}>Pantry is empty</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8}}>
          {inventory.map(item=>(
            <div key={item.id} style={{background:GR,border:`1px solid ${GR2}`,borderRadius:10,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <p style={{fontSize:13,fontWeight:600,textTransform:"capitalize",color:TX,margin:"0 0 3px"}}>{item.item}</p>
                <p style={{fontSize:11,color:TX2,margin:0,background:WH,display:"inline-block",padding:"2px 7px",borderRadius:5,border:`1px solid ${GR2}`}}>{item.quantity}</p>
              </div>
              {!readOnly && (
                <button onClick={()=>handleRemove(item.item)} style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:18,lineHeight:1,padding:0,marginLeft:4,fontFamily:"inherit"}}>×</button>
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

  const joinAsMaid = async()=>{
    if(!code.trim()) return setError("Enter a kitchen code");
    setLoading(true); setError("");
    try { await verifyKitchen(code.trim().toUpperCase()); onMaid(code.trim().toUpperCase()); }
    catch(e) { setError("Invalid code. Ask your employer."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{width:64,height:64,background:Y,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 16px"}}>⚡</div>
          <h1 style={{color:WH,fontSize:26,fontWeight:700,margin:"0 0 6px"}}>KitchenAI</h1>
          <p style={{color:"rgba(255,255,255,.5)",fontSize:14,margin:0}}>Smart kitchen assistant</p>
        </div>
        <Card style={{marginBottom:12}}>
          <h2 style={{fontSize:16,fontWeight:700,color:TX,margin:"0 0 4px"}}>I'm the owner 👩‍💼</h2>
          <p style={{fontSize:13,color:TX2,margin:"0 0 16px"}}>Create your kitchen and manage groceries</p>
          <YBtn full onClick={onSister}>Create my kitchen</YBtn>
        </Card>
        <Card>
          <h2 style={{fontSize:16,fontWeight:700,color:TX,margin:"0 0 4px"}}>I'm the cook / maid 👩‍🍳</h2>
          <p style={{fontSize:13,color:TX2,margin:"0 0 12px"}}>Enter the kitchen code your employer shared</p>
          <div style={{display:"flex",gap:8}}>
            <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123" maxLength={6}
              style={{flex:1,padding:"10px 14px",borderRadius:8,border:`1.5px solid ${code?Y:GR2}`,fontSize:16,fontWeight:700,letterSpacing:"0.1em",outline:"none",fontFamily:"inherit"}}
              onKeyDown={e=>e.key==="Enter"&&joinAsMaid()}
            />
            <YBtn onClick={joinAsMaid} disabled={loading}>{loading?"...":"Join"}</YBtn>
          </div>
          {error && <p style={{fontSize:12,color:RD,margin:"8px 0 0"}}>{error}</p>}
        </Card>
      </div>
    </div>
  );
}

/* ── MAID INTERFACE ───────────────────────────────────────── */
function MaidInterface({kitchenCode, onLeave}) {
  const [tab, setTab] = useState("send");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [assignedRecipe, setAssignedRecipe] = useState(null);
  const [videoPanel, setVideoPanel] = useState(null);

  useEffect(()=>{
    const load = async()=>{
      try { const d=await getAssignedRecipe(kitchenCode); if(d.recipe) setAssignedRecipe(d.recipe); }
      catch(e) {}
    };
    load();
    const poll = setInterval(load, 5000);
    return ()=>clearInterval(poll);
  },[kitchenCode]);

  const transcribe = async()=>{
    if(!file) return;
    setLoading(true); setError(null);
    try { setResult(await transcribeAudio(file)); }
    catch(e) { setError("Could not process voice note. Try again!"); }
    finally { setLoading(false); }
  };

  const sendToSister = async()=>{
    if(!result) return;
    setLoading(true);
    try { await saveKitchenOrder(kitchenCode, result.grocery_list); setSent(true); }
    catch(e) { setError("Failed to send. Try again."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:GR}}>
      <nav style={{background:BG,padding:"0 20px",display:"flex",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginRight:"auto",padding:"12px 0"}}>
          <div style={{background:Y,borderRadius:6,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center"}}>⚡</div>
          <span style={{color:WH,fontWeight:700,fontSize:15}}>KitchenAI</span>
        </div>
        {[["send","📦 Orders"],["pantry","🧺 Pantry"],["recipe","👩‍🍳 Recipe"]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{
            background:"none",border:"none",color:tab===key?Y:"rgba(255,255,255,.5)",
            fontWeight:tab===key?700:500,fontSize:12,cursor:"pointer",padding:"16px 10px",
            borderBottom:tab===key?`2px solid ${Y}`:"2px solid transparent",
            fontFamily:"inherit",transition:"all .15s",
          }}>{label}</button>
        ))}
        <button onClick={onLeave} style={{background:"none",border:"none",color:"rgba(255,255,255,.3)",cursor:"pointer",fontSize:12,fontFamily:"inherit",marginLeft:4}}>Exit</button>
      </nav>

      <div style={{maxWidth:480,margin:"0 auto",padding:"20px 16px",display:"flex",flexDirection:"column",gap:16}}>

        {/* SEND TAB */}
        {tab==="send" && (
          !sent ? (
            <Card>
              <h2 style={{fontSize:16,fontWeight:700,color:TX,margin:"0 0 4px"}}>Send grocery list</h2>
              <p style={{fontSize:13,color:TX2,margin:"0 0 16px"}}>Record missing items and send to employer</p>
              {!result ? (
                <>
                  <label style={{display:"block",border:`2px dashed ${file?Y:GR2}`,borderRadius:10,padding:"24px 20px",textAlign:"center",cursor:"pointer",background:file?`${Y}15`:GR,marginBottom:14}}>
                    <input type="file" accept="audio/*" style={{display:"none"}} onChange={e=>setFile(e.target.files[0])}/>
                    {file ? (<><div style={{fontSize:28,marginBottom:6}}>🎵</div><p style={{fontSize:13,fontWeight:600,color:TX,margin:0}}>{file.name}</p></>) : (<><div style={{fontSize:28,marginBottom:6}}>🎙️</div><p style={{fontSize:13,fontWeight:600,color:TX,margin:"0 0 2px"}}>Tap to upload voice note</p><p style={{fontSize:11,color:TX2,margin:0}}>MP3 · OGG · WAV · M4A</p></>)}
                  </label>
                  <YBtn full onClick={transcribe} disabled={!file||loading}>{loading?"Processing...":"Read my voice note"}</YBtn>
                </>
              ) : (
                <>
                  <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"10px 14px",marginBottom:12}}>
                    <p style={{fontSize:11,fontWeight:600,color:"#92400e",margin:"0 0 3px",textTransform:"uppercase"}}>Heard this</p>
                    <p style={{fontSize:13,color:"#78350f",fontStyle:"italic",margin:0}}>"{result.transcript}"</p>
                  </div>
                  <div style={{marginBottom:14}}>
                    <p style={{fontSize:12,fontWeight:600,color:TX2,margin:"0 0 8px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Items found ({result.grocery_list.length})</p>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                      {result.grocery_list.map((g,i)=>(
                        <div key={i} style={{background:GR,borderRadius:8,padding:"8px 12px",border:`1px solid ${GR2}`}}>
                          <p style={{fontSize:13,fontWeight:600,textTransform:"capitalize",color:TX,margin:0}}>{g.item}</p>
                          <p style={{fontSize:11,color:TX2,margin:0}}>{g.quantity}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>{setResult(null);setFile(null);}} style={{flex:1,padding:"10px",borderRadius:8,border:`1px solid ${GR2}`,background:WH,color:TX2,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Re-record</button>
                    <YBtn onClick={sendToSister} disabled={loading}>{loading?"Sending...":"Send ✓"}</YBtn>
                  </div>
                </>
              )}
              {error && <p style={{fontSize:13,color:RD,marginTop:10,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px"}}>{error}</p>}
            </Card>
          ) : (
            <Card style={{textAlign:"center",padding:"32px 20px"}}>
              <div style={{fontSize:48,marginBottom:12}}>✅</div>
              <h2 style={{fontSize:18,fontWeight:700,color:TX,margin:"0 0 6px"}}>List sent!</h2>
              <p style={{fontSize:13,color:TX2,margin:"0 0 20px"}}>Your employer will review and confirm the order</p>
              <YBtn onClick={()=>{setSent(false);setResult(null);setFile(null);}}>Send another list</YBtn>
            </Card>
          )
        )}

        {/* PANTRY TAB - shared read only for maid */}
        {tab==="pantry" && <PantryView readOnly={true}/>}

        {/* RECIPE TAB */}
        {tab==="recipe" && (
          assignedRecipe ? (
            <Card>
              <p style={{fontSize:11,color:TX2,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600}}>Cook this today</p>
              <h2 style={{fontSize:20,fontWeight:700,color:TX,margin:"0 0 16px"}}>{assignedRecipe.name}</h2>
              {assignedRecipe.youtube_url && (
                <div>
                  <button onClick={()=>setVideoPanel({recipe:assignedRecipe.name, cuisine:"Indian"})} style={{
                    width:"100%",background:BG,border:"none",borderRadius:10,padding:"14px",
                    display:"flex",alignItems:"center",gap:12,cursor:"pointer",fontFamily:"inherit",marginBottom:10,
                  }}>
                    <div style={{width:44,height:44,background:"#ff0000",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{color:WH,fontSize:18}}>▶</span>
                    </div>
                    <div style={{textAlign:"left"}}>
                      <p style={{fontSize:13,fontWeight:700,color:WH,margin:0}}>{assignedRecipe.youtube_title||"Watch recipe video"}</p>
                      <p style={{fontSize:11,color:"rgba(255,255,255,.5)",margin:0}}>{assignedRecipe.channel} · Tap to watch</p>
                    </div>
                  </button>
                  <a href={assignedRecipe.youtube_url} target="_blank" rel="noreferrer" style={{
                    display:"block",textAlign:"center",color:TX2,fontSize:12,textDecoration:"underline",
                  }}>Or open in YouTube app</a>
                </div>
              )}
            </Card>
          ) : (
            <Card style={{textAlign:"center",padding:"40px 20px"}}>
              <div style={{fontSize:36,marginBottom:12}}>🍳</div>
              <h2 style={{fontSize:16,fontWeight:700,color:TX,margin:"0 0 6px"}}>No recipe assigned yet</h2>
              <p style={{fontSize:13,color:TX2,margin:0}}>Your employer will assign a recipe from the app</p>
            </Card>
          )
        )}
      </div>

      {videoPanel && (
        <VideoSearchPanel
          recipe={videoPanel.recipe}
          cuisine={videoPanel.cuisine}
          showAssign={false}
          onClose={()=>setVideoPanel(null)}
          onAssign={()=>{}}
        />
      )}
    </div>
  );
}

/* ── SISTER INTERFACE ─────────────────────────────────────── */
function SisterInterface({kitchenCode, onLeave}) {
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [cuisine, setCuisine] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [videoPanel, setVideoPanel] = useState(null);
  const [assignedMsg, setAssignedMsg] = useState("");

  const shareLink = `${window.location.origin}?code=${kitchenCode}`;

  const loadOrders = useCallback(async()=>{
    try { setOrders((await getKitchenOrders(kitchenCode)).orders||[]); }
    catch(e) { console.error(e); }
  },[kitchenCode]);

  const loadRecipes = useCallback(async()=>{
    setLoading(true);
    try { setRecipes((await getRecipes(cuisine||null,8)).recipes||[]); }
    catch(e) { setRecipes([]); }
    finally { setLoading(false); }
  },[cuisine]);

  useEffect(()=>{
    loadOrders();
    const poll = setInterval(loadOrders, 5000);
    return ()=>clearInterval(poll);
  },[loadOrders]);

  useEffect(()=>{ if(tab==="recipes") loadRecipes(); },[tab,loadRecipes]);

  const handleConfirm = async(orderId)=>{
    await confirmKitchenOrder(kitchenCode, orderId);
    await loadOrders();
  };

  const handleAssignRecipe = async(recipe, video)=>{
    await assignRecipe(kitchenCode, {
      recipe_name: recipe.name,
      youtube_url: video?.video_id ? `https://www.youtube.com/watch?v=${video.video_id}` : recipe.youtube_video?.url,
      youtube_title: video?.title || recipe.youtube_video?.title,
      channel: video?.channel || recipe.youtube_video?.channel,
    });
    setAssignedMsg(`"${recipe.name}" sent to your cook!`);
    setTimeout(()=>setAssignedMsg(""),3000);
    setVideoPanel(null);
  };

  const copyLink=()=>{ navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  const cuisines=["","Indian","Bengali","Chinese","Italian","Continental"];
  const matchColor=s=>s>=80?GN:s>=50?"#d97706":RD;

  return (
    <div style={{minHeight:"100vh",background:GR}}>
      <nav style={{background:BG,padding:"0 20px",display:"flex",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginRight:"auto",padding:"12px 0"}}>
          <div style={{background:Y,borderRadius:6,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center"}}>⚡</div>
          <span style={{color:WH,fontWeight:700,fontSize:15}}>KitchenAI</span>
        </div>
        {[["orders","📦 Orders"],["pantry","🧺 Pantry"],["recipes","🍳 Recipes"]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{
            background:"none",border:"none",color:tab===key?Y:"rgba(255,255,255,.5)",
            fontWeight:tab===key?700:500,fontSize:12,cursor:"pointer",padding:"16px 10px",
            borderBottom:tab===key?`2px solid ${Y}`:"2px solid transparent",
            fontFamily:"inherit",transition:"all .15s",
          }}>{label}</button>
        ))}
        <button onClick={onLeave} style={{background:"none",border:"none",color:"rgba(255,255,255,.3)",cursor:"pointer",fontSize:12,fontFamily:"inherit",marginLeft:4}}>Exit</button>
      </nav>

      <div style={{maxWidth:860,margin:"0 auto",padding:"20px 16px"}}>

        {/* Success toast */}
        {assignedMsg && (
          <div style={{background:GN,color:WH,borderRadius:10,padding:"12px 18px",marginBottom:12,fontWeight:600,fontSize:14}}>
            ✅ {assignedMsg}
          </div>
        )}

        {/* Share code */}
        <div style={{background:BG,borderRadius:12,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{flex:1}}>
            <p style={{fontSize:11,color:"rgba(255,255,255,.5)",margin:"0 0 2px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Your kitchen code</p>
            <p style={{fontSize:22,fontWeight:700,color:Y,margin:0,letterSpacing:"0.15em"}}>{kitchenCode}</p>
          </div>
          <button onClick={copyLink} style={{background:copied?"#0d5c36":"rgba(255,255,255,.1)",border:`1px solid ${copied?"#0d5c36":"rgba(255,255,255,.2)"}`,color:WH,borderRadius:8,padding:"8px 16px",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            {copied?"✓ Copied link":"Share with maid"}
          </button>
        </div>

        {/* ORDERS TAB */}
        {tab==="orders" && (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {orders.length===0 ? (
              <Card style={{textAlign:"center",padding:"40px 20px"}}>
                <div style={{fontSize:36,marginBottom:12}}>📭</div>
                <h2 style={{fontSize:16,fontWeight:700,color:TX,margin:"0 0 6px"}}>No orders yet</h2>
                <p style={{fontSize:13,color:TX2,margin:"0 0 16px"}}>Share your kitchen code with the maid</p>
                <YBtn onClick={copyLink}>{copied?"Copied!":"Copy kitchen link"}</YBtn>
              </Card>
            ) : orders.map(order=>(
              <Card key={order.id}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div>
                    <h3 style={{fontSize:15,fontWeight:700,color:TX,margin:"0 0 3px"}}>{order.grocery_list.length} items requested</h3>
                    <p style={{fontSize:12,color:TX2,margin:0}}>{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <span style={{background:"#fffbeb",border:"1px solid #fde68a",color:"#92400e",borderRadius:99,padding:"3px 10px",fontSize:11,fontWeight:600}}>Pending</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:6,marginBottom:14}}>
                  {order.grocery_list.map((g,i)=>(
                    <div key={i} style={{background:GR,borderRadius:8,padding:"8px 12px",border:`1px solid ${GR2}`}}>
                      <p style={{fontSize:13,fontWeight:600,textTransform:"capitalize",color:TX,margin:0}}>{g.item}</p>
                      <p style={{fontSize:11,color:TX2,margin:0}}>{g.quantity}</p>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["blinkit","zepto","instamart"].map(p=>(
                    <a key={p} href={getSearchURL(p,order.grocery_list)} target="_blank" rel="noreferrer" style={{flex:1,minWidth:80,background:WH,border:`1.5px solid ${platformColor[p]}`,color:platformColor[p],borderRadius:8,padding:"8px",fontWeight:700,fontSize:12,textAlign:"center",textDecoration:"none",display:"block"}}>{p.charAt(0).toUpperCase()+p.slice(1)}</a>
                  ))}
                  <YBtn onClick={()=>handleConfirm(order.id)} color={GN}>✓ Bought</YBtn>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* PANTRY TAB - full access for sister */}
        {tab==="pantry" && <PantryView readOnly={false}/>}

        {/* RECIPES TAB */}
        {tab==="recipes" && (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {cuisines.map(c=>(
                <button key={c} onClick={()=>setCuisine(c)} style={{padding:"7px 16px",borderRadius:99,border:`1.5px solid ${cuisine===c?BG:GR2}`,background:cuisine===c?BG:WH,color:cuisine===c?Y:TX2,fontWeight:cuisine===c?700:500,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>{c||"All cuisines"}</button>
              ))}
            </div>
            {loading ? <Spinner/> : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
                {recipes.map((recipe,i)=>(
                  <Card key={i} style={{padding:0,overflow:"hidden"}}>
                    <div style={{height:4,background:GR}}>
                      <div style={{height:"100%",width:`${recipe.match_score}%`,background:matchColor(recipe.match_score),transition:"width .6s"}}/>
                    </div>
                    <div style={{padding:"16px 18px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                        <div>
                          <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 4px",color:TX}}>{recipe.name}</h3>
                          <span style={{fontSize:11,background:GR,border:`1px solid ${GR2}`,borderRadius:99,padding:"2px 10px",color:TX2}}>{recipe.cuisine}</span>
                        </div>
                        <div style={{background:recipe.match_score>=80?"#f0fdf4":recipe.match_score>=50?"#fffbeb":"#fef2f2",borderRadius:8,padding:"5px 10px",textAlign:"center"}}>
                          <p style={{fontSize:16,fontWeight:700,color:matchColor(recipe.match_score),margin:0}}>{recipe.match_score}%</p>
                          <p style={{fontSize:10,color:matchColor(recipe.match_score),margin:0,opacity:.8}}>match</p>
                        </div>
                      </div>
                      {recipe.matching_ingredients.length>0 && (
                        <div style={{marginBottom:8,display:"flex",flexWrap:"wrap",gap:4}}>
                          {recipe.matching_ingredients.map((ing,j)=>(
                            <span key={j} style={{fontSize:11,background:"#f0fdf4",border:"1px solid #bbf7d0",color:GN,borderRadius:6,padding:"2px 8px"}}>✓ {ing}</span>
                          ))}
                        </div>
                      )}
                      {/* Video search button */}
                      <button onClick={()=>setVideoPanel({recipe:recipe.name,cuisine:recipe.cuisine,recipeObj:recipe})} style={{
                        width:"100%",marginTop:10,background:BG,border:"none",borderRadius:8,
                        padding:"10px 14px",color:WH,fontWeight:700,fontSize:13,cursor:"pointer",
                        fontFamily:"inherit",display:"flex",alignItems:"center",gap:8,
                      }}>
                        <div style={{width:24,height:24,background:"#ff0000",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{color:WH,fontSize:9}}>▶</span>
                        </div>
                        Watch videos & send to cook
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video search panel */}
      {videoPanel && (
        <VideoSearchPanel
          recipe={videoPanel.recipe}
          cuisine={videoPanel.cuisine}
          showAssign={true}
          onClose={()=>setVideoPanel(null)}
          onAssign={video=>handleAssignRecipe(videoPanel.recipeObj, video)}
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

  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if(code) { setKitchenCode(code.toUpperCase()); setRole("maid"); return; }
    const savedCode = localStorage.getItem("kitchenCode");
    const savedRole = localStorage.getItem("kitchenRole");
    if(savedCode && savedRole) { setKitchenCode(savedCode); setRole(savedRole); }
  },[]);

  const handleSister = async()=>{
    setCreating(true);
    try {
      const data = await createKitchen("My Kitchen");
      setKitchenCode(data.code); setRole("sister");
      localStorage.setItem("kitchenCode", data.code);
      localStorage.setItem("kitchenRole", "sister");
    } catch(e) { console.error(e); }
    finally { setCreating(false); }
  };

  const handleMaid=(code)=>{
    setKitchenCode(code); setRole("maid");
    localStorage.setItem("kitchenCode", code);
    localStorage.setItem("kitchenRole", "maid");
  };

  const handleLeave=()=>{
    localStorage.removeItem("kitchenCode"); localStorage.removeItem("kitchenRole");
    setRole(null); setKitchenCode(null);
    window.history.replaceState({},""," ");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',system-ui,sans-serif;background:#f3f4f6;}
        @keyframes spin{to{transform:rotate(360deg);}}
        a:hover{opacity:.85;transition:opacity .15s;}
        input:focus{outline:none;}
      `}</style>
      {creating && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
          <div style={{background:WH,borderRadius:16,padding:32,textAlign:"center"}}>
            <Spinner/><p style={{fontSize:14,color:TX2,marginTop:12}}>Creating your kitchen...</p>
          </div>
        </div>
      )}
      {!role && <LandingPage onSister={handleSister} onMaid={handleMaid}/>}
      {role==="maid" && kitchenCode && <MaidInterface kitchenCode={kitchenCode} onLeave={handleLeave}/>}
      {role==="sister" && kitchenCode && <SisterInterface kitchenCode={kitchenCode} onLeave={handleLeave}/>}
    </>
  );
}
