/* ============================================================
   admin_dashboard.js — MeetSpace Admin Dashboard
   Full logic: data, rendering, CRUD, charts, search, export
   ============================================================ */

'use strict';

/* ============================================================
   DATA STORE
   ============================================================ */
var ROOMS = [
  { id:'R1', name:'Boardroom A',   capacity:10, floor:2, status:'occupied',  next:'15:00 – DevCo',          occ:85  },
  { id:'R2', name:'Focus Room B',  capacity:4,  floor:1, status:'available', next:'14:00 – Tenant User',    occ:63  },
  { id:'R3', name:'Workshop C',    capacity:20, floor:3, status:'reserved',  next:'10:00 – Startup NG',     occ:71  },
  { id:'R4', name:'Pod D',         capacity:2,  floor:1, status:'available', next:'—',                      occ:29  },
  { id:'R5', name:'Suite E',       capacity:8,  floor:2, status:'available', next:'16:00 – Zuri Labs',      occ:55  }
];

var BOOKINGS = [
  { id:'BK001', title:'Team standup',        tenant:'Startup NG',  room:'Boardroom A',  roomId:'R1', date:'2026-06-19', start:'08:00', end:'09:00', attendees:6,  purpose:'Weekly sync',       status:'completed', paymentMethod:'card',  paymentAmount:6000,  paymentStatus:'paid' },
  { id:'BK002', title:'Client presentation', tenant:'DevCo',       room:'Workshop C',   roomId:'R3', date:'2026-06-19', start:'10:00', end:'11:30', attendees:14, purpose:'Client demo',        status:'upcoming',  paymentMethod:'mpesa', paymentAmount:12000, paymentStatus:'pending' },
  { id:'BK003', title:'Product review',      tenant:'Buildfast',   room:'Focus Room B', roomId:'R2', date:'2026-06-19', start:'14:00', end:'15:00', attendees:3,  purpose:'Sprint review',      status:'upcoming',  paymentMethod:'card',  paymentAmount:4500,  paymentStatus:'paid' },
  { id:'BK004', title:'Investor call',       tenant:'Zuri Labs',   room:'Suite E',      roomId:'R5', date:'2026-06-19', start:'16:00', end:'17:00', attendees:5,  purpose:'Funding round',      status:'upcoming',  paymentMethod:'mpesa', paymentAmount:8000,  paymentStatus:'pending' },
  { id:'BK005', title:'Strategy session',    tenant:'Startup NG',  room:'Boardroom A',  roomId:'R1', date:'2026-06-18', start:'14:00', end:'16:00', attendees:8,  purpose:'Q3 planning',        status:'completed', paymentMethod:'card',  paymentAmount:12000, paymentStatus:'paid' },
  { id:'BK006', title:'Design sprint',       tenant:'DevCo',       room:'Workshop C',   roomId:'R3', date:'2026-06-18', start:'09:00', end:'12:00', attendees:12, purpose:'UX workshop',        status:'completed', paymentMethod:'card',  paymentAmount:18000, paymentStatus:'paid' },
  { id:'BK007', title:'Budget review',       tenant:'Zuri Labs',   room:'Suite E',      roomId:'R5', date:'2026-06-17', start:'10:00', end:'11:00', attendees:4,  purpose:'Finance review',     status:'cancelled', paymentMethod:'mpesa', paymentAmount:7000,  paymentStatus:'refunded' },
  { id:'BK008', title:'Weekly sync',         tenant:'Tenant User', room:'Pod D',        roomId:'R4', date:'2026-06-17', start:'09:00', end:'09:30', attendees:2,  purpose:'1-on-1',             status:'completed', paymentMethod:'card',  paymentAmount:3500,  paymentStatus:'paid' },
  { id:'BK009', title:'Onboarding session',  tenant:'InnovateCo',  room:'Boardroom A',  roomId:'R1', date:'2026-06-16', start:'10:00', end:'12:00', attendees:9,  purpose:'New hire training',  status:'completed', paymentMethod:'mpesa', paymentAmount:13000, paymentStatus:'paid' },
  { id:'BK010', title:'Tech talk',           tenant:'GreenTech',   room:'Workshop C',   roomId:'R3', date:'2026-06-15', start:'15:00', end:'16:30', attendees:18, purpose:'Knowledge sharing',  status:'completed', paymentMethod:'card',  paymentAmount:14000, paymentStatus:'paid' }
];

var TENANTS = [
  { name:'Startup NG',   email:'startup@meetspace.co.ke',    initials:'SN', color:'#1B5FA8', bookings:42, joined:'Jan 2026', status:'active'   },
  { name:'DevCo',        email:'devco@meetspace.co.ke',      initials:'DC', color:'#2E7D32', bookings:38, joined:'Feb 2026', status:'active'   },
  { name:'Buildfast',    email:'buildfast@meetspace.co.ke',  initials:'BF', color:'#6B21A8', bookings:29, joined:'Mar 2026', status:'active'   },
  { name:'Zuri Labs',    email:'zuri@meetspace.co.ke',       initials:'ZL', color:'#B45309', bookings:24, joined:'Jan 2026', status:'active'   },
  { name:'Tenant User',  email:'tenant@meetspace.co.ke',     initials:'TU', color:'#C62828', bookings:18, joined:'Apr 2026', status:'active'   },
  { name:'InnovateCo',   email:'innovate@meetspace.co.ke',   initials:'IC', color:'#0D3F72', bookings:15, joined:'May 2026', status:'active'   },
  { name:'GreenTech',    email:'green@meetspace.co.ke',      initials:'GT', color:'#2E7D32', bookings:12, joined:'May 2026', status:'inactive' }
];

