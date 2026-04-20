/**
 * Admin — Tea & Coffee Shop
 * ใช้ Firebase Realtime Database — sync ทุกเครื่องแบบ real-time
 * Login: Mixzaza / 121212
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, update, remove, onValue, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyArtz0xjTNBNXbzeZjk-gmafuwszw9ErVk",
  authDomain: "tea-coffee-pos-23195.firebaseapp.com",
  databaseURL: "https://tea-coffee-pos-23195-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tea-coffee-pos-23195",
  storageBucket: "tea-coffee-pos-23195.firebasestorage.app",
  messagingSenderId: "58906181234",
  appId: "1:58906181234:web:6b633330168a619fce8ceb"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// ==================== Config ====================
const ADMIN_USER = 'Mixzaza';
const ADMIN_PASS = '545454';
const AUTH_KEY = 'tea-coffee-admin-auth';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwn1wGVz1ixvjpfdkDnKbCbsQEcM6cld2lw2iU-UEIWKLFCUpztnFRNOS1uSWPIXkSgbw/exec';

// ==================== DOM ====================
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('loginError');
const ordersList = document.getElementById('ordersList');
const ordersEmpty = document.getElementById('ordersEmpty');
const logoutBtn = document.getElementById('logoutBtn');
const todayOrderCount = document.getElementById('todayOrderCount');
const todayTotal = document.getElementById('todayTotal');
const tabRecent = document.getElementById('tabRecent');
const tabHistory = document.getElementById('tabHistory');
const historyContent = document.getElementById('historyContent');
const historyEmpty = document.getElementById('historyEmpty');
const adminTabs = document.querySelectorAll('.admin-tab');
const clearDataBtn = document.getElementById('clearDataBtn');
const clearDataModal = document.getElementById('clearDataModal');
const clearDataCode = document.getElementById('clearDataCode');
const clearDataError = document.getElementById('clearDataError');
const clearDataCancel = document.getElementById('clearDataCancel');
const clearDataConfirm = document.getElementById('clearDataConfirm');
const exportSheetBtn = document.getElementById('exportSheetBtn');
const exportModal = document.getElementById('exportModal');
const exportCancel = document.getElementById('exportCancel');
const exportConfirm = document.getElementById('exportConfirm');
const exportStatus = document.getElementById('exportStatus');
const customDateRange = document.getElementById('customDateRange');
const dateFrom = document.getElementById('dateFrom');
const dateTo = document.getElementById('dateTo');

// ==================== State ====================
// allOrders เก็บเป็น array { firebaseKey, ...orderData }
let allOrders = [];

// ==================== Auth ====================
function isLoggedIn() {
  return sessionStorage.getItem(AUTH_KEY) === 'true';
}

function setLoggedIn(value) {
  value ? sessionStorage.setItem(AUTH_KEY, 'true') : sessionStorage.removeItem(AUTH_KEY);
}

function showScreen(screen) {
  loginScreen.classList.add('hidden');
  dashboardScreen.classList.add('hidden');
  screen.classList.remove('hidden');
}

// ==================== Helpers ====================
function formatMoney(n) {
  return '฿' + Number(n).toFixed(2);
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatDateOnly(isoString) {
  return new Date(isoString).toLocaleDateString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function getDateKey(isoString) {
  return new Date(isoString).toISOString().slice(0, 10);
}

function isToday(isoString) {
  return getDateKey(isoString) === new Date().toISOString().slice(0, 10);
}

function isWithinLast30Days(isoString) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return new Date(isoString) >= cutoff;
}

// ==================== Firebase: Real-time Listener ====================
function startRealtimeListener() {
  onValue(ref(db, 'orders'), (snapshot) => {
    allOrders = [];
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        allOrders.push({ firebaseKey: child.key, ...child.val() });
      });
      // เรียงจากใหม่ไปเก่า
      allOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    renderDailySummary();
    renderOrders();
    renderHistory();
  });
}

// ==================== Firebase: Mark Paid ====================
async function markOrderAsPaid(firebaseKey) {
  await update(ref(db, `orders/${firebaseKey}`), { status: 'paid' });
  // onValue จะ trigger render ให้เองอัตโนมัติ
}

// ==================== Firebase: Delete Order ====================
async function deleteOrder(firebaseKey, orderNumber) {
  if (!confirm(`ลบออเดอร์ #${orderNumber} ?`)) return;
  await remove(ref(db, `orders/${firebaseKey}`));
}

// ==================== Firebase: Clear All Orders ====================
async function clearAllOrders() {
  await remove(ref(db, 'orders'));
  await update(ref(db, 'meta'), { orderNumber: 1001, lastOrderDate: new Date().toISOString().slice(0, 10) });
  closeClearDataModal();
}

// ==================== Render ====================
function renderDailySummary() {
  const paidToday = allOrders.filter((o) => o.status === 'paid' && isToday(o.date));
  todayOrderCount.textContent = paidToday.length;
  todayTotal.textContent = formatMoney(paidToday.reduce((sum, o) => sum + o.total, 0));
}

function renderOrders() {
  if (allOrders.length === 0) {
    ordersList.innerHTML = '';
    ordersList.classList.add('hidden');
    ordersEmpty.classList.remove('hidden');
    return;
  }

  ordersEmpty.classList.add('hidden');
  ordersList.classList.remove('hidden');
  ordersList.innerHTML = allOrders.map((order) => {
    const isPending = order.status === 'pending';
    return `
      <article class="order-card" data-key="${order.firebaseKey}">
        <div class="order-card-header">
          <div class="order-card-header-row">
            <h3 class="order-card-title">ออเดอร์ #${order.orderNumber}</h3>
            <span class="status-badge ${isPending ? 'pending' : 'paid'}">${isPending ? '⏳ รอจ่าย' : '✅ จ่ายแล้ว'}</span>
          </div>
          <div class="order-card-header-row">
            <span class="order-card-date">${formatDate(order.date)}</span>
            <div class="order-actions">
              ${isPending ? `<button type="button" class="btn-paid" data-key="${order.firebaseKey}">จ่ายแล้ว</button>` : ''}
              <button type="button" class="btn-add-item" data-key="${order.firebaseKey}">+ เมนู</button>
              <button type="button" class="btn-delete" data-key="${order.firebaseKey}" data-num="${order.orderNumber}">ลบ</button>
            </div>
          </div>
        </div>
        <div class="order-card-body">
          <ul class="order-items">
            ${(order.items || []).map((i) => `
              <li class="order-item">
                <span>${i.name}${i.temp ? `<br><small>${i.temp} · ${i.sweet}</small>` : ''} × ${i.qty}</span>
                <span>${formatMoney(i.price * i.qty)}</span>
              </li>`).join('')}
          </ul>
          <div class="order-total-row">
            <span>รวมทั้งหมด</span>
            <span>${formatMoney(order.total)}</span>
          </div>
        </div>
      </article>`;
  }).join('');

  ordersList.querySelectorAll('.btn-paid').forEach((btn) => {
    btn.addEventListener('click', () => markOrderAsPaid(btn.dataset.key));
  });

  ordersList.querySelectorAll('.btn-add-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const order = allOrders.find(o => o.firebaseKey === btn.dataset.key);
      if (order) openAddItemModal(btn.dataset.key, order);
    });
  });

  ordersList.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => deleteOrder(btn.dataset.key, btn.dataset.num));
  });
}

function renderHistory() {
  const paidLast30 = allOrders.filter((o) => o.status === 'paid' && isWithinLast30Days(o.date));

  if (paidLast30.length === 0) {
    historyContent.innerHTML = '';
    historyContent.classList.add('hidden');
    historyEmpty.classList.remove('hidden');
    return;
  }

  historyEmpty.classList.add('hidden');
  historyContent.classList.remove('hidden');

  const byDay = {};
  paidLast30.forEach((o) => {
    const key = getDateKey(o.date);
    if (!byDay[key]) byDay[key] = { date: o.date, orders: [], total: 0 };
    byDay[key].orders.push(o);
    byDay[key].total += o.total;
  });

  historyContent.innerHTML = Object.keys(byDay).sort((a, b) => b.localeCompare(a)).map((key) => {
    const day = byDay[key];
    return `
      <section class="history-day">
        <div class="history-day-header">
          <span class="history-day-date">${formatDateOnly(day.date)}</span>
          <div class="history-day-summary">
            <span class="history-day-count">${day.orders.length} ออเดอร์</span>
            <span class="history-day-total">${formatMoney(day.total)}</span>
          </div>
        </div>
        <div class="history-day-body">
          <ul class="history-orders">
            ${day.orders.map((o) =>
              `<li class="history-order-row"><span>ออเดอร์ #${o.orderNumber} · ${formatDate(o.date)}</span><span>${formatMoney(o.total)}</span></li>`
            ).join('')}
          </ul>
        </div>
      </section>`;
  }).join('');
}

// ==================== Tabs ====================
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach((t) => t.classList.toggle('active', t.dataset.tab === tabId));
  tabRecent.classList.toggle('hidden', tabId !== 'recent');
  tabHistory.classList.toggle('hidden', tabId !== 'history');
}

// ==================== Auth Events ====================
function checkAuth() {
  if (isLoggedIn()) {
    showScreen(dashboardScreen);
    startRealtimeListener();
    switchTab('recent');
  } else {
    showScreen(loginScreen);
  }
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const user = usernameInput.value.trim();
  const pass = passwordInput.value;
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    setLoggedIn(true);
    showScreen(dashboardScreen);
    startRealtimeListener();
    switchTab('recent');
  } else {
    loginError.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    passwordInput.focus();
  }
});

logoutBtn.addEventListener('click', () => {
  setLoggedIn(false);
  showScreen(loginScreen);
  usernameInput.value = '';
  passwordInput.value = '';
  loginError.textContent = '';
});

document.querySelectorAll('.tab-btn').forEach((tab) => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// ==================== Clear Data Modal ====================
function openClearDataModal() {
  clearDataError.textContent = '';
  clearDataCode.value = '';
  clearDataModal.setAttribute('aria-hidden', 'false');
  clearDataCode.focus();
}

function closeClearDataModal() {
  clearDataModal.setAttribute('aria-hidden', 'true');
  clearDataCode.value = '';
  clearDataError.textContent = '';
}

clearDataBtn.addEventListener('click', openClearDataModal);
clearDataCancel.addEventListener('click', closeClearDataModal);
clearDataModal.addEventListener('click', (e) => { if (e.target === clearDataModal) closeClearDataModal(); });

clearDataConfirm.addEventListener('click', async () => {
  clearDataError.textContent = '';
  const code = clearDataCode.value.trim();
  if (!code) { clearDataError.textContent = 'กรุณาใส่รหัส'; clearDataCode.focus(); return; }
  if (code !== ADMIN_PASS) { clearDataError.textContent = 'รหัสไม่ถูกต้อง'; clearDataCode.focus(); return; }
  if (confirm('ยืนยันล้างรายการสั่งซื้อทั้งหมดและรีเซ็ตหมายเลขออเดอร์เป็น 1001?')) {
    await clearAllOrders();
  }
});

// ==================== Export to Google Sheet ====================
function initDatePicker() {
  const today = new Date().toISOString().slice(0, 10);
  dateFrom.value = today;
  dateTo.value = today;
}

document.querySelectorAll('input[name="exportRange"]').forEach(radio => {
  radio.addEventListener('change', () => {
    customDateRange.classList.toggle('hidden', radio.value !== 'custom');
  });
});

function openExportModal() {
  exportStatus.textContent = '';
  exportStatus.className = 'export-status';
  exportConfirm.disabled = false;
  exportConfirm.textContent = '📤 ส่งข้อมูล';
  document.querySelector('input[name="exportRange"][value="today"]').checked = true;
  customDateRange.classList.add('hidden');
  initDatePicker();
  exportModal.setAttribute('aria-hidden', 'false');
}

function closeExportModal() {
  exportModal.setAttribute('aria-hidden', 'true');
  exportStatus.textContent = '';
}

function isInDateRange(isoString, from, to) {
  const key = getDateKey(isoString);
  return key >= from && key <= to;
}

function getFilteredOrders(range) {
  if (range === 'today') return allOrders.filter(o => isToday(o.date));
  if (range === 'month') return allOrders.filter(o => isWithinLast30Days(o.date));
  if (range === 'custom') {
    const from = dateFrom.value;
    const to = dateTo.value;
    if (!from || !to) return [];
    return allOrders.filter(o => isInDateRange(o.date, from, to));
  }
  return allOrders;
}

function buildSummary(orders) {
  const byDay = {};
  orders.filter(o => o.status === 'paid').forEach(o => {
    const key = getDateKey(o.date);
    if (!byDay[key]) byDay[key] = { date: key, orderCount: 0, total: 0 };
    byDay[key].orderCount++;
    byDay[key].total += o.total;
  });
  return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
}

exportSheetBtn.addEventListener('click', openExportModal);
exportCancel.addEventListener('click', closeExportModal);
exportModal.addEventListener('click', (e) => { if (e.target === exportModal) closeExportModal(); });

exportConfirm.addEventListener('click', async () => {
  const range = document.querySelector('input[name="exportRange"]:checked').value;
  if (range === 'custom') {
    if (!dateFrom.value || !dateTo.value) {
      exportStatus.textContent = '⚠️ กรุณาเลือกวันที่ให้ครบ';
      exportStatus.className = 'export-status error';
      return;
    }
    if (dateFrom.value > dateTo.value) {
      exportStatus.textContent = '⚠️ วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด';
      exportStatus.className = 'export-status error';
      return;
    }
  }

  const orders = getFilteredOrders(range);
  if (orders.length === 0) {
    exportStatus.textContent = '⚠️ ไม่มีข้อมูลในช่วงที่เลือก';
    exportStatus.className = 'export-status error';
    return;
  }

  exportConfirm.disabled = true;
  exportConfirm.textContent = 'กำลังส่ง...';
  exportStatus.textContent = '';
  exportStatus.className = 'export-status';

  try {
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ orders, summary: buildSummary(orders) })
    });
    const result = await res.json();
    if (result.success) {
      exportStatus.textContent = `✅ ส่งสำเร็จ! ${result.inserted} ออเดอร์ (ข้ามซ้ำ ${result.skipped} รายการ)`;
      exportStatus.className = 'export-status success';
      exportConfirm.textContent = '✅ สำเร็จ';
    } else {
      throw new Error(result.error || 'Unknown error');
    }
  } catch (err) {
    exportStatus.textContent = '❌ เกิดข้อผิดพลาด: ' + err.message;
    exportStatus.className = 'export-status error';
    exportConfirm.disabled = false;
    exportConfirm.textContent = '📤 ส่งข้อมูล';
  }
});

// ==================== Products (for admin add-item) ====================
const ALL_PRODUCTS = [
  { id: 'espresso',          name: 'เอสเปรสโซ่',            price: 55, category: 'coffee' },
  { id: 'cappuccino',        name: 'คาปูชิโน่',              price: 55, category: 'coffee' },
  { id: 'latte',             name: 'ลาเต้',                  price: 55, category: 'coffee' },
  { id: 'americano',         name: 'อเมริกาโน่',             price: 45, category: 'coffee' },
  { id: 'coconut-americano', name: 'อเมริกาโน่มะพร้าว',     price: 60, category: 'coffee' },
  { id: 'honey-americano',   name: 'อเมริกาโน่น้ำผึ้ง',     price: 55, category: 'coffee' },
  { id: 'mocha',             name: 'มอคค่า',                 price: 55, category: 'coffee' },
  { id: 'orange-americano',  name: 'อเมริกาโน่ส้ม',         price: 60, category: 'coffee' },
  { id: 'pure-matcha',       name: 'เพียวมัทฉะ',            price: 55, category: 'coffee' },
  { id: 'matcha-latte',      name: 'มัทฉะลาเต้',            price: 60, category: 'coffee' },
  { id: 'coconut-matcha',    name: 'มัทฉะมะพร้าว',          price: 60, category: 'coffee' },
  { id: 'water',             name: 'น้ำเปล่า',               price: 10, category: 'drink' },
  { id: 'pepsi',             name: 'เป็ปซี่',                price: 15, category: 'drink' },
  { id: 'fanta',             name: 'น้ำแดงแฟนต้า',          price: 15, category: 'drink' },
  { id: 'sprite',            name: 'สไปร์ท',                 price: 15, category: 'drink' },
  { id: 'coconut',           name: 'มะพร้าวปั่น',            price: 45, category: 'drink' },
  { id: 'thai-tea',          name: 'ชาไทย',                  price: 40, category: 'drink' },
  { id: 'green-tea',         name: 'ชาเขียว',                price: 40, category: 'drink' },
  { id: 'black-tea',         name: 'ชาดำเย็น',               price: 40, category: 'drink' },
  { id: 'lemon-tea',         name: 'ชามะนาว',                price: 40, category: 'drink' },
  { id: 'pink-milk',         name: 'นมชมพู',                 price: 40, category: 'drink' },
  { id: 'cocoa',             name: 'โกโก้',                  price: 40, category: 'drink' },
  { id: 'red-lime-soda',     name: 'แดงมะนาวโซดา',          price: 35, category: 'drink' },
  { id: 'blue-hawaii-soda',  name: 'บลูฮาวายมะนาวโซดา',    price: 35, category: 'drink' },
  { id: 'honey-lime-soda',   name: 'น้ำผึ้งมะนาวโซดา',      price: 35, category: 'drink' },
  { id: 'apple-soda',        name: 'แอปเปิ้ลโซดา',          price: 35, category: 'drink' },
  { id: 'orange-soda',       name: 'ส้มโซดา',                price: 35, category: 'drink' },
  { id: 'strawberry-soda',   name: 'สตรอเบอร์รี่โซดา',      price: 35, category: 'drink' },
  { id: 'blueberry-soda',    name: 'บลูเบอร์รี่โซดา',       price: 35, category: 'drink' },
  { id: 'strawberry-yogurt', name: 'สตรอเบอร์รี่โยเกิร์ต',  price: 55, category: 'drink' },
  { id: 'orange-yogurt',     name: 'ส้มโยเกิร์ต',            price: 55, category: 'drink' },
  { id: 'mango-yogurt',      name: 'มะม่วงโยเกิร์ต',         price: 55, category: 'drink' },
  { id: 'pineapple-yogurt',  name: 'สับปะรดโยเกิร์ต',        price: 55, category: 'drink' },
  { id: 'mix-berry-yogurt',  name: 'มิกซ์เบอร์รี่โยเกิร์ต', price: 55, category: 'drink' },
  { id: 'soi1',              name: 'ข้าวซอยไก่',             price: 65, category: 'food' },
  { id: 'soi3',              name: 'น้ำเงี้ยว',              price: 60, category: 'food' },
  { id: 'soi5',              name: 'เพิ่มไก่',               price: 20, category: 'food' },
  { id: 'soi4',              name: 'แคบหมู',                 price: 15, category: 'food' },
  { id: 'soi10',             name: 'ไข่',                    price: 10, category: 'food' },
  { id: 'kao1',              name: 'ข้าวหมูทอด',             price: 50, category: 'food' },
];

const ADD_ITEM_CATEGORIES = [
  { id: 'all',    label: '🍽 ทั้งหมด' },
  { id: 'coffee', label: '☕ กาแฟ' },
  { id: 'drink',  label: '🥤 น้ำ/โซดา' },
  { id: 'food',   label: '🍚 อาหาร' },
];
let addItemActiveCategory = 'all';

// ==================== Add Item Modal ====================
let addItemTargetKey = null;
let addItemTargetOrder = null;

const addItemModal = document.getElementById('addItemModal');
const addItemProductList = document.getElementById('addItemProductList');
const addItemCancel = document.getElementById('addItemCancel');

function openAddItemModal(firebaseKey, order) {
  addItemTargetKey = firebaseKey;
  addItemTargetOrder = JSON.parse(JSON.stringify(order));
  addItemActiveCategory = 'all';
  renderAddItemList();
  addItemModal.setAttribute('aria-hidden', 'false');
}

function closeAddItemModal() {
  addItemModal.setAttribute('aria-hidden', 'true');
  addItemTargetKey = null;
  addItemTargetOrder = null;
  document.getElementById('addItemToastMsg').textContent = '';
}

function renderAddItemList() {
  const currentItems = addItemTargetOrder.items || [];
  const filtered = addItemActiveCategory === 'all'
    ? ALL_PRODUCTS
    : ALL_PRODUCTS.filter(p => p.category === addItemActiveCategory);

  const tabsHtml = `<div class="add-item-cat-tabs">${
    ADD_ITEM_CATEGORIES.map(cat =>
      `<button type="button" class="add-item-cat-btn${addItemActiveCategory === cat.id ? ' active' : ''}" data-cat="${cat.id}">${cat.label}</button>`
    ).join('')
  }</div>`;

  const productsHtml = `<div class="add-item-product-grid">${
    filtered.map(p => {
      const existing = currentItems.find(i => i.name === p.name);
      const qty = existing ? existing.qty : 0;
      return `<button type="button" class="add-item-product-btn" data-name="${p.name}" data-price="${p.price}">
        <span class="add-item-product-name">${p.name}</span>
        <span class="add-item-product-price">${formatMoney(p.price)}</span>
        ${qty > 0 ? `<span class="add-item-qty-badge">${qty}</span>` : ''}
      </button>`;
    }).join('')
  }</div>`;

  addItemProductList.innerHTML = tabsHtml + productsHtml;

  addItemProductList.querySelectorAll('.add-item-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addItemActiveCategory = btn.dataset.cat;
      renderAddItemList();
    });
  });

  addItemProductList.querySelectorAll('.add-item-product-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { name, price } = btn.dataset;
      const items = addItemTargetOrder.items || [];
      const existing = items.find(i => i.name === name);
      if (existing) {
        existing.qty += 1;
      } else {
        items.push({ name, price: parseFloat(price), qty: 1 });
      }
      addItemTargetOrder.items = items;
      addItemTargetOrder.total = items.reduce((s, i) => s + i.price * i.qty, 0);

      await update(ref(db, `orders/${addItemTargetKey}`), {
        items: addItemTargetOrder.items,
        total: addItemTargetOrder.total,
      });

      const toast = document.getElementById('addItemToastMsg');
      toast.textContent = `✅ เพิ่ม "${name}" แล้ว`;
      setTimeout(() => { if (toast) toast.textContent = ''; }, 2000);

      renderAddItemList();
    });
  });
}

addItemCancel.addEventListener('click', closeAddItemModal);
addItemModal.addEventListener('click', (e) => { if (e.target === addItemModal) closeAddItemModal(); });

// ==================== Init ====================
checkAuth();
