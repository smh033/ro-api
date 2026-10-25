'use strict';

const API = String(window.PUBLIC_ROBLOX_API || '').replace(/\/+$/, '').trim();
const form = document.getElementById('lookup-form');
const input = document.getElementById('lookup-input');
const result = document.getElementById('result');
const statusEl = document.getElementById('status-text');
const submit = document.getElementById('submit-btn');
const example = document.getElementById('example-btn');
let type = 'game';
let currentRequest = 0;

statusEl.textContent = API ? 'Live Roblox public-data mode' : 'Interface preview — connect your Cloudflare Worker to go live';
statusEl.classList.toggle('preview', !API);

function node(tag, className, content) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (content !== undefined && content !== null) el.textContent = String(content);
  return el;
}
function cardText(parent, tag, className, content) { const el=node(tag,className,content); parent.append(el); return el; }
function readableNum(n) { return typeof n === 'number' && Number.isFinite(n) ? Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n) : '—'; }
function safePicture(value) { try { const url = new URL(value); return url.protocol === 'https:' && (url.hostname.endsWith('.rbxcdn.com') || url.hostname === 'rbxcdn.com') ? url.href : null; } catch { return null; } }
function createPicture(src, alt, fallback) {
  const box = node('div','cover');
  const uri = safePicture(src);
  if (uri) { const img=node('img'); img.alt=alt; img.loading='lazy'; img.referrerPolicy='no-referrer'; img.src=uri; img.onerror=()=>{box.replaceChildren(node('span','',fallback));}; box.append(img); }
  else box.append(node('span','',fallback));
  return box;
}
function createButton(label, fn, extra) { const b=node('button','action '+(extra||''),label);b.type='button';b.addEventListener('click',fn);return b; }
function addNumber(parent,value,label) {const wrap=node('div','number');cardText(wrap,'strong','',readableNum(value));cardText(wrap,'span','',label);parent.append(wrap);}

function switchType(next) {
  type=next;
  for(const tab of document.querySelectorAll('.tab')){
    const active=tab.dataset.type===type;
    tab.classList.toggle('selected',active);
    tab.setAttribute('aria-selected',String(active));
  }
  input.placeholder=type==='game'?'Paste a Roblox game URL or place ID':'Paste a Roblox profile URL or user ID';
}
for(const tab of document.querySelectorAll('.tab')) tab.addEventListener('click',()=>switchType(tab.dataset.type));

