/* ══════════════════════════════════════════
   ⚙️ CONFIGURACIÓN — rellena con tus claves
══════════════════════════════════════════ */
const SUPABASE_URL = 'https://yftvlnxklivotkygqrbr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmdHZsbnhrbGl2b3RreWdxcmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjA0ODYsImV4cCI6MjA4OTg5NjQ4Nn0.4N1qby02sVeIFRO-TZ-cAZMErtNGfzKcj57SlF_uywA';

/* ══════════════════════════════════════════
   CONSTANTES
══════════════════════════════════════════ */
const ML = 29.5735;
const GRPS = {all:'✨ Todos',inicio:'🌱 Primeros pasos',banco:'🍼 Banco de leche',destete:'🌙 Destete','mi-historia':'🌸 Mi historia'};
const ROLES = {
  owner:            {lbl:'Owner',             icon:'👑', cls:'role-owner'},
  admin:            {lbl:'Admin',             icon:'🛡️', cls:'role-admin'},
  embajadora:       {lbl:'Embajadora',        icon:'🌟', cls:'role-emb'},
  nutricionista:    {lbl:'Nutricionista',     icon:'🥗', cls:'role-nutri'},
  pediatra:         {lbl:'Pediatra',          icon:'🩺', cls:'role-ped'},
  asesora_lactancia:{lbl:'Asesora Lactancia', icon:'🤱', cls:'role-asesora'},
  usuaria:          {lbl:'',                  icon:'',   cls:''},
};
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
      const roleFromDB=prof?.role||'usuaria';
      sess={uid:data.user.id,email,name:prof?.display_name,username:prof?.username,settings:prof?.settings||{unit:'oz'},plan:prof?.plan||'free',role:roleFromDB,trialEndsAt:prof?.trial_ends_at||null};
      if(email==='vmbarreto.pro@gmail.com'){sess.role='owner';sess.plan='premium';sess.trialEndsAt=null;}
    } else {
      const u=JSON.parse(localStorage.getItem('lm_users')||'{}')[email];
      if(!u||u.h!==sh(pass))throw new Error('Correo o contraseña incorrectos.');
      sess={uid:u.id,email,name:u.name,username:u.username,settings:u.settings||{unit:'oz'},plan:u.plan||'free',role:u.role||'usuaria'};
    }
    saveSess(); await launchApp();
  } catch(e){showErr('login-err',e.message||'Error al iniciar sesión.');}
  finally{loading(false);}
}
async function doGoogleLogin(){
  if(!ONLINE){toast('Google solo disponible en línea.');return;}
  loading(true);
  try{
    const{error}=await sb.auth.signInWithOAuth({
      provider:'google',
      options:{redirectTo:window.location.origin}
    });
    if(error)throw error;
  }catch(e){toast('Error con Google: '+e.message);}
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
    checkWelcome();
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
  const hdrName=document.getElementById('hdr-name');if(hdrName)hdrName.textContent=sess.name||sess.username;
  cfg=sess.settings||{unit:'oz',notif:false,vibrate:false};
  if(!ONLINE){
    document.getElementById('setup-banner').classList.add('show');
    extr=JSON.parse(localStorage.getItem(`lm_${sess.uid}_extr`)||'[]');
  } else {
    const{data}=await sb.from('extractions').select('*').eq('user_id',sess.uid).order('date',{ascending:false}).order('time',{ascending:false});
    extr=(data||[]).map(r=>({id:r.id,date:r.date,time:r.time.slice(0,5),amountMl:parseFloat(r.amount_ml)||0,duration:r.duration||0,notes:r.notes||'',storage:r.storage||''}));
  }
  aH=2;aM=0;syncSt();renderList();showTab('inicio');
  const alarmInput=document.getElementById('alarm-t');if(alarmInput)alarmInput.value=nowTime();
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
function closeAllPanels(){
  // Cierra paneles de alarma
  alarmPanelOpen = false;
  statsAlarmPanelOpen = false;
  const p1 = document.getElementById('alarm-config-panel');
  const p2 = document.getElementById('alarm-config-panel-stats');
  if(p1) p1.style.display = 'none';
  if(p2) p2.style.display = 'none';
  // Cierra todos los modales overlay
  ['modal-ext','modal-post','modal-sub','modal-measure','modal-contact'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.style.display = 'none';
  });
}

function showTab(tab){
  closeAllPanels();
  ['inicio','estadisticas','bebe','comunidad','perfil'].forEach(t=>{
    const pg = document.getElementById('page-'+t);
    if(pg) pg.style.display = t===tab ? 'block' : 'none';
    const nb = document.getElementById('nav-'+t);
    if(nb) nb.classList.toggle('active', t===tab);
  });
  document.getElementById('comm-fab').style.display = (tab==='comunidad' && isPremium()) ? 'flex' : 'none';
  if(tab==='inicio')        renderInicio();
  if(tab==='estadisticas')  { renderList(); renderStatsAlarm(); }
  if(tab==='bebe')          renderBebe();
  if(tab==='comunidad')     renderPosts();
  if(tab==='perfil')        renderPerfil();
}

function goToAlarm(){
  showTab('estadisticas');
  // Abrir el panel de alarma automáticamente después de renderizar
  setTimeout(()=>{
    statsAlarmPanelOpen = false; // forzar que esté cerrado para que toggleStatsAlarmPanel lo abra
    toggleStatsAlarmPanel();
    // Scroll suave al panel de alarma
    const panel = document.getElementById('alarm-config-panel-stats');
    if(panel) panel.scrollIntoView({behavior:'smooth', block:'start'});
  }, 80);
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
  const today = todayStr();
  const todayExtr = extr.filter(e=>e.date===today);
  const todayMl   = todayExtr.reduce((s,e)=>s+(e.amountMl||0),0);
  document.getElementById('h-today').textContent    = fa(todayMl);
  document.getElementById('h-sessions').textContent = todayExtr.length + (todayExtr.length===1?' sesión':' sesiones');

  // Racha (mini)
  const streak = calcStreak();
  const sm = document.getElementById('streak-mini-card');
  document.getElementById('streak-count').textContent = streak;
  document.getElementById('streak-lbl').textContent   = streak===1?' día':' días';
  if(sm) sm.classList.toggle('zero', streak===0);

  // Mini gráfica semanal (últimos 7 días)
  const days=[]; for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push(d.toISOString().split('T')[0]);}
  const tots=days.map(d=>extr.filter(e=>e.date===d).reduce((s,e)=>s+(e.amountMl||0),0));
  const mx=Math.max(...tots,1);
  const dn=['Do','Lu','Ma','Mi','Ju','Vi','Sa'];
  const barsEl=document.getElementById('mini-bars'), daysEl=document.getElementById('mini-days');
  if(barsEl) barsEl.innerHTML=days.map((_,i)=>`<div class="mini-bar-col"><div class="mini-bar" style="height:${Math.round((tots[i]/mx)*100)+'%'};min-height:${tots[i]?'2px':'0'}"></div></div>`).join('');
  if(daysEl) daysEl.innerHTML=days.map(d=>`<div class="mini-day">${dn[new Date(d+'T12:00:00').getDay()]}</div>`).join('');

  // Bebé mini (columna derecha)
  renderHomeBebe();

  // Alarma
  renderAlarmCol();
}

