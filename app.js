const cfg=window.CAMPING_CONFIG||{};
const supabase=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const zones=["Bora Bora","Tahiti","Moorea","Hiva Oa","Rangiroa"];
const steps=["Couper l'eau","Vidanger le réseau","Couper l'électricité","Contrôler chauffage","Vider / contrôler le frigo","Ranger la plancha","Ranger le lit bébé","Contrôler portes et fenêtres","Contrôle général"];
let session=null,profile=null,view="dashboard",cache={repairs:[],works:[],stocks:[],logs:[],winter:[]};

const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtDate=d=>d?new Date(d).toLocaleString("fr-FR",{dateStyle:"short",timeStyle:"short"}):"—";
const today=()=>new Date().toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
const badge=s=>{const m={"Urgente":"b-red","Haute":"b-orange","Importante":"b-orange","À faire":"b-blue","En cours":"b-orange","À valider":"b-purple","Terminée":"b-green","Terminé":"b-green","Planifié":"b-gray","Faible":"b-gray","Normale":"b-gray"};return `<span class="badge ${m[s]||"b-gray"}">${esc(s)}</span>`};
function toast(t){const x=$("toast");x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2600)}
function openModal(title,subtitle,body){$("modalTitle").textContent=title;$("modalSubtitle").textContent=subtitle||"";$("modalBody").innerHTML=body;$("modal").classList.remove("hidden")}
function closeModal(){$("modal").classList.add("hidden")}
$("closeModal").onclick=closeModal;$("modal").onclick=e=>{if(e.target.id==="modal")closeModal()};
$("menuBtn").onclick=()=>$("sidebar").classList.toggle("open");
$("refreshBtn").onclick=()=>render();
document.querySelectorAll(".nav button").forEach(b=>b.onclick=()=>setView(b.dataset.view));
$("quickAdd").onclick=()=>({repairs:showRepairForm,works:showWorkForm,stocks:showStockForm,winter:showWinterSelector}[view]||showRepairForm)();

function setView(v){view=v;$("sidebar").classList.remove("open");render()}
function title(){return {dashboard:"Tableau de bord",repairs:"Réparations",mobilehomes:"Mobil-homes",winter:"Hivernage",works:"Travaux",stocks:"Stocks",planning:"Planning",history:"Historique"}[view]}
async function db(table,query){let q=supabase.from(table).select("*");if(query?.order)q=q.order(query.order,{ascending:query.asc??false});if(query?.eq)q=q.eq(query.eq[0],query.eq[1]);const {data,error}=await q;if(error){console.error(error);return[]}return data||[]}
async function log(action,details=""){await supabase.from("activity_log").insert({action,details,user_id:session.user.id})}
async function getProfile(){const {data}=await supabase.from("profiles").select("*").eq("id",session.user.id).maybeSingle();return data||{full_name:session.user.email.split("@")[0],email:session.user.email}}
function avatarName(name){return (name||"?").split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase()}
async function loadData(){[cache.repairs,cache.works,cache.stocks,cache.logs,cache.winter]=await Promise.all([db("repairs",{order:"created_at"}),db("works",{order:"created_at"}),db("stock_items",{order:"name",asc:true}),db("activity_log_view",{order:"created_at"}),db("winter_checks",{order:"updated_at"})])}
async function render(){if(!session)return;await loadData();$("dateLabel").textContent=today();$("pageTitle").textContent=title();document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===view));$("userName").textContent=profile?.full_name||session.user.email;$("userEmail").textContent=session.user.email;$("avatar").textContent=avatarName(profile?.full_name||session.user.email);const open=cache.repairs.filter(r=>r.status!=="Terminée").length;const low=cache.stocks.filter(s=>s.quantity<=s.min_quantity).length;$("navRepairs").textContent=open||"";$("navStocks").textContent=low||"";await ({dashboard,repairs,mobilehomes,winter,works,stocks,planning,history}[view])()}

