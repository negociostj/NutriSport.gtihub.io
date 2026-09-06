
import { auth, db, doc, getDoc, setDoc, serverTimestamp, premium, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged } from './firebase.js';
import { ALIMENTOS_DB, RUTINAS_DB, LOGROS } from './data.js';

let user=null, data=null, page='dashboard', perfilEdit={}, hasPending=false, chartCal=null, chartMacro=null;
window.authMode='login';

function toast(m){const t=document.getElementById('toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',2800)}
window.toast=toast;

async function load(uid){
 try{
  const s=await getDoc(doc(db,'users',uid));
  if(s.exists()) data=s.data();
  else data={email:user.email,xp:0,nivel:1,racha:0,rachaHistorial:[],comidas:0,rutinas:0,objetivos:0,logros:[],cont:{fecha:'',comidasHoy:0,rutinasHoy:0,objHoy:0}, alimentos:[], ejercicios:[], perfil:{peso:'',altura:'',objetivo:'volumen',nombre:''}, photoURL:'', historialPeso:[], historialCal:[]};
  if(!data.rachaHistorial) data.rachaHistorial=[];
  if(!data.logros) data.logros=[];
  if(!data.cont) data.cont={fecha:'',comidasHoy:0,rutinasHoy:0,objHoy:0};
  if(!data.alimentos) data.alimentos=[];
  if(!data.ejercicios) data.ejercicios=[];
  if(!data.perfil) data.perfil={peso:'',altura:'',objetivo:'volumen',nombre:''};
  if(!data.historialPeso) data.historialPeso=[];
  if(!data.historialCal) data.historialCal=[];
  if(data.xp===undefined) data.xp=0;
  if(!data.nivel) data.nivel=1;
  perfilEdit={...data.perfil};
  localStorage.setItem('ns_'+uid, JSON.stringify(data));
 }catch(e){const l=localStorage.getItem('ns_'+uid); if(l) data=JSON.parse(l);}
}
async function save(){ if(!user) return; try{await setDoc(doc(db,'users',user.uid),{...data,updatedAt:serverTimestamp()},{merge:true}); localStorage.setItem('ns_'+user.uid, JSON.stringify(data));}catch(e){}}

function hoyStr(){return new Date().toISOString().split('T')[0];}
function checkDia(){const h=hoyStr(); if(data.cont.fecha!==h) data.cont={fecha:h,comidasHoy:0,rutinasHoy:0,objHoy:0}; return h;}
function addXP(c,tipo){const h=checkDia(); if(tipo==='comida'&&data.cont.comidasHoy>=3) return; if(tipo==='rutina'&&data.cont.rutinasHoy>=1) return; if(tipo==='obj'&&data.cont.objHoy>=1) return; data.xp+=c; if(tipo==='comida') data.cont.comidasHoy++; if(tipo==='rutina') data.cont.rutinasHoy++; if(tipo==='obj') data.cont.objHoy++; const nn=Math.floor(data.xp/300)+1; if(nn>data.nivel){data.nivel=nn; toast(`¡Nivel ${nn}! 🎉`);} save(); checkLogros();}
function checkLogros(){ LOGROS.forEach(l=>{ if(data.logros.find(x=>x.id===l.id)) return; let ok=false; if(l.tipo==='comidas'&&data.comidas>=l.req) ok=true; if(l.tipo==='rutinas'&&data.rutinas>=l.req) ok=true; if(l.tipo==='racha'&&data.racha>=l.req) ok=true; if(l.tipo==='nivel'&&data.nivel>=l.req) ok=true; if(l.tipo==='objetivo'&&data.objetivos>=l.req) ok=true; if(ok){data.logros.push({id:l.id,fecha:new Date().toISOString()}); data.xp+=l.xp; toast(`${l.icon} ${l.n} desbloqueado! +${l.xp} XP`); save();}}); }

