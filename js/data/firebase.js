// Dados reais: Firebase (plano gratuito) com Firestore + Authentication.
//
// Estrutura no Firestore:
//   bailes/{AAAA-MM-DD_turno}                 dados públicos do baile
//   ocupacao/{idBaile}                        { mesas: { "01": "livre", ... } } (público, sem nomes)
//   bailes/{id}/reservas/{mesa}               nome, telefone, obs (só equipe)
//   bailes/{id}/historico/{auto}              tudo que a equipe fez (só equipe)
//   cativos/{turno}                           { mesas: { "01": {nome, telefone} } } modelo (só equipe)
//   colaboradores/{uid}                       { nome, usuario, nivel, ativo }
import { FIREBASE_CONFIG, SUFIXO_EMAIL, PADROES } from "../config.js";
import { ocupacaoInicial, reservasDosCativos, validarBaile } from "../dominio.js";
import { diaOperacional, idBaile, ordenarBailes } from "../util.js";

const V = "10.12.2";
const base = `https://www.gstatic.com/firebasejs/${V}`;
const { initializeApp, deleteApp } = await import(`${base}/firebase-app.js`);
const {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword,
} = await import(`${base}/firebase-auth.js`);
const {
  getFirestore, doc, collection, getDoc, getDocs, setDoc, updateDoc, onSnapshot, query, where,
  orderBy, limit, runTransaction, writeBatch, serverTimestamp,
} = await import(`${base}/firebase-firestore.js`);

function traduzir(e) {
  const c = (e && e.code) || "";
  if (c.includes("permission-denied")) return "Sem permissão para esta ação.";
  if (c.includes("unavailable") || c === "auth/network-request-failed") return "Sem conexão. Confira a internet e tente de novo.";
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-email"].includes(c)) return "Usuário ou senha incorretos.";
  if (c === "auth/too-many-requests") return "Muitas tentativas. Aguarde um pouco e tente de novo.";
  if (c === "auth/email-already-in-use") return "Já existe um colaborador com este usuário.";
  if (c === "auth/weak-password") return "A senha precisa ter pelo menos 6 caracteres.";
  if (c === "auth/operation-not-allowed") return "O login por e-mail/senha não está ativado no Firebase.";
  return (e && e.message) || "Algo deu errado. Tente de novo.";
}

const falha = (m) => { throw new Error(m); };
const numero = (v, padrao = null) => (v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? padrao : Number(v));
const ms = (t) => (t && typeof t.toMillis === "function" ? t.toMillis() : 0);