var ACTIVITY = [
  { type:'confirm', icon:'ti-circle-check', cls:'ai-green',  msg:'<strong>Buildfast</strong> confirmed <strong>Product review</strong> in Focus Room B', time:'08:14' },
  { type:'cancel',  icon:'ti-circle-x',     cls:'ai-red',    msg:'<strong>Zuri Labs</strong> cancelled <strong>Budget review</strong>',                   time:'08:02' },
  { type:'login',   icon:'ti-user-check',   cls:'ai-blue',   msg:'<strong>DevCo</strong> logged in',                                                      time:'07:58' },
  { type:'confirm', icon:'ti-circle-check', cls:'ai-green',  msg:'<strong>Startup NG</strong> confirmed <strong>Team standup</strong> in Boardroom A',    time:'07:45' },
  { type:'new',     icon:'ti-user-plus',    cls:'ai-purple', msg:'New tenant <strong>InnovateCo</strong> registered',                                      time:'Yesterday' },
  { type:'edit',    icon:'ti-edit',         cls:'ai-amber',  msg:'<strong>DevCo</strong> rescheduled <strong>Design sprint</strong> to 09:00',             time:'Yesterday' }
];

var NOTIFICATIONS = [
  { type:'confirm', icon:'ti-circle-check', cls:'ai-green',  msg:'Buildfast confirmed Product review — Focus Room B, today 14:00.',          time:'Just now',  unread:true  },
  { type:'cancel',  icon:'ti-circle-x',     cls:'ai-red',    msg:'Zuri Labs cancelled Budget review. Room Suite E is now available.',         time:'8 min ago', unread:true  },
  { type:'new',     icon:'ti-user-plus',    cls:'ai-purple', msg:'New tenant InnovateCo registered. Awaiting approval.',                      time:'1 hr ago',  unread:true  },
  { type:'remind',  icon:'ti-clock',        cls:'ai-amber',  msg:'Reminder: Client presentation in Workshop C starts in 30 minutes.',         time:'2 hrs ago', unread:true  },
  { type:'confirm', icon:'ti-circle-check', cls:'ai-green',  msg:'Startup NG confirmed Team standup — Boardroom A, 08:00.',                   time:'3 hrs ago', unread:true  },
  { type:'info',    icon:'ti-info-circle',  cls:'ai-blue',   msg:'Weekly report generated. 8 bookings today across 4 rooms.',                 time:'Yesterday', unread:false },
  { type:'remind',  icon:'ti-clock',        cls:'ai-amber',  msg:'Boardroom A maintenance scheduled Sunday 22 June, 08:00–10:00.',            time:'Yesterday', unread:false }
];

var TREND_DATA = [4, 6, 3, 8, 5, 7, 9, 6, 4, 8, 11, 7, 5, 9, 12, 8, 6, 10, 8, 7];

/* State */
var STATE = {
  searchQuery:    '',
  bookingFilter:  'all',
  editingBooking: null,
  editingRoom:    null,
  calDate:        new Date(2026, 5, 1)   /* June 2026 */
};

/* ============================================================
   UTILITIES
   ============================================================ */
function el(id) { return document.getElementById(id); }

function qs(selector, ctx) { return (ctx || document).querySelector(selector); }

function qsa(selector, ctx) { return Array.from((ctx || document).querySelectorAll(selector)); }

function genId(prefix) {
  return (prefix || 'ID') + Date.now().toString(36).toUpperCase();
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  var parts = dateStr.split('-');
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return parseInt(parts[2]) + ' ' + months[parseInt(parts[1]) - 1] + ' ' + parts[0];
}

function timeToMins(t) {
  if (!t) return 0;
  var p = t.split(':');
  return parseInt(p[0]) * 60 + parseInt(p[1]);
}

function hasConflict(roomId, date, startTime, endTime, excludeId) {
  return BOOKINGS.some(function(b) {
    if (b.id === excludeId)  return false;
    if (b.roomId !== roomId) return false;
    if (b.date   !== date)   return false;
    if (b.status === 'cancelled') return false;
    var bS = timeToMins(b.start);
    var bE = timeToMins(b.end);
    var nS = timeToMins(startTime);
    var nE = timeToMins(endTime);
    return !(nE <= bS || nS >= bE);
  });
}

/* ============================================================
   BADGES & HELPERS
   ============================================================ */
function statusBadge(s) {
  var map = {
    upcoming:  'badge-blue',
    completed: 'badge-green',
    cancelled: 'badge-red',
    active:    'badge-green',
    inactive:  'badge-gray'
  };
  return '<span class="badge ' + (map[s] || 'badge-gray') + '">'
    + s.charAt(0).toUpperCase() + s.slice(1) + '</span>';
}

function roomBadge(s) {
  var map = { available:'badge-green', occupied:'badge-red', reserved:'badge-amber' };
  return '<span class="badge ' + (map[s] || 'badge-gray') + '">'
    + s.charAt(0).toUpperCase() + s.slice(1) + '</span>';
}

function dotClass(s) {
  return s === 'available' ? 'dot-av' : s === 'occupied' ? 'dot-oc' : 'dot-rs';
}

function tenantAvatar(tn) {
  return '<div class="tenant-av" style="background:' + tn.color + '">' + tn.initials + '</div>';
}

function getTenant(name) {
  return TENANTS.find(function(x) { return x.name === name; })
    || { initials: name.slice(0,2).toUpperCase(), color: '#52525B', name: name };
}

/* ============================================================
   TOAST
   ============================================================ */
function showToast(msg, type) {
  var t   = el('toast');
  var ic  = el('toast-icon');
  var tm  = el('toast-msg');
  if (!t) return;
  type = type || 'success';
  tm.textContent = msg;
  ic.className = 'ti ' + (
    type === 'error'   ? 'ti-circle-x' :
    type === 'warn'    ? 'ti-alert-triangle' :
    type === 'info'    ? 'ti-info-circle' :
                         'ti-circle-check'
  );
  t.style.background = (
    type === 'error' ? '#C62828' :
    type === 'warn'  ? '#B45309' :
    type === 'info'  ? '#1B5FA8' : '#18181A'
  );
  t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(function() { t.classList.remove('show'); }, 3400);
}

function ensureAdminSession() {
  var token = localStorage.getItem('ms_token');
  var role = localStorage.getItem('ms_role');
  if (!token || role !== 'admin') {
    window.location.href = 'adminlogin.html';
    return false;
  }
  return true;
}

