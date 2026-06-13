import { useState, useEffect, useCallback } from "react";
import InstallBanner from "./InstallBanner";
import {
  transcribeAudio, getInventory, addInventoryBulk, removeInventoryItem,
  getRecipes, createKitchen, verifyKitchen, saveKitchenOrder,
  getKitchenOrders, confirmKitchenOrder, assignRecipe, getAssignedRecipe,
} from "./api";

const Y="#f8d548", BG="#1b1e23", WH="#ffffff", GR="#f3f4f6", GR2="#e9eaec";
const TX="#1b1e23", TX2="#6b7280", GN="#0c7c3a", RD="#e53935";
const platformColor={blinkit:"#0c831f",zepto:"#8025f5",instamart:"#FC8019"};
const getSearchURL=(p,items)=>{
  const q=encodeURIComponent(items[0]?.item||"grocery");
  if(p==="blinkit") return `https://blinkit.com/s/?q=${q}`;
  if(p==="zepto") return `https://www.zeptonow.com/search?query=${q}`;
  return `https://www.swiggy.com/instamart/search?query=${q}`;
};

const YBtn=({children,onClick,disabled,full,outline,small,color})=>(
  <button onClick={onClick} disabled={disabled} style={{
    width:full?"100%":"auto", background:disabled?"#e5e7eb":outline?"transparent":color||Y,
    color:disabled?TX2:outline?(color||TX):TX, border:outline?`2px solid ${color||Y}`:"none",
    borderRadius:8, padding:small?"7px 16px":"11px 22px",
    fontWeight:700, fontSize:small?13:14, cursor:disabled?"not-allowed":"pointer",
    fontFamily:"inherit", transition:"opacity .15s",
  }}>{children}</button>
);

const Card=({children,style={}})=>(
  <div style={{background:WH,borderRadius:12,padding:"18px 20px",border:`1px solid ${GR2}`,...style}}>
    {children}
  </div>
);

