
import { auth, db, doc, getDoc, setDoc, serverTimestamp, premium, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged } from './firebase.js';
import { ALIMENTOS_DB, RUTINAS_DB, LOGROS } from './data.js';

let user=null, data=null, page='dashboard', perfilEdit={}, hasPending=false;
window.authMode='login';

function toast(m){const t=document.getElementById('toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',2500)}
window.toast=toast;

async function load(uid){
 try{
  const s=await getDoc(doc(db,'users',uid));
  if(s.exists()) data=s.data();
  else data={email:user.email,xp:0,nivel:1,racha:0,rachaHistorial:[],comidas:0,rutinas:0,objetivos:0,logros:[],cont:{fecha:'',comidasHoy:0,rutinasHoy:0,objHoy:0}, alimentos:[], ejercicios:[], perfil:{peso:'',altura:'',objetivo:'volumen',nombre:''}, photoURL:''};
  if(!data.rachaHistorial) data.rachaHistorial=[];
  if(!data.logros) data.logros=[];
  if(!data.cont) data.cont={fecha:'',comidasHoy:0,rutinasHoy:0,objHoy:0};
  if(!data.alimentos) data.alimentos=[];
  if(!data.ejercicios) data.ejercicios=[];
  if(!data.perfil) data.perfil={peso:'',altura:'',objetivo:'volumen',nombre:''};
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
function checkLogros(){ LOGROS.forEach(l=>{ if(data.logros.find(x=>x.id===l.id)) return; let ok=false; if(l.tipo==='comidas'&&data.comidas>=l.req) ok=true; if(l.tipo==='rutinas'&&data.rutinas>=l.req) ok=true; if(l.tipo==='racha'&&data.racha>=l.req) ok=true; if(l.tipo==='nivel'&&data.nivel>=l.req) ok=true; if(l.tipo==='objetivo'&&data.objetivos>=l.req) ok=true; if(ok){data.logros.push({id:l.id,fecha:new Date().toISOString()}); data.xp+=l.xp; toast(`${l.icon} ${l.n} desbloqueado!`); save();}}); }

window.sumarDia=()=>{ const h=checkDia(); if(data.rachaHistorial.includes(h)){toast('Ya registrado hoy'); return;} const ayer=new Date(); ayer.setDate(ayer.getDate()-1); const aStr=ayer.toISOString().split('T')[0]; const ult=data.rachaHistorial[data.rachaHistorial.length-1]; if(data.rachaHistorial.length>0 && ult!==aStr){ data.rachaHistorial=[h]; data.racha=1; } else { data.rachaHistorial.push(h); data.racha=data.rachaHistorial.length; addXP(15,'racha'); } save(); render(); toast('Día registrado 🔥'); }
window.quitarDia=()=>{ const h=checkDia(); if(!data.rachaHistorial.includes(h) || data.rachaHistorial[data.rachaHistorial.length-1]!==h){ toast('Nada que deshacer'); return;} data.rachaHistorial.pop(); data.racha=data.rachaHistorial.length; save(); render(); toast('Deshecho'); }

function renderAuth(){
 const appDiv=document.getElementById('app');
 const mode=window.authMode;
 if(mode==='login'){
  appDiv.innerHTML=`<div class="card" style="max-width:420px;margin:24px auto">
   <div style="text-align:center"><div style="font-size:42px;animation:pulse 2s infinite">🔥</div><h2 style="margin:12px 0 4px;font-weight:900;letter-spacing:-.5px">NutriSport</h2><p style="font-size:12px;color:#9ca3af">Transforma tu cuerpo, domina tu progreso</p></div>
   <div style="display:flex;gap:8px;margin:18px 0;background:#0f1a0f;padding:5px;border-radius:14px"><button class="btn" style="flex:1" onclick="window.setAuthMode('login')">Entrar</button><button class="btn-ghost" style="flex:1;padding:12px;border-radius:10px;border:none" onclick="window.setAuthMode('register')">Registrarse</button></div>
   <label style="font-size:11px;color:#9ca3af">Correo</label><input id="em" placeholder="tu@email.com">
   <label style="font-size:11px;color:#9ca3af;margin-top:10px;display:block">Contraseña</label><input id="pw" type="password" placeholder="••••••••">
   <button class="btn" style="width:100%;margin-top:18px" onclick="window.login()">Entrar a NutriSport</button>
   <button class="btn-ghost" style="width:100%;margin-top:8px;padding:12px;border-radius:14px" onclick="window.resetPass()">¿Olvidaste tu contraseña?</button>
   <div style="text-align:center;margin-top:16px;font-size:11px;color:#6b7280">¿Nuevo? <span style="color:#4ade80;cursor:pointer;font-weight:700" onclick="window.setAuthMode('register')">Crea cuenta gratis →</span></div>
   <div style="margin-top:18px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px"><div class="stat" style="padding:10px"><b>🔥</b><span>Racha</span></div><div class="stat" style="padding:10px"><b>🏆</b><span>Logros</span></div><div class="stat" style="padding:10px"><b>📊</b><span>Stats</span></div></div>
  </div>`;
 } else {
  appDiv.innerHTML=`<div class="card" style="max-width:420px;margin:20px auto">
   <div style="text-align:center"><div style="font-size:34px">🚀</div><h2 style="margin:8px 0 4px;font-weight:900">Únete a NutriSport</h2><p style="font-size:11px;color:#9ca3af">Crea tu cuenta en 30 segundos, gratis</p></div>
   <div style="display:flex;gap:8px;margin:14px 0;background:#0f1a0f;padding:5px;border-radius:14px"><button class="btn-ghost" style="flex:1;padding:10px;border-radius:10px;border:none" onclick="window.setAuthMode('login')">Entrar</button><button class="btn" style="flex:1" onclick="window.setAuthMode('register')">Registrarse</button></div>
   <label style="font-size:11px;color:#9ca3af">Nombre</label><input id="rgNombre" placeholder="Ej. Luis">
   <label style="font-size:11px;color:#9ca3af;margin-top:8px;display:block">Correo</label><input id="rgEm" placeholder="tu@email.com">
   <label style="font-size:11px;color:#9ca3af;margin-top:8px;display:block">Contraseña</label><input id="rgPw" type="password" placeholder="Mín. 6 caracteres">
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px"><div><label style="font-size:11px;color:#9ca3af">Peso kg</label><input id="rgPeso" placeholder="70"></div><div><label style="font-size:11px;color:#9ca3af">Altura cm</label><input id="rgAlt" placeholder="175"></div></div>
   <label style="font-size:11px;color:#9ca3af;margin-top:8px;display:block">Objetivo</label><select id="rgObj"><option value="volumen">Volumen 💪</option><option value="definicion">Definición 🔥</option><option value="mantenimiento">Mantenimiento ⚖️</option></select>
   <button class="btn" style="width:100%;margin-top:16px" onclick="window.register()">Crear cuenta gratis ✨</button>
   <div style="text-align:center;margin-top:10px;font-size:11px;color:#6b7280">¿Ya tienes cuenta? <span style="color:#4ade80;cursor:pointer;font-weight:700" onclick="window.setAuthMode('login')">Inicia sesión</span></div>
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
  const h=hoyStr(); const ya=data.rachaHistorial.includes(h); const prog=data.xp%300; const totalCal=data.alimentos.reduce((s,x)=>s+x.cal,0);
  a.innerHTML=`
   <div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:20px;font-weight:900;letter-spacing:-.5px">Hola, ${data.perfil.nombre||user.email.split('@')[0]} 👋</div><div style="font-size:12px;color:#9ca3af;margin-top:2px">Nivel ${data.nivel} • ${data.xp} XP • ${data.logros.length} logros</div></div><div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#0f1a0f,#111d11);border:1px solid #1a2e1a;display:flex;align-items:center;justify-content:center;font-size:22px">🔥</div></div><div style="margin-top:16px"><div class="progress"><div class="progress-bar" style="width:${(prog/300)*100}%"></div></div><div style="display:flex;justify-content:space-between;font-size:10px;color:#6b7280;margin-top:6px"><span>${prog}/300 XP</span><span>Siguiente nivel → ${data.nivel+1}</span></div></div></div>
   <div class="card"><div class="card-title">Racha 🔥</div><div class="grid2"><div class="stat"><b>${data.racha}</b><span>Días seguidos</span></div><div class="stat"><b>${data.logros.length}/${LOGROS.length}</b><span>Logros</span></div></div><div style="display:flex;gap:10px;margin-top:14px"><button class="btn" onclick="window.sumarDia()" ${ya?'disabled':''}>${ya?'✅ Registrado hoy':'🔥 Registrar día'}</button><button class="btn btn-ghost" style="width:110px" onclick="window.quitarDia()" ${!ya?'disabled':''}>Deshacer</button></div></div>
   <div class="card"><div class="card-title">Hoy</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px"><div class="stat"><b>${totalCal}</b><span>Kcal</span></div><div class="stat"><b>${data.alimentos.length}</b><span>Alimentos</span></div><div class="stat"><b>${data.ejercicios.length}</b><span>Rutinas</span></div></div></div>
   ${!isPrem?`<div class="card" style="padding:0;overflow:hidden"><div id="ad-dashboard" style="min-height:90px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#4ade80;background:linear-gradient(180deg,#0f1a0f,#111d11)">Espacio publicitario • Solo Dashboard</div></div>`:''}
  `;
 } else if(page==='alimentos'){
  a.innerHTML=`<div class="card"><div class="card-title">🍎 Alimentos • Base NutriSport</div><input id="searchAl" placeholder="Buscar pollo, arroz, huevo..." oninput="window.filterAl()"><div id="listAl" style="margin-top:12px"></div></div><div class="card"><div class="card-title">Mis alimentos hoy (${data.alimentos.length})</div><div id="misAl">${data.alimentos.map((al,i)=>`<div class="food-card"><span style="font-size:12px"><span style="margin-right:6px">${al.emoji||'🍽️'}</span>${al.nombre} • ${al.cal} kcal</span><button onclick="window.delAl(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer">✕</button></div>`).join('')||'<span style="color:#6b7280;font-size:12px">Sin alimentos hoy — añade arriba</span>'}</div></div>`;
  window.filterAl();
 } else if(page==='rutinas'){
  a.innerHTML=`<div class="card"><div class="card-title">💪 Rutinas • Elige y añade</div><div style="display:grid;gap:10px">${RUTINAS_DB.map(r=>`<div class="food-card"><div><b style="font-size:13px">${r.emoji} ${r.nombre}</b><br><span style="font-size:10px;color:#9ca3af">${r.categoria} • MET ${r.met}</span></div><button class="btn" style="width:auto;padding:8px 14px" onclick="window.addRut('${r.id}')">Añadir</button></div>`).join('')}</div></div><div class="card"><div class="card-title">Mis rutinas (${data.ejercicios.length})</div><div>${data.ejercicios.map((ex,i)=>`<div class="food-card"><span style="font-size:12px">${ex.emoji||'💪'} ${ex.nombre}</span><button onclick="window.delRut(${i})" style="background:none;border:none;color:#ef4444">✕</button></div>`).join('')||'<span style="color:#6b7280;font-size:12px">Sin rutinas</span>'}</div></div>`;
 } else if(page==='stats'){
  const peso=parseFloat(data.perfil.peso)||0; const altura=parseFloat(data.perfil.altura)||0; let imc='--'; if(peso>0&&altura>0){imc=(peso/((altura/100)*(altura/100))).toFixed(1);}
  a.innerHTML=`<div class="card"><div class="card-title">📊 Estadísticas</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px"><div class="stat"><b>${peso||'--'}</b><span>Peso kg</span></div><div class="stat"><b>${altura||'--'}</b><span>Altura cm</span></div><div class="stat"><b>${imc}</b><span>IMC</span></div><div class="stat"><b>${data.racha}</b><span>Racha</span></div></div><p style="font-size:10px;color:#6b7280;margin-top:12px">IMC orientativo, no sustituye consejo médico.</p></div><div class="card"><div class="card-title">Progreso total</div><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px"><div class="stat"><b>${data.xp}</b><span>XP total</span></div><div class="stat"><b>${data.nivel}</b><span>Nivel</span></div><div class="stat"><b>${data.comidas}</b><span>Comidas</span></div><div class="stat"><b>${data.rutinas}</b><span>Rutinas</span></div></div></div>`;
 } else if(page==='logros'){
  a.innerHTML=`<div class="card"><div class="card-title">🏆 Logros • ${data.logros.length}/${LOGROS.length} desbloqueados</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${LOGROS.map(l=>{const d=data.logros.find(x=>x.id===l.id); return `<div class="logro ${d?'on':''}"><div style="font-size:28px">${l.icon}</div><div style="font-size:11px;font-weight:800;margin-top:6px">${l.n}</div><div style="font-size:9px;color:#9ca3af">${l.d}</div>${d?`<div style="font-size:8px;color:#4ade80;margin-top:6px;font-weight:700">DESBLOQUEADO</div>`:''}</div>`}).join('')}</div></div>`;
 } else if(page==='perfil'){
  a.innerHTML=`<div class="card"><div class="card-title">👤 Perfil • Guardado manual</div>
   <label style="font-size:11px;color:#9ca3af">Nombre</label><input id="pn" value="${perfilEdit.nombre||''}" oninput="window.editPerfil('nombre',this.value)">
   <label style="font-size:11px;color:#9ca3af;margin-top:10px;display:block">Peso kg</label><input id="pp" value="${perfilEdit.peso||''}" oninput="window.editPerfil('peso',this.value)">
   <label style="font-size:11px;color:#9ca3af;margin-top:10px;display:block">Altura cm</label><input id="pa" value="${perfilEdit.altura||''}" oninput="window.editPerfil('altura',this.value)">
   <label style="font-size:11px;color:#9ca3af;margin-top:10px;display:block">Objetivo</label><select id="po" onchange="window.editPerfil('objetivo',this.value)"><option value="volumen" ${perfilEdit.objetivo==='volumen'?'selected':''}>Volumen 💪</option><option value="definicion" ${perfilEdit.objetivo==='definicion'?'selected':''}>Definición 🔥</option><option value="mantenimiento" ${perfilEdit.objetivo==='mantenimiento'?'selected':''}>Mantenimiento ⚖️</option></select>
   <div style="display:flex;gap:10px;margin-top:16px"><button class="btn" id="btnSave" onclick="window.savePerfil()" ${!hasPending?'disabled':''}>Guardar cambios</button><button class="btn btn-ghost" onclick="window.cancelPerfil()">Cancelar</button></div>
   ${hasPending?'<p style="font-size:10px;color:#f59e0b;margin-top:8px">⚠️ Tienes cambios sin guardar</p>':''}
  </div>
  <div class="card"><div class="card-title">📸 Foto</div><input type="file" accept="image/*" onchange="window.changePhoto(event)"><div style="margin-top:10px">${data.photoURL?`<img src="${data.photoURL}" style="width:80px;height:80px;border-radius:14px;object-fit:cover;border:2px solid #1a2e1a">`:''}</div></div>
  <div class="card"><div class="card-title">Cuenta</div><p style="font-size:12px;color:#9ca3af">${user.email}</p><button class="btn btn-ghost" style="margin-top:12px;width:100%" onclick="window.logout()">Cerrar sesión</button></div>
  `;
 }
}

window.go=p=>{ if(hasPending && page==='perfil' && p!=='perfil'){ if(!confirm('Tienes cambios sin guardar, ¿salir sin guardar?')) return; hasPending=false; perfilEdit={...data.perfil}; } page=p; render(); };
window.setAuthMode=(m)=>{ window.authMode=m; render(); };
window.filterAl=()=>{ const q=(document.getElementById('searchAl')?.value||'').toLowerCase(); const list=document.getElementById('listAl'); if(!list) return; const filtered=ALIMENTOS_DB.filter(a=>a.nombre.toLowerCase().includes(q)); list.innerHTML=filtered.map(a=>`<div class="food-card"><div><b style="font-size:12px">${a.emoji} ${a.nombre}</b><br><span style="font-size:10px;color:#9ca3af">${a.cal} kcal • P:${a.prot} C:${a.carb} G:${a.grasa}</span></div><button class="btn" style="width:auto;padding:8px 12px" onclick="window.addAl(${a.id})">Añadir</button></div>`).join(''); };
window.addAl=(id)=>{ const al=ALIMENTOS_DB.find(x=>x.id===id); data.alimentos.push({...al, fecha:new Date().toISOString()}); data.comidas++; addXP(10,'comida'); save(); render(); toast('Añadido ✅'); };
window.delAl=(i)=>{ data.alimentos.splice(i,1); save(); render(); };
window.addRut=(id)=>{ const r=RUTINAS_DB.find(x=>x.id===id); data.ejercicios.push({...r, fecha:new Date().toISOString()}); data.rutinas++; addXP(25,'rutina'); save(); render(); toast('Rutina añadida 💪'); };
window.delRut=(i)=>{ data.ejercicios.splice(i,1); save(); render(); };
window.editPerfil=(k,v)=>{ perfilEdit[k]=v; hasPending=JSON.stringify(perfilEdit)!==JSON.stringify(data.perfil); render(); };
window.savePerfil=async()=>{ data.perfil={...perfilEdit}; await save(); hasPending=false; render(); toast('Guardado ☁️'); };
window.cancelPerfil=()=>{ perfilEdit={...data.perfil}; hasPending=false; render(); };
window.changePhoto=(e)=>{ const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ const img=new Image(); img.onload=()=>{ const canvas=document.createElement('canvas'); const max=240; let w=img.width,h=img.height; if(w>h){ if(w>max){h*=max/w; w=max;} } else { if(h>max){w*=max/h; h=max;} } canvas.width=w; canvas.height=h; canvas.getContext('2d').drawImage(img,0,0,w,h); data.photoURL=canvas.toDataURL('image/jpeg',0.6); save(); render(); }; img.src=r.result; }; r.readAsDataURL(f); };
window.login=async()=>{ const e=document.getElementById('em')?.value.trim(); const p=document.getElementById('pw')?.value; if(!e||!p){toast('Completa campos'); return;} try{ const c=await signInWithEmailAndPassword(auth,e,p); user=c.user; }catch(err){ if(err.code==='auth/user-not-found' || err.code==='auth/invalid-credential'){ toast('Usuario no registrado'); } else toast(err.message);} };
window.register=async()=>{
 const nombre=document.getElementById('rgNombre')?.value.trim()||''; const email=document.getElementById('rgEm')?.value.trim()||''; const pass=document.getElementById('rgPw')?.value||''; const peso=document.getElementById('rgPeso')?.value.trim()||''; const altura=document.getElementById('rgAlt')?.value.trim()||''; const obj=document.getElementById('rgObj')?.value||'volumen';
 if(!email||!pass||pass.length<6){toast('Correo y contraseña mínimo 6 caracteres'); return;} if(!nombre){toast('Pon tu nombre'); return;}
 try{ const cred=await createUserWithEmailAndPassword(auth,email,pass); user=cred.user; data={email:email,xp:10,nivel:1,racha:0,rachaHistorial:[],comidas:0,rutinas:0,objetivos:0,logros:[{id:'primer',fecha:new Date().toISOString()}],cont:{fecha:'',comidasHoy:0,rutinasHoy:0,objHoy:0}, alimentos:[], ejercicios:[], perfil:{peso:peso,altura:altura,objetivo:obj,nombre:nombre}, photoURL:''}; await save(); toast('¡Bienvenido a NutriSport! 🎉'); render(); }catch(err){ if(err.code==='auth/email-already-in-use'){ toast('Ese correo ya existe'); window.setAuthMode('login'); } else toast(err.message); }
};
window.resetPass=async()=>{ const e=document.getElementById('em')?.value.trim()||prompt('Correo para recuperar:'); if(!e) return; try{ await sendPasswordResetEmail(auth,e); toast('Correo enviado 📧'); }catch(err){toast(err.message);} };
window.logout=async()=>{ if(hasPending && !confirm('Cambios sin guardar, ¿salir?')) return; await signOut(auth); user=null; data=null; render(); };

onAuthStateChanged(auth, async(u)=>{ if(u){ user=u; await load(u.uid); checkDia(); page='dashboard'; render(); } else { user=null; render(); } });