function adminLogout() {
  localStorage.removeItem('ms_token');
  localStorage.removeItem('ms_role');
  localStorage.removeItem('ms_name');
  localStorage.removeItem('ms_email');
  showToast('Signed out successfully.', 'green');
  setTimeout(function() {
    window.location.href = 'adminlogin.html';
  }, 500);
}

/* ============================================================
   TAB / PANEL SWITCHING
   ============================================================ */
var PANELS = ['overview', 'bookings', 'rooms', 'tenants', 'payments', 'reports', 'notifications'];

var PANEL_TITLES = {
  overview:      'Dashboard Overview',
  bookings:      'All Bookings',
  rooms:         'Room Management',
  tenants:       'Tenant Management',
  payments:      'Payment Tracking',
  reports:       'Reports & Analytics',
  notifications: 'Notifications'
};

function switchTab(tab) {
  PANELS.forEach(function(p) {
    var pan = el('panel-' + p);
    if (pan) pan.style.display = (p === tab) ? 'block' : 'none';
  });

  qsa('.page-tab').forEach(function(b) {
    b.classList.toggle('active', b.dataset.tab === tab);
  });

  qsa('.sb-item').forEach(function(b) {
    var fn = b.getAttribute('onclick') || '';
    b.classList.toggle('active', fn.includes("'" + tab + "'"));
  });

  var titleEl = el('page-title');
  if (titleEl) titleEl.textContent = PANEL_TITLES[tab] || tab;

  renderPanel(tab);
}

function renderPanel(tab) {
  if (tab === 'overview') {
    renderRoomStatus();
    renderRecentTable();
    renderActivity();
    renderOccupancy();
    renderBarChart();
    renderCalendar();
  }
  if (tab === 'bookings')      renderAllBookings();
  if (tab === 'rooms')         renderRooms();
  if (tab === 'tenants')       renderTenants();
  if (tab === 'payments')      renderPayments();
  if (tab === 'reports')       renderReports();
  if (tab === 'notifications') renderNotifications();
}

/* ============================================================
   RENDER: ROOM STATUS (overview)
   ============================================================ */
function renderRoomStatus() {
  var c = el('room-status-list');
  if (!c) return;
  c.innerHTML = ROOMS.map(function(r) {
    return '<div class="room-item">'
      + '<div class="room-status-dot ' + dotClass(r.status) + '"></div>'
      + '<div style="flex:1">'
      +   '<div class="room-name">' + r.name + '</div>'
      +   '<div class="room-meta">Floor ' + r.floor + ' · Next: ' + r.next + '</div>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px">'
      +   '<div class="room-cap"><i class="ti ti-users"></i>' + r.capacity + '</div>'
      +   roomBadge(r.status)
      + '</div>'
      + '</div>';
  }).join('');
}

/* ============================================================
   RENDER: RECENT BOOKINGS TABLE (overview)
   ============================================================ */
function renderRecentTable() {
  var t = el('recent-table');
  if (!t) return;
  t.innerHTML = '<thead><tr>'
    + '<th>Meeting</th><th>Tenant</th><th>Room</th><th>Time</th><th>Status</th>'
    + '</tr></thead><tbody>'
    + BOOKINGS.slice(0, 5).map(function(b) {
        var tn = getTenant(b.tenant);
        return '<tr>'
          + '<td><div style="font-weight:500">' + b.title + '</div>'
          +     '<div style="font-size:11px;color:var(--text-3)">' + fmtDate(b.date) + '</div></td>'
          + '<td><div class="td-cell">' + tenantAvatar(tn) + b.tenant + '</div></td>'
          + '<td>' + b.room + '</td>'
          + '<td><div style="font-size:12px">' + b.start + ' – ' + b.end + '</div></td>'
          + '<td>' + statusBadge(b.status) + '</td>'
          + '</tr>';
      }).join('')
    + '</tbody>';
}

/* ============================================================
   RENDER: ALL BOOKINGS TABLE (bookings tab)
   ============================================================ */
function renderAllBookings() {
  var t = el('all-bookings-table');
  if (!t) return;

  var query  = STATE.searchQuery.toLowerCase();
  var filter = STATE.bookingFilter;

  var rows = BOOKINGS.filter(function(b) {
    var matchSearch = !query
      || b.title.toLowerCase().includes(query)
      || b.tenant.toLowerCase().includes(query)
      || b.room.toLowerCase().includes(query);
    var matchFilter = filter === 'all' || b.status === filter;
    return matchSearch && matchFilter;
  });

  var countEl = el('bk-count');
  if (countEl) countEl.textContent = rows.length + ' booking' + (rows.length !== 1 ? 's' : '');

  if (rows.length === 0) {
    t.innerHTML = '<thead><tr><th colspan="9">No bookings match your search.</th></tr></thead>';
    return;
  }

  t.innerHTML = '<thead><tr>'
    + '<th>ID</th><th>Meeting</th><th>Tenant</th><th>Room</th>'
    + '<th>Date</th><th>Time</th><th>Attendees</th><th>Status</th><th>Actions</th>'
    + '</tr></thead><tbody>'
    + rows.map(function(b) {
        var tn = getTenant(b.tenant);
        var canCancel = b.status === 'upcoming';
        return '<tr>'
          + '<td style="color:var(--text-3);font-size:11px">' + b.id + '</td>'
          + '<td><div style="font-weight:500">' + b.title + '</div>'
          +     '<div style="font-size:11px;color:var(--text-3)">' + (b.purpose || '') + '</div></td>'
          + '<td><div class="td-cell">' + tenantAvatar(tn) + b.tenant + '</div></td>'
          + '<td>' + b.room + '</td>'
          + '<td>' + fmtDate(b.date) + '</td>'
          + '<td>' + b.start + ' – ' + b.end + '</td>'
          + '<td style="text-align:center">' + b.attendees + '</td>'
          + '<td>' + statusBadge(b.status) + '</td>'
          + '<td style="white-space:nowrap">'
          +   '<button class="action-btn" onclick="openEditBookingModal(\'' + b.id + '\')">'
          +     '<i class="ti ti-edit" style="font-size:12px;vertical-align:-1px;margin-right:2px"></i>Edit'
          +   '</button>'
          +   (canCancel
              ? '<button class="action-btn danger" onclick="cancelBooking(\'' + b.id + '\')">'
              +   '<i class="ti ti-x" style="font-size:12px;vertical-align:-1px;margin-right:2px"></i>Cancel'
              + '</button>'
              : '')
          + '</td>'
          + '</tr>';
      }).join('')
    + '</tbody>';
}

