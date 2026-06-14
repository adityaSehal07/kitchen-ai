import { useState, useRef, useEffect } from "react";
import { transcribeAudio, saveKitchenOrder, getAssignedRecipe } from "./api";

const G = {
  dark: "#121417",
  card: "#1E2126",
  gold: "#C5A880",
  goldGrad: "linear-gradient(45deg, #D4AF37, #AA7C11)",
  green: "#3DAA6B",
  red: "#D64545",
  text: "#EAEAEA",
  text2: "#8F95A0",
  border: "rgba(197,168,128,0.12)",
};

// Food emoji map for items
const EMOJI_MAP = {
  potato: "🥔", aloo: "🥔", alu: "🥔",
  onion: "🧅", peyaj: "🧅", pyaz: "🧅",
  tomato: "🍅", tamatar: "🍅",
  milk: "🥛", dudh: "🥛",
  egg: "🥚", eggs: "🥚", anda: "🥚", dim: "🥚",
  rice: "🍚", chawal: "🍚", chal: "🍚",
  flour: "🌾", atta: "🌾", maida: "🌾",
  oil: "🫙", tel: "🫙",
  sugar: "🍬", chini: "🍬", cheeni: "🍬",
  salt: "🧂", namak: "🧂", noon: "🧂",
  chicken: "🍗", murgi: "🍗",
  fish: "🐟", maach: "🐟",
  bread: "🍞",
  butter: "🧈", maakhan: "🧈",
  banana: "🍌", kela: "🍌",
  apple: "🍎", seb: "🍎",
  lemon: "🍋", nimbu: "🍋",
  garlic: "🧄", roshun: "🧄", lahsun: "🧄",
  ginger: "🫚", ada: "🫚", adrak: "🫚",
  chilli: "🌶️", mirch: "🌶️", lonka: "🌶️",
  coriander: "🌿", dhania: "🌿",
  dal: "🫘", lentil: "🫘",
  paneer: "🧀",
  curd: "🥣", dahi: "🥣",
  default: "🛒",
};

function getEmoji(item) {
  const lower = item.toLowerCase();
  for(const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if(lower.includes(key)) return emoji;
  }
  return EMOJI_MAP.default;
}

