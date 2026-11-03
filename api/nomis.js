function authorize(req,res){
  const key=req.headers['x-nomi-api-key'];
  if(typeof key!=='string'||!key.trim()||key.length>512||/[\r\n]/.test(key)){
    res.status(401).json({error:'Enter your personal Nomi API key in game settings.'});return null;
  }
  const origin=req.headers.origin;
  if(origin){try{const u=new URL(origin);const host=req.headers.host;if(u.host!==host){res.status(403).json({error:'Cross-origin request rejected'});return null;}}catch{res.status(403).json({error:'Invalid origin'});return null;}}
  return key;
}
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});const nomiKey=authorize(req,res);if(!nomiKey)return;try{const r=await fetch('https://api.nomi.ai/v1/nomis',{headers:{Authorization:nomiKey},signal:AbortSignal.timeout(25000)});const data=await r.json();if(!r.ok)return res.status(r.status).json({error:data?.error?.type||'Nomi API request failed'});return res.status(200).json({nomis:(data.nomis||[]).map(({uuid,name})=>({uuid,name}))});}catch(e){return res.status(502).json({error:'Could not reach Nomi API'});}}