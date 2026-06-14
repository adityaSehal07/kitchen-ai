import { useState, useEffect, useCallback, useRef } from "react";
import { getRecipes, getAssignedRecipe, assignRecipe } from "./api";

const S = {
  orange: "#FC8019", orangeDark: "#E5720A",
  dark: "#282C3F", darker: "#1C1F2E",
  bg: "#F5F5F5", card: "#FFFFFF",
  text: "#282C3F", text2: "#686B78", text3: "#93959F",
  border: "#E9E9EB", green: "#48C479", red: "#E23744",
};

const matchColor = s => s >= 80 ? S.green : s >= 50 ? S.orange : S.red;

/* ── IN-APP YOUTUBE PLAYER ────────────────────────────────── */
function YouTubePlayer({ recipe, onClose, onShare, sharing, shared }) {
  const query = encodeURIComponent(`${recipe.name} recipe`);
  const searchUrl = `https://www.youtube.com/embed?listType=search&list=${query}&autoplay=1`;
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const iframeRef = useRef(null);

  // Use YouTube search embed
  const embedUrl = `https://www.youtube.com/results?search_query=${query}&embedded=1`;
  const directSearchEmbed = `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(recipe.name + " recipe cooking")}&autoplay=1&rel=0`;

  return (
    <div style={{
      position:"fixed",inset:0,background:"#000",zIndex:3000,
      display:"flex",flexDirection:"column",
    }}>
      {/* Top bar */}
      <div style={{
        background:S.darker,padding:"12px 16px",
        display:"flex",alignItems:"center",gap:12,flexShrink:0,
        borderBottom:"1px solid rgba(255,255,255,.1)",
      }}>
        <button onClick={onClose} style={{
          background:"rgba(255,255,255,.1)",border:"none",color:"#fff",
          width:36,height:36,borderRadius:"50%",cursor:"pointer",
          fontSize:18,fontFamily:"inherit",flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"center",
        }}>←</button>
        <div style={{flex:1,minWidth:0}}>
          <p style={{color:"#fff",fontWeight:700,fontSize:14,margin:0,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{recipe.name} Recipes</p>
          <p style={{color:"rgba(255,255,255,.45)",fontSize:11,margin:0}}>Tap a video to watch</p>
        </div>
        {/* Share to maid floating button */}
        <button onClick={onShare} style={{
          background: shared ? S.green : S.orange,
          border:"none",borderRadius:12,padding:"10px 16px",
          color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",
          fontFamily:"inherit",flexShrink:0,
          boxShadow: shared ? `0 3px 0 #1a7a3d` : `0 3px 0 ${S.orangeDark}`,
          display:"flex",alignItems:"center",gap:6,
          transition:"all .2s",
        }}>
          <span>{shared ? "✓" : "👩‍🍳"}</span>
          {shared ? "Sent!" : "Share to cook"}
        </button>
      </div>

      {/* YouTube embed - search results */}
      <div style={{flex:1,position:"relative"}}>
        <iframe
          ref={iframeRef}
          src={directSearchEmbed}
          style={{width:"100%",height:"100%",border:"none"}}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          title={`${recipe.name} recipes`}
        />
      </div>

      {/* Bottom tip */}
      <div style={{
        background:S.darker,padding:"10px 16px",flexShrink:0,
        display:"flex",alignItems:"center",gap:8,
        borderTop:"1px solid rgba(255,255,255,.08)",
      }}>
        <span style={{fontSize:14}}>💡</span>
        <p style={{color:"rgba(255,255,255,.45)",fontSize:12,margin:0}}>
          Tap "Share to cook" to send this recipe to your maid
        </p>
      </div>
    </div>
  );
}

/* ── RECIPE CARD ──────────────────────────────────────────── */
function RecipeCard({ recipe, onGetRecipes, onShare, isSending, isSent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background:S.card,borderRadius:16,overflow:"hidden",
      border:`1px solid ${S.border}`,
      boxShadow:"0 4px 0 #e0e0e0, 0 6px 16px rgba(0,0,0,.06)",
    }}>
      {/* Match bar */}
      <div style={{height:5,background:S.bg}}>
        <div style={{
          height:"100%",width:`${recipe.match_score}%`,
          background:matchColor(recipe.match_score),
          transition:"width .8s ease",borderRadius:"0 99px 99px 0",
        }}/>
      </div>

      <div style={{padding:"16px 18px"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div style={{flex:1,marginRight:12}}>
            <h3 style={{fontSize:17,fontWeight:800,color:S.text,margin:"0 0 4px",letterSpacing:"-.01em"}}>{recipe.name}</h3>
            <span style={{fontSize:11,background:S.bg,border:`1px solid ${S.border}`,borderRadius:99,padding:"3px 10px",color:S.text2,fontWeight:600}}>{recipe.cuisine}</span>
          </div>
          <div style={{
            background: recipe.match_score>=80?"#f0fdf4":recipe.match_score>=50?"#fffbeb":"#fef2f2",
            borderRadius:12,padding:"8px 12px",textAlign:"center",minWidth:60,
            border:`1px solid ${matchColor(recipe.match_score)}33`,
            boxShadow:`0 2px 0 ${matchColor(recipe.match_score)}33`,
          }}>
            <p style={{fontSize:20,fontWeight:800,color:matchColor(recipe.match_score),margin:0,lineHeight:1}}>{recipe.match_score}%</p>
            <p style={{fontSize:10,color:matchColor(recipe.match_score),margin:0,opacity:.7,fontWeight:600}}>match</p>
          </div>
        </div>

        {/* Ingredients */}
        {recipe.matching_ingredients.length > 0 && (
          <div style={{marginBottom:10}}>
            <p style={{fontSize:11,fontWeight:700,color:S.text3,margin:"0 0 6px",textTransform:"uppercase",letterSpacing:"0.05em"}}>
              ✓ You have ({recipe.matching_ingredients.length})
            </p>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {recipe.matching_ingredients.map((ing,j) => (
                <span key={j} style={{fontSize:12,background:"#f0fdf4",border:"1px solid #bbf7d0",color:S.green,borderRadius:8,padding:"3px 10px",fontWeight:600}}>
                  {ing}
                </span>
              ))}
            </div>
          </div>
        )}

        {recipe.missing_ingredients.length > 0 && (
          <div style={{marginBottom:14}}>
            <button onClick={() => setExpanded(!expanded)} style={{
              background:"none",border:"none",color:S.text3,fontSize:11,fontWeight:700,
              cursor:"pointer",fontFamily:"inherit",padding:0,
              textTransform:"uppercase",letterSpacing:"0.05em",
              display:"flex",alignItems:"center",gap:4,marginBottom:expanded?6:0,
            }}>
              {expanded?"▾":"▸"} Need to buy ({recipe.missing_ingredients.length})
            </button>
            {expanded && (
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {recipe.missing_ingredients.map((ing,j) => (
                  <span key={j} style={{fontSize:12,background:S.bg,border:`1px solid ${S.border}`,color:S.text2,borderRadius:8,padding:"3px 10px"}}>
                    {ing}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Get Recipes button */}
        <button onClick={() => onGetRecipes(recipe)} style={{
          width:"100%",
          background:`linear-gradient(135deg,${S.dark},${S.darker})`,
          border:"none",borderRadius:12,padding:"13px 16px",
          color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",
          fontFamily:"inherit",display:"flex",alignItems:"center",gap:12,
          boxShadow:`0 4px 0 #0d0f18, 0 6px 20px rgba(0,0,0,.15)`,
          transition:"transform .1s",
        }}
          onMouseDown={e=>e.currentTarget.style.transform="translateY(3px)"}
          onMouseUp={e=>e.currentTarget.style.transform="translateY(0)"}
        >
          <div style={{
            width:32,height:32,
            background:"linear-gradient(135deg,#ff0000,#cc0000)",
            borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",
            flexShrink:0,boxShadow:"0 3px 0 #880000",
          }}>
            <span style={{color:"#fff",fontSize:13}}>▶</span>
          </div>
          <span style={{flex:1,textAlign:"left"}}>Get recipes on YouTube</span>
          <span style={{color:S.orange,fontSize:16}}>→</span>
        </button>
      </div>
    </div>
  );
}

/* ── MAIN RECIPE FLOW ─────────────────────────────────────── */
export default function RecipeFlow({ kitchenCode, role }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cuisine, setCuisine] = useState("");
  const [vegFilter, setVegFilter] = useState(null);
  const [activePlayer, setActivePlayer] = useState(null); // recipe being watched
  const [sharedRecipe, setSharedRecipe] = useState(null); // which recipe was shared
  const [sharing, setSharing] = useState(false);
  const [assignedRecipe, setAssignedRecipe] = useState(null); // for maid view

  const cuisines = ["","Indian","Bengali","Chinese","Italian","Continental"];

  // Load recipes
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecipes(cuisine||null, 20, vegFilter);
      setRecipes(data.recipes || []);
    } catch(e) { setRecipes([]); }
    finally { setLoading(false); }
  }, [cuisine, vegFilter]);

  useEffect(() => { load(); }, [load]);

  // For maid — poll assigned recipe
  useEffect(() => {
    if(role !== "maid" || !kitchenCode) return;
    const poll = async () => {
      try {
        const d = await getAssignedRecipe(kitchenCode);
        if(d.recipe) setAssignedRecipe(d.recipe);
      } catch(e) {}
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [kitchenCode, role]);

  const handleShare = async (recipe) => {
    if(!kitchenCode || sharing || !recipe) return;
    setSharing(true);
    try {
      await assignRecipe(kitchenCode, {
        recipe_name: recipe.name,
        youtube_url: `https://www.youtube.com/results?search_query=${encodeURIComponent(recipe.name + " recipe")}`,
        youtube_title: `${recipe.name} Recipe`,
        channel: "YouTube Search",
      });
      setSharedRecipe(recipe.name);
      setTimeout(() => setSharedRecipe(null), 3000);
    } catch(e) { console.error(e); }
    finally { setSharing(false); }
  };

  // MAID VIEW
  if(role === "maid") {
    if(!assignedRecipe) return (
      <div style={{textAlign:"center",padding:"48px 20px"}}>
        <div style={{fontSize:44,marginBottom:14}}>🍳</div>
        <h2 style={{fontSize:17,fontWeight:700,color:S.text,margin:"0 0 6px"}}>No recipe assigned yet</h2>
        <p style={{fontSize:13,color:S.text2,margin:0}}>Your employer will assign a recipe soon</p>
      </div>
    );

    const query = encodeURIComponent(`${assignedRecipe.name} recipe`);
    const embedUrl = `https://www.youtube-nocookie.com/embed?listType=search&list=${query}&autoplay=0&rel=0`;

    return (
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{background:`linear-gradient(135deg,${S.dark},${S.darker})`,borderRadius:16,padding:"18px 20px"}}>
          <p style={{fontSize:11,color:S.orange,fontWeight:700,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.08em"}}>Cook this today</p>
          <h2 style={{fontSize:22,fontWeight:800,color:"#fff",margin:0}}>{assignedRecipe.name}</h2>
        </div>
        <div style={{background:S.card,borderRadius:16,overflow:"hidden",border:`1px solid ${S.border}`,boxShadow:"0 4px 0 #e0e0e0"}}>
          <div style={{position:"relative",paddingBottom:"56.25%",height:0}}>
            <iframe
              src={embedUrl}
              style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none"}}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={assignedRecipe.name}
            />
          </div>
          <div style={{padding:"14px 16px"}}>
            <p style={{fontSize:13,color:S.text2,margin:0}}>
              💡 Watch any of these videos to learn how to cook <strong>{assignedRecipe.name}</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // OWNER VIEW
  const Spinner = () => (
    <div style={{display:"flex",justifyContent:"center",padding:40}}>
      <div style={{width:32,height:32,border:`3px solid ${S.border}`,borderTop:`3px solid ${S.orange}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>

      {/* Veg toggle */}
      <div style={{display:"flex",gap:8}}>
        {[[null,"🍽 All"],[true,"🟢 Veg only"],[false,"🍗 Non-veg"]].map(([val,label]) => (
          <button key={String(val)} onClick={() => setVegFilter(val)} style={{
            flex:1,padding:"10px 8px",borderRadius:12,
            border:`2px solid ${vegFilter===val?(val===true?S.green:val===false?S.red:S.dark):S.border}`,
            background: vegFilter===val?(val===true?"#f0fdf4":val===false?"#fef2f2":S.dark):"#fff",
            color: vegFilter===val?(val===true?S.green:val===false?S.red:S.orange):S.text2,
            fontWeight:vegFilter===val?700:500,fontSize:13,cursor:"pointer",fontFamily:"inherit",
            boxShadow: vegFilter===val?`0 3px 0 ${val===true?"#16a34a":val===false?"#b91c1c":S.darker}`:"0 2px 0 #e0e0e0",
          }}>{label}</button>
        ))}
      </div>

      {/* Cuisine filter */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {cuisines.map(c => (
          <button key={c} onClick={() => setCuisine(c)} style={{
            padding:"8px 16px",borderRadius:99,
            border:`2px solid ${cuisine===c?S.dark:S.border}`,
            background: cuisine===c?S.dark:"#fff",
            color: cuisine===c?S.orange:S.text2,
            fontWeight: cuisine===c?700:500,
            fontSize:13,cursor:"pointer",fontFamily:"inherit",
            boxShadow: cuisine===c?`0 3px 0 ${S.darker}`:"0 2px 0 #e0e0e0",
          }}>{c||"All cuisines"}</button>
        ))}
      </div>

      {/* Recipes */}
      {loading ? <Spinner/> : recipes.length===0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",background:S.card,borderRadius:16,border:`1px solid ${S.border}`}}>
          <div style={{fontSize:40,marginBottom:12}}>🧺</div>
          <h3 style={{fontSize:16,fontWeight:700,color:S.text,margin:"0 0 6px"}}>Add items to pantry first</h3>
          <p style={{fontSize:13,color:S.text2,margin:0}}>Recipes will appear based on what you have</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {sharedRecipe && (
            <div style={{background:`linear-gradient(135deg,${S.green},#2da55c)`,color:"#fff",borderRadius:12,padding:"13px 20px",fontWeight:700,fontSize:14,boxShadow:`0 4px 0 #1a7a3d`}}>
              ✅ "{sharedRecipe}" sent to your cook!
            </div>
          )}
          {recipes.map((recipe, i) => (
            <RecipeCard
              key={i}
              recipe={recipe}
              onGetRecipes={r => setActivePlayer(r)}
              onShare={() => handleShare(recipe)}
              isSent={sharedRecipe === recipe.name}
            />
          ))}
        </div>
      )}

      {/* In-app YouTube player */}
      {activePlayer && (
        <YouTubePlayer
          recipe={activePlayer}
          onClose={() => setActivePlayer(null)}
          onShare={() => handleShare(activePlayer)}
          sharing={sharing}
          shared={sharedRecipe === activePlayer?.name}
        />
      )}
    </div>
  );
}
