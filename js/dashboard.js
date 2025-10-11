/**
 * ============================================
 * BEL'ANGERS DASHBOARD - MAIN APPLICATION
 * ============================================
 * 
 * A modern, clean, and well-organized dashboard
 * for managing clients and sessions.
 */

import { auth, db } from "./firebase-config.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { 
  collection, 
  addDoc, 
  getDocs, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// ============================================
// FIREBASE COLLECTIONS
// ============================================
const sessionsRef = collection(db, "sessions");
const clientsRef = collection(db, "clients");

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
  currentUser: null,
  calendar: null,
  currentSessionId: null,
  currentSessionData: null,
  currentClientId: null,
  clients: [],
  sessions: []
};

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Handle user authentication state
 */
onAuthStateChanged(auth, (user) => {
  if (user) {
    state.currentUser = user;
    const name = user.email ? user.email.split('@')[0] : 'Utilisateur';
    const welcomeEl = document.getElementById('welcomeMessage');
    if (welcomeEl) {
      welcomeEl.textContent = `Bienvenue ${name}`;
    }
    
    // Initialize app
    initializeApp(user.uid);
  } else {
    window.location.href = 'login.html';
  }
});

/**
 * Handle logout
 */
function handleLogout() {
  signOut(auth)
    .then(() => {
      window.location.href = 'login.html';
    })
    .catch(() => {
      window.location.href = 'login.html';
    });
}

// Attach logout handlers
document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
document.getElementById('logoutBtnMobile')?.addEventListener('click', handleLogout);

// ============================================
// APP INITIALIZATION
// ============================================

/**
 * Initialize the application
 */
function initializeApp(userId) {
  setupNavigation();
  setupMobileMenu();
  initCalendar(userId);
  setupClientManagement();
  setupSessionManagement();
  loadStatistics(userId);
  setupFormHelpers();
}

// ============================================
// NAVIGATION
// ============================================

/**
 * Setup section navigation
 */
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = document.querySelectorAll('.section');
  
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetSection = btn.getAttribute('data-section');
      
      // Update active states
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Show target section
      sections.forEach(s => s.classList.remove('active'));
      const target = document.getElementById(targetSection + 'Section');
      if (target) {
        target.classList.add('active');
      }
      
      // Close mobile menu if open
      closeMobileMenu();
    });
  });
}

/**
 * Setup mobile menu
 */
function setupMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const overlay = document.querySelector('.overlay');
  const closeBtn = document.querySelector('.close-mobile-menu');
  
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileMenu?.classList.toggle('active');
    overlay?.classList.toggle('active');
  });
  
  overlay?.addEventListener('click', closeMobileMenu);
  closeBtn?.addEventListener('click', closeMobileMenu);
}

/**
 * Close mobile menu
 */
function closeMobileMenu() {
  document.querySelector('.hamburger')?.classList.remove('active');
  document.querySelector('.mobile-menu')?.classList.remove('active');
  document.querySelector('.overlay')?.classList.remove('active');
}

// ============================================
// CALENDAR
// ============================================

/**
 * Initialize FullCalendar
 */
function initCalendar(userId) {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;
  
  // Calculate optimal height
  function getCalendarHeight() {
    const navbar = document.querySelector('.navbar');
    const navBottom = navbar ? navbar.getBoundingClientRect().bottom : 80;
    const footerHeight = 80;
    return Math.max(window.innerHeight - navBottom - footerHeight - 100, 400);
  }
  
  // Responsive toolbar configuration
  function getToolbarConfig(width) {
    if (width <= 480) {
      return { left: 'prev,next', center: 'title', right: 'listWeek' };
    }
    if (width <= 768) {
      return { left: 'prev,next today', center: 'title', right: 'timeGridDay,listWeek' };
    }
    return { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' };
  }
  
  // Build calendar
  function buildCalendar() {
    if (state.calendar) {
      try { state.calendar.destroy(); } catch (e) {}
    }
    
    const toolbar = getToolbarConfig(window.innerWidth);
    
    state.calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: window.innerWidth <= 768 ? 'timeGridDay' : 'timeGridWeek',
      locale: 'fr',
      headerToolbar: toolbar,
      height: getCalendarHeight(),
      nowIndicator: true,
      selectable: true,
      selectMirror: true,
      dayMaxEvents: true,
      events: [],
      eventClick: (info) => {
        openEditSessionModal(info.event);
      },
      select: (info) => {
        openQuickAddSessionModal(info.start, info.end);
      }
    });
    
    state.calendar.render();
    
    // Load sessions from Firestore
    const q = query(sessionsRef, where("userId", "==", userId));
    onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: `${data.clientName} (${formatDuration(data.hours)})`,
          start: data.start.toDate(),
          end: data.end.toDate(),
          extendedProps: { ...data }
        };
      });
      
      state.calendar.removeAllEvents();
      state.calendar.addEventSource(events);
    });
  }
  
  buildCalendar();
  
  // Rebuild on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      buildCalendar();
    }, 250);
  });
}

