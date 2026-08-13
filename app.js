const $=id=>document.getElementById(id);
const currentUserKey='tehnolift_current_user';
let editingId=null;
let currentUser=null;

function todayISO(){
  const now=new Date();
  const offset=now.getTimezoneOffset();
  const local=new Date(now.getTime()-offset*60000);
  return local.toISOString().slice(0,10);
}

function formatDate(value){
  if (!value) return '—';
  const d=new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('sr-RS');
}

let calculations=[];

async function loadCalculations(){
  if (!currentUser || !currentUser.username) {
    calculations = [];
    return;
  }

  try {
    const response = await fetch(`/api/calculations?user=${encodeURIComponent(currentUser.username)}`);
    if (!response.ok) {
      calculations = [];
      return;
    }
    calculations = await response.json();
  } catch (error) {
    calculations = [];
  }
}

async function saveCalculations(){
  return true;
}

function euro(n){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(n)||0)}
function calc(){
 const factory=+$('factory').value||0;
 const transport=+$('transport').value||0;
 const batteryWeight=+$('batteryWeight').value||0;
 const other=+$('other').value||0;
 const subtotal=factory+transport+other;
 const customs=subtotal*0.05;
 const eco=batteryWeight*0.2;
 const purchase=subtotal+customs+eco;
 const margin=+$('margin').value||0;
 const suggested=margin>=100?0:purchase*(1+margin/100), sale=+$('sale').value||0, profit=sale-purchase, actual=purchase?profit/purchase*100:0;
 $('eco').value=eco.toFixed(2);
 $('customs').value=customs.toFixed(2);
 $('purchase').textContent=euro(purchase);$('suggested').textContent=euro(suggested);$('profit').textContent=euro(profit);$('actualMargin').textContent=actual.toFixed(1)+'%';
 return {factory,transport,batteryWeight,customs,eco,other,purchase,margin,suggested,sale,profit,actual};
}
document.querySelectorAll('.money,#batteryWeight,#margin,#sale').forEach(x=>x.addEventListener('input',calc));

function render(){
 $('statCount').textContent=calculations.length;
 $('statActive').textContent=calculations.filter(x=>x.status==='Aktivna').length;
 $('statSales').textContent=euro(calculations.reduce((s,x)=>s+x.sale,0));
 $('statMargin').textContent=(calculations.length?calculations.reduce((s,x)=>s+x.actual,0)/calculations.length:0).toFixed(1)+'%';
 const rows=calculations.slice(-8).reverse().map(x=>`<tr><td>#${x.id}</td><td><b>${x.model}</b></td><td>${x.customer||'—'}</td><td>${x.commercialist||'—'}</td><td>${formatDate(x.date)}</td><td>${euro(x.purchase)}</td><td>${euro(x.sale)}</td><td>${x.actual.toFixed(1)}%</td><td><button class="edit-btn" data-id="${x.id}">Uredi</button> <button class="print-btn" data-id="${x.id}">Štampaj</button> <button class="delete-btn" data-id="${x.id}">Obriši</button></td></tr>`).join('');
 $('recentBody').innerHTML=rows||'<tr><td colspan="9">Još nema sačuvanih kalkulacija.</td></tr>';
 const all=calculations.slice().reverse().map(x=>`<tr><td>#${x.id}</td><td>${formatDate(x.date)}</td><td><b>${x.model}</b></td><td>${x.customer||'—'}</td><td>${x.commercialist||'—'}</td><td>${euro(x.purchase)}</td><td>${euro(x.sale)}</td><td>${euro(x.profit)}</td><td>${x.actual.toFixed(1)}%</td><td><button class="edit-btn" data-id="${x.id}">Uredi</button> <button class="print-btn" data-id="${x.id}">Štampaj</button> <button class="delete-btn" data-id="${x.id}">Obriši</button></td></tr>`).join('');
 $('historyBody').innerHTML=all||'<tr><td colspan="10">Nema podataka.</td></tr>';
}

