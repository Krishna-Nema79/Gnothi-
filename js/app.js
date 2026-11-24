{
// ---------- helpers ----------
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iso = d => { const z = new Date(d.getTime() - d.getTimezoneOffset()*6e4); return z.toISOString().slice(0,10); };
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const fmtDate = s => new Date(s + 'T12:00:00').toLocaleDateString('en-IN', {day:'numeric', month:'short'});
const mean = a => a.reduce((x,y)=>x+y,0) / (a.length || 1);
const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0) / Math.max(1, a.length-1)); };
const median = a => { const b = [...a].sort((x,y)=>x-y), h = b.length >> 1; return b.length % 2 ? b[h] : (b[h-1]+b[h]) / 2; };
const clamp = (v,a,b) => Math.min(b, Math.max(a, v));
const hm = h => { const m = Math.round(Math.abs(h)*60); return Math.floor(m/60) + 'h ' + String(m%60).padStart(2,'0') + 'm'; };
const mins = h => Math.round(Math.abs(h)*60) + ' min';
const toast = t => { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(()=>e.classList.remove('on'), 3200); };

// ---------- stats: Welch t-test with Student t p-value ----------
function betacf(a,b,x){let qab=a+b,qap=a+1,qam=a-1,c=1,d=1-qab*x/qap;if(Math.abs(d)<1e-30)d=1e-30;d=1/d;let h=d;
 for(let m=1;m<=200;m++){const m2=2*m;let aa=m*(b-m)*x/((qam+m2)*(a+m2));d=1+aa*d;if(Math.abs(d)<1e-30)d=1e-30;c=1+aa/c;if(Math.abs(c)<1e-30)c=1e-30;d=1/d;h*=d*c;
 aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));d=1+aa*d;if(Math.abs(d)<1e-30)d=1e-30;c=1+aa/c;if(Math.abs(c)<1e-30)c=1e-30;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<3e-12)break}return h}
function lgamma(x){const g=[76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,.1208650973866179e-2,-.5395239384953e-5];let y=x,t=x+5.5;t-=(x+.5)*Math.log(t);let s=1.000000000190015;for(const c of g)s+=c/++y;return -t+Math.log(2.5066282746310005*s/x)}
function ibeta(x,a,b){if(x<=0)return 0;if(x>=1)return 1;const bt=Math.exp(lgamma(a+b)-lgamma(a)-lgamma(b)+a*Math.log(x)+b*Math.log(1-x));return x<(a+1)/(a+b+2)?bt*betacf(a,b,x)/a:1-bt*betacf(b,a,1-x)/b}
function welch(a,b){ if(a.length<3||b.length<3) return {p:1,diff:mean(a)-mean(b)};
 const va=sd(a)**2/a.length, vb=sd(b)**2/b.length, se=Math.sqrt(va+vb)||1e-9, t=(mean(a)-mean(b))/se;
 const df=(va+vb)**2/((va*va)/(a.length-1)+(vb*vb)/(b.length-1)||1e-9);
 return {t, df, p: ibeta(df/(df+t*t), df/2, .5), diff: mean(a)-mean(b)}; }
const conf = p => p < .01 ? ['Strong evidence','strong'] : p < .05 ? ['Likely','mid'] : p < .2 ? ['Possible, worth testing','weak'] : ['No clear link','weak'];

