import { auth } from "./js/firebase-config.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

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

  // close mobile menu if open
  document.querySelector('.mobile-menu')?.classList.remove('active');
  document.querySelector('.hamburger')?.classList.remove('active');
  document.querySelector('.overlay')?.classList.remove('active');
}));

// Calendar init with responsive toolbar & view
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
      events: [],
      editable:false,
      selectable:true
    });
    calendar.render();
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