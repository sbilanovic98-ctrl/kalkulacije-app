const $=id=>document.getElementById(id);
const currentUserKey='tehnolift_current_user';
let editingId=null;
let currentUser=null;
let productTypeLocked = false;

function applyProductTypeLock(locked){
  const productType = $('productType');
  if (!productType) return;
  productTypeLocked = !!locked;
  productType.disabled = productTypeLocked;
  if (productTypeLocked) {
    productType.setAttribute('title', 'Tip proizvoda je zaključan za ovu kalkulaciju.');
    if (productType.value !== 'baterija') productType.value = 'baterija';
  } else {
    productType.removeAttribute('title');
  }
}

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
function syncResultSections(productType){
  const forkliftSection = document.querySelector('.section.forklift-section');
  const batterySection = document.querySelector('.section.battery-section');
  const chargerSection = document.querySelector('.section.charger-section');
  const setSection = document.querySelector('.section.set-section');
  const isBattery = String(productType || 'viljuskar') === 'baterija';

  if (forkliftSection) forkliftSection.classList.toggle('hidden', isBattery);
  if (batterySection) batterySection.classList.toggle('hidden', !isBattery);
  if (chargerSection) chargerSection.classList.toggle('hidden', !isBattery);
  if (setSection) setSection.classList.toggle('hidden', !isBattery);
}
function calc(){
  const getVal = id => { const el = $(id); return el ? +el.value || 0 : 0; };
  const readNumInput = id => { const el = $(id); if (!el) return null; const v = el.value; if (v === '' || v === null || typeof v === 'undefined') return null; return +v || 0; };
  const factory=getVal('factory');
  const transport=getVal('transport');
  const batteryWeight=getVal('batteryWeight');
  const chargerWeight=getVal('chargerWeight');
  const chargerPrice=getVal('chargerPrice');
  const chargerTransport=getVal('chargerTransport');
  const productType = $('productType') ? $('productType').value : 'viljuskar';
  const subtotal=factory+transport;
  const customsRate = productType === 'baterija' ? 0.064 : 0.05;
  const customs = subtotal * customsRate;
  const ecoBattery = batteryWeight * 0.2;
  const ecoCharger = chargerWeight * 0.6;
  let purchase = subtotal + customs + ecoBattery;
  // charger separate calculation
  let customsCharger = 0;
  let purchaseCharger = 0;
  // only compute charger costs when product is battery
  if (productType === 'baterija') {
    const chargerBase = chargerPrice + chargerTransport;
    customsCharger = chargerBase * 0.05; // 5% customs on charger price + transport
    purchaseCharger = chargerBase + customsCharger + ecoCharger;
  }
  let purchaseWith = purchase + purchaseCharger;

  const selectedMargin = productType === 'baterija'
    ? (readNumInput('margin_b') ?? 0)
    : (readNumInput('margin') ?? 0);
  const margin = selectedMargin;

  // Suggested price is always based on the active product section only.
  const suggested = margin >= 100 ? 0 : purchase * (1 + margin / 100);
  const activeSale = productType === 'baterija'
    ? (readNumInput('sale_b') ?? suggested)
    : (readNumInput('sale') ?? suggested);
  const sale = activeSale;
  const profit = sale - purchase;
  const actual = purchase ? profit / purchase * 100 : 0;

  // charger-specific suggested/sale/profit
  const marginCharger = +$('marginCharger_b')?.value || 0;
  const suggestedCharger = marginCharger >= 100 ? 0 : purchaseCharger * (1 + marginCharger / 100);
  const inputSaleChargerVal = readNumInput('saleCharger_b');
  const saleCharger = (inputSaleChargerVal != null) ? inputSaleChargerVal : suggestedCharger;
  const profitCharger = saleCharger - purchaseCharger;
  const actualCharger = purchaseCharger ? profitCharger / purchaseCharger * 100 : 0;

  // update UI fields
  // update factory label for battery/product type
  const factoryLabel = $('factoryLabel');
  if (factoryLabel) {
    if (productType === 'baterija') {
      factoryLabel.textContent = 'Cena baterije iz fabrike (€)';
      factoryLabel.classList.add('bold');
    } else {
      factoryLabel.textContent = 'Cena iz fabrike (€)';
      factoryLabel.classList.remove('bold');
    }
  }
  // update UI fields for the active product type only, so hidden sections do not overwrite the visible result
  const setIfText = (ids, val) => { for (const id of ids) { const el = $(id); if (el) { el.textContent = val; break; } } };
  const setIfVal = (ids, val) => { for (const id of ids) { const el = $(id); if (el) { el.value = val; break; } } };

  setIfVal(['eco_b','eco'], ecoBattery.toFixed(2));
  if ($('ecoCharger')) $('ecoCharger').value = ecoCharger.toFixed(2);
  setIfVal(['customs_b','customs'], customs.toFixed(2));

  if (productType === 'baterija') {
    if ($('purchase_b')) $('purchase_b').textContent = euro(purchase);
    if ($('suggested_b')) $('suggested_b').textContent = euro(suggested);
    if ($('profit_b')) $('profit_b').textContent = euro(profit);
    if ($('actualMargin_b')) $('actualMargin_b').textContent = actual.toFixed(1) + '%';
    if ($('purchaseWith_b')) $('purchaseWith_b').textContent = euro(purchaseWith);
  } else {
    if ($('purchase')) $('purchase').textContent = euro(purchase);
    if ($('suggested')) $('suggested').textContent = euro(suggested);
    if ($('profit')) $('profit').textContent = euro(profit);
    if ($('actualMargin')) $('actualMargin').textContent = actual.toFixed(1) + '%';
    if ($('purchaseWith')) $('purchaseWith').textContent = euro(purchaseWith);
  }

  // charger-specific UI
  if ($('purchaseCharger_b')) $('purchaseCharger_b').textContent = euro(purchaseCharger);
  // keep customs only in the procurement cost field; do not display it in the charger result summary
  if ($('customsCharger')) $('customsCharger').value = customsCharger.toFixed(2);
  // show battery customs in costs column (customs_b) if present
  if ($('customs_b')) $('customs_b').value = customs.toFixed(2);
  if ($('suggestedCharger_b')) $('suggestedCharger_b').textContent = euro(suggestedCharger);
  if ($('profitCharger_b')) $('profitCharger_b').textContent = euro(profitCharger);
  if ($('actualMarginCharger_b')) $('actualMarginCharger_b').textContent = actualCharger.toFixed(1)+'%';
  // show charger price field value if present
  if ($('chargerPrice')) $('chargerPrice').value = chargerPrice ? chargerPrice : $('chargerPrice').value;

  // show/hide charger rows depending on product type
  const chargerRow = $('chargerRow');
  const ecoChargerRow = $('ecoChargerRow');
  const chargerPriceRow = $('chargerPriceRow');
  const chargerTransportRow = $('chargerTransportRow');
  const customsChargerRow = $('customsChargerRow');
  const purchaseWithRow = $('purchaseWithRow');
  syncResultSections(productType);

  if (productType === 'baterija') {
    if (chargerRow) chargerRow.classList.remove('hidden');
    if (ecoChargerRow) ecoChargerRow.classList.remove('hidden');
    if (chargerPriceRow) chargerPriceRow.classList.remove('hidden');
    if (chargerTransportRow) chargerTransportRow.classList.remove('hidden');
    if (customsChargerRow) customsChargerRow.classList.remove('hidden');
    if (purchaseWithRow) purchaseWithRow.style.display = '';
  } else {
    if (chargerRow) chargerRow.classList.add('hidden');
    if (ecoChargerRow) ecoChargerRow.classList.add('hidden');
    if (chargerPriceRow) chargerPriceRow.classList.add('hidden');
    if (chargerTransportRow) chargerTransportRow.classList.add('hidden');
    if (customsChargerRow) customsChargerRow.classList.add('hidden');
    if (purchaseWithRow) purchaseWithRow.style.display = 'none';
  }

  // set totals
  const purchaseSet = purchase + purchaseCharger;
  const suggestedSet = suggested + suggestedCharger;
  const saleSet = productType === 'baterija'
    ? ((readNumInput('sale_b') ?? suggested) + (readNumInput('saleCharger_b') ?? suggestedCharger))
    : sale;
  const profitSet = saleSet - purchaseSet;
  const actualSet = purchaseSet ? profitSet / purchaseSet * 100 : 0;

  if ($('purchaseSet_b')) $('purchaseSet_b').textContent = euro(purchaseSet);
  if ($('suggestedSet_b')) $('suggestedSet_b').textContent = euro(suggestedSet);
  if ($('saleSet_b')) $('saleSet_b').textContent = euro(saleSet);
  if ($('profitSet_b')) $('profitSet_b').textContent = euro(profitSet);
  if ($('actualMarginSet_b')) $('actualMarginSet_b').textContent = actualSet.toFixed(1)+'%';

  return {factory,transport,batteryWeight,chargerWeight,chargerPrice,chargerTransport,customsCharger,customs,eco:ecoBattery,ecoCharger,purchase,purchaseCharger,purchaseWith,margin,suggested,sale,profit,actual,productType, suggestedCharger,saleCharger,profitCharger,actualCharger,purchaseSet,suggestedSet,saleSet,profitSet,actualSet};
}
// Attach input listeners to all relevant inputs so calc() runs when any value changes
  const inputSelector = '.money,#batteryWeight,#chargerWeight,#chargerPrice,#chargerTransport,#margin,#sale,#productType,#margin_b,#sale_b,#marginCharger_b,#saleCharger_b,#margin_v,#sale_v';