// ---------- sample data model ----------
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let R = rng(7);
const N = (m,s) => m + s*Math.sqrt(-2*Math.log(R()||1e-9))*Math.cos(2*Math.PI*R());
function simDay(date, prevSteps, prevSleep, o = {}){
 const late = o.late ?? Math.max(0, Math.round(N(38,32)));
 const caffeine = o.caffeine ?? [0,0,0,1,1,2][Math.floor(R()*6)];
 const steps = o.steps ?? Math.round(clamp(N(7200,2300),1500,18000));
 const sleep = +clamp(7.45 - .0095*late - .32*caffeine + .00003*(steps-7000) + N(0,.33), 4.3, 9.2).toFixed(2);
 const rhr = Math.round(64 - .9*(prevSleep-7) + N(0,1.4));
 const energy = Math.round(clamp(3 + .95*(prevSleep-7) + .00012*(prevSteps-7000) + N(0,.6),1,5));
 const mood = Math.round(clamp(3.1 + .55*(prevSleep-7) + .00017*(steps-7000) + N(0,.65),1,5));
 return {date, sleep, steps, rhr, late, caffeine, mood, energy};
}
function makeSample(){
 R = rng(7); const days = [], start = addDays(iso(new Date()), -45);
 let ps = 7000, pl = 7;
 for(let i=0;i<45;i++){
  const o = (i>=24 && i<31) ? {late: Math.round(R()*8)} : i===44 ? {late:95, caffeine:1} : {};
  const d = simDay(addDays(start,i), ps, pl, o); if(i>=24&&i<31) d.adh = 1;
  days.push(d); ps = d.steps; pl = d.sleep;
 }
 return {days, sample:true, exps:[{id:'phone', start:days[24].date, status:'done'}], active:null, notif:false};
}

// ---------- state ----------
const KEY = 'gnothi.v1';
let S;
try { S = JSON.parse(localStorage.getItem(KEY)); } catch(e) { S = null; }
if(!S || !Array.isArray(S.days)) S = makeSample();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e) {} };

const TEMPLATES = [
 {id:'phone', name:'No phone after 11 pm', f:'late', o:'sleep', goal:d=>d.late<=10, desc:'Phone away by 11. Measures your sleep.'},
 {id:'coffee', name:'No coffee or tea after 3 pm', f:'caffeine', o:'sleep', goal:d=>d.caffeine===0, desc:'Last cup before 3. Measures your sleep.'},
 {id:'steps', name:'Walk 9,000 steps a day', f:'steps', o:'mood', goal:d=>d.steps>=9000, desc:'A longer walk each day. Measures your mood.'}];
const LAB = {sleep:'sleep', energy:'energy', mood:'mood', late:'phone use after 11 pm', caffeine:'coffee or tea after 3 pm', steps:'steps', rhr:'resting heart rate'};
const fmtF = (k,v) => k==='late' ? Math.round(v)+' min' : k==='caffeine' ? (+v.toFixed(1))+(+v.toFixed(1)===1?' cup':' cups') : k==='steps' ? Math.round(v).toLocaleString('en-IN')+' steps' : k==='sleep' ? hm(v) : (+v.toFixed(1))+'/5';
const fmtDiff = (k,v) => k==='sleep' ? mins(v) : (Math.abs(v).toFixed(1))+' points';

// ---------- engine ----------
const PAIRS = { sleep:[['late',0],['caffeine',0],['steps',0]], energy:[['sleep',1],['steps',1],['late',1]], mood:[['sleep',1],['steps',0],['caffeine',0]] };
function drivers(o){
 const D = S.days; return PAIRS[o].map(([f,lag]) => {
  const pts = []; for(let i=lag;i<D.length;i++) pts.push([D[i-lag][f], D[i][o]]);
  const med = median(pts.map(p=>p[0]));
  let hi = pts.filter(p=>p[0]>med).map(p=>p[1]), lo = pts.filter(p=>p[0]<=med).map(p=>p[1]);
  const w = welch(hi, lo);
  return {f, lag, med, hi:mean(hi), lo:mean(lo), n:pts.length, ...w};
 }).sort((a,b)=>a.p-b.p);
}
function sentence(r, o){
 const when = r.lag ? 'the day after' : 'on days with';
 const fl = r.f==='sleep' ? `more than ${hm(r.med)} of sleep` : `more than ${fmtF(r.f,r.med)} of ${LAB[r.f]}`.replace('of steps','');
 const subj = r.f==='steps' ? `more than ${fmtF('steps',r.med)}` : fl;
 const dir = r.diff >= 0 ? (o==='sleep'?'more':'higher') : (o==='sleep'?'less':'lower');
 const what = o==='sleep' ? `you slept ${fmtDiff(o,r.diff)} ${dir}` : `your ${o} was ${fmtDiff(o,r.diff)} ${dir}`;
 return `${when[0].toUpperCase()+when.slice(1)} ${subj}, ${what} (${fmtF(o,r.hi)} vs ${fmtF(o,r.lo)}).`;
}
function expResult(e){
 const t = TEMPLATES.find(x=>x.id===e.id), D = S.days, si = D.findIndex(d=>d.date===e.start);
 if(si<0) return null;
 const during = D.slice(si, si+7), before = D.slice(Math.max(0,si-14), si);
 const w = welch(during.map(d=>d[t.o]), before.map(d=>d[t.o]));
 return {t, w, a:mean(during.map(d=>d[t.o])), b:mean(before.map(d=>d[t.o])), kept:during.filter(t.goal).length, n:during.length};
}

