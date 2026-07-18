/* ============================================================
   booking.js — MeetSpace Booking System
   ============================================================ */

'use strict';

var API_BASE = 'http://localhost:5000/api';

/* ============================================================
   DATA STORE
   ============================================================ */
var MS = {

  /* Rooms */
  rooms: [
    { id: 'R1', name: 'Boardroom A',   capacity: 10, floor: 2, pricePerHour: 150, status: 'occupied'  },
    { id: 'R2', name: 'Focus Room B',  capacity: 4,  floor: 1, pricePerHour: 75,  status: 'available' },
    { id: 'R3', name: 'Workshop C',    capacity: 20, floor: 3, pricePerHour: 200, status: 'reserved'  },
    { id: 'R4', name: 'Pod D',         capacity: 2,  floor: 1, pricePerHour: 50,  status: 'available' },
    { id: 'R5', name: 'Suite E',       capacity: 8,  floor: 2, pricePerHour: 120, status: 'available' }
  ],

  /* Bookings — persisted in sessionStorage */
  bookings: [],

  /* Notifications */
  notifications: [],

  /* Calendar state */
  calView:        'month',
  calDate:        new Date(),

  /* Timer state */
  timerInterval:  null,
  timerRemaining: 0,
  timerExpired:   false,
  TIMER_TOTAL:    300,   /* 5 minutes */
  CIRC:           138.2, /* SVG circumference for r=22 */

  /* Current edit booking id */
  editingId: null
};

/* ============================================================
   PERSISTENCE
   ============================================================ */
function saveBookings() {
  try {
    sessionStorage.setItem('ms_bookings', JSON.stringify(MS.bookings));
  } catch(e) {}
}

function loadBookings() {
  try {
    var raw = sessionStorage.getItem('ms_bookings');
    if (raw) MS.bookings = JSON.parse(raw);
  } catch(e) { MS.bookings = []; }
}

function saveNotifications() {
  try {
    sessionStorage.setItem('ms_notifs', JSON.stringify(MS.notifications));
  } catch(e) {}
}

function loadNotifications() {
  try {
    var raw = sessionStorage.getItem('ms_notifs');
    if (raw) MS.notifications = JSON.parse(raw);
  } catch(e) { MS.notifications = []; }
}

/* ============================================================
   UTILITIES
   ============================================================ */
function genId() {
  return 'BK' + Date.now() + Math.floor(Math.random() * 1000);
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr + 'T00:00:00');
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
}

function fmtTime(t) { return t || ''; }

