import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, OAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, collection, query, where,
  onSnapshot, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuração Web do Firebase (não é segredo; a proteção está nas regras).
// Copia-a de: Consola Firebase > Definições do projeto > As tuas apps.
// NUNCA coloques aqui Client Secret da Microsoft nem service-account.json.
const firebaseConfig = {
  apiKey: "COLA_AQUI",
  authDomain: "COLA_AQUI.firebaseapp.com",
  projectId: "COLA_AQUI",
  storageBucket: "COLA_AQUI.appspot.com",
  messagingSenderId: "COLA_AQUI",
  appId: "COLA_AQUI"
};

const DOMINIO = "alunos.epbjc.pt";
const TENANT_ID = ""; // opcional: Tenant ID do Microsoft Entra (restringe o login à escola)

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = (id) => document.getElementById(id);
const vistaLogin = $("vista-login");
const vistaApp = $("vista-app");
const sessao = $("sessao");
const erroLogin = $("erro-login");
const listaPedidos = $("lista-pedidos");
const vazio = $("vazio");
const msgForm = $("msg-form");

let cancelarPedidos = null;

// ---------- Autenticação ----------
$("btn-entrar").addEventListener("click", async () => {
  erroLogin.hidden = true;
  const provider = new OAuthProvider("microsoft.com");
  const params = { prompt: "select_account" };
  if (TENANT_ID) params.tenant = TENANT_ID;
  provider.setCustomParameters(params);
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    mostrarErroLogin(traduzirErro(e));
  }
});

$("btn-sair").addEventListener("click", () => signOut(auth));

function emailNormalizado(user) {
  return (user.email || "").toLowerCase();
}

function mostrarErroLogin(texto) {
  erroLogin.textContent = texto;
  erroLogin.hidden = false;
}

function traduzirErro(e) {
  switch (e.code) {
    case "auth/popup-closed-by-user":
      return "Fechaste a janela antes de terminar o login. Tenta outra vez.";
    case "auth/popup-blocked":
      return "O browser bloqueou a janela de login. Permite pop-ups neste site.";
    case "auth/unauthorized-domain":
      return "Este site ainda não está nos domínios autorizados do Firebase.";
    case "auth/operation-not-allowed":
      return "O início de sessão Microsoft não está ativado no Firebase.";
    default:
      return "Não foi possível iniciar sessão (" + (e.code || "erro desconhecido") + ").";
  }
}

// Confirma que o email existe em authorizedUsers com active == true.
// A verificação que realmente protege os dados está nas regras do Firestore;
// esta serve para dar uma mensagem clara ao aluno.
async function estaAutorizado(user) {
  const email = emailNormalizado(user);
  if (!email.endsWith("@" + DOMINIO)) return false;
  try {
    const snap = await getDoc(doc(db, "authorizedUsers", email));
    return snap.exists() && snap.data().active === true;
  } catch (e) {
    return false;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    pararDados();
    vistaApp.hidden = true;
    sessao.hidden = true;
    vistaLogin.hidden = false;
    return;
  }

  if (!(await estaAutorizado(user))) {
    await signOut(auth);
    mostrarErroLogin("Esta conta não está autorizada a requisitar equipamentos.");
    return;
  }

  vistaLogin.hidden = true;
  vistaApp.hidden = false;
  sessao.hidden = false;
  $("nome-utilizador").textContent = user.displayName || user.email;
  iniciarPedidos(user);
});

// ---------- Pedidos (coleção requisicoes) ----------
function iniciarPedidos(user) {
  pararDados();
  // A regra exige que a query filtre pelo uid do próprio utilizador
  const q = query(collection(db, "requisicoes"), where("uid", "==", user.uid));
  cancelarPedidos = onSnapshot(
    q,
    (snap) => {
      const pedidos = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      pedidos.sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0));
      desenharPedidos(pedidos);
    },
    () => {
      vazio.textContent = "Não foi possível carregar os teus pedidos.";
      vazio.hidden = false;
    }
  );
}

function pararDados() {
  if (cancelarPedidos) cancelarPedidos();
  cancelarPedidos = null;
  listaPedidos.replaceChildren();
}

const ESTADOS = {
  "Pendente": "pendente",
  "Em empréstimo": "emprestimo",
  "Devolvido": "devolvido",
  "Recusado": "recusado"
};

function desenharPedidos(pedidos) {
  listaPedidos.replaceChildren();
  vazio.textContent = "Ainda não fizeste nenhum pedido. Preenche o formulário para começar.";
  vazio.hidden = pedidos.length > 0;

  for (const p of pedidos) {
    const classe = ESTADOS[p.estado] || "pendente";

    const li = document.createElement("li");
    li.className = "pedido";
    li.dataset.estado = classe;

    const titulo = document.createElement("strong");
    titulo.textContent = `${p.equipamento || "Equipamento"} · ${p.codigo || ""}`;

    const etiqueta = document.createElement("span");
    etiqueta.className = "estado " + classe;
    etiqueta.textContent = p.estado || "Pendente";

    const datas = document.createElement("span");
    datas.className = "datas";
    datas.textContent = `Pedido a ${p.dataPedido} · devolução prevista a ${p.devolucaoPrevista}`;

    li.append(titulo, etiqueta, datas);

    if (p.observacoes) {
      const obs = document.createElement("span");
      obs.className = "motivo";
      obs.textContent = p.observacoes;
      li.append(obs);
    }
    // textContent em vez de innerHTML: evita injeção de HTML (XSS)
    listaPedidos.append(li);
  }
}

// ---------- Formulário ----------
const hoje = new Date().toISOString().slice(0, 10);
$("data-pedido").value = hoje;
$("data-pedido").min = hoje;
$("devolucao").min = hoje;

$("data-pedido").addEventListener("change", (e) => {
  $("devolucao").min = e.target.value || hoje;
});

function gerarCodigo(dataISO) {
  const letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const sufixo = Array.from(bytes, (b) => letras[b % letras.length]).join("");
  return `REQ-${dataISO.replaceAll("-", "")}-${sufixo}`;
}

$("form-pedido").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  const equipamento = $("equipamento").value;
  const dataPedido = $("data-pedido").value;
  const devolucaoPrevista = $("devolucao").value;
  const observacoes = $("observacoes").value.trim();

  if (!equipamento) return avisar("Escolhe um equipamento.", false);
  if (!dataPedido || !devolucaoPrevista) return avisar("Indica a data do pedido e a devolução prevista.", false);
  if (devolucaoPrevista < dataPedido) return avisar("A devolução não pode ser antes da data do pedido.", false);

  const botao = $("btn-enviar");
  botao.disabled = true;
  try {
    await addDoc(collection(db, "requisicoes"), {
      codigo: gerarCodigo(dataPedido),
      uid: user.uid,
      requisitante: user.displayName || user.email,
      email: emailNormalizado(user),
      equipamento,
      dataPedido,
      devolucaoPrevista,
      estado: "Pendente",
      observacoes,
      criadoEm: serverTimestamp()
    });
    $("form-pedido").reset();
    $("data-pedido").value = hoje;
    avisar("Pedido enviado. Fica pendente até ser analisado.", true);
  } catch (e) {
    avisar(e.code === "permission-denied"
      ? "Sem permissão para enviar o pedido. Confirma a whitelist e as regras do Firestore."
      : "Não foi possível enviar o pedido. Tenta outra vez.", false);
  } finally {
    botao.disabled = false;
  }
});

function avisar(texto, ok) {
  msgForm.textContent = texto;
  msgForm.className = ok ? "ok" : "falha";
}