export function criarFirebase() {
  const app = initializeApp(FIREBASE_CONFIG);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const refBaile = (id) => doc(db, "bailes", id);
  const refOcup = (id) => doc(db, "ocupacao", id);
  const refReserva = (id, mesa) => doc(db, "bailes", id, "reservas", mesa);
  const novoEvento = (id) => doc(collection(db, "bailes", id, "historico"));

  async function perfil(uid) {
    const s = await getDoc(doc(db, "colaboradores", uid));
    return s.exists() ? s.data() : null;
  }

  const api = {
    modo: "firebase",

    // ---------- sessão ----------
    observarSessao(cb) {
      return onAuthStateChanged(auth, async (user) => {
        if (!user) return cb(null);
        try {
          const p = await perfil(user.uid);
          if (!p || p.ativo !== true) { await signOut(auth); return cb(null); }
          cb({ uid: user.uid, usuario: p.usuario, nome: p.nome || p.usuario, nivel: Number(p.nivel) });
        } catch (e) {
          console.error(e);
          cb(null);
        }
      });
    },
    async entrar(usuario, senha) {
      const u = String(usuario || "").trim().toLowerCase();
      if (!u || !senha) falha("Informe usuário e senha.");
      const cred = await signInWithEmailAndPassword(auth, u + SUFIXO_EMAIL, senha);
      const p = await perfil(cred.user.uid);
      if (!p || p.ativo !== true) {
        await signOut(auth);
        falha("Seu acesso ainda não foi liberado. Fale com o administrador.");
      }
      return { uid: cred.user.uid, usuario: p.usuario, nome: p.nome || p.usuario, nivel: Number(p.nivel) };
    },
    async sair() {
      await signOut(auth);
    },

    // ---------- bailes (público) ----------
    ouvirBailes(cb, { de } = {}) {
      const q = query(collection(db, "bailes"), where("data", ">=", de || diaOperacional()), orderBy("data"), limit(60));
      return onSnapshot(
        q,
        (snap) => cb(ordenarBailes(snap.docs.map((d) => ({ id: d.id, ...d.data() })))),
        (err) => { console.error(err); cb(null, err); }
      );
    },
    ouvirBaile(id, cb) {
      return onSnapshot(
        refBaile(id),
        (s) => cb(s.exists() ? { id: s.id, ...s.data() } : null),
        (err) => { console.error(err); cb(null, err); }
      );
    },
    ouvirOcupacao(id, cb) {
      return onSnapshot(
        refOcup(id),
        (s) => cb(s.exists() ? s.data().mesas || {} : null),
        (err) => { console.error(err); cb(null, err); }
      );
    },
    async buscarBailesAnteriores(n = 20) {
      const q = query(collection(db, "bailes"), where("data", "<", diaOperacional()), orderBy("data", "desc"), limit(n));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    // ---------- bailes (administrador) ----------
    async criarBaile(d, ator) {
      validarBaile(d);
      const id = idBaile(d.data, d.turno);
      if ((await getDoc(refBaile(id))).exists()) falha("Já existe um baile cadastrado nesta data e turno.");
      const padrao = PADROES[d.turno] || PADROES.unico;
      const batch = writeBatch(db);
      batch.set(refBaile(id), {
        data: d.data,
        turno: d.turno,
        banda: (d.banda || "").trim(),
        estilo: (d.estilo || "").trim(),
        abre: d.abre ?? padrao.abre,
        fecha: d.fecha ?? padrao.fecha,
        ingresso: numero(d.ingresso, padrao.ingresso),
        promo: numero(d.promo, padrao.promo),
        mesa2: numero(d.mesa2, PADROES.mesa2),
        mesa4: numero(d.mesa4, PADROES.mesa4),
        reservavel: !!d.reservavel,
        obs: (d.obs || "").trim(),
        criadoPor: ator.nome,
        criadoEm: serverTimestamp(),
      });
      if (d.reservavel) {
        const cativos = await api.lerCativos(d.turno);
        batch.set(refOcup(id), ocupacaoInicial(cativos));
        for (const [m, r] of Object.entries(reservasDosCativos(cativos, ator))) {
          batch.set(refReserva(id, m), { ...r, quando: serverTimestamp() });
        }
      }
      await batch.commit();
      return id;
    },
    async atualizarBaile(id, d) {
      const campos = {};
      for (const k of ["banda", "estilo", "abre", "fecha", "obs"]) if (k in d) campos[k] = String(d[k] ?? "").trim();
      for (const k of ["ingresso", "promo", "mesa2", "mesa4"]) if (k in d) campos[k] = numero(d[k], null);
      await updateDoc(refBaile(id), campos);
    },

    // ---------- reservas (equipe) ----------
    ouvirReservas(id, cb) {
      return onSnapshot(
        collection(db, "bailes", id, "reservas"),
        (snap) => {
          const o = {};
          snap.forEach((d) => {
            const v = d.data({ serverTimestamps: "estimate" });
            o[d.id] = { ...v, quando: ms(v.quando) };
          });
          cb(o);
        },
        (err) => { console.error(err); cb(null, err); }
      );
    },
    ouvirHistorico(id, cb) {
      return onSnapshot(
        collection(db, "bailes", id, "historico"),
        (snap) => {
          const lista = snap.docs.map((d) => {
            const v = d.data({ serverTimestamps: "estimate" });
            return { id: d.id, ...v, quando: ms(v.quando) };
          });
          cb(lista.sort((a, b) => b.quando - a.quando));
        },
        (err) => { console.error(err); cb(null, err); }
      );
    },

    async reservar(id, mesa, d, ator) {
      const nome = (d.nome || "").trim();
      if (!nome) falha("Informe o nome.");
      await runTransaction(db, async (tx) => {
        const oc = await tx.get(refOcup(id));
        if (!oc.exists()) falha("Este baile não aceita reservas de mesa.");
        if ((oc.data().mesas || {})[mesa] !== "livre") falha("Esta mesa não está livre. Outra pessoa pode ter acabado de reservar.");
        tx.update(refOcup(id), { [`mesas.${mesa}`]: d.pendente ? "pendente" : "reservada" });
        tx.set(refReserva(id, mesa), {
          mesa, nome, telefone: (d.telefone || "").trim(), obs: (d.obs || "").trim(),
          tipo: "normal", pago: !d.pendente, por: ator.nome, porUid: ator.uid, quando: serverTimestamp(),
        });
        tx.set(novoEvento(id), {
          mesa, acao: "reservou", nome, detalhe: d.pendente ? "Aguardando pagamento" : "",
          por: ator.nome, porUid: ator.uid, quando: serverTimestamp(),
        });
      });
    },
    async editarReserva(id, mesa, d, ator) {
      const nome = (d.nome || "").trim();
      if (!nome) falha("Informe o nome.");
      await runTransaction(db, async (tx) => {
        const r = await tx.get(refReserva(id, mesa));
        if (!r.exists()) falha("Não há reserva nesta mesa.");
        const antes = r.data().nome;
        tx.update(refReserva(id, mesa), { nome, telefone: (d.telefone || "").trim(), obs: (d.obs || "").trim() });
        tx.set(novoEvento(id), {
          mesa, acao: "editou", nome, detalhe: antes !== nome ? `Nome anterior: ${antes}` : "",
          por: ator.nome, porUid: ator.uid, quando: serverTimestamp(),
        });
      });
    },
    async confirmarPagamento(id, mesa, ator) {
      await runTransaction(db, async (tx) => {
        const oc = await tx.get(refOcup(id));
        const r = await tx.get(refReserva(id, mesa));
        if (!oc.exists() || (oc.data().mesas || {})[mesa] !== "pendente") falha("Esta mesa não está aguardando pagamento.");
        tx.update(refOcup(id), { [`mesas.${mesa}`]: "reservada" });
        tx.update(refReserva(id, mesa), { pago: true });
        tx.set(novoEvento(id), {
          mesa, acao: "confirmou pagamento", nome: r.exists() ? r.data().nome : "", detalhe: "",
          por: ator.nome, porUid: ator.uid, quando: serverTimestamp(),
        });
      });
    },
    async cancelarReserva(id, mesa, ator) {
      await runTransaction(db, async (tx) => {
        const oc = await tx.get(refOcup(id));
        const r = await tx.get(refReserva(id, mesa));
        const atual = oc.exists() ? (oc.data().mesas || {})[mesa] : null;
        if (!["reservada", "pendente", "cativa"].includes(atual)) falha("Não há reserva para cancelar nesta mesa.");
        const dados = r.exists() ? r.data() : {};
        tx.update(refOcup(id), { [`mesas.${mesa}`]: "livre" });
        if (r.exists()) tx.delete(refReserva(id, mesa));
        tx.set(novoEvento(id), {
          mesa, acao: dados.tipo === "cativo" ? "removeu cativo" : "cancelou", nome: dados.nome || "",
          detalhe: dados.tipo === "cativo" ? "Só neste baile" : "",
          por: ator.nome, porUid: ator.uid, quando: serverTimestamp(),
        });
      });
    },
    async definirBloqueio(id, mesa, bloquear, ator) {
      await runTransaction(db, async (tx) => {
        const oc = await tx.get(refOcup(id));
        const atual = oc.exists() ? (oc.data().mesas || {})[mesa] : null;
        if (bloquear && atual !== "livre") falha("Só dá para bloquear uma mesa livre.");
        if (!bloquear && atual !== "bloqueada") falha("A mesa não está bloqueada.");
        tx.update(refOcup(id), { [`mesas.${mesa}`]: bloquear ? "bloqueada" : "livre" });
        tx.set(novoEvento(id), {
          mesa, acao: bloquear ? "bloqueou" : "liberou", nome: "", detalhe: "",
          por: ator.nome, porUid: ator.uid, quando: serverTimestamp(),
        });
      });
    },
    async aplicarCativos(id, ator) {
      const b = await getDoc(refBaile(id));
      if (!b.exists()) falha("Baile não encontrado.");
      const novos = reservasDosCativos(await api.lerCativos(b.data().turno), ator);
      let qtd = 0;
      await runTransaction(db, async (tx) => {
        qtd = 0;
        const oc = await tx.get(refOcup(id));
        if (!oc.exists()) falha("Este baile não tem mesas.");
        const mesas = oc.data().mesas || {};
        const upd = {};
        for (const [m, r] of Object.entries(novos)) {
          if (mesas[m] === "livre" || mesas[m] === "bloqueada") {
            upd[`mesas.${m}`] = "cativa";
            tx.set(refReserva(id, m), { ...r, quando: serverTimestamp() });
            tx.set(novoEvento(id), {
              mesa: m, acao: "aplicou cativo", nome: r.nome, detalhe: "",
              por: ator.nome, porUid: ator.uid, quando: serverTimestamp(),
            });
            qtd++;
          }
        }
        if (qtd) tx.update(refOcup(id), upd);
      });
      return qtd;
    },

    // ---------- modelo de cativos (administrador) ----------
    async lerCativos(turno) {
      const s = await getDoc(doc(db, "cativos", turno));
      return s.exists() ? s.data().mesas || {} : {};
    },
    async salvarCativos(turno, mapa) {
      await setDoc(doc(db, "cativos", turno), { mesas: mapa });
    },

    // ---------- equipe (administrador) ----------
    ouvirColaboradores(cb) {
      return onSnapshot(
        collection(db, "colaboradores"),
        (snap) => cb(snap.docs.map((d) => ({ uid: d.id, ...d.data() })).sort((a, b) => String(a.nome).localeCompare(String(b.nome)))),
        (err) => { console.error(err); cb(null, err); }
      );
    },
    async criarColaborador({ nome, usuario, senha, nivel }) {
      const u = String(usuario || "").trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,}$/.test(u)) falha("Usuário: use letras minúsculas, números, ponto, traço ou _ (mínimo 3).");
      if ((senha || "").length < 6) falha("A senha precisa ter pelo menos 6 caracteres.");
      // App secundário: criar a conta não derruba a sessão do administrador.
      const sec = initializeApp(FIREBASE_CONFIG, "sec-" + Date.now());
      try {
        const a2 = getAuth(sec);
        const cred = await createUserWithEmailAndPassword(a2, u + SUFIXO_EMAIL, senha);
        await setDoc(doc(db, "colaboradores", cred.user.uid), {
          nome: (nome || "").trim() || u, usuario: u, nivel: Number(nivel), ativo: true, criadoEm: serverTimestamp(),
        });
        await signOut(a2);
      } finally {
        await deleteApp(sec);
      }
    },
    async atualizarColaborador(uid, d) {
      const campos = {};
      if ("nivel" in d) campos.nivel = Number(d.nivel);
      if ("ativo" in d) campos.ativo = !!d.ativo;
      if ("nome" in d) campos.nome = String(d.nome).trim();
      await updateDoc(doc(db, "colaboradores", uid), campos);
    },
  };

  // Traduz os erros do Firebase para mensagens em português.
  const comTraducao = ["entrar", "sair", "criarBaile", "atualizarBaile", "reservar", "editarReserva", "confirmarPagamento",
    "cancelarReserva", "definirBloqueio", "aplicarCativos", "lerCativos", "salvarCativos", "criarColaborador",
    "atualizarColaborador", "buscarBailesAnteriores"];
  for (const nome of comTraducao) {
    const original = api[nome].bind(api);
    api[nome] = async (...args) => {
      try {
        return await original(...args);
      } catch (e) {
        console.error(e);
        throw new Error(traduzir(e));
      }
    };
  }
  return api;
}