window.sumarDia=()=>{ const h=checkDia(); if(data.rachaHistorial.includes(h)){toast('Ya registrado hoy ✅'); return;} const ayer=new Date(); ayer.setDate(ayer.getDate()-1); const aStr=ayer.toISOString().split('T')[0]; const ult=data.rachaHistorial[data.rachaHistorial.length-1]; if(data.rachaHistorial.length>0 && ult!==aStr){ data.rachaHistorial=[h]; data.racha=1; toast('Racha reiniciada - te saltaste un día'); } else { data.rachaHistorial.push(h); data.racha=data.rachaHistorial.length; addXP(15,'racha'); } save(); render(); toast('Día registrado 🔥'); }
window.quitarDia=()=>{ const h=checkDia(); if(!data.rachaHistorial.includes(h) || data.rachaHistorial[data.rachaHistorial.length-1]!==h){ toast('Nada que deshacer'); return;} if(!confirm(`¿Deshacer el día de hoy (${h})? Es el que acabas de agregar.`)) return; data.rachaHistorial.pop(); data.racha=data.rachaHistorial.length; save(); render(); toast('Deshecho ↩️'); }

function getRachaStrip(){
  const today=new Date(); const days=[];
  for(let i=13;i>=0;i--){ const d=new Date(today); d.setDate(today.getDate()-i); const str=d.toISOString().split('T')[0]; const done=data.rachaHistorial.includes(str); const isToday=i===0; const dayName=d.toLocaleDateString('es',{weekday:'short'}).slice(0,2); const dayNum=d.getDate(); days.push({str, done, isToday, dayName, dayNum}); }
  return days;
}

