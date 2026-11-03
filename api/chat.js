function authorize(req,res){
  const key=req.headers['x-nomi-api-key'];
  if(typeof key!=='string'||!key.trim()||key.length>512||/[\r\n]/.test(key)){
    res.status(401).json({error:'Enter your personal Nomi API key in game settings.'});return null;
  }
  const origin=req.headers.origin;
  if(origin){try{const u=new URL(origin);const host=req.headers.host;if(u.host!==host){res.status(403).json({error:'Cross-origin request rejected'});return null;}}catch{res.status(403).json({error:'Invalid origin'});return null;}}
  return key;
}
export default async function handler(req,res){res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});const nomiKey=authorize(req,res);if(!nomiKey)return;const {nomiId,message}=req.body||{};if(typeof nomiId!=='string'||! /^[0-9a-f-]{36}$/i.test(nomiId))return res.status(400).json({error:'Invalid Nomi ID'});if(typeof message!=='string'||!message.trim()||message.length>800)return res.status(400).json({error:'Message must be between 1 and 800 characters'});try{const r=await fetch(`https://api.nomi.ai/v1/nomis/${encodeURIComponent(nomiId)}/chat`,{method:'POST',headers:{Authorization:nomiKey,'Content-Type':'application/json'},body:JSON.stringify({messageText:message}),signal:AbortSignal.timeout(295000)});const data=await r.json();if(!r.ok)return res.status(r.status).json({error:data?.error?.type||'Nomi message failed'});return res.status(200).json({reply:data.replyMessage?.text||'',sent:!!data.sentMessage});}catch(e){return res.status(502).json({error:'Nomi request timed out or failed; delivery may be uncertain. Check chat before retrying.'});}}