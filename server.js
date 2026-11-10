const express=require("express");
const path=require("path");
const crypto=require("crypto");
const app=express();
const PORT=process.env.PORT||3000;
const UNLOCK_AT=Date.parse("2026-11-07T19:54:00-03:00");
const PLAYLIST_URL=process.env.PLAYLIST_URL;
const PORTAL_PASSWORD=process.env.PORTAL_PASSWORD||"";
const SESSION_SECRET=process.env.SESSION_SECRET||"";
const VIDEO_URL=process.env.VIDEO_URL||"";

app.disable("x-powered-by");
app.use(express.json({limit:"10kb"}));
app.use(express.static(path.join(__dirname,"public")));

function sign(value){return crypto.createHmac("sha256",SESSION_SECRET).update(value).digest("hex");}
function hasPortalAccess(req){
  if(!SESSION_SECRET||!PORTAL_PASSWORD) return false;
  const raw=req.headers.cookie||"";
  const match=raw.match(/(?:^|; )azul_session=([^;]+)/);
  if(!match) return false;
  const [expires,mac]=decodeURIComponent(match[1]).split(".");
  if(!expires||!mac||Number(expires)<Date.now()) return false;
  const expected=sign(expires);
  return mac.length===expected.length&&crypto.timingSafeEqual(Buffer.from(mac),Buffer.from(expected));
}
function requirePortal(req,res,next){if(!hasPortalAccess(req))return res.status(401).json({error:"Acesso não autorizado."});next();}

app.post("/api/azul/login",(req,res)=>{
  const submitted=String(req.body?.password||"");
  if(!PORTAL_PASSWORD||!SESSION_SECRET)return res.status(503).json({error:"O portal ainda está sendo configurado."});
  const a=Buffer.from(submitted),b=Buffer.from(PORTAL_PASSWORD);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b)){console.log("AZUL_EVENT "+JSON.stringify({event:"login_failed",at:new Date().toISOString()}));return res.status(401).json({error:"Essa cor não abriu a porta. Tente novamente."});}
  console.log("AZUL_EVENT "+JSON.stringify({event:"login_success",at:new Date().toISOString()}));
  const expires=String(Date.now()+12*60*60*1000);
  const token=expires+"."+sign(expires);
  res.setHeader("Set-Cookie","azul_session="+encodeURIComponent(token)+"; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200");
  res.json({ok:true});
});
app.get("/api/azul/session",(req,res)=>res.json({authenticated:hasPortalAccess(req)}));
app.post("/api/azul/event",requirePortal,(req,res)=>{const allowed=["page_open","video_play"];const event=String(req.body?.event||"");if(!allowed.includes(event))return res.status(400).json({ok:false});console.log("AZUL_EVENT "+JSON.stringify({event,at:new Date().toISOString()}));res.json({ok:true});});
app.get("/api/azul/video",requirePortal,async(req,res)=>{
  if(!VIDEO_URL)return res.status(503).send("O vídeo ainda está sendo conectado ao portal.");
  try{
    const headers={};
    if(req.headers.range)headers.Range=req.headers.range;
    const upstream=await fetch(VIDEO_URL,{headers,redirect:"follow"});
    if(!upstream.ok&&upstream.status!==206)return res.status(502).send("Não foi possível carregar o vídeo.");
    res.status(upstream.status);
    for(const h of ["content-type","content-length","content-range","accept-ranges"])if(upstream.headers.get(h))res.setHeader(h,upstream.headers.get(h));
    res.setHeader("Cache-Control","private, no-store");
    if(!upstream.body)return res.end();
    const {Readable}=require("stream");
    Readable.fromWeb(upstream.body).pipe(res);
  }catch(e){res.status(502).send("Falha ao buscar o vídeo.");}
});
app.get("/api/unlock",(req,res)=>{
  res.set("Cache-Control","no-store, no-cache, must-revalidate, private");
  const now=Date.now();
  if(now<UNLOCK_AT)return res.json({unlocked:false,remainingMs:UNLOCK_AT-now});
  if(!PLAYLIST_URL)return res.status(503).json({unlocked:false,error:"A playlist ainda não foi configurada."});
  res.json({unlocked:true,url:PLAYLIST_URL});
});
app.get("/azul",(req,res)=>res.sendFile(path.join(__dirname,"public","azul.html")));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,"0.0.0.0",()=>console.log("Portal disponível na porta "+PORT));
