// login.js
import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

// Associe chaque employé à un email Firebase
const employeeEmails = {
  julien: "julien@bel-angers.fr",
  ludovic: "ludovic@bel-angers.fr",
  justine: "justine@bel-angers.fr",
  yannick: "yannick@bel-angers.fr"
};

const form = document.querySelector(".login-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const employeeKey = document.getElementById("employee").value;
  const password = document.getElementById("password").value;

  if (!employeeKey) {
    alert("Veuillez sélectionner un employé");
    return;
  }

  const email = employeeEmails[employeeKey]; // récupère l'email associé

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Message temporaire
    console.log("✅ Connexion réussie :", email);

    // Redirection vers le tableau de bord
    window.location.href = "dashboard.html";
  } catch (error) {
    alert("❌ Erreur de connexion : " + error.message);
  }
});