function renderHomeBebe(){
  const col=document.getElementById('home-bebe-col');
  if(!col) return;
  loadBaby();
  if(!babyProfile){
    col.innerHTML=`<div class="home-bebe-empty"><div style="font-size:1.6rem">👶</div><div class="home-bebe-empty-lbl">Sin bebé</div><div class="home-bebe-empty-sub">Toca para configurar</div></div>`;
    return;
  }
  const age=calcAgeFmt(babyProfile.dob);
  const avatar=babyProfile.sex==='m'?'👦':'👧';
  let weightHtml='<div class="home-bebe-no-data">Sin mediciones</div>';
  if(babyMeasures.length){
    const latest=[...babyMeasures].sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(latest.weight){
      const disp=kgToDisplay(latest.weight);
      const unit=weightUnitLabel();
      weightHtml=`<div class="home-bebe-weight">${disp}<span>${unit}</span></div>`;
    }
  }
  col.innerHTML=`<div class="home-bebe-avatar">${avatar}</div>
    <div class="home-bebe-name">${esc(babyProfile.name)}</div>
    <div class="home-bebe-age">${age}</div>
    ${weightHtml}`;
}

/* ══════════════════════════════════════════
   ALARM COLUMN + CONFIG PANEL
══════════════════════════════════════════ */
function renderAlarmCol(){
  const col = document.getElementById('alarm-col-status');
  if(!col) return;
  if(!aNext){
    col.innerHTML = `<div class="alarm-col-off">
      <span style="font-size:1.9rem">⏰</span>
      <div class="alarm-col-off-lbl">Sin alarma</div>
      <div class="alarm-col-off-sub">Toca para configurar</div>
    </div>`;
  } else {
    const msLeft = aNext - Date.now();
    col.innerHTML = `<div class="alarm-col-active">
      <div class="alarm-col-dot"></div>
      <div class="alarm-col-time">${fmtT(aNext)}</div>
      <div class="alarm-col-int">Cada ${iLbl()}</div>
      <div class="alarm-col-cd" id="alarm-col-cd">${msLeft>0 ? 'en '+fmtCD(msLeft) : '¡Hora de extraer! 🫧'}</div>
      <button class="alarm-col-stop" onclick="stopAlarm();event.stopPropagation()">⏹ Detener</button>
    </div>`;
  }
}

let alarmPanelOpen = false;
function toggleAlarmPanel(){
  alarmPanelOpen = !alarmPanelOpen;
  const panel = document.getElementById('alarm-config-panel');
  if(panel) panel.style.display = alarmPanelOpen ? 'block' : 'none';
}

/* ── Alarma detallada en Estadísticas ── */
let statsAlarmPanelOpen = false;
function renderStatsAlarm(){
  const card = document.getElementById('stats-alarm-card');
  if(!card) return;
  if(!aNext){
    card.innerHTML=`<div class="stats-alarm-off">
      <div class="sa-icon">⏰</div>
      <div class="sa-info">
        <div class="sa-title">Sin recordatorio activo</div>
        <div class="sa-sub">Toca para configurar tu próximo recordatorio</div>
      </div>
      <button class="sa-cfg-btn" onclick="toggleStatsAlarmPanel();event.stopPropagation()">Configurar</button>
    </div>`;
  } else {
    const msLeft = aNext - Date.now();
    const cdTxt = msLeft > 0 ? `en ${fmtCD(msLeft)}` : '¡Hora de extraer! 🫧';
    card.innerHTML=`<div class="stats-alarm-active">
      <div class="sa-dot-wrap"><div class="alarm-col-dot"></div></div>
      <div class="sa-info">
        <div class="sa-title">Próxima extracción</div>
        <div class="sa-time">${fmtT(aNext)}</div>
        <div class="sa-int">Cada ${iLbl()} · <span id="sa-cd">${cdTxt}</span></div>
      </div>
      <button class="sa-stop-btn" onclick="stopAlarm();renderStatsAlarm()">⏹ Detener</button>
    </div>`;
  }
}
function toggleStatsAlarmPanel(){
  statsAlarmPanelOpen = !statsAlarmPanelOpen;
  const panel = document.getElementById('alarm-config-panel-stats');
  if(panel) panel.style.display = statsAlarmPanelOpen ? 'block' : 'none';
  // Sincronizar valores actuales de aH/aM
  if(statsAlarmPanelOpen) syncSt();
}
function activateAlarmStats(){
  // Copiar hora del panel de stats al campo original y activar
  const at = document.getElementById('alarm-t-stats');
  const atMain = document.getElementById('alarm-t');
  if(at && atMain && at.value) atMain.value = at.value;
  activateAlarm();
  statsAlarmPanelOpen = false;
  const panel = document.getElementById('alarm-config-panel-stats');
  if(panel) panel.style.display = 'none';
  renderStatsAlarm();
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

  // Plan / rol
  const premium = isPremium();
  const badge   = document.getElementById('perf-plan-badge');
  const roleKey = sess?.role;
  if(roleKey === 'owner'){
    badge.className = 'plan-badge owner';
    badge.textContent = '👑 Owner';
  } else if(roleKey === 'admin'){
    badge.className = 'plan-badge owner';
    badge.textContent = '🛡️ Admin';
  } else if(roleKey==='embajadora'){
    badge.className='plan-badge premium';
    badge.textContent='🌟 Embajadora';
  } else if(isTrialActive()){
    const days=trialDaysLeft();
    badge.className='plan-badge trial';
    badge.textContent=`⏳ Prueba: ${days} día${days!==1?'s':''}`;
  } else {
    badge.className='plan-badge '+(premium?'premium':'free');
    badge.textContent=premium?'✨ LactaMe+':'🫧 Plan Gratis';
  }
  document.getElementById('upgrade-card').style.display=premium?'none':'flex';

  // Aviso trial por vencer
  const trialBanner=document.getElementById('trial-banner');
  if(trialBanner){
    const days=trialDaysLeft();
    if(days>0 && days<=4 && !['owner','admin','embajadora'].includes(sess?.role)){
      trialBanner.style.display='flex';
      document.getElementById('trial-days-txt').textContent=`Tu prueba gratis vence en ${days} día${days!==1?'s':''}`;
    } else { trialBanner.style.display='none'; }
  }

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

  // Unidad bebé
  const babyUnitBtns=['kg','g','lbs'];
  babyUnitBtns.forEach(u=>{
    const el=document.getElementById('btn-baby-'+u);
    if(el) el.classList.toggle('active', u===babyWeightUnit);
  });

  // Panel admin
  const adminSec=document.getElementById('admin-section');
  if(adminSec){
    adminSec.style.display=isAdmin()?'block':'none';
    if(isAdmin()) openAdminTab('mensajes');
  }
}