function timeToMins(t) {
  if (!t) return 0;
  var parts = t.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function minsToTime(m) {
  var h = Math.floor(m / 60) % 24;
  var min = m % 60;
  return String(h).padStart(2,'0') + ':' + String(min).padStart(2,'0');
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function getRoomById(id) {
  return MS.rooms.find(function(r) { return String(r.id) === String(id); });
}

function getRoomByName(name) {
  return MS.rooms.find(function(r) { return r.name === name; });
}

function getAuthToken() {
  return localStorage.getItem('ms_token') || localStorage.getItem('tenantToken') || '';
}

async function ensureTenantAuth() {
  var token = getAuthToken();
  if (!token) {
    window.location.href = 'index.html';
    return null;
  }

  try {
    var response = await fetch(API_BASE + '/auth/me', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    if (!response.ok) {
      throw new Error('Session invalid');
    }

    var data = await response.json();
    if (!data || !data.tenant) {
      throw new Error('Session payload missing user');
    }

    localStorage.setItem('ms_token', token);
    localStorage.setItem('tenantToken', token);
    localStorage.setItem('ms_role', 'tenant');
    localStorage.setItem('ms_name', data.tenant.full_name || 'Tenant User');
    localStorage.setItem('ms_email', data.tenant.email || '');

    var initials = (data.tenant.full_name || 'Tenant User')
      .split(' ')
      .filter(function(p) { return p; })
      .slice(0, 2)
      .map(function(p) { return p.charAt(0).toUpperCase(); })
      .join('');
    localStorage.setItem('ms_init', initials || 'TU');

    sessionStorage.setItem('ms_name', localStorage.getItem('ms_name') || 'Tenant User');
    sessionStorage.setItem('ms_init', localStorage.getItem('ms_init') || 'TU');
    sessionStorage.setItem('ms_email', localStorage.getItem('ms_email') || '');

    return data.tenant;
  } catch (error) {
    localStorage.removeItem('tenantToken');
    localStorage.removeItem('ms_token');
    localStorage.removeItem('ms_role');
    localStorage.removeItem('ms_name');
    localStorage.removeItem('ms_init');
    localStorage.removeItem('ms_email');
    window.location.href = 'index.html';
    return null;
  }
}

function normalizeRoom(room) {
  return {
    id: String(room.id),
    roomCode: room.room_code,
    name: room.name,
    capacity: room.capacity,
    floor: room.floor,
    pricePerHour: parseFloat(room.price_per_hour) || 50,
    status: room.status || 'available'
  };
}

function normalizeBooking(booking) {
  return {
    id: String(booking.id),
    title: booking.title,
    organizer: sessionStorage.getItem('ms_name') || localStorage.getItem('ms_name') || 'Tenant User',
    email: sessionStorage.getItem('ms_email') || localStorage.getItem('ms_email') || '',
    phone: booking.phone || '',
    roomId: String(booking.room_id),
    roomName: booking.room_name,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
    attendees: booking.attendees,
    purpose: booking.purpose || '',
    notes: booking.notes || '',
    paymentMethod: booking.payment_method || booking.paymentMethod || '',
    paymentContact: booking.payment_contact || booking.paymentContact || '',
    paymentStatus: booking.payment_status || booking.paymentStatus || 'pending',
    status: booking.status,
    createdAt: booking.created_at || new Date().toISOString()
  };
}

async function apiRequest(path, options) {
  var token = getAuthToken();
  if (!token) throw new Error('Please log in first.');

  var headers = Object.assign(
    { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    options && options.headers ? options.headers : {}
  );

  var response = await fetch(API_BASE + path, Object.assign({}, options || {}, { 
    headers: headers,
    credentials: 'include'  // Support Remember Me cookies as fallback
  }));
  var data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}

async function loadRoomsFromApi() {
  var data = await apiRequest('/rooms', { method: 'GET' });
  MS.rooms = (data.data || []).map(normalizeRoom);
}

async function loadBookingsFromApi() {
  var data = await apiRequest('/bookings', { method: 'GET' });
  MS.bookings = (data.data || []).map(normalizeBooking);
}

async function syncDashboardData() {
  try {
    await Promise.all([loadRoomsFromApi(), loadBookingsFromApi()]);
  } catch (e) {
    console.warn('API sync failed:', e.message);
    console.warn('Falling back to local data');
    loadBookings();
    // Show warning banner that data might be outdated
    showToast('⚠️ Offline mode: Showing cached data. Some features may be limited.', 'warn');
  }
}

/* ============================================================
   DOUBLE BOOKING PREVENTION
   ============================================================ */
function hasConflict(roomId, date, startTime, endTime, excludeId) {
  var newStart = timeToMins(startTime);
  var newEnd   = timeToMins(endTime);

  return MS.bookings.some(function(b) {
    if (b.id === excludeId)    return false;
    if (b.roomId !== roomId)   return false;
    if (b.date   !== date)     return false;
    if (b.status === 'cancelled' || b.status === 'expired') return false;

    var bStart = timeToMins(b.startTime);
    var bEnd   = timeToMins(b.endTime);

    /* Overlap check: not (newEnd <= bStart || newStart >= bEnd) */
    return !(newEnd <= bStart || newStart >= bEnd);
  });
}

/* ============================================================
   TOAST
   ============================================================ */
function showToast(msg, type) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast-' + (type || 'success');
  t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(function() { t.classList.remove('show'); }, 3800);
}

/* ============================================================
   NOTIFICATIONS
   ============================================================ */
function addNotification(msg, type) {
  var now = new Date();
  var timeStr = now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0');
  MS.notifications.unshift({ msg: msg, type: type || 'info', time: timeStr, unread: true });
  saveNotifications();
  renderNotifications();
  updateNotifBadge();
}

function updateNotifBadge() {
  var dot = document.getElementById('notif-dot');
  var count = MS.notifications.filter(function(n) { return n.unread; }).length;
  if (dot) dot.style.display = count > 0 ? 'block' : 'none';
}

function renderNotifications() {
  var list = document.getElementById('notif-list');
  if (!list) return;

  if (MS.notifications.length === 0) {
    list.innerHTML = '<div class="empty-state"><i class="ti ti-bell-off"></i><p>No notifications yet.</p></div>';
    return;
  }

  list.innerHTML = MS.notifications.map(function(n) {
    var iconMap = { confirm: 'ti-circle-check', cancel: 'ti-circle-x', warn: 'ti-alert-triangle', info: 'ti-info-circle', reminder: 'ti-clock' };
    var classMap = { confirm: 'ni-confirm', cancel: 'ni-cancel', warn: 'ni-warn', info: 'ni-info', reminder: 'ni-warn' };
    return '<div class="notif-item' + (n.unread ? ' unread' : '') + '">'
      + '<div class="notif-icon ' + (classMap[n.type] || 'ni-info') + '"><i class="ti ' + (iconMap[n.type] || 'ti-info-circle') + '"></i></div>'
      + '<div><div class="notif-text">' + n.msg + '</div><div class="notif-time">' + n.time + '</div></div>'
      + '</div>';
  }).join('');
}

function openNotifPanel() {
  var panel = document.getElementById('notif-panel');
  if (panel) panel.classList.add('open');
  MS.notifications.forEach(function(n) { n.unread = false; });
  saveNotifications();
  updateNotifBadge();
  renderNotifications();
}

function closeNotifPanel() {
  var panel = document.getElementById('notif-panel');
  if (panel) panel.classList.remove('open');
}

/* ============================================================
   5-MINUTE BOOKING TIMER
   ============================================================ */
function timerFmt(s) {
  var m = Math.floor(s / 60);
  var sec = s % 60;
  return String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
}

function timerSetColor(pct) {
  var color = pct > 0.33 ? '#185FA5' : pct > 0.13 ? '#EF9F27' : '#E24B4A';
  var ring = document.getElementById('t-ring');
  var bar  = document.getElementById('t-bar-fill');
  if (ring) ring.style.stroke = color;
  if (bar)  bar.style.background = color;
}

function timerStart() {
  timerStop();
  MS.timerExpired   = false;
  MS.timerRemaining = MS.TIMER_TOTAL;

  var display = document.getElementById('t-countdown');
  var ring    = document.getElementById('t-ring');
  var barFill = document.getElementById('t-bar-fill');
  var badge   = document.getElementById('t-badge');
  var warnEl  = document.getElementById('t-warn-alert');
  var expEl   = document.getElementById('t-exp-alert');
  var confirmBtn = document.getElementById('btn-confirm-booking');

  if (display)    display.textContent = timerFmt(MS.TIMER_TOTAL);
  if (ring)       { ring.style.strokeDashoffset = '0'; ring.style.stroke = '#185FA5'; }
  if (barFill)    { barFill.style.width = '100%'; barFill.style.background = '#185FA5'; }
  if (badge)      { badge.textContent = 'Slot locked'; badge.className = 'timer-badge tb-run'; }
  if (warnEl)     warnEl.classList.remove('show');
  if (expEl)      expEl.classList.remove('show');
  if (confirmBtn) confirmBtn.disabled = false;

  MS.timerInterval = setInterval(function() {
    MS.timerRemaining--;
    var pct = MS.timerRemaining / MS.TIMER_TOTAL;

    if (display) display.textContent = timerFmt(MS.timerRemaining);
    if (barFill) barFill.style.width = Math.max(0, Math.round(pct * 100)) + '%';
    if (ring)    ring.style.strokeDashoffset = (MS.CIRC * (1 - pct)).toFixed(2);
    timerSetColor(pct);

    /* 1 minute warning */
    if (MS.timerRemaining === 60) {
      if (warnEl) warnEl.classList.add('show');
      if (badge)  { badge.textContent = '1 min left'; badge.className = 'timer-badge tb-warn'; }
      addNotification('⚠️ Only 1 minute remaining. Please complete your booking.', 'warn');
    }

    /* Expired */
    if (MS.timerRemaining <= 0) {
      timerStop();
      MS.timerExpired = true;
      if (display)    display.textContent = '00:00';
      if (barFill)    barFill.style.width = '0%';
      if (warnEl)     warnEl.classList.remove('show');
      if (expEl)      expEl.classList.add('show');
      if (badge)      { badge.textContent = 'Expired'; badge.className = 'timer-badge tb-exp'; }
      if (confirmBtn) confirmBtn.disabled = true;
      addNotification('Your booking session has expired. The room has been released and is now available for booking.', 'cancel');
    }
  }, 1000);
}

function timerStop() {
  if (MS.timerInterval) {
    clearInterval(MS.timerInterval);
    MS.timerInterval = null;
  }
}

/* ============================================================
   MODAL — OPEN / CLOSE
   ============================================================ */
function openBookingModal(preselectedRoom) {
  MS.editingId = null;

  /* Reset form */
  var form = document.getElementById('booking-form');
  if (form) form.reset();

  /* Clear field errors */
  document.querySelectorAll('.field-error').forEach(function(el) { el.classList.remove('field-error'); });
  document.querySelectorAll('.field-err-msg').forEach(function(el) { el.classList.remove('show'); });

  /* Hide alerts */
  var conflictEl = document.getElementById('conflict-alert');
  if (conflictEl) conflictEl.classList.remove('show');

  /* Default date to today */
  var dateField = document.getElementById('m-date');
  if (dateField) {
    var today = new Date();
    var todayStr = today.toISOString().split('T')[0];
    var yearEnd = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0];
    
    dateField.value = todayStr;
    dateField.setAttribute('min', todayStr);
    dateField.setAttribute('max', yearEnd);
  }

  /* Set modal title */
  var title = document.getElementById('modal-title');
  if (title) title.textContent = 'New booking';

  /* Reset confirm button text */
  var confirmBtn = document.getElementById('btn-confirm-booking');
  if (confirmBtn) {
    confirmBtn.innerHTML = '<i class="ti ti-check" style="font-size:15px; vertical-align:-2px; margin-right:4px;"></i>Confirm &amp; Pay';
    confirmBtn.disabled = false;
  }
  resetPaySectionUI();

  /* Preselect room if passed */
  if (preselectedRoom) {
    var sel = document.getElementById('m-room');
    if (sel) {
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === preselectedRoom) { sel.selectedIndex = i; break; }
      }
    }
  }

  var overlay = document.getElementById('booking-modal');
  if (overlay) overlay.classList.add('open');

  /* Auto-start 5-minute timer */
  timerStart();

  /* Init payment section with preselected room */
  var roomSel = document.getElementById('m-room');
  var selectedRoom = preselectedRoom || (roomSel ? roomSel.value : '');
  if (selectedRoom) {
    initPaySection(selectedRoom);
  } else {
    hidePaySection();
  }

  /* Update price display after modal opens */
  setTimeout(function() { updatePriceDisplay(); updatePayTotal(); }, 100);
}