function paymentLabel(method) {
  return method === 'mpesa' ? 'M-Pesa' : 'Card';
}

function paymentStatusBadge(status) {
  var map = {
    paid: 'badge-green',
    pending: 'badge-amber',
    refunded: 'badge-red'
  };
  return '<span class="badge ' + (map[status] || 'badge-gray') + '">' + status.charAt(0).toUpperCase() + status.slice(1) + '</span>';
}

function formatCurrency(amount) {
  return 'KES ' + Number(amount || 0).toLocaleString('en-KE');
}

function setText(id, value) {
  var node = el(id);
  if (node) node.textContent = value;
}

function renderPayments() {
  var table = el('payments-table');
  var revenueList = el('room-revenue-list');
  if (!table || !revenueList) return;

  var paidBookings = BOOKINGS.filter(function(b) { return b.paymentAmount > 0; });
  var paidTotal = paidBookings.filter(function(b) { return b.paymentStatus === 'paid'; }).reduce(function(sum, b) { return sum + b.paymentAmount; }, 0);
  var pendingCount = paidBookings.filter(function(b) { return b.paymentStatus === 'pending'; }).length;
  var cardTotal = paidBookings.filter(function(b) { return b.paymentStatus === 'paid' && b.paymentMethod === 'card'; }).reduce(function(sum, b) { return sum + b.paymentAmount; }, 0);
  var mpesaTotal = paidBookings.filter(function(b) { return b.paymentStatus === 'paid' && b.paymentMethod === 'mpesa'; }).reduce(function(sum, b) { return sum + b.paymentAmount; }, 0);

  setText('paid-total', formatCurrency(paidTotal));
  setText('paid-pending', pendingCount);
  setText('paid-card', formatCurrency(cardTotal));
  setText('paid-mpesa', formatCurrency(mpesaTotal));

  table.innerHTML = '<thead><tr>'
    + '<th>Booking</th><th>Tenant</th><th>Room</th><th>Amount</th><th>Method</th><th>Status</th>'
    + '</tr></thead><tbody>'
    + BOOKINGS.map(function(b) {
        return '<tr>'
          + '<td><div style="font-weight:500">' + b.title + '</div><div style="font-size:11px;color:var(--text-3)">' + fmtDate(b.date) + '</div></td>'
          + '<td>' + b.tenant + '</td>'
          + '<td>' + b.room + '</td>'
          + '<td style="font-weight:600">' + formatCurrency(b.paymentAmount) + '</td>'
          + '<td>' + paymentLabel(b.paymentMethod) + '</td>'
          + '<td>' + paymentStatusBadge(b.paymentStatus || 'pending') + '</td>'
          + '</tr>';
      }).join('')
    + '</tbody>';

  revenueList.innerHTML = ROOMS.map(function(room) {
    var total = BOOKINGS.filter(function(b) {
      return b.roomId === room.id && b.paymentStatus === 'paid';
    }).reduce(function(sum, b) {
      return sum + b.paymentAmount;
    }, 0);

    return '<div class="room-item">'
      + '<div class="room-status-dot ' + dotClass(room.status) + '"></div>'
      + '<div style="flex:1">'
      +   '<div class="room-name">' + room.name + '</div>'
      +   '<div class="room-meta">Floor ' + room.floor + ' · ' + room.capacity + ' seats</div>'
      + '</div>'
      + '<div style="font-weight:600;color:var(--gold)">' + formatCurrency(total) + '</div>'
      + '</div>';
  }).join('');
}

/* ============================================================
   BOOKING CRUD
   ============================================================ */
function openNewBooking() {
  STATE.editingBooking = null;
  var modal = el('booking-modal');
  if (!modal) return;

  /* Reset form */
  var form = el('booking-form');
  if (form) form.reset();

  var titleEl = el('bm-title');
  if (titleEl) titleEl.textContent = 'New booking';

  /* Populate dropdowns */
  populateRoomDropdown();
  populateTenantDropdown();

  /* Default date = today */
  var dateField = el('bm-date');
  if (dateField) dateField.value = new Date().toISOString().split('T')[0];

  modal.classList.add('open');
}

function openEditBookingModal(id) {
  var b = BOOKINGS.find(function(x) { return x.id === id; });
  if (!b) return;
  STATE.editingBooking = id;

  var modal = el('booking-modal');
  if (!modal) return;

  populateRoomDropdown();
  populateTenantDropdown();

  setFieldVal('bm-meeting-title', b.title);
  setFieldVal('bm-tenant',    b.tenant);
  setFieldVal('bm-room',      b.roomId);
  setFieldVal('bm-date',      b.date);
  setFieldVal('bm-start',     b.start);
  setFieldVal('bm-end',       b.end);
  setFieldVal('bm-attendees', b.attendees);
  setFieldVal('bm-purpose',   b.purpose || '');

  var titleEl = el('bm-title');
  if (titleEl) titleEl.textContent = 'Edit booking';

  modal.classList.add('open');
}

function closeBookingModal() {
  var modal = el('booking-modal');
  if (modal) modal.classList.remove('open');
  STATE.editingBooking = null;
}

