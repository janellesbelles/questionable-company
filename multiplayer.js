'use strict';
/* Questionable Company multi-Nomi beta. Browser-local save; personal API key is memory-only. */
(function(){
const root=document.getElementById('multi-app');
const STORE='qc-multinomi-beta-1', LIMIT=800, MAX_NOMIS=5;
const EXTRA_CARDS={
mild:["A raccoon carrying a tiny briefcase.","A deeply suspicious inflatable flamingo.","The world's least qualified magician.","A committee of frogs in business casual.","A goose demanding a written apology.","A birthday cake with legal representation.","A tiny parade of disgruntled snails.","A motivational speech from a potato.","An office plant with a secret identity.","A very nervous cardboard astronaut."],
spicy:["An ex presenting a 90-slide breakup analysis.","A disastrous surprise honeymoon itinerary.","A karaoke duet with a former nemesis.","An apology bouquet made of expired coupons.","A romantic getaway sponsored by bad decisions.","A breakup text delivered by marching band.","A dating profile written by an accountant.","A candlelit dinner with an HR representative.","A very suggestive PowerPoint transition.","A failed attempt at seductive ventriloquism."],
goblin:["A cursed air fryer whispering family secrets.","A phantom accountant demanding back taxes.","A skeleton applying for emotional damages.","An extremely judgmental funeral director.","A wedding cake full of old grudges.","A haunted lawn chair with unresolved trauma.","A vampire who fainted at a blood drive.","A demon stuck on hold with customer service.","A tiny cryptid with a restraining order.","A possessed printer producing obituaries."],
romance:["A handwritten love letter from the tax office.","A blind date arranged by a spiteful ghost.","A bouquet of deeply judgmental roses.","An anniversary dinner interrupted by raccoons.","A marriage proposal delivered by carrier pigeon.","A romantic picnic in a haunted parking lot.","A secret admirer who sends invoices.","A wedding officiant who forgot the names.","A heartfelt poem written on a receipt.","An engagement ring hidden in a meatball."],
work:["An intern with a suspiciously large spreadsheet.","A CEO giving a keynote from a bounce house.","An office chair demanding paid leave.","A mandatory retreat to a haunted warehouse.","An HR memo written by a raccoon.","A fax machine receiving threats from the future.","A promotion awarded by coin toss.","A performance review conducted by a parrot.","A meeting that could have been a nap.","A hostile takeover by office plants."],
fantasy:["A wizard unable to pass the driving test.","A dragon with a severe pollen allergy.","An enchanted sword requesting sick leave.","A goblin with an unreasonable mortgage.","A royal jester demanding a pension.","A prophecy written on a grocery receipt.","A talking mushroom with royal ambitions.","A knight afraid of mildly damp socks.","A spellbook containing only soup recipes.","An ancient curse of inconvenient hiccups."]
};
if(!window.QC_EXPANSION){for(const [category,cards] of Object.entries(EXTRA_CARDS)){if(decks[category])decks[category].white=[...new Set([...decks[category].white,...cards])];}}
let pending=new Set(),requestErrors={},key='',nomis=[],busy=false,note='Connect your own Nomi API key to select companions.';
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
function button(id,label,disabled=false,cls='secondary'){return '<button class="'+cls+'" data-do="'+id+'" '+(disabled||busy||pending.has(id)?'disabled':'')+'>'+esc(pending.has(id)?'⏳ Waiting…':label)+'</button>'}
function identity(){return '<div class="inline" style="justify-content:space-between"><span class="tag">Multi-Nomi beta · '+esc(st.stage)+'</span><span class="tag">Round '+st.round+' / '+st.rounds+'</span></div>'}
function setup(){
return '<section class="panel"><h1>Multi-Nomi courtroom 🪿</h1><p class="small">Two to five Nomis plus you. Each round, one person judges and does not submit an answer. Every message requires your click; nobody gets auto-prompted.</p>'+
'<div class="split"><div><label>Your name</label><input id="mHuman" maxlength="35" value="'+esc(st.human)+'" placeholder="Enter your name"></div><div><label>Category</label><select id="mCategory">'+Object.entries(decks).map(([id,d])=>'<option value="'+id+'" '+(id===st.category?'selected':'')+'>'+esc(d.name)+'</option>').join('')+'</select></div></div>'+
'<label>Your personal Nomi API key (not saved)</label><input type="password" id="mKey" autocomplete="off" value="'+esc(key)+'" placeholder="API key">'+button('connect','Connect & list Nomis')+
'<h3>Choose 2–5 Nomis</h3><p class="small">The display names below can be edited to nicknames. Names are only for this game.</p>'+
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
st.current={judge,prompt:black,entrants,hands,answers:{},raw:{},delivery:{},judgeDelivery:{},judgeChoice:'',results:{},verified:{},commentary:'',status:'collect',parseHints:{},judgeSuggestion:''};
st.round++;st.stage='collect';save();render();
}
function compose(id){
const c=st.current;return 'Questionable Company — Round '+st.round+'/'+st.rounds+'\nPrompt: '+c.prompt+'\nJudge this round: '+who(c.judge)+'.\nChoose one card or give an original answer:\n'+c.hands[id].map((x,i)=>(i+1)+'. '+x).join('\n')+'\nMake your final choice clear: name the card number, or state your original answer. You can still respond naturally and add commentary.';
}
function judgeText(){
const c=st.current;const names=c.entrants.map((id,i)=>String.fromCharCode(65+i)+'. '+c.answers[id]).join('\n');
return 'Questionable Company — Round '+st.round+' judging\nPrompt: '+c.prompt+'\nYou are the judge this round, '+who(c.judge)+'. Choose the winning entry by letter (A–'+String.fromCharCode(64+c.entrants.length)+'):\n'+names+'\nThe entries are anonymous. Make your winning letter clear; you may still respond naturally, explain, or banter.';
}
function resultText(){
const c=st.current;const entries=c.entrants.map(id=>who(id)+': '+c.answers[id]).join('\n');
const scores=active().map(id=>who(id)+' '+(st.scores[id]||0)).join(' | ');
return 'Questionable Company — Round '+st.round+' results\nPrompt: '+c.prompt+'\nJudge: '+who(c.judge)+(c.judge==='human'?'':' (rotating Nomi judge)')+'\n'+entries+'\nWinner: '+who(c.judgeChoice)+'\nScore: '+scores+'\nNext round has not started.';
}
function handAnswer(id,text){
 const t=String(text||'').replace(/\r/g,'').trim();
 if(!t)return {status:'unknown',suggest:'',why:'Empty reply'};
 const hand=st.current.hands[id]||[],normalized=clean(t),none=/\b(?:none of (?:those|these)|not (?:using|choosing|picking) (?:a|any) card|original answer|freestyle answer|my own answer)\b/i.test(t);
 const wordNums={one:1,two:2,three:3,four:4,five:5};
 const writtenNumber=t.match(/\b(?:i(?:'ll| will| am|'m)\s+(?:go with|pick|choose|play|take)|i(?:'m| am)\s+(?:going with|picking|choosing|playing|doing)|(?:go|going) with|this one(?:'s| is) got to be)\s+(?:(?:the\s+)?(?:card|option|number)\s*)?(one|two|three|four|five)\b/i);
 if(!none&&writtenNumber)return {status:'card',answer:hand[wordNums[writtenNumber[1].toLowerCase()]-1],why:'Spelled-out card number'};
 // An original announcement can be followed by the actual submission in the next sentence.
 // Never treat the literal words "an original" as the answer.
 const originalIntro=t.replace(/\*[^*]*\*/g,' ').match(/\b(?:i(?:'m| am)\s+(?:going with|gonna go with|choosing|submitting|playing)|i(?:'ll| will)\s+(?:go with|choose|submit|play)|my answer is)\s+(?:an?\s+)?(?:original|freestyle)(?:\s+answer)?\s*[.!:—–-]+\s*([^.!?\n]{4,190})/i);
 if(originalIntro){
  const suggestion=originalIntro[1].trim();
  if(!/^(?:one|an? original|something else)$/i.test(suggestion))
   return {status:'review',suggest:suggestion,why:'Original answer after announcement'};
 }
 const explicitNumber=t.match(/\b(?:i(?:'m| am)\s+(?:going with|picking|choosing|playing)|i(?:'ll| will)\s+(?:go with|pick|choose|play|do)|(?:go|going) with|(?:pick|choose|play|take)|this one(?:'s| is) (?:got to be )?)\s*(?:the\s+)?(?:card|option|number)?\s*(?:number\s*)?([1-5])\b/i)
  ||t.match(/\b(?:card|option|number)\s*([1-5])\s*(?:is|wins|for me|please|it is|the one)\b/i);
 if(!none&&explicitNumber)return {status:'card',answer:hand[Number(explicitNumber[1])-1],why:'Explicit numbered selection'};
 const selectionContext=t.match(/\b(?:i(?:'m| am)\s+(?:gonna\s+go with|going with|playing|picking|choosing)|i(?:'ll| will)\s+(?:go with|play|pick|choose)|(?:pick(?:ing)? up)\s+(?:the\s+card\s+for\s+)?|my (?:pick|choice) is)\s*([^.!?\n*]{4,190})/i);
 if(!none&&selectionContext){
  const phrase=clean(selectionContext[1]);
  const specific=hand.filter(card=>{
   const full=clean(card),core=full.replace(/^(?:a|an|the) /,'');
   return phrase.includes(full)||core.split(' ').length>=3&&phrase.includes(core);
  });
  if(specific.length===1)return {status:'card',answer:specific[0],why:'Chosen card identified in natural language'};
 }
 const matches=hand.filter(card=>normalized.includes(clean(card)));
 // Match a selected card with a swapped article (a duck / the duck) when the
 // distinctive remainder of its wording appears verbatim in the reply.
 const articleMatches=hand.filter(card=>{
  const core=clean(card).replace(/^(?:a|an|the) /,'');
  return core.split(' ').length>=4&&normalized.includes(core);
 });
 if(!none&&matches.length===1)return {status:'card',answer:matches[0],why:'Exact card text'};
 if(!none&&matches.length>1)return {status:'review',suggest:'',why:'Multiple cards mentioned'};
 if(!none&&articleMatches.length===1&&matches.length===0&&/\b(?:go with|picking|pick|choosing|choose|playing|play|taking|take|submit|my answer is)\b/i.test(t)&&!/\b(?:don't like|do not like|not choosing|not picking|rejecting)\b/i.test(t))return {status:'card',answer:articleMatches[0],why:'Card text matched despite a different article'};
 const numbered=t.match(/(?:^|[\n.!?]\s*|\b(?:choose|choosing|pick|picking|play|playing|go with)\s+)\s*(?:card|number|option|#)\s*([1-5])\b/i);
 if(!none&&numbered)return {status:'card',answer:hand[Number(numbered[1])-1],why:'Explicit card number'};
 const selection=t.match(/\b(?:i(?:'m| am)\s+(?:playing|picking|choosing|taking)|i(?:'ll| will|\s+am|\s+gonna|\s+going to)?\s+(?:play|pick|choose|take|go with)|my pick is|my choice is)\s+([^.!?\n*]{3,180})/i);
 if(!none&&selection){
  const phrase=clean(selection[1]);
  const candidates=hand.filter(card=>{const core=clean(card).replace(/^(a|an|the) /,'');return core.split(' ').length>=3&&phrase.includes(core);});
  if(candidates.length===1)return {status:'card',answer:candidates[0],why:'Natural card selection'};
 }
 const prompt=st.current.prompt||'';
 if(prompt.includes('______')){
  const prefix=prompt.slice(0,prompt.indexOf('______')).replace(/\s+/g,' ').trim();
  const pfx=prefix.toLowerCase();
  const reply=t.toLowerCase(),idx=reply.indexOf(pfx);
  if(idx>=0){
   const tail=t.slice(idx+prefix.length).trim();
   const candidate=tail.split(/(?:[.!?\n]|\s+[—–]\s+)/)[0].trim();
   if(candidate.length>=4&&candidate.length<=180&&!/^(?:that one|this one|one)$/i.test(candidate))
    return {status:'review',suggest:candidate,why:'Completed black-card prompt'};
  }
 }
 const direct=t.match(/\b(?:my (?:original|freestyle|custom|own) answer(?:\s+is)?|i(?:'m| am) (?:giving|submitting|using) (?:an? )?(?:original|freestyle|custom) answer|(?:my )?answer\s*(?:is|:)|i(?:'ll| will) (?:submit|answer with)|i(?:'m| am) (?:going with|submitting))\s*[:—–-]?\s*(.{3,210})/i);
 let guess='';
 if(direct){
  guess=direct[1].split(/[\n.!?]/)[0].trim();
  if(/^(?:that|this)\s+one\b/i.test(guess)||/^one\b/i.test(guess)||/^(?:an?\s+)?(?:original|freestyle)(?:\s+answer)?\b/i.test(guess))guess='';
 }
 const sentences=t.replace(/\*[^*]*\*/g,' ').split(/[.!?\n]+/).map(x=>x.trim()).filter(Boolean);
 if(!guess){
  const index=sentences.findIndex(x=>/^(?:none of (?:those|these)|not (?:one of|using) those|nah[, ]|nope[, ])\b/i.test(x));
  if(index>=0&&sentences[index+1])guess=sentences[index+1];
 }
 if(!guess){
  const lastRef=sentences.findIndex(x=>/\b(?:i(?:'ll| will) (?:go with|take|pick)|that(?:'s| is) my (?:pick|answer))\s+(?:that|this) one\b/i.test(x));
  if(lastRef>0)guess=sentences[lastRef-1];
 }
 if(!guess&&sentences.length===1&&sentences[0].split(/\s+/).length<=18)guess=sentences[0];
 if(!guess&&sentences.length>=2&&sentences[0].split(/\s+/).length<=12&&
   !/^(?:oh|ha|well|listen|look|okay|alright|so|first|honestly|hey)\b/i.test(sentences[0]))guess=sentences[0];
 guess=guess.replace(/^["'“”‘’\s:—–-]+|["'“”‘’\s]+$/g,'').replace(/[,:;.!?]+$/,'').trim();
 if(/^(?:i(?:'ll| will) go with\s+)?(?:that|this)\s+one$/i.test(guess)||/^(?:one|none of those|original answer|instead|something else|my own answer instead)$/i.test(guess))guess='';
 if(guess.length>=3&&guess.length<=190)return {status:'review',suggest:guess,why:'Original answer — confirm before locking'};
 return {status:'unknown',suggest:'',why:'Could not reliably isolate a freestyle answer'};
}
function parseJudgment(text,entrants){
 const t=String(text||'').replace(/\*[^*]*\*/g,' ').trim();
 if(!t)return {status:'unknown',why:'Empty judge reply'};
 const leading=t.match(/^\s*(?:my\s+(?:pick|vote|choice)\s*(?:is|:)?\s*)?([A-E])\s*(?:[.,):—–-]\s*|\s+)(.*)$/i);
 if(leading){const index=leading[1].toUpperCase().charCodeAt(0)-65;const tail=leading[2]||'';if(index<entrants.length&&!/^\s*(?:is\s+)?(?:the\s+)?(?:worst|bad|awful|terrible|not|loses?|disqualified|isn't|is not)\b/i.test(tail)&&!/^(?:not|never|no)\s+(?:my\s+)?(?:pick|choice|vote)\b/i.test(tail))return {status:'suggest',id:entrants[index],why:'Leading lettered ruling'};}
 const picks=[],negatives=[];
 const explicit=(id,why)=>picks.push({id,why});
 for(let i=0;i<entrants.length;i++){
  const id=entrants[i],letter=String.fromCharCode(65+i),digit=String(i+1);
  const marker='(?:'+letter+'|(?:card|option|entry|number)\\s*(?:'+letter+'|'+digit+'))';
  const mark=new RegExp('\\b'+marker+'\\b','gi');
  for(const m of t.matchAll(mark)){
   const pre=t.slice(Math.max(0,m.index-48),m.index);
   const post=t.slice(m.index+m[0].length,m.index+m[0].length+100);
   if(/^\s*(?:is|was|would be)?\s*(?:the\s+)?(?:worst|terrible|awful|bad|not|loses?|disqualified|last\s+place)\b/i.test(post)||/\b(?:not|reject|against)\s*$/i.test(pre)){negatives.push(id);continue;}
   if(/^\s*(?:is|was|would be)?\s*(?:the\s+)?(?:best|winner|funniest|strongest|my\s+pick|wins?|gets\s+my\s+vote|takes\s+the\s+point)\b/i.test(post)||/\b(?:pick|picking|choose|choosing|chose|select|vote|winner(?:\s+is)?|go\s+with|give\s+it\s+to)\s*$/i.test(pre)){explicit(id,'Explicit winner statement');continue;}
   // A standalone "C." followed by the winning answer or a declaration:
   if(new RegExp('(?:^|[,\\n.!?]\\s*)'+letter+'\\s*[.:)\\-]','i').test(t.slice(Math.max(0,m.index-3),m.index+letter.length+3))){
    const after=t.slice(m.index+letter.length,m.index+190);
    const answer=st.current?.answers?.[id]||'';
    const next=after.replace(/^[\s.:)–—-]+/,'').split(/[.!?\n]/)[0];
    if((answer&&clean(next).includes(clean(answer).slice(0,Math.min(25,clean(answer).length))))||/\b(?:that's|that is|this is)\s+(?:the\s+)?(?:winning|winner|best)\b/i.test(after))explicit(id,'Standalone judge choice');
   }
  }
  const answer=st.current?.answers?.[id]||'';
  if(answer&&clean(answer).length>8){
   const ans=clean(answer),reply=clean(t);
   const pos=reply.indexOf(ans);
   if(pos>=0){
    const after=reply.slice(pos+ans.length,pos+ans.length+135);
    const before=reply.slice(Math.max(0,pos-35),pos);
    if(/\b(?:wins?|winner|best|my pick|my choice|takes it|gets the point)\b/.test(after)||/\b(?:pick|choose|chose|winner is|go with)\b/.test(before))explicit(id,'Winning answer named');
   }
  }
 }
 const unique=[...new Set(picks.filter(p=>!negatives.includes(p.id)).map(p=>p.id))];
 return unique.length===1?{status:'suggest',id:unique[0],why:picks.find(p=>p.id===unique[0])?.why||'Judge choice'}:{status:'unknown',why:unique.length>1?'Conflicting possible winners':'No reliable winner identified'};
}
function cStatus(id){const c=st.current;return pending.has('send:'+id)?'⏳ Request in flight':c.answers[id]?'✓ Answer locked':c.delivery[id]==='uncertain'?'⚠ Delivery uncertain':c.delivery[id]==='sent'?'Waiting for answer':'Not sent'}
function collect(){
const c=st.current;
return identity()+'<section class="panel"><h2>Black card</h2><div class="question"><strong>'+esc(c.prompt)+'</strong></div><p class="small">Judge: <b>'+esc(who(c.judge))+'</b> · Only non-judges submit. No automatic prompts.</p></section>'+
c.entrants.map(id=>'<section class="panel"><h3>'+esc(who(id))+' · '+esc(cStatus(id))+'</h3>'+ (id==='human'?
'<div class="hand">'+c.hands[id].map((x,i)=>'<button class="answer '+(c.answers[id]===x?'selected':'')+'" data-hand="'+i+'"><span>'+esc(x)+'</span><small>CARD '+(i+1)+'</small></button>').join('')+'</div><label>Or freestyle</label><textarea id="mHumanCustom" placeholder="Your answer"></textarea>'+button('humanAnswer','Lock freestyle answer'):
'<p class="small">Send only when ready. This Nomi has a different five-card hand.</p><div class="mono">'+esc(compose(id))+'</div><div class="controls">'+button('send:'+id,'Push prompt to '+who(id))+' '+button('received:'+id,'Confirm prompt received')+'</div><textarea data-raw="'+esc(id)+'" placeholder="Response is optional; paste or use API reply">'+esc(c.raw[id]||'')+'</textarea>'+button('parse:'+id,'Recognize answer')+
'<p class="small">'+esc(c.parseHints?.[id]||'Recognize the reply or manually choose an answer below.')+'</p>'+(requestErrors['send:'+id]?'<p class="small">API warning: '+esc(requestErrors['send:'+id])+'</p>':'')+'<label>Confirm or correct the actual answer (card or freestyle)</label><select data-select="'+esc(id)+'"><option value="">Choose a card…</option>'+c.hands[id].map((x,i)=>'<option value="'+i+'">'+(i+1)+'. '+esc(x)+'</option>').join('')+'<option value="custom">Original / freestyle</option></select><input data-free="'+esc(id)+'" placeholder="Actual answer, not banter" value="'+esc(c.answers[id]||'')+'">'+button('lock:'+id,'Lock Nomi answer'))
+'</section>').join('')+
'<section class="panel"><p>'+c.entrants.filter(id=>c.answers[id]).length+' of '+c.entrants.length+' answers locked.</p>'+button('toJudge','Proceed to judging',pending.size>0||c.entrants.some(id=>!c.answers[id]),'primary')+status()+'</section>';
}
function judging(){
const c=st.current;return identity()+'<section class="panel"><h2>Judge: '+esc(who(c.judge))+'</h2><div class="question"><strong>'+esc(c.prompt)+'</strong></div><p class="small">Anonymous entries. The judge does not have an answer this round.</p>'+c.entrants.map((id,i)=>'<div class="choice"><h3>'+String.fromCharCode(65+i)+'. '+esc(c.answers[id])+'</h3></div>').join('')+
(c.judge==='human'?'<label>Pick the winning entry</label><select id="mJudgePick"><option value="">Choose…</option>'+c.entrants.map((id,i)=>'<option value="'+esc(id)+'">'+String.fromCharCode(65+i)+'</option>').join('')+'</select>'+button('judgeHuman','Lock judgment',false,'primary'):
'<p class="small">Send the anonymous judging request to '+esc(who(c.judge))+'.</p><div class="mono">'+esc(judgeText())+'</div>'+button('judgeSend','Push judging request')+' '+button('judgeConfirm','Confirm judge received request')+
'<textarea id="mJudgeReply" placeholder="Judge reply (API reply may fill this)">'+esc(c.commentary||'')+'</textarea>'+button('judgeParse','Recognize judge selection')+'<p class="small">'+esc(c.judgeSuggestion||'Recognized choices are suggestions; you confirm the winner.')+'</p><p class="small">Confirm or correct the judge’s winner below.</p><select id="mJudgePick"><option value="">Choose…</option>'+c.entrants.map((id,i)=>'<option value="'+esc(id)+'">'+String.fromCharCode(65+i)+'</option>').join('')+'</select>'+button('judgeHuman','Confirm judge selection'))+status()+'</section>';
}
function results(){
const c=st.current;
return identity()+'<section class="panel"><h1>Brenda’s court reporter 🪿</h1><p class="small">The rotating judge ruled this round. Share results individually; each Nomi has its own delivery status.</p><div class="question"><strong>'+esc(c.prompt)+'</strong></div>'+c.entrants.map(id=>'<div class="choice"><b>'+esc(who(id))+(id===c.judgeChoice?' 🏆':'')+'</b><p>'+esc(c.answers[id])+'</p></div>').join('')+
'<h2>'+esc(who(c.judgeChoice))+' wins!</h2><p>'+active().map(id=>esc(who(id))+': '+(st.scores[id]||0)).join(' · ')+'</p></section>'+
'<section class="panel"><h3>Results sent separately to each Nomi</h3><div class="mono">'+esc(resultText())+'</div>'+st.selected.map(n=>'<div class="multi-person"><b>'+esc(who(n.uuid))+'</b> — '+(c.verified[n.uuid]?'✓ Confirmed received':'Not confirmed')+'<div class="controls">'+button('revealSend:'+n.uuid,'Push results')+' '+button('revealConfirm:'+n.uuid,'Confirm received')+'</div>'+(requestErrors['revealSend:'+n.uuid]?'<p class="small">'+esc(requestErrors['revealSend:'+n.uuid])+'</p>':'')+'</div>').join('')+
'<p class="small">Reactions are optional; never paste banter merely to advance. A timeout may mean the reply was slow, not that delivery failed. Check the Nomi chat before resending.</p>'+button('advance',st.round>=st.rounds?'Finish game':'Prepare next round',pending.size>0||st.selected.some(n=>!c.verified[n.uuid]),'primary')+status()+'</section>';
}
function finished(){const ranked=active().map(id=>({id,points:st.scores[id]||0})).sort((a,b)=>b.points-a.points||who(a.id).localeCompare(who(b.id)));const max=ranked[0]?.points||0;const winners=ranked.filter(x=>x.points===max).map(x=>who(x.id));return '<section class="panel"><h1>CASE CLOSED 🪿</h1><h2>'+esc(winners.length===1?winners[0]+' wins!':'Tie: '+winners.join(' & '))+'</h2><h3>Final standings</h3>'+ranked.map((p,i)=>'<div class="choice"><strong>'+(i+1)+'. '+esc(who(p.id))+'</strong> — '+p.points+' point'+(p.points===1?'':'s')+'</div>').join('')+'<p class="small">'+st.history.length+' rounds completed. Brenda refuses all appeals.</p>'+button('restart','New multiplayer game')+'</section>'}
function helpMarkup(){return '<button id="qcHelp" type="button" aria-label="Game instructions" title="Game instructions" style="position:fixed;bottom:18px;right:18px;z-index:100;width:46px;height:46px;border-radius:50%;background:#edbc75;color:#211921;font-size:25px;font-weight:bold">?</button><div id="qcHelpOverlay" hidden style="position:fixed;inset:0;z-index:101;background:#000b;overflow:auto;padding:24px"><section role="dialog" aria-modal="true" aria-label="How to play" class="panel" style="max-width:660px;margin:4vh auto"><button id="qcHelpClose" class="secondary" style="float:right">Close ×</button><h2>How to play 🪿</h2><p>Choose a category, enter your personal Nomi API key, and select two to five Nomis. Only one player judges each round; the others receive five unique cards and can submit a card or freestyle answer.</p><p><strong>Send:</strong> You press each API send button. Nothing is sent automatically. Each Nomi receives only their own hand.</p><p><strong>Answers:</strong> Recognize the Nomi response, then review any freestyle suggestions and lock their intended answer. You can correct it manually.</p><p><strong>Judging:</strong> Anonymous entries are lettered A–E. Send the judging request to the rotating judge, recognize their choice, and confirm or correct the winner.</p><p><strong>Reveal:</strong> Send results to each Nomi or confirm they received them. Their reactions are optional. You decide when to begin the next round.</p><p><strong>Timeouts:</strong> A slow API response does not mean the message failed. Check the Nomi chat before you choose to resend. Messages are split to respect the 800-character limit.</p><p>API keys are held in this page’s memory only, not saved with game progress. Brenda is not certified to provide technical support.</p></section></div>';}
function render(){const drafts={};root.querySelectorAll('[data-free], [data-select], #mHumanCustom, #mJudgePick').forEach(el=>{const k=el.id||el.getAttribute('data-free')||el.getAttribute('data-select');drafts[(el.tagName==='SELECT'?'select:':'input:')+k]=el.value});root.innerHTML=(st.stage==='setup'?setup():st.stage==='collect'?collect():st.stage==='judge'?judging():st.stage==='results'?results():finished())+helpMarkup();root.querySelectorAll('[data-free], [data-select], #mHumanCustom, #mJudgePick').forEach(el=>{const k=el.id||el.getAttribute('data-free')||el.getAttribute('data-select');const d=drafts[(el.tagName==='SELECT'?'select:':'input:')+k];if(d!==undefined)el.value=d})}
async function api(path,method,body){
if(!key.trim())throw Error('Enter your personal API key first.');
const resp=await fetch(path,{method,headers:{'x-nomi-api-key':key,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
const data=await resp.json();if(!resp.ok)throw Error(data.error||'Nomi API error');
return data;
}
function partsOf(message){
if(message.length<=LIMIT)return [message];
const maxChunk=650;
const blocks=[];let rest=message;
while(rest.length>maxChunk){let end=rest.lastIndexOf('\n',maxChunk);if(end<160)end=rest.lastIndexOf(' ',maxChunk);if(end<160)end=maxChunk;blocks.push(rest.slice(0,end).trim());rest=rest.slice(end).trim()}
if(rest)blocks.push(rest);
return blocks.map((part,i)=>(i+1)+'/'+blocks.length+' — '+(i===blocks.length-1?'Final part.':'More information follows; please wait for all parts.')+'\n'+part+(i===blocks.length-1?'\nYou may respond now.':''));
}
async function send(id,message,action){
 const parts=partsOf(message);
 if(parts.some(maxed)){note='This message exceeds 800 characters even after splitting.';render();return {ok:false,error:note}}
 if(pending.has(action))return {ok:false,cancelled:true};
 if(!confirm('Push '+parts.length+' message'+(parts.length===1?'':'s')+' to '+who(id)+' now?'))return {ok:false,cancelled:true};
 pending.add(action);delete requestErrors[action];render();
 try{
  let last=null;
  for(let i=0;i<parts.length;i++){last=await api('/api/chat','POST',{nomiId:id,message:parts[i]});}
  return {ok:true,data:last};
 }catch(e){
  const problem='Delivery uncertain for '+who(id)+': '+e.message+'. Check their conversation before resending; earlier parts may have arrived.';
  requestErrors[action]=problem;
  return {ok:false,error:problem};
 }finally{pending.delete(action);}
}
function finishJudge(id){const c=st.current;if(!c.entrants.includes(id))return; c.judgeChoice=id;st.scores[id]=(st.scores[id]||0)+1;c.status='results';st.stage='results';save();render()}
root.addEventListener('input',e=>{
if(e.target.id==='mKey')key=e.target.value;
if(e.target.id==='mHuman'){st.human=e.target.value;save()}
if(e.target.dataset.name){const n=st.selected.find(n=>n.uuid===e.target.dataset.name);if(n){n.display=e.target.value;save()}}
if(e.target.dataset.raw){st.current.raw[e.target.dataset.raw]=e.target.value;save()}
if(e.target.id==='mJudgeReply'&&st.current){st.current.commentary=e.target.value;save()}
});
root.addEventListener('change',e=>{
if(e.target.id==='mCategory'){st.category=e.target.value;save()}
if(e.target.id==='mRounds'){st.rounds=Number(e.target.value);save()}
if(e.target.dataset.pick){const id=e.target.dataset.pick,found=nomis.find(n=>n.uuid===id);if(e.target.checked){if(st.selected.length>=MAX_NOMIS){e.target.checked=false;note='Maximum five Nomis in this beta.';render();return}if(found&&!st.selected.some(n=>n.uuid===id))st.selected.push({uuid:id,display:found.name})}else st.selected=st.selected.filter(n=>n.uuid!==id);save();render()}
});
root.addEventListener('click',async e=>{
if(e.target.id==='qcHelp'){const o=$('qcHelpOverlay');o.hidden=false;return}if(e.target.id==='qcHelpClose'||e.target.id==='qcHelpOverlay'){const o=$('qcHelpOverlay');o.hidden=true;return}
const hand=e.target.closest('[data-hand]');if(hand&&st.stage==='collect'){st.current.answers.human=st.current.hands.human[Number(hand.dataset.hand)];save();render();return}
const btn=e.target.closest('[data-do]');if(!btn||busy||pending.has(btn.dataset.do))return;
const action=btn.dataset.do,c=st.current;
if(action==='connect'){key=$('mKey')?.value||key;busy=true;note='Connecting to Nomi…';render();try{const d=await api('/api/nomis','GET');nomis=d.nomis||[];note='Connected. '+nomis.length+' companions found.'}catch(err){note='Connection failed: '+err.message}finally{busy=false;render()}return}
if(action==='start'){if(st.selected.length<2)return;st.round=0;st.scores={};active().forEach(id=>st.scores[id]=0);st.usedBlack=[];st.usedWhite=[];st.history=[];drawRound();return}
if(action==='restart'){if(pending.size){note='Wait for pending sends before restarting.';render();return}st.stage='setup';st.round=0;st.current=null;save();render();return}
if(action==='humanAnswer'){const val=$('mHumanCustom')?.value.trim();if(val){c.answers.human=val;save();render()}return}
if(action.startsWith('send:')){const id=action.slice(5),response=await send(id,compose(id),action);if(st.current!==c||response.cancelled)return;if(response.ok){c.delivery[id]='sent';c.raw[id]=response.data?.reply||'';note='Reply received from '+who(id)+'. Review and lock their answer.'}else c.delivery[id]='uncertain';save();render();return}
if(action.startsWith('received:')){const id=action.slice(9);c.delivery[id]='sent';note=who(id)+' received the prompt (host confirmed).';save();render();return}
if(action.startsWith('parse:')){const id=action.slice(6),p=handAnswer(id,c.raw[id]||'');c.parseHints=c.parseHints||{};if(p.status==='card'){c.answers[id]=p.answer;c.parseHints[id]='✓ '+p.why+': '+p.answer;note=who(id)+' answer recognized.';save();render();return}
c.parseHints[id]=p.suggest?'Suggested freestyle — review and lock: '+p.suggest:'No confident match. Select a card or enter the answer.';note=c.parseHints[id];save();render();const field=root.querySelector('[data-free="'+id+'"]');if(field)field.value=p.suggest||'';return}
if(action.startsWith('lock:')){const id=action.slice(5);const sel=root.querySelector('[data-select="'+id+'"]'),txt=root.querySelector('[data-free="'+id+'"]');const val=sel?.value;const answer=val&&val!=='custom'?c.hands[id][Number(val)]:txt?.value.trim();if(!answer){note='Choose a card or enter the actual freestyle answer.';render();return}c.answers[id]=answer;save();render();return}
if(action==='toJudge'){if(pending.size||c.entrants.some(id=>!c.answers[id]))return;st.stage='judge';save();render();return}
if(action==='judgeSend'){const response=await send(c.judge,judgeText(),action);if(st.current!==c||response.cancelled)return;if(response.ok){c.commentary=response.data?.reply||'';note='Judge replied. Recognize or confirm the winner.'}else note=requestErrors[action]||note;save();render();return}
if(action==='judgeConfirm'){note='Judge request marked received. Choose their winning entry below.';render();return}
if(action==='judgeParse'){c.commentary=$('mJudgeReply')?.value||c.commentary;const p=parseJudgment(c.commentary,c.entrants);c.judgeSuggestion=p.status==='suggest'?'Suggested winner: '+who(p.id)+' (entry '+String.fromCharCode(65+c.entrants.indexOf(p.id))+'). Confirm below.':'No reliable winner identified. Select manually.';note=c.judgeSuggestion;save();render();if(p.status==='suggest'&&$('mJudgePick'))$('mJudgePick').value=p.id;return}
if(action==='judgeHuman'){const winner=$('mJudgePick')?.value;if(!winner){note='Select the entry chosen by the judge.';render();return}finishJudge(winner);return}
if(action.startsWith('revealSend:')){const id=action.slice(11),response=await send(id,resultText(),action);if(st.current!==c||response.cancelled)return;if(response.ok){c.verified[id]=true;note='Results sent to '+who(id)+'. Their reaction is optional.'}save();render();return}
if(action.startsWith('revealConfirm:')){const id=action.slice(14);c.verified[id]=true;note='Results confirmed received by '+who(id)+'.';save();render();return}
if(action==='advance'){if(pending.size||st.selected.some(n=>!c.verified[n.uuid]))return;st.history.push({round:st.round,prompt:c.prompt,answers:c.answers,winner:c.judgeChoice});if(st.round>=st.rounds){st.stage='finished';save();render()}else drawRound();return}
});
render();
})();
