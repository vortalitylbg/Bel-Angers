import { auth, db } from "./firebase-config.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { collection, addDoc, getDocs, onSnapshot, serverTimestamp, Timestamp, query, where, doc, updateDoc, deleteDoc  } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const sessionsRef = collection(db, "sessions");
const clientsRef = collection(db, "clients");

// affichage utilisateur
onAuthStateChanged(auth, (user) => {
  if (user) {
    const name = user.email ? user.email.split('@')[0] : 'Utilisateur';
    const el = document.getElementById('welcomeMessage');
    if (el) el.textContent = `Bienvenue ${name}`;

    // Une fois connecté, on lance le calendrier filtré
    initCalendar(user.uid);
  } else {
    window.location.href = 'login.html';
  }
});

// boutons logout
const logoutBtn = document.getElementById('logoutBtn');
const logoutBtnMobile = document.getElementById('logoutBtnMobile');
function handleLogout(){
  signOut(auth).then(()=>{ window.location.href = 'login.html'; }).catch(()=>{ window.location.href = 'login.html'; });
}
if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
if (logoutBtnMobile) logoutBtnMobile.addEventListener('click', handleLogout);

// Navigation sections
const navButtons = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.dashboard-section');
navButtons.forEach(btn => btn.addEventListener('click', () => {
  const target = btn.getAttribute('data-section');
  sections.forEach(s => s.classList.remove('active'));
  const dest = document.getElementById(target + 'Section');
  if (dest) dest.classList.add('active');

  document.querySelector('.mobile-menu')?.classList.remove('active');
  document.querySelector('.hamburger')?.classList.remove('active');
  document.querySelector('.overlay')?.classList.remove('active');
}));

// Calendar init
function initCalendar(userId) {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  let calendar = null;

  function getAvailableHeight() {
    const navbar = document.querySelector('.navbar');
    const navBottom = navbar ? navbar.getBoundingClientRect().bottom : 80;
    const footerHeight = 60;
    return Math.max(window.innerHeight - navBottom - footerHeight - 32, 320);
  }

  function toolbarForWidth(w) {
    if (w <= 420) return { left: 'prev,next', center: 'title', right: 'listWeek' };
    if (w <= 768) return { left: 'prev,next today', center: 'title', right: 'timeGridDay,listWeek' };
    return { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' };
  }

  function initialViewForWidth(w) {
    if (w <= 420) return 'listWeek';
    if (w <= 768) return 'timeGridDay';
    return 'dayGridMonth';
  }

  function buildCalendar() {
    if (calendar) try { calendar.destroy(); } catch (e) {}
    const toolbar = toolbarForWidth(window.innerWidth);

    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'timeGridWeek',
      locale: 'fr',
      headerToolbar: toolbar,
      height: getAvailableHeight(),
      nowIndicator: true,
      selectable: true,
      events: [],
      eventClick: (info) => {
        openSessionModal(info.event);
      }
    });
    calendar.render();

    let pressTimer = null;

    calendarEl.addEventListener("mousedown", (e) => {
      // Sur FullCalendar 6+, les slots horaires sont souvent des <td> sans classe directe
      const slot = e.target.closest("td[data-time]");
      if (!slot) return;

      slot.classList.add("active-slot");
      pressTimer = setTimeout(() => handleLongPress(slot), 600);
    });

    calendarEl.addEventListener("mouseup", (e) => {
      clearTimeout(pressTimer);
      e.target.closest("td[data-time]")?.classList.remove("active-slot");
    });

    calendarEl.addEventListener("mouseleave", (e) => {
      clearTimeout(pressTimer);
      e.target.closest("td[data-time]")?.classList.remove("active-slot");
    });




    // synchro Firestore
    const q = query(sessionsRef, where("userId", "==", userId));
    onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: `${data.clientName} (${data.hours}h)`,
          start: data.start.toDate(),
          end: data.end.toDate(),
          extendedProps: { ...data }
        };
      });
      calendar.removeAllEvents();
      calendar.addEventSource(events);
    });
  }

  function handleLongPress(cell) {
    const cellDateStr = cell.getAttribute("data-time");
    const col = cell.closest("td, th, div[data-date]");
    const dateStr = col ? col.getAttribute("data-date") : cell.closest("[data-date]")?.getAttribute("data-date");

    if (!dateStr || !cellDateStr) return;

    const start = new Date(`${dateStr}T${cellDateStr}`);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    document.getElementById("quickSessionDate").value = dateStr;
    document.getElementById("quickSessionStart").value = start.toISOString().substr(11,5);
    document.getElementById("quickSessionEnd").value = end.toISOString().substr(11,5);

    // ✅ cette ligne fonctionne maintenant
    document.getElementById("addSessionModal").classList.add("active");

    showToast("Création d’une session à " + start.toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }));
  }




  buildCalendar();
  window.addEventListener('resize', () => { buildCalendar(); });
}

