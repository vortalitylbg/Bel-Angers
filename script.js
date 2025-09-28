import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";


const auth = getAuth();
onAuthStateChanged(auth, (user) => {
  if (user) {
    // utilisateur déjà connecté → redirection
    window.location.href = "dashboard.html";
  }
});

const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");
let particles = [];
let W, H;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function initParticles() {
  particles = [];
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: rand(0, W),
      y: rand(0, H),
      r: rand(1, 3),
      vx: rand(-0.4, 0.4),
      vy: rand(-0.4, 0.4),
      hue: rand(180, 220), // bleu/vert discret
      alpha: rand(0.15, 0.4)
    });
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  // fond léger
  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, "rgba(124,58,237,0.05)");
  gradient.addColorStop(1, "rgba(110,231,183,0.05)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0 || p.x > W) p.vx *= -1;
    if (p.y < 0 || p.y > H) p.vy *= -1;

    ctx.beginPath();
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 8);
    g.addColorStop(0, `hsla(${p.hue}, 80%, 60%, ${p.alpha})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.arc(p.x, p.y, p.r * 8, 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(draw);
}

window.addEventListener("resize", () => {
  resize();
  initParticles();
});

resize();
initParticles();
draw();