function submitBookingForm() {
  var title     = getFieldVal('bm-meeting-title');
  var tenant    = getFieldVal('bm-tenant');
  var roomId    = getFieldVal('bm-room');
  var date      = getFieldVal('bm-date');
  var start     = getFieldVal('bm-start');
  var end       = getFieldVal('bm-end');
  var attendees = getFieldVal('bm-attendees');
  var purpose   = getFieldVal('bm-purpose');

  /* Validation */
  if (!title)    { showToast('Please enter a meeting title.', 'error'); return; }
  if (!tenant)   { showToast('Please select a tenant.', 'error'); return; }
  if (!roomId)   { showToast('Please select a room.', 'error'); return; }
  if (!date)     { showToast('Please select a date.', 'error'); return; }
  if (!start || !end) { showToast('Please enter start and end times.', 'error'); return; }
  if (timeToMins(end) <= timeToMins(start)) {
    showToast('End time must be after start time.', 'error'); return;
  }

  var room = ROOMS.find(function(r) { return r.id === roomId; });

  /* Conflict check */
  if (hasConflict(roomId, date, start, end, STATE.editingBooking)) {
    showToast('Conflict: this room is already booked during that time.', 'error'); return;
  }

  if (STATE.editingBooking) {
    /* Update existing */
    var idx = BOOKINGS.findIndex(function(b) { return b.id === STATE.editingBooking; });
    if (idx !== -1) {
      BOOKINGS[idx].title     = title;
      BOOKINGS[idx].tenant    = tenant;
      BOOKINGS[idx].roomId    = roomId;
      BOOKINGS[idx].room      = room ? room.name : roomId;
      BOOKINGS[idx].date      = date;
      BOOKINGS[idx].start     = start;
      BOOKINGS[idx].end       = end;
      BOOKINGS[idx].attendees = parseInt(attendees) || 1;
      BOOKINGS[idx].purpose   = purpose;
    }
    addActivity('edit', 'ti-edit', 'ai-amber',
      'Admin updated booking <strong>' + title + '</strong>');
    showToast('Booking updated successfully.');
  } else {
    /* Create new */
    var newBk = {
      id:         'BK' + genId(),
      title:      title,
      tenant:     tenant,
      room:       room ? room.name : roomId,
      roomId:     roomId,
      date:       date,
      start:      start,
      end:        end,
      attendees:  parseInt(attendees) || 1,
      purpose:    purpose,
      status:     'upcoming'
    };
    BOOKINGS.unshift(newBk);
    addActivity('confirm', 'ti-circle-check', 'ai-green',
      'Admin created booking <strong>' + title + '</strong> in ' + (room ? room.name : roomId));
    showToast('Booking created successfully.');
  }

  closeBookingModal();
  renderPanel('bookings');
  renderPanel('overview');
}

function cancelBooking(id) {
  var b = BOOKINGS.find(function(x) { return x.id === id; });
  if (!b) return;
  if (!confirm('Cancel "' + b.title + '"? This cannot be undone.')) return;
  b.status = 'cancelled';
  addActivity('cancel', 'ti-circle-x', 'ai-red',
    'Admin cancelled <strong>' + b.title + '</strong> (' + b.tenant + ')');
  addNotification('cancel', 'ti-circle-x', 'ai-red',
    'Booking "' + b.title + '" was cancelled by admin.', 'Just now');
  showToast('Booking cancelled.', 'warn');
  renderAllBookings();
  renderRecentTable();
}

function editBooking(id) { openEditBookingModal(id); }

/* ============================================================
   ROOM MANAGEMENT
   ============================================================ */
function renderRooms() {
  var g = el('rooms-grid');
  if (!g) return;
  g.innerHTML = ROOMS.map(function(r) {
    var fillColor = r.occ >= 80 ? 'var(--red)' : r.occ >= 50 ? 'var(--amber)' : 'var(--green)';
    return '<div class="card">'
      + '<div class="card-hdr">'
      +   '<div>'
      +     '<div class="card-title">' + r.name + '</div>'
      +     '<div class="card-subtitle">Floor ' + r.floor + ' · Capacity ' + r.capacity + '</div>'
      +   '</div>'
      +   roomBadge(r.status)
      + '</div>'
      + '<div class="card-body">'
      +   '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
      +     '<span style="font-size:12px;color:var(--text-2)">Occupancy this month</span>'
      +     '<span style="font-size:13px;font-weight:600;color:var(--text)">' + r.occ + '%</span>'
      +   '</div>'
      +   '<div class="occ-track" style="margin-bottom:14px">'
      +     '<div class="occ-fill" style="width:' + r.occ + '%;background:' + fillColor + '"></div>'
      +   '</div>'
      +   '<div style="font-size:12px;color:var(--text-3);margin-bottom:16px">Next booking: ' + r.next + '</div>'
      +   '<div style="display:flex;gap:8px">'
      +     '<button class="action-btn" onclick="openEditRoomModal(\'' + r.id + '\')">'
      +       '<i class="ti ti-edit" style="font-size:12px;vertical-align:-1px;margin-right:3px"></i>Edit'
      +     '</button>'
      +     '<button class="action-btn danger" onclick="deleteRoom(\'' + r.id + '\')">'
      +       '<i class="ti ti-trash" style="font-size:12px;vertical-align:-1px;margin-right:3px"></i>Delete'
      +     '</button>'
      +   '</div>'
      + '</div>'
      + '</div>';
  }).join('');
}

function addRoom() {
  var modal = el('room-modal');
  if (modal) {
    STATE.editingRoom = null;
    var titleEl = el('rm-modal-title');
    if (titleEl) titleEl.textContent = 'Add room';
    var form = el('room-form');
    if (form) form.reset();
    modal.classList.add('open');
  } else {
    /* Fallback: prompt */
    var name  = prompt('New room name:');  if (!name || !name.trim()) return;
    var cap   = parseInt(prompt('Capacity (people):') || '0'); if (!cap) return;
    var floor = parseInt(prompt('Floor number:') || '1');
    ROOMS.push({
      id: 'R' + genId(),
      name: name.trim(), capacity: cap, floor: floor,
      status: 'available', next: '—', occ: 0
    });
    renderRooms();
    renderRoomStatus();
    addActivity('new', 'ti-door-enter', 'ai-blue',
      'Admin added new room: <strong>' + name.trim() + '</strong>');
    showToast('Room "' + name.trim() + '" added.');
  }
}

