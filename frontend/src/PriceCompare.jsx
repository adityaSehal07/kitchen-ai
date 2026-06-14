import { useState } from "react";
import axios from "axios";

const api = axios.create({ baseURL: "https://kitchen-ai-e44g.onrender.com/api/v1" });

const PLATFORMS = [
  { key: "blinkit", label: "Blinkit", color: "#0c831f", emoji: "🟢" },
  { key: "zepto", label: "Zepto", color: "#8025f5", emoji: "🟣" },
  { key: "instamart", label: "Instamart", color: "#FC8019", emoji: "🟠" },
];

export default function PriceCompare({ groceryList, onClose }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const compare = async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await api.post("/prices/compare", { grocery_list: groceryList });
      setResult(data);
    } catch(e) {
      setError("Price comparison failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const cheapestColor = result ? PLATFORMS.find(p => p.key === result.cheapest_platform)?.color : "#48C479";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:4000,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}}>
      <div style={{width:"100%",background:"var(--bg-card)",borderRadius:"24px 24px 0 0",maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 -12px 40px rgba(0,0,0,.3)"}}>

        {/* Header */}
        <div style={{padding:"12px 20px 0",textAlign:"center"}}>
          <div style={{width:40,height:4,background:"var(--border)",borderRadius:99,margin:"0 auto 14px"}}/>
        </div>
        <div style={{padding:"0 20px 14px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1}}>
            <h2 style={{fontSize:18,fontWeight:700,color:"var(--text-primary)",margin:0,letterSpacing:"-0.01em"}}>Compare Prices</h2>
            <p style={{fontSize:12,color:"var(--text-secondary)",margin:"3px 0 0"}}>{groceryList.length} items across 3 platforms</p>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:"50%",background:"var(--bg-elevated)",border:"none",cursor:"pointer",fontSize:18,color:"var(--text-secondary)",fontFamily:"inherit"}}>×</button>
        </div>

        <div style={{overflowY:"auto",flex:1,padding:"16px 20px"}}>
          {!result && !loading && (
            <div style={{textAlign:"center",padding:"32px 0"}}>
              <div style={{fontSize:48,marginBottom:16}}>🛒</div>
              <h3 style={{fontSize:16,fontWeight:700,color:"var(--text-primary)",margin:"0 0 8px"}}>Find the best prices</h3>
              <p style={{fontSize:13,color:"var(--text-secondary)",margin:"0 0 24px",lineHeight:1.5}}>
                We'll search Blinkit, Zepto and Instamart for each item and find you the cheapest cart
              </p>
              {/* Items preview */}
              <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",marginBottom:28}}>
                {groceryList.map((g,i) => (
                  <span key={i} style={{background:"var(--bg-elevated)",border:"1px solid var(--border)",borderRadius:99,padding:"5px 12px",fontSize:12,color:"var(--text-primary)",fontWeight:500,textTransform:"capitalize"}}>
                    {g.item} · {g.quantity}
                  </span>
                ))}
              </div>
              <button onClick={compare} style={{
                background:"var(--gold-gradient)",border:"none",borderRadius:14,
                padding:"16px 40px",fontWeight:700,fontSize:16,cursor:"pointer",
                fontFamily:"inherit",color:"#1C1E21",
                boxShadow:"var(--shadow-btn)",letterSpacing:"0.02em",
              }}>Compare Prices →</button>
              <p style={{fontSize:11,color:"var(--text-tertiary)",marginTop:12}}>Powered by Firecrawl · Live prices</p>
            </div>
          )}

          {loading && (
            <div style={{textAlign:"center",padding:"48px 0"}}>
              <div style={{marginBottom:20}}>
                <div style={{width:48,height:48,border:"3px solid var(--border)",borderTop:"3px solid var(--gold)",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto"}}/>
              </div>
              <p style={{fontSize:15,fontWeight:600,color:"var(--text-primary)",margin:"0 0 6px"}}>Searching live prices...</p>
              <p style={{fontSize:12,color:"var(--text-secondary)",margin:0}}>Checking Blinkit, Zepto & Instamart</p>
              <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:20}}>
                {PLATFORMS.map(p=>(
                  <div key={p.key} style={{textAlign:"center"}}>
                    <div style={{width:36,height:36,borderRadius:10,background:p.color+"22",border:`2px solid ${p.color}44`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 4px",fontSize:18}}>
                      {p.emoji}
                    </div>
                    <p style={{fontSize:10,color:"var(--text-secondary)",margin:0}}>{p.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{background:"var(--red-bg)",border:"1px solid var(--red-border)",borderRadius:12,padding:"16px",textAlign:"center",marginBottom:16}}>
              <p style={{color:"var(--red)",fontSize:13,margin:"0 0 12px"}}>{error}</p>
              <button onClick={compare} style={{background:"var(--red)",border:"none",borderRadius:8,padding:"8px 20px",color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Try again</button>
            </div>
          )}

          {result && (
            <>
              {/* Winner banner */}
              <div style={{background:`linear-gradient(135deg,${cheapestColor}22,${cheapestColor}11)`,border:`1px solid ${cheapestColor}44`,borderRadius:16,padding:"16px 20px",marginBottom:16,display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:48,height:48,borderRadius:14,background:cheapestColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>
                  {PLATFORMS.find(p=>p.key===result.cheapest_platform)?.emoji}
                </div>
                <div style={{flex:1}}>
                  <p style={{fontSize:11,fontWeight:600,color:cheapestColor,margin:"0 0 2px",textTransform:"uppercase",letterSpacing:"0.08em"}}>Best deal</p>
                  <p style={{fontSize:18,fontWeight:800,color:"var(--text-primary)",margin:"0 0 2px"}}>
                    {PLATFORMS.find(p=>p.key===result.cheapest_platform)?.label} — ₹{result.totals[result.cheapest_platform]}
                  </p>
                  <p style={{fontSize:12,color:"var(--text-secondary)",margin:0}}>Cheapest total for all items</p>
                </div>
                <a href={result.cart_urls[result.cheapest_platform]} target="_blank" rel="noreferrer" style={{
                  background:cheapestColor,color:"#fff",border:"none",borderRadius:10,
                  padding:"10px 16px",fontWeight:700,fontSize:13,cursor:"pointer",
                  fontFamily:"inherit",textDecoration:"none",flexShrink:0,
                  boxShadow:`0 3px 0 ${cheapestColor}88`,
                }}>Shop →</a>
              </div>

              {/* Platform totals */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
                {PLATFORMS.map(p=>(
                  <div key={p.key} style={{
                    background:"var(--bg-card)",border:`1px solid ${p.key===result.cheapest_platform?p.color+"66":"var(--border)"}`,
                    borderRadius:12,padding:"12px",textAlign:"center",
                    boxShadow:p.key===result.cheapest_platform?`0 2px 12px ${p.color}22`:"none",
                  }}>
                    <p style={{fontSize:18,margin:"0 0 3px"}}>{p.emoji}</p>
                    <p style={{fontSize:11,fontWeight:600,color:"var(--text-secondary)",margin:"0 0 4px"}}>{p.label}</p>
                    <p style={{fontSize:16,fontWeight:800,color:p.key===result.cheapest_platform?p.color:"var(--text-primary)",margin:0}}>
                      ₹{result.totals[p.key]||"?"}
                    </p>
                    {p.key===result.cheapest_platform&&(
                      <span style={{fontSize:10,background:p.color,color:"#fff",borderRadius:99,padding:"2px 6px",fontWeight:700,marginTop:4,display:"inline-block"}}>BEST</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Item breakdown */}
              <h3 style={{fontSize:13,fontWeight:700,color:"var(--text-secondary)",margin:"0 0 10px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Item breakdown</h3>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
                {result.items.map((item,i)=>(
                  <div key={i} style={{background:"var(--bg-elevated)",borderRadius:12,padding:"12px 14px",border:"1px solid var(--border)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <p style={{fontSize:14,fontWeight:600,textTransform:"capitalize",color:"var(--text-primary)",margin:0}}>{item.item}</p>
                      <span style={{fontSize:11,color:"var(--text-secondary)",background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:99,padding:"2px 8px"}}>{item.quantity}</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                      {PLATFORMS.map(p=>{
                        const price = item[p.key];
                        const isCheapest = item.cheapest === p.key;
                        return (
                          <div key={p.key} style={{
                            background:isCheapest?`${p.color}18`:"var(--bg-card)",
                            border:`1px solid ${isCheapest?p.color+"44":"var(--border)"}`,
                            borderRadius:8,padding:"6px 8px",textAlign:"center",
                          }}>
                            <p style={{fontSize:10,color:"var(--text-secondary)",margin:"0 0 2px"}}>{p.label}</p>
                            <p style={{fontSize:13,fontWeight:700,color:isCheapest?p.color:"var(--text-primary)",margin:0}}>{price||"N/A"}</p>
                            {item[`${p.key}_unit`]&&<p style={{fontSize:9,color:"var(--text-tertiary)",margin:0}}>{item[`${p.key}_unit`]}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Shop buttons */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,paddingBottom:8}}>
                {PLATFORMS.map(p=>(
                  <a key={p.key} href={result.cart_urls[p.key]} target="_blank" rel="noreferrer" style={{
                    background:"transparent",border:`2px solid ${p.color}`,
                    color:p.color,borderRadius:10,padding:"10px",
                    fontWeight:700,fontSize:12,textAlign:"center",
                    textDecoration:"none",display:"block",letterSpacing:"0.02em",
                  }}>{p.label}</a>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
