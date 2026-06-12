import { useState, useEffect, useCallback } from "react";
import InstallBanner from "./InstallBanner";
import {
  transcribeAudio, getInventory,
  addInventoryBulk, removeInventoryItem, getRecipes,
  getPendingOrder, confirmPurchase,
} from "./api";

const Y = "#f8d548";   // Blinkit yellow
const BG = "#1b1e23";  // dark nav
const WH = "#ffffff";
const GR = "#f3f4f6";  // light page bg
const GR2 = "#e9eaec"; // border
const TX = "#1b1e23";  // primary text
const TX2 = "#6b7280"; // secondary text
const GN = "#0c7c3a";  // green
const RD = "#e53935";

const platformColor = { blinkit:"#0c831f", zepto:"#8025f5", instamart:"#FC8019" };
const getSearchURL = (p, items) => {
  const q = encodeURIComponent(items[0]?.item||"grocery");
  if(p==="blinkit")   return `https://blinkit.com/s/?q=${q}`;
  if(p==="zepto")     return `https://www.zeptonow.com/search?query=${q}`;
  if(p==="instamart") return `https://www.swiggy.com/instamart/search?query=${q}`;
  return "#";
};

const Pill = ({children, color="#f0fdf4", textColor=GN, borderColor="#bbf7d0"}) => (
  <span style={{background:color,color:textColor,border:`1px solid ${borderColor}`,borderRadius:99,padding:"2px 10px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{children}</span>
);

const YBtn = ({children, onClick, disabled, full, outline}) => (
  <button onClick={onClick} disabled={disabled} style={{
    width:full?"100%":"auto",
    background:disabled?"#e5e7eb":outline?"transparent":Y,
    color:disabled?TX2:outline?TX:TX,
    border:outline?`2px solid ${Y}`:"none",
    borderRadius:8, padding:"11px 22px",
    fontWeight:700, fontSize:14, cursor:disabled?"not-allowed":"pointer",
    fontFamily:"inherit", transition:"opacity .15s",
  }}>{children}</button>
);

function SmartShoppingPanel({ groceryList, inventory, onAddToInventory }) {
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);
  const invNames = inventory.map(i=>i.item.toLowerCase());
  const inStock   = groceryList.filter(g=>invNames.some(n=>n.includes(g.item.toLowerCase())||g.item.toLowerCase().includes(n)));
  const needToBuy = groceryList.filter(g=>!invNames.some(n=>n.includes(g.item.toLowerCase())||g.item.toLowerCase().includes(n)));
  const copyList  = () => {
    navigator.clipboard.writeText("Shopping List:\n"+needToBuy.map(g=>`• ${g.item} — ${g.quantity}`).join("\n"));
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {inStock.length>0 && (
        <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:12,padding:"14px 18px"}}>
          <p style={{fontSize:13,fontWeight:600,color:GN,margin:"0 0 8px"}}>✓ Already in your kitchen</p>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {inStock.map((g,i)=><Pill key={i}>{g.item}</Pill>)}
          </div>
        </div>
      )}

      {/* Items grid - Blinkit style */}
      <div style={{background:WH,borderRadius:12,padding:"18px 20px",border:`1px solid ${GR2}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <h2 style={{fontSize:16,fontWeight:700,color:TX,margin:0}}>Your cart</h2>
            <p style={{fontSize:12,color:TX2,margin:"2px 0 0"}}>{needToBuy.length} items to buy</p>
          </div>
          <button onClick={copyList} style={{background:copied?"#f0fdf4":GR,border:`1px solid ${copied?"#bbf7d0":GR2}`,color:copied?GN:TX2,borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            {copied?"✓ Copied":"Copy list"}
          </button>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10,marginBottom:18}}>
          {needToBuy.map((g,i)=>(
            <div key={i} style={{background:GR,borderRadius:10,padding:"12px 14px",border:`1px solid ${GR2}`,display:"flex",flexDirection:"column",gap:4}}>
              <span style={{fontSize:20}}>🛒</span>
              <p style={{fontSize:13,fontWeight:600,textTransform:"capitalize",color:TX,margin:0}}>{g.item}</p>
              <p style={{fontSize:11,color:TX2,margin:0,background:WH,borderRadius:6,padding:"2px 8px",display:"inline-block",width:"fit-content",border:`1px solid ${GR2}`}}>{g.quantity}</p>
            </div>
          ))}
        </div>

        {/* Delivery app buttons - Blinkit style */}
        <p style={{fontSize:12,color:TX2,margin:"0 0 10px",fontWeight:500}}>Open and shop on</p>
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
          {["blinkit","zepto","instamart"].map(p=>(
            <a key={p} href={getSearchURL(p,needToBuy)} target="_blank" rel="noreferrer" style={{
              flex:1, minWidth:90,
              background:WH, border:`1.5px solid ${platformColor[p]}`,
              color:platformColor[p], borderRadius:8,
              padding:"9px 12px", fontWeight:700, fontSize:13,
              textAlign:"center", textDecoration:"none", display:"block",
            }}>
              {p.charAt(0).toUpperCase()+p.slice(1)}
            </a>
          ))}
        </div>

        <YBtn full onClick={()=>{onAddToInventory(groceryList);setAdded(true);}} disabled={added}>
          {added?"✓ Inventory updated!":"Mark as bought"}
        </YBtn>
      </div>
    </div>
  );
}

function WhatsAppBanner({ order, inventory, onConfirm, onDismiss }) {
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const invNames = inventory.map(i=>i.item.toLowerCase());
  const needToBuy = order.grocery_list.filter(g=>!invNames.some(n=>n.includes(g.item.toLowerCase())||g.item.toLowerCase().includes(n)));
  const handleConfirm = async()=>{
    setConfirming(true);
    try{await confirmPurchase(order.id);setConfirmed(true);setTimeout(()=>onConfirm(),1200);}
    catch(e){console.error(e);}finally{setConfirming(false);}
  };
  const copyList = ()=>{
    navigator.clipboard.writeText("Shopping List:\n"+needToBuy.map(g=>`• ${g.item} — ${g.quantity}`).join("\n"));
    setCopied(true);setTimeout(()=>setCopied(false),2000);
  };
  return (
    <div style={{background:"#0d5c36",borderRadius:12,padding:"18px 20px",color:WH}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
        <div>
          <p style={{fontSize:11,fontWeight:600,opacity:.7,margin:"0 0 2px",textTransform:"uppercase",letterSpacing:"0.07em"}}>New WhatsApp order</p>
          <h2 style={{fontSize:16,fontWeight:700,margin:0,color:WH}}>{order.grocery_list.length} items from the maid</h2>
          <p style={{fontSize:12,opacity:.6,margin:"3px 0 0"}}>{new Date(order.created_at).toLocaleTimeString()}</p>
        </div>
        <button onClick={onDismiss} style={{background:"rgba(255,255,255,.15)",border:"none",color:WH,width:28,height:28,borderRadius:"50%",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>×</button>
      </div>
      <div style={{background:"rgba(255,255,255,.1)",borderRadius:8,padding:"10px 14px",marginBottom:12,display:"flex",flexWrap:"wrap",gap:6}}>
        {order.grocery_list.map((g,i)=>(
          <span key={i} style={{background:"rgba(255,255,255,.15)",borderRadius:6,padding:"3px 10px",fontSize:12,fontWeight:500}}>{g.item} · {g.quantity}</span>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        {["blinkit","zepto","instamart"].map(p=>(
          <a key={p} href={getSearchURL(p,needToBuy)} target="_blank" rel="noreferrer" style={{flex:1,minWidth:80,background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:WH,borderRadius:8,padding:"8px",fontWeight:600,fontSize:12,textAlign:"center",textDecoration:"none",display:"block"}}>
            {p.charAt(0).toUpperCase()+p.slice(1)}
          </a>
        ))}
        <button onClick={copyList} style={{flex:1,minWidth:80,background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:WH,borderRadius:8,padding:"8px",fontWeight:600,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
          {copied?"✓ Copied":"Copy list"}
        </button>
      </div>
      <button onClick={handleConfirm} disabled={confirming||confirmed} style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:confirmed?"rgba(255,255,255,.2)":Y,color:confirmed?WH:TX,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
        {confirmed?"✓ Inventory updated!":confirming?"Updating...":"I bought this — update inventory"}
      </button>
    </div>
  );
}

function VoiceUpload({ onResult }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const run = async()=>{
    if(!file)return;
    setLoading(true);setError(null);
    try{onResult(await transcribeAudio(file));}
    catch(e){setError(e.response?.data?.detail||"Transcription failed. Is the backend running?");}
    finally{setLoading(false);}
  };
  return (
    <div style={{background:WH,borderRadius:12,padding:"24px 20px",border:`1px solid ${GR2}`}}>
      {/* Blinkit-style delivery promise banner */}
      <div style={{background:BG,borderRadius:10,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:24}}>⚡</span>
        <div>
          <p style={{color:Y,fontWeight:700,fontSize:14,margin:0}}>Grocery delivery in 10 minutes</p>
          <p style={{color:"rgba(255,255,255,.6)",fontSize:12,margin:0}}>Send a voice note, get your list instantly</p>
        </div>
      </div>

      <h2 style={{fontSize:16,fontWeight:700,color:TX,margin:"0 0 4px"}}>Upload voice note</h2>
      <p style={{fontSize:13,color:TX2,margin:"0 0 18px"}}>Hindi · Bengali · English · any mix</p>

      <label style={{display:"block",border:`2px dashed ${GR2}`,borderRadius:10,padding:"28px 20px",textAlign:"center",cursor:"pointer",background:file?`${Y}15`:GR,marginBottom:14,transition:"background .15s"}}>
        <input type="file" accept="audio/*" style={{display:"none"}} onChange={e=>setFile(e.target.files[0])}/>
        {file ? (
          <>
            <div style={{fontSize:32,marginBottom:8}}>🎵</div>
            <p style={{fontSize:13,fontWeight:600,color:TX,margin:"0 0 2px"}}>{file.name}</p>
            <p style={{fontSize:11,color:TX2,margin:0}}>Ready to transcribe</p>
          </>
        ) : (
          <>
            <div style={{fontSize:32,marginBottom:8}}>🎙️</div>
            <p style={{fontSize:13,fontWeight:600,color:TX,margin:"0 0 2px"}}>Tap to upload audio</p>
            <p style={{fontSize:11,color:TX2,margin:0}}>MP3 · OGG · WAV · M4A</p>
          </>
        )}
      </label>

      <YBtn full onClick={run} disabled={!file||loading}>
        {loading?"Transcribing your voice note...":"Get grocery list"}
      </YBtn>

      {loading && (
        <div style={{marginTop:10,background:GR,borderRadius:99,height:4,overflow:"hidden"}}>
          <div style={{height:"100%",width:"60%",background:Y,borderRadius:99,animation:"slide 1.2s ease-in-out infinite"}}/>
        </div>
      )}
      {error && <p style={{fontSize:13,color:RD,marginTop:10,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px"}}>{error}</p>}
    </div>
  );
}

function BuyerDashboard() {
  const [result, setResult] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [invLoading, setInvLoading] = useState(true);
  const [pendingOrder, setPendingOrder] = useState(null);
  const loadInventory = useCallback(async()=>{
    setInvLoading(true);
    try {
      const data = await getInventory();
      setInventory(data?.items || []);
    } catch (error) {
      console.error("Failed to load inventory", error);
    } finally {
      setInvLoading(false);
    }
  },[]);
  useEffect(()=>{
    loadInventory();
    const poll=setInterval(async()=>{
      try{const d=await getPendingOrder();if(d.order)setPendingOrder(d.order);}catch(e){}
    },5000);
    return()=>clearInterval(poll);
  },[loadInventory]);
  const handleAdd = async(list)=>{await addInventoryBulk(list);await loadInventory();};
  const handleRemove = async(name)=>{await removeInventoryItem(name);await loadInventory();};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {pendingOrder && <WhatsAppBanner order={pendingOrder} inventory={inventory} onConfirm={()=>{setPendingOrder(null);loadInventory();}} onDismiss={()=>setPendingOrder(null)}/>}
      {!result ? (
        <VoiceUpload onResult={setResult}/>
      ) : (
        <>
          <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"12px 16px"}}>
            <p style={{fontSize:11,fontWeight:600,color:"#92400e",margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.05em"}}>Transcript</p>
            <p style={{fontSize:13,color:"#78350f",fontStyle:"italic",margin:0}}>"{result.transcript}"</p>
          </div>
          <SmartShoppingPanel groceryList={result.grocery_list} inventory={inventory} onAddToInventory={handleAdd}/>
          <button onClick={()=>setResult(null)} style={{background:"none",border:"none",color:TX2,cursor:"pointer",fontSize:13,textAlign:"left",padding:0,fontFamily:"inherit"}}>← Upload new voice note</button>
        </>
      )}

      {/* Inventory section */}
      <div style={{background:WH,borderRadius:12,padding:"18px 20px",border:`1px solid ${GR2}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <h2 style={{fontSize:16,fontWeight:700,color:TX,margin:0}}>Kitchen inventory</h2>
            <p style={{fontSize:12,color:TX2,margin:"2px 0 0"}}>{inventory.length} items in stock</p>
          </div>
          <button onClick={loadInventory} style={{background:GR,border:`1px solid ${GR2}`,color:TX2,borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Refresh</button>
        </div>
        {invLoading ? (
          <div style={{background:GR,borderRadius:99,height:4,overflow:"hidden"}}><div style={{height:"100%",width:"40%",background:GR2,borderRadius:99,animation:"slide 1.2s ease-in-out infinite"}}/></div>
        ) : inventory.length===0 ? (
          <div style={{textAlign:"center",padding:"32px 0",background:GR,borderRadius:10}}>
            <div style={{fontSize:36,marginBottom:10}}>🧺</div>
            <p style={{fontSize:14,fontWeight:600,color:TX,margin:"0 0 4px"}}>Your kitchen is empty</p>
            <p style={{fontSize:12,color:TX2,margin:0}}>Upload a voice note and mark items as bought</p>
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}}>
            {inventory.map(item=>(
              <div key={item.id} style={{background:GR,border:`1px solid ${GR2}`,borderRadius:10,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <p style={{fontSize:13,fontWeight:600,textTransform:"capitalize",color:TX,margin:"0 0 3px"}}>{item.item}</p>
                  <p style={{fontSize:11,color:TX2,margin:0,background:WH,display:"inline-block",padding:"2px 7px",borderRadius:5,border:`1px solid ${GR2}`}}>{item.quantity}</p>
                </div>
                <button onClick={()=>handleRemove(item.item)} style={{background:"none",border:"none",color:"#d1d5db",cursor:"pointer",fontSize:18,lineHeight:1,padding:0,marginLeft:4,fontFamily:"inherit"}} title="Remove">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CookDashboard() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cuisine, setCuisine] = useState("");
  const [error, setError] = useState(null);
  const load = useCallback(async()=>{
    setLoading(true);setError(null);
    try{const data = await getRecipes(cuisine||null,6); setRecipes(data?.recipes || []);}
    catch(e){setError("No recipes found. Add items to inventory first.");setRecipes([]);}
    finally{setLoading(false);}
  },[cuisine]);
  useEffect(()=>{load();},[load]);
  const cuisines=["","Indian","Bengali","Chinese","Italian","Continental"];
  const matchBg = s=>s>=80?"#f0fdf4":s>=50?"#fffbeb":"#fef2f2";
  const matchColor = s=>s>=80?GN:s>=50?"#d97706":RD;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Header banner */}
      <div style={{background:BG,borderRadius:12,padding:"20px 20px"}}>
        <p style={{fontSize:11,color:Y,fontWeight:700,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.07em"}}>Cook's dashboard</p>
        <h1 style={{fontSize:22,fontWeight:700,color:WH,margin:"0 0 4px"}}>What shall we cook today?</h1>
        <p style={{fontSize:13,color:"rgba(255,255,255,.5)",margin:0}}>Recipes matched to your kitchen inventory</p>
      </div>

      {/* Cuisine filter */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {cuisines.map(c=>(
          <button key={c} onClick={()=>setCuisine(c)} style={{padding:"7px 16px",borderRadius:99,border:`1.5px solid ${cuisine===c?BG:GR2}`,background:cuisine===c?BG:WH,color:cuisine===c?Y:TX2,fontWeight:cuisine===c?700:500,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
            {c||"All cuisines"}
          </button>
        ))}
      </div>

      {loading && <div style={{background:GR,borderRadius:99,height:4,overflow:"hidden"}}><div style={{height:"100%",width:"50%",background:Y,borderRadius:99,animation:"slide 1.2s ease-in-out infinite"}}/></div>}
      {error && <div style={{textAlign:"center",padding:"32px 0",background:WH,borderRadius:12,border:`1px solid ${GR2}`}}><p style={{fontSize:13,color:TX2,margin:0}}>{error}</p></div>}

      {!loading && !error && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
          {recipes.map((recipe,i)=>(
            <div key={i} style={{background:WH,border:`1px solid ${GR2}`,borderRadius:12,overflow:"hidden"}}>
              {/* Match score bar */}
              <div style={{height:4,background:GR}}>
                <div style={{height:"100%",width:`${recipe.match_score}%`,background:matchColor(recipe.match_score),transition:"width .6s ease"}}/>
              </div>
              <div style={{padding:"16px 18px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div style={{flex:1,marginRight:12}}>
                    <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 5px",color:TX}}>{recipe.name}</h3>
                    <span style={{fontSize:11,background:GR,border:`1px solid ${GR2}`,borderRadius:99,padding:"2px 10px",color:TX2,fontWeight:500}}>{recipe.cuisine}</span>
                  </div>
                  <div style={{background:matchBg(recipe.match_score),borderRadius:8,padding:"6px 10px",textAlign:"center",minWidth:52}}>
                    <p style={{fontSize:17,fontWeight:700,color:matchColor(recipe.match_score),margin:0,lineHeight:1}}>{recipe.match_score}%</p>
                    <p style={{fontSize:10,color:matchColor(recipe.match_score),margin:0,opacity:.8}}>match</p>
                  </div>
                </div>

                {recipe.matching_ingredients.length>0 && (
                  <div style={{marginBottom:10}}>
                    <p style={{fontSize:10,color:TX2,margin:"0 0 5px",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>In stock</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {recipe.matching_ingredients.map((ing,j)=>(
                        <span key={j} style={{fontSize:11,background:"#f0fdf4",border:"1px solid #bbf7d0",color:GN,borderRadius:6,padding:"2px 8px",fontWeight:500}}>✓ {ing}</span>
                      ))}
                    </div>
                  </div>
                )}

                {recipe.missing_ingredients.length>0 && (
                  <div style={{marginBottom:12}}>
                    <p style={{fontSize:10,color:TX2,margin:"0 0 5px",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>Need to buy</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {recipe.missing_ingredients.map((ing,j)=>(
                        <span key={j} style={{fontSize:11,background:GR,border:`1px solid ${GR2}`,color:TX2,borderRadius:6,padding:"2px 8px"}}>{ing}</span>
                      ))}
                    </div>
                  </div>
                )}

                {recipe.youtube_video && (
                  <a href={recipe.youtube_video.url} target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",gap:10,background:"#fff1f2",border:"1px solid #fecdd3",borderRadius:8,padding:"10px 12px",textDecoration:"none",marginTop:8}}>
                    <div style={{width:32,height:32,background:"#ff0000",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{color:WH,fontSize:12,fontWeight:700}}>▶</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:12,fontWeight:600,color:TX,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{recipe.youtube_video.title||"Watch recipe"}</p>
                      <p style={{fontSize:11,color:TX2,margin:0}}>{recipe.youtube_video.channel}</p>
                    </div>
                    <span style={{color:TX2,fontSize:16,flexShrink:0}}>→</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("buyer");
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',system-ui,sans-serif;background:#f3f4f6;}
        @keyframes slide{0%{transform:translateX(-100%);}100%{transform:translateX(250%);}}
        a:hover{opacity:.85;transition:opacity .15s;}
      `}</style>

      {/* Blinkit-style top nav */}
      <nav style={{background:BG,padding:"0 20px",display:"flex",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginRight:"auto",padding:"12px 0"}}>
          <div style={{background:Y,borderRadius:6,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:16}}>⚡</span>
          </div>
          <span style={{fontSize:16,fontWeight:700,color:WH,letterSpacing:"-.01em"}}>KitchenAI</span>
          <span style={{fontSize:11,background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.6)",borderRadius:4,padding:"2px 7px",fontWeight:500}}>BETA</span>
        </div>

        {/* Tabs */}
        <div style={{display:"flex"}}>
          {[["buyer","🛒 Buyer"],["cook","👩‍🍳 Cook"]].map(([key,label])=>(
            <button key={key} onClick={()=>setTab(key)} style={{
              background:"none",border:"none",
              color:tab===key?Y:"rgba(255,255,255,.5)",
              fontWeight:tab===key?700:500,
              fontSize:13,cursor:"pointer",
              padding:"16px 16px",
              borderBottom:tab===key?`2px solid ${Y}`:"2px solid transparent",
              transition:"all .15s",fontFamily:"'DM Sans',system-ui,sans-serif",
            }}>{label}</button>
          ))}
        </div>
      </nav>

      <main style={{maxWidth:880,margin:"0 auto",padding:"20px 16px"}}>
        {tab==="buyer"?<BuyerDashboard/>:<CookDashboard/>}
      </main>
      <InstallBanner />
    </>
  );
}

// This is appended — replace the export default App with this one
// (or add InstallBanner inside the existing App component)