function openEditRoomModal(id) {
  var r = ROOMS.find(function(x) { return x.id === id; });
  if (!r) return;
  STATE.editingRoom = id;

  var modal = el('room-modal');
  if (modal) {
    var titleEl = el('rm-modal-title');
    if (titleEl) titleEl.textContent = 'Edit room';
    setFieldVal('rm-name',     r.name);
    setFieldVal('rm-capacity', r.capacity);
    setFieldVal('rm-floor',    r.floor);
    setFieldVal('rm-status',   r.status);
    modal.classList.add('open');
  } else {
    var newName = prompt('Edit room name:', r.name);
    if (!newName || !newName.trim()) return;
    r.name = newName.trim();
    renderRooms();
    renderRoomStatus();
    showToast('Room updated.');
  }
}

function closeRoomModal() {
  var modal = el('room-modal');
  if (modal) modal.classList.remove('open');
  STATE.editingRoom = null;
}

function submitRoomForm() {
  var name     = getFieldVal('rm-name');
  var capacity = parseInt(getFieldVal('rm-capacity'));
  var floor    = parseInt(getFieldVal('rm-floor'));
  var status   = getFieldVal('rm-status') || 'available';

  if (!name)     { showToast('Please enter a room name.', 'error'); return; }
  if (!capacity) { showToast('Please enter a valid capacity.', 'error'); return; }
  if (!floor)    { showToast('Please enter a floor number.', 'error'); return; }

  if (STATE.editingRoom) {
    var r = ROOMS.find(function(x) { return x.id === STATE.editingRoom; });
    if (r) {
      r.name = name; r.capacity = capacity; r.floor = floor; r.status = status;
    }
    showToast('Room updated successfully.');
    addActivity('edit', 'ti-edit', 'ai-amber', 'Admin updated room: <strong>' + name + '</strong>');
  } else {
    ROOMS.push({
      id: 'R' + genId(), name: name, capacity: capacity,
      floor: floor, status: status, next: '—', occ: 0
    });
    showToast('Room "' + name + '" added.');
    addActivity('new', 'ti-door-enter', 'ai-blue', 'Admin added room: <strong>' + name + '</strong>');
  }

  closeRoomModal();
  renderRooms();
  renderRoomStatus();
}

function deleteRoom(id) {
  var r = ROOMS.find(function(x) { return x.id === id; });
  if (!r) return;
  if (!confirm('Delete "' + r.name + '"? This cannot be undone.')) return;
  ROOMS.splice(ROOMS.indexOf(r), 1);
  addActivity('cancel', 'ti-trash', 'ai-red', 'Admin deleted room: <strong>' + r.name + '</strong>');
  showToast('Room "' + r.name + '" deleted.', 'warn');
  renderRooms();
  renderRoomStatus();
}

function populateRoomDropdown() {
  var sel = el('bm-room');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select a room…</option>'
    + ROOMS.map(function(r) {
        return '<option value="' + r.id + '">' + r.name
          + ' — Cap: ' + r.capacity + ', Floor ' + r.floor + '</option>';
      }).join('');
}

function populateTenantDropdown() {
  var sel = el('bm-tenant');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select a tenant…</option>'
    + TENANTS.map(function(tn) {
        return '<option value="' + tn.name + '">' + tn.name + '</option>';
      }).join('');
}

/* ============================================================
   TENANT MANAGEMENT
   ============================================================ */
function renderTenants() {
  var t = el('tenants-table');
  if (!t) return;

  var query = STATE.searchQuery.toLowerCase();
  var rows  = TENANTS.filter(function(tn) {
    return !query
      || tn.name.toLowerCase().includes(query)
      || tn.email.toLowerCase().includes(query);
  });

  t.innerHTML = '<thead><tr>'
    + '<th>Tenant</th><th>Email</th><th>Bookings</th><th>Joined</th><th>Status</th><th>Actions</th>'
    + '</tr></thead><tbody>'
    + rows.map(function(tn) {
        return '<tr>'
          + '<td><div class="td-cell">' + tenantAvatar(tn)
          +   '<span style="font-weight:500">' + tn.name + '</span></div></td>'
          + '<td style="color:var(--text-3)">' + tn.email + '</td>'
          + '<td style="font-weight:600;text-align:center">' + tn.bookings + '</td>'
          + '<td style="color:var(--text-3)">' + tn.joined + '</td>'
          + '<td>' + statusBadge(tn.status) + '</td>'
          + '<td style="white-space:nowrap">'
          +   '<button class="action-btn" onclick="viewTenant(\'' + tn.name + '\')">'
          +     '<i class="ti ti-eye" style="font-size:12px;vertical-align:-1px;margin-right:2px"></i>View'
          +   '</button>'
          +   '<button class="action-btn" onclick="toggleTenantStatus(\'' + tn.name + '\')">'
          +     (tn.status === 'active' ? 'Deactivate' : 'Activate')
          +   '</button>'
          + '</td>'
          + '</tr>';
      }).join('')
    + '</tbody>';
}

function viewTenant(name) {
  var tn = TENANTS.find(function(x) { return x.name === name; });
  if (!tn) return;
  var bks = BOOKINGS.filter(function(b) { return b.tenant === name; });
  showToast(tn.name + ' — ' + bks.length + ' bookings · ' + tn.email, 'info');
}

function toggleTenantStatus(name) {
  var tn = TENANTS.find(function(x) { return x.name === name; });
  if (!tn) return;
  tn.status = tn.status === 'active' ? 'inactive' : 'active';
  showToast(tn.name + ' ' + (tn.status === 'active' ? 'activated' : 'deactivated') + '.', 'warn');
  renderTenants();
}

/* ============================================================
   ACTIVITY FEED
   ============================================================ */
function addActivity(type, icon, cls, msg) {
  var now  = new Date();
  var time = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  ACTIVITY.unshift({ type:type, icon:icon, cls:cls, msg:msg, time:time });
  if (ACTIVITY.length > 20) ACTIVITY.pop();
  renderActivity();
}

function renderActivity() {
  var f = el('activity-feed');
  if (!f) return;
  if (ACTIVITY.length === 0) {
    f.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-3);font-size:13px">No recent activity.</div>';
    return;
  }
  f.innerHTML = ACTIVITY.slice(0, 8).map(function(a) {
    return '<div class="act-item">'
      + '<div class="act-icon ' + a.cls + '"><i class="ti ' + a.icon + '"></i></div>'
      + '<div>'
      +   '<div class="act-text">' + a.msg + '</div>'
      +   '<div class="act-time">' + a.time + '</div>'
      + '</div>'
      + '</div>';
  }).join('');
}

