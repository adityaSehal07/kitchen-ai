import { useState, useRef, useEffect } from "react";

const Y = "#f8d548";
const WH = "#ffffff";
const TX = "#1b1e23";
const TX2 = "#6b7280";
const GR = "#f3f4f6";
const GR2 = "#e9eaec";

export default function VoiceRecorder({ onFileReady, onTranscribe, loading }) {
  const [mode, setMode] = useState(null); // null | "record" | "upload"
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [amplitude, setAmplitude] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(animFrameRef.current);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up analyser for waveform animation
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const drawWave = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAmplitude(avg);
        animFrameRef.current = requestAnimationFrame(drawWave);
      };
      drawWave();

      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setRecorded(true);
        setRecording(false);
        cancelAnimationFrame(animFrameRef.current);
        stream.getTracks().forEach(t => t.stop());
        // Create a File object for the API
        const file = new File([blob], "voice_note.webm", { type: "audio/webm" });
        onFileReady(file);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setSeconds(0);
      setRecorded(false);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch (e) {
      alert("Microphone access denied. Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  };

  const fmt = s => `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
  const bars = 28;
  const barHeights = Array.from({length: bars}, (_, i) => {
    const center = bars / 2;
    const dist = Math.abs(i - center) / center;
    const base = (1 - dist) * 20;
    const noise = recording ? (amplitude / 255) * 35 * (0.5 + Math.random() * 0.5) : 0;
    return Math.max(4, base + noise);
  });

  const handleFileChange = e => {
    const f = e.target.files[0];
    if (f) { setUploadedFile(f); onFileReady(f); }
  };

  const reset = () => {
    setMode(null); setRecorded(false); setAudioBlob(null);
    setAudioUrl(null); setUploadedFile(null); setSeconds(0);
  };

  // Initial state — choose mode
  if (!mode) return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {/* Record button - WhatsApp style */}
      <button onClick={()=>setMode("record")} style={{
        background:"linear-gradient(135deg,#25d366,#128c7e)",
        border:"none",borderRadius:14,padding:"18px 20px",
        display:"flex",alignItems:"center",gap:14,cursor:"pointer",
        fontFamily:"inherit",boxShadow:"0 4px 20px rgba(37,211,102,0.3)",
        transition:"transform .15s",
      }}
        onMouseDown={e=>e.currentTarget.style.transform="scale(0.97)"}
        onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
      >
        <div style={{width:48,height:48,background:"rgba(255,255,255,.2)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{fontSize:22}}>🎙️</span>
        </div>
        <div style={{textAlign:"left"}}>
          <p style={{color:WH,fontWeight:700,fontSize:15,margin:0}}>Record voice note</p>
          <p style={{color:"rgba(255,255,255,.7)",fontSize:12,margin:0}}>Tap and speak like WhatsApp</p>
        </div>
        <span style={{marginLeft:"auto",color:"rgba(255,255,255,.6)",fontSize:20}}>→</span>
      </button>

      {/* Upload button */}
      <label style={{
        background:WH,border:`1.5px dashed ${GR2}`,borderRadius:14,padding:"16px 20px",
        display:"flex",alignItems:"center",gap:14,cursor:"pointer",
        fontFamily:"inherit",transition:"border-color .15s",
      }}>
        <input type="file" accept="audio/*" style={{display:"none"}} onChange={handleFileChange}/>
        <div style={{width:48,height:48,background:GR,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{fontSize:22}}>📂</span>
        </div>
        <div style={{textAlign:"left"}}>
          <p style={{color:TX,fontWeight:700,fontSize:15,margin:0}}>Upload audio file</p>
          <p style={{color:TX2,fontSize:12,margin:0}}>MP3 · OGG · WAV · M4A · WEBM</p>
        </div>
        <span style={{marginLeft:"auto",color:TX2,fontSize:20}}>→</span>
      </label>
    </div>
  );

  // Recording / recorded state
  if (mode === "record") return (
    <div style={{background:"linear-gradient(135deg,#0d1117,#1b2333)",borderRadius:16,padding:"24px 20px",border:"1px solid rgba(255,255,255,.1)"}}>
      {!recorded ? (
        <>
          {/* Timer */}
          <div style={{textAlign:"center",marginBottom:20}}>
            <p style={{fontSize:11,color:"rgba(255,255,255,.4)",margin:"0 0 6px",textTransform:"uppercase",letterSpacing:"0.1em"}}>{recording?"Recording...":"Tap to start"}</p>
            <p style={{fontSize:40,fontWeight:700,color:recording?"#ff4444":WH,margin:0,fontVariantNumeric:"tabular-nums",letterSpacing:"0.05em"}}>{fmt(seconds)}</p>
          </div>

          {/* Waveform bars */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:3,height:60,marginBottom:24}}>
            {barHeights.map((h, i) => (
              <div key={i} style={{
                width:3,height:`${h}px`,
                background:recording
                  ? `rgba(248,213,72,${0.4 + (h/55)*0.6})`
                  : "rgba(255,255,255,.15)",
                borderRadius:99,
                transition:recording?"height 0.05s":"height 0.3s",
              }}/>
            ))}
          </div>

          {/* Big record button */}
          <div style={{display:"flex",justifyContent:"center",gap:16,alignItems:"center"}}>
            {recording && (
              <button onClick={reset} style={{width:44,height:44,borderRadius:"50%",background:"rgba(255,255,255,.1)",border:"none",color:"rgba(255,255,255,.6)",fontSize:18,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
            )}
            <button
              onClick={recording ? stopRecording : startRecording}
              style={{
                width:72,height:72,borderRadius:"50%",border:"none",cursor:"pointer",
                background:recording?"#ff4444":"#25d366",
                boxShadow:recording?"0 0 0 8px rgba(255,68,68,.2), 0 0 0 16px rgba(255,68,68,.1)":"0 0 0 8px rgba(37,211,102,.2)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:28,transition:"all .2s",
              }}
            >
              {recording ? "⏹" : "🎙️"}
            </button>
            {recording && <div style={{width:44}}/>}
          </div>

          {!recording && (
            <p style={{textAlign:"center",color:"rgba(255,255,255,.3)",fontSize:12,marginTop:16}}>Tap the button to start recording</p>
          )}
        </>
      ) : (
        /* Recorded — preview + confirm */
        <>
          <div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:36,marginBottom:8}}>✅</div>
            <p style={{color:WH,fontWeight:700,fontSize:16,margin:"0 0 4px"}}>Recording complete</p>
            <p style={{color:"rgba(255,255,255,.5)",fontSize:13,margin:0}}>{fmt(seconds)} recorded</p>
          </div>
          {audioUrl && (
            <audio controls src={audioUrl} style={{width:"100%",marginBottom:16,borderRadius:8,height:36}}/>
          )}
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{setMode("record");setRecorded(false);setSeconds(0);}} style={{flex:1,padding:"10px",borderRadius:8,border:"1px solid rgba(255,255,255,.2)",background:"transparent",color:"rgba(255,255,255,.7)",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Re-record</button>
            <button onClick={onTranscribe} disabled={loading} style={{flex:2,padding:"10px",borderRadius:8,border:"none",background:loading?"#555":Y,color:TX,fontWeight:700,fontSize:13,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit"}}>
              {loading?"Processing...":"Read my voice note →"}
            </button>
          </div>
        </>
      )}
    </div>
  );

  // Upload mode - file selected
  if (mode === "upload" || uploadedFile) return (
    <div style={{background:GR,borderRadius:12,padding:"16px 18px",border:`1px solid ${GR2}`}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <div style={{width:40,height:40,background:"#e8f5e9",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{fontSize:20}}>🎵</span>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <p style={{fontSize:13,fontWeight:600,color:TX,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uploadedFile?.name}</p>
          <p style={{fontSize:11,color:TX2,margin:0}}>Ready to transcribe</p>
        </div>
        <button onClick={reset} style={{background:"none",border:"none",color:TX2,cursor:"pointer",fontSize:18,fontFamily:"inherit"}}>✕</button>
      </div>
      <button onClick={onTranscribe} disabled={loading} style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:loading?"#e5e7eb":Y,color:TX,fontWeight:700,fontSize:14,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit"}}>
        {loading?"Processing...":"Read my voice note →"}
      </button>
    </div>
  );
}