function renderCharts(){
  setTimeout(()=>{
   const ctxCal=document.getElementById('chartCal'); const ctxMacro=document.getElementById('chartMacro'); const ctxPeso=document.getElementById('chartPeso');
   if(!ctxCal && !ctxMacro && !ctxPeso) return;
   const totalCal=data.alimentos.reduce((s,x)=>s+x.cal,0);
   const totalProt=data.alimentos.reduce((s,x)=>s+x.prot,0);
   const totalCarb=data.alimentos.reduce((s,x)=>s+x.carb,0);
   const totalGrasa=data.alimentos.reduce((s,x)=>s+x.grasa,0);
   if(ctxCal){
     if(chartCal) chartCal.destroy();
     chartCal=new Chart(ctxCal,{type:'bar',data:{labels:['Hoy'],datasets:[{label:'Calorías',data:[totalCal],backgroundColor:'rgba(34,197,94,.8)',borderColor:'#22c55e',borderWidth:1,borderRadius:8},{label:'Meta 2200',data:[2200],backgroundColor:'rgba(255,255,255,.08)',borderColor:'rgba(255,255,255,.2)',borderWidth:1,borderRadius:8}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8aa08a',font:{size:10}}}},scales:{x:{grid:{color:'rgba(28,51,28,.5)'},ticks:{color:'#8aa08a'}},y:{grid:{color:'rgba(28,51,28,.5)'},ticks:{color:'#8aa08a'}}}}});
   }
   if(ctxMacro){
     if(chartMacro) chartMacro.destroy();
     chartMacro=new Chart(ctxMacro,{type:'doughnut',data:{labels:['Proteína','Carbohidratos','Grasas'],datasets:[{data:[totalProt,totalCarb,totalGrasa],backgroundColor:['#22c55e','#4ade80','#f59e0b'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#8aa08a',padding:12,font:{size:11}}}},cutout:'68%'}});
   }
   if(ctxPeso){
     const labels=data.historialPeso.slice(-7).map((_,i)=>`D${i+1}`); const vals=data.historialPeso.slice(-7);
     new Chart(ctxPeso,{type:'line',data:{labels:labels.length?labels:['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Hoy'],datasets:[{label:'Peso kg',data:vals.length?vals:[70,70.5,70.2,69.8,69.5,69.3,parseFloat(data.perfil.peso)||69],tension:.4,borderColor:'#22c55e',backgroundColor:'rgba(34,197,94,.15)',fill:true,pointBackgroundColor:'#22c55e',pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:'#8aa08a',font:{size:10}}},y:{grid:{color:'rgba(28,51,28,.4)'},ticks:{color:'#8aa08a'}}}}});
   }
  },100);
}

function renderAuth(){
 const appDiv=document.getElementById('app');
 const mode=window.authMode;
 if(mode==='login'){
  appDiv.innerHTML=`<div class="card" style="max-width:440px;margin:20px auto">
   <div style="text-align:center"><div style="font-size:44px" class="flame">🔥</div><h2 style="margin:12px 0 4px;font-weight:900;letter-spacing:-.6px;font-size:22px">NutriSport</h2><p style="font-size:12px;color:var(--muted)">Transforma tu cuerpo, domina tu progreso</p></div>
   <div style="display:flex;gap:8px;margin:18px 0;background:var(--card2);padding:5px;border-radius:14px;border:1px solid var(--border)"><button class="btn" style="flex:1" onclick="window.setAuthMode('login')">Entrar</button><button class="btn-ghost" style="flex:1;padding:12px;border-radius:10px;border:none" onclick="window.setAuthMode('register')">Registrarse</button></div>
   <label style="font-size:11px;color:var(--muted)">Correo</label><input id="em" placeholder="tu@email.com" autocomplete="email">
   <label style="font-size:11px;color:var(--muted);margin-top:12px;display:block">Contraseña</label><input id="pw" type="password" placeholder="••••••••" autocomplete="current-password">
   <button class="btn" style="width:100%;margin-top:20px" onclick="window.login()">Entrar a NutriSport →</button>
   <button class="btn-ghost" style="width:100%;margin-top:10px;padding:12px;border-radius:14px" onclick="window.resetPass()">¿Olvidaste tu contraseña?</button>
   <div style="text-align:center;margin-top:18px;font-size:11px;color:#6b7a6b">¿Nuevo? <span style="color:#4ade80;cursor:pointer;font-weight:800" onclick="window.setAuthMode('register')">Crea cuenta gratis →</span></div>
   <div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px"><div class="stat" style="padding:12px"><b style="font-size:18px">🔥</b><span>Racha</span></div><div class="stat" style="padding:12px"><b style="font-size:18px">🏆</b><span>Logros</span></div><div class="stat" style="padding:12px"><b style="font-size:18px">📊</b><span>Gráficas</span></div></div>
  </div>`;
 } else {
  appDiv.innerHTML=`<div class="card" style="max-width:440px;margin:16px auto">
   <div style="text-align:center"><div style="font-size:36px">🚀</div><h2 style="margin:8px 0 4px;font-weight:900;font-size:20px">Únete a NutriSport</h2><p style="font-size:11px;color:var(--muted)">Crea tu cuenta en 30 segundos, gratis</p></div>
   <div style="display:flex;gap:8px;margin:14px 0;background:var(--card2);padding:5px;border-radius:14px;border:1px solid var(--border)"><button class="btn-ghost" style="flex:1;padding:10px;border-radius:10px;border:none" onclick="window.setAuthMode('login')">Entrar</button><button class="btn" style="flex:1" onclick="window.setAuthMode('register')">Registrarse</button></div>
   <label style="font-size:11px;color:var(--muted)">Nombre</label><input id="rgNombre" placeholder="Ej. Luis">
   <label style="font-size:11px;color:var(--muted);margin-top:10px;display:block">Correo</label><input id="rgEm" placeholder="tu@email.com">
   <label style="font-size:11px;color:var(--muted);margin-top:10px;display:block">Contraseña</label><input id="rgPw" type="password" placeholder="Mín. 6 caracteres">
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px"><div><label style="font-size:11px;color:var(--muted)">Peso kg</label><input id="rgPeso" placeholder="70"></div><div><label style="font-size:11px;color:var(--muted)">Altura cm</label><input id="rgAlt" placeholder="175"></div></div>
   <label style="font-size:11px;color:var(--muted);margin-top:10px;display:block">Objetivo</label><select id="rgObj"><option value="volumen">Volumen 💪</option><option value="definicion">Definición 🔥</option><option value="mantenimiento">Mantenimiento ⚖️</option></select>
   <button class="btn" style="width:100%;margin-top:16px" onclick="window.register()">Crear cuenta gratis ✨</button>
   <div style="text-align:center;margin-top:12px;font-size:11px;color:#6b7a6b">¿Ya tienes cuenta? <span style="color:#4ade80;cursor:pointer;font-weight:700" onclick="window.setAuthMode('login')">Inicia sesión</span></div>
  </div>`;
 }
}

function render(){
 const a=document.getElementById('app');
 const isPrem=user && premium.includes(user.email);
 if(!user){ renderAuth(); document.getElementById('nav').innerHTML=''; document.getElementById('hdr').textContent=''; return; }
 document.getElementById('hdr').textContent=`Nv ${data.nivel} • ${data.xp} XP • 🔥${data.racha}`;
 document.getElementById('nav').innerHTML=`
  <button class="${page==='dashboard'?'active':''}" onclick="window.go('dashboard')"><i>🏠</i>Inicio</button>
  <button class="${page==='alimentos'?'active':''}" onclick="window.go('alimentos')"><i>🍎</i>Alimentos</button>
  <button class="${page==='rutinas'?'active':''}" onclick="window.go('rutinas')"><i>💪</i>Rutinas</button>
  <button class="${page==='stats'?'active':''}" onclick="window.go('stats')"><i>📊</i>Stats</button>
  <button class="${page==='logros'?'active':''}" onclick="window.go('logros')"><i>🏆</i>Logros</button>
  <button class="${page==='perfil'?'active':''}" onclick="window.go('perfil')"><i>👤</i>Perfil</button>
 `;
 if(page==='dashboard'){
  const h=hoyStr(); const ya=data.rachaHistorial.includes(h); const prog=data.xp%300; const totalCal=data.alimentos.reduce((s,x)=>s+x.cal,0); const totalProt=data.alimentos.reduce((s,x)=>s+x.prot,0); const strip=getRachaStrip();
  a.innerHTML=`
   <div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:20px;font-weight:900;letter-spacing:-.6px">Hola, ${data.perfil.nombre||user.email.split('@')[0]} 👋</div><div style="font-size:12px;color:var(--muted);margin-top:3px">Nivel ${data.nivel} • ${data.xp} XP • ${data.logros.length} logros desbloqueados</div></div><div style="width:50px;height:50px;border-radius:16px;background:linear-gradient(135deg,#0f1a0f,#111d11);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 8px 20px rgba(0,0,0,.3)" class="flame">🔥</div></div><div style="margin-top:18px"><div class="progress"><div class="progress-bar" style="width:${(prog/300)*100}%"></div></div><div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:6px"><span style="font-family:'JetBrains Mono',monospace">${prog}/300 XP</span><span>Siguiente nivel → ${data.nivel+1}</span></div></div></div>
   
   <div class="card"><div class="card-title">🔥 Racha profesional • Solo 1 por día</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div><div style="font-size:32px;font-weight:900;letter-spacing:-1px">${data.racha}</div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;font-weight:700">Días seguidos</div></div><div style="text-align:right"><div style="font-size:12px;font-weight:700">${ya?'✅ Hoy registrado':'⏳ Pendiente hoy'}</div><div style="font-size:10px;color:var(--muted)">${data.rachaHistorial.length} días en total</div></div></div>
    <div class="racha-strip">${strip.map(d=>`<div class="racha-day ${d.done?'done':''} ${d.isToday?'today':''}"><span style="font-size:9px;color:var(--muted);text-transform:uppercase;font-weight:700">${d.dayName}</span><span style="font-size:14px;font-weight:800;margin:2px 0">${d.dayNum}</span><span style="font-size:10px">${d.done?'🔥':'○'}</span></div>`).join('')}</div>
    <div style="display:flex;gap:10px;margin-top:14px"><button class="btn" onclick="window.sumarDia()" ${ya?'disabled':''} style="flex:1">${ya?'✅ Registrado hoy':'🔥 Registrar día de hoy'}</button><button class="btn-ghost" style="width:108px" onclick="window.quitarDia()" ${!ya?'disabled':''}>Deshacer</button></div>
    <p style="font-size:10px;color:var(--muted);margin-top:10px;line-height:1.4">Deshacer quita solo el día que acabas de agregar hoy, no un día adicional. Si te saltas un día, la racha reinicia a 1.</p>
   </div>

   <div class="card"><div class="card-title">📊 Hoy</div><div class="grid3"><div class="stat"><b>${totalCal}</b><span>Kcal</span></div><div class="stat"><b>${totalProt.toFixed(1)}</b><span>Proteína g</span></div><div class="stat"><b>${data.alimentos.length}</b><span>Alimentos</span></div></div><div style="margin-top:12px"><div class="chart-wrap" style="padding:12px"><canvas id="chartCal" height="120"></canvas></div></div></div>

   ${!isPrem?`<div class="card" style="padding:0;overflow:hidden"><div id="ad-dashboard" style="min-height:90px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#4ade80;background:linear-gradient(180deg,#0f1a0f,#111d11)">Espacio publicitario • Solo Dashboard</div></div>`:''}
  `;
  renderCharts();
 } else if(page==='alimentos'){
  a.innerHTML=`<div class="card"><div class="card-title">🍎 Alimentos • ${ALIMENTOS_DB.length} disponibles</div><div style="display:flex;gap:8px"><input id="searchAl" placeholder="Buscar pollo, arroz, huevo, aguacate..." oninput="window.filterAl()" style="flex:1"><select id="catAl" onchange="window.filterAl()" style="width:130px"><option value="">Todas</option><option>Proteína</option><option>Carbohidrato</option><option>Fruta</option><option>Verdura</option><option>Grasa saludable</option><option>Lácteo</option><option>Suplemento</option></select></div><div id="listAl" style="margin-top:14px;max-height:60vh;overflow-y:auto"></div></div><div class="card"><div class="card-title">Mis alimentos hoy (${data.alimentos.length}) • ${data.alimentos.reduce((s,x)=>s+x.cal,0)} kcal</div><div id="misAl">${data.alimentos.map((al,i)=>`<div class="food-card"><span style="font-size:12px"><span style="margin-right:6px">${al.emoji||'🍽️'}</span>${al.nombre} • ${al.cal} kcal</span><button onclick="window.delAl(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px">✕</button></div>`).join('')||'<span style="color:var(--muted);font-size:12px">Sin alimentos hoy — busca y añade arriba</span>'}</div></div>`;
  window.filterAl();
 } else if(page==='rutinas'){
  a.innerHTML=`<div class="card"><div class="card-title">💪 Rutinas • ${RUTINAS_DB.length} ejercicios</div><div style="display:flex;gap:8px;margin-bottom:12px"><input id="searchRut" placeholder="Buscar sentadilla, press..." oninput="window.filterRut()" style="flex:1"><select id="catRut" onchange="window.filterRut()" style="width:130px"><option value="">Todas</option><option>Piernas</option><option>Pecho</option><option>Espalda</option><option>Hombros</option><option>Brazos</option><option>Core</option><option>Cardio</option></select></div><div id="listRut" style="max-height:60vh;overflow-y:auto"></div></div><div class="card"><div class="card-title">Mis rutinas (${data.ejercicios.length})</div><div>${data.ejercicios.map((ex,i)=>`<div class="food-card"><span style="font-size:12px">${ex.emoji||'💪'} ${ex.nombre} • ${ex.categoria}</span><button onclick="window.delRut(${i})" style="background:none;border:none;color:#ef4444">✕</button></div>`).join('')||'<span style="color:var(--muted);font-size:12px">Sin rutinas — añade arriba</span>'}</div></div>`;
  window.filterRut();
 } else if(page==='stats'){
  a.innerHTML=`<div class="card"><div class="card-title">📊 Estadísticas con gráficas</div>
   <div class="grid2"><div class="stat"><b>${parseFloat(data.perfil.peso)||'--'}</b><span>Peso kg</span></div><div class="stat"><b>${parseFloat(data.perfil.altura)||'--'}</b><span>Altura cm</span></div><div class="stat"><b>${(() => {const p=parseFloat(data.perfil.peso),h=parseFloat(data.perfil.altura); return p&&h? (p/((h/100)*(h/100))).toFixed(1) : '--';})()}</b><span>IMC</span></div><div class="stat"><b>${data.racha}</b><span>Racha días</span></div></div>
   <div style="margin-top:16px"><div class="chart-wrap"><div style="font-size:11px;color:var(--muted);margin-bottom:8px;font-weight:700">CALORÍAS HOY VS META</div><div style="height:160px"><canvas id="chartCal"></canvas></div></div>
   <div class="chart-wrap"><div style="font-size:11px;color:var(--muted);margin-bottom:8px;font-weight:700">MACROS HOY</div><div style="height:180px"><canvas id="chartMacro"></canvas></div></div>
   <div class="chart-wrap"><div style="font-size:11px;color:var(--muted);margin-bottom:8px;font-weight:700">PESO ÚLTIMAS SEMANAS</div><div style="height:160px"><canvas id="chartPeso"></canvas></div></div>
   </div>
   <p style="font-size:10px;color:var(--muted);margin-top:12px;line-height:1.4">El IMC es orientativo y no sustituye consejo médico. Gráficas en tiempo real con tus datos.</p>
  </div>`;
  renderCharts();
 } else if(page==='logros'){
  a.innerHTML=`<div class="card"><div class="card-title">🏆 Logros • ${data.logros.length}/${LOGROS.length} desbloqueados • ${data.xp} XP total</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${LOGROS.map(l=>{const d=data.logros.find(x=>x.id===l.id); return `<div class="logro ${d?'on':''}"><div style="font-size:28px" class="${d?'flame':''}">${l.icon}</div><div style="font-size:11px;font-weight:800;margin-top:6px">${l.n}</div><div style="font-size:9px;color:var(--muted)">${l.d}</div><div style="font-size:9px;margin-top:6px;color:${d?'#4ade80':'#6b7a6b'};font-weight:700">${d?'DESBLOQUEADO':`🔒 ${l.req} ${l.tipo}`}</div><div style="font-size:8px;color:var(--muted);margin-top:2px">+${l.xp} XP</div></div>`}).join('')}</div></div>`;
 } else if(page==='perfil'){
  a.innerHTML=`<div class="card"><div class="card-title">👤 Perfil • Guardado manual</div>
   <label style="font-size:11px;color:var(--muted)">Nombre</label><input id="pn" value="${perfilEdit.nombre||''}" oninput="window.editPerfil('nombre',this.value)">
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px"><div><label style="font-size:11px;color:var(--muted)">Peso kg</label><input id="pp" value="${perfilEdit.peso||''}" oninput="window.editPerfil('peso',this.value)"></div><div><label style="font-size:11px;color:var(--muted)">Altura cm</label><input id="pa" value="${perfilEdit.altura||''}" oninput="window.editPerfil('altura',this.value)"></div></div>
   <label style="font-size:11px;color:var(--muted);margin-top:12px;display:block">Objetivo</label><select id="po" onchange="window.editPerfil('objetivo',this.value)"><option value="volumen" ${perfilEdit.objetivo==='volumen'?'selected':''}>Volumen 💪</option><option value="definicion" ${perfilEdit.objetivo==='definicion'?'selected':''}>Definición 🔥</option><option value="mantenimiento" ${perfilEdit.objetivo==='mantenimiento'?'selected':''}>Mantenimiento ⚖️</option></select>
   <div style="display:flex;gap:10px;margin-top:18px"><button class="btn" id="btnSave" onclick="window.savePerfil()" ${!hasPending?'disabled':''}>Guardar cambios</button><button class="btn-ghost" onclick="window.cancelPerfil()">Cancelar</button></div>
   ${hasPending?'<p style="font-size:10px;color:#f59e0b;margin-top:10px">⚠️ Tienes cambios sin guardar</p>':''}
  </div>
  <div class="card"><div class="card-title">📸 Foto de perfil</div><input type="file" accept="image/*" onchange="window.changePhoto(event)"><div style="margin-top:12px">${data.photoURL?`<img src="${data.photoURL}" style="width:88px;height:88px;border-radius:18px;object-fit:cover;border:2px solid var(--border)">`:''}</div></div>
  <div class="card"><div class="card-title">Cuenta</div><p style="font-size:12px;color:var(--muted)">${user.email}</p><div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="stat"><b>${data.nivel}</b><span>Nivel</span></div><div class="stat"><b>${data.xp}</b><span>XP</span></div></div><button class="btn-ghost" style="margin-top:14px;width:100%" onclick="window.logout()">Cerrar sesión</button></div>
  `;
 }
}

window.go=p=>{ if(hasPending && page==='perfil' && p!=='perfil'){ if(!confirm('Tienes cambios sin guardar, ¿salir sin guardar?')) return; hasPending=false; perfilEdit={...data.perfil}; } page=p; render(); if(page==='stats') renderCharts(); };
window.setAuthMode=(m)=>{ window.authMode=m; render(); };
window.filterAl=()=>{ const q=(document.getElementById('searchAl')?.value||'').toLowerCase(); const cat=(document.getElementById('catAl')?.value||'').toLowerCase(); const list=document.getElementById('listAl'); if(!list) return; let filtered=ALIMENTOS_DB.filter(a=>a.nombre.toLowerCase().includes(q)); if(cat) filtered=filtered.filter(a=>a.cat.toLowerCase()===cat); list.innerHTML=filtered.map(a=>`<div class="food-card"><div><b style="font-size:12px">${a.emoji} ${a.nombre}</b><br><span style="font-size:10px;color:var(--muted)">${a.cal} kcal • P:${a.prot}g C:${a.carb}g G:${a.grasa}g • ${a.cat}</span></div><button class="btn" style="width:auto;padding:8px 14px;font-size:12px" onclick="window.addAl(${a.id})">Añadir</button></div>`).join('')||'<div style="text-align:center;color:var(--muted);padding:20px;font-size:12px">Sin resultados</div>'; };
window.filterRut=()=>{ const q=(document.getElementById('searchRut')?.value||'').toLowerCase(); const cat=(document.getElementById('catRut')?.value||'').toLowerCase(); const list=document.getElementById('listRut'); if(!list) return; let filtered=RUTINAS_DB.filter(a=>a.nombre.toLowerCase().includes(q)); if(cat) filtered=filtered.filter(a=>a.categoria.toLowerCase()===cat); list.innerHTML=filtered.map(r=>`<div class="food-card"><div><b style="font-size:12px">${r.emoji} ${r.nombre}</b><br><span style="font-size:10px;color:var(--muted)">${r.categoria} • ${r.dif} • ${r.desc}</span></div><button class="btn" style="width:auto;padding:8px 14px;font-size:12px" onclick="window.addRut('${r.id}')">Añadir</button></div>`).join(''); };
window.addAl=(id)=>{ const al=ALIMENTOS_DB.find(x=>x.id===id); data.alimentos.push({...al, fecha:new Date().toISOString()}); data.comidas++; if(data.perfil.peso) data.historialPeso.push(parseFloat(data.perfil.peso)); data.historialCal.push(al.cal); addXP(10,'comida'); save(); render(); toast(`Añadido ${al.nombre} ✅`); };
window.delAl=(i)=>{ data.alimentos.splice(i,1); save(); render(); };
window.addRut=(id)=>{ const r=RUTINAS_DB.find(x=>x.id===id); data.ejercicios.push({...r, fecha:new Date().toISOString()}); data.rutinas++; addXP(25,'rutina'); save(); render(); toast(`${r.nombre} añadida 💪`); };
window.delRut=(i)=>{ data.ejercicios.splice(i,1); save(); render(); };
window.editPerfil=(k,v)=>{ perfilEdit[k]=v; hasPending=JSON.stringify(perfilEdit)!==JSON.stringify(data.perfil); render(); };
window.savePerfil=async()=>{ data.perfil={...perfilEdit}; if(data.perfil.peso) data.historialPeso.push(parseFloat(data.perfil.peso)); await save(); hasPending=false; render(); toast('Guardado ☁️'); };
window.cancelPerfil=()=>{ perfilEdit={...data.perfil}; hasPending=false; render(); };
window.changePhoto=(e)=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ const img=new Image(); img.onload=()=>{ const canvas=document.createElement('canvas'); const max=240; let w=img.width,h=img.height; if(w>h){ if(w>max){h*=max/w; w=max;} } else { if(h>max){w*=max/h; h=max;} } canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h); data.photoURL=canvas.toDataURL('image/jpeg',0.6); save(); render(); }; img.src=r.result; }; r.readAsDataURL(f); };
window.login=async()=>{ const e=document.getElementById('em')?.value.trim(); const p=document.getElementById('pw')?.value; if(!e||!p){toast('Completa campos'); return;} try{ const c=await signInWithEmailAndPassword(auth,e,p); user=c.user; }catch(err){ if(err.code==='auth/user-not-found' || err.code==='auth/invalid-credential'){ toast('Usuario no registrado'); } else toast(err.message);} };
window.register=async()=>{
 const nombre=document.getElementById('rgNombre')?.value.trim()||''; const email=document.getElementById('rgEm')?.value.trim()||''; const pass=document.getElementById('rgPw')?.value||''; const peso=document.getElementById('rgPeso')?.value.trim()||''; const altura=document.getElementById('rgAlt')?.value.trim()||''; const obj=document.getElementById('rgObj')?.value||'volumen';
 if(!email||!pass||pass.length<6){toast('Correo y contraseña mínimo 6'); return;} if(!nombre){toast('Pon tu nombre'); return;}
 try{ const cred=await createUserWithEmailAndPassword(auth,email,pass); user=cred.user; data={email:email,xp:10,nivel:1,racha:0,rachaHistorial:[],comidas:0,rutinas:0,objetivos:0,logros:[{id:'primer',fecha:new Date().toISOString()}],cont:{fecha:'',comidasHoy:0,rutinasHoy:0,objHoy:0}, alimentos:[], ejercicios:[], perfil:{peso:peso,altura:altura,objetivo:obj,nombre:nombre}, photoURL:'', historialPeso:[], historialCal:[]}; await save(); toast('¡Bienvenido a NutriSport! 🎉'); render(); }catch(err){ if(err.code==='auth/email-already-in-use'){ toast('Ese correo ya existe'); window.setAuthMode('login'); } else toast(err.message); }
};
window.resetPass=async()=>{ const e=document.getElementById('em')?.value.trim()||prompt('Correo para recuperar:'); if(!e) return; try{ await sendPasswordResetEmail(auth,e); toast('Correo enviado 📧'); }catch(err){toast(err.message);} };
window.logout=async()=>{ if(hasPending && !confirm('Cambios sin guardar, ¿salir?')) return; await signOut(auth); user=null; data=null; render(); };

onAuthStateChanged(auth, async(u)=>{ if(u){ user=u; await load(u.uid); checkDia(); page='dashboard'; render(); } else { user=null; render(); } });
