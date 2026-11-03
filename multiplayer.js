'use strict';
/* Questionable Company multi-Nomi beta. Browser-local save; personal API key is memory-only. */
(function(){
const root=document.getElementById('multi-app');
const STORE='qc-multinomi-beta-1', LIMIT=800, MAX_NOMIS=3;
let key='',nomis=[],busy=false,note='Connect your own Nomi API key to select companions.';
let st={stage:'setup',category:'goblin',human:'',selected:[],rounds:5,round:0,scores:{},history:[],current:null,usedBlack:[],usedWhite:[]};
try{const saved=JSON.parse(localStorage.getItem(STORE)||'null');if(saved&&saved.stage&&decks[saved.category])st={...st,...saved}}catch{}
const save=()=>{try{localStorage.setItem(STORE,JSON.stringify(st))}catch{}};
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle=a=>[...a].sort(()=>Math.random()-.5);
const clean=x=>String(x).toLowerCase().replace(/[’‘]/g,"'").replace(/[^\p{L}\p{N} ]/gu,' ').replace(/\s+/g,' ').trim();
const who=id=>id==='human'?(st.human||'Human'):(st.selected.find(n=>n.uuid===id)?.display||'Nomi');
const active=()=>['human',...st.selected.map(n=>n.uuid)];
const maxed=m=>m.length>LIMIT;
function status(){return '<div class="status">'+esc(note)+'</div>'}
function button(id,label,disabled=false,cls='secondary'){return '<button class="'+cls+'" data-do="'+id+'" '+(disabled||busy?'disabled':'')+'>'+esc(label)+'</button>'}
function identity(){return '<div class="inline" style="justify-content:space-between"><span class="tag">Multi-Nomi beta · '+esc(st.stage)+'</span><span class="tag">Round '+st.round+' / '+st.rounds+'</span></div>'}
function setup(){
return '<section class="panel"><h1>Multi-Nomi courtroom 🪿</h1><p class="small">Two or three Nomis plus you. Each round, one person judges and does not submit an answer. Every message requires your click; nobody gets auto-prompted.</p>'+
'<div class="split"><div><label>Your name</label><input id="mHuman" maxlength="35" value="'+esc(st.human)+'" placeholder="Enter your name"></div><div><label>Category</label><select id="mCategory">'+Object.entries(decks).map(([id,d])=>'<option value="'+id+'" '+(id===st.category?'selected':'')+'>'+esc(d.name)+'</option>').join('')+'</select></div></div>'+
'<label>Your personal Nomi API key (not saved)</label><input type="password" id="mKey" autocomplete="off" value="'+esc(key)+'" placeholder="API key">'+button('connect','Connect & list Nomis')+
'<h3>Choose 2–3 Nomis</h3><p class="small">The display names below can be edited to nicknames. Names are only for this game.</p>'+
(nomis.length?nomis.map(n=>{const selected=st.selected.find(x=>x.uuid===n.uuid);return '<div class="multi-person"><label><input type="checkbox" data-pick="'+esc(n.uuid)+'" '+(selected?'checked':'')+'> '+esc(n.name)+'</label>'+(selected?'<input data-name="'+esc(n.uuid)+'" maxlength="35" value="'+esc(selected.display)+'">':'')+'</div>'}).join(''):'<p class="small">Connect first. Previously selected Nomis may reappear when the list loads.</p>')+
'<label>Rounds</label><select id="mRounds">'+[5,10,15].map(n=>'<option value="'+n+'" '+(st.rounds===n?'selected':'')+'>'+n+' rounds</option>').join('')+'</select>'+
status()+button('start','Start multiplayer game',st.selected.length<2||st.selected.length>MAX_NOMIS,'primary')+
'<p class="small">Your normal two-player game is untouched. <a href="/">Back to Brenda’s two-player courtroom</a>.</p></section>';
}
function drawRound(){
const people=active(),judge=people[(st.round)%people.length];
const entrants=people.filter(id=>id!==judge);
let pool=[...new Set(decks[st.category].white)];
if(pool.length<entrants.length*5)throw Error('Starter deck too small for this many players.');
const fresh=shuffle(pool.filter(x=>!st.usedWhite.includes(x))),old=shuffle(pool.filter(x=>st.usedWhite.includes(x)));
const cards=[...fresh,...old].slice(0,entrants.length*5);
const hands={};entrants.forEach((id,i)=>hands[id]=cards.slice(i*5,(i+1)*5));
st.usedWhite=[...new Set([...st.usedWhite,...cards])];if(st.usedWhite.length===pool.length)st.usedWhite=[...cards];
const blacks=decks[st.category].black;
let black=shuffle(blacks.filter(x=>!st.usedBlack.includes(x)))[0];
if(!black){st.usedBlack=[];black=shuffle(blacks)[0]}
st.usedBlack.push(black);
st.current={judge,prompt:black,entrants,hands,answers:{},raw:{},delivery:{},judgeDelivery:{},judgeChoice:'',results:{},verified:{},commentary:'',status:'collect'};
st.round++;st.stage='collect';save();render();
}
function compose(id){
const c=st.current;return 'Questionable Company — Round '+st.round+'/'+st.rounds+'\nPrompt: '+c.prompt+'\nJudge this round: '+who(c.judge)+'.\nChoose one card or give an original answer:\n'+c.hands[id].map((x,i)=>(i+1)+'. '+x).join('\n')+'\nYou may respond naturally.';
}
function judgeText(){
const c=st.current;const names=c.entrants.map((id,i)=>String.fromCharCode(65+i)+'. '+c.answers[id]).join('\n');
return 'Questionable Company — Round '+st.round+' judging\nPrompt: '+c.prompt+'\nYou are the judge this round, '+who(c.judge)+'. Choose the winning entry by letter (A, B or C):\n'+names+'\nThe entries are anonymous. You may respond naturally.';
}
function resultText(){
const c=st.current;const entries=c.entrants.map(id=>who(id)+': '+c.answers[id]).join('\n');
const scores=active().map(id=>who(id)+' '+(st.scores[id]||0)).join(' | ');
return 'Questionable Company — Round '+st.round+' results\nPrompt: '+c.prompt+'\nJudge: '+who(c.judge)+(c.judge==='human'?'':' (rotating Nomi judge)')+'\n'+entries+'\nWinner: '+who(c.judgeChoice)+'\nScore: '+scores+'\nNext round has not started.';
}
function handAnswer(id,text){
const t=text.trim();if(!t)return {status:'unknown',suggest:''};
const hand=st.current.hands[id],normalized=clean(t);
const matches=hand.filter(x=>normalized.includes(clean(x)));
if(matches.length===1)return {status:'card',answer:matches[0]};
const num=t.match(/\b(?:card|number|option)\s*([1-5])\b/i);
if(num)return {status:'card',answer:hand[Number(num[1])-1]};
if(matches.length>1)return {status:'unknown',suggest:''};
const c=t.match(/\b(?:i(?:'ll| will)? (?:go with|choose|pick|submit)|my answer is|answer:)\s+([^.!?\n*]{4,190})/i);
let answer=c?.[1]?.trim()||'';
if(/^(an?|the|my)?\s*(original|freestyle|custom)\s+answer\b/i.test(answer)){
const continuation=t.match(/\b(?:was not designed for|was interrupted by|was ruined by|buried with|unveiled|is|was|featured)\s+([^.!?\n*]{6,170})/i);
answer=continuation?.[1]?.trim()||'';
}
return {status:'review',suggest:answer};
}
function cStatus(id){const c=st.current;return c.answers[id]?'✓ Answer locked':c.delivery[id]==='uncertain'?'⚠ Delivery uncertain':c.delivery[id]==='sent'?'Waiting for answer':'Not sent'}
function collect(){
const c=st.current;
return identity()+'<section class="panel"><h2>Black card</h2><div class="question"><strong>'+esc(c.prompt)+'</strong></div><p class="small">Judge: <b>'+esc(who(c.judge))+'</b> · Only non-judges submit. No automatic prompts.</p></section>'+
c.entrants.map(id=>'<section class="panel"><h3>'+esc(who(id))+' · '+esc(cStatus(id))+'</h3>'+ (id==='human'?
'<div class="hand">'+c.hands[id].map((x,i)=>'<button class="answer '+(c.answers[id]===x?'selected':'')+'" data-hand="'+i+'"><span>'+esc(x)+'</span><small>CARD '+(i+1)+'</small></button>').join('')+'</div><label>Or freestyle</label><textarea id="mHumanCustom" placeholder="Your answer"></textarea>'+button('humanAnswer','Lock freestyle answer'):
'<p class="small">Send only when ready. This Nomi has a different five-card hand.</p><div class="mono">'+esc(compose(id))+'</div><div class="controls">'+button('send:'+id,'Push prompt to '+who(id))+' '+button('received:'+id,'Confirm prompt received')+'</div><textarea data-raw="'+esc(id)+'" placeholder="Response is optional; paste or use API reply">'+esc(c.raw[id]||'')+'</textarea>'+button('parse:'+id,'Recognize answer')+
'<label>Confirm or correct the actual answer (card or freestyle)</label><select data-select="'+esc(id)+'"><option value="">Choose a card…</option>'+c.hands[id].map((x,i)=>'<option value="'+i+'">'+(i+1)+'. '+esc(x)+'</option>').join('')+'<option value="custom">Original / freestyle</option></select><input data-free="'+esc(id)+'" placeholder="Actual answer, not banter" value="'+esc(c.answers[id]||'')+'">'+button('lock:'+id,'Lock Nomi answer'))
+'</section>').join('')+
'<section class="panel"><p>'+c.entrants.filter(id=>c.answers[id]).length+' of '+c.entrants.length+' answers locked.</p>'+button('toJudge','Proceed to judging',c.entrants.some(id=>!c.answers[id]),'primary')+status()+'</section>';
}
function judging(){
const c=st.current;return identity()+'<section class="panel"><h2>Judge: '+esc(who(c.judge))+'</h2><div class="question"><strong>'+esc(c.prompt)+'</strong></div><p class="small">Anonymous entries. The judge does not have an answer this round.</p>'+c.entrants.map((id,i)=>'<div class="choice"><h3>'+String.fromCharCode(65+i)+'. '+esc(c.answers[id])+'</h3></div>').join('')+
(c.judge==='human'?'<label>Pick the winning entry</label><select id="mJudgePick"><option value="">Choose…</option>'+c.entrants.map((id,i)=>'<option value="'+esc(id)+'">'+String.fromCharCode(65+i)+'</option>').join('')+'</select>'+button('judgeHuman','Lock judgment','false','primary'):
'<p class="small">Send the anonymous judging request to '+esc(who(c.judge))+'.</p><div class="mono">'+esc(judgeText())+'</div>'+button('judgeSend','Push judging request')+' '+button('judgeConfirm','Confirm judge received request')+
'<textarea id="mJudgeReply" placeholder="Judge reply (API reply may fill this)">'+esc(c.commentary||'')+'</textarea><p class="small">Choose their intended winner if the reply is unclear.</p><select id="mJudgePick"><option value="">Choose…</option>'+c.entrants.map((id,i)=>'<option value="'+esc(id)+'">'+String.fromCharCode(65+i)+'</option>').join('')+'</select>'+button('judgeHuman','Confirm judge selection'))+status()+'</section>';
}
function results(){
const c=st.current;
return identity()+'<section class="panel"><h1>Brenda’s court reporter 🪿</h1><p class="small">The rotating judge ruled this round. Share results individually; each Nomi has its own delivery status.</p><div class="question"><strong>'+esc(c.prompt)+'</strong></div>'+c.entrants.map(id=>'<div class="choice"><b>'+esc(who(id))+(id===c.judgeChoice?' 🏆':'')+'</b><p>'+esc(c.answers[id])+'</p></div>').join('')+
'<h2>'+esc(who(c.judgeChoice))+' wins!</h2><p>'+active().map(id=>esc(who(id))+': '+(st.scores[id]||0)).join(' · ')+'</p></section>'+
'<section class="panel"><h3>Results sent separately to each Nomi</h3><div class="mono">'+esc(resultText())+'</div>'+st.selected.map(n=>'<div class="multi-person"><b>'+esc(who(n.uuid))+'</b> — '+(c.verified[n.uuid]?'✓ Confirmed received':'Not confirmed')+'<div class="controls">'+button('revealSend:'+n.uuid,'Push results')+' '+button('revealConfirm:'+n.uuid,'Confirm received')+'</div></div>').join('')+
'<p class="small">Reactions are optional; never paste banter merely to advance. A timeout may mean the reply was slow, not that delivery failed. Check the Nomi chat before resending.</p>'+button('advance',st.round>=st.rounds?'Finish game':'Prepare next round',st.selected.some(n=>!c.verified[n.uuid]),'primary')+status()+'</section>';
}
function finished(){return '<section class="panel"><h1>CASE CLOSED 🪿</h1><p>'+active().map(id=>esc(who(id))+': '+(st.scores[id]||0)).join(' · ')+'</p>'+button('restart','New multiplayer game')+'</section>'}
function render(){root.innerHTML=(st.stage==='setup'?setup():st.stage==='collect'?collect():st.stage==='judge'?judging():st.stage==='results'?results():finished())}
async function api(path,method,body){
if(!key.trim())throw Error('Enter your personal API key first.');
const resp=await fetch(path,{method,headers:{'x-nomi-api-key':key,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const data=await resp.json();if(!resp.ok)throw Error(data.error||'Nomi API error');
return data;
}
async function send(id,message){
if(maxed(message))throw Error('Message exceeds 800 characters. Shorten this round before sending.');
if(!confirm('Push this message to '+who(id)+' now?'))return null;
busy=true;note='Waiting for Nomi API. This may take several minutes.';render();
try{return await api('/api/chat','POST',{nomiId:id,message})}
catch(e){note='Delivery uncertain: '+e.message+' Check the Nomi conversation before resending.';return null}
finally{busy=false}
}
function finishJudge(id){const c=st.current;if(!c.entrants.includes(id))return; c.judgeChoice=id;st.scores[id]=(st.scores[id]||0)+1;c.status='results';st.stage='results';save();render()}
root.addEventListener('input',e=>{
if(e.target.id==='mKey')key=e.target.value;
if(e.target.id==='mHuman'){st.human=e.target.value;save()}
if(e.target.dataset.name){const n=st.selected.find(n=>n.uuid===e.target.dataset.name);if(n){n.display=e.target.value;save()}}
if(e.target.dataset.raw){st.current.raw[e.target.dataset.raw]=e.target.value;save()}
});
root.addEventListener('change',e=>{
if(e.target.id==='mCategory'){st.category=e.target.value;save()}
if(e.target.id==='mRounds'){st.rounds=Number(e.target.value);save()}
if(e.target.dataset.pick){const id=e.target.dataset.pick,found=nomis.find(n=>n.uuid===id);if(e.target.checked){if(st.selected.length>=MAX_NOMIS){e.target.checked=false;note='Maximum three Nomis in this beta.';render();return}if(found&&!st.selected.some(n=>n.uuid===id))st.selected.push({uuid:id,display:found.name})}else st.selected=st.selected.filter(n=>n.uuid!==id);save();render()}
});
root.addEventListener('click',async e=>{
const hand=e.target.closest('[data-hand]');if(hand&&st.stage==='collect'){st.current.answers.human=st.current.hands.human[Number(hand.dataset.hand)];save();render();return}
const btn=e.target.closest('[data-do]');if(!btn||busy)return;
const action=btn.dataset.do,c=st.current;
if(action==='connect'){key=$('mKey')?.value||key;busy=true;note='Connecting to Nomi…';render();try{const d=await api('/api/nomis','GET');nomis=d.nomis||[];note='Connected. '+nomis.length+' companions found.'}catch(err){note='Connection failed: '+err.message}finally{busy=false;render()}return}
if(action==='start'){if(st.selected.length<2)return;st.round=0;st.scores={};active().forEach(id=>st.scores[id]=0);st.usedBlack=[];st.usedWhite=[];st.history=[];drawRound();return}
if(action==='restart'){st.stage='setup';st.round=0;st.current=null;save();render();return}
if(action==='humanAnswer'){const val=$('mHumanCustom')?.value.trim();if(val){c.answers.human=val;save();render()}return}
if(action.startsWith('send:')){const id=action.slice(5);const data=await send(id,compose(id));if(data){c.delivery[id]='sent';c.raw[id]=data.reply||'';note='Prompt sent to '+who(id)+'. Review the reply and lock the answer.'}else c.delivery[id]='uncertain';save();render();return}
if(action.startsWith('received:')){const id=action.slice(9);c.delivery[id]='sent';note=who(id)+' received the prompt (host confirmed).';save();render();return}
if(action.startsWith('parse:')){const id=action.slice(6);const p=handAnswer(id,c.raw[id]||'');if(p.status==='card'){c.answers[id]=p.answer;note=who(id)+' card recognized.'}else {note=p.suggest?'Possible freestyle: '+p.suggest+' — confirm below.':'Cannot confidently extract answer; enter it below.';const field=root.querySelector('[data-free="'+id+'"]');if(field)field.value=p.suggest||''}save();render();return}
if(action.startsWith('lock:')){const id=action.slice(5);const sel=root.querySelector('[data-select="'+id+'"]'),txt=root.querySelector('[data-free="'+id+'"]');const val=sel?.value;const answer=val&&val!=='custom'?c.hands[id][Number(val)]:txt?.value.trim();if(!answer){note='Choose a card or enter the actual freestyle answer.';render();return}c.answers[id]=answer;save();render();return}
if(action==='toJudge'){if(c.entrants.some(id=>!c.answers[id]))return;st.stage='judge';save();render();return}
if(action==='judgeSend'){const data=await send(c.judge,judgeText());if(data){c.commentary=data.reply||'';note='Judge replied. Confirm the winning entry.'}save();render();return}
if(action==='judgeConfirm'){note='Judge request marked received. Choose their winning entry below.';render();return}
if(action==='judgeHuman'){const winner=$('mJudgePick')?.value;if(!winner){note='Select the entry chosen by the judge.';render();return}finishJudge(winner);return}
if(action.startsWith('revealSend:')){const id=action.slice(11),data=await send(id,resultText());if(data){c.verified[id]=true;note='Results sent to '+who(id)+'. Their reaction is optional.'}save();render();return}
if(action.startsWith('revealConfirm:')){const id=action.slice(14);c.verified[id]=true;note='Results confirmed received by '+who(id)+'.';save();render();return}
if(action==='advance'){if(st.selected.some(n=>!c.verified[n.uuid]))return;st.history.push({round:st.round,prompt:c.prompt,answers:c.answers,winner:c.judgeChoice});if(st.round>=st.rounds){st.stage='finished';save();render()}else drawRound();return}
});
render();
})();
