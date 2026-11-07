const express=require("express");
const path=require("path");
const app=express();
const PORT=process.env.PORT||3000;
const UNLOCK_AT=Date.parse("2026-11-07T19:54:00-03:00");
const PLAYLIST_URL=process.env.PLAYLIST_URL;

app.disable("x-powered-by");
app.use(express.static(path.join(__dirname,"public")));

app.get("/api/unlock",(req,res)=>{
  res.set("Cache-Control","no-store, no-cache, must-revalidate, private");
  res.set("Pragma","no-cache");
  const now=Date.now();
  if(now<UNLOCK_AT) return res.json({unlocked:false,remainingMs:UNLOCK_AT-now});
  if(!PLAYLIST_URL) return res.status(503).json({unlocked:false,error:"A playlist ainda não foi configurada."});
  return res.json({unlocked:true,url:PLAYLIST_URL});
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,"0.0.0.0",()=>console.log("Surpresa musical disponível na porta "+PORT));