function printCalculation(id){
  const item = calculations.find(x => String(x.id) === String(id));
  if (!item) return;

  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) return;

  const rows = [
    ['Model', item.model || '—'],
    ['Kupac', item.customer || '—'],
    ['Komercijalista', item.commercialist || '—'],
    ['Datum', formatDate(item.date)],
    ['Dobavljač', item.supplier || '—'],
    ['Napomena', item.note || '—'],
    ['Cena iz fabrike', euro(item.factory)],
    ['Prevoz', euro(item.transport)],
    ['Težina baterije', `${item.batteryWeight || 0} kg`],
    ['Eko taksa', euro(item.eco)],
    ['Carina', euro(item.customs)],
    ['Ostali troškovi', euro(item.other)],
    ['Nabavna cena', euro(item.purchase)],
    ['Marža', `${item.margin ?? 0}%`],
    ['Predložena prodajna cena', euro(item.suggested)],
    ['Ponuđena cena', euro(item.sale)],
    ['RUC', euro(item.profit)],
    ['Ostvarena marža', `${item.actual.toFixed(1)}%`]
  ];

  const content = rows.map(([label, value]) => `
    <tr>
      <td>${label}</td>
      <td>${value}</td>
    </tr>
  `).join('');

  printWindow.document.write(`<!doctype html>
    <html lang="sr">
      <head>
        <meta charset="UTF-8">
        <title>Kalkulacija #${item.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 30px; color: #172033; }
          h1 { margin-bottom: 10px; }
          .meta { color: #51627a; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          td { border-bottom: 1px solid #dfe5ee; padding: 10px 8px; vertical-align: top; }
          td:first-child { font-weight: 700; width: 42%; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>Kalkulacija #${item.id}</h1>
        <div class="meta">Datum: ${formatDate(item.date)} &nbsp;|&nbsp; Model: ${item.model || '—'}</div>
        <table>${content}</table>
      </body>
    </html>`);

  printWindow.document.close();
  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 300);
}
function resetCalculatorForm(){
  $('model').value='';
  $('customer').value='';
  $('commercialist').value=currentUser ? currentUser.username : '';
  $('calcDate').value='';
  $('supplier').value='';
  $('note').value='';
  $('factory').value='';
  $('transport').value='';
  $('batteryWeight').value='';
  $('other').value='';
  $('margin').value='';
  $('sale').value='';
  editingId=null;
  $('saveBtn').textContent='Sačuvaj kalkulaciju';
  $('backBtn').classList.add('hidden');
  $('cancelEditBtn').classList.add('hidden');
  calc();
}
function loadCalculationIntoForm(item){
  if (!item) return;
  editingId=item.id;
  $('model').value=item.model||'EFL203';
  $('customer').value=item.customer||'';
  $('commercialist').value=item.commercialist||'';
  $('calcDate').value=item.date || todayISO();
  $('supplier').value=item.supplier||'EP Equipment';
  $('note').value=item.note||'';
  $('factory').value=item.factory ?? 0;
  $('transport').value=item.transport ?? 0;
  $('batteryWeight').value=item.batteryWeight ?? 0;
  $('other').value=item.other ?? 0;
  $('margin').value=item.margin ?? 20;
  $('sale').value=item.sale ?? 0;
  $('saveBtn').textContent='Ažuriraj kalkulaciju';
  $('backBtn').classList.remove('hidden');
  $('cancelEditBtn').classList.remove('hidden');
  calc();
  show('calculator');
}
$('saveBtn').onclick=async ()=>{
 const c=calc();
 const commercialist=$('commercialist').value.trim();
 const calcDate=$('calcDate').value || todayISO();
 const item={id:editingId||Date.now().toString().slice(-6),date:calcDate,commercialist,model:$('model').value,customer:$('customer').value,supplier:$('supplier').value,note:$('note').value,...c,status:'Aktivna',createdBy: currentUser ? currentUser.username : ''};

 try {
   const url = editingId ? `/api/calculations/${editingId}` : '/api/calculations';
   const method = editingId ? 'PUT' : 'POST';
   const response = await fetch(url, {
     method,
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(item)
   });

   if (!response.ok) throw new Error('Save failed');
   await loadCalculations();
   render();
   requestAnimationFrame(()=>{
     show('dashboard');
     const toast=$('saveToast');
     if (toast) {
       toast.classList.remove('hidden');
       toast.textContent=editingId ? 'Kalkulacija je ažurirana.' : 'Kalkulacija je sačuvana.';
       clearTimeout(window.toastTimer);
       window.toastTimer=setTimeout(()=>toast.classList.add('hidden'),2200);
     }
     editingId=null;
     $('saveBtn').textContent='Sačuvaj kalkulaciju';
     $('backBtn').classList.add('hidden');
     $('cancelEditBtn').classList.add('hidden');
   });
 } catch (error) {
   const toast=$('saveToast');
   if (toast) {
     toast.classList.remove('hidden');
     toast.textContent='Neuspešno čuvanje kalkulacije.';
     clearTimeout(window.toastTimer);
     window.toastTimer=setTimeout(()=>toast.classList.add('hidden'),2200);
   }
 }
};
function show(view){
 document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));$(view).classList.remove('hidden');
 document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===view));
 const titles={dashboard:['Dashboard','Pregled kalkulacija i prodajnih cena'],calculator:['Nova kalkulacija','Unos troškova i obračun prodajne cene'],history:['Istorija','Sačuvane kalkulacije']};
 $('pageTitle').textContent=titles[view][0];$('pageSub').textContent=titles[view][1];
}
document.addEventListener('click', async e => {
 const editBtn = e.target.closest('.edit-btn');
 if (editBtn) {
   const id = String(editBtn.dataset.id);
   const item = calculations.find(x => String(x.id) === id);
   if (item) loadCalculationIntoForm(item);
   return;
 }
 const printBtn = e.target.closest('.print-btn');
 if (printBtn) {
   const id = String(printBtn.dataset.id);
   printCalculation(id);
   return;
 }
 const deleteBtn = e.target.closest('.delete-btn');
 if (!deleteBtn) return;
 const id = String(deleteBtn.dataset.id);
 if (!confirm('Da li ste sigurni da želite da obrišete ovu kalkulaciju?')) return;
 try {
   const response = await fetch(`/api/calculations/${id}`, { method: 'DELETE' });
   if (!response.ok) throw new Error('Delete failed');
   await loadCalculations();
   render();
 } catch (error) {
   const toast=$('saveToast');
   if (toast) {
     toast.classList.remove('hidden');
     toast.textContent='Neuspešno brisanje kalkulacije.';
     clearTimeout(window.toastTimer);
     window.toastTimer=setTimeout(()=>toast.classList.add('hidden'),2200);
   }
 }
});
function setCurrentUser(user){
  currentUser = user;
  localStorage.setItem(currentUserKey, JSON.stringify(user));
  if ($('headerUserName')) $('headerUserName').textContent = user ? user.username : 'Korisnik';
  if ($('userPill')) $('userPill').textContent = user ? user.username : 'Korisnik';
}

