import { auth, db } from "./firebase-config.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { collection, addDoc, getDocs, onSnapshot, serverTimestamp, Timestamp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";


// affichage utilisateur
onAuthStateChanged(auth, (user) => {
  if (user) {
    const name = user.email ? user.email.split('@')[0] : 'Utilisateur';
    const el = document.getElementById('welcomeMessage');
    if (el) el.textContent = `Bienvenue ${name}`;
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
document.addEventListener('DOMContentLoaded', () => {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  let calendar = null;

  function getAvailableHeight(){
    const navbar = document.querySelector('.navbar');
    const navBottom = navbar ? navbar.getBoundingClientRect().bottom : 80;
    const footerHeight = 60;
    return Math.max(window.innerHeight - navBottom - footerHeight - 32, 320);
  }

  function toolbarForWidth(w){
    if (w <= 420) return { left: 'prev,next', center: 'title', right: 'listWeek' };
    if (w <= 768) return { left: 'prev,next today', center: 'title', right: 'timeGridDay,listWeek' };
    return { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' };
  }

  function initialViewForWidth(w){
    if (w <= 420) return 'listWeek';
    if (w <= 768) return 'timeGridDay';
    return 'dayGridMonth';
  }

  function initCalendar(){
    if (calendar) try{ calendar.destroy(); }catch(e){}
    const w = window.innerWidth;
    const view = initialViewForWidth(w);
    const toolbar = toolbarForWidth(w);

    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: view,
      locale: 'fr',
      headerToolbar: toolbar,
      height: getAvailableHeight(),
      expandRows: true,
      nowIndicator: true,
      dayMaxEventRows: true,
      editable: false,
      selectable: true,
      events: []
    });
    calendar.render();

    // Synchronisation avec Firestore
    onSnapshot(sessionsRef, (snapshot) => {
      const events = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: `${data.clientName} (${data.hours}h)`,
          start: data.start.toDate(),
          end: data.end.toDate()
        };
      });
      calendar.removeAllEvents();
      calendar.addEventSource(events);
    });

    calendarEl._fc = calendar;
  }


  initCalendar();

  let resizeTimer;
  window.addEventListener('resize', ()=>{
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(()=>{ initCalendar(); }, 140);
  });
});

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

// Référence collection
const clientsRef = collection(db, "clients");

// Formulaire
const addClientForm = document.getElementById("addClientForm");
const clientsList = document.getElementById("clientsList");

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
// Affichage en temps réel
if (clientsList) {
  onSnapshot(clientsRef, (snapshot) => {
    clientsList.innerHTML = "";
    if (sessionClientSelect) {
      sessionClientSelect.innerHTML = ""; // reset options
    }

    snapshot.forEach((doc) => {
      const client = doc.data();
      const tr = document.createElement("tr");

      const createdAt = client.createdAt?.toDate 
        ? client.createdAt.toDate().toLocaleDateString("fr-FR") 
        : "-";

      tr.innerHTML = `
        <td><strong>${client.name}</strong></td>
        <td>${client.email || ""}</td>
        <td>${client.phone || ""}</td>
        <td>${client.notes || ""}</td>
        <td>${createdAt}</td>
      `;
      clientsList.appendChild(tr);

      // Ajout dans le select du formulaire sessions
      if (sessionClientSelect) {
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = client.name;
        sessionClientSelect.appendChild(option);
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

// Référence à la collection sessions
const sessionsRef = collection(db, "sessions");

const addSessionForm = document.getElementById("addSessionForm");

if (addSessionForm) {
  addSessionForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const clientId = document.getElementById("sessionClient").value;
    const clientName = document.getElementById("sessionClient").selectedOptions[0].textContent;
    const date = document.getElementById("sessionDate").value;
    const time = document.getElementById("sessionTime").value;
    const hours = parseInt(document.getElementById("sessionHours").value, 10);

    if (!date || !time || !hours) return;

    const start = new Date(`${date}T${time}`);
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);

    try {
      await addDoc(sessionsRef, {
        clientId,
        clientName,
        hours,
        start: Timestamp.fromDate(start),
        end: Timestamp.fromDate(end),
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