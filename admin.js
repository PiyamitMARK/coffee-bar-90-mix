/**
 * Admin — Tea & Coffee Shop
 * Login: Mixzaza / 121212
 * สถานะ: รอจ่าย → จ่ายแล้ว, สรุปยอดวันนี้, ย้อนหลัง 1 เดือน
 */

const ADMIN_USER = 'Mixzaza';
const ADMIN_PASS = '121212';
const AUTH_KEY = 'tea-coffee-admin-auth';
const ORDERS_STORAGE_KEY = 'tea-coffee-pos-orders';
const ORDER_NUMBER_KEY = 'tea-coffee-pos-orderNumber';

// ==================== Google Sheet Config ====================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyW9YA2WglWbRuSaExrjw5T4SsS6nl6Ij4BH_a-rjrRqrUAxXYc6mZA6E45hJLlrOi96A/exec';
// =============================================================

// ==================== DOM Elements ====================
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

// Export elements
const exportSheetBtn = document.getElementById('exportSheetBtn');
const exportModal = document.getElementById('exportModal');
const exportCancel = document.getElementById('exportCancel');
const exportConfirm = document.getElementById('exportConfirm');
const exportStatus = document.getElementById('exportStatus');
const customDateRange = document.getElementById('customDateRange');
const dateFrom = document.getElementById('dateFrom');
const dateTo = document.getElementById('dateTo');

// ======================================================

function isLoggedIn() {
  return sessionStorage.getItem(AUTH_KEY) === 'true';
}

function setLoggedIn(value) {
  if (value) {
    sessionStorage.setItem(AUTH_KEY, 'true');
  } else {
    sessionStorage.removeItem(AUTH_KEY);
  }
}

function showScreen(screen) {
  loginScreen.classList.add('hidden');
  dashboardScreen.classList.add('hidden');
  screen.classList.remove('hidden');
}

function formatMoney(n) {
  return '฿' + Number(n).toFixed(2);
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDateOnly(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getDateKey(isoString) {
  const d = new Date(isoString);
  return d.toISOString().slice(0, 10);
}

function isToday(isoString) {
  const today = new Date().toISOString().slice(0, 10);
  return getDateKey(isoString) === today;
}

function isWithinLast30Days(isoString) {
  const d = new Date(isoString);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return d >= cutoff;
}

function loadOrders() {
  const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
  const orders = raw ? JSON.parse(raw) : [];
  return orders.map((o) => ({
    ...o,
    status: o.status === 'paid' ? 'paid' : 'pending',
  }));
}

function saveOrders(orders) {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

function markOrderAsPaid(orderNumber) {
  const orders = loadOrders();
  const order = orders.find((o) => o.orderNumber === orderNumber);
  if (!order) return;
  order.status = 'paid';
  saveOrders(orders);
  renderDailySummary();
  renderOrders();
  renderHistory();
}

function getTodaySummary() {
  const orders = loadOrders();
  const paidToday = orders.filter((o) => o.status === 'paid' && isToday(o.date));
  const count = paidToday.length;
  const total = paidToday.reduce((sum, o) => sum + o.total, 0);
  return { count, total };
}

function renderDailySummary() {
  const { count, total } = getTodaySummary();
  todayOrderCount.textContent = count;
  todayTotal.textContent = formatMoney(total);
}

function renderOrders() {
  const orders = loadOrders();

  if (orders.length === 0) {
    ordersList.classList.add('hidden');
    ordersList.innerHTML = '';
    ordersEmpty.classList.remove('hidden');
    return;
  }

  ordersEmpty.classList.add('hidden');
  ordersList.classList.remove('hidden');
  ordersList.innerHTML = orders
    .map((order) => {
      const isPending = order.status === 'pending';
      const statusText = isPending ? 'รอจ่าย' : 'จ่ายแล้ว';
      const statusClass = isPending ? 'pending' : 'paid';
      return `
    <article class="order-card" data-order-number="${order.orderNumber}">
      <div class="order-card-header">
        <div class="order-card-header-row">
          <h3 class="order-card-title">ออเดอร์ #${order.orderNumber}</h3>
          <span class="order-status-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="order-card-header-row">
          <span class="order-card-date">${formatDate(order.date)}</span>
          <div class="order-actions">
            ${isPending ? `<button type="button" class="btn-paid" data-order-number="${order.orderNumber}">จ่ายแล้ว</button>` : ''}
            <button type="button" class="btn-delete" data-order-number="${order.orderNumber}">ลบ</button>
          </div>
        </div>
      </div>
      <div class="order-card-body">
        <ul class="order-items">
          ${order.items.map((i) => `
            <li class="order-item">
              <span>
                ${i.name}
                ${i.temp ? `<br><small>${i.temp}, ${i.sweet}</small>` : ''}
                × ${i.qty}
              </span>
              <span>${formatMoney(i.price * i.qty)}</span>
            </li>`).join('')}
        </ul>
        <div class="order-totals">
          <div class="row total"><span>รวมทั้งหมด</span><span>${formatMoney(order.total)}</span></div>
        </div>
      </div>
    </article>`;
    })
    .join('');

  ordersList.querySelectorAll('.btn-paid').forEach((btn) => {
    btn.addEventListener('click', () => {
      const num = parseInt(btn.dataset.orderNumber, 10);
      markOrderAsPaid(num);
    });
  });

  ordersList.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      const num = parseInt(btn.dataset.orderNumber, 10);
      deleteOrder(num);
    });
  });
}

function deleteOrder(orderNumber) {
  if (!confirm(`ลบออเดอร์ #${orderNumber} ?`)) return;
  const orders = loadOrders();
  const newOrders = orders.filter(o => o.orderNumber !== orderNumber);
  saveOrders(newOrders);
  renderDailySummary();
  renderOrders();
  renderHistory();
}

function renderHistory() {
  const orders = loadOrders();
  const paidLast30 = orders.filter((o) => o.status === 'paid' && isWithinLast30Days(o.date));

  if (paidLast30.length === 0) {
    historyContent.classList.add('hidden');
    historyContent.innerHTML = '';
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

  const sortedDays = Object.keys(byDay).sort((a, b) => b.localeCompare(a));

  historyContent.innerHTML = sortedDays
    .map((key) => {
      const day = byDay[key];
      return `
    <section class="history-day">
      <div class="history-day-header">
        <span class="history-day-date">${formatDateOnly(day.date)}</span>
        <span class="history-day-total">${formatMoney(day.total)} (${day.orders.length} ออเดอร์)</span>
      </div>
      <div class="history-day-body">
        <ul class="history-day-orders">
          ${day.orders.map((o) =>
            `<li><span>ออเดอร์ #${o.orderNumber} — ${formatDate(o.date)}</span><span>${formatMoney(o.total)}</span></li>`
          ).join('')}
        </ul>
      </div>
    </section>`;
    })
    .join('');
}

function switchTab(tabId) {
  adminTabs.forEach((t) => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });
  tabRecent.classList.toggle('hidden', tabId !== 'recent');
  tabHistory.classList.toggle('hidden', tabId !== 'history');
}

function checkAuth() {
  if (isLoggedIn()) {
    showScreen(dashboardScreen);
    renderDailySummary();
    renderOrders();
    renderHistory();
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
    renderDailySummary();
    renderOrders();
    renderHistory();
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

adminTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    switchTab(tab.dataset.tab);
  });
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

function clearAllOrders() {
  localStorage.setItem(ORDERS_STORAGE_KEY, '[]');
  localStorage.setItem(ORDER_NUMBER_KEY, '1001');
  renderDailySummary();
  renderOrders();
  renderHistory();
  closeClearDataModal();
}

clearDataBtn.addEventListener('click', openClearDataModal);
clearDataCancel.addEventListener('click', closeClearDataModal);

clearDataConfirm.addEventListener('click', () => {
  clearDataError.textContent = '';
  const code = clearDataCode.value.trim();
  if (!code) {
    clearDataError.textContent = 'กรุณาใส่รหัส';
    clearDataCode.focus();
    return;
  }
  if (code !== ADMIN_PASS) {
    clearDataError.textContent = 'รหัสไม่ถูกต้อง';
    clearDataCode.focus();
    return;
  }
  if (confirm('ยืนยันล้างรายการสั่งซื้อทั้งหมดและรีเซ็ตหมายเลขออเดอร์เป็น 1001?')) {
    clearAllOrders();
  }
});

clearDataModal.addEventListener('click', (e) => {
  if (e.target === clearDataModal) closeClearDataModal();
});

// ==================== Google Sheet Export ====================

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
  const orders = loadOrders();
  if (range === 'today') return orders.filter(o => isToday(o.date));
  if (range === 'month') return orders.filter(o => isWithinLast30Days(o.date));
  if (range === 'custom') {
    const from = dateFrom.value;
    const to = dateTo.value;
    if (!from || !to) return [];
    return orders.filter(o => isInDateRange(o.date, from, to));
  }
  return orders;
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
exportModal.addEventListener('click', (e) => {
  if (e.target === exportModal) closeExportModal();
});

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

  const payload = {
    orders: orders,
    summary: buildSummary(orders)
  };

  exportConfirm.disabled = true;
  exportConfirm.textContent = 'กำลังส่ง...';
  exportStatus.textContent = '';
  exportStatus.className = 'export-status';

  try {
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
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

// =============================================================

checkAuth();