function clearActivity() {
  ACTIVITY.length = 0;
  renderActivity();
}

/* ============================================================
   NOTIFICATIONS
   ============================================================ */
function addNotification(type, icon, cls, msg, time) {
  NOTIFICATIONS.unshift({ type:type, icon:icon, cls:cls, msg:msg, time:time || 'Just now', unread:true });
  updateNotifCount();
}

function renderNotifications() {
  var l = el('notif-list');
  if (!l) return;
  l.innerHTML = NOTIFICATIONS.map(function(n) {
    return '<div class="notif-card' + (n.unread ? ' unread' : '') + '">'
      + '<div class="notif-icon ' + n.cls + '"><i class="ti ' + n.icon + '"></i></div>'
      + '<div style="flex:1">'
      +   '<div class="notif-msg">' + n.msg + '</div>'
      +   '<div class="notif-time">' + n.time + '</div>'
      + '</div>'
      + (n.unread ? '<div class="unread-dot"></div>' : '')
      + '</div>';
  }).join('');
  updateNotifCount();
}

function markAllRead() {
  NOTIFICATIONS.forEach(function(n) { n.unread = false; });
  renderNotifications();
  showToast('All notifications marked as read.');
}

function updateNotifCount() {
  var count = NOTIFICATIONS.filter(function(n) { return n.unread; }).length;

  var lbl = el('notif-count-label');
  if (lbl) lbl.textContent = count + ' unread';

  var sbBadge = el('notif-sb-count');
  if (sbBadge) {
    sbBadge.textContent = count;
    sbBadge.style.display = count > 0 ? 'inline-block' : 'none';
  }

  var dot = el('notif-topbar-dot');
  if (dot) dot.style.display = count > 0 ? 'block' : 'none';
}

/* ============================================================
   OCCUPANCY BARS
   ============================================================ */
function renderOccupancy() {
  var c = el('occ-list');
  if (!c) return;
  c.innerHTML = ROOMS.map(function(r) {
    var fillColor = r.occ >= 80 ? 'var(--red)' : r.occ >= 50 ? 'var(--amber)' : 'var(--green)';
    return '<div class="occ-row">'
      + '<div class="occ-top">'
      +   '<div class="occ-name">' + r.name + '</div>'
      +   '<div class="occ-pct">' + r.occ + '%</div>'
      + '</div>'
      + '<div class="occ-track">'
      +   '<div class="occ-fill" style="width:' + r.occ + '%;background:' + fillColor + '"></div>'
      + '</div>'
      + '<div class="occ-sub">Capacity: ' + r.capacity + ' · Floor ' + r.floor + '</div>'
      + '</div>';
  }).join('');
}

/* ============================================================
   BAR CHART (CSS-only)
   ============================================================ */
function renderBarChart() {
  var c = el('trend-chart');
  if (!c) return;
  var maxV   = Math.max.apply(null, TREND_DATA);
  var labels = ['1','','','4','','','7','','','10','','','13','','','16','','','19',''];
  c.innerHTML = TREND_DATA.map(function(v, i) {
    var h   = Math.round((v / maxV) * 100);
    var can = Math.round(v * 0.1);
    var canH = Math.round((can / maxV) * 100);
    return '<div class="bar-group">'
      + '<div class="bar-wrap">'
      +   '<div class="bar bar-blue" style="height:' + h + '%" title="' + v + ' bookings"></div>'
      +   '<div class="bar" style="height:' + canH + '%;background:var(--red-lt);border:1px solid var(--red)" title="' + can + ' cancelled"></div>'
      + '</div>'
      + '<div class="bar-label">' + (labels[i] || '') + '</div>'
      + '</div>';
  }).join('');
}

/* ============================================================
   MINI CALENDAR
   ============================================================ */
function renderCalendar() {
  var g = el('cal-grid');
  if (!g) return;

  var bookedDays = [3,4,8,9,10,12,15,17,18,19,23,25,29,30];
  var todayDay   = 19;
  var dayLabels  = ['Mo','Tu','We','Th','Fr','Sa','Su'];

  var html = dayLabels.map(function(d) {
    return '<div class="cal-day-label">' + d + '</div>';
  }).join('');

  /* June 2026 starts on Monday — no offset needed */
  for (var day = 1; day <= 30; day++) {
    var cls = 'cal-cell';
    if (day === todayDay)          cls += ' today';
    else if (bookedDays.indexOf(day) !== -1) cls += ' has-bk';
    html += '<div class="' + cls + '">' + day + '</div>';
  }
  g.innerHTML = html;
}

/* ============================================================
   REPORTS
   ============================================================ */
function renderReports() {
  /* Occupancy bars */
  var occ = el('report-occ');
  if (occ) {
    occ.innerHTML = ROOMS.map(function(r) {
      var fillColor = r.occ >= 80 ? 'var(--red)' : r.occ >= 50 ? 'var(--amber)' : 'var(--green)';
      return '<div class="occ-row">'
        + '<div class="occ-top"><div class="occ-name">' + r.name + '</div><div class="occ-pct">' + r.occ + '%</div></div>'
        + '<div class="occ-track"><div class="occ-fill" style="width:' + r.occ + '%;background:' + fillColor + '"></div></div>'
        + '</div>';
    }).join('');
  }

  /* Top tenants */
  var tp = el('top-tenants');
  if (tp) {
    var sorted = TENANTS.slice().sort(function(a, b) { return b.bookings - a.bookings; }).slice(0, 5);
    tp.innerHTML = sorted.map(function(tn, i) {
      return '<div class="act-item">'
        + tenantAvatar(tn)
        + '<div style="flex:1">'
        +   '<div class="act-text"><strong>' + (i+1) + '. ' + tn.name + '</strong></div>'
        +   '<div class="act-time">' + tn.bookings + ' bookings · ' + tn.joined + '</div>'
        + '</div>'
        + '<span class="badge badge-blue">' + tn.bookings + '</span>'
        + '</div>';
    }).join('');
  }

  /* Export report button */
  var exportBtn = el('export-report-btn');
  if (exportBtn) exportBtn.onclick = exportReport;
}