function clearCurrentUser(){
  currentUser = null;
  localStorage.removeItem(currentUserKey);
  if ($('headerUserName')) $('headerUserName').textContent = 'Korisnik';
  if ($('userPill')) $('userPill').textContent = 'Korisnik';
}

async function handleLogin(){
  const username = $('loginUsername') ? $('loginUsername').value.trim() : '';
  const password = $('loginPassword') ? $('loginPassword').value.trim() : '';
  const errorBox = $('loginError');

  if (!username || !password) {
    if (errorBox) {
      errorBox.textContent = 'Unesite korisničko ime i lozinku.';
      errorBox.classList.remove('hidden');
    }
    return;
  }

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Neuspešna prijava');
    }

    setCurrentUser(result.user);
    if ($('loginScreen')) $('loginScreen').classList.add('hidden');
    if ($('appShell')) $('appShell').classList.remove('hidden');
    if ($('loginUsername')) $('loginUsername').value = '';
    if ($('loginPassword')) $('loginPassword').value = '';
    if (errorBox) errorBox.classList.add('hidden');
    resetCalculatorForm();
    await loadCalculations();
    render();
  } catch (error) {
    if (errorBox) {
      errorBox.textContent = error.message || 'Neuspešna prijava.';
      errorBox.classList.remove('hidden');
    }
  }
}

function handleLogout(){
  clearCurrentUser();
  if ($('appShell')) $('appShell').classList.add('hidden');
  if ($('loginScreen')) $('loginScreen').classList.remove('hidden');
  resetCalculatorForm();
}

document.querySelectorAll('.nav').forEach(n=>n.onclick=()=>show(n.dataset.view));
if ($('newBtn')) $('newBtn').onclick=()=>{
  resetCalculatorForm();
  show('calculator');
};
if ($('backBtn')) $('backBtn').onclick=()=>{
  resetCalculatorForm();
  show('dashboard');
};
if ($('cancelEditBtn')) $('cancelEditBtn').onclick=()=>{
  resetCalculatorForm();
  show('dashboard');
};
if ($('historyBtn')) $('historyBtn').onclick=()=>show('history');
if ($('loginBtn')) $('loginBtn').onclick=handleLogin;
if ($('logoutBtn')) $('logoutBtn').onclick=handleLogout;
if ($('search')) $('search').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('#historyBody tr').forEach(r=>r.style.display=r.textContent.toLowerCase().includes(q)?'':'none')});

const savedUser = JSON.parse(localStorage.getItem(currentUserKey) || 'null');
if (savedUser && $('loginScreen') && $('appShell')) {
  setCurrentUser(savedUser);
  $('loginScreen').classList.add('hidden');
  $('appShell').classList.remove('hidden');
  resetCalculatorForm();
  loadCalculations().then(render);
} else if ($('loginScreen') && $('appShell')) {
  $('loginScreen').classList.remove('hidden');
  $('appShell').classList.add('hidden');
  resetCalculatorForm();
}

// Mobile sidebar toggle
if ($('menuBtn')) {
  $('menuBtn').addEventListener('click', () => {
    document.body.classList.toggle('sidebar-open');
    const side = document.querySelector('.sidebar');
    if (side) side.style.display = document.body.classList.contains('sidebar-open') ? 'flex' : '';
  });
  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (!document.body.classList.contains('sidebar-open')) return;
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    const target = e.target;
    if (!sidebar.contains(target) && !target.closest('#menuBtn')) {
      document.body.classList.remove('sidebar-open');
      sidebar.style.display = '';
    }
  });
}
// Show top nav on small screens and wire its buttons to existing nav handlers
function refreshTopNavVisibility(){
  const top = document.getElementById('topNav');
  if (!top) return;
  if (window.innerWidth <= 768) top.classList.remove('hidden'); else top.classList.add('hidden');
}
window.addEventListener('resize', refreshTopNavVisibility);
refreshTopNavVisibility();
document.getElementById('topNav')?.addEventListener('click', (e)=>{
  const b = e.target.closest('button.nav'); if (!b) return; const view = b.dataset.view; if (!view) return; document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active', n.dataset.view===view)); show(view);
});
