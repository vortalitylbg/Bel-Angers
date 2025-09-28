import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

// Associe chaque utilisateur à un email Firebase
const employeeEmails = {
  admin: "timothee.charruau@icloud.com",
  julien: "julien@bel-angers.fr",
  ludovic: "ludovic@bel-angers.fr",
  justine: "justine@bel-angers.fr",
  yannick: "yannick@bel-angers.fr"
};

// --- Connexion classique ---
const form = document.querySelector(".login-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const employeeKey = document.getElementById("employee").value;
  const password = document.getElementById("password").value;

  if (!employeeKey) {
    alert("Veuillez sélectionner un employé");
    return;
  }

  const email = employeeEmails[employeeKey];

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Connexion réussie :", email);
    window.location.href = "dashboard.html";
  } catch (error) {
    alert("Erreur de connexion : " + error.message);
  }
});

// --- Gestion du modal reset password ---
const resetBtn = document.getElementById("resetPasswordBtn");
const resetModal = document.getElementById("resetModal");
const closeModal = resetModal.querySelector(".close");
const sendResetBtn = document.getElementById("sendReset");

resetBtn.addEventListener("click", () => {
  resetModal.style.display = "flex";
  resetModal.classList.add("show");
});


closeModal.addEventListener("click", () => {
  resetModal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === resetModal) resetModal.style.display = "none";
});

sendResetBtn.addEventListener("click", async () => {
  const employeeKey = document.getElementById("resetEmployee").value;
  if (!employeeKey) {
    alert("Veuillez sélectionner un employé");
    return;
  }

  const email = employeeEmails[employeeKey];

  try {
    await sendPasswordResetEmail(auth, email);
    alert("Un email de réinitialisation a été envoyé à " + email);
    resetModal.style.display = "none";
  } catch (error) {
    alert("Erreur : " + error.message);
  }
});