const Spinner=()=>(
  <div style={{display:"flex",justifyContent:"center",padding:24}}>
    <div style={{width:28,height:28,border:`3px solid ${GR2}`,borderTop:`3px solid ${Y}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
  </div>
);

/* ── LANDING PAGE ─────────────────────────────────────────── */
function LandingPage({onSister, onMaid}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const joinAsMaid = async () => {
    if (!code.trim()) return setError("Enter a kitchen code");
    setLoading(true); setError("");
    try {
      await verifyKitchen(code.trim().toUpperCase());
      onMaid(code.trim().toUpperCase());
    } catch(e) {
      setError("Invalid kitchen code. Ask your employer for the code.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:400}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{width:64,height:64,background:Y,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 16px"}}>⚡</div>
          <h1 style={{color:WH,fontSize:26,fontWeight:700,margin:"0 0 6px"}}>KitchenAI</h1>
          <p style={{color:"rgba(255,255,255,.5)",fontSize:14,margin:0}}>Smart kitchen assistant</p>
        </div>

        {/* Sister/Owner */}
        <Card style={{marginBottom:12}}>
          <h2 style={{fontSize:16,fontWeight:700,color:TX,margin:"0 0 4px"}}>I'm the owner 👩‍💼</h2>
          <p style={{fontSize:13,color:TX2,margin:"0 0 16px"}}>Create your kitchen and manage groceries</p>
          <YBtn full onClick={onSister}>Create my kitchen</YBtn>
        </Card>

        {/* Maid */}
        <Card>
          <h2 style={{fontSize:16,fontWeight:700,color:TX,margin:"0 0 4px"}}>I'm the cook / maid 👩‍🍳</h2>
          <p style={{fontSize:13,color:TX2,margin:"0 0 12px"}}>Enter the kitchen code your employer shared</p>
          <div style={{display:"flex",gap:8}}>
            <input
              value={code} onChange={e=>setCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123" maxLength={6}
              style={{flex:1,padding:"10px 14px",borderRadius:8,border:`1.5px solid ${code?Y:GR2}`,fontSize:16,fontWeight:700,letterSpacing:"0.1em",outline:"none",fontFamily:"inherit",textTransform:"uppercase"}}
              onKeyDown={e=>e.key==="Enter"&&joinAsMaid()}
            />
            <YBtn onClick={joinAsMaid} disabled={loading}>
              {loading?"...":"Join"}
            </YBtn>
          </div>
          {error && <p style={{fontSize:12,color:RD,margin:"8px 0 0"}}>{error}</p>}
        </Card>
      </div>
    </div>
  );
}

/* ── MAID INTERFACE ───────────────────────────────────────── */
function MaidInterface({kitchenCode, onLeave}) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [assignedRecipe, setAssignedRecipe] = useState(null);

  useEffect(()=>{
    const poll = setInterval(async()=>{
      try {
        const data = await getAssignedRecipe(kitchenCode);
        if(data.recipe) setAssignedRecipe(data.recipe);
      } catch(e) {}
    }, 5000);
    return ()=>clearInterval(poll);
  }, [kitchenCode]);

  const transcribe = async () => {
    if(!file) return;
    setLoading(true); setError(null);
    try { setResult(await transcribeAudio(file)); }
    catch(e) { setError("Could not process voice note. Try again!"); }
    finally { setLoading(false); }
  };

  const sendToSister = async () => {
    if(!result) return;
    setLoading(true);
    try {
      await saveKitchenOrder(kitchenCode, result.grocery_list);
      setSent(true);
    } catch(e) { setError("Failed to send. Try again."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:GR}}>
      {/* Nav */}
      <nav style={{background:BG,padding:"12px 20px",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:32,height:32,background:Y,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>⚡</div>
        <span style={{color:WH,fontWeight:700,fontSize:15,flex:1}}>KitchenAI</span>
        <span style={{background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.7)",borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:600,letterSpacing:"0.05em"}}>{kitchenCode}</span>
        <button onClick={onLeave} style={{background:"none",border:"none",color:"rgba(255,255,255,.4)",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>Leave</button>
      </nav>

      <div style={{maxWidth:480,margin:"0 auto",padding:"20px 16px",display:"flex",flexDirection:"column",gap:16}}>

        {/* Assigned recipe banner */}
        {assignedRecipe && (
          <div style={{background:BG,borderRadius:12,padding:"16px 18px",color:WH}}>
            <p style={{fontSize:11,color:Y,fontWeight:700,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.07em"}}>Cook this today</p>
            <h2 style={{fontSize:20,fontWeight:700,margin:"0 0 12px",color:WH}}>{assignedRecipe.name}</h2>
            {assignedRecipe.youtube_url && (
              <a href={assignedRecipe.youtube_url} target="_blank" rel="noreferrer" style={{
                display:"flex",alignItems:"center",gap:12,background:"rgba(255,255,255,.1)",
                border:"1px solid rgba(255,255,255,.2)",borderRadius:10,padding:"12px 14px",
                textDecoration:"none",
              }}>
                <div style={{width:40,height:40,background:"#ff0000",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{color:WH,fontSize:16}}>▶</span>
                </div>
                <div>
                  <p style={{fontSize:13,fontWeight:700,color:WH,margin:0}}>{assignedRecipe.youtube_title||"Watch recipe"}</p>
                  <p style={{fontSize:11,color:"rgba(255,255,255,.5)",margin:0}}>{assignedRecipe.channel}</p>
                </div>
              </a>
            )}
          </div>
        )}

        {/* Voice upload */}
        {!sent ? (
          <Card>
            <h2 style={{fontSize:16,fontWeight:700,color:TX,margin:"0 0 4px"}}>Send grocery list</h2>
            <p style={{fontSize:13,color:TX2,margin:"0 0 16px"}}>Record what's needed and send to your employer</p>

            {!result ? (
              <>
                <label style={{display:"block",border:`2px dashed ${file?Y:GR2}`,borderRadius:10,padding:"24px 20px",textAlign:"center",cursor:"pointer",background:file?`${Y}15`:GR,marginBottom:14}}>
                  <input type="file" accept="audio/*" style={{display:"none"}} onChange={e=>setFile(e.target.files[0])}/>
                  {file ? (
                    <><div style={{fontSize:28,marginBottom:6}}>🎵</div>
                    <p style={{fontSize:13,fontWeight:600,color:TX,margin:0}}>{file.name}</p></>
                  ) : (
                    <><div style={{fontSize:28,marginBottom:6}}>🎙️</div>
                    <p style={{fontSize:13,fontWeight:600,color:TX,margin:"0 0 2px"}}>Tap to upload voice note</p>
                    <p style={{fontSize:11,color:TX2,margin:0}}>MP3 · OGG · WAV · M4A</p></>
                  )}
                </label>
                <YBtn full onClick={transcribe} disabled={!file||loading}>
                  {loading?"Processing...":"Read my voice note"}
                </YBtn>
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
                  <YBtn onClick={sendToSister} disabled={loading} small={false}>
                    {loading?"Sending...":"Send to employer ✓"}
                  </YBtn>
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
        )}
      </div>
    </div>
  );
}

/* ── SISTER INTERFACE ─────────────────────────────────────── */
function SisterInterface({kitchenCode, onLeave}) {
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [cuisine, setCuisine] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareLink = `${window.location.origin}?code=${kitchenCode}`;

  const loadOrders = useCallback(async()=>{
    try { setOrders((await getKitchenOrders(kitchenCode)).orders); }
    catch(e) { console.error(e); }
  },[kitchenCode]);

  const loadInventory = useCallback(async()=>{
    try { setInventory((await getInventory()).items||[]); }
    catch(e) { console.error(e); }
  },[]);

  const loadRecipes = useCallback(async()=>{
    setLoading(true);
    try { setRecipes((await getRecipes(cuisine||null,6)).recipes||[]); }
    catch(e) { setRecipes([]); }
    finally { setLoading(false); }
  },[cuisine]);

  useEffect(()=>{
    loadOrders(); loadInventory();
    const poll = setInterval(loadOrders, 5000);
    return ()=>clearInterval(poll);
  },[loadOrders, loadInventory]);

  useEffect(()=>{ if(tab==="recipes") loadRecipes(); },[tab, loadRecipes]);

  const handleConfirm = async(orderId)=>{
    await confirmKitchenOrder(kitchenCode, orderId);
    await loadOrders(); await loadInventory();
  };

  const handleAssignRecipe = async(recipe)=>{
    await assignRecipe(kitchenCode, {
      recipe_name: recipe.name,
      youtube_url: recipe.youtube_video?.url,
      youtube_title: recipe.youtube_video?.title,
      channel: recipe.youtube_video?.channel,
    });
    alert(`"${recipe.name}" sent to your cook!`);
  };

  const copyLink = ()=>{
    navigator.clipboard.writeText(shareLink);
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  const cuisines=["","Indian","Bengali","Chinese","Italian","Continental"];
  const matchColor=s=>s>=80?GN:s>=50?"#d97706":RD;

  return (
    <div style={{minHeight:"100vh",background:GR}}>
      {/* Nav */}
      <nav style={{background:BG,padding:"0 20px",display:"flex",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginRight:"auto",padding:"12px 0"}}>
          <div style={{background:Y,borderRadius:6,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center"}}>⚡</div>
          <span style={{color:WH,fontWeight:700,fontSize:15}}>KitchenAI</span>
        </div>
        {[["orders","Orders"],["inventory","Pantry"],["recipes","Recipes"]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{
            background:"none",border:"none",color:tab===key?Y:"rgba(255,255,255,.5)",
            fontWeight:tab===key?700:500,fontSize:13,cursor:"pointer",padding:"16px 14px",
            borderBottom:tab===key?`2px solid ${Y}`:"2px solid transparent",
            fontFamily:"inherit",transition:"all .15s",
          }}>{label}</button>
        ))}
        <button onClick={onLeave} style={{background:"none",border:"none",color:"rgba(255,255,255,.3)",cursor:"pointer",fontSize:12,fontFamily:"inherit",marginLeft:8}}>Exit</button>
      </nav>

      <div style={{maxWidth:860,margin:"0 auto",padding:"20px 16px"}}>

        {/* Share code banner */}
        <div style={{background:BG,borderRadius:12,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{flex:1}}>
            <p style={{fontSize:11,color:"rgba(255,255,255,.5)",margin:"0 0 2px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Your kitchen code</p>
            <p style={{fontSize:22,fontWeight:700,color:Y,margin:0,letterSpacing:"0.15em"}}>{kitchenCode}</p>
          </div>
          <button onClick={copyLink} style={{
            background:copied?"#0d5c36":"rgba(255,255,255,.1)",
            border:`1px solid ${copied?"#0d5c36":"rgba(255,255,255,.2)"}`,
            color:WH,borderRadius:8,padding:"8px 16px",fontWeight:600,fontSize:13,
            cursor:"pointer",fontFamily:"inherit",
          }}>
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
                <p style={{fontSize:13,color:TX2,margin:"0 0 16px"}}>Share your kitchen code with the maid so she can send grocery lists</p>
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
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:6,marginBottom:14}}>
                  {order.grocery_list.map((g,i)=>(
                    <div key={i} style={{background:GR,borderRadius:8,padding:"8px 12px",border:`1px solid ${GR2}`}}>
                      <p style={{fontSize:13,fontWeight:600,textTransform:"capitalize",color:TX,margin:0}}>{g.item}</p>
                      <p style={{fontSize:11,color:TX2,margin:0}}>{g.quantity}</p>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["blinkit","zepto","instamart"].map(p=>(
                    <a key={p} href={getSearchURL(p,order.grocery_list)} target="_blank" rel="noreferrer" style={{
                      flex:1,minWidth:80,background:WH,border:`1.5px solid ${platformColor[p]}`,
                      color:platformColor[p],borderRadius:8,padding:"8px",fontWeight:700,
                      fontSize:12,textAlign:"center",textDecoration:"none",display:"block",
                    }}>{p.charAt(0).toUpperCase()+p.slice(1)}</a>
                  ))}
                  <YBtn onClick={()=>handleConfirm(order.id)} color={GN}>
                    ✓ Bought — update pantry
                  </YBtn>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* INVENTORY TAB */}
        {tab==="inventory" && (
          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <h2 style={{fontSize:16,fontWeight:700,color:TX,margin:0}}>Kitchen pantry</h2>
                <p style={{fontSize:12,color:TX2,margin:"2px 0 0"}}>{inventory.length} items in stock</p>
              </div>
              <button onClick={loadInventory} style={{background:GR,border:`1px solid ${GR2}`,color:TX2,borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Refresh</button>
            </div>
            {inventory.length===0 ? (
              <div style={{textAlign:"center",padding:"32px 0",background:GR,borderRadius:10}}>
                <div style={{fontSize:32,marginBottom:8}}>🧺</div>
                <p style={{fontSize:13,color:TX2,margin:0}}>Pantry is empty. Confirm orders to add items.</p>
              </div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}}>
                {inventory.map(item=>(
                  <div key={item.id} style={{background:GR,border:`1px solid ${GR2}`,borderRadius:10,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <p style={{fontSize:13,fontWeight:600,textTransform:"capitalize",color:TX,margin:"0 0 3px"}}>{item.item}</p>
                      <p style={{fontSize:11,color:TX2,margin:0,background:WH,display:"inline-block",padding:"2px 7px",borderRadius:5,border:`1px solid ${GR2}`}}>{item.quantity}</p>
                    </div>
                    <button onClick={()=>removeInventoryItem(item.item).then(loadInventory)} style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:18,lineHeight:1,padding:0,marginLeft:4,fontFamily:"inherit"}}>×</button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* RECIPES TAB */}
        {tab==="recipes" && (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {cuisines.map(c=>(
                <button key={c} onClick={()=>setCuisine(c)} style={{
                  padding:"7px 16px",borderRadius:99,border:`1.5px solid ${cuisine===c?BG:GR2}`,
                  background:cuisine===c?BG:WH,color:cuisine===c?Y:TX2,
                  fontWeight:cuisine===c?700:500,fontSize:13,cursor:"pointer",fontFamily:"inherit",
                }}>{c||"All cuisines"}</button>
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
                        <div style={{marginBottom:8}}>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                            {recipe.matching_ingredients.map((ing,j)=>(
                              <span key={j} style={{fontSize:11,background:"#f0fdf4",border:"1px solid #bbf7d0",color:GN,borderRadius:6,padding:"2px 8px"}}>✓ {ing}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {recipe.youtube_video && (
                        <button onClick={()=>handleAssignRecipe(recipe)} style={{
                          width:"100%",marginTop:10,background:BG,border:"none",
                          borderRadius:8,padding:"10px 14px",color:Y,fontWeight:700,
                          fontSize:13,cursor:"pointer",fontFamily:"inherit",textAlign:"left",
                          display:"flex",alignItems:"center",gap:8,
                        }}>
                          <span style={{fontSize:16}}>👩‍🍳</span>
                          Send to cook
                        </button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <InstallBanner/>
    </div>
  );
}

/* ── ROOT APP ─────────────────────────────────────────────── */
export default function App() {
  const [role, setRole] = useState(null); // null | "sister" | "maid"
  const [kitchenCode, setKitchenCode] = useState(null);
  const [creating, setCreating] = useState(false);

  // Check URL for kitchen code (maid joining via link)
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if(code) {
      setKitchenCode(code.toUpperCase());
      setRole("maid");
    }
  },[]);

  // Check localStorage for returning users
  useEffect(()=>{
    const savedCode = localStorage.getItem("kitchenCode");
    const savedRole = localStorage.getItem("kitchenRole");
    if(savedCode && savedRole && !kitchenCode) {
      setKitchenCode(savedCode);
      setRole(savedRole);
    }
  },[]);

  const handleSister = async()=>{
    setCreating(true);
    try {
      const data = await createKitchen("My Kitchen");
      setKitchenCode(data.code);
      setRole("sister");
      localStorage.setItem("kitchenCode", data.code);
      localStorage.setItem("kitchenRole", "sister");
    } catch(e) { console.error(e); }
    finally { setCreating(false); }
  };

  const handleMaid = (code)=>{
    setKitchenCode(code);
    setRole("maid");
    localStorage.setItem("kitchenCode", code);
    localStorage.setItem("kitchenRole", "maid");
  };

  const handleLeave = ()=>{
    localStorage.removeItem("kitchenCode");
    localStorage.removeItem("kitchenRole");
    setRole(null); setKitchenCode(null);
    window.history.replaceState({}, "", window.location.pathname);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',system-ui,sans-serif;background:#f3f4f6;}
        @keyframes spin{to{transform:rotate(360deg);}}
        a:hover{opacity:.85;transition:opacity .15s;}
        input:focus{border-color:${Y}!important;outline:none;}
      `}</style>

      {creating && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
          <div style={{background:WH,borderRadius:16,padding:32,textAlign:"center"}}>
            <Spinner/>
            <p style={{fontSize:14,color:TX2,marginTop:12}}>Creating your kitchen...</p>
          </div>
        </div>
      )}

      {!role && <LandingPage onSister={handleSister} onMaid={handleMaid}/>}
      {role==="maid" && kitchenCode && <MaidInterface kitchenCode={kitchenCode} onLeave={handleLeave}/>}
      {role==="sister" && kitchenCode && <SisterInterface kitchenCode={kitchenCode} onLeave={handleLeave}/>}
    </>
  );
}