function parseInput(value, suggestedType) {
  const raw=value.trim();
  if (/^\d{1,19}$/.test(raw) && BigInt(raw)>0n) return {type:suggestedType,id:raw};
  let url;
  try {url=new URL(raw);} catch {throw new Error('Enter a Roblox link or a numeric ID.');}
  if (!['roblox.com','www.roblox.com'].includes(url.hostname) || url.protocol!=='https:') throw new Error('Only official https://www.roblox.com links are supported.');
  let match=url.pathname.match(/^\/games\/(\d{1,19})(?:\/|$)/i);
  if(match) return {type:'game',id:match[1]};
  match=url.pathname.match(/^\/users\/(\d{1,19})(?:\/profile)?(?:\/|$)/i);
  if(match) return {type:'user',id:match[1]};
  throw new Error('Use a Roblox game URL, profile URL, or numeric ID.');
}
function displayError(message){result.replaceChildren();const card=node('div','error-card');cardText(card,'strong','','Couldn’t load that page');cardText(card,'p','',message);result.append(card);}
function loading(){result.replaceChildren();const card=node('div','loading-card');card.append(node('span','spinner'),node('span','','Loading public Roblox information…'));result.append(card);}
function shareUrl(kind,id){const url=new URL(location.href);url.search='';url.searchParams.set(kind,id);return url.href;}
async function copyLink(kind,id){const link=shareUrl(kind,id);try {await navigator.clipboard.writeText(link);}catch {window.prompt('Copy this link:',link);return;} const el=document.activeElement;if(el&&el.tagName==='BUTTON'){const old=el.textContent;el.textContent='Link copied ✓';setTimeout(()=>{if(el.isConnected)el.textContent=old;},1400);}}
function renderCard(data,demo=false) {
  const isGame=data.type==='game';
  const wrapper=node('article','result-card '+(isGame?'':'user-layout'));
  const top=node('div','result-top'); top.append(node('span','result-kind',isGame?'▣ Experience preview':'◉ Profile preview'),node('span','pill '+(demo?'demo':''),demo?'UI SAMPLE · NOT LIVE':'PUBLIC DATA'));wrapper.append(top);
  const grid=node('div','card-grid');
  grid.append(createPicture(isGame?data.icon:data.avatar,isGame?data.name:data.displayName,isGame?'▣':'◉'));
  const main=node('div');
  cardText(main,'h2','card-title',isGame?data.name:data.displayName);
  cardText(main,'div','byline',isGame?'by '+data.creator:'@'+data.name);
  const desc=data.description || (isGame?'No description available.':'No public bio available.');
  cardText(main,'div','description',desc.slice(0,2400));
  if(isGame){const stats=node('div','numbers');addNumber(stats,data.playing,'Playing now');addNumber(stats,data.visits,'Visits');addNumber(stats,data.favorites,'Favorites');main.append(stats);}
  else cardText(main,'p','subtle-note',data.created?'Account created: '+new Date(data.created).toLocaleDateString(): 'Public profile information only.');
  const actions=node('div','card-actions');
  if(!demo){
    const a=node('a','action primary',isGame?'Open game on Roblox ↗':'Open profile on Roblox ↗');a.href=data.url;a.target='_blank';a.rel='noopener noreferrer';actions.append(a);
    actions.append(createButton('Copy viewer link',()=>copyLink(isGame?'game':'user',isGame?data.placeId:data.userId)));
  }else {actions.append(node('span','subtle-note','Deploy the Cloudflare Worker and set config.js for live public data.'));}
  main.append(actions);grid.append(main);wrapper.append(grid);
  const banner=isGame?safePicture(data.preview):null;
  if(banner){const b=node('img','banner');b.src=banner;b.alt=data.name+' preview';b.loading='lazy';wrapper.append(b);}
  result.replaceChildren(wrapper);
  result.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function lookup(parsed,{history=true}={}) {
  switchType(parsed.type);input.value=parsed.id;
  const request=++currentRequest;
  loading();submit.disabled=true;
  try {
    if (!API) {
      // Deliberately fictional placeholder (not a claim about any actual Roblox user/game).
      const demo=parsed.type==='game'?{
        type:'game',placeId:parsed.id,name:'Sample Experience',creator:'Example Creator',description:'This is a UI-only preview. Enter your Cloudflare Worker URL in config.js to load real public Roblox experiences.',playing:null,visits:null,favorites:null,icon:'',preview:''
      }:{type:'user',userId:parsed.id,name:'example_user',displayName:'Sample Profile',description:'This is placeholder information, not a real Roblox account.',created:null,avatar:''};
      if(request!==currentRequest)return;
      renderCard(demo,true);
      return;
    }
    if(!/^https:\/\/[\w.-]+(?::\d+)?$/.test(API))throw new Error('The API URL in config.js must be an HTTPS Worker URL with no path.');
    const endpoint=parsed.type==='game'?`/api/game?placeId=${parsed.id}`:`/api/user?userId=${parsed.id}`;
    const response=await fetch(API+endpoint,{method:'GET',mode:'cors',credentials:'omit'});
    let data;try{data=await response.json();}catch{throw new Error('Cloudflare returned an invalid response. Check the Worker URL in config.js.');}
    if(!response.ok)throw new Error(data.error||`API returned status ${response.status}.`);
    if(request!==currentRequest)return;
    renderCard(data);
    if(history)window.history.replaceState(null,'',shareUrl(parsed.type,parsed.id));
  }catch(error){if(request!==currentRequest)return;displayError(error?.message||'Unknown error.');}
  finally{if(request===currentRequest)submit.disabled=false;}
}
form.addEventListener('submit',e=>{e.preventDefault();try{const parsed=parseInput(input.value,type);lookup(parsed);}catch(error){displayError(error.message);}});
example.addEventListener('click',()=>lookup({type:type,id:type==='game'?'4924922222':'1'}));
const search=new URL(location.href).searchParams;
if(search.has('game')&&/^\d{1,19}$/.test(search.get('game')))lookup({type:'game',id:search.get('game')},{history:false});
else if(search.has('user')&&/^\d{1,19}$/.test(search.get('user')))lookup({type:'user',id:search.get('user')},{history:false});