export default function MaidPushToTalk({ kitchenCode, onExit }) {
  const [state, setState] = useState("idle"); // idle | recording | processing | done | recipe
  const [items, setItems] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [assignedRecipe, setAssignedRecipe] = useState(null);
  const [error, setError] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const [amplitude, setAmplitude] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const analyserRef = useRef(null);
  const animRef = useRef(null);
  const streamRef = useRef(null);

  // Poll for assigned recipe
  useEffect(() => {
    const poll = async () => {
      try {
        const d = await getAssignedRecipe(kitchenCode);
        if(d.recipe) setAssignedRecipe(d.recipe);
      } catch(e) {}
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [kitchenCode]);

  // Cleanup on unmount
  useEffect(() => () => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Waveform analyser
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const draw = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a,b) => a+b, 0) / data.length;
        setAmplitude(avg);
        animRef.current = requestAnimationFrame(draw);
      };
      draw();

      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.start();
      mediaRecorderRef.current = mr;
      setState("recording");
      setSeconds(0);
      setError(null);
      timerRef.current = setInterval(() => setSeconds(s => s+1), 1000);
    } catch(e) {
      setError("Microphone access denied");
    }
  };

  const stopAndSend = async () => {
    if(state !== "recording") return;
    clearInterval(timerRef.current);
    cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    setState("processing");

    mediaRecorderRef.current.onstop = async () => {
      try {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "voice.webm", { type: "audio/webm" });

        // Transcribe
        const result = await transcribeAudio(file);
        setTranscript(result.transcript);
        setItems(result.grocery_list);

        // Auto-send immediately
        await saveKitchenOrder(kitchenCode, result.grocery_list);
        setState("done");

        // Auto-reset after 5 seconds
        setTimeout(() => {
          setState("idle");
          setItems([]);
          setTranscript("");
        }, 5000);
      } catch(e) {
        setError("Something went wrong. Try again.");
        setState("idle");
      }
    };
    mediaRecorderRef.current.stop();
  };

  const fmt = s => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;

  // Pulse rings for recording animation
  const pulseSize = 200 + (amplitude / 255) * 80;

  return (
    <div style={{
      minHeight:"100vh", background: G.dark,
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"space-between",
      padding:"40px 24px 48px", position:"relative", overflow:"hidden",
    }}>
      {/* Animated background blobs */}
      <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden"}}>
        <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(197,168,128,0.04) 0%,transparent 70%)",top:"-20%",right:"-10%",animation:"blob1 10s ease-in-out infinite"}}/>
        <div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:"radial-gradient(circle,rgba(61,170,107,0.04) 0%,transparent 70%)",bottom:"-10%",left:"-5%",animation:"blob2 12s ease-in-out infinite"}}/>
      </div>

      {/* Header */}
      <div style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",zIndex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <img src="/logo.png" alt="KitchenAI" style={{width:32,height:32,filter:"drop-shadow(0 0 6px rgba(197,168,128,0.4))"}}/>
          <span style={{color:G.text,fontWeight:700,fontSize:15,letterSpacing:"-0.01em"}}>
            kitchen <span style={{background:G.goldGrad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>ai</span>
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {assignedRecipe && (
            <div style={{background:"rgba(61,170,107,0.15)",border:"1px solid rgba(61,170,107,0.3)",borderRadius:99,padding:"5px 12px",display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:10}}>🍳</span>
              <span style={{fontSize:11,color:G.green,fontWeight:600}}>{assignedRecipe.name}</span>
            </div>
          )}
          <button onClick={onExit} style={{
            background:"rgba(214,69,69,0.15)",border:"1px solid rgba(214,69,69,0.3)",
            color:"#f87171",borderRadius:8,padding:"6px 12px",
            fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
          }}>✕ Exit</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:32,zIndex:1,width:"100%"}}>

        {state === "idle" && (
          <>
            <div style={{textAlign:"center"}}>
              <p style={{fontSize:13,color:G.text2,margin:"0 0 6px",letterSpacing:"0.05em",textTransform:"uppercase"}}>
                {assignedRecipe ? `Today: ${assignedRecipe.name}` : "Ready to listen"}
              </p>
              <h1 style={{fontSize:28,fontWeight:700,color:G.text,margin:0,letterSpacing:"-0.02em"}}>
                Hold to speak
              </h1>
              <p style={{fontSize:14,color:G.text2,margin:"8px 0 0",lineHeight:1.5}}>
                Say what's missing in the kitchen
              </p>
            </div>

            {/* Big push-to-talk button */}
            <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <button
                onMouseDown={startRecording}
                onMouseUp={stopAndSend}
                onTouchStart={e=>{e.preventDefault();startRecording();}}
                onTouchEnd={e=>{e.preventDefault();stopAndSend();}}
                style={{
                  width:160,height:160,borderRadius:"50%",
                  background:G.goldGrad,
                  border:"none",cursor:"pointer",
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,
                  boxShadow:`0 0 0 16px rgba(197,168,128,0.08), 0 0 0 32px rgba(197,168,128,0.04), 0 8px 32px rgba(197,168,128,0.3)`,
                  transition:"transform 0.1s",
                  WebkitUserSelect:"none",
                  position:"relative",zIndex:1,
                }}
                onMouseDown={e=>{e.currentTarget.style.transform="scale(0.95)"; startRecording();}}
                onMouseUp={e=>{e.currentTarget.style.transform="scale(1)"; stopAndSend();}}
              >
                <span style={{fontSize:48}}>🎙️</span>
                <span style={{fontSize:12,fontWeight:700,color:"#1C1E21",letterSpacing:"0.06em",textTransform:"uppercase"}}>Hold</span>
              </button>
            </div>

            {error && (
              <p style={{fontSize:13,color:G.red,background:"rgba(214,69,69,0.1)",border:"1px solid rgba(214,69,69,0.2)",borderRadius:10,padding:"10px 16px",textAlign:"center"}}>{error}</p>
            )}
          </>
        )}

        {state === "recording" && (
          <>
            <div style={{textAlign:"center"}}>
              <p style={{fontSize:13,color:G.red,margin:"0 0 6px",letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600}}>● Recording</p>
              <p style={{fontSize:48,fontWeight:800,color:G.text,margin:0,fontVariantNumeric:"tabular-nums"}}>{fmt(seconds)}</p>
            </div>

            {/* Animated waveform rings */}
            <div style={{position:"relative",width:200,height:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
              {[1,2,3].map(i => (
                <div key={i} style={{
                  position:"absolute",
                  width: pulseSize * (0.6 + i*0.15),
                  height: pulseSize * (0.6 + i*0.15),
                  borderRadius:"50%",
                  border:`1px solid rgba(214,69,69,${0.4 - i*0.1})`,
                  transition:"all 0.05s",
                }}/>
              ))}
              <button
                onMouseUp={stopAndSend}
                onTouchEnd={e=>{e.preventDefault();stopAndSend();}}
                style={{
                  width:120,height:120,borderRadius:"50%",
                  background:"rgba(214,69,69,0.9)",
                  border:"none",cursor:"pointer",
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,
                  boxShadow:"0 4px 24px rgba(214,69,69,0.4)",
                  zIndex:1,
                }}
              >
                <span style={{fontSize:36}}>⏹</span>
                <span style={{fontSize:11,fontWeight:700,color:"#fff",letterSpacing:"0.06em"}}>Release</span>
              </button>
            </div>

            <p style={{fontSize:13,color:G.text2,textAlign:"center"}}>Release when done speaking</p>
          </>
        )}

        {state === "processing" && (
          <div style={{textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
            <div style={{width:64,height:64,border:`3px solid ${G.border}`,borderTop:`3px solid ${G.gold}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
            <div>
              <p style={{fontSize:16,fontWeight:600,color:G.text,margin:"0 0 6px"}}>Understanding...</p>
              <p style={{fontSize:13,color:G.text2,margin:0}}>Sending to your employer</p>
            </div>
          </div>
        )}

        {state === "done" && (
          <div style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:52,marginBottom:10}}>✅</div>
              <p style={{fontSize:18,fontWeight:700,color:G.text,margin:"0 0 4px"}}>Sent!</p>
              <p style={{fontSize:13,color:G.text2,margin:0}}>Your employer received the list</p>
            </div>

            {/* Items with emojis */}
            <div style={{width:"100%",display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center"}}>
              {items.map((item,i) => (
                <div key={i} style={{
                  background:G.card,border:`1px solid ${G.border}`,
                  borderRadius:14,padding:"12px 16px",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:4,
                  minWidth:90,
                }}>
                  <span style={{fontSize:32}}>{getEmoji(item.item)}</span>
                  <p style={{fontSize:12,fontWeight:600,color:G.text,margin:0,textTransform:"capitalize",textAlign:"center"}}>{item.item}</p>
                  <p style={{fontSize:11,color:G.text2,margin:0}}>{item.quantity}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom: recipe pill if assigned */}
      {assignedRecipe && state === "idle" && (
        <div style={{
          width:"100%",background:G.card,border:`1px solid ${G.border}`,
          borderRadius:16,padding:"16px 20px",zIndex:1,
          display:"flex",alignItems:"center",gap:14,
        }}>
          <div style={{width:44,height:44,background:"linear-gradient(135deg,#ff0000,#cc0000)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{color:"#fff",fontSize:18}}>▶</span>
          </div>
          <div style={{flex:1}}>
            <p style={{fontSize:11,color:G.gold,fontWeight:600,margin:"0 0 2px",textTransform:"uppercase",letterSpacing:"0.06em"}}>Cook today</p>
            <p style={{fontSize:15,fontWeight:700,color:G.text,margin:0}}>{assignedRecipe.name}</p>
          </div>
          {assignedRecipe.youtube_url && (
            <a href={assignedRecipe.youtube_url} target="_blank" rel="noreferrer" style={{
              background:G.goldGrad,border:"none",borderRadius:10,padding:"8px 14px",
              color:"#1C1E21",fontWeight:700,fontSize:12,cursor:"pointer",
              fontFamily:"inherit",textDecoration:"none",flexShrink:0,
            }}>Watch →</a>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blob1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-15px)} }
        @keyframes blob2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-15px,20px)} }
      `}</style>
    </div>
  );
}
