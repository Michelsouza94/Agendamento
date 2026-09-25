const SUPABASE_URL = "https://ezxrcpnkdvnhugpdcjup.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8hZQrzNuLgy6jyZWgYY7cA_q0Njvqjg";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const loginForm = document.getElementById("loginForm");
const mensagem = document.getElementById("mensagem");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  mensagem.textContent = "Entrando...";

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    mensagem.textContent = "E-mail ou senha incorretos.";
    console.error(error);
    return;
  }

  window.location.href = "admin-painel.html";
});