// ============================================
// CLIENT MANAGEMENT
// ============================================

/**
 * Setup client management
 */
function setupClientManagement() {
  const addClientForm = document.getElementById('addClientForm');
  const clientsList = document.getElementById('clientsList');
  const clientsListMobile = document.getElementById('clientsListMobile');
  
  // Handle add client form
  if (addClientForm) {
    addClientForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('clientName').value.trim();
      const email = document.getElementById('clientEmail').value.trim();
      const phone = document.getElementById('clientPhone').value.trim();
      const notes = document.getElementById('clientNotes').value.trim();
      
      try {
        await addDoc(clientsRef, {
          name,
          email,
          phone,
          notes,
          createdAt: serverTimestamp()
        });
        
        showToast('✓ Client ajouté avec succès !', 'success');
        addClientForm.reset();
      } catch (err) {
        showToast('✗ Erreur : ' + err.message, 'error');
        console.error('Error adding client:', err);
      }
    });
  }
  
  // Listen for clients updates
  if (clientsList) {
    onSnapshot(clientsRef, (snapshot) => {
      state.clients = [];
      clientsList.innerHTML = '';
      if (clientsListMobile) clientsListMobile.innerHTML = '';
      
      // Update client selects
      updateClientSelects(snapshot);
      
      snapshot.forEach((doc) => {
        const client = { id: doc.id, ...doc.data() };
        state.clients.push(client);
        
        const createdAt = client.createdAt?.toDate
          ? client.createdAt.toDate().toLocaleDateString('fr-FR')
          : '-';
        
        // Desktop table row
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${escapeHtml(client.name)}</strong></td>
          <td>${escapeHtml(client.email || '')}</td>
          <td>${escapeHtml(client.phone || '')}</td>
          <td>${escapeHtml(client.notes || '')}</td>
          <td>${createdAt}</td>
          <td>
            <div class="table-actions">
              <button class="btn-icon" onclick="window.editClient('${doc.id}')" title="Modifier">
                ✏️
              </button>
              <button class="btn-icon danger" onclick="window.deleteClient('${doc.id}')" title="Supprimer">
                🗑️
              </button>
            </div>
          </td>
        `;
        clientsList.appendChild(tr);
        
        // Mobile card
        if (clientsListMobile) {
          const card = document.createElement('div');
          card.className = 'client-card';
          card.innerHTML = `
            <p><strong>${escapeHtml(client.name)}</strong></p>
            <p>📧 ${escapeHtml(client.email || '-')}</p>
            <p>📱 ${escapeHtml(client.phone || '-')}</p>
            <p>📝 ${escapeHtml(client.notes || '-')}</p>
            <p>📅 Ajouté le ${createdAt}</p>
            <div class="card-actions">
              <button class="btn btn-secondary" onclick="window.editClient('${doc.id}')">
                Modifier
              </button>
              <button class="btn btn-danger" onclick="window.deleteClient('${doc.id}')">
                Supprimer
              </button>
            </div>
          `;
          clientsListMobile.appendChild(card);
        }
      });
      
      // Update client count
      const clientCount = document.getElementById('clientCount');
      if (clientCount) {
        clientCount.textContent = snapshot.size;
      }
    });
  }
}

/**
 * Update all client select dropdowns
 */
function updateClientSelects(snapshot) {
  const selects = [
    document.getElementById('sessionClient'),
    document.getElementById('quickSessionClient')
  ];
  
  selects.forEach(select => {
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">Sélectionnez un client</option>';
    
    snapshot.forEach((doc) => {
      const client = doc.data();
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = client.name;
      select.appendChild(option);
    });
    
    // Restore previous selection if still valid
    if (currentValue) {
      select.value = currentValue;
    }
  });
}

/**
 * Edit client
 */
window.editClient = function(clientId) {
  const client = state.clients.find(c => c.id === clientId);
  if (!client) return;
  
  state.currentClientId = clientId;
  
  document.getElementById('editClientName').value = client.name || '';
  document.getElementById('editClientEmail').value = client.email || '';
  document.getElementById('editClientPhone').value = client.phone || '';
  document.getElementById('editClientNotes').value = client.notes || '';
  
  document.getElementById('editClientModal').classList.add('active');
};

/**
 * Delete client
 */
window.deleteClient = async function(clientId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;
  
  try {
    await deleteDoc(doc(db, 'clients', clientId));
    showToast('✓ Client supprimé', 'success');
  } catch (err) {
    showToast('✗ Erreur : ' + err.message, 'error');
    console.error('Error deleting client:', err);
  }
};

// Setup edit client modal
const editClientForm = document.getElementById('editClientForm');
if (editClientForm) {
  editClientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.currentClientId) return;
    
    const name = document.getElementById('editClientName').value.trim();
    const email = document.getElementById('editClientEmail').value.trim();
    const phone = document.getElementById('editClientPhone').value.trim();
    const notes = document.getElementById('editClientNotes').value.trim();
    
    try {
      await updateDoc(doc(db, 'clients', state.currentClientId), {
        name,
        email,
        phone,
        notes
      });
      
      showToast('✓ Client modifié', 'success');
      document.getElementById('editClientModal').classList.remove('active');
    } catch (err) {
      showToast('✗ Erreur : ' + err.message, 'error');
      console.error('Error updating client:', err);
    }
  });
}

document.getElementById('deleteClientBtn')?.addEventListener('click', () => {
  if (state.currentClientId) {
    window.deleteClient(state.currentClientId);
    document.getElementById('editClientModal').classList.remove('active');
  }
});

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Setup session management
 */
function setupSessionManagement() {
  const addSessionForm = document.getElementById('addSessionForm');
  
  // Handle add session form
  if (addSessionForm) {
    addSessionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const clientId = document.getElementById('sessionClient').value;
      const clientName = document.getElementById('sessionClient').selectedOptions[0].textContent;
      const date = document.getElementById('sessionDate').value;
      const startTime = document.getElementById('sessionTime').value;
      const endTime = document.getElementById('sessionEndTime').value;
      
      if (!clientId || !date || !startTime || !endTime) {
        showToast('⚠ Veuillez remplir tous les champs', 'error');
        return;
      }
      
      const start = new Date(`${date}T${startTime}`);
      const end = new Date(`${date}T${endTime}`);
      
      if (end <= start) {
        showToast('⚠ L\'heure de fin doit être après l\'heure de début', 'error');
        return;
      }
      
      const hours = (end - start) / (1000 * 60 * 60);
      
      try {
        await addDoc(sessionsRef, {
          clientId,
          clientName,
          hours,
          start: Timestamp.fromDate(start),
          end: Timestamp.fromDate(end),
          userId: state.currentUser.uid,
          createdAt: serverTimestamp()
        });
        
        showToast(`✓ Session ajoutée pour ${clientName}`, 'success');
        addSessionForm.reset();
      } catch (err) {
        showToast('✗ Erreur : ' + err.message, 'error');
        console.error('Error adding session:', err);
      }
    });
  }
  
  // Load recent sessions
  loadRecentSessions();
}

/**
 * Load recent sessions
 */
function loadRecentSessions() {
  const recentSessionsList = document.getElementById('recentSessionsList');
  if (!recentSessionsList) return;
  
  const q = query(
    sessionsRef, 
    where("userId", "==", state.currentUser?.uid || "")
  );
  
  onSnapshot(q, (snapshot) => {
    const sessions = [];
    snapshot.forEach(doc => {
      sessions.push({ id: doc.id, ...doc.data() });
    });
    
    // Sort by date (most recent first)
    sessions.sort((a, b) => {
      const dateA = a.start?.toDate?.() || new Date(0);
      const dateB = b.start?.toDate?.() || new Date(0);
      return dateB - dateA;
    });
    
    // Display only last 10
    const recentSessions = sessions.slice(0, 10);
    
    recentSessionsList.innerHTML = '';
    
    if (recentSessions.length === 0) {
      recentSessionsList.innerHTML = '<p class="text-muted text-center">Aucune session enregistrée</p>';
      return;
    }
    
    recentSessions.forEach(session => {
      const startDate = session.start?.toDate?.() || new Date();
      const endDate = session.end?.toDate?.() || new Date();
      
      const item = document.createElement('div');
      item.className = 'session-item';
      item.innerHTML = `
        <div class="session-info">
          <div class="session-client">${escapeHtml(session.clientName)}</div>
          <div class="session-time">
            📅 ${startDate.toLocaleDateString('fr-FR')} • 
            ⏰ ${startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - 
            ${endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div class="session-duration">${formatDuration(session.hours)}</div>
      `;
      recentSessionsList.appendChild(item);
    });
    
    // Update session count
    const sessionCount = document.getElementById('sessionCount');
    if (sessionCount) {
      sessionCount.textContent = sessions.length;
    }
  });
}

/**
 * Open edit session modal
 */
function openEditSessionModal(event) {
  state.currentSessionId = event.id;
  state.currentSessionData = event.extendedProps;
  
  const clientNameEl = document.getElementById('editSessionClientName');
  if (clientNameEl) {
    clientNameEl.textContent = state.currentSessionData.clientName || 'Client inconnu';
  }
  
  document.getElementById('editSessionDate').value = event.start.toISOString().split('T')[0];
  document.getElementById('editSessionTime').value = event.start.toISOString().substr(11, 5);
  document.getElementById('editSessionEndTime').value = event.end.toISOString().substr(11, 5);
  
  updateEditSessionDuration();
  
  document.getElementById('sessionModal').classList.add('active');
}

/**
 * Open quick add session modal (from calendar selection)
 */
function openQuickAddSessionModal(start, end) {
  const dateStr = start.toISOString().split('T')[0];
  const startTime = start.toISOString().substr(11, 5);
  const endTime = end.toISOString().substr(11, 5);
  
  document.getElementById('quickSessionDate').value = dateStr;
  document.getElementById('quickSessionStart').value = startTime;
  document.getElementById('quickSessionEnd').value = endTime;
  
  updateQuickSessionDuration();
  
  document.getElementById('addSessionModal').classList.add('active');
}

// Setup edit session form
const editSessionForm = document.getElementById('editSessionForm');
if (editSessionForm) {
  editSessionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.currentSessionId || !state.currentSessionData) return;
    
    const date = document.getElementById('editSessionDate').value;
    const startTime = document.getElementById('editSessionTime').value;
    const endTime = document.getElementById('editSessionEndTime').value;
    
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    
    if (end <= start) {
      showToast('⚠ L\'heure de fin doit être après l\'heure de début', 'error');
      return;
    }
    
    const hours = (end - start) / (1000 * 60 * 60);
    
    try {
      await updateDoc(doc(db, 'sessions', state.currentSessionId), {
        start: Timestamp.fromDate(start),
        end: Timestamp.fromDate(end),
        hours
      });
      
      showToast('✓ Session modifiée', 'success');
      document.getElementById('sessionModal').classList.remove('active');
    } catch (err) {
      showToast('✗ Erreur : ' + err.message, 'error');
      console.error('Error updating session:', err);
    }
  });
}

// Setup delete session button
document.getElementById('deleteSessionBtn')?.addEventListener('click', async () => {
  if (!state.currentSessionId) return;
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette session ?')) return;
  
  try {
    await deleteDoc(doc(db, 'sessions', state.currentSessionId));
    showToast('✓ Session supprimée', 'success');
    document.getElementById('sessionModal').classList.remove('active');
  } catch (err) {
    showToast('✗ Erreur : ' + err.message, 'error');
    console.error('Error deleting session:', err);
  }
});

// Setup quick add session form
const quickAddSessionForm = document.getElementById('quickAddSessionForm');
if (quickAddSessionForm) {
  quickAddSessionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const clientId = document.getElementById('quickSessionClient').value;
    const clientName = document.getElementById('quickSessionClient').selectedOptions[0].textContent;
    const date = document.getElementById('quickSessionDate').value;
    const startTime = document.getElementById('quickSessionStart').value;
    const endTime = document.getElementById('quickSessionEnd').value;
    
    if (!clientId) {
      showToast('⚠ Veuillez sélectionner un client', 'error');
      return;
    }
    
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    const hours = (end - start) / (1000 * 60 * 60);
    
    try {
      await addDoc(sessionsRef, {
        clientId,
        clientName,
        start: Timestamp.fromDate(start),
        end: Timestamp.fromDate(end),
        hours,
        userId: state.currentUser.uid,
        createdAt: serverTimestamp()
      });
      
      showToast('✓ Session ajoutée', 'success');
      document.getElementById('addSessionModal').classList.remove('active');
    } catch (err) {
      showToast('✗ Erreur : ' + err.message, 'error');
      console.error('Error adding session:', err);
    }
  });
}

// ============================================
// STATISTICS
// ============================================

/**
 * Load and display statistics
 */
async function loadStatistics(userId) {
  const q = query(sessionsRef, where("userId", "==", userId));
  
  onSnapshot(q, (snapshot) => {
    const sessions = [];
    snapshot.forEach(doc => {
      sessions.push(doc.data());
    });
    
    // Calculate stats
    const totalHours = sessions.reduce((sum, s) => sum + (s.hours || 0), 0);
    const totalSessions = sessions.length;
    const uniqueClients = new Set(sessions.map(s => s.clientId)).size;
    const avgHours = totalSessions > 0 ? totalHours / totalSessions : 0;
    
    // Update stat cards
    document.getElementById('totalHours').textContent = formatDuration(totalHours);
    document.getElementById('totalSessions').textContent = totalSessions;
    document.getElementById('activeClients').textContent = uniqueClients;
    document.getElementById('avgHours').textContent = formatDuration(avgHours);
    
    // Update charts
    updateClientHoursChart(sessions);
    updateMonthlySessionsChart(sessions);
  });
}

/**
 * Update client hours chart
 */
function updateClientHoursChart(sessions) {
  const ctx = document.getElementById('clientHoursChart');
  if (!ctx) return;
  
  // Aggregate hours by client
  const clientHours = {};
  sessions.forEach(s => {
    if (!clientHours[s.clientName]) {
      clientHours[s.clientName] = 0;
    }
    clientHours[s.clientName] += s.hours || 0;
  });
  
  const labels = Object.keys(clientHours);
  const data = Object.values(clientHours);
  
  // Destroy existing chart
  if (ctx.chart) {
    ctx.chart.destroy();
  }
  
  // Create new chart
  ctx.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Heures',
        data: data,
        backgroundColor: 'rgba(110, 231, 183, 0.8)',
        borderColor: 'rgba(110, 231, 183, 1)',
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#94a3b8'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#94a3b8'
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

/**
 * Update monthly sessions chart
 */
function updateMonthlySessionsChart(sessions) {
  const ctx = document.getElementById('monthlySessionsChart');
  if (!ctx) return;
  
  // Aggregate sessions by month
  const monthlyCounts = {};
  sessions.forEach(s => {
    const date = s.start?.toDate?.() || new Date();
    const key = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
  });
  
  const labels = Object.keys(monthlyCounts);
  const data = Object.values(monthlyCounts);
  
  // Destroy existing chart
  if (ctx.chart) {
    ctx.chart.destroy();
  }
  
  // Create new chart
  ctx.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Sessions',
        data: data,
        borderColor: 'rgba(110, 231, 183, 1)',
        backgroundColor: 'rgba(110, 231, 183, 0.2)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgba(110, 231, 183, 1)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#94a3b8',
            stepSize: 1
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#94a3b8'
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// ============================================
// FORM HELPERS
// ============================================

/**
 * Setup form helpers (duration calculators, etc.)
 */
function setupFormHelpers() {
  // Session form duration calculator
  const sessionTime = document.getElementById('sessionTime');
  const sessionEndTime = document.getElementById('sessionEndTime');
  
  if (sessionTime && sessionEndTime) {
    sessionTime.addEventListener('change', updateSessionDuration);
    sessionEndTime.addEventListener('change', updateSessionDuration);
  }
  
  // Edit session duration calculator
  const editSessionTime = document.getElementById('editSessionTime');
  const editSessionEndTime = document.getElementById('editSessionEndTime');
  
  if (editSessionTime && editSessionEndTime) {
    editSessionTime.addEventListener('change', updateEditSessionDuration);
    editSessionEndTime.addEventListener('change', updateEditSessionDuration);
  }
  
  // Quick add session duration calculator
  const quickSessionStart = document.getElementById('quickSessionStart');
  const quickSessionEnd = document.getElementById('quickSessionEnd');
  
  if (quickSessionStart && quickSessionEnd) {
    quickSessionStart.addEventListener('change', updateQuickSessionDuration);
    quickSessionEnd.addEventListener('change', updateQuickSessionDuration);
  }
}

/**
 * Update session duration display
 */
function updateSessionDuration() {
  const startTime = document.getElementById('sessionTime').value;
  const endTime = document.getElementById('sessionEndTime').value;
  const durationEl = document.getElementById('sessionDuration');
  
  if (startTime && endTime && durationEl) {
    const duration = calculateDuration(startTime, endTime);
    durationEl.textContent = `Durée: ${duration}`;
  }
}

/**
 * Update edit session duration display
 */
function updateEditSessionDuration() {
  const startTime = document.getElementById('editSessionTime').value;
  const endTime = document.getElementById('editSessionEndTime').value;
  const durationEl = document.getElementById('editSessionDuration');
  
  if (startTime && endTime && durationEl) {
    const duration = calculateDuration(startTime, endTime);
    durationEl.textContent = `Durée: ${duration}`;
  }
}

/**
 * Update quick session duration display
 */
function updateQuickSessionDuration() {
  const startTime = document.getElementById('quickSessionStart').value;
  const endTime = document.getElementById('quickSessionEnd').value;
  const durationEl = document.getElementById('quickSessionDuration');
  
  if (startTime && endTime && durationEl) {
    const duration = calculateDuration(startTime, endTime);
    durationEl.textContent = `Durée: ${duration}`;
  }
}

/**
 * Calculate duration between two times
 */
function calculateDuration(startTime, endTime) {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const diffMinutes = endMinutes - startMinutes;
  
  if (diffMinutes <= 0) {
    return '--';
  }
  
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  
  if (hours === 0) {
    return `${minutes}min`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h${minutes}min`;
  }
}

// ============================================
// MODAL MANAGEMENT
// ============================================

/**
 * Setup modal close handlers
 */
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.closest('.modal').classList.remove('active');
  });
});

// Close modals on overlay click
document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
});

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.active').forEach(modal => {
      modal.classList.remove('active');
    });
  }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Format duration in hours
 */
function formatDuration(hours) {
  if (!hours || hours === 0) return '0h';
  
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  
  if (m === 0) {
    return `${h}h`;
  } else if (h === 0) {
    return `${m}min`;
  } else {
    return `${h}h${m}min`;
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// CONSOLE INFO
// ============================================
console.log('%c🎉 Bel\'Angers Dashboard', 'color: #6ee7b7; font-size: 20px; font-weight: bold;');
console.log('%cVersion 2.0 - Redesigned & Optimized', 'color: #94a3b8; font-size: 12px;');