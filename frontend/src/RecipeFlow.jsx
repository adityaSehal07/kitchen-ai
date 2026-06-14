import { useState, useEffect, useCallback, useRef } from "react";
import { getRecipes, getAssignedRecipe, assignRecipe, searchRecipeVideos } from "./api";

const S = {
  orange: "#FC8019", orangeDark: "#E5720A",
  dark: "#282C3F", darker: "#1C1F2E",
  bg: "#F5F5F5", card: "#FFFFFF",
  text: "#282C3F", text2: "#686B78", text3: "#93959F",
  border: "#E9E9EB", green: "#48C479", red: "#E23744",
};

const matchColor = s => s >= 80 ? S.green : s >= 50 ? S.orange : S.red;

function fmt(n) {
  if(n>=1000000) return `${(n/1000000).toFixed(1)}M`;
  if(n>=1000) return `${(n/1000).toFixed(1)}K`;
  return String(n);
}

/* ── VIDEO PLAYER SCREEN ──────────────────────────────────── */
function VideoPlayerScreen({ recipe, kitchenCode, onClose }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);
  const [sortBy, setSortBy] = useState("views");
  const [shared, setShared] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    searchRecipeVideos(recipe.name, recipe.cuisine, 12)
      .then(d => {
        const vids = d.videos || [];
        setVideos(vids);
        if(vids.length > 0) setActiveVideo(vids[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [recipe]);

  const sorted = [...videos].sort((a,b) =>
    sortBy === "views" ? b.view_count - a.view_count :
    sortBy === "likes" ? b.like_count - a.like_count : 0
  );

  const handleShare = async () => {
    if(shareRef.current || !activeVideo || !kitchenCode) return;
    shareRef.current = true;
    setSharing(true);
    try {
      await assignRecipe(kitchenCode, {
        recipe_name: recipe.name,
        youtube_url: `https://www.youtube.com/watch?v=${activeVideo.video_id}`,
        youtube_title: activeVideo.title,
        channel: activeVideo.channel,
      });
      setShared(true);
      setTimeout(() => { setShared(false); shareRef.current = false; }, 3000);
    } catch(e) {
      shareRef.current = false;
    } finally {
      setSharing(false);
    }
  };

  return (
    <div style={{
      position:"fixed",inset:0,background:S.darker,zIndex:3000,
      display:"flex",flexDirection:"column",overflow:"hidden",
    }}>
      {/* Top bar */}
      <div style={{
        background:S.dark,padding:"12px 16px",flexShrink:0,
        display:"flex",alignItems:"center",gap:10,
        borderBottom:"1px solid rgba(255,255,255,.08)",
      }}>
        <button onClick={onClose} style={{
          width:36,height:36,borderRadius:"50%",
          background:"rgba(255,255,255,.1)",border:"none",
          color:"#fff",fontSize:18,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",
          flexShrink:0,fontFamily:"inherit",
        }}>←</button>
        <div style={{flex:1,minWidth:0}}>
          <p style={{color:"#fff",fontWeight:700,fontSize:14,margin:0,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {recipe.name}
          </p>
          <p style={{color:"rgba(255,255,255,.4)",fontSize:11,margin:0}}>
            {videos.length} videos found
          </p>
        </div>
        {/* Share to cook button */}
        {kitchenCode && (
          <button onClick={handleShare} disabled={sharing||!activeVideo} style={{
            background: shared ? S.green : S.orange,
            border:"none",borderRadius:10,padding:"9px 14px",
            color:"#fff",fontWeight:700,fontSize:12,
            cursor:(sharing||!activeVideo)?"not-allowed":"pointer",
            fontFamily:"inherit",flexShrink:0,
            boxShadow: shared ? `0 3px 0 #1a7a3d` : `0 3px 0 ${S.orangeDark}`,
            transition:"all .2s",display:"flex",alignItems:"center",gap:6,
          }}>
            {shared ? "✓ Sent!" : sharing ? "..." : "👩‍🍳 Send to cook"}
          </button>
        )}
      </div>

      {/* Video player */}
      <div style={{flexShrink:0,background:"#000"}}>
        {loading ? (
          <div style={{height:210,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:32,height:32,border:"3px solid rgba(255,255,255,.2)",borderTop:`3px solid ${S.orange}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
          </div>
        ) : activeVideo ? (
          <div style={{position:"relative",paddingBottom:"56.25%",height:0}}>
            <iframe
              key={activeVideo.video_id}
              src={`https://www.youtube.com/embed/${activeVideo.video_id}?autoplay=1&rel=0&modestbranding=1`}
              style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none"}}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              title={activeVideo.title}
            />
          </div>
        ) : (
          <div style={{height:210,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <p style={{color:"rgba(255,255,255,.4)",fontSize:13}}>No videos found</p>
          </div>
        )}
      </div>

      {/* Currently playing info */}
      {activeVideo && (
        <div style={{padding:"12px 16px",background:S.dark,flexShrink:0,borderBottom:"1px solid rgba(255,255,255,.08)"}}>
          <p style={{color:"#fff",fontWeight:700,fontSize:13,margin:"0 0 3px",lineHeight:1.3,
            display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
            {activeVideo.title}
          </p>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <p style={{color:"rgba(255,255,255,.45)",fontSize:12,margin:0}}>{activeVideo.channel}</p>
            <span style={{color:"rgba(255,255,255,.3)",fontSize:11}}>👁 {activeVideo.views}</span>
            <span style={{color:"rgba(255,255,255,.3)",fontSize:11}}>👍 {activeVideo.likes}</span>
            {activeVideo.duration && <span style={{color:"rgba(255,255,255,.3)",fontSize:11}}>⏱ {activeVideo.duration}</span>}
          </div>
        </div>
      )}

      {/* Sort + video list */}
      <div style={{flex:1,overflowY:"auto",minHeight:0}}>
        {/* Sort bar */}
        <div style={{display:"flex",gap:8,padding:"10px 16px",background:S.darker,borderBottom:"1px solid rgba(255,255,255,.06)",position:"sticky",top:0,zIndex:10}}>
          <p style={{color:"rgba(255,255,255,.4)",fontSize:12,margin:"0 auto 0 0",alignSelf:"center"}}>More videos</p>
          {[["views","👁 Views"],["likes","👍 Likes"],["default","🔀 Mix"]].map(([key,label])=>(
            <button key={key} onClick={()=>setSortBy(key)} style={{
              padding:"5px 10px",borderRadius:8,border:`1px solid ${sortBy===key?"rgba(252,128,25,.6)":"rgba(255,255,255,.15)"}`,
              background:sortBy===key?"rgba(252,128,25,.2)":"transparent",
              color:sortBy===key?S.orange:"rgba(255,255,255,.5)",
              fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
            }}>{label}</button>
          ))}
        </div>

        {/* Video list */}
        <div style={{padding:"8px 12px",display:"flex",flexDirection:"column",gap:8}}>
          {sorted.map((v,i) => (
            <div key={v.video_id} onClick={()=>setActiveVideo(v)} style={{
              display:"flex",gap:0,background:activeVideo?.video_id===v.video_id?"rgba(252,128,25,.15)":"rgba(255,255,255,.04)",
              borderRadius:12,overflow:"hidden",cursor:"pointer",
              border:`1px solid ${activeVideo?.video_id===v.video_id?"rgba(252,128,25,.4)":"rgba(255,255,255,.08)"}`,
              transition:"all .15s",
            }}>
              {/* Thumbnail */}
              <div style={{position:"relative",flexShrink:0,width:120,height:68}}>
                <img src={v.thumbnail} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}
                  onError={e=>{e.target.style.display="none";e.target.parentNode.style.background="#1a1a2e";}}/>
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.2)"}}>
                  {activeVideo?.video_id===v.video_id ? (
                    <div style={{width:28,height:28,background:S.orange,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <span style={{color:"#fff",fontSize:10}}>▶</span>
                    </div>
                  ) : (
                    <div style={{width:26,height:26,background:"rgba(255,0,0,.8)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <span style={{color:"#fff",fontSize:9,marginLeft:1}}>▶</span>
                    </div>
                  )}
                </div>
                {v.duration && <span style={{position:"absolute",bottom:3,right:3,background:"rgba(0,0,0,.8)",color:"#fff",fontSize:9,padding:"1px 4px",borderRadius:3,fontWeight:600}}>{v.duration}</span>}
              </div>
              {/* Info */}
              <div style={{flex:1,padding:"8px 10px",minWidth:0}}>
                <p style={{fontSize:12,fontWeight:600,color:activeVideo?.video_id===v.video_id?"#fff":"rgba(255,255,255,.8)",margin:"0 0 4px",lineHeight:1.3,
                  display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{v.title}</p>
                <p style={{fontSize:10,color:"rgba(255,255,255,.35)",margin:"0 0 3px"}}>{v.channel}</p>
                <div style={{display:"flex",gap:8}}>
                  <span style={{fontSize:10,color:"rgba(255,255,255,.3)"}}>👁 {v.views}</span>
                  <span style={{fontSize:10,color:"rgba(255,255,255,.3)"}}>👍 {v.likes}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── RECIPE CARD ──────────────────────────────────────────── */
function RecipeCard({ recipe, onWatch }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background:S.card,borderRadius:16,overflow:"hidden",
      border:`1px solid ${S.border}`,
      boxShadow:"0 4px 0 #e0e0e0, 0 6px 16px rgba(0,0,0,.06)",
    }}>
      <div style={{height:5,background:S.bg}}>
        <div style={{height:"100%",width:`${recipe.match_score}%`,background:matchColor(recipe.match_score),transition:"width .8s ease",borderRadius:"0 99px 99px 0"}}/>
      </div>
      <div style={{padding:"16px 18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div style={{flex:1,marginRight:12}}>
            <h3 style={{fontSize:17,fontWeight:800,color:S.text,margin:"0 0 4px"}}>{recipe.name}</h3>
            <span style={{fontSize:11,background:S.bg,border:`1px solid ${S.border}`,borderRadius:99,padding:"3px 10px",color:S.text2,fontWeight:600}}>{recipe.cuisine}</span>
          </div>
          <div style={{background:recipe.match_score>=80?"#f0fdf4":recipe.match_score>=50?"#fffbeb":"#fef2f2",borderRadius:12,padding:"8px 12px",textAlign:"center",minWidth:60,border:`1px solid ${matchColor(recipe.match_score)}33`,boxShadow:`0 2px 0 ${matchColor(recipe.match_score)}33`}}>
            <p style={{fontSize:20,fontWeight:800,color:matchColor(recipe.match_score),margin:0,lineHeight:1}}>{recipe.match_score}%</p>
            <p style={{fontSize:10,color:matchColor(recipe.match_score),margin:0,opacity:.7,fontWeight:600}}>match</p>
          </div>
        </div>

        {recipe.matching_ingredients.length > 0 && (
          <div style={{marginBottom:8}}>
            <p style={{fontSize:11,fontWeight:700,color:S.text3,margin:"0 0 6px",textTransform:"uppercase",letterSpacing:"0.05em"}}>✓ You have ({recipe.matching_ingredients.length})</p>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {recipe.matching_ingredients.map((ing,j) => (
                <span key={j} style={{fontSize:12,background:"#f0fdf4",border:"1px solid #bbf7d0",color:S.green,borderRadius:8,padding:"3px 10px",fontWeight:600}}>{ing}</span>
              ))}
            </div>
          </div>
        )}

        {recipe.missing_ingredients.length > 0 && (
          <div style={{marginBottom:14}}>
            <button onClick={()=>setExpanded(!expanded)} style={{background:"none",border:"none",color:S.text3,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",padding:0,textTransform:"uppercase",letterSpacing:"0.05em",display:"flex",alignItems:"center",gap:4,marginBottom:expanded?6:0}}>
              {expanded?"▾":"▸"} Need to buy ({recipe.missing_ingredients.length})
            </button>
            {expanded && (
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
                {recipe.missing_ingredients.map((ing,j) => (
                  <span key={j} style={{fontSize:12,background:S.bg,border:`1px solid ${S.border}`,color:S.text2,borderRadius:8,padding:"3px 10px"}}>{ing}</span>
                ))}
              </div>
            )}
          </div>
        )}

        <button onClick={() => onWatch(recipe)} style={{
          width:"100%",
          background:`linear-gradient(135deg,${S.dark},${S.darker})`,
          border:"none",borderRadius:12,padding:"13px 16px",
          color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",
          fontFamily:"inherit",display:"flex",alignItems:"center",gap:12,
          boxShadow:`0 4px 0 #0d0f18, 0 6px 20px rgba(0,0,0,.15)`,
        }}
          onMouseDown={e=>{e.currentTarget.style.transform="translateY(3px)";e.currentTarget.style.boxShadow="0 1px 0 #0d0f18";}}
          onMouseUp={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=`0 4px 0 #0d0f18, 0 6px 20px rgba(0,0,0,.15)`;}}
        >
          <div style={{width:32,height:32,background:"linear-gradient(135deg,#ff0000,#cc0000)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 3px 0 #880000"}}>
            <span style={{color:"#fff",fontSize:13}}>▶</span>
          </div>
          <span style={{flex:1,textAlign:"left"}}>Watch recipes on YouTube</span>
          <span style={{color:S.orange,fontSize:16}}>→</span>
        </button>
      </div>
    </div>
  );
}

/* ── MAID RECIPE VIEW ─────────────────────────────────────── */
function MaidRecipeView({ kitchenCode }) {
  const [assigned, setAssigned] = useState(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const load = async () => {
      try { const d = await getAssignedRecipe(kitchenCode); if(d.recipe) setAssigned(d.recipe); }
      catch(e) {}
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [kitchenCode]);

  if(!assigned) return (
    <div style={{textAlign:"center",padding:"48px 20px",background:S.card,borderRadius:16,border:`1px solid ${S.border}`}}>
      <div style={{fontSize:44,marginBottom:14}}>🍳</div>
      <h2 style={{fontSize:17,fontWeight:700,color:S.text,margin:"0 0 6px"}}>No recipe assigned yet</h2>
      <p style={{fontSize:13,color:S.text2,margin:0}}>Your employer will assign a recipe soon</p>
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:`linear-gradient(135deg,${S.dark},${S.darker})`,borderRadius:16,padding:"18px 20px",boxShadow:`0 4px 0 #0d0f18`}}>
        <p style={{fontSize:11,color:S.orange,fontWeight:700,margin:"0 0 4px",textTransform:"uppercase",letterSpacing:"0.08em"}}>Cook this today 👩‍🍳</p>
        <h2 style={{fontSize:22,fontWeight:800,color:"#fff",margin:0}}>{assigned.name}</h2>
      </div>

      {assigned.youtube_url && (
        <div style={{background:S.card,borderRadius:16,overflow:"hidden",border:`1px solid ${S.border}`,boxShadow:"0 4px 0 #e0e0e0"}}>
          {!playing ? (
            <button onClick={()=>setPlaying(true)} style={{
              width:"100%",background:"none",border:"none",cursor:"pointer",
              padding:0,fontFamily:"inherit",display:"block",
            }}>
              {/* Thumbnail */}
              <div style={{position:"relative",paddingBottom:"56.25%",height:0,background:"#1a1a2e"}}>
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
                  <div style={{width:64,height:64,background:"rgba(255,0,0,.9)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(255,0,0,.4)"}}>
                    <span style={{color:"#fff",fontSize:26,marginLeft:4}}>▶</span>
                  </div>
                  <p style={{color:"rgba(255,255,255,.7)",fontSize:13,fontWeight:600,margin:0}}>Tap to watch</p>
                </div>
              </div>
            </button>
          ) : (
            <div style={{position:"relative",paddingBottom:"56.25%",height:0}}>
              <iframe
                src={`https://www.youtube.com/embed/${assigned.youtube_url.split('v=')[1]?.split('&')[0] || assigned.youtube_url.split('/').pop()}?autoplay=1&rel=0`}
                style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none"}}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen title={assigned.name}
              />
            </div>
          )}
          <div style={{padding:"14px 16px"}}>
            <p style={{fontSize:14,fontWeight:700,color:S.text,margin:"0 0 3px"}}>{assigned.youtube_title || `${assigned.name} Recipe`}</p>
            <p style={{fontSize:12,color:S.text2,margin:0}}>{assigned.channel}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── MAIN RECIPE FLOW ─────────────────────────────────────── */
export default function RecipeFlow({ kitchenCode, role }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cuisine, setCuisine] = useState("");
  const [vegFilter, setVegFilter] = useState(null);
  const [activePlayer, setActivePlayer] = useState(null);

  const cuisines = ["","Indian","Bengali","Chinese","Italian","Continental"];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecipes(cuisine||null, 20, vegFilter);
      setRecipes(data.recipes || []);
    } catch(e) { setRecipes([]); }
    finally { setLoading(false); }
  }, [cuisine, vegFilter]);

  useEffect(() => { load(); }, [load]);

  if(role === "maid") return <MaidRecipeView kitchenCode={kitchenCode}/>;

  const Spinner = () => (
    <div style={{display:"flex",justifyContent:"center",padding:40}}>
      <div style={{width:32,height:32,border:`3px solid ${S.border}`,borderTop:`3px solid ${S.orange}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
    </div>
  );

  return (
    <>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* Veg toggle */}
        <div style={{display:"flex",gap:8}}>
          {[[null,"🍽 All"],[true,"🟢 Veg only"],[false,"🍗 Non-veg"]].map(([val,label]) => (
            <button key={String(val)} onClick={()=>setVegFilter(val)} style={{
              flex:1,padding:"10px 8px",borderRadius:12,
              border:`2px solid ${vegFilter===val?(val===true?S.green:val===false?S.red:S.dark):S.border}`,
              background:vegFilter===val?(val===true?"#f0fdf4":val===false?"#fef2f2":S.dark):"#fff",
              color:vegFilter===val?(val===true?S.green:val===false?S.red:S.orange):S.text2,
              fontWeight:vegFilter===val?700:500,fontSize:13,cursor:"pointer",fontFamily:"inherit",
              boxShadow:vegFilter===val?`0 3px 0 ${val===true?"#16a34a":val===false?"#b91c1c":S.darker}`:"0 2px 0 #e0e0e0",
            }}>{label}</button>
          ))}
        </div>

        {/* Cuisine filter */}
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {cuisines.map(c => (
            <button key={c} onClick={()=>setCuisine(c)} style={{
              padding:"7px 14px",borderRadius:99,
              border:`2px solid ${cuisine===c?S.dark:S.border}`,
              background:cuisine===c?S.dark:"#fff",
              color:cuisine===c?S.orange:S.text2,
              fontWeight:cuisine===c?700:500,
              fontSize:12,cursor:"pointer",fontFamily:"inherit",
              boxShadow:cuisine===c?`0 3px 0 ${S.darker}`:"0 2px 0 #e0e0e0",
            }}>{c||"All cuisines"}</button>
          ))}
        </div>

        {/* Recipes */}
        {loading ? <Spinner/> : recipes.length===0 ? (
          <div style={{textAlign:"center",padding:"40px 20px",background:S.card,borderRadius:16,border:`1px solid ${S.border}`}}>
            <div style={{fontSize:40,marginBottom:12}}>🧺</div>
            <h3 style={{fontSize:16,fontWeight:700,color:S.text,margin:"0 0 6px"}}>Add items to pantry first</h3>
            <p style={{fontSize:13,color:S.text2,margin:0}}>Recipes appear based on what you have in stock</p>
          </div>
        ) : recipes.map((recipe,i) => (
          <RecipeCard key={i} recipe={recipe} onWatch={r => setActivePlayer(r)}/>
        ))}
      </div>

      {/* Full screen video player */}
      {activePlayer && (
        <VideoPlayerScreen
          recipe={activePlayer}
          kitchenCode={kitchenCode}
          onClose={() => setActivePlayer(null)}
        />
      )}
    </>
  );
}