// Mobile menu toggle
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');
const overlay = document.querySelector('.overlay');
if (hamburger){
  hamburger.addEventListener('click', ()=>{
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    overlay.classList.toggle('active');
  });
}
if (overlay){
  overlay.addEventListener('click', ()=>{
    hamburger.classList.remove('active');
    mobileMenu.classList.remove('active');
    overlay.classList.remove('active');
  });
}


// Formulaire
const addClientForm = document.getElementById("addClientForm");
const clientsList = document.getElementById("clientsList");
const clientsListMobile = document.getElementById("clientsListMobile");


// Soumission du formulaire
if (addClientForm) {
  addClientForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("clientName").value;
    const email = document.getElementById("clientEmail").value;
    const phone = document.getElementById("clientPhone").value;
    const notes = document.getElementById("clientNotes").value;

    try {
      await addDoc(clientsRef, {
        name,
        email,
        phone,
        notes,
        createdAt: serverTimestamp()
      });
      showToast("Client ajouté avec succès !");
      addClientForm.reset();
    } catch (err) {
      showToast("Erreur : " + err.message);
      console.error("Erreur ajout client:", err);
    }

  });
}

const sessionClientSelect = document.getElementById("sessionClient");
const editSessionClientSelect = document.getElementById("editSessionClient");