async function dashboard(){
 const open=cache.repairs.filter(r=>r.status!=="Terminée"),urgent=open.filter(r=>r.priority==="Urgente"),activeWorks=cache.works.filter(w=>w.status!=="Terminé"),low=cache.stocks.filter(s=>s.quantity<=s.min_quantity);
 const completedWinter=new Set(cache.winter.filter(x=>x.completed).map(x=>x.mobile_home_id+"-"+x.step_index));
 let completedMH=0;for(let i=1;i<=193;i++){let ok=true;for(let s=0;s<steps.length;s++)if(!completedWinter.has(String(i).padStart(3,"0")+"-"+s))ok=false;if(ok)completedMH++}
 const pct=Math.round(completedMH/193*100);
 $("content").innerHTML=`<div class="hero"><div class="kpi-title"><div><h2>Bonjour ${esc(profile?.full_name||"")} 👋</h2><p>Voici l'état de la maintenance aujourd'hui.</p></div><span class="badge b-blue">${today()}</span></div><div class="metric-line"><span>Hivernage terminé</span><b>${completedMH}/193</b></div><div class="progress"><i style="width:${pct}%"></i></div></div>
 <div class="section-head"><h2>Vue d'ensemble</h2></div>
 <div class="grid g4"><div class="card stat red"><div><div class="muted">Urgences</div><div class="number">${urgent.length}</div><div class="muted">à traiter</div></div><div class="stat-icon">🚨</div></div>
 <div class="card stat orange"><div><div class="muted">Réparations</div><div class="number">${open.length}</div><div class="muted">non terminées</div></div><div class="stat-icon">🔧</div></div>
 <div class="card stat blue"><div><div class="muted">Travaux</div><div class="number">${activeWorks.length}</div><div class="muted">en cours / planifiés</div></div><div class="stat-icon">🏗️</div></div>
 <div class="card stat green"><div><div class="muted">Stocks faibles</div><div class="number">${low.length}</div><div class="muted">à réapprovisionner</div></div><div class="stat-icon">📦</div></div></div>
 <div class="grid g2">
 <div><div class="section-head"><h2>À traiter en priorité</h2><button class="pill" onclick="setView('repairs')">Voir tout</button></div><div class="card list">${urgent.slice(0,5).map(r=>`<div class="row clickable" onclick="repairDetail('${r.id}')"><div class="row-main"><strong>MH ${esc(r.mobile_home_id)} · ${esc(r.title)}</strong><span class="muted">${esc(r.assignee||"Non attribuée")}</span></div>${badge(r.status)}</div>`).join("")||'<div class="empty">Aucune urgence 🎉</div>'}</div></div>
 <div><div class="section-head"><h2>Stocks à surveiller</h2><button class="pill" onclick="setView('stocks')">Gérer</button></div><div class="card list">${low.slice(0,5).map(s=>`<div class="row"><div><strong>${esc(s.name)}</strong><span class="muted">Seuil ${s.min_quantity} ${esc(s.unit)}</span></div><span class="low-stock">${s.quantity}</span></div>`).join("")||'<div class="empty">Tous les stocks sont au-dessus des seuils.</div>'}</div></div></div>
 <div class="section-head"><h2>Dernières activités</h2></div><div class="card timeline">${cache.logs.slice(0,7).map(x=>`<div class="timeline-item"><strong>${esc(x.action)}</strong><div>${fmtDate(x.created_at)} · ${esc(x.user_name||"Utilisateur")}</div></div>`).join("")||'<div class="empty">Aucune activité.</div>'}</div>`;
}