const IC = {sleep:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>', late:'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
 caffeine:'<path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3.5v2.5M12 3.5v2.5"/>',
 steps:'<path d="M7 15c-1.7 0-3-1.6-3-4.5S5.3 4 7.5 4 10 6 10 8.5 9.3 15 7 15zM5 18.5h4.5M17 20.5c-2.3 0-3-6.5-3-9s1.3-4.5 3.5-4.5S20 9 20 11.5s-1.3 9-3 9z"/>',
 rhr:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
 mood:'<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c1.8 2 5.2 2 7 0M9 9.5h.01M15 9.5h.01"/>', energy:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'};
const icon = k => `<span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${IC[k]||''}</svg></span>`;
function smooth(P){ if(P.length<2) return ''; let d=`M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
 for(let i=0;i<P.length-1;i++){ const p0=P[i-1]||P[i], p1=P[i], p2=P[i+1], p3=P[i+2]||p2;
  d+=` C${(p1[0]+(p2[0]-p0[0])/6).toFixed(1)} ${(p1[1]+(p2[1]-p0[1])/6).toFixed(1)} ${(p2[0]-(p3[0]-p1[0])/6).toFixed(1)} ${(p2[1]-(p3[1]-p1[1])/6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`; }
 return d; }
function face(v){ const c = 15 + (v-3)*1.7; return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M8 ${15-(v-3)*.3} Q12 ${c} 16 ${15-(v-3)*.3}"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.6"/></svg>`; }
function ring(sl, b){ const r=60, C=2*Math.PI*r, f=clamp(sl/10,0,1), nf=clamp(b.m/10,0,1), low=(sl-b.m)/b.s<-.6;
 const ang = nf*2*Math.PI - Math.PI/2, tx=75+r*Math.cos(ang), ty=75+r*Math.sin(ang);
 $('#ring').innerHTML = `<circle cx="75" cy="75" r="${r}" fill="none" stroke="rgba(233,244,239,.12)" stroke-width="12"/>
  <circle cx="75" cy="75" r="${r}" fill="none" stroke="${low?'#FF8A6B':'#7FD1B4'}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(f*C).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 75 75)"/>
  <circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="4" fill="#fff"/>
  <text x="75" y="76" text-anchor="middle" font-family="Instrument Serif,Georgia,serif" font-size="30" fill="#fff">${hm(sl).replace(' ','')}</text>
  <text x="75" y="96" text-anchor="middle" font-size="11" fill="#A9CFC0">normal ${hm(b.m).replace(' ','')}</text>`; }
function spark(vals, color){ const W=120,H=30,mn=Math.min(...vals),mx=Math.max(...vals),r=(mx-mn)||1;
 const P = vals.map((v,i)=>[i*W/(vals.length-1), 3+(H-6)*(1-(v-mn)/r)]);
 return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path d="${smooth(P)}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`; }
// ---------- render: today ----------
function base(k, upto){ const a = S.days.slice(Math.max(0,upto-14), upto).map(d=>d[k]); return {m:mean(a), s:sd(a)||1}; }
function renderToday(){
 const D = S.days, L = D.length-1, d = D[L];
 const h = new Date().getHours();
 $('#greet').textContent = h<12 ? 'Good morning' : h<17 ? 'Good afternoon' : 'Good evening';
 $('#todaySub').textContent = `Latest entry ${fmtDate(d.date)}. Everything here is compared with your own last 14 days.`;
 $('#today-date').textContent = new Date().toLocaleDateString('en-IN',{weekday:'long', day:'numeric', month:'long'});
 const b = base('sleep', L), dz = (d.sleep-b.m)/b.s;
 const top = drivers('sleep')[0];
 let big = `You slept ${hm(d.sleep)}, ` + (Math.abs(dz)<.6 ? 'right in your normal range.' : dz<0 ? `${mins(b.m-d.sleep)} less than your normal.` : `${mins(d.sleep-b.m)} more than your normal.`);
 if(dz<-.6 && d.late>45) big += ` You were on your phone for ${d.late} min after 11 pm.`;
 else if(dz<-.6 && d.caffeine>0) big += ` You had ${d.caffeine} cup${d.caffeine>1?'s':''} of coffee or tea after 3 pm.`;
 $('#insBig').textContent = big; ring(d.sleep, b);
 $('#insAct').textContent = top.p<.05 ? `Your strongest sleep link: ${sentence(top,'sleep')}` : 'Keep logging. Gnōthi needs a few more days to find a clear pattern.';
 // nudge
 const lt = drivers('sleep').find(r=>r.f==='late');
 $('#nudgeTitle').textContent = lt && lt.p<.2 ? 'Phone down at 10:45 pm' : 'Wind down at 10:45 pm';
 $('#nudgeWhy').textContent = lt && lt.p<.2 ? `Late phone use is your strongest sleep link right now (${conf(lt.p)[0].toLowerCase()}). Gnōthi sends at most 2 nudges a day.` : 'Based on your usual bedtime. Gnōthi sends at most 2 nudges a day.';
 // metrics
 const M = [['sleep','Sleep',v=>hm(v),1],['steps','Steps',v=>Math.round(v).toLocaleString('en-IN'),1],['rhr','Resting HR',v=>v+' bpm',-1],['late','Phone after 11 pm',v=>v+' min',-1],['mood','Mood',v=>v+'/5',1]];
 const DL = {sleep:v=>mins(v), steps:v=>Math.round(Math.abs(v)).toLocaleString('en-IN'), rhr:v=>Math.round(Math.abs(v))+' bpm', late:v=>Math.round(Math.abs(v))+' min', mood:v=>Math.abs(v).toFixed(1)};
 $('#metrics').innerHTML = M.map(([k,l,f,good]) => { const bb = base(k,L), z = (d[k]-bb.m)/bb.s, dv = d[k]-bb.m; const cls = Math.abs(z)<.5?'flat':(z*good>0?'up':'down');
  const txt = Math.abs(z)<.5 ? 'about your normal' : `${dv>0?'+':'−'}${DL[k](dv)} vs normal`;
  const col = cls==='down' ? 'var(--coral)' : 'var(--accent)';
  return `<div class="metric"><div class="l">${icon(k)}${l}</div><div class="v">${esc(f(d[k]))}</div><div class="d ${cls}">${esc(txt)}</div>${spark(S.days.slice(-14).map(x=>x[k]), col)}</div>`; }).join('');
 drawSleep();
}
const svg = $('#sleepSvg');
function drawSleep(){
 const W = svg.clientWidth, H = svg.clientHeight; if(!W) return;
 const D = S.days.slice(-30), L = S.days.length, b = base('sleep', L);
 const pl = W<520?30:40, pr = 12, pt = 12, pb = 28, lo = 4, hi = 9.5;
 const x = i => pl + i*(W-pl-pr)/Math.max(1,D.length-1), y = v => pt + (hi-v)*(H-pt-pb)/(hi-lo);
 let g = '';
 for(let v=5; v<=9; v++) g += `<line x1="${pl}" x2="${W-pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl-8}" y="${y(v)+4}" text-anchor="end" font-size="12" fill="var(--muted)">${v}h</text>`;
 g += `<rect x="${pl}" width="${W-pl-pr}" y="${y(b.m+b.s)}" height="${y(b.m-b.s)-y(b.m+b.s)}" fill="var(--band)" rx="6"/>`;
 g += `<line x1="${pl}" x2="${W-pr}" y1="${y(b.m)}" y2="${y(b.m)}" stroke="var(--accent)" stroke-dasharray="3 5" opacity=".6"/>`;
 const P = D.map((d,i)=>[x(i), y(d.sleep)]), path = smooth(P);
 g = `<defs><linearGradient id="ar" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".22"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>` + g;
 g += `<path d="${path} L${x(D.length-1)} ${y(lo)} L${x(0)} ${y(lo)}Z" fill="url(#ar)"/>`;
 g += `<path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`;
 g += `<line id="hl" y1="${pt}" y2="${H-pb}" stroke="var(--muted)" stroke-dasharray="2 4" opacity="0"/>`;
 D.forEach((d,i)=>{ const bad = d.late>45, last = i===D.length-1; if(bad || last) g += `<circle cx="${x(i)}" cy="${y(d.sleep)}" r="${last?6:4.2}" fill="${bad?'var(--coral)':'var(--accent)'}" stroke="var(--surface)" stroke-width="2.5"/>`; });
 g += `<circle id="hd" r="5.5" fill="var(--surface)" stroke="var(--accent)" stroke-width="2.5" opacity="0"/>`;
 svg._g = {x, y, D, pl, pr, W};
 const step = W<520 ? 10 : 5;
 D.forEach((d,i)=>{ if(i%step===0 || i===D.length-1) g += `<text x="${x(i)}" y="${H-8}" text-anchor="${i===D.length-1?'end':i===0?'start':'middle'}" font-size="12" fill="var(--muted)">${esc(fmtDate(d.date))}</text>`; });
 svg.innerHTML = g;
}
const ro = new ResizeObserver(drawSleep); ro.observe(svg);
svg.addEventListener('pointermove', e => { const G = svg._g; if(!G) return; const r = svg.getBoundingClientRect(), px = e.clientX - r.left;
 const i = clamp(Math.round((px-G.pl)/((G.W-G.pl-G.pr)/(G.D.length-1))), 0, G.D.length-1), d = G.D[i], X = G.x(i), Y = G.y(d.sleep);
 const hl = $('#hl'), hd = $('#hd'), tip = $('#tip'); hl.setAttribute('x1',X); hl.setAttribute('x2',X); hl.setAttribute('opacity',1);
 hd.setAttribute('cx',X); hd.setAttribute('cy',Y); hd.setAttribute('opacity',1);
 tip.innerHTML = `<b>${esc(hm(d.sleep))}</b><br>${esc(fmtDate(d.date))} · ${esc(d.late)} min phone after 11 pm`;
 tip.style.left = clamp(X, 90, G.W-90) + 'px'; tip.style.top = Math.max(0, Y-70) + 'px'; tip.style.opacity = 1; });
svg.addEventListener('pointerleave', () => { $('#tip').style.opacity = 0; ['#hl','#hd'].forEach(s=>$(s)&&$(s).setAttribute('opacity',0)); });

// ---------- render: why ----------
let OUT = 'sleep';
function renderWhy(){
 const rs = drivers(OUT), maxd = OUT==='sleep' ? 1.2 : 1.5;
 $('#drivers').innerHTML = rs.map(r => {
  const [cl, ck] = conf(r.p), pct = clamp(Math.abs(r.diff)/maxd*50, 2, 50);
  const t = TEMPLATES.find(t=>t.f===r.f && t.o===OUT);
  const side = r.diff>=0 ? `left:50%;width:${pct}%;background:var(--accent)` : `left:${50-pct}%;width:${pct}%;background:var(--coral)`;
  return `<div class="driver"><div><strong>${icon(r.f)}${esc(LAB[r.f][0].toUpperCase()+LAB[r.f].slice(1))}</strong><p>${esc(sentence(r,OUT))}</p></div>
   <div><div class="eff" aria-hidden="true"><span style="${side}"></span></div><div class="efflab">${r.diff>=0?'+':'−'}${esc(fmtDiff(OUT,r.diff))} · p = ${r.p<.001?'<0.001':r.p.toFixed(3)} · ${r.n} days</div></div>
   <div class="row"><span class="chip ${ck}">${cl}</span>${t && !S.active ? `<button class="btn" data-start="${t.id}">Test this</button>`:''}</div></div>`;
 }).join('');
}
$$('.seg button').forEach(b => b.onclick = () => { OUT = b.dataset.o; $$('.seg button').forEach(x=>x.setAttribute('aria-pressed', x===b)); renderWhy(); });

// ---------- render: experiments ----------
function renderExp(){
 const a = S.active;
 if(a){ const t = TEMPLATES.find(x=>x.id===a.id), si = S.days.findIndex(d=>d.date===a.start), done = si<0?[]:S.days.slice(si, si+7);
  const cells = Array.from({length:7},(_,i)=>{ const d = done[i]; return `<span class="${d ? (d.adh ? 'ok':'miss') : ''}">Day ${i+1}</span>`; }).join('');
  $('#activeExp').innerHTML = `<div class="kicker">Running now</div><h2 style="margin-top:4px">${esc(t.name)}</h2><p class="small" style="margin:0">Started ${esc(fmtDate(a.start))}. Log a check-in each day. ${7-done.length} day${7-done.length===1?'':'s'} to go.</p><div class="days">${cells}</div>
   <div class="row"><a class="btn primary" href="#checkin">Today's check-in</a><button class="btn" id="ff">Simulate the rest of the week</button><button class="btn ghost" id="stopExp">Stop experiment</button></div>`;
 } else $('#activeExp').innerHTML = `<div class="kicker">No experiment running</div><h2 style="margin-top:4px">Pick a change below, or use "Test this" on the Why? page.</h2>`;
 $('#tpls').innerHTML = TEMPLATES.map(t => `<div class="tpl"><div><strong>${esc(t.name)}</strong><p>${esc(t.desc)}</p></div><button class="btn" data-start="${t.id}" ${S.active?'disabled':''}>Start</button></div>`).join('');
 const H = S.exps.filter(e=>e.status==='done').map(expResult).filter(Boolean).reverse();
 $('#history').innerHTML = H.length ? H.map(r => { const [cl,ck] = conf(r.w.p), s = r.w.diff>=0?'+':'−';
  return `<div class="result"><strong>${esc(r.t.name)}</strong><div class="num ${r.w.diff>=0?'up':'down'}">${s}${esc(fmtDiff(r.t.o,r.w.diff))} ${r.t.o}</div>
   <div class="ba"><span>Before</span><i style="width:${(r.b/Math.max(r.a,r.b)*100).toFixed(0)}%"></i><b>${esc(fmtF(r.t.o,r.b))}</b><span>During</span><i class="now" style="width:${(r.a/Math.max(r.a,r.b)*100).toFixed(0)}%"></i><b>${esc(fmtF(r.t.o,r.a))}</b></div>
   <p class="small" style="margin:2px 0 8px">Kept to it ${r.kept} of ${r.n} days.</p><span class="chip ${ck}">${cl}</span> <span class="small">p = ${r.w.p<.001?'<0.001':r.w.p.toFixed(3)}</span></div>`; }).join('')
  : '<p class="small">Finished experiments show up here with their measured effect.</p>';
}
function startExp(id){ if(S.active) return; S.active = {id, start: addDays(S.days[S.days.length-1].date, 1)}; save(); renderAll(); location.hash = 'experiments'; toast('Experiment started. Check in each day for a week.'); }
function finishIfDone(){ const a = S.active; if(!a) return; const si = S.days.findIndex(d=>d.date===a.start);
 if(si>=0 && S.days.length-si>=7){ S.exps.push({id:a.id, start:a.start, status:'done'}); S.active = null; toast('Experiment finished. Your result is ready.'); } }
document.addEventListener('click', e => {
 const s = e.target.closest('[data-start]'); if(s) startExp(s.dataset.start);
 if(e.target.id==='stopExp'){ S.active = null; save(); renderAll(); toast('Experiment stopped. Nothing was recorded as a result.'); }
 if(e.target.id==='ff'){ const t = TEMPLATES.find(x=>x.id===S.active.id); R = rng(Date.now()%1e6);
  while(S.active){ const L = S.days[S.days.length-1]; const o = t.id==='phone'?{late:Math.round(R()*12)}:t.id==='coffee'?{caffeine:0}:{steps:Math.round(N(10200,1200))};
   const d = simDay(addDays(L.date,1), L.steps, L.sleep, o); d.adh = t.goal(d)?1:0; d.sim = 1; S.days.push(d); finishIfDone(); }
  save(); renderAll(); }
});

// ---------- check-in ----------
let mood = 3, energy = 3, adh = null;
const FL = {mood:['Low','Meh','Okay','Good','Great'], energy:['Drained','Tired','Okay','Good','Charged']};
function scale(el, get, set){ el.innerHTML = [1,2,3,4,5].map(v=>`<button type="button" data-v="${v}" aria-pressed="${v===get()}" aria-label="${v} of 5">${face(v)}${FL[el.id][v-1]}</button>`).join('');
 el.onclick = e => { const b = e.target.closest('button'); if(!b) return; set(+b.dataset.v); scale(el,get,set); }; }
function renderCheck(){
 const L = S.days[S.days.length-1]; R = rng(L.date.length*997 + L.steps);
 const p = simDay('', L.steps, L.sleep);
 $('#f-sleep').value = p.sleep.toFixed(1); $('#f-steps').value = p.steps; $('#f-rhr').value = p.rhr; $('#f-late').value = p.late; $('#f-caf').value = p.caffeine;
 scale($('#mood'), ()=>mood, v=>mood=v); scale($('#energy'), ()=>energy, v=>energy=v);
 $('#adhWrap').hidden = !S.active;
 $$('#adh button').forEach(b=>{ b.setAttribute('aria-pressed', String(adh===+b.dataset.v)); b.onclick = () => { adh = +b.dataset.v; renderCheck(); }; });
 $('#checkNote').textContent = `This will be saved as ${fmtDate(addDays(L.date,1))}.`;
}
$('#checkForm').onsubmit = e => { e.preventDefault();
 const L = S.days[S.days.length-1];
 const d = {date:addDays(L.date,1), sleep:+$('#f-sleep').value, steps:+$('#f-steps').value, rhr:+$('#f-rhr').value, late:+$('#f-late').value, caffeine:+$('#f-caf').value, mood, energy};
 if(S.active){ const t = TEMPLATES.find(x=>x.id===S.active.id); d.adh = adh===null ? (t.goal(d)?1:0) : adh; }
 S.days.push(d); S.sample = false; adh = null; finishIfDone(); save(); renderAll(); toast('Check-in saved.'); location.hash = 'today'; };

// ---------- vault ----------
const COLS = ['date','sleep','steps','rhr','late','caffeine','mood','energy'];
const toCsv = () => [COLS.join(',')].concat(S.days.map(d=>COLS.map(c=>d[c]).join(','))).join('\n');
function renderVault(){
 $('#vDays').textContent = S.days.length;
 $('#vSize').textContent = (new Blob([JSON.stringify(S)]).size/1024).toFixed(1) + ' KB';
 $('#vTable').innerHTML = `<thead><tr><th>Date</th><th>Sleep</th><th>Steps</th><th>Resting HR</th><th>Phone after 11</th><th>Late caffeine</th><th>Mood</th><th>Energy</th></tr></thead><tbody>` +
  S.days.slice(-14).reverse().map(d=>`<tr><td>${esc(fmtDate(d.date))}</td><td>${esc(hm(d.sleep))}</td><td>${esc(Number(d.steps).toLocaleString('en-IN'))}</td><td>${esc(d.rhr)}</td><td>${esc(d.late)} min</td><td>${esc(d.caffeine)}</td><td>${esc(d.mood)}</td><td>${esc(d.energy)}</td></tr>`).join('') + '</tbody>';
}
$('#expCsv').onclick = () => { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([toCsv()],{type:'text/csv'})); a.download = 'gnothi-data.csv'; document.body.appendChild(a); a.click(); a.remove(); toast('CSV downloaded.'); } catch(e) { toast('Download is blocked here. Use Copy CSV instead.'); } };
$('#copyCsv').onclick = async () => { try { await navigator.clipboard.writeText(toCsv()); toast('CSV copied to clipboard.'); } catch(e) { toast('Copy was blocked by the browser.'); } };
$('#impFile').onchange = async e => { const f = e.target.files[0]; if(!f) return; const txt = await f.text(); e.target.value = '';
 const lines = txt.trim().split(/\r?\n/), head = lines.shift().split(',').map(s=>s.trim().toLowerCase());
 const miss = COLS.filter(c=>!head.includes(c)); if(miss.length) return toast('Missing columns: ' + miss.join(', '));
 const days = lines.map(l => { const v = l.split(','), o = {}; head.forEach((h,i)=>o[h] = h==='date' ? v[i].trim() : +v[i]); return o; }).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d.date) && COLS.slice(1).every(c=>isFinite(d[c])));
 if(days.length < 14) return toast('Need at least 14 valid days to find patterns.');
 days.sort((a,b)=>a.date<b.date?-1:1); S = {days, sample:false, exps:[], active:null}; save(); renderAll(); toast(`Imported ${days.length} days.`); };