document.querySelectorAll(inputSelector).forEach(el=>{
  if (!el) return;
  el.addEventListener('input', calc);
  el.addEventListener('change', calc);
});

function render(){
 $('statCount').textContent=calculations.length;
 if ($('statActive')) $('statActive').textContent = calculations.filter(x=>x.status==='Aktivna').length;
 $('statSales').textContent=euro(calculations.reduce((s,x)=>s+x.sale,0));
 $('statMargin').textContent=(calculations.length?calculations.reduce((s,x)=>s+x.actual,0)/calculations.length:0).toFixed(1)+'%';
 const rows=calculations.slice(-8).reverse().map(x=>`<tr><td>${formatDate(x.date)}</td><td><b>${x.model || '—'}</b></td><td>${x.customer||'—'}</td><td>${x.commercialist||'—'}</td><td>${euro(x.purchase ?? 0)}</td><td>${euro(x.purchaseCharger ?? 0)}</td><td>${euro(x.purchaseSet ?? x.purchaseWith ?? x.purchase ?? 0)}</td><td>${((x.actualSet ?? x.actual ?? 0)).toFixed(1)}%</td><td><button class="edit-btn" data-id="${x.id}">Uredi</button> <button class="print-btn" data-id="${x.id}">Štampaj</button> <button class="delete-btn" data-id="${x.id}">Obriši</button></td></tr>`).join('');
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
  productTypeLocked = false;
  applyProductTypeLock(false);
  const productType = $('productType');
  if (productType) {
    productType.disabled = false;
    productType.removeAttribute('title');
    productType.value = 'viljuskar';
  }
  const setIf = (id, val='') => { const el = $(id); if (el) el.value = val; };
  setIf('model','');
  setIf('model_b','');
  setIf('customer','');
  setIf('customer_b','');
  // Leave `commercialist` empty for manual input (do not prefill with current user)
  setIf('commercialist','');
  setIf('commercialist_b','');
  setIf('calcDate','');
  setIf('calcDate_b','');
  setIf('supplier','');
  setIf('supplier_b','');
  setIf('note','');
  setIf('note_b','');
  setIf('factory','');
  setIf('factory_b','');
  setIf('transport','');
  setIf('transport_b','');
  setIf('batteryWeight','');
  setIf('batteryWeight_b','');
  setIf('chargerWeight','');
  setIf('chargerWeight_b','');
  setIf('chargerPrice','');
  setIf('chargerTransport','');
  setIf('other','');
  setIf('other_b','');
  if ($('productType')) $('productType').value='viljuskar';
  syncResultSections('viljuskar');
  // margins and sales per section
  setIf('margin',''); setIf('sale','');
  setIf('margin_v',''); setIf('sale_v','');
  setIf('margin_b',''); setIf('sale_b','');
  setIf('marginCharger_b',''); setIf('saleCharger_b','');
  editingId=null;
  $('saveBtn').textContent='Sačuvaj kalkulaciju';
  $('backBtn').classList.add('hidden');
  $('cancelEditBtn').classList.add('hidden');
  calc();
}
function loadCalculationIntoForm(item){
  if (!item) return;
  try {
    editingId = item.id;
    const isBatteryCalculation = String(item.productType || 'viljuskar') === 'baterija';
    productTypeLocked = isBatteryCalculation;
    if ($('productType')) {
      $('productType').value = String(item.productType || 'viljuskar');
      applyProductTypeLock(productTypeLocked);
    }
    if ($('model')) $('model').value = item.model || '';
    if ($('customer')) $('customer').value = item.customer || '';
    if ($('commercialist')) $('commercialist').value = item.commercialist || '';
    if ($('calcDate')) $('calcDate').value = item.date || todayISO();
    if ($('supplier')) $('supplier').value = item.supplier || 'EP Equipment';
    if ($('note')) $('note').value = item.note || '';
    if ($('factory')) $('factory').value = item.factory ?? 0;
    if ($('transport')) $('transport').value = item.transport ?? 0;
    if ($('batteryWeight')) $('batteryWeight').value = item.batteryWeight ?? 0;
    if ($('chargerWeight')) $('chargerWeight').value = item.chargerWeight ?? 0;
    if ($('productType')) $('productType').value = item.productType || 'viljuskar';
    if ($('chargerPrice')) $('chargerPrice').value = item.chargerPrice ?? 0;
    if ($('chargerTransport')) $('chargerTransport').value = item.chargerTransport ?? 0;
    if ($('other')) $('other').value = item.other ?? 0;
    if ($('margin')) $('margin').value = item.margin ?? 20;
    if ($('sale')) $('sale').value = item.sale ?? 0;
    if ($('saveBtn')) $('saveBtn').textContent='Ažuriraj kalkulaciju';
    if ($('backBtn')) $('backBtn').classList.remove('hidden');
    if ($('cancelEditBtn')) $('cancelEditBtn').classList.remove('hidden');
    calc();
    show('calculator');
  } catch (err) {
    console.error('loadCalculationIntoForm failed:', err);
    // still try to show calculator so user can inspect
    try { show('calculator'); } catch(e){}
  }
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
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
  $(view).classList.remove('hidden');
  document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===view));
  const titles={dashboard:['Dashboard','Pregled kalkulacija i prodajnih cena'],calculator:['Nova kalkulacija','Unos troškova i obračun prodajne cene'],history:['Istorija','Sačuvane kalkulacije']};
  $('pageTitle').textContent=titles[view][0];$('pageSub').textContent=titles[view][1];

  // Toggle history hero image: decorative full-screen background.
  const hero = $('historyHero');
  if (hero) {
    if (view === 'history') {
      // If a user is logged in, the hero image is optional and hidden by default.
      if (!currentUser) { hero.classList.remove('hidden'); hero.classList.add('visible'); hero.setAttribute('aria-hidden','false'); }
      else { hero.classList.add('hidden'); hero.classList.remove('visible'); hero.setAttribute('aria-hidden','true'); }
    } else {
      hero.classList.add('hidden'); hero.classList.remove('visible'); hero.setAttribute('aria-hidden','true');
    }
  }
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
// productType select controls behavior; calc() will show/hide charger rows based on its value
if ($('productType')) {
  const updateModelPlaceholder = () => {
    const modelInput = $('model');
    if (modelInput) modelInput.placeholder = 'Unesite model';
  };
  $('productType').addEventListener('change', () => {
    const productType = $('productType');
    if (productTypeLocked && productType.value !== 'baterija') {
      productType.value = 'baterija';
      applyProductTypeLock(true);
      updateModelPlaceholder();
      calc();
      return;
    }

    // New calculations may switch modes freely; battery lock is only for editing existing battery records.
    productTypeLocked = false;
    applyProductTypeLock(false);
    syncResultSections(productType.value);
    updateModelPlaceholder();
    calc();
  });
  updateModelPlaceholder();
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