async function repairs(){
 $("content").innerHTML=`<div class="section-head"><div><h2>Réparations</h2><p class="muted">De la demande à la validation finale.</p></div><button class="btn primary" onclick="showRepairForm()">＋ Nouvelle réparation</button></div>
 <div class="filters"><input id="rq" placeholder="🔎 Mobil-home, problème, responsable…"><select id="rs"><option value="">Tous les statuts</option><option>À faire</option><option>En cours</option><option>À valider</option><option>Terminée</option></select><select id="rp"><option value="">Toutes priorités</option><option>Urgente</option><option>Haute</option><option>Normale</option></select></div>
 <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Mobil-home</th><th>Intervention</th><th>Priorité</th><th>Statut</th><th>Responsable</th><th>Créée</th><th>Validation</th></tr></thead><tbody id="repairRows"></tbody></table></div></div>`;
 const draw=()=>{let q=$("rq").value.toLowerCase(),s=$("rs").value,p=$("rp").value;let rows=cache.repairs.filter(r=>(!q||(`${r.mobile_home_id} ${r.title} ${r.description||""} ${r.assignee||""}`).toLowerCase().includes(q))&&(!s||r.status===s)&&(!p||r.priority===p));$("repairRows").innerHTML=rows.map(r=>`<tr class="clickable" onclick="repairDetail('${r.id}')"><td><strong>MH ${esc(r.mobile_home_id)}</strong></td><td><strong>${esc(r.title)}</strong><div class="muted">${esc(r.description||"")}</div></td><td>${badge(r.priority)}</td><td>${badge(r.status)}</td><td>${esc(r.assignee||"—")}</td><td>${fmtDate(r.created_at)}</td><td>${r.validated_at?`<strong>${esc(r.validated_name)}</strong><div class="muted">${fmtDate(r.validated_at)}</div>`:"<span class='muted'>—</span>"}</td></tr>`).join("")||'<tr><td colspan="7" class="empty">Aucune réparation.</td></tr>'};$("rq").oninput=draw;$("rs").onchange=draw;$("rp").onchange=draw;draw();
}
async function repairDetail(id){const r=cache.repairs.find(x=>x.id===id);if(!r)return;const {data:parts}=await supabase.from("repair_parts").select("*,stock_items(name,unit)").eq("repair_id",id);openModal(`MH ${r.mobile_home_id} · ${r.title}`,`Créée le ${fmtDate(r.created_at)}`,`<div class="grid g2"><div class="card"><div class="metric-line"><span>Priorité</span>${badge(r.priority)}</div><div class="metric-line"><span>Statut</span>${badge(r.status)}</div><div class="metric-line"><span>Responsable</span><b>${esc(r.assignee||"—")}</b></div><p>${esc(r.description||"Aucune description.")}</p></div><div class="card"><h3>Validation</h3>${r.validated_at?`<p>✓ Validée par <b>${esc(r.validated_name)}</b><br><span class="muted">${fmtDate(r.validated_at)}</span></p>`:`<p class="muted">Cette réparation n'est pas encore validée.</p>`}</div></div><div class="section-head"><h3>Pièces utilisées</h3></div><div class="card list">${(parts||[]).map(p=>`<div class="row"><span>${esc(p.stock_items?.name||"Article")} × ${p.quantity}</span><span class="muted">${esc(p.stock_items?.unit||"")}</span></div>`).join("")||'<div class="empty">Aucune pièce liée.</div>'}</div><div class="modal-actions">${r.status!=="Terminée"?`<button class="btn primary" onclick="validateRepair('${r.id}')">✓ Valider la réparation</button>`:""}<button class="btn secondary" onclick="closeModal()">Fermer</button></div>`)}
async function validateRepair(id){const r=cache.repairs.find(x=>x.id===id);const name=profile?.full_name||session.user.email;openModal("Valider la réparation",`MH ${r.mobile_home_id} · ${r.title}`,`<div class="card"><div class="metric-line"><span>Validé par</span><b>${esc(name)}</b></div><div class="metric-line"><span>Date / heure</span><b>${fmtDate(new Date())}</b></div><p class="muted">Ton compte est utilisé automatiquement.</p></div><label class="check-row"><input id="confirmValidation" type="checkbox"> Je confirme que la réparation a été contrôlée et peut être clôturée.</label><div class="modal-actions"><button class="btn primary" onclick="confirmValidation('${id}')">✓ Confirmer</button></div>`)}
async function confirmValidation(id){if(!$("confirmValidation").checked)return toast("Confirme d'abord la validation.");const now=new Date().toISOString(),name=profile?.full_name||session.user.email;const {error}=await supabase.from("repair_validations").insert({repair_id:id,validated_name:name,validated_by:session.user.id,validated_at:now});if(error)return toast(error.message);const {error:e2}=await supabase.from("repairs").update({status:"Terminée",updated_at:now}).eq("id",id);if(e2)return toast(e2.message);await log(`Réparation validée — MH ${cache.repairs.find(x=>x.id===id)?.mobile_home_id||""} — ${name}`);closeModal();toast("Réparation validée");render()}

function showRepairForm(){openModal("Nouvelle réparation","Création rapide",`<div class="stack"><label>Mobil-home<select id="fMh">${Array.from({length:193},(_,i)=>{let n=String(i+1).padStart(3,"0");return `<option>${n}</option>`}).join("")}</select></label><label>Problème<input id="fTitle" placeholder="Ex. Fuite sous évier" required></label><label>Description<textarea id="fDesc" placeholder="Détail de l'intervention…"></textarea></label><div class="grid g2"><label>Priorité<select id="fPriority"><option>Normale</option><option>Haute</option><option>Urgente</option></select></label><label>Statut<select id="fStatus"><option>À faire</option><option>En cours</option><option>À valider</option></select></label></div><label>Responsable<input id="fAssignee" value="${esc(profile?.full_name||"")}"></label><div class="modal-actions"><button class="btn primary" onclick="saveRepair()">Créer la réparation</button></div></div>`)}
async function saveRepair(){const r={mobile_home_id:$("fMh").value,title:$("fTitle").value.trim(),description:$("fDesc").value,priority:$("fPriority").value,status:$("fStatus").value,assignee:$("fAssignee").value||profile?.full_name,created_by:session.user.id};if(!r.title)return toast("Indique le problème.");const {error}=await supabase.from("repairs").insert(r);if(error)return toast(error.message);await log(`Nouvelle réparation — MH ${r.mobile_home_id} — ${r.title}`);closeModal();toast("Réparation créée");render()}

async function mobilehomes(){const reps=cache.repairs;$("content").innerHTML=`<div class="section-head"><div><h2>193 mobil-homes</h2><p class="muted">État technique, réparations et hivernage.</p></div></div><div class="filters"><input id="mhq" placeholder="🔎 Numéro ou zone…"><select id="mhzone"><option value="">Toutes les zones</option>${zones.map(z=>`<option>${z}</option>`).join("")}</select></div><div id="mhgrid" class="grid g3"></div>`;const draw=()=>{let q=$("mhq").value.toLowerCase(),z=$("mhzone").value;let arr=Array.from({length:193},(_,i)=>{let id=String(i+1).padStart(3,"0"),zone=zones[i%zones.length],rs=reps.filter(r=>r.mobile_home_id===id&&r.status!=="Terminée");return{id,zone,rs}}).filter(m=>(!q||`${m.id} ${m.zone}`.toLowerCase().includes(q))&&(!z||m.zone===z));$("mhgrid").innerHTML=arr.map(m=>`<div class="card clickable" onclick="mhDetail('${m.id}')"><div class="kpi-title"><h3>MH ${m.id}</h3>${m.rs.length?badge(m.rs.some(r=>r.priority==="Urgente")?"Urgente":"En cours"):badge("Terminée")}</div><p class="muted">📍 ${m.zone}</p><div class="metric-line"><span>Réparations ouvertes</span><b>${m.rs.length}</b></div><div class="progress"><i style="width:${Math.min(100,m.rs.length*20)}%"></i></div></div>`).join("")};$("mhq").oninput=draw;$("mhzone").onchange=draw;draw()}
function mhDetail(id){const m=String(id).padStart(3,"0"),rs=cache.repairs.filter(r=>r.mobile_home_id===m);openModal(`Mobil-home ${m}`,zones[(Number(m)-1)%zones.length],`<div class="grid g2"><div class="card"><h3>État technique</h3><div class="metric-line"><span>Réparations ouvertes</span><b>${rs.filter(r=>r.status!=="Terminée").length}</b></div><div class="metric-line"><span>Réparations terminées</span><b>${rs.filter(r=>r.status==="Terminée").length}</b></div></div><div class="card"><h3>Actions</h3><button class="btn primary full" onclick="closeModal();showRepairForm()">＋ Nouvelle réparation</button></div></div><div class="section-head"><h3>Historique des réparations</h3></div><div class="card list">${rs.map(r=>`<div class="row clickable" onclick="repairDetail('${r.id}')"><div><strong>${esc(r.title)}</strong><span class="muted">${fmtDate(r.created_at)}</span></div>${badge(r.status)}</div>`).join("")||'<div class="empty">Aucune réparation.</div>'}</div>`)}

async function winter(){const doneRows=cache.winter.filter(x=>x.completed);const per={};doneRows.forEach(x=>{per[x.mobile_home_id]=(per[x.mobile_home_id]||0)+1});let complete=0;for(let i=1;i<=193;i++)if((per[String(i).padStart(3,"0")]||0)===steps.length)complete++;let pct=Math.round(complete/193*100);$("content").innerHTML=`<div class="hero"><div class="kpi-title"><div><h2>❄️ Campagne d'hivernage 2026–2027</h2><p>Checklist de sécurité et de fermeture pour chaque mobil-home.</p></div><b>${pct}%</b></div><div class="progress"><i style="width:${pct}%"></i></div><div class="metric-line"><span>${complete} mobil-homes entièrement terminés</span><span>${193-complete} restant(s)</span></div></div><div class="section-head"><h2>Suivi par mobil-home</h2></div><div class="grid g3">${Array.from({length:193},(_,i)=>{let id=String(i+1).padStart(3,"0"),n=per[id]||0,p=Math.round(n/steps.length*100);return `<div class="card clickable" onclick="winterDetail('${id}')"><div class="kpi-title"><strong>MH ${id}</strong>${badge(p===100?"Terminé":p?"En cours":"À faire")}</div><span class="muted">${zones[i%zones.length]}</span><div class="progress ${p===100?"green":""}" style="margin-top:10px"><i style="width:${p}%"></i></div><div class="muted" style="margin-top:5px">${n}/${steps.length} contrôles</div></div>`}).join("")}</div>`}
async function winterDetail(id){const rows=cache.winter.filter(x=>x.mobile_home_id===id);openModal(`Hivernage MH ${id}`,"Checklist",`<div class="stack">${steps.map((s,i)=>{let x=rows.find(r=>r.step_index===i);return `<label class="check-row"><input type="checkbox" ${x?.completed?"checked":""} onchange="toggleWinter('${id}',${i},this.checked)"> ${s}${x?.completed?`<span class="muted" style="margin-left:auto">${fmtDate(x.completed_at)}</span>`:""}</label>`}).join("")}</div>`)}
async function toggleWinter(id,i,done){const now=done?new Date().toISOString():null;const payload={mobile_home_id:id,step_index:i,label:steps[i],completed:done,completed_by:done?session.user.id:null,completed_at:now,updated_at:new Date().toISOString()};const {error}=await supabase.from("winter_checks").upsert(payload,{onConflict:"mobile_home_id,step_index"});if(error)return toast(error.message);await log(`Hivernage MH ${id} — ${steps[i]} ${done?"terminé":"annulé"}`);toast(done?"Contrôle enregistré":"Contrôle réouvert");render()}

async function works(){ $("content").innerHTML=`<div class="section-head"><div><h2>Travaux</h2><p class="muted">Chantiers et améliorations hors réparations.</p></div><button class="btn primary" onclick="showWorkForm()">＋ Nouveau chantier</button></div><div class="filters"><select id="wfilter"><option value="">Tous</option><option>Planifié</option><option>En cours</option><option>Terminé</option></select></div><div id="worksGrid" class="grid g2"></div>`;const draw=()=>{let f=$("wfilter").value,arr=cache.works.filter(w=>!f||w.status===f);$("worksGrid").innerHTML=arr.map(w=>`<div class="card"><div class="kpi-title"><h3>${esc(w.title)}</h3>${badge(w.status)}</div><p class="muted">📍 ${esc(w.zone||"Site")} · ${w.due_date?`échéance ${w.due_date}`:""}</p><p>${esc(w.description||"")}</p><div class="metric-line"><span>Responsable</span><b>${esc(w.assignee||"—")}</b></div></div>`).join("")||'<div class="empty">Aucun chantier.</div>'};$("wfilter").onchange=draw;draw()}
function showWorkForm(){openModal("Nouveau chantier","Travaux hors réparation",`<div class="stack"><label>Nom du chantier<input id="wTitle" placeholder="Création palissade Bora Bora"></label><label>Zone<input id="wZone" placeholder="Bora Bora"></label><label>Description<textarea id="wDesc"></textarea></label><div class="grid g2"><label>Échéance<input id="wDue" type="date"></label><label>Statut<select id="wStatus"><option>Planifié</option><option>En cours</option><option>Terminé</option></select></label></div><label>Responsable<input id="wAssignee" value="${esc(profile?.full_name||"")}"></label><div class="modal-actions"><button class="btn primary" onclick="saveWork()">Créer</button></div></div>`)}
async function saveWork(){const w={title:$("wTitle").value.trim(),zone:$("wZone").value,description:$("wDesc").value,due_date:$("wDue").value||null,status:$("wStatus").value,assignee:$("wAssignee").value,created_by:session.user.id};if(!w.title)return toast("Indique le nom du chantier.");const {error}=await supabase.from("works").insert(w);if(error)return toast(error.message);await log(`Nouveau chantier — ${w.title}`);closeModal();toast("Chantier créé");render()}

async function stocks(){ $("content").innerHTML=`<div class="section-head"><div><h2>Stocks</h2><p class="muted">Quantités, seuils et mouvements.</p></div><button class="btn primary" onclick="showStockForm()">＋ Nouvel article</button></div><div class="grid g3">${cache.stocks.map(s=>`<div class="card"><div class="kpi-title"><span class="muted">${esc(s.category)}</span>${s.quantity<=s.min_quantity?badge("Urgente"):badge("OK")}</div><h3>${esc(s.name)}</h3><div class="stock-number ${s.quantity<=s.min_quantity?"low-stock":""}">${s.quantity}</div><div class="muted">${esc(s.unit)} · seuil ${s.min_quantity}</div><div class="modal-actions"><button class="pill" onclick="moveStock('${s.id}',-1)">− Sortie</button><button class="pill" onclick="moveStock('${s.id}',1)">＋ Entrée</button></div></div>`).join("")}</div>`}
async function moveStock(id,delta){const s=cache.stocks.find(x=>x.id===id);if(!s)return;const q=s.quantity+delta;if(q<0)return toast("Stock insuffisant.");const {error}=await supabase.from("stock_movements").insert({stock_item_id:id,delta,quantity_after:q,reason:delta>0?"Entrée manuelle":"Sortie manuelle",user_id:session.user.id});if(error)return toast(error.message);const {error:e}=await supabase.from("stock_items").update({quantity:q}).eq("id",id);if(e)return toast(e.message);await log(`${delta>0?"Entrée":"Sortie"} stock — ${s.name} (${Math.abs(delta)})`);toast("Stock mis à jour");render()}
function showStockForm(){openModal("Nouvel article","Ajouter un élément au stock",`<div class="stack"><label>Nom<input id="sName" placeholder="Ex. Flexible 15/21"></label><label>Catégorie<input id="sCat" placeholder="Pièces"></label><div class="grid g2"><label>Quantité<input id="sQty" type="number" min="0" value="0"></label><label>Seuil d'alerte<input id="sMin" type="number" min="0" value="5"></label></div><label>Unité<input id="sUnit" value="unité"></label><div class="modal-actions"><button class="btn primary" onclick="saveStock()">Créer</button></div></div>`)}
async function saveStock(){const x={name:$("sName").value.trim(),category:$("sCat").value.trim()||"Autre",quantity:Number($("sQty").value),min_quantity:Number($("sMin").value),unit:$("sUnit").value||"unité"};if(!x.name)return toast("Indique le nom.");const {error}=await supabase.from("stock_items").insert(x);if(error)return toast(error.message);await log(`Article ajouté au stock — ${x.name}`);closeModal();toast("Article ajouté");render()}

async function planning(){const upcoming=[...cache.repairs.filter(r=>r.status!=="Terminée").map(r=>({date:r.created_at,title:`MH ${r.mobile_home_id} · ${r.title}`,type:"Réparation",status:r.status})),...cache.works.filter(w=>w.status!=="Terminé").map(w=>({date:w.due_date||w.created_at,title:w.title,type:"Travaux",status:w.status}))].sort((a,b)=>String(a.date).localeCompare(String(b.date)));$("content").innerHTML=`<div class="section-head"><div><h2>Planning technique</h2><p class="muted">Toutes les actions non terminées regroupées au même endroit.</p></div></div><div class="card list">${upcoming.map(x=>`<div class="row"><div><strong>${esc(x.title)}</strong><span class="muted">${esc(x.type)} · ${x.date?new Date(x.date).toLocaleDateString("fr-FR"):""}</span></div>${badge(x.status)}</div>`).join("")||'<div class="empty">Rien à planifier 🎉</div>'}</div>`}
async function history(){$("content").innerHTML=`<div class="section-head"><div><h2>Historique</h2><p class="muted">Traçabilité des actions réalisées dans l'application.</p></div></div><div class="card timeline">${cache.logs.map(x=>`<div class="timeline-item"><strong>${esc(x.action)}</strong><div>${fmtDate(x.created_at)} · ${esc(x.user_name||"Utilisateur")}${x.details?` · ${esc(x.details)}`:""}</div></div>`).join("")||'<div class="empty">Aucune activité.</div>'}</div>`}

window.addEventListener("error",e=>{
 const el=document.getElementById("loginError");
 if(el && !session){el.textContent="Erreur de chargement : "+(e.message||"JavaScript");}
});
window.addEventListener("unhandledrejection",e=>{
 const el=document.getElementById("loginError");
 if(el && !session){el.textContent="Erreur : "+(e.reason?.message||e.reason||"erreur inconnue");}
});
function checkConfig(){
 if(!cfg.supabaseUrl || !cfg.supabasePublishableKey){
   $("loginError").textContent="Configuration Supabase absente.";
   return false;
 }
 return true;
}
async function init(){
 $("loginView").classList.remove("hidden");
 if(!checkConfig())return;
 try{
   const {data,error}=await supabase.auth.getSession();
   if(error){$("loginError").textContent="Supabase : "+error.message;return}
   session=data.session;
   if(session){profile=await getProfile();showApp()}
   supabase.auth.onAuthStateChange(async(_e,s)=>{
     session=s;
     if(s){profile=await getProfile();showApp()}
     else{profile=null;$("app").classList.add("hidden");$("loginView").classList.remove("hidden")}
   });
 }catch(err){
   $("loginError").textContent="Impossible de démarrer la connexion : "+(err.message||err);
 }
}
function showApp(){$("loginView").classList.add("hidden");$("app").classList.remove("hidden");render()}
$("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const email=$("loginEmail").value.trim();
 const password=$("loginPassword").value;
 $("loginError").textContent="";
 if(!email||!password){$("loginError").textContent="Indique ton adresse email et ton mot de passe.";return}
 const btn=$("loginForm").querySelector("button");
 btn.disabled=true; btn.textContent="Connexion…"; $("loginError").textContent="Connexion à Supabase…";
 try{
   const {data,error}=await supabase.auth.signInWithPassword({email,password});
   if(error){
     const msg=error.message||"Connexion impossible.";
     $("loginError").textContent=msg.includes("Invalid login credentials")?"Email ou mot de passe incorrect.":msg.includes("Email not confirmed")?"Ton adresse email n'est pas encore confirmée dans Supabase.":"Erreur : "+msg;
     return;
   }
   if(!data?.session){$("loginError").textContent="Connexion non établie. Vérifie le compte dans Supabase > Authentication > Users.";return}
   session=data.session;
   profile=await getProfile();
   showApp();
 }catch(err){
   console.error(err);
   $("loginError").textContent="Impossible de contacter Supabase. Vérifie ta connexion et la configuration.";
 }finally{
   btn.disabled=false; btn.textContent="Se connecter";
 }
});
$("logout").onclick=async()=>{await supabase.auth.signOut()};
init();