function openEditModal(bookingId) {
  var b = MS.bookings.find(function(x) { return x.id === bookingId; });
  if (!b) return;

  MS.editingId = bookingId;

  /* Populate form */
  setVal('m-title',     b.title);
  setVal('m-organizer', b.organizer);
  setVal('m-email',     b.email);
  setVal('m-phone',     b.phone);
  setVal('m-room',      b.roomId);
  setVal('m-date',      b.date);
  
  /* Apply date constraints */
  var dateFieldEdit = document.getElementById('m-date');
  if (dateFieldEdit) {
    var today = new Date();
    var todayStr = today.toISOString().split('T')[0];
    var yearEnd = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0];
    dateFieldEdit.setAttribute('min', todayStr);
    dateFieldEdit.setAttribute('max', yearEnd);
  }
  
  setVal('m-start',     b.startTime);
  setVal('m-end',       b.endTime);
  setVal('m-attendees', b.attendees);
  setVal('m-purpose',   b.purpose);
  setVal('m-notes',     b.notes);

  /* Clear field errors */
  document.querySelectorAll('.field-error').forEach(function(el) { el.classList.remove('field-error'); });
  document.querySelectorAll('.field-err-msg').forEach(function(el) { el.classList.remove('show'); });

  var conflictEl = document.getElementById('conflict-alert');
  if (conflictEl) conflictEl.classList.remove('show');

  var title = document.getElementById('modal-title');
  if (title) title.textContent = 'Edit booking';

  /* Hide pay section for edits */
  hidePaySection();
  resetPaySectionUI();

  var confirmBtn = document.getElementById('btn-confirm-booking');
  if (confirmBtn) {
    confirmBtn.innerHTML = '<i class="ti ti-check" style="font-size:15px; vertical-align:-2px; margin-right:4px;"></i>Update booking';
  }

  var overlay = document.getElementById('booking-modal');
  if (overlay) overlay.classList.add('open');

  /* Start fresh 5-minute timer for edit session too */
  timerStart();

  /* Update price display */
  setTimeout(function() { updatePriceDisplay(); }, 100);
}

function closeBookingModal() {
  timerStop();
  var overlay = document.getElementById('booking-modal');
  if (overlay) overlay.classList.remove('open');
  MS.editingId = null;
  hidePaySection();
  resetPaySectionUI();
}

function setVal(id, val) {
  var el = document.getElementById(id);
  if (el) el.value = val || '';
}

function getVal(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function clearVal(id) {
  var el = document.getElementById(id);
  if (el) el.value = '';
}

function paymentMethodLabel(method) {
  var normalized = String(method || '').toLowerCase();
  if (normalized === 'bank' || normalized === 'card') return 'Bank card';
  if (normalized === 'mpesa') return 'M-Pesa';
  if (normalized === 'airtel_money') return 'Airtel Money';
  if (normalized === 'tcash') return 'T-Cash';
  return normalized ? normalized : '—';
}

function parsePaymentContact(raw) {
  if (!raw) return null;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return { raw: raw };
  }
}

function buildPaymentContact(method) {
  if (method === 'bank') {
    return JSON.stringify({
      bankName: getVal('m-bank-name'),
      cardHolder: getVal('m-bank-card-name'),
      cardNumber: getVal('m-bank-card-number').replace(/\s+/g, ''),
      expiry: getVal('m-bank-expiry'),
      cvv: getVal('m-bank-cvv')
    });
  }

  if (method === 'mpesa' || method === 'airtel_money' || method === 'tcash') {
    var mode = getVal('m-mobile-confirmation');
    return JSON.stringify({
      mode: mode,
      phone: mode === 'manual' ? getVal('m-mobile-phone') : ''
    });
  }

  return '';
}

function togglePaymentFields() {
  var agree = document.getElementById('m-agree');
  var paymentMethod = document.getElementById('m-payment-method');
  var bankWrap = document.getElementById('m-bank-wrap');
  var mobileWrap = document.getElementById('m-mobile-wrap');
  var mobileConfirmation = document.getElementById('m-mobile-confirmation');
  var mobilePhoneWrap = document.getElementById('m-mobile-phone-wrap');
  var mobilePhone = document.getElementById('m-mobile-phone');
  var bankFieldIds = ['m-bank-card-number', 'm-bank-card-name', 'm-bank-expiry', 'm-bank-cvv', 'm-bank-name'];

  if (!agree || !paymentMethod) return;

  paymentMethod.disabled = !agree.checked;

  if (!agree.checked) {
    paymentMethod.value = '';
  }

  var method = paymentMethod.value;
  var isBank = agree.checked && method === 'bank';
  var isMobile = agree.checked && (method === 'mpesa' || method === 'airtel_money' || method === 'tcash');

  if (bankWrap) bankWrap.style.display = isBank ? 'block' : 'none';
  bankFieldIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.disabled = !isBank;
    if (!isBank) el.value = '';
  });

  if (mobileWrap) mobileWrap.style.display = isMobile ? 'block' : 'none';
  if (mobileConfirmation) {
    mobileConfirmation.disabled = !isMobile;
    if (!isMobile) mobileConfirmation.value = '';
  }

  var manualMobile = isMobile && mobileConfirmation && mobileConfirmation.value === 'manual';
  if (mobilePhoneWrap) mobilePhoneWrap.style.display = manualMobile ? 'block' : 'none';
  if (mobilePhone) {
    mobilePhone.disabled = !manualMobile;
    if (!manualMobile) mobilePhone.value = '';
  }

  var agreeErr = document.getElementById('err-agree');
  if (agree && agree.checked && agreeErr) agreeErr.classList.remove('show');
}

/* ============================================================
   FORM VALIDATION
   ============================================================ */