// Affichage en temps réel
if (clientsList) {
  onSnapshot(clientsRef, (snapshot) => {
  clientsList.innerHTML = "";
  if (clientsListMobile) clientsListMobile.innerHTML = "";
  if (sessionClientSelect) sessionClientSelect.innerHTML = "";
  if (editSessionClientSelect) editSessionClientSelect.innerHTML = "";

  snapshot.forEach((doc) => {
    const client = doc.data();
    const createdAt = client.createdAt?.toDate
      ? client.createdAt.toDate().toLocaleDateString("fr-FR")
      : "-";

    // Table desktop
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${client.name}</strong></td>
      <td>${client.email || ""}</td>
      <td>${client.phone || ""}</td>
      <td>${client.notes || ""}</td>
      <td>${createdAt}</td>
    `;
    clientsList.appendChild(tr);

    // Cartes mobile
    if (clientsListMobile) {
      const card = document.createElement("div");
      card.className = "client-card";
      card.innerHTML = `
        <p><strong>${client.name}</strong></p>
        <p>Email : ${client.email || "-"}</p>
        <p>Téléphone : ${client.phone || "-"}</p>
        <p>Notes : ${client.notes || "-"}</p>
        <p>Créé le : ${createdAt}</p>
      `;
      clientsListMobile.appendChild(card);
    }

    // Select pour ajout de session
    if (sessionClientSelect) {
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = client.name;
      sessionClientSelect.appendChild(option);
    }

    // ✅ Select pour édition de session (dans le modal)
    if (editSessionClientSelect) {
      const option2 = document.createElement("option");
      option2.value = doc.id;
      option2.textContent = client.name;
      editSessionClientSelect.appendChild(option2);
    }
  });
});

}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 50);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}


const addSessionForm = document.getElementById("addSessionForm");

if (addSessionForm) {
  addSessionForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const clientId = document.getElementById("sessionClient").value;
    const clientName = document.getElementById("sessionClient").selectedOptions[0].textContent;
    const date = document.getElementById("sessionDate").value;
    const startTime = document.getElementById("sessionTime").value;
    const endTime = document.getElementById("sessionEndTime").value;

    if (!date || !startTime || !endTime) return;

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);

    if (end <= start) {
      showToast("L'heure de fin doit être après l'heure de début.");
      return;
    }

    const durationMs = end - start;
    const hours = durationMs / (1000 * 60 * 60); // convert ms to hours

    try {
      await addDoc(sessionsRef, {
        clientId,
        clientName,
        hours,
        start: Timestamp.fromDate(start),
        end: Timestamp.fromDate(end),
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });

      showToast(`Session ajoutée pour ${clientName}`);
      addSessionForm.reset();
    } catch (err) {
      showToast("Erreur ajout session: " + err.message);
      console.error("Erreur ajout session:", err);
    }
  });
}

async function loadStats() {
  const snapshot = await getDocs(sessionsRef);
  const sessions = [];
  snapshot.forEach(doc => sessions.push(doc.data()));

  // Total heures
  const totalHours = sessions.reduce((sum, s) => sum + (s.hours || 0), 0);
  document.getElementById("totalHours").textContent = totalHours.toFixed(1) + " h";

  // Heures par client
  const clientHours = {};
  sessions.forEach(s => {
    if (!clientHours[s.clientName]) clientHours[s.clientName] = 0;
    clientHours[s.clientName] += s.hours || 0;
  });

  const clientLabels = Object.keys(clientHours);
  const clientData = Object.values(clientHours);

  new Chart(document.getElementById("clientHoursChart"), {
    type: "bar",
    data: {
      labels: clientLabels,
      datasets: [{
        label: "Heures",
        data: clientData,
        backgroundColor: "#4CAF50"
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: false
        }
      }
    }
  });

  // Sessions par mois
  const monthlyCounts = {};
  sessions.forEach(s => {
    const date = s.start?.toDate?.() || new Date();
    const key = date.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
    monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
  });

  const monthLabels = Object.keys(monthlyCounts);
  const monthData = Object.values(monthlyCounts);

  new Chart(document.getElementById("monthlySessionsChart"), {
    type: "line",
    data: {
      labels: monthLabels,
      datasets: [{
        label: "Sessions",
        data: monthData,
        borderColor: "#2196F3",
        backgroundColor: "rgba(33,150,243,0.2)",
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: false
        }
      }
    }
  });
}


// Gestion du modal session
const sessionModal = document.getElementById("sessionModal");
const closeSessionModal = document.getElementById("closeSessionModal");
const editSessionForm = document.getElementById("editSessionForm");
const deleteSessionBtn = document.getElementById("deleteSessionBtn");

let currentSessionId = null;
let currentSessionData = null;

function openSessionModal(event) {
  currentSessionId = event.id;
  currentSessionData = event.extendedProps; // ✅ sauvegarde du clientId, clientName, etc.

  const clientNameEl = document.getElementById("editSessionClientName");
  if (clientNameEl) clientNameEl.textContent = currentSessionData.clientName || "Client inconnu";

  document.getElementById("editSessionDate").value = event.start.toISOString().split("T")[0];
  document.getElementById("editSessionTime").value = event.start.toISOString().substr(11,5);
  document.getElementById("editSessionEndTime").value = event.end.toISOString().substr(11,5);

  sessionModal.classList.add("active");
}


if (closeSessionModal) {
  closeSessionModal.addEventListener("click", () => sessionModal.classList.remove("active"));
}

if (editSessionForm) {
  editSessionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentSessionId || !currentSessionData) return;

    const clientId = currentSessionData.clientId;
    const clientName = currentSessionData.clientName;
    const date = document.getElementById("editSessionDate").value;
    const startTime = document.getElementById("editSessionTime").value;
    const endTime = document.getElementById("editSessionEndTime").value;

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    const hours = (end - start) / (1000 * 60 * 60);

    try {
      const ref = doc(db, "sessions", currentSessionId);
      await updateDoc(ref, {
        clientId, clientName,
        start: Timestamp.fromDate(start),
        end: Timestamp.fromDate(end),
        hours
      });
      showToast("Session modifiée !");
      sessionModal.classList.remove("active");
    } catch (err) {
      showToast("Erreur modif session : " + err.message);
    }
  });
}


if (deleteSessionBtn) {
  deleteSessionBtn.addEventListener("click", async () => {
    if (!currentSessionId) return;
    if (!confirm("Supprimer cette session ?")) return;

    try {
      const ref = doc(db, "sessions", currentSessionId);
      await deleteDoc(ref);
      showToast("Session supprimée !");
      sessionModal.classList.remove("active");
    } catch (err) {
      showToast("Erreur suppression : " + err.message);
    }
  });
}

// --- MODAL AJOUT SESSION ---
const addSessionModal = document.getElementById("addSessionModal");
const closeAddSessionModal = document.getElementById("closeAddSessionModal");
const quickAddSessionForm = document.getElementById("quickAddSessionForm");
const quickSessionClientSelect = document.getElementById("quickSessionClient");

// Fermer modal
if (closeAddSessionModal) {
  closeAddSessionModal.addEventListener("click", () => addSessionModal.classList.remove("active"));
}

// Remplir la liste des clients
onSnapshot(clientsRef, (snapshot) => {
  if (quickSessionClientSelect) {
    quickSessionClientSelect.innerHTML = "";
    snapshot.forEach((doc) => {
      const client = doc.data();
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = client.name;
      quickSessionClientSelect.appendChild(option);
    });
  }
});

// Soumission du formulaire rapide
if (quickAddSessionForm) {
  quickAddSessionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const clientId = quickSessionClientSelect.value;
    const clientName = quickSessionClientSelect.selectedOptions[0].textContent;
    const date = document.getElementById("quickSessionDate").value;
    const startTime = document.getElementById("quickSessionStart").value;
    const endTime = document.getElementById("quickSessionEnd").value;

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
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      showToast("Session ajoutée !");
      addSessionModal.classList.remove("active");
    } catch (err) {
      showToast("Erreur ajout session : " + err.message);
    }
  });
}



// Appel au chargement
loadStats();