/* ══════════════════════════════════════════
   DARK MODE + STARS
══════════════════════════════════════════ */
function generateStars(){
  const layer = document.getElementById('stars-layer');
  if(!layer || layer.children.length > 0) return;
  const count = 80;
  for(let i=0;i<count;i++){
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random()*2 + 1;
    s.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;top:${Math.random()*100}%;--tw-dur:${(Math.random()*4+2).toFixed(1)}s;--tw-del:${(Math.random()*5).toFixed(1)}s;--tw-op:${(Math.random()*.5+.3).toFixed(2)};`;
    layer.appendChild(s);
  }
}

function toggleTheme(on){
  const theme = on ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('lm_theme', theme);
  const icon = document.getElementById('theme-icon');
  if(icon) icon.textContent = on ? '☀️' : '🌙';
  document.querySelector('meta[name="theme-color"][media*="light"]').content = on ? '#0a0e1a' : '#fdf6ee';
}

function initTheme(){
  const saved = localStorage.getItem('lm_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  generateStars();
  // Sync toggle icon if perfil is rendered later
  const icon = document.getElementById('theme-icon');
  if(icon) icon.textContent = theme==='dark' ? '☀️' : '🌙';
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
function syncSt(){
  // Actualiza tanto el panel de inicio (si existe) como el de estadísticas
  ['iv-h','iv-h-stats'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=aH;});
  ['iv-m','iv-m-stats'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=String(aM).padStart(2,'0');});
}
function adjI(p,d){if(p==='h'){aH=Math.max(0,Math.min(23,aH+d));if(aH===0&&aM===0)aM=15;}else{aM+=d;if(aM<0)aM=45;if(aM>45)aM=0;}syncSt();syncPHL();}
function applyPreset(h,m){aH=h;aM=m;syncSt();syncPHL();}
function syncPHL(){document.querySelectorAll('.pchip').forEach(c=>c.classList.toggle('active',parseInt(c.dataset.h)===aH&&parseInt(c.dataset.m)===aM));}
function activateAlarm(){
  const ms=(aH*60+aM)*60000;if(ms<60000){toast('⚠️ Intervalo mínimo: 1 minuto');return;}
  // Leer la hora de inicio desde cualquiera de los dos campos disponibles
  const svEl = document.getElementById('alarm-t-stats') || document.getElementById('alarm-t');
  const sv = svEl ? svEl.value : '';
  const now=new Date();let base;
  if(sv){const[hh,mm]=sv.split(':').map(Number);base=new Date(now);base.setHours(hh,mm,0,0);if(base<=now)base.setDate(base.getDate()+1);}
  else base=new Date(now.getTime()+ms);
  schedAlarm(base);renderAlarmCol();renderStatsAlarm();
  closeAllPanels();
  toast('🔔 Alarma activada para las '+fmtT(base));
}
function schedAlarm(n){clearAlarm();aNext=n;const ms=n-Date.now();if(ms>0)aTimer=setTimeout(()=>fireAlarm(n),ms);aCdI=setInterval(()=>{const el=document.getElementById('alarm-col-cd');if(el){const r=aNext-Date.now();el.textContent=r>0?'en '+fmtCD(r):'¡Hora de extraer! 🫧';}},1000);}
function fireAlarm(base){toast('🫧 ¡Hora de tu extracción!');if(cfg.vibrate&&navigator.vibrate)navigator.vibrate([300,100,300]);if(cfg.notif&&'Notification'in window&&Notification.permission==='granted')new Notification('LactaMe',{body:'¡Es hora de tu extracción!'});schedAlarm(new Date(base.getTime()+(aH*60+aM)*60000));renderAlarmCol();}
function stopAlarm(){clearAlarm();aNext=null;renderAlarmCol();toast('⏹ Alarma desactivada');}
function clearAlarm(){if(aTimer)clearTimeout(aTimer);if(aCdI)clearInterval(aCdI);aTimer=null;aCdI=null;}
function fmtCD(ms){const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000),s=Math.floor((ms%60000)/1000);return h>0?`${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`:`${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;}
function iLbl(){if(aH>0&&aM>0)return`${aH}h ${aM}m`;if(aH>0)return`${aH}h`;return`${aM} min`;}


/* ══════════════════════════════════════════
   COMMUNITY
══════════════════════════════════════════ */
async function getPosts(grp){
  if(ONLINE){
    let q=sb.from('posts').select('*, likes(count)').order('created_at',{ascending:false});
    if(grp!=='all')q=q.eq('group_name',grp);
    const{data}=await q;
    return(data||[]).map(p=>({id:p.id,uid:p.user_id,name:p.display_name,uname:p.username,grp:p.group_name,title:p.title||'',body:p.body,anon:p.anonymous,role:p.role||'usuaria',ts:new Date(p.created_at).getTime(),likes:p.likes?.[0]?.count||0}));
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
  const banner=document.getElementById('comm-premium-banner');
  if(banner) banner.style.display=isPremium()?'none':'flex';
  list.innerHTML='';emp.style.display='none';loading(true);
  try{
    const[posts,liked]=await Promise.all([getPosts(curGrp),getLiked()]);
    if(!posts.length){emp.style.display='block';return;}
    list.innerHTML=posts.map(p=>{
      const own=p.uid===sess.uid,lkd=liked.has(p.id);
      const ini=p.anon?'?':(p.name||p.uname||'M').slice(0,1).toUpperCase();
      const auth=p.anon?'Anónima':esc(p.name||p.uname)+(own?' <span style="font-size:.62rem;color:var(--rose-dark);font-weight:500">(tú)</span>':'');
      const titleHtml=p.title?`<div class="post-title">${esc(p.title)}</div>`:'';
      const roleInfo=!p.anon&&ROLES[p.role]&&ROLES[p.role].lbl?ROLES[p.role]:``;
      const roleBadge=roleInfo?`<span class="role-badge ${roleInfo.cls}">${roleInfo.icon} ${roleInfo.lbl}</span>`:'';
      return`<div class="post-card"><div class="post-hdr"><div class="post-av${p.anon?' anon':''}">${p.anon?'🎭':ini}</div><div><div class="post-auth${p.anon?' anon':''}">${auth}${roleBadge}</div><div class="post-time">${ago(p.ts)}</div></div></div><div class="post-gbadge">${GRPS[p.grp]||p.grp}</div>${titleHtml}<div class="post-body">${esc(p.body)}</div><div class="post-foot"><button class="btn-like${lkd?' liked':''}" onclick="togLike('${p.id}')">${lkd?'❤️':'🤍'} ${p.likes||0}</button></div></div>`;
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
function openPostModal(){
  if(!isPremium()){toast('✨ Publicar en la comunidad requiere LactaMe+');openSubModal();return;}
  document.getElementById('p-title').value='';document.getElementById('p-body').value='';document.getElementById('anon-cb').checked=false;selPG(curGrp==='all'?'inicio':curGrp);document.getElementById('modal-post').style.display='flex';
}
function selPG(g){pGrp=g;document.querySelectorAll('.gselbtn').forEach(b=>b.classList.toggle('active',b.dataset.g===g));}
async function savePost(){
  const title=document.getElementById('p-title').value.trim();
  const body=document.getElementById('p-body').value.trim();
  if(!body){toast('⚠️ Escribe algo antes de publicar');return;}
  const anon=document.getElementById('anon-cb').checked;
  loading(true);
  try{
    if(ONLINE){await sb.from('posts').insert({user_id:sess.uid,display_name:sess.name,username:sess.username,group_name:pGrp,title,body,anonymous:anon,role:sess.role||'usuaria'});}
    else{const ps=JSON.parse(localStorage.getItem('lm_posts')||'[]');ps.unshift({id:uid(),uid:sess.uid,name:sess.name,uname:sess.username,grp:pGrp,title,body,anon,role:sess.role||'usuaria',ts:Date.now(),likes:0});localStorage.setItem('lm_posts',JSON.stringify(ps));}
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

function trialDaysLeft(){
  if(!sess?.trialEndsAt) return -1;
  const diff=new Date(sess.trialEndsAt)-Date.now();
  return Math.max(0,Math.ceil(diff/86400000));
}
function isTrialActive(){ return trialDaysLeft()>0; }
function isPremium(){
  return sess?.plan==='premium' || ['owner','admin','embajadora'].includes(sess?.role) || isTrialActive();
}

/* ══════════════════════════════════════════
   SETTINGS (ahora inline en tab Perfil)
══════════════════════════════════════════ */
function setUnit(u){cfg.unit=u;saveCfgDB();document.getElementById('btn-ml').classList.toggle('active',u==='ml');document.getElementById('btn-oz').classList.toggle('active',u==='oz');document.getElementById('conv-txt').textContent=u==='oz'?'1 oz = 29.574 ml':'Mostrando en ml';renderList();renderInicio();toast(u==='oz'?'✅ Cambiado a oz':'✅ Cambiado a ml');}
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
   BIENVENIDA (primera vez)
══════════════════════════════════════════ */
function checkWelcome(){
  if(!localStorage.getItem('lm_welcomed')){
    localStorage.setItem('lm_welcomed','1');
    const ov=document.getElementById('welcome-overlay');
    const nm=document.getElementById('welcome-user-name');
    if(nm) nm.textContent=sess?.name||sess?.username||'';
    if(ov) ov.style.display='flex';
  }
}
function closeWelcome(){
  const ov=document.getElementById('welcome-overlay');
  if(ov) ov.style.display='none';
}
function closeWelcomeContact(){
  closeWelcome();
  openContact();
}

/* ══════════════════════════════════════════
   BUZÓN DE CONTACTO
══════════════════════════════════════════ */
function openContact(){
  const el=document.getElementById('feedback-msg');
  if(el) el.value='';
  document.getElementById('modal-contact').style.display='flex';
}
async function submitFeedback(){
  const msg=(document.getElementById('feedback-msg').value||'').trim();
  if(!msg){toast('⚠️ Escribe tu mensaje antes de enviar');return;}
  loading(true);
  try{
    if(ONLINE){
      await sb.from('feedback').insert({user_id:sess.uid,display_name:sess.name,email:sess.email,message:msg});
    } else {
      const fb=JSON.parse(localStorage.getItem('lm_feedback')||'[]');
      fb.push({id:uid(),user_id:sess.uid,name:sess.name,email:sess.email,message:msg,created_at:new Date().toISOString(),read:false});
      localStorage.setItem('lm_feedback',JSON.stringify(fb));
    }
    document.getElementById('feedback-msg').value='';
    closeOv(null,'modal-contact');
    toast('💌 ¡Mensaje enviado! Gracias por tu feedback.');
  } catch(e){toast('❌ Error: '+e.message);}
  finally{loading(false);}
}

/* ══════════════════════════════════════════
   CRECIMIENTO DEL BEBÉ — DATOS OMS 2006
   Percentiles: [mes, P3, P15, P50, P85, P97]
══════════════════════════════════════════ */
// Peso niños (kg)
const WHO_W_M=[[0,2.5,2.9,3.3,3.9,4.3],[1,3.4,3.9,4.5,5.1,5.7],[2,4.3,5.0,5.6,6.3,7.0],[3,5.0,5.7,6.4,7.2,8.0],[4,5.6,6.4,7.0,7.8,8.7],[5,6.0,6.9,7.5,8.4,9.3],[6,6.4,7.3,7.9,8.8,9.8],[7,6.7,7.6,8.3,9.2,10.2],[8,7.0,7.9,8.6,9.6,10.5],[9,7.2,8.2,8.9,9.9,10.9],[10,7.5,8.5,9.2,10.2,11.2],[11,7.7,8.7,9.4,10.4,11.5],[12,7.8,8.9,9.6,10.7,11.8],[13,8.0,9.1,9.9,11.0,12.1],[14,8.2,9.3,10.1,11.2,12.3],[15,8.4,9.5,10.3,11.5,12.6],[16,8.6,9.7,10.5,11.7,12.9],[17,8.7,9.9,10.7,11.9,13.1],[18,8.9,10.1,10.9,12.2,13.4],[19,9.1,10.3,11.2,12.4,13.7],[20,9.3,10.5,11.4,12.7,13.9],[21,9.4,10.6,11.6,12.9,14.2],[22,9.6,10.8,11.8,13.1,14.5],[23,9.7,11.0,12.0,13.4,14.7],[24,9.8,11.1,12.2,13.6,15.0]];
// Peso niñas (kg)
const WHO_W_F=[[0,2.4,2.8,3.2,3.7,4.2],[1,3.2,3.6,4.2,4.8,5.5],[2,3.9,4.5,5.1,5.8,6.6],[3,4.5,5.2,5.8,6.6,7.5],[4,5.0,5.7,6.4,7.3,8.2],[5,5.4,6.1,6.9,7.8,8.8],[6,5.7,6.5,7.3,8.2,9.3],[7,6.0,6.8,7.6,8.6,9.8],[8,6.3,7.1,8.0,9.0,10.2],[9,6.5,7.3,8.2,9.3,10.5],[10,6.7,7.5,8.5,9.6,10.9],[11,6.9,7.8,8.7,9.9,11.2],[12,7.1,8.0,9.0,10.1,11.5],[13,7.3,8.2,9.2,10.4,11.8],[14,7.4,8.4,9.4,10.6,12.1],[15,7.6,8.6,9.6,10.9,12.4],[16,7.8,8.8,9.8,11.1,12.6],[17,7.9,8.9,10.0,11.3,12.9],[18,8.1,9.1,10.2,11.5,13.2],[19,8.2,9.3,10.4,11.8,13.4],[20,8.4,9.5,10.6,12.0,13.7],[21,8.6,9.7,10.9,12.3,14.0],[22,8.7,9.8,11.1,12.5,14.3],[23,8.9,10.0,11.3,12.8,14.6],[24,9.0,10.2,11.5,13.0,14.8]];
// Talla niños (cm)
const WHO_H_M=[[0,45.5,47.5,49.9,52.3,54.0],[1,50.2,52.2,54.7,57.1,58.9],[2,53.8,55.8,58.4,61.0,62.8],[3,56.5,58.6,61.4,64.0,65.9],[4,58.7,60.9,63.9,66.6,68.5],[5,60.7,62.9,66.0,68.8,70.7],[6,62.3,64.6,67.8,70.6,72.5],[7,63.9,66.2,69.5,72.4,74.3],[8,65.3,67.6,71.0,73.9,75.9],[9,66.5,68.9,72.3,75.3,77.4],[10,67.7,70.0,73.5,76.5,78.7],[11,68.7,71.2,74.7,77.7,79.9],[12,69.8,72.2,75.7,78.9,81.1],[13,70.7,73.2,76.9,80.0,82.2],[14,71.7,74.1,77.9,81.1,83.4],[15,72.5,75.0,78.9,82.1,84.4],[16,73.4,75.9,79.9,83.2,85.5],[17,74.2,76.7,80.8,84.2,86.5],[18,74.9,77.5,81.7,85.2,87.5],[19,75.7,78.3,82.6,86.1,88.5],[20,76.4,79.1,83.4,87.0,89.4],[21,77.1,79.8,84.2,87.9,90.3],[22,77.8,80.6,85.0,88.7,91.1],[23,78.5,81.3,85.8,89.5,91.9],[24,79.2,82.0,86.4,90.4,92.9]];
// Talla niñas (cm)
const WHO_H_F=[[0,45.6,47.3,49.1,51.0,52.7],[1,49.8,51.7,53.7,55.7,57.5],[2,53.2,55.1,57.1,59.1,61.0],[3,55.7,57.7,59.8,61.9,63.8],[4,57.8,59.9,62.1,64.3,66.2],[5,59.7,61.8,64.0,66.3,68.2],[6,61.2,63.3,65.7,68.0,70.0],[7,62.7,64.8,67.3,69.6,71.6],[8,64.0,66.1,68.7,71.1,73.2],[9,65.2,67.4,70.1,72.5,74.7],[10,66.4,68.6,71.3,73.8,76.0],[11,67.5,69.7,72.6,75.1,77.3],[12,68.6,70.8,73.8,76.3,78.5],[13,69.6,71.9,74.9,77.5,79.8],[14,70.5,72.9,76.0,78.6,80.9],[15,71.5,73.9,77.0,79.7,82.0],[16,72.4,74.8,78.0,80.8,83.1],[17,73.2,75.7,79.0,81.8,84.2],[18,74.0,76.6,80.0,82.9,85.2],[19,74.8,77.4,80.9,83.9,86.3],[20,75.6,78.3,81.8,84.8,87.3],[21,76.4,79.1,82.7,85.7,88.2],[22,77.2,79.9,83.6,86.7,89.2],[23,78.0,80.7,84.5,87.6,90.1],[24,78.7,81.5,85.7,88.5,91.1]];

/* ══════════════════════════════════════════
   ESTADO BEBÉ
══════════════════════════════════════════ */
/* ══════════════════════════════════════════
   UNIDADES BEBÉ
══════════════════════════════════════════ */
let babyWeightUnit = localStorage.getItem('lm_baby_unit') || 'kg';

function selBabyUnit(u){
  babyWeightUnit = u;
  localStorage.setItem('lm_baby_unit', u);
  // Actualizar todos los botones de unidad
  ['bu-kg','bu-g','bu-lbs'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.toggle('active',id==='bu-'+u);});
  ['bu-setup-kg','bu-setup-g','bu-setup-lbs'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.toggle('active',id==='bu-setup-'+u);});
  ['kg','g','lbs'].forEach(u=>{
    const el=document.getElementById('btn-baby-'+u);
    if(el) el.classList.toggle('active', u===babyWeightUnit);
  });
  syncBabyUnitLabel();
  if(babyProfile) renderBebe();
}
function syncBabyUnitLabel(){
  const lbl=document.getElementById('m-weight-lbl');
  const inp=document.getElementById('m-weight');
  const labels={kg:'Peso (kg)',g:'Peso (g)',lbs:'Peso (lbs)'};
  const placeholders={kg:'Ej: 5.2',g:'Ej: 5200',lbs:'Ej: 11.5'};
  if(lbl) lbl.textContent=labels[babyWeightUnit]||'Peso (kg)';
  if(inp) inp.placeholder=placeholders[babyWeightUnit]||'Ej: 5.2';
}
function weightToKg(val){
  const v=parseFloat(val);
  if(!val||isNaN(v)) return '';
  if(babyWeightUnit==='g') return (v/1000).toFixed(3);
  if(babyWeightUnit==='lbs') return (v/2.20462).toFixed(3);
  return String(v);
}
function kgToDisplay(kgVal){
  const v=parseFloat(kgVal);
  if(!kgVal||isNaN(v)) return '';
  if(babyWeightUnit==='g') return Math.round(v*1000).toString();
  if(babyWeightUnit==='lbs') return (v*2.20462).toFixed(2);
  return v.toString();
}
function weightUnitLabel(){ return {kg:'kg',g:'g',lbs:'lbs'}[babyWeightUnit]||'kg'; }

let babyProfile=null; // {name, dob, sex:'m'|'f'}
let babyMeasures=[]; // [{id,date,weight,height,hc,notes}]
let babyChartType='weight'; // 'weight'|'height'
let babySetupSex='m';

function loadBaby(){
  babyProfile=JSON.parse(localStorage.getItem('lm_baby')||'null');
  babyMeasures=JSON.parse(localStorage.getItem('lm_baby_measures')||'[]');
}
function saveBabyDB(){
  localStorage.setItem('lm_baby',JSON.stringify(babyProfile));
  localStorage.setItem('lm_baby_measures',JSON.stringify(babyMeasures));
}

function calcAgeMonths(dobDate,measDate){
  const m=(measDate.getFullYear()-dobDate.getFullYear())*12+(measDate.getMonth()-dobDate.getMonth());
  return Math.max(0,m);
}
function calcAgeFmt(dob){
  const d=new Date(), bd=new Date(dob+'T12:00:00');
  const months=(d.getFullYear()-bd.getFullYear())*12+(d.getMonth()-bd.getMonth());
  if(months<1) return 'Recién nacido';
  if(months<12) return months+' mes'+(months===1?'':'es');
  const y=Math.floor(months/12), m=months%12;
  return y+' año'+(y===1?'':'s')+(m?' '+m+' mes'+(m===1?'':'es'):'');
}

function getPercentileBand(val,month,type,sex){
  const ref=type==='weight'?(sex==='m'?WHO_W_M:WHO_W_F):(sex==='m'?WHO_H_M:WHO_H_F);
  const m=Math.min(24,Math.round(month));
  const row=ref.find(r=>r[0]===m)||ref[ref.length-1];
  if(!row) return '—';
  const [,p3,p15,p50,p85,p97]=row;
  if(val<p3) return {lbl:'< P3',cls:'pband-low',tip:'Por debajo del rango esperado'};
  if(val<p15) return {lbl:'P3–P15',cls:'pband-low',tip:'Bajo pero dentro del rango'};
  if(val<p50) return {lbl:'P15–P50',cls:'pband-ok',tip:'Dentro del rango saludable'};
  if(val<p85) return {lbl:'P50–P85',cls:'pband-ok',tip:'Dentro del rango saludable'};
  if(val<p97) return {lbl:'P85–P97',cls:'pband-high',tip:'Alto pero dentro del rango'};
  return {lbl:'> P97',cls:'pband-high',tip:'Por encima del rango esperado'};
}

/* ── Render principal Bebé ── */
function renderBebe(){
  loadBaby();
  const setup=document.getElementById('bebe-setup');
  const main=document.getElementById('bebe-main');
  if(!babyProfile){
    setup.style.display='block'; main.style.display='none';
    // Reset sex selector
    selSex(babySetupSex);
  } else {
    setup.style.display='none'; main.style.display='block';
    document.getElementById('baby-profile-name').textContent=babyProfile.name||'—';
    document.getElementById('baby-profile-age').textContent=calcAgeFmt(babyProfile.dob);
    document.getElementById('baby-avatar-lbl').textContent=babyProfile.sex==='m'?'👦':'👧';
    // Sincronizar botones de unidad
    ['bu-kg','bu-g','bu-lbs'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.toggle('active',id==='bu-'+babyWeightUnit);});
    ['bu-setup-kg','bu-setup-g','bu-setup-lbs'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.toggle('active',id==='bu-setup-'+babyWeightUnit);});
    drawGrowthChart(babyChartType);
    renderLatestMeasure();
    renderMeasureList();
  }
}

function selSex(s){
  babySetupSex=s;
  document.getElementById('sex-m').classList.toggle('active',s==='m');
  document.getElementById('sex-f').classList.toggle('active',s==='f');
}

function saveBaby(){
  const name=document.getElementById('baby-name-input').value.trim();
  const dob=document.getElementById('baby-dob-input').value;
  if(!name||!dob){toast('⚠️ Ingresa nombre y fecha de nacimiento');return;}
  babyProfile={name,dob,sex:babySetupSex};
  saveBabyDB();
  renderBebe();
  toast('👶 ¡Perfil del bebé guardado!');
}

function showBabySetup(){
  if(babyProfile){
    document.getElementById('baby-name-input').value=babyProfile.name||'';
    document.getElementById('baby-dob-input').value=babyProfile.dob||'';
    selSex(babyProfile.sex||'m');
  }
  document.getElementById('bebe-setup').style.display='block';
  document.getElementById('bebe-main').style.display='none';
}

/* ── Gráfica OMS ── */
function showChart(type){
  babyChartType=type;
  document.getElementById('ctog-weight').classList.toggle('active',type==='weight');
  document.getElementById('ctog-height').classList.toggle('active',type==='height');
  drawGrowthChart(type);
}

function drawGrowthChart(type){
  const svg=document.getElementById('growth-svg');
  if(!svg||!babyProfile) return;
  const sex=babyProfile.sex;
  const ref=type==='weight'?(sex==='m'?WHO_W_M:WHO_W_F):(sex==='m'?WHO_H_M:WHO_H_F);
  const W=320,H=200,pL=34,pR=22,pT=12,pB=26;
  const cW=W-pL-pR, cH=H-pT-pB;
  const vMin=type==='weight'?2:44;
  const vMax=type==='weight'?(sex==='m'?15.5:15):(sex==='m'?94:93);
  const xS=m=>pL+(m/24)*cW;
  const yS=v=>pT+cH-((v-vMin)/(vMax-vMin))*cH;
  const mkPath=pts=>pts.map((p,i)=>`${i?'L':'M'}${xS(p[0]).toFixed(1)},${yS(p[1]).toFixed(1)}`).join('');

  let h='';

  // Background
  h+=`<rect x="${pL}" y="${pT}" width="${cW}" height="${cH}" fill="rgba(255,250,246,0.6)" rx="3"/>`;

  // Horizontal grid
  const yTicks=type==='weight'?[4,6,8,10,12,14]:[50,55,60,65,70,75,80,85,90];
  yTicks.forEach(v=>{
    if(v<vMin||v>vMax) return;
    const y=yS(v);
    h+=`<line x1="${pL}" y1="${y.toFixed(1)}" x2="${W-pR}" y2="${y.toFixed(1)}" stroke="rgba(139,94,82,.1)" stroke-width=".5"/>`;
    h+=`<text x="${pL-3}" y="${(y+2).toFixed(1)}" text-anchor="end" font-size="5.8" fill="#b0877a">${v}</text>`;
  });
  // Vertical grid + X labels
  [0,3,6,9,12,15,18,21,24].forEach(m=>{
    const x=xS(m);
    h+=`<line x1="${x.toFixed(1)}" y1="${pT}" x2="${x.toFixed(1)}" y2="${H-pB}" stroke="rgba(139,94,82,.1)" stroke-width=".5"/>`;
    h+=`<text x="${x.toFixed(1)}" y="${H-pB+10}" text-anchor="middle" font-size="5.8" fill="#b0877a">${m}</text>`;
  });
  h+=`<text x="${pL+cW/2}" y="${H}" text-anchor="middle" font-size="5.8" fill="#b0877a">Edad (meses)</text>`;
  h+=`<text x="8" y="${pT+cH/2}" text-anchor="middle" font-size="5.8" fill="#b0877a" transform="rotate(-90,8,${pT+cH/2})">${type==='weight'?'kg':'cm'}</text>`;

  // Band P3–P97
  const b97=ref.map(d=>[d[0],d[5]]);
  const b3r=[...ref].reverse().map(d=>[d[0],d[1]]);
  h+=`<path d="${mkPath(b97)}${b3r.map(p=>`L${xS(p[0]).toFixed(1)},${yS(p[1]).toFixed(1)}`).join('')}Z" fill="rgba(245,213,207,.35)"/>`;

  // Band P15–P85
  const b85=ref.map(d=>[d[0],d[4]]);
  const b15r=[...ref].reverse().map(d=>[d[0],d[2]]);
  h+=`<path d="${mkPath(b85)}${b15r.map(p=>`L${xS(p[0]).toFixed(1)},${yS(p[1]).toFixed(1)}`).join('')}Z" fill="rgba(232,165,152,.2)"/>`;

  // Percentile lines
  [{i:1,c:'rgba(201,122,110,.45)',w:.7,da:'3,2'},{i:2,c:'rgba(201,122,110,.55)',w:.7,da:'3,2'},{i:3,c:'rgba(201,122,110,.95)',w:1.4,da:''},{i:4,c:'rgba(201,122,110,.55)',w:.7,da:'3,2'},{i:5,c:'rgba(201,122,110,.45)',w:.7,da:'3,2'}].forEach(({i,c,w,da})=>{
    h+=`<path d="${mkPath(ref.map(d=>[d[0],d[i]]))}" fill="none" stroke="${c}" stroke-width="${w}" ${da?`stroke-dasharray="${da}"`:''}/>`;
  });

  // Percentile labels at right edge
  const last=ref[ref.length-1];
  [{i:1,lbl:'P3'},{i:3,lbl:'P50'},{i:5,lbl:'P97'}].forEach(({i,lbl})=>{
    h+=`<text x="${W-pR+3}" y="${(yS(last[i])+2).toFixed(1)}" font-size="5.5" fill="rgba(201,122,110,.75)">${lbl}</text>`;
  });

  // Baby measurements
  const dob=new Date(babyProfile.dob+'T12:00:00');
  const pts=babyMeasures
    .map(m=>({m:calcAgeMonths(dob,new Date(m.date+'T12:00:00')),v:type==='weight'?parseFloat(m.weight||0):parseFloat(m.height||0)}))
    .filter(p=>p.m>=0&&p.m<=24&&p.v>0)
    .sort((a,b)=>a.m-b.m);
  if(pts.length>1) h+=`<path d="${mkPath(pts.map(p=>[p.m,p.v]))}" fill="none" stroke="#3a7bd5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  pts.forEach(p=>{
    h+=`<circle cx="${xS(p.m).toFixed(1)}" cy="${yS(p.v).toFixed(1)}" r="3" fill="#3a7bd5" stroke="#fff" stroke-width="1.5"/>`;
  });

  // Axes
  h+=`<line x1="${pL}" y1="${pT}" x2="${pL}" y2="${H-pB}" stroke="rgba(139,94,82,.3)" stroke-width="1"/>`;
  h+=`<line x1="${pL}" y1="${H-pB}" x2="${W-pR}" y2="${H-pB}" stroke="rgba(139,94,82,.3)" stroke-width="1"/>`;

  svg.innerHTML=h;
}

/* ── Última medición ── */
function renderLatestMeasure(){
  const el=document.getElementById('latest-measure-card');
  if(!el) return;
  if(!babyMeasures.length){
    el.innerHTML=`<div class="latest-empty"><div style="font-size:1.8rem">📏</div><p>Aún no hay mediciones.<br/>Registra la primera abajo.</p></div>`;
    return;
  }
  const m=[...babyMeasures].sort((a,b)=>b.date.localeCompare(a.date))[0];
  const dob=new Date(babyProfile.dob+'T12:00:00');
  const months=calcAgeMonths(dob,new Date(m.date+'T12:00:00'));
  const wp=m.weight?getPercentileBand(parseFloat(m.weight),months,'weight',babyProfile.sex):null;
  const hp=m.height?getPercentileBand(parseFloat(m.height),months,'height',babyProfile.sex):null;
  el.innerHTML=`<div class="latest-card-inner">
    <div class="latest-card-title">Última medición · ${fmtDate(m.date)}</div>
    <div class="latest-metrics">
      ${m.weight?`<div class="latest-metric"><div class="lm-val">${kgToDisplay(m.weight)}<span>${weightUnitLabel()}</span></div><div class="lm-lbl">Peso</div>${wp?`<div class="pband ${wp.cls}">${wp.lbl}</div>`:''}</div>`:''}
      ${m.height?`<div class="latest-metric"><div class="lm-val">${m.height}<span>cm</span></div><div class="lm-lbl">Talla</div>${hp?`<div class="pband ${hp.cls}">${hp.lbl}</div>`:''}</div>`:''}
      ${m.hc?`<div class="latest-metric"><div class="lm-val">${m.hc}<span>cm</span></div><div class="lm-lbl">P. cefálico</div></div>`:''}
    </div>
    ${m.notes?`<div class="latest-notes">📝 ${esc(m.notes)}</div>`:''}
  </div>`;
}

/* ── Historial de mediciones ── */
function renderMeasureList(){
  const el=document.getElementById('measure-list');
  if(!el) return;
  if(!babyMeasures.length){el.innerHTML='';return;}
  const sorted=[...babyMeasures].sort((a,b)=>b.date.localeCompare(a.date));
  const dob=new Date(babyProfile.dob+'T12:00:00');
  el.innerHTML=sorted.map(m=>{
    const months=calcAgeMonths(dob,new Date(m.date+'T12:00:00'));
    return `<div class="measure-card">
      <div class="measure-card-top">
        <div class="measure-date">${fmtDate(m.date)} <span class="measure-age">(${months} m)</span></div>
        <button class="btn-del" onclick="delMeasure('${m.id}')">🗑</button>
      </div>
      <div class="measure-metrics">
        ${m.weight?`<span class="mm">⚖️ ${kgToDisplay(m.weight)} ${weightUnitLabel()}</span>`:''}
        ${m.height?`<span class="mm">📏 ${m.height} cm</span>`:''}
        ${m.hc?`<span class="mm">🔵 ${m.hc} cm</span>`:''}
      </div>
      ${m.notes?`<div class="card-notes">📝 ${esc(m.notes)}</div>`:''}
    </div>`;
  }).join('');
}

/* ── Guardar / eliminar medición ── */
function openMeasureModal(){
  const mEl=document.getElementById('m-date');if(mEl)mEl.value=todayStr();
  ['m-weight','m-height','m-hc','m-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('modal-measure').style.display='flex';
  syncBabyUnitLabel();
}
function saveMeasure(){
  const date=document.getElementById('m-date').value;
  const weight=document.getElementById('m-weight').value;
  const height=document.getElementById('m-height').value;
  const hc=document.getElementById('m-hc').value;
  const notes=document.getElementById('m-notes').value.trim();
  if(!date){toast('⚠️ Ingresa la fecha');return;}
  if(!weight&&!height){toast('⚠️ Ingresa al menos peso o talla');return;}
  const weightKg = weight ? weightToKg(weight) : '';
  babyMeasures.unshift({id:uid(),date,weight:weightKg,height:height||'',hc:hc||'',notes});
  saveBabyDB();
  closeOv(null,'modal-measure');
  renderBebe();
  toast('✅ Medición guardada');
}
function delMeasure(id){
  if(!confirm('¿Eliminar esta medición?'))return;
  babyMeasures=babyMeasures.filter(m=>m.id!==id);
  saveBabyDB();
  renderBebe();
  toast('🗑️ Eliminada');
}

/* ══════════════════════════════════════════
   PANEL DE ADMINISTRACIÓN
══════════════════════════════════════════ */
function isAdmin(){ return ['owner','admin'].includes(sess?.role); }

function openAdminTab(tab){
  ['mensajes','usuarios'].forEach(t=>{
    const btn=document.getElementById('atab-'+t);
    const pnl=document.getElementById('admin-'+t);
    if(btn) btn.classList.toggle('active', t===tab);
    if(pnl) pnl.style.display = t===tab ? 'block' : 'none';
  });
  if(tab==='mensajes') loadAdminFeedback();
  if(tab==='usuarios') loadAdminUsers();
}

async function loadAdminFeedback(){
  const el=document.getElementById('admin-feedback-list');
  if(!el) return;
  el.innerHTML='<div class="admin-loading">Cargando mensajes...</div>';
  try{
    const{data,error}=await sb.from('feedback').select('*').order('created_at',{ascending:false});
    if(error) throw error;
    if(!data?.length){el.innerHTML='<div class="admin-empty">No hay mensajes aún.</div>';return;}
    el.innerHTML=data.map(f=>`
      <div class="fb-card ${f.read?'fb-read':'fb-unread'}">
        <div class="fb-hdr">
          <div class="fb-email">${esc(f.email||'Sin correo')}</div>
          <div class="fb-date">${new Date(f.created_at).toLocaleDateString('es-CO')}</div>
          ${!f.read?`<button class="btn-fb-read" onclick="markRead('${f.id}')">✓ Leído</button>`:'<span class="fb-badge-read">✓ Leído</span>'}
        </div>
        <div class="fb-msg">${esc(f.message)}</div>
      </div>`).join('');
  }catch{el.innerHTML='<div class="admin-empty">Error al cargar mensajes.</div>';}
}

async function markRead(id){
  await sb.from('feedback').update({read:true}).eq('id',id);
  loadAdminFeedback();
}

async function loadAdminUsers(){
  const el=document.getElementById('admin-users-list');
  if(!el) return;
  el.innerHTML='<div class="admin-loading">Cargando usuarios...</div>';
  try{
    const{data,error}=await sb.from('profiles').select('id,username,display_name,role,plan,created_at').order('created_at',{ascending:false});
    if(error) throw error;
    if(!data?.length){el.innerHTML='<div class="admin-empty">No hay usuarios aún.</div>';return;}
    el.innerHTML=data.map(u=>`
      <div class="user-card">
        <div class="user-av">${(u.display_name||u.username||'?').slice(0,1).toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${esc(u.display_name||u.username)}</div>
          <div class="user-sub">@${esc(u.username)} · ${u.plan||'free'}</div>
        </div>
        <select class="role-sel" onchange="changeRole('${u.id}',this.value)" ${u.id===sess.uid?'disabled':''}>
          ${Object.entries(ROLES).map(([k,v])=>`<option value="${k}" ${u.role===k?'selected':''}>${v.lbl||k}</option>`).join('')}
        </select>
      </div>`).join('');
  }catch(e){el.innerHTML='<div class="admin-empty">Error al cargar usuarios.</div>';}
}

async function changeRole(userId, role){
  try{
    const{error}=await sb.from('profiles').update({role}).eq('id',userId);
    if(error) throw error;
    toast('✅ Rol actualizado');
  }catch(e){toast('❌ Error: '+e.message);}
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
        role:prof?.role||'usuaria',
        trialEndsAt:prof?.trial_ends_at||null,
        createdAt:session.user.created_at
      };
      if(session.user.email==='vmbarreto.pro@gmail.com'){sess.role='owner';sess.plan='premium';sess.trialEndsAt=null;}
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

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  });
}
