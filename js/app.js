/* ══════════════════════════════════════════
   ⚙️ CONFIGURACIÓN — rellena con tus claves
══════════════════════════════════════════ */
const SUPABASE_URL = '';   // 👈 https://xxxx.supabase.co
const SUPABASE_KEY = '';   // 👈 tu anon public key de Supabase

/* ══════════════════════════════════════════
   CONSTANTES
══════════════════════════════════════════ */
const ML = 29.5735;
const GRPS = {all:'✨ Todos',inicio:'🌱 Primeros pasos',banco:'🍼 Banco de leche',destete:'🌙 Destete','mi-historia':'🌸 Mi historia'};
const ONLINE = !!(SUPABASE_URL && SUPABASE_KEY);
let sb = ONLINE ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2);}
function todayStr(){return new Date().toISOString().split('T')[0];}
function nowTime(){const n=new Date();return`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;}
function fmtT(d){return d.toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'});}
function fmtDate(s){const[,m,d]=s.split('-'),mo=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];return`${parseInt(d)} ${mo[parseInt(m)-1]}`;}
function ago(ts){const d=Date.now()-ts,m=Math.floor(d/60000),h=Math.floor(d/3600000),dy=Math.floor(d/86400000);if(d<60000)return'ahora mismo';if(h<1)return`hace ${m}m`;if(dy<1)return`hace ${h}h`;return dy===1?'ayer':`hace ${dy}d`;}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.style.display='block';t.style.animation='toastIn .3s ease';clearTimeout(t._t);t._t=setTimeout(()=>t.style.display='none',2600);}
function loading(on){document.getElementById('loading-overlay').classList.toggle('show',on);}
function togglePw(id,btn){const i=document.getElementById(id);const s=i.type==='password';i.type=s?'text':'password';btn.textContent=s?'ocultar':'ver';}
function sh(s){let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h)+s.charCodeAt(i);return(h>>>0).toString(16);}

/* ══════════════════════════════════════════
   AUTH NAV
══════════════════════════════════════════ */
function goToAuth(tab){document.getElementById('landing-screen').style.display='none';document.getElementById('auth-screen').style.display='flex';switchTab(tab);}
function backToLanding(){document.getElementById('auth-screen').style.display='none';document.getElementById('landing-screen').style.display='flex';}
function switchTab(t){['login','register'].forEach(x=>{document.getElementById('auth-tab-'+x).classList.toggle('active',x===t);document.getElementById('auth-form-'+x).classList.toggle('active',x===t);});}
function showErr(id,msg){const e=document.getElementById(id);e.textContent=msg;e.style.display='block';}
function clearErr(id){document.getElementById(id).style.display='none';}

/* ══════════════════════════════════════════
   AUTH
══════════════════════════════════════════ */
let sess=null;
function saveSess(){localStorage.setItem('lm_sess',JSON.stringify(sess));}
function loadSess(){return JSON.parse(localStorage.getItem('lm_sess')||'null');}

async function doLogin(){
  const email=document.getElementById('li-email').value.trim().toLowerCase();
  const pass=document.getElementById('li-pass').value;
  clearErr('login-err');
  if(!email||!pass){showErr('login-err','Completa todos los campos.');return;}
  loading(true);
  try{
    if(ONLINE){
      const{data,error}=await sb.auth.signInWithPassword({email,password:pass});
      if(error)throw error;
      const{data:prof}=await sb.from('profiles').select('*').eq('id',data.user.id).single();
      sess={uid:data.user.id,email,name:prof?.display_name,username:prof?.username,settings:prof?.settings||{unit:'oz'}};
    } else {
      const u=JSON.parse(localStorage.getItem('lm_users')||'{}')[email];
      if(!u||u.h!==sh(pass))throw new Error('Correo o contraseña incorrectos.');
      sess={uid:u.id,email,name:u.name,username:u.username,settings:u.settings||{unit:'oz'},plan:u.plan||'free'};
    }
    saveSess(); await launchApp();
  } catch(e){showErr('login-err',e.message||'Error al iniciar sesión.');}
  finally{loading(false);}
}
async function doRegister(){
  const name=document.getElementById('rg-name').value.trim();
  const username=document.getElementById('rg-user').value.trim().toLowerCase().replace(/\s+/g,'');
  const email=document.getElementById('rg-email').value.trim().toLowerCase();
  const pass=document.getElementById('rg-pass').value;
  const pass2=document.getElementById('rg-pass2').value;
  clearErr('reg-err');
  if(!name||!username||!email||!pass){showErr('reg-err','Completa todos los campos.');return;}
  if(username.length<3){showErr('reg-err','El usuario debe tener al menos 3 caracteres.');return;}
  if(pass.length<6){showErr('reg-err','La contraseña debe tener al menos 6 caracteres.');return;}
  if(pass!==pass2){showErr('reg-err','Las contraseñas no coinciden.');return;}
  loading(true);
  try{
    if(ONLINE){
      const{data,error}=await sb.auth.signUp({email,password:pass,options:{data:{username,display_name:name}}});
      if(error)throw error;
      sess={uid:data.user.id,email,name,username,settings:{unit:'oz',notif:false,vibrate:false}};
    } else {
      const users=JSON.parse(localStorage.getItem('lm_users')||'{}');
      if(users[email])throw new Error('Ese correo ya está registrado.');
      const id=uid();
      users[email]={id,name,username,h:sh(pass),settings:{unit:'oz'}};
      localStorage.setItem('lm_users',JSON.stringify(users));
      sess={uid:id,email,name,username,settings:{unit:'oz',notif:false,vibrate:false},plan:'free'};
    }
    saveSess(); await launchApp();
    toast('🎉 ¡Bienvenida, '+name+'!');
  } catch(e){showErr('reg-err',e.message||'Error al registrarse.');}
  finally{loading(false);}
}
function doLogout(){
  if(!confirm('¿Cerrar sesión?'))return;
  clearAlarm();
  if(ONLINE) sb.auth.signOut();
  localStorage.removeItem('lm_sess');
  sess=null;
  document.getElementById('app-shell').style.display='none';
  document.getElementById('landing-screen').style.display='flex';
  toast('👋 Sesión cerrada');
}

/* ══════════════════════════════════════════
   APP LAUNCH
══════════════════════════════════════════ */
let extr=[], cfg={unit:'oz',notif:false,vibrate:false};

async function launchApp(){
  document.getElementById('auth-screen').style.display='none';
  document.getElementById('landing-screen').style.display='none';
  document.getElementById('app-shell').style.display='block';
  document.getElementById('hdr-name').textContent=sess.name||sess.username;
  cfg=sess.settings||{unit:'oz',notif:false,vibrate:false};
  if(!ONLINE){
    document.getElementById('setup-banner').classList.add('show');
    extr=JSON.parse(localStorage.getItem(`lm_${sess.uid}_extr`)||'[]');
  } else {
    const{data}=await sb.from('extractions').select('*').eq('user_id',sess.uid).order('date',{ascending:false}).order('time',{ascending:false});
    extr=(data||[]).map(r=>({id:r.id,date:r.date,time:r.time.slice(0,5),amountMl:parseFloat(r.amount_ml)||0,duration:r.duration||0,notes:r.notes||'',storage:r.storage||''}));
  }
  aH=2;aM=0;syncSt();renderList();showTab('inicio');
  document.getElementById('alarm-t').value=nowTime();
}

/* ══════════════════════════════════════════
   APP STATE
══════════════════════════════════════════ */
let editId=null, selSt=null;
let aH=2, aM=0, aTimer=null, aNext=null, aCdI=null;
let curGrp='all', pGrp='inicio';

function disp(ml){return cfg.unit==='oz'?+(ml/ML).toFixed(2):Math.round(ml);}
function toMl(v){return cfg.unit==='oz'?v*ML:v;}
function ul(){return cfg.unit;}
function fa(ml){const v=disp(ml);return v+(cfg.unit==='oz'?' oz':' ml');}

async function saveExtr(e){
  if(ONLINE){
    const row={user_id:sess.uid,date:e.date,time:e.time,amount_ml:e.amountMl,duration:e.duration,notes:e.notes,storage:e.storage||''};
    if(editId){await sb.from('extractions').update(row).eq('id',editId);}
    else{const{data}=await sb.from('extractions').insert(row).select().single();if(data)e.id=data.id;}
  } else {
    localStorage.setItem(`lm_${sess.uid}_extr`,JSON.stringify(extr));
  }
}
async function saveCfgDB(){
  if(ONLINE){await sb.from('profiles').update({settings:cfg}).eq('id',sess.uid);}
  else{const u=JSON.parse(localStorage.getItem('lm_users')||'{}');if(u[sess.email]){u[sess.email].settings=cfg;localStorage.setItem('lm_users',JSON.stringify(u));}}
  sess.settings=cfg;saveSess();
}

/* ══════════════════════════════════════════
   TABS
══════════════════════════════════════════ */
function showTab(tab){
  ['inicio','registro','estadisticas','alarma','comunidad','perfil'].forEach(t=>{
    const pg = document.getElementById('page-'+t);
    if(pg) pg.style.display = t===tab ? 'block' : 'none';
    const nb = document.getElementById('nav-'+t);
    if(nb) nb.classList.toggle('active', t===tab);
  });
  document.getElementById('main-fab').style.display   = tab==='registro'  ? 'flex' : 'none';
  document.getElementById('comm-fab').style.display   = tab==='comunidad' ? 'flex' : 'none';
  document.getElementById('hbtn-comm').classList.toggle('active', tab==='comunidad');
  if(tab==='inicio')     renderInicio();
  if(tab==='estadisticas') renderStats();
  if(tab==='alarma')     renderAlarm();
  if(tab==='comunidad')  renderPosts();
  if(tab==='perfil')     renderPerfil();
}

/* ══════════════════════════════════════════
   STREAK
══════════════════════════════════════════ */
function calcStreak(){
  if(!extr.length) return 0;
  const dates = [...new Set(extr.map(e=>e.date))].sort((a,b)=>b.localeCompare(a));
  const today = todayStr();
  const yest  = new Date(); yest.setDate(yest.getDate()-1);
  const yestStr = yest.toISOString().split('T')[0];
  // La racha solo cuenta si extrajiste hoy o ayer
  if(dates[0] !== today && dates[0] !== yestStr) return 0;
  let streak = 0;
  let check  = new Date(dates[0]+'T12:00:00');
  for(const d of dates){
    if(d === check.toISOString().split('T')[0]){
      streak++;
      check.setDate(check.getDate()-1);
    } else break;
  }
  return streak;
}

/* ══════════════════════════════════════════
   RENDER INICIO
══════════════════════════════════════════ */
function renderInicio(){
  // Saludo por hora
  const h = new Date().getHours();
  const greeting = h<12 ? 'Buenos días' : h<19 ? 'Buenas tardes' : 'Buenas noches';
  document.getElementById('greeting-time').textContent = greeting;
  document.getElementById('greeting-name').textContent = sess?.name || sess?.username || '—';

  // Stats de hoy
  const today = todayStr();
  const todayExtr = extr.filter(e=>e.date===today);
  const todayMl   = todayExtr.reduce((s,e)=>s+(e.amountMl||0),0);
  document.getElementById('h-today').textContent    = fa(todayMl);
  document.getElementById('h-sessions').textContent = todayExtr.length;

  // Subtítulo según el día
  const sub = todayExtr.length === 0
    ? '¿Lista para registrar tu extracción de hoy?'
    : `¡Vas genial! ${todayExtr.length} sesión${todayExtr.length>1?'es':''} hoy 🌸`;
  document.getElementById('greeting-sub').textContent = sub;

  // Streak
  const streak = calcStreak();
  const sc = document.getElementById('streak-card');
  document.getElementById('streak-count').textContent = streak;
  document.getElementById('streak-lbl').textContent   = streak === 0
    ? 'días seguidos · ¡empieza hoy!'
    : streak === 1 ? 'día seguido · ¡sigue así!'
    : `días seguidos · ${streak>=7?'🏆 increíble':'¡sigue así!'}`;
  sc.classList.toggle('streak-zero', streak===0);

  // Alarma activa
  const alarmCard = document.getElementById('home-alarm-card');
  if(aNext){
    alarmCard.style.display = 'flex';
    document.getElementById('h-alarm-time').textContent = fmtT(aNext);
    const msLeft = aNext - Date.now();
    document.getElementById('h-alarm-cd').textContent = msLeft>0 ? 'en '+fmtCD(msLeft) : '¡Hora de extraer! 🫧';
  } else {
    alarmCard.style.display = 'none';
  }

  // Últimas 3 extracciones
  const recent = document.getElementById('home-recent');
  if(!extr.length){
    recent.innerHTML = '<div class="home-empty"><div style="font-size:2rem">🫧</div><p>Aún no tienes extracciones.<br/>¡Registra tu primera ahora!</p></div>';
    return;
  }
  recent.innerHTML = extr.slice(0,3).map(e=>{
    const stor = e.storage==='frozen'?'❄️ Congelada':e.storage==='refrigerated'?'🧊 Refrigerada':'';
    return `<div class="home-ext-item">
      <div class="home-ext-left">
        <div class="home-ext-time">${e.time} · ${fmtDate(e.date)}</div>
        <div class="home-ext-meta">${stor||'Sin almacenamiento'}${e.duration?' · ⏱ '+e.duration+' min':''}</div>
      </div>
      <div><div class="home-ext-amt">${disp(e.amountMl||0)}</div><div class="home-ext-unit">${ul()}</div></div>
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════════
   RENDER PERFIL
══════════════════════════════════════════ */
function renderPerfil(){
  const initial = (sess?.name||sess?.username||'M').slice(0,1).toUpperCase();
  document.getElementById('perf-avatar').textContent  = initial;
  document.getElementById('perf-name').textContent    = sess?.name || sess?.username || '—';
  document.getElementById('perf-email').textContent   = sess?.email || '—';
  document.getElementById('s-uname').textContent      = (sess?.name||sess?.username||'—')+' · '+sess?.email;

  // Fecha miembro
  const since = sess?.createdAt ? new Date(sess.createdAt).toLocaleDateString('es-CO',{year:'numeric',month:'long'}) : '';
  document.getElementById('perf-since').textContent = since ? 'Miembro desde '+since : '';

  // Plan
  const premium = isPremium();
  const badge   = document.getElementById('perf-plan-badge');
  badge.className = 'plan-badge '+(premium?'premium':'free');
  badge.textContent = premium ? '✨ LactaMe+' : '🫧 Plan Gratis';
  document.getElementById('upgrade-card').style.display = premium ? 'none' : 'flex';

  // Ajustes
  document.getElementById('btn-ml').classList.toggle('active', cfg.unit==='ml');
  document.getElementById('btn-oz').classList.toggle('active', cfg.unit==='oz');
  document.getElementById('conv-txt').textContent = cfg.unit==='oz' ? '1 oz = 29.574 ml' : 'Mostrando en ml';
  document.getElementById('tgl-notif').checked = cfg.notif||false;
  document.getElementById('tgl-vib').checked   = cfg.vibrate||false;
  document.getElementById('s-cnt').textContent  = `${extr.length} extracción${extr.length!==1?'es':''}`;

  // Dark mode toggle
  const isDark = document.documentElement.getAttribute('data-theme')==='dark';
  document.getElementById('tgl-theme').checked = isDark;
  document.getElementById('theme-icon').textContent = isDark ? '☀️' : '🌙';
}

/* ══════════════════════════════════════════
   DARK MODE
══════════════════════════════════════════ */
function toggleTheme(on){
  const theme = on ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('lm_theme', theme);
  document.getElementById('theme-icon').textContent = on ? '☀️' : '🌙';
  // Actualizar theme-color meta
  document.querySelector('meta[name="theme-color"][media*="light"]').content = on ? '#1a1410' : '#fdf6ee';
}

function initTheme(){
  const saved = localStorage.getItem('lm_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
}

/* ══════════════════════════════════════════
   EXTRACTION MODAL
══════════════════════════════════════════ */
function openExtModal(id){
  editId=id;
  if(id){const e=extr.find(x=>x.id===id);document.getElementById('ext-title').textContent='Editar Extracción';document.getElementById('f-date').value=e.date;document.getElementById('f-time').value=e.time;document.getElementById('f-amt').value=e.amountMl?disp(e.amountMl):'';document.getElementById('f-dur').value=e.duration||'';document.getElementById('f-notes').value=e.notes||'';selSt=e.storage||null;}
  else{document.getElementById('ext-title').textContent='Nueva Extracción';document.getElementById('f-date').value=todayStr();document.getElementById('f-time').value=nowTime();document.getElementById('f-amt').value='';document.getElementById('f-dur').value='';document.getElementById('f-notes').value='';selSt=null;}
  syncAL();updSB();
  document.getElementById('modal-ext').style.display='flex';
}
function closeOv(e,id){if(e&&e.target!==document.getElementById(id))return;document.getElementById(id).style.display='none';editId=null;selSt=null;}
function selStor(s){selSt=selSt===s?null:s;updSB();}
function updSB(){document.getElementById('sbr').className='stor-btn'+(selSt==='ref'?' sr':'');document.getElementById('sbf').className='stor-btn'+(selSt==='frz'?' sf':'');}
function syncAL(){document.getElementById('f-amt-lbl').textContent=`Cantidad (${ul()})`;document.getElementById('f-amt').placeholder=cfg.unit==='oz'?'Ej: 3.0':'Ej: 80';document.getElementById('f-amt').step=cfg.unit==='oz'?'0.1':'1';}
async function saveExt(){
  const date=document.getElementById('f-date').value,time=document.getElementById('f-time').value;
  const amountMl=toMl(parseFloat(document.getElementById('f-amt').value)||0);
  const duration=parseInt(document.getElementById('f-dur').value)||0;
  const notes=document.getElementById('f-notes').value.trim();
  if(!date||!time){toast('⚠️ Ingresa fecha y hora');return;}
  loading(true);
  try{
    const storage=selSt==='frz'?'frozen':selSt==='ref'?'refrigerated':'';
    if(editId){const i=extr.findIndex(e=>e.id===editId);extr[i]={...extr[i],date,time,amountMl,duration,notes,storage};await saveExtr(extr[i]);}
    else{const ne={id:uid(),date,time,amountMl,duration,notes,storage};extr.unshift(ne);await saveExtr(ne);}
    extr.sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
    closeOv(null,'modal-ext');renderList();
    toast(editId?'✅ Extracción actualizada':'✅ Extracción registrada');
  } catch(e){toast('❌ Error: '+e.message);}
  finally{loading(false);}
}
async function delExt(id){
  if(!confirm('¿Eliminar esta extracción?'))return;
  loading(true);
  try{
    extr=extr.filter(e=>e.id!==id);
    if(ONLINE){await sb.from('extractions').delete().eq('id',id);}
    else localStorage.setItem(`lm_${sess.uid}_extr`,JSON.stringify(extr));
    renderList();toast('🗑️ Eliminada');
  } catch(e){toast('❌ Error: '+e.message);}
  finally{loading(false);}
}

/* ══════════════════════════════════════════
   LIST
══════════════════════════════════════════ */
function renderList(){
  const list=document.getElementById('ext-list');
  updQS();
  if(!extr.length){list.innerHTML=`<div class="empty"><div class="empty-icon">🫧</div><h3>Sin extracciones aún</h3><p>Presiona el botón de abajo para registrar tu primera extracción.</p></div>`;return;}
  const g={};extr.forEach(e=>{if(!g[e.date])g[e.date]=[];g[e.date].push(e);});
  let html='';
  Object.keys(g).sort((a,b)=>b.localeCompare(a)).forEach(date=>{
    const dm=g[date].reduce((s,e)=>s+(e.amountMl||0),0);
    html+=`<div class="day-hdr"><span>${fmtDate(date)}</span><span>${fa(dm)}</span></div>`;
    g[date].forEach(e=>{
      const sc=e.storage==='frozen'?'frozen':e.storage==='refrigerated'?'ref':'';
      const sb2=e.storage==='frozen'?'<span class="badge bf">❄️ Congelada</span>':e.storage==='refrigerated'?'<span class="badge br">🧊 Refrigerada</span>':'';
      const db=e.duration?`<span class="badge bd">⏱ ${e.duration} min</span>`:'';
      const nh=e.notes?`<div class="card-notes">📝 ${esc(e.notes)}</div>`:'';
      html+=`<div class="ext-card ${sc}"><div class="card-top"><div class="card-time">${e.time}</div><div class="card-amt">${disp(e.amountMl||0)} <span>${ul()}</span></div></div><div class="card-meta">${db}${sb2}</div>${nh}<div class="card-actions"><button class="btn-edit" onclick="openExtModal('${e.id}')">✏️ Editar</button><button class="btn-del" onclick="delExt('${e.id}')">🗑 Eliminar</button></div></div>`;
    });
  });
  list.innerHTML=html;
}
function updQS(){
  const t=todayStr(),tm=extr.filter(e=>e.date===t).reduce((s,e)=>s+(e.amountMl||0),0);
  document.getElementById('s-today').textContent=fa(tm);
  document.getElementById('s-total').textContent=extr.length;
}

/* ══════════════════════════════════════════
   STATS
══════════════════════════════════════════ */
function renderStats(){
  const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push(d.toISOString().split('T')[0]);}
  const tots=days.map(d=>extr.filter(e=>e.date===d).reduce((s,e)=>s+(e.amountMl||0),0));
  const mx=Math.max(...tots,1);
  const dn=['Do','Lu','Ma','Mi','Ju','Vi','Sa'];
  document.getElementById('wct').textContent=`📈 Últimos 7 días (${ul()})`;
  const bE=document.getElementById('week-bars'),lE=document.getElementById('week-lbls');
  bE.innerHTML='';lE.innerHTML='';
  days.forEach((d,i)=>{
    const pct=Math.round((tots[i]/mx)*100);
    bE.innerHTML+=`<div class="bar-col"><span class="bar-val">${tots[i]?disp(tots[i]):''}</span><div class="bar" style="height:${pct}%;min-height:${tots[i]?'4px':'0'}"></div></div>`;
    lE.innerHTML+=`<span class="bar-lbl" style="flex:1;text-align:center">${dn[new Date(d+'T12:00:00').getDay()]}</span>`;
  });
  const tm=extr.reduce((s,e)=>s+(e.amountMl||0),0);
  document.getElementById('s-avg').textContent=fa(extr.length?tm/extr.length:0);
  document.getElementById('s-frz').textContent=extr.filter(e=>e.storage==='frozen').length;
  document.getElementById('s-wtot').textContent=fa(tots.reduce((a,b)=>a+b,0));
  document.getElementById('s-rfr').textContent=extr.filter(e=>e.storage==='refrigerated').length;
}

/* ══════════════════════════════════════════
   ALARM
══════════════════════════════════════════ */
function syncSt(){document.getElementById('iv-h').textContent=aH;document.getElementById('iv-m').textContent=String(aM).padStart(2,'0');}
function adjI(p,d){if(p==='h'){aH=Math.max(0,Math.min(23,aH+d));if(aH===0&&aM===0)aM=15;}else{aM+=d;if(aM<0)aM=45;if(aM>45)aM=0;}syncSt();syncPHL();}
function applyPreset(h,m){aH=h;aM=m;syncSt();syncPHL();}
function syncPHL(){document.querySelectorAll('.pchip').forEach(c=>c.classList.toggle('active',parseInt(c.dataset.h)===aH&&parseInt(c.dataset.m)===aM));}
function activateAlarm(){
  const ms=(aH*60+aM)*60000;if(ms<60000){toast('⚠️ Intervalo mínimo: 1 minuto');return;}
  const sv=document.getElementById('alarm-t').value,now=new Date();let base;
  if(sv){const[hh,mm]=sv.split(':').map(Number);base=new Date(now);base.setHours(hh,mm,0,0);if(base<=now)base.setDate(base.getDate()+1);}
  else base=new Date(now.getTime()+ms);
  schedAlarm(base);renderAlarm();toast('🔔 Alarma activada para las '+fmtT(base));
}
function schedAlarm(n){clearAlarm();aNext=n;const ms=n-Date.now();if(ms>0)aTimer=setTimeout(()=>fireAlarm(n),ms);aCdI=setInterval(()=>{const el=document.getElementById('nal-cd');if(el){const r=aNext-Date.now();el.textContent=r>0?fmtCD(r):'¡Hora de extraer! 🫧';}},1000);}
function fireAlarm(base){toast('🫧 ¡Hora de tu extracción!');if(cfg.vibrate&&navigator.vibrate)navigator.vibrate([300,100,300]);if(cfg.notif&&'Notification'in window&&Notification.permission==='granted')new Notification('LactaMe',{body:'¡Es hora de tu extracción!'});schedAlarm(new Date(base.getTime()+(aH*60+aM)*60000));renderAlarm();}
function stopAlarm(){clearAlarm();aNext=null;renderAlarm();toast('⏹ Alarma desactivada');}
function clearAlarm(){if(aTimer)clearTimeout(aTimer);if(aCdI)clearInterval(aCdI);aTimer=null;aCdI=null;}
function fmtCD(ms){const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000);return h>0?`${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`:`${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;}
function iLbl(){if(aH>0&&aM>0)return`${aH}h ${aM}m`;if(aH>0)return`${aH}h`;return`${aM} min`;}
function renderAlarm(){const a=document.getElementById('alarm-status');if(!aNext){a.innerHTML='';return;}a.innerHTML=`<div class="alarm-active"><div class="aa-top"><div class="aa-dot"></div><div class="aa-lbl">Alarma activa</div></div><div class="aa-time">${fmtT(aNext)}</div><div class="aa-cd" id="nal-cd">${fmtCD(Math.max(0,aNext-Date.now()))}</div><div class="aa-foot"><div class="aa-int">🔁 Cada ${iLbl()}</div><button class="btn-stop" onclick="stopAlarm()">⏹ Detener</button></div></div>`;}

/* ══════════════════════════════════════════
   COMMUNITY
══════════════════════════════════════════ */
async function getPosts(grp){
  if(ONLINE){
    let q=sb.from('posts').select('*, likes(count)').order('created_at',{ascending:false});
    if(grp!=='all')q=q.eq('group_name',grp);
    const{data}=await q;
    return(data||[]).map(p=>({id:p.id,uid:p.user_id,name:p.display_name,uname:p.username,grp:p.group_name,title:p.title||'',body:p.body,anon:p.anonymous,ts:new Date(p.created_at).getTime(),likes:p.likes?.[0]?.count||0}));
  } else {
    const all=JSON.parse(localStorage.getItem('lm_posts')||'[]');
    return grp==='all'?all:all.filter(p=>p.grp===grp);
  }
}
async function getLiked(){
  if(ONLINE){const{data}=await sb.from('likes').select('post_id').eq('user_id',sess.uid);return new Set((data||[]).map(l=>l.post_id));}
  return new Set(JSON.parse(localStorage.getItem(`lm_liked_${sess.uid}`)||'[]'));
}
function filterGrp(g){curGrp=g;document.querySelectorAll('.gchip').forEach(c=>c.classList.toggle('active',c.dataset.g===g));renderPosts();}
async function renderPosts(){
  const list=document.getElementById('posts-list'),emp=document.getElementById('posts-empty');
  list.innerHTML='';emp.style.display='none';loading(true);
  try{
    const[posts,liked]=await Promise.all([getPosts(curGrp),getLiked()]);
    if(!posts.length){emp.style.display='block';return;}
    list.innerHTML=posts.map(p=>{
      const own=p.uid===sess.uid,lkd=liked.has(p.id);
      const ini=p.anon?'?':(p.name||p.uname||'M').slice(0,1).toUpperCase();
      const auth=p.anon?'Anónima':esc(p.name||p.uname)+(own?' <span style="font-size:.62rem;color:var(--rose-dark);font-weight:500">(tú)</span>':'');
      const titleHtml=p.title?`<div class="post-title">${esc(p.title)}</div>`:'';
      return`<div class="post-card"><div class="post-hdr"><div class="post-av${p.anon?' anon':''}">${p.anon?'🎭':ini}</div><div><div class="post-auth${p.anon?' anon':''}">${auth}</div><div class="post-time">${ago(p.ts)}</div></div></div><div class="post-gbadge">${GRPS[p.grp]||p.grp}</div>${titleHtml}<div class="post-body">${esc(p.body)}</div><div class="post-foot"><button class="btn-like${lkd?' liked':''}" onclick="togLike('${p.id}')">${lkd?'❤️':'🤍'} ${p.likes||0}</button></div></div>`;
    }).join('');
  } catch{toast('❌ Error cargando posts');}
  finally{loading(false);}
}
async function togLike(pid){
  try{
    if(ONLINE){const{data}=await sb.from('likes').select('id').eq('post_id',pid).eq('user_id',sess.uid).single();if(data){await sb.from('likes').delete().eq('id',data.id);}else{await sb.from('likes').insert({post_id:pid,user_id:sess.uid});}}
    else{const key=`lm_liked_${sess.uid}`;const liked=new Set(JSON.parse(localStorage.getItem(key)||'[]'));if(liked.has(pid))liked.delete(pid);else liked.add(pid);localStorage.setItem(key,JSON.stringify([...liked]));}
    renderPosts();
  } catch{}
}
function openPostModal(){document.getElementById('p-title').value='';document.getElementById('p-body').value='';document.getElementById('anon-cb').checked=false;selPG(curGrp==='all'?'inicio':curGrp);document.getElementById('modal-post').style.display='flex';}
function selPG(g){pGrp=g;document.querySelectorAll('.gselbtn').forEach(b=>b.classList.toggle('active',b.dataset.g===g));}
async function savePost(){
  const title=document.getElementById('p-title').value.trim();
  const body=document.getElementById('p-body').value.trim();
  if(!body){toast('⚠️ Escribe algo antes de publicar');return;}
  const anon=document.getElementById('anon-cb').checked;
  loading(true);
  try{
    if(ONLINE){await sb.from('posts').insert({user_id:sess.uid,display_name:sess.name,username:sess.username,group_name:pGrp,title,body,anonymous:anon});}
    else{const ps=JSON.parse(localStorage.getItem('lm_posts')||'[]');ps.unshift({id:uid(),uid:sess.uid,name:sess.name,uname:sess.username,grp:pGrp,title,body,anon,ts:Date.now(),likes:0});localStorage.setItem('lm_posts',JSON.stringify(ps));}
    closeOv(null,'modal-post');
    if(curGrp!=='all'&&curGrp!==pGrp)filterGrp(pGrp);else renderPosts();
    toast(anon?'🎭 Publicado de forma anónima':'💬 ¡Publicación compartida!');
  } catch(e){toast('❌ Error: '+e.message);}
  finally{loading(false);}
}

/* ══════════════════════════════════════════
   SUSCRIPCIÓN (UI — integración de pago pendiente)
══════════════════════════════════════════ */
let subPeriodSel = 'mes';

function subPeriod(p){
  subPeriodSel = p;
  document.getElementById('sub-btn-mes').classList.toggle('active', p==='mes');
  document.getElementById('sub-btn-año').classList.toggle('active', p==='año');
  document.getElementById('sub-price').textContent = p==='mes' ? '$4.99' : '$3.33';
  document.getElementById('sub-period-lbl').textContent = p==='mes' ? 'por mes' : 'por mes · cobrado anual';
}

function openSubModal(){
  document.getElementById('modal-sub').style.display='flex';
}

function subUpgrade(){
  toast('🚀 ¡Próximamente! Te notificaremos al lanzar LactaMe+');
  closeOv(null,'modal-sub');
}

function isPremium(){
  return sess?.plan === 'premium';
}

/* ══════════════════════════════════════════
   SETTINGS (ahora inline en tab Perfil)
══════════════════════════════════════════ */
function setUnit(u){cfg.unit=u;saveCfgDB();document.getElementById('btn-ml').classList.toggle('active',u==='ml');document.getElementById('btn-oz').classList.toggle('active',u==='oz');document.getElementById('conv-txt').textContent=u==='oz'?'1 oz = 29.574 ml':'Mostrando en ml';renderList();if(document.getElementById('page-estadisticas').style.display!=='none')renderStats();toast(u==='oz'?'✅ Cambiado a oz':'✅ Cambiado a ml');}
function setNotif(on){cfg.notif=on;saveCfgDB();if(on&&'Notification'in window&&Notification.permission==='default')Notification.requestPermission().then(p=>{if(p!=='granted'){document.getElementById('tgl-notif').checked=false;cfg.notif=false;saveCfgDB();toast('⚠️ Permiso denegado');}});}
function setVib(on){cfg.vibrate=on;saveCfgDB();}
async function clearData(){
  if(!confirm('¿Borrar todas tus extracciones?'))return;
  loading(true);
  try{
    if(ONLINE){await sb.from('extractions').delete().eq('user_id',sess.uid);}
    else localStorage.setItem(`lm_${sess.uid}_extr`,'[]');
    extr=[];renderList();document.getElementById('s-cnt').textContent='0 extracciones';toast('🗑️ Datos eliminados');
  } finally{loading(false);}
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
initTheme(); // Aplica tema antes de renderizar

(async()=>{
  if(ONLINE){
    const{data:{session}}=await sb.auth.getSession();
    if(session){
      const{data:prof}=await sb.from('profiles').select('*').eq('id',session.user.id).single();
      sess={
        uid:session.user.id,
        email:session.user.email,
        name:prof?.display_name||session.user.user_metadata?.display_name,
        username:prof?.username||session.user.user_metadata?.username,
        settings:prof?.settings||{unit:'oz'},
        plan:prof?.plan||'free',
        createdAt:session.user.created_at
      };
      await launchApp();return;
    }
  } else {
    const s=loadSess();
    if(s){sess=s;await launchApp();return;}
  }
  document.getElementById('landing-screen').style.display='flex';
})();

document.getElementById('li-pass').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
document.getElementById('rg-pass2').addEventListener('keydown',e=>{if(e.key==='Enter')doRegister();});