function validateField(id, errorId, condition) {
  var el  = document.getElementById(id);
  var err = document.getElementById(errorId);
  if (!el) return true;
  if (!condition) {
    el.classList.add('field-error');
    if (err) err.classList.add('show');
    return false;
  }
  el.classList.remove('field-error');
  if (err) err.classList.remove('show');
  return true;
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validateBookingForm() {
  var ok = true;
  ok = validateField('m-title',     'err-title',     getVal('m-title').length > 0)     && ok;
  ok = validateField('m-organizer', 'err-organizer',  getVal('m-organizer').length > 0)  && ok;
  ok = validateField('m-email',     'err-email',      isValidEmail(getVal('m-email')))    && ok;
  ok = validateField('m-room',      'err-room',       getVal('m-room') !== '')            && ok;
  ok = validateField('m-date',      'err-date',       getVal('m-date') !== '')            && ok;
  ok = validateField('m-start',     'err-start',      getVal('m-start') !== '')           && ok;
  ok = validateField('m-end',       'err-end',        getVal('m-end') !== '' && timeToMins(getVal('m-end')) > timeToMins(getVal('m-start'))) && ok;
  ok = validateField('m-attendees', 'err-attendees',  parseInt(getVal('m-attendees')) > 0) && ok;
  return ok;
}

/* ============================================================
   CONFIRM BOOKING
   ============================================================ */
async function confirmBooking() {
  if (MS.timerExpired) {
    showToast('Session expired. Please open a new booking.', 'error');
    return;
  }

  if (!validateBookingForm()) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  /* Validate payment form too */
  var paySection = document.getElementById('pay-section');
  var isPayVisible = paySection && paySection.style.display !== 'none';
  if (isPayVisible && !PAY.processing) {
    if (!validatePaymentForm()) {
      showToast('Please fill in all payment details correctly.', 'error');
      return;
    }
  }

  var roomId    = getVal('m-room');
  var date      = getVal('m-date');
  var startTime = getVal('m-start');
  var endTime   = getVal('m-end');

  /* Double booking check */
  if (hasConflict(roomId, date, startTime, endTime, MS.editingId)) {
    var conflictEl = document.getElementById('conflict-alert');
    if (conflictEl) conflictEl.classList.add('show');
    showToast('This room is already booked during the selected time.', 'error');
    return;
  }

  var conflictEl = document.getElementById('conflict-alert');
  if (conflictEl) conflictEl.classList.remove('show');

  var room = getRoomById(roomId);

  var payload = {
    title: getVal('m-title'),
    roomId: parseInt(roomId, 10),
    date: date,
    startTime: startTime,
    endTime: endTime,
    attendees: parseInt(getVal('m-attendees'), 10),
    purpose: getVal('m-purpose'),
    paymentMethod: PAY.method,
    paymentContact: PAY.method === 'mpesa' ? getVal('pay-phone') : getVal('pay-card-number').replace(/\s/g, '')
  };

  try {
    if (MS.editingId) {
      await apiRequest('/bookings/' + MS.editingId, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      addNotification('Booking updated: ' + getVal('m-title') + ' in ' + (room ? room.name : ''), 'info');
      showToast('Booking updated successfully.', 'success');
      await loadBookingsFromApi();
      timerStop();
      closeBookingModal();
      renderAll();
    } else {
      await apiRequest('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      addNotification('Booking confirmed: ' + getVal('m-title') + ' in ' + (room ? room.name : ''), 'confirm');

      await loadBookingsFromApi();

      /* Process payment inline */
      if (isPayVisible) {
        await processPaymentInline();
        /* Auto-close after brief delay to show success */
        setTimeout(function() {
          timerStop();
          closeBookingModal();
          renderAll();
        }, 2000);
      } else {
        showToast('Booking confirmed — ' + (room ? room.name : '') + ' is reserved.', 'success');
        timerStop();
        closeBookingModal();
        renderAll();
      }
    }
  } catch (e) {
    showToast(e.message || 'Unable to save booking.', 'error');
  }
}

function buildBookingObj(id, room) {
  return {
    id:         id,
    title:      getVal('m-title'),
    organizer:  getVal('m-organizer'),
    email:      getVal('m-email'),
    phone:      getVal('m-phone'),
    roomId:     getVal('m-room'),
    roomName:   room ? room.name : getVal('m-room'),
    date:       getVal('m-date'),
    startTime:  getVal('m-start'),
    endTime:    getVal('m-end'),
    attendees:  getVal('m-attendees'),
    purpose:    getVal('m-purpose'),
    notes:      getVal('m-notes'),
    paymentMethod: getVal('m-payment-method'),
    paymentContact: buildPaymentContact(getVal('m-payment-method')),
    paymentStatus: 'pending',
    status:     'upcoming',
    createdAt:  new Date().toISOString()
  };
}

/* ============================================================
   CANCEL BOOKING
   ============================================================ */
async function cancelBooking(id) {
  var b = MS.bookings.find(function(x) { return x.id === id; });
  if (!b) return;
  if (!confirm('Cancel booking "' + b.title + '"? This cannot be undone.')) return;

  try {
    await apiRequest('/bookings/' + id, { method: 'DELETE' });
    await loadBookingsFromApi();
    addNotification('Booking cancelled: ' + b.title, 'cancel');
    showToast('Booking cancelled.', 'warn');
    renderAll();
  } catch (e) {
    showToast(e.message || 'Unable to cancel booking.', 'error');
  }
}

/* ============================================================
   ROOM STATUS RENDERING
   ============================================================ */
function getRoomStatus(room) {
  var now = new Date();
  var todayISO = todayStr();
  var currentMins = now.getHours() * 60 + now.getMinutes();

  var active = MS.bookings.find(function(b) {
    if (b.roomId !== room.id) return false;
    if (b.date   !== todayISO) return false;
    if (b.status === 'cancelled' || b.status === 'expired') return false;
    return timeToMins(b.startTime) <= currentMins && currentMins < timeToMins(b.endTime);
  });

  if (active) return 'occupied';

  var upcoming = MS.bookings.find(function(b) {
    if (b.roomId !== room.id) return false;
    if (b.date   !== todayISO) return false;
    if (b.status === 'cancelled' || b.status === 'expired') return false;
    return timeToMins(b.startTime) > currentMins;
  });

  return upcoming ? 'reserved' : 'available';
}

function getNextBooking(roomId) {
  var now = new Date();
  var todayISO = todayStr();
  var currentMins = now.getHours() * 60 + now.getMinutes();

  var next = MS.bookings
    .filter(function(b) {
      return b.roomId === roomId
        && b.date >= todayISO
        && b.status !== 'cancelled'
        && b.status !== 'expired'
        && (b.date > todayISO || timeToMins(b.startTime) > currentMins);
    })
    .sort(function(a, b) {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return timeToMins(a.startTime) - timeToMins(b.startTime);
    })[0];

  return next ? (next.date === todayISO ? 'Today ' : fmtDate(next.date) + ' ') + next.startTime : '—';
}

/* ============================================================
   RENDER: ROOM AVAILABILITY TABLE
   ============================================================ */
function renderRooms() {
  var tbody = document.getElementById('rooms-tbody');
  if (!tbody) return;

  tbody.innerHTML = MS.rooms.map(function(room) {
    var status = getRoomStatus(room);
    var dotCls  = status === 'available' ? 'd-av' : status === 'occupied' ? 'd-oc' : 'd-rs';
    var badgeCls = status === 'available' ? 'b-av' : status === 'occupied' ? 'b-oc' : 'b-rs';
    var statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
    var canBook = status === 'available';
    var price = room.pricePerHour || 50;

    return '<tr>'
      + '<td><span class="r-dot ' + dotCls + '"></span>' + room.name + '</td>'
      + '<td>' + room.capacity + ' people</td>'
      + '<td>Floor ' + room.floor + '</td>'
      + '<td class="price-cell">KES ' + price.toFixed(0) + '/hr</td>'
      + '<td><span class="badge ' + badgeCls + '">' + statusLabel + '</span></td>'
      + '<td>' + getNextBooking(room.id) + '</td>'
      + '<td class="action-cell">'
        + (canBook
          ? '<button class="book-room-btn" onclick="openBookingModal(\'' + room.id + '\')">Book</button>'
          + '<button class="pay-btn" onclick="openPaymentModal(\'' + room.id + '\')"><i class="ti ti-credit-card"></i> Pay</button>'
          : '<button class="book-room-btn" disabled>Unavailable</button>')
      + '</td>'
      + '</tr>';
  }).join('');
}

/* ============================================================
   RENDER: MY BOOKINGS TABLE
   ============================================================ */
function renderMyBookings() {
  var tbody = document.getElementById('my-bookings-tbody');
  if (!tbody) return;

  var mine = MS.bookings.slice();

  if (mine.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="ti ti-calendar-off"></i><p>No bookings yet. Click "Book a room" to get started.</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = mine.map(function(b) {
    var statusCls = b.status === 'upcoming' ? 'bs-up' : b.status === 'cancelled' ? 'bs-cancel' : b.status === 'expired' ? 'bs-exp' : 'bs-done';
    var statusLabel = b.status.charAt(0).toUpperCase() + b.status.slice(1);
    var canEdit   = b.status === 'upcoming';
    var canCancel = b.status === 'upcoming';
    var paymentLabel = b.paymentMethod ? paymentMethodLabel(b.paymentMethod) + ' · ' + ((b.paymentStatus || 'pending').charAt(0).toUpperCase() + (b.paymentStatus || 'pending').slice(1)) : '—';

    return '<tr>'
      + '<td>' + b.title + '</td>'
      + '<td>' + b.organizer + '</td>'
      + '<td>' + b.roomName + '</td>'
      + '<td>' + fmtDate(b.date) + '</td>'
      + '<td>' + b.startTime + ' – ' + b.endTime + '</td>'
      + '<td>' + b.attendees + '</td>'
      + '<td><span class="bk-status ' + statusCls + '">' + statusLabel + '</span><div style="font-size:11px;color:var(--muted);margin-top:4px">' + paymentLabel + '</div></td>'
      + '<td>'
        + (canEdit   ? '<button class="action-btn" onclick="openEditModal(\'' + b.id + '\')">Edit</button>' : '')
        + (canCancel ? '<button class="action-btn cancel-action" onclick="cancelBooking(\'' + b.id + '\')">Cancel</button>' : '')
      + '</td>'
      + '</tr>';
  }).join('');
}

/* ============================================================
   RENDER: RECENT BOOKINGS TABLE
   ============================================================ */
function renderRecentBookings() {
  var tbody = document.getElementById('recent-tbody');
  if (!tbody) return;

  var recent = MS.bookings.slice(0, 8);

  if (recent.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="ti ti-history"></i><p>No recent bookings.</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = recent.map(function(b) {
    var statusCls = b.status === 'upcoming' ? 'bs-up' : b.status === 'cancelled' ? 'bs-cancel' : b.status === 'expired' ? 'bs-exp' : 'bs-done';
    var statusLabel = b.status.charAt(0).toUpperCase() + b.status.slice(1);

    return '<tr>'
      + '<td>' + b.title + '</td>'
      + '<td>' + b.organizer + '</td>'
      + '<td>' + b.roomName + '</td>'
      + '<td>' + fmtDate(b.date) + '</td>'
      + '<td>' + b.startTime + '</td>'
      + '<td>' + b.endTime + '</td>'
      + '<td><span class="bk-status ' + statusCls + '">' + statusLabel + '</span></td>'
      + '</tr>';
  }).join('');
}

/* ============================================================
   RENDER: STATS
   ============================================================ */
function renderStats() {
  var upcoming  = MS.bookings.filter(function(b) { return b.status === 'upcoming'; }).length;
  var completed = MS.bookings.filter(function(b) { return b.status === 'completed'; }).length;
  var cancelled = MS.bookings.filter(function(b) { return b.status === 'cancelled'; }).length;
  var available = MS.rooms.filter(function(r) { return getRoomStatus(r) === 'available'; }).length;

  setInner('stat-available', available);
  setInner('stat-my-bookings', MS.bookings.length);
  setInner('stat-upcoming', upcoming);
  setInner('stat-cancelled', cancelled);
}

function setInner(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ============================================================
   CALENDAR
   ============================================================ */
function renderCalendar() {
  var view = MS.calView;
  setInner('cal-view-label', calViewTitle());

  document.querySelectorAll('.cal-view-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  if (view === 'month')  renderMonthCal();
  else if (view === 'week')  renderWeekCal();
  else if (view === 'day')   renderDayCal();
}

function calViewTitle() {
  var d = MS.calDate;
  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  if (MS.calView === 'month') return months[d.getMonth()] + ' ' + d.getFullYear();
  if (MS.calView === 'week')  {
    var mon = weekStart(d);
    var sun = new Date(mon); sun.setDate(sun.getDate() + 6);
    return fmtDateShort(mon) + ' – ' + fmtDateShort(sun);
  }
  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return days[d.getDay()] + ', ' + fmtDate(d.toISOString().split('T')[0]);
}

function fmtDateShort(d) {
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return d.getDate() + ' ' + months[d.getMonth()];
}

function weekStart(d) {
  var day = d.getDay(); /* 0=Sun */
  var mon = new Date(d);
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return mon;
}

function dateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function getBookingsForDate(ds) {
  return MS.bookings.filter(function(b) {
    return b.date === ds && b.status !== 'cancelled' && b.status !== 'expired';
  });
}

var EV_COLORS = ['ev-blue','ev-green','ev-amber','ev-red'];

function renderMonthCal() {
  var wrap = document.getElementById('cal-body');
  if (!wrap) return;

  var d = MS.calDate;
  var firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  var lastDay  = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  var startDow = firstDay.getDay(); /* 0=Sun */
  var todayISO = todayStr();

  /* Monday-first: shift Sunday from 0 to 7 */
  var startOffset = startDow === 0 ? 6 : startDow - 1;

  var html = '<div class="cal-month-grid">';
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(function(d) {
    html += '<div class="cal-day-header">' + d + '</div>';
  });

  /* Blank cells before month start */
  for (var i = 0; i < startOffset; i++) {
    html += '<div class="cal-day-cell other-month"></div>';
  }

  for (var day = 1; day <= lastDay.getDate(); day++) {
    var cellDate = new Date(d.getFullYear(), d.getMonth(), day);
    var ds = dateStr(cellDate);
    var isToday = ds === todayISO;
    var bks = getBookingsForDate(ds);

    html += '<div class="cal-day-cell' + (isToday ? ' today' : '') + '" onclick="calDayClick(\'' + ds + '\')">';
    html += '<div class="cal-day-num">' + day + '</div>';
    bks.slice(0, 3).forEach(function(b, idx) {
      html += '<div class="cal-event ' + EV_COLORS[idx % EV_COLORS.length] + '" title="' + b.title + '">' + b.startTime + ' ' + b.title + '</div>';
    });
    if (bks.length > 3) html += '<div style="font-size:10px;color:var(--muted)">+' + (bks.length - 3) + ' more</div>';
    html += '</div>';
  }

  /* Fill remaining cells */
  var totalCells = startOffset + lastDay.getDate();
  var remainder  = totalCells % 7;
  if (remainder !== 0) {
    for (var j = 0; j < 7 - remainder; j++) {
      html += '<div class="cal-day-cell other-month"></div>';
    }
  }

  html += '</div>';
  wrap.innerHTML = html;
}

function renderWeekCal() {
  var wrap = document.getElementById('cal-body');
  if (!wrap) return;

  var mon = weekStart(MS.calDate);
  var todayISO = todayStr();
  var hours = [];
  for (var h = 7; h <= 20; h++) hours.push(h);

  var days = [];
  for (var d = 0; d < 7; d++) {
    var dd = new Date(mon); dd.setDate(mon.getDate() + d);
    days.push(dd);
  }

  var dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  var months   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  var html = '<div class="cal-week-grid">';
  html += '<div class="week-day-header" style="background:var(--surface2)"></div>';
  days.forEach(function(d, i) {
    var ds = dateStr(d);
    var isToday = ds === todayISO;
    html += '<div class="week-day-header' + (isToday ? ' today-col' : '') + '">'
      + dayNames[i] + ' ' + d.getDate() + ' ' + months[d.getMonth()]
      + '</div>';
  });

  hours.forEach(function(h) {
    html += '<div class="week-time-col">' + String(h).padStart(2,'0') + ':00</div>';
    days.forEach(function(d) {
      var ds = dateStr(d);
      var bks = getBookingsForDate(ds).filter(function(b) {
        return timeToMins(b.startTime) >= h * 60 && timeToMins(b.startTime) < (h + 1) * 60;
      });
      html += '<div class="week-slot">';
      bks.forEach(function(b, i) {
        html += '<div class="week-event ' + EV_COLORS[i % EV_COLORS.length] + '" title="' + b.title + '">' + b.title + '</div>';
      });
      html += '</div>';
    });
  });

  html += '</div>';
  wrap.innerHTML = html;
}

function renderDayCal() {
  var wrap = document.getElementById('cal-body');
  if (!wrap) return;

  var ds = dateStr(MS.calDate);
  var bks = getBookingsForDate(ds).sort(function(a,b) { return timeToMins(a.startTime) - timeToMins(b.startTime); });
  var hours = [];
  for (var h = 7; h <= 20; h++) hours.push(h);

  var html = '<div class="day-timeline">';

  hours.forEach(function(h) {
    var label = String(h).padStart(2,'0') + ':00';
    var slotBks = bks.filter(function(b) {
      return timeToMins(b.startTime) >= h * 60 && timeToMins(b.startTime) < (h+1)*60;
    });

    if (slotBks.length > 0) {
      slotBks.forEach(function(b, i) {
        var colors = ['sb-blue','sb-green','sb-amber'];
        html += '<div class="day-slot">'
          + '<div class="day-slot-time">' + b.startTime + '</div>'
          + '<div class="day-slot-bar ' + colors[i % colors.length] + '">'
          + '<div class="day-slot-title">' + b.title + '</div>'
          + '<div class="day-slot-meta">' + b.roomName + ' · ' + b.startTime + ' – ' + b.endTime + ' · ' + b.organizer + '</div>'
          + '</div></div>';
      });
    } else {
      html += '<div class="day-slot">'
        + '<div class="day-slot-time">' + label + '</div>'
        + '<div class="day-slot-bar sb-gray"><div class="day-slot-meta" style="font-style:italic">Free</div></div>'
        + '</div>';
    }
  });

  html += '</div>';
  wrap.innerHTML = html;
}

function calDayClick(ds) {
  MS.calDate = new Date(ds + 'T12:00:00');
  MS.calView = 'day';
  renderCalendar();
}

function calNav(dir) {
  var d = MS.calDate;
  if (MS.calView === 'month') {
    MS.calDate = new Date(d.getFullYear(), d.getMonth() + dir, 1);
  } else if (MS.calView === 'week') {
    MS.calDate = new Date(d.getTime() + dir * 7 * 86400000);
  } else {
    MS.calDate = new Date(d.getTime() + dir * 86400000);
  }
  renderCalendar();
}

function calToday() {
  MS.calDate = new Date();
  renderCalendar();
}

/* ============================================================
   TABS — page-level navigation
   ============================================================ */
function switchTab(tab) {
  /* Sync tab buttons */
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  /* Sync sidebar nav items */
  document.querySelectorAll('.sidebar .nav-item[data-tab]').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  /* Show/hide panels */
  document.querySelectorAll('.tab-panel').forEach(function(panel) {
    panel.style.display = panel.id === 'panel-' + tab ? 'block' : 'none';
  });

  /* Trigger calendar render when tab is visible */
  if (tab === 'calendar') renderCalendar();

  /* Close sidebar on mobile after navigation */
  if (window.innerWidth <= 768) closeSidebar();
}

/* ============================================================
   RENDER ALL
   ============================================================ */
function renderAll() {
  renderStats();
  renderRooms();
  renderMyBookings();
  renderRecentBookings();
  if (MS.calView) renderCalendar();
}

/* ============================================================
   POPULATE ROOM SELECT IN MODAL
   ============================================================ */
function populateRoomSelect() {
  var sel = document.getElementById('m-room');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select a room...</option>'
    + MS.rooms.map(function(r) {
        return '<option value="' + r.id + '">' + r.name + ' — Cap: ' + r.capacity + ', Floor ' + r.floor + '</option>';
      }).join('');
}

/* ============================================================
   USER INFO FROM SESSION
   ============================================================ */
function loadUserInfo() {
  var name  = sessionStorage.getItem('ms_name')  || 'Tenant User';
  var init  = sessionStorage.getItem('ms_init')  || 'TU';

  var sbAv   = document.getElementById('sb-av');
  var sbName = document.getElementById('sb-uname');
  var orgFld = document.getElementById('m-organizer');
  var emailFld = document.getElementById('m-email');

  if (sbAv)   sbAv.textContent   = init;
  if (sbName) sbName.textContent = name;
  if (orgFld && !orgFld.value)   orgFld.value = name;
  if (emailFld && !emailFld.value) {
    var email = sessionStorage.getItem('ms_email') || '';
    emailFld.value = email;
  }

  /* Greeting */
  var h = new Date().getHours();
  var greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  setInner('greeting', greet + ', ' + name.split(' ')[0] + '!');

  /* Date */
  var d = new Date();
  var days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  setInner('today-date', days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear());
}

/* ============================================================
   MEETING REMINDERS (check every minute)
   ============================================================ */
function checkReminders() {
  var now = new Date();
  var todayISO = todayStr();
  var currentMins = now.getHours() * 60 + now.getMinutes();

  MS.bookings.forEach(function(b) {
    if (b.date !== todayISO || b.status !== 'upcoming' || b._reminded) return;
    var startMins = timeToMins(b.startTime);
    if (startMins - currentMins === 15) {
      b._reminded = true;
      addNotification('Reminder: "' + b.title + '" starts in 15 minutes at ' + b.startTime + ' in ' + b.roomName, 'reminder');
    }
  });
}

/* ============================================================
   PAYMENT (inside booking modal)
   ============================================================ */
var PAY = {
  method: 'mpesa',
  processing: false
};

function initPaySection(roomId) {
  var room = getRoomById(roomId);
  var paySection = document.getElementById('pay-section');
  if (!room || !paySection) { if (paySection) paySection.style.display = 'none'; return; }

  paySection.style.display = 'block';
  PAY.method = 'mpesa';
  PAY.processing = false;

  var price = room.pricePerHour || 50;
  setInner('pay-room-name', room.name);
  setInner('pay-rate', 'KES ' + price.toFixed(0) + '/hr');

  /* Reset state */
  document.getElementById('pay-success').style.display = 'none';
  document.getElementById('pay-processing').style.display = 'none';
  document.getElementById('pay-form-mpesa').style.display = 'block';
  document.getElementById('pay-form-visa').style.display = 'none';

  /* Reset form fields */
  ['pay-phone', 'pay-card-number', 'pay-card-expiry', 'pay-card-cvv', 'pay-card-name'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.querySelectorAll('#pay-section .field-err-msg').forEach(function(el) { el.classList.remove('show'); });

  /* Reset method tabs */
  document.querySelectorAll('.pay-method-tab').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.method === 'mpesa');
  });

  updatePayTotal();
}

function hidePaySection() {
  var paySection = document.getElementById('pay-section');
  if (paySection) paySection.style.display = 'none';
}

function selectPayMethod(method) {
  PAY.method = method;
  document.querySelectorAll('.pay-method-tab').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.method === method);
  });
  document.getElementById('pay-form-mpesa').style.display = method === 'mpesa' ? 'block' : 'none';
  document.getElementById('pay-form-visa').style.display = method === 'visa' ? 'block' : 'none';
}

function updatePayTotal() {
  var roomId = getVal('m-room');
  var room = roomId ? getRoomById(roomId) : null;
  if (!room) return;

  var price = room.pricePerHour || 50;

  /* Derive duration from start/end times */
  var startTime = getVal('m-start');
  var endTime = getVal('m-end');
  var durationMins = 0;

  if (startTime && endTime) {
    var startMins = timeToMins(startTime);
    var endMins = timeToMins(endTime);
    durationMins = Math.max(0, endMins - startMins);
  }

  var durationLabel = '—';
  if (durationMins > 0) {
    if (durationMins < 60) {
      durationLabel = durationMins + ' min';
    } else {
      var hrs = durationMins / 60;
      durationLabel = (hrs === Math.floor(hrs)) ? hrs + ' hour' : hrs + ' hours';
    }
  }

  var hours = durationMins / 60;
  var total = price * hours;

  setInner('pay-duration-display', durationLabel);
  setInner('pay-total', durationMins > 0 ? 'KES ' + total.toFixed(0) : 'KES 0');
}

function formatCardNumber(input) {
  var v = input.value.replace(/\D/g, '').substring(0, 16);
  var parts = [];
  for (var i = 0; i < v.length; i += 4) {
    parts.push(v.substring(i, i + 4));
  }
  input.value = parts.join(' ');
}

function formatCardExpiry(input) {
  var v = input.value.replace(/\D/g, '').substring(0, 4);
  if (v.length >= 3) {
    input.value = v.substring(0, 2) + '/' + v.substring(2);
  } else {
    input.value = v;
  }
}

function validatePaymentForm() {
  var ok = true;

  if (PAY.method === 'mpesa') {
    var phone = document.getElementById('pay-phone').value.trim();
    var phoneOk = /^\+?[0-9\s\-]{9,15}$/.test(phone);
    ok = validateField('pay-phone', 'err-pay-phone', phoneOk) && ok;
  } else if (PAY.method === 'visa') {
    var cardNum = document.getElementById('pay-card-number').value.replace(/\s/g, '');
    var cardOk = /^[0-9]{13,19}$/.test(cardNum);
    ok = validateField('pay-card-number', 'err-pay-card', cardOk) && ok;

    var expiry = document.getElementById('pay-card-expiry').value;
    var expOk = /^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(expiry);
    ok = validateField('pay-card-expiry', 'err-pay-expiry', expOk) && ok;

    var cvv = document.getElementById('pay-card-cvv').value;
    var cvvOk = /^[0-9]{3,4}$/.test(cvv);
    ok = validateField('pay-card-cvv', 'err-pay-cvv', cvvOk) && ok;
  }

  return ok;
}

async function processPaymentInline() {
  if (PAY.processing) return;
  PAY.processing = true;

  var roomId = getVal('m-room');
  var room = roomId ? getRoomById(roomId) : null;
  var price = room ? room.pricePerHour || 50 : 50;

  var startTime = getVal('m-start');
  var endTime = getVal('m-end');
  var durationMins = Math.max(0, timeToMins(endTime) - timeToMins(startTime));
  var total = (price * durationMins / 60).toFixed(0);

  /* Show processing */
  document.getElementById('pay-form-mpesa').style.display = 'none';
  document.getElementById('pay-form-visa').style.display = 'none';
  document.getElementById('pay-processing').style.display = 'flex';

  /* Hide method tabs */
  var tabs = document.querySelector('.pay-method-tabs');
  if (tabs) tabs.style.display = 'none';

  /* Simulate API call */
  await new Promise(function(resolve) { setTimeout(resolve, 2200); });

  /* Show success */
  document.getElementById('pay-processing').style.display = 'none';
  document.getElementById('pay-success').style.display = 'block';
  document.getElementById('pay-success-msg').textContent =
    'KES ' + total + ' paid for ' + (room ? room.name : 'room') + ' (' + durationMins + ' min) via '
    + (PAY.method === 'mpesa' ? 'M-Pesa' : 'Visa Card') + '.';

  addNotification('Payment of KES ' + total + ' confirmed for ' + (room ? room.name : 'room') + '.', 'confirm');
  showToast('Payment of KES ' + total + ' successful!', 'success');

  /* Disable confirm button */
  var confirmBtn = document.getElementById('btn-confirm-booking');
  if (confirmBtn) confirmBtn.disabled = true;
}

function resetPaySectionUI() {
  var tabs = document.querySelector('.pay-method-tabs');
  if (tabs) tabs.style.display = 'flex';
  var confirmBtn = document.getElementById('btn-confirm-booking');
  if (confirmBtn) confirmBtn.disabled = false;
  PAY.processing = false;
}

/* ============================================================
   SIDEBAR — MOBILE TOGGLE
   ============================================================ */
function toggleSidebar() {
  var sidebar = document.getElementById('sidebar');
  var backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar) return;

  var isOpen = sidebar.classList.contains('mobile-open');
  if (isOpen) {
    closeSidebar();
  } else {
    sidebar.classList.add('mobile-open');
    if (backdrop) backdrop.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeSidebar() {
  var sidebar = document.getElementById('sidebar');
  var backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (backdrop) backdrop.classList.remove('show');
  document.body.style.overflow = '';
}

/* ============================================================
   LOGOUT
   ============================================================ */
function logout() {
  timerStop();
  sessionStorage.removeItem('ms_name');
  sessionStorage.removeItem('ms_init');
  sessionStorage.removeItem('ms_email');
  localStorage.removeItem('ms_token');
  localStorage.removeItem('tenantToken');
  localStorage.removeItem('ms_role');
  window.location.href = 'index.html';
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', async function() {
  var tenant = await ensureTenantAuth();
  if (!tenant) {
    return;
  }

  loadNotifications();
  loadUserInfo();
  await syncDashboardData();
  populateRoomSelect();
  renderAll();
  updateNotifBadge();

  /* Set date picker constraints - only current year, no past dates */
  var dateField = document.getElementById('m-date');
  if (dateField) {
    var today = new Date();
    var todayStr = today.toISOString().split('T')[0];
    var yearEnd = new Date(today.getFullYear(), 11, 31).toISOString().split('T')[0];
    
    dateField.setAttribute('min', todayStr);
    dateField.setAttribute('max', yearEnd);
  }

  /* Calendar view buttons */
  document.querySelectorAll('.cal-view-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      MS.calView = btn.dataset.view;
      renderCalendar();
    });
  });

  /* Tab buttons */
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      switchTab(btn.dataset.tab);
    });
  });

  /* Sidebar nav items */
  document.querySelectorAll('.sidebar .nav-item[data-tab]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      switchTab(btn.dataset.tab);
    });
  });

  /* Close sidebar on Escape key */
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeSidebar();
      closeNotifPanel();
      closeBookingModal();
    }
  });

  /* Close sidebar when resizing to desktop */
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
      closeSidebar();
    }
  });

  /* Close modal on overlay click */
  var overlay = document.getElementById('booking-modal');
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeBookingModal();
    });
  }

  /* Card number formatting */
  var cardNumField = document.getElementById('pay-card-number');
  if (cardNumField) cardNumField.addEventListener('input', function() { formatCardNumber(this); });

  var cardExpiryField = document.getElementById('pay-card-expiry');
  if (cardExpiryField) cardExpiryField.addEventListener('input', function() { formatCardExpiry(this); });

  /* Close notif panel on outside click */
  document.addEventListener('click', function(e) {
    var panel = document.getElementById('notif-panel');
    var wrap  = document.getElementById('notif-bell-wrap');
    if (panel && panel.classList.contains('open')) {
      if (!panel.contains(e.target) && wrap && !wrap.contains(e.target)) {
        closeNotifPanel();
      }
    }
  });

  /* Auto-calculate end time from start + duration */
  var startFld = document.getElementById('m-start');
  var durFld   = document.getElementById('m-dur');
  var endFld   = document.getElementById('m-end');

  function autoEnd() {
    if (!startFld || !durFld || !endFld) return;
    var start = startFld.value;
    var dur   = parseInt(durFld.value);
    if (start && dur) {
      endFld.value = minsToTime(timeToMins(start) + dur);
    }
    updatePayTotal();
  }

  /* Reverse auto-calc: start/end changes → update duration dropdown */
  function autoDuration() {
    if (!startFld || !durFld || !endFld) return;
    var start = startFld.value;
    var end   = endFld.value;
    if (!start || !end) return;

    var diff = timeToMins(end) - timeToMins(start);
    if (diff <= 0) return;

    /* Snap to closest duration option */
    var options = [30, 60, 90, 120, 180, 240, 300, 360, 420, 480];
    var closest = options[0];
    var minDist = Math.abs(diff - closest);
    for (var i = 1; i < options.length; i++) {
      var dist = Math.abs(diff - options[i]);
      if (dist < minDist) { minDist = dist; closest = options[i]; }
    }
    durFld.value = String(closest);

    /* Recalc end time from snapped duration to keep it aligned */
    endFld.value = minsToTime(timeToMins(start) + closest);

    updatePayTotal();
  }

  if (startFld) startFld.addEventListener('change', function() { autoEnd(); autoDuration(); });
  if (durFld)   durFld.addEventListener('change', autoEnd);
  if (endFld)   endFld.addEventListener('change', function() { autoDuration(); updatePayTotal(); });

  /* Price calculation on room/duration/time changes */
  function updatePriceDisplay() {
    var roomId = getVal('m-room');
    var room = roomId ? getRoomById(roomId) : null;
    var pricePerHour = room && room.pricePerHour ? room.pricePerHour : 0;
    
    var startTime = getVal('m-start');
    var endTime = getVal('m-end');
    var durationMins = 0;
    
    if (startTime && endTime) {
      var startMins = timeToMins(startTime);
      var endMins = timeToMins(endTime);
      durationMins = Math.max(0, endMins - startMins);
    } else {
      var dur = parseInt(getVal('m-dur') || 0);
      durationMins = dur || 0;
    }
    
    var hours = durationMins / 60;
    var totalAmount = (pricePerHour * hours).toFixed(2);
    
    /* Update display */
    var pricePerHourEl = document.getElementById('price-per-hour');
    var priceDurationEl = document.getElementById('price-duration');
    var priceTotalEl = document.getElementById('price-total');
    
    if (pricePerHourEl) {
      pricePerHourEl.textContent = room ? 'KES ' + pricePerHour.toFixed(2) + ' / hour' : '—';
    }
    if (priceDurationEl) {
      if (hours > 0) {
        var hourStr = hours === 1 ? '1 hour' : (Math.round(hours * 10) / 10) + ' hours';
        priceDurationEl.textContent = hourStr;
      } else {
        priceDurationEl.textContent = '—';
      }
    }
    if (priceTotalEl) {
      priceTotalEl.textContent = (room && hours > 0) ? 'KES ' + totalAmount : '—';
    }
  }

  var roomSel = document.getElementById('m-room');
  if (roomSel) roomSel.addEventListener('change', function() {
    updatePriceDisplay();
    /* Show/hide pay section when room changes */
    if (roomSel.value) {
      initPaySection(roomSel.value);
    } else {
      hidePaySection();
    }
  });
  if (startFld) startFld.addEventListener('change', updatePriceDisplay);
  if (endFld)   endFld.addEventListener('change', updatePriceDisplay);
  if (durFld)   durFld.addEventListener('change', updatePriceDisplay);

  /* Reminder check */
  setInterval(checkReminders, 60000);

  /* Show dashboard tab by default */
  switchTab('dashboard');
});