$('#resetDemo').onclick = () => { S = makeSample(); save(); renderAll(); toast('Sample data loaded.'); };
$('#wipe').onclick = () => { const d = $('#confirmDlg'); d.showModal ? d.showModal() : d.setAttribute('open',''); };
$('#dlgNo').onclick = () => $('#confirmDlg').close();
$('#dlgYes').onclick = () => { $('#confirmDlg').close(); try { localStorage.removeItem(KEY); } catch(e) {} S = makeSample(); renderAll(); toast('Your data was deleted. Sample data is loaded so you can keep exploring.'); };

// ---------- nudges ----------
$('#testNudge').onclick = () => { const t = $('#nudgeTitle').textContent;
 if(S.notif && 'Notification' in window && Notification.permission==='granted'){ try { new Notification('Gnōthi', {body: t + '. Your sleep will thank you.'}); return; } catch(e) {} }
 toast(t + '. Your sleep will thank you.'); };
$('#notifBtn').onclick = async () => { try { const p = await Notification.requestPermission(); S.notif = p==='granted'; save(); toast(S.notif ? 'Notifications on.' : 'Notifications are blocked here, so nudges show inside the app.'); } catch(e) { toast('Notifications are blocked here, so nudges show inside the app.'); } };

// ---------- routing ----------
const PAGES = ['today','why','experiments','checkin','vault'];
function route(){ const p = PAGES.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'today';
 $$('.page').forEach(s=>s.classList.toggle('on', s.id==='p-'+p)); $$('nav a').forEach(a=>a.dataset.p===p ? a.setAttribute('aria-current','page') : a.removeAttribute('aria-current'));
 if(p==='today') drawSleep(); window.scrollTo(0,0); }
function renderAll(){ $('#demoBanner').hidden = !S.sample; renderToday(); renderWhy(); renderExp(); renderCheck(); renderVault(); }
addEventListener('hashchange', route);
renderAll(); route();
}