function exportReport() {
  var lines = [
    'MeetSpace Admin Report — June 2026',
    '====================================',
    '',
    'ROOM OCCUPANCY',
  ];
  ROOMS.forEach(function(r) {
    lines.push(r.name + ': ' + r.occ + '%');
  });
  lines.push('');
  lines.push('TOP TENANTS BY BOOKINGS');
  TENANTS.slice().sort(function(a,b){return b.bookings-a.bookings;}).forEach(function(tn,i){
    lines.push((i+1)+'. '+tn.name+': '+tn.bookings+' bookings');
  });
  lines.push('');
  lines.push('ALL BOOKINGS');
  lines.push('ID,Title,Tenant,Room,Date,Start,End,Attendees,Status');
  BOOKINGS.forEach(function(b){
    lines.push([b.id,b.title,b.tenant,b.room,b.date,b.start,b.end,b.attendees,b.status].join(','));
  });

  var blob = new Blob([lines.join('\n')], { type:'text/plain' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = 'meetspace_report_june2026.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Report exported successfully.');
}

/* ============================================================
   SEARCH
   ============================================================ */
function handleSearch(e) {
  STATE.searchQuery = e.target.value || '';
  /* Re-render whichever panel is active */
  var activeTab = (qsa('.page-tab').find(function(b) { return b.classList.contains('active'); }) || {}).dataset;
  if (activeTab && activeTab.tab) renderPanel(activeTab.tab);
}

/* ============================================================
   BOOKING STATUS FILTER
   ============================================================ */
function handleBookingFilter(e) {
  STATE.bookingFilter = e.target.value || 'all';
  renderAllBookings();
}

/* ============================================================
   FORM FIELD HELPERS
   ============================================================ */
function setFieldVal(id, val) {
  var f = el(id);
  if (f) f.value = val !== undefined && val !== null ? String(val) : '';
}

function getFieldVal(id) {
  var f = el(id);
  return f ? f.value.trim() : '';
}

/* ============================================================
   MODAL OVERLAY CLOSE ON CLICK OUTSIDE
   ============================================================ */
function initModalOverlays() {
  ['booking-modal', 'room-modal'].forEach(function(id) {
    var modal = el(id);
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          modal.classList.remove('open');
        }
      });
    }
  });
}

/* ============================================================
   AUTO-CALCULATE END TIME FROM DURATION
   ============================================================ */
function initAutoEndTime() {
  var startFld = el('bm-start');
  var durFld   = el('bm-duration');
  var endFld   = el('bm-end');
  if (!startFld || !durFld || !endFld) return;

  function calc() {
    var start = startFld.value;
    var dur   = parseInt(durFld.value);
    if (start && dur) {
      var mins  = timeToMins(start) + dur;
      var h     = Math.floor(mins / 60) % 24;
      var m     = mins % 60;
      endFld.value = String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
    }
  }

  startFld.addEventListener('change', calc);
  durFld.addEventListener('change', calc);
}

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    /* Escape closes any open modal */
    if (e.key === 'Escape') {
      closeBookingModal();
      closeRoomModal();
    }
    /* Ctrl/Cmd + B = new booking */
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      openNewBooking();
    }
  });
}

/* ============================================================
   REAL-TIME CLOCK (topbar date)
   ============================================================ */
function updateClock() {
  var subEl = el('page-sub');
  if (!subEl) return;
  var now    = new Date();
  var days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var months = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
  var h = String(now.getHours()).padStart(2,'0');
  var m = String(now.getMinutes()).padStart(2,'0');
  subEl.textContent = days[now.getDay()] + ', ' + now.getDate() + ' '
    + months[now.getMonth()] + ' ' + now.getFullYear() + ' · ' + h + ':' + m
    + ' · Kilimani, Nairobi';
}

/* ============================================================
   MEETING REMINDERS
   ============================================================ */
function checkReminders() {
  var now  = new Date();
  var todayStr = now.toISOString().split('T')[0];
  var curMins  = now.getHours() * 60 + now.getMinutes();

  BOOKINGS.forEach(function(b) {
    if (b.date !== todayStr || b.status !== 'upcoming' || b._reminded) return;
    var startMins = timeToMins(b.start);
    if (startMins - curMins === 15) {
      b._reminded = true;
      addNotification('remind', 'ti-clock', 'ai-amber',
        'Reminder: "' + b.title + '" in ' + b.room + ' starts in 15 minutes (' + b.start + ').',
        h + ':' + m);
      showToast('Reminder: "' + b.title + '" starts at ' + b.start, 'info');
    }
  });
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
  if (!ensureAdminSession()) {
    return;
  }

  /* Render default panel */
  renderPanel('overview');
  updateNotifCount();
  updateClock();

  /* Page tabs */
  qsa('.page-tab').forEach(function(btn) {
    btn.addEventListener('click', function() { switchTab(btn.dataset.tab); });
  });

  /* Search input */
  var searchInput = qs('.search-input');
  if (searchInput) searchInput.addEventListener('input', handleSearch);

  /* Booking status filter */
  var filterSel = el('booking-status-filter');
  if (filterSel) filterSel.addEventListener('change', handleBookingFilter);

  /* Modal overlays */
  initModalOverlays();

  /* Auto end-time */
  initAutoEndTime();

  /* Keyboard shortcuts */
  initKeyboardShortcuts();

  /* Live clock — update every minute */
  setInterval(updateClock, 60000);

  /* Reminder check — every minute */
  setInterval(checkReminders, 60000);

  /* Auto-refresh activity every 30 seconds (simulated) */
  setInterval(function() {
    updateNotifCount();
  }, 30000);

  /* Sidebar nav items */
  qsa('.sb-item').forEach(function(btn) {
    btn.addEventListener('click', function() {
      qsa('.sb-item').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });

});