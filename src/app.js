const API_BASE = "https://ridesharebackend-kzt5.onrender.com";

/* ─── RideShare App Core ─────────────────────────────────────────────────── */

// ── Toast ──────────────────────────────────────────────────────────────────

class ToastManager {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'toast-container';
    document.body.appendChild(this.el);
  }
  show(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<div class="toast-content">${msg}</div><button class="toast-close">&times;</button>`;
    t.querySelector('.toast-close').addEventListener('click', () => this.rm(t));
    this.el.appendChild(t);
    setTimeout(() => this.rm(t), 5000);
  }
  rm(t) {
    t.classList.add('toast-fade-out');
    t.addEventListener('animationend', () => t.remove(), { once: true });
  }
}
window.toast = { success: m => window._toast?.show(m,'success'), error: m => window._toast?.show(m,'error'), info: m => window._toast?.show(m,'info') };
// Legacy compat
window.toastSuccess = m => toast.success(m);
window.toastError   = m => toast.error(m);
window.toastInfo    = m => toast.info(m);

// ── Auth Manager ───────────────────────────────────────────────────────────
class AuthManager {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } })();
  }
  get isAuth()    { return !!(this.token && this.user); }
  get userType()  { return this.user?.userType || null; }
  get userName()  { return this.user?.name || 'User'; }
  get userId()    { return this.user?.id || this.user?._id || null; }
  get isAdmin()   { return this.userType === 'admin'; }
  get authHeader(){ return { 'Authorization': `Bearer ${this.token}` }; }
  get jsonHeaders(){ return { 'Content-Type': 'application/json', ...this.authHeader }; }

  save(token, user) {
    this.token = token; this.user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }
  logout() {
    localStorage.removeItem('token'); localStorage.removeItem('user');
    this.token = null; this.user = null;
    window.location.href = '/';
  }
  requireAuth(role = null) {
    if (!this.isAuth) { window.location.href = '/pages/login.html'; return false; }
    if (this.isAdmin) return true; // admin bypasses role checks
    if (role && this.userType !== role) {
      toast.error(`Access denied. ${role} account required.`);
      window.location.href = '/'; return false;
    }
    return true;
  }
  requireAdmin() {
    if (!this.isAuth || !this.isAdmin) { window.location.href = '/pages/login.html'; return false; }
    return true;
  }


// hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh



  async api(path, options = {}) {
    const res = await fetch(API_BASE + path, { headers: { ...this.jsonHeaders, ...(options.headers || {}) }, ...options });
    const data = await res.json().catch(() => ({}));    
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  }
  async validateToken() {
    if (!this.token) return false;
    try { await this.api('/api/auth/me'); return true; } catch { return false; }
  }
}

// ── Nav Builder ────────────────────────────────────────────────────────────
function buildNav(auth, activePage = '') {
  const el = document.getElementById('nav-links');
  if (!el) return;
  let links = '';
  if (auth.isAdmin) {
    links = `
      <a href="/pages/admin/dashboard.html" class="${activePage==='admin-dashboard'?'active':''}">📊 Dashboard</a>
      <a href="/pages/admin/users.html" class="${activePage==='admin-users'?'active':''}">👥 Users</a>
      <a href="/pages/admin/rides.html" class="${activePage==='admin-rides'?'active':''}">🚗 Rides</a>
      <a href="/pages/admin/reports.html" class="${activePage==='admin-reports'?'active':''}">🚩 Reports</a>
      <button id="logout-btn" class="button outline-button">Logout</button>
    `;
  } else if (auth.isAuth) {
    if (auth.userType === 'driver') {
      links = `
        <a href="/pages/dashboard.html" class="${activePage==='dashboard'?'active':''}">Dashboard</a>
        <a href="/pages/offer-ride.html" class="${activePage==='offer-ride'?'active':''}">Offer Ride</a>
        <a href="/pages/my-rides.html" class="${activePage==='my-rides'?'active':''}">My Rides</a>
        <a href="/pages/search-ride.html" class="${activePage==='search-ride'?'active':''}">Search</a>
        <a href="/pages/profile.html" class="${activePage==='profile'?'active':''}">Profile</a>
        <button id="logout-btn" class="button outline-button">Logout</button>
      `;
    } else {
      links = `
        <a href="/pages/passenger-dashboard.html" class="${activePage==='passenger-dashboard'?'active':''}">Dashboard</a>
        <a href="/pages/search-ride.html" class="${activePage==='search-ride'?'active':''}">Find Rides</a>
        <a href="/pages/my-bookings.html" class="${activePage==='my-bookings'?'active':''}">My Bookings</a>
        <a href="/pages/profile.html" class="${activePage==='profile'?'active':''}">Profile</a>
        <button id="logout-btn" class="button outline-button">Logout</button>
      `;
    }
  } else {
    links = `
      <a href="/pages/search-ride.html" class="${activePage==='search-ride'?'active':''}">Find Rides</a>
      <a href="/pages/login.html" class="${activePage==='login'?'active':''}">Login</a>
      <a href="/pages/signup.html" class="button primary-button btn-sm">Sign Up</a>
    `;
  }

  const notifHtml = auth.isAuth && !auth.isAdmin ? `
    <div class="notif-bell" id="notif-bell" title="Notifications">
      🔔<span class="notif-dot" id="notif-dot"></span>
    </div>
  ` : '';

  el.innerHTML = links + notifHtml + `<button id="theme-toggle" class="button toggle-button" type="button"></button>`;

  document.getElementById('logout-btn')?.addEventListener('click', () => auth.logout());
  initTheme();

  const toggle = document.getElementById('mobile-menu-toggle');
  if (toggle) {
    const fresh = toggle.cloneNode(true); toggle.replaceWith(fresh);
    fresh.addEventListener('click', () => el.classList.toggle('active'));
    el.addEventListener('click', e => { if (e.target.tagName==='A'||e.target.tagName==='BUTTON') el.classList.remove('active'); });
  }

  if (auth.isAuth && !auth.isAdmin) initSocket(auth);
}

// ── Theme ──────────────────────────────────────────────────────────────────
function initTheme() {
  applyTheme(localStorage.getItem('theme') || 'dark');
  const btn = document.getElementById('theme-toggle');
  if (btn && !btn.dataset.init) {
    btn.dataset.init = '1';
    btn.addEventListener('click', () => applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark'));
  }
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = t==='dark'?'☀ Light':'🌙 Dark';
}

// ── Socket.io ──────────────────────────────────────────────────────────────
let _socket = null;
function initSocket(auth) {
  if (_socket || typeof io === 'undefined') return;


// hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh



  _socket = io(API_BASE,{ auth: { token: auth.token }, transports: ['websocket', 'polling'] });

  _socket.on('connect', () => console.log('Socket connected'));
  _socket.on('disconnect', () => { _socket = null; });

  _socket.on('new_booking_request', data => {
    toast.info(`New booking from ${data.passenger} — ${data.from} → ${data.to}`);
    setNotifDot(true);
    if (window.onNewBooking) window.onNewBooking(data);
  });
  _socket.on('booking_status_changed', data => {
    const msg = data.status === 'confirmed' ? '✅ Booking confirmed!' : '❌ Booking was rejected';
    toast[data.status === 'confirmed' ? 'success' : 'error'](msg + ` — ${data.from} → ${data.to}`);
    setNotifDot(true);
    if (window.onBookingUpdate) window.onBookingUpdate(data);
  });
  _socket.on('ride_cancelled', data => {
    toast.error(`Ride cancelled: ${data.from} → ${data.to}. Reason: ${data.reason || 'No reason given'}`);
    setNotifDot(true);
    if (window.onRideCancelled) window.onRideCancelled(data);
  });
  _socket.on('ride_status_changed', data => {
    const labels = { started: '🚦 Ride has started', 'en-route': '🛣️ Ride is en route', completed: '🏁 Ride completed!' };
    toast.info((labels[data.status] || 'Ride status updated') + ` — ${data.from} → ${data.to}`);
    if (window.onRideStatus) window.onRideStatus(data);
  });
  _socket.on('seats_updated', data => {
    if (window.onSeatsUpdated) window.onSeatsUpdated(data);
  });
  _socket.on('waitlist_promoted', data => {
    toast.success(`🎉 A seat opened up! Your waitlist booking is now confirmed — ${data.from} → ${data.to}`);
    setNotifDot(true);
  });
  _socket.on('new_message', data => {
    if (window.onNewMessage) { window.onNewMessage(data); return; }
    toast.info(`💬 New message from ${data.sender?.name || 'someone'}`);
    setNotifDot(true);
  });
}
function getSocket() { return _socket; }
function setNotifDot(v) {
  const dot = document.getElementById('notif-dot');
  if (dot) dot.classList.toggle('visible', v);
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(d) { return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
function fmtTime(d) { return new Date(d).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}); }
function fmtCur(n)  { return '$' + parseFloat(n||0).toFixed(2); }
function fmtAgo(d) {
  const s = Math.floor((Date.now()-new Date(d))/1000);
  if (s<60) return 'just now';
  if (s<3600) return Math.floor(s/60)+'m ago';
  if (s<86400) return Math.floor(s/3600)+'h ago';
  return fmtDate(d);
}
function statusBadge(s) {
  const cls = {pending:'badge-pending',confirmed:'badge-confirmed',cancelled:'badge-cancelled',completed:'badge-completed',active:'badge-active',waitlisted:'badge-pending','started':'badge-active','en-route':'badge-active'};
  return `<span class="badge ${cls[s]||''}">${s}</span>`;
}
function starsHtml(score, size) {
  const sz = size || '0.9rem';
  return Array.from({length:5}, (_, i) => {
    const c = i < Math.round(score) ? 'var(--warning)' : 'var(--subtle)';
    return `<span style="color:${c};font-size:${sz}">★</span>`;
  }).join('');
}
function showLoading(el) { if(el) el.innerHTML=`<div class="loading-state"><div class="spinner"></div><p>Loading…</p></div>`; }
function showEmpty(el,icon,title,msg,action='') {
  if(el) el.innerHTML=`<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${title}</h3><p>${msg}</p>${action}</div>`;
}
function buildPagination(container, current, total, onPage) {
  if (total <= 1) { container.innerHTML = ''; return; }
  let html = `<button class="page-btn" ${current<=1?'disabled':''} onclick="(${onPage.toString()})(${current-1})">‹</button>`;
  for (let i=1;i<=total;i++) {
    if (i===1||i===total||Math.abs(i-current)<=1) html+=`<button class="page-btn ${i===current?'active':''}" onclick="(${onPage.toString()})(${i})">${i}</button>`;
    else if (Math.abs(i-current)===2) html+=`<span style="color:var(--muted);padding:0.25rem">…</span>`;
  }
  html += `<button class="page-btn" ${current>=total?'disabled':''} onclick="(${onPage.toString()})(${current+1})">›</button>`;
  container.innerHTML = html;
}

// ── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  window._toast = new ToastManager();
  window.auth   = new AuthManager();
  initTheme();
});
