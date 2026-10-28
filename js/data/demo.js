// Modo demonstração: mesma interface do Firebase, mas tudo na memória do navegador.
// Serve para testar o site inteiro sem mexer em nenhum dado real.
import { ocupacaoInicial, reservasDosCativos, validarBaile } from "../dominio.js";
import { hojeISO, diaOperacional, somarDias, diaSemana, idBaile, ordenarBailes } from "../util.js";
import { PADROES } from "../config.js";

const USUARIOS = [
  { uid: "d1", usuario: "admin", senha: "admin", nome: "Admin (demo)", nivel: 3, ativo: true },
  { uid: "d2", usuario: "caixa", senha: "caixa", nome: "Caixa (demo)", nivel: 2, ativo: true },
  { uid: "d3", usuario: "recepcao", senha: "recepcao", nome: "Recepção (demo)", nivel: 1, ativo: true },
];

const clone = (x) => (x === undefined ? x : JSON.parse(JSON.stringify(x)));

function proximoDia(dow, aPartirDe, saltos = 0) {
  let d = aPartirDe;
  while (diaSemana(d) !== dow) d = somarDias(d, 1);
  return somarDias(d, 7 * saltos);
}

export function criarDemo() {
  const S = {
    bailes: {},
    ocup: {},
    reservas: {},
    hist: {},
    cativos: { tarde: {}, noite: {}, unico: {} },
    colabs: clone(USUARIOS),
    sessao: null,
  };
  const ouvintes = new Map();

  const emitir = (chave) => (ouvintes.get(chave) || []).forEach((fn) => fn());
  function ouvir(chave, fn) {
    if (!ouvintes.has(chave)) ouvintes.set(chave, []);
    ouvintes.get(chave).push(fn);
    fn();
    return () => ouvintes.set(chave, ouvintes.get(chave).filter((f) => f !== fn));
  }
  const evento = (id, e) => {
    (S.hist[id] ||= []).push({ id: Math.random().toString(36).slice(2), quando: Date.now(), ...e });
    emitir("hist:" + id);
  };
  const falha = (m) => { throw new Error(m); };

  function inserirBaile(d, ator = { nome: "Sistema" }) {
    validarBaile(d);
    const id = idBaile(d.data, d.turno);
    if (S.bailes[id]) falha("Já existe um baile cadastrado nesta data e turno.");
    const base = PADROES[d.turno] || PADROES.unico;
    S.bailes[id] = {
      id,
      data: d.data,
      turno: d.turno,
      banda: d.banda || "",
      estilo: d.estilo || "",
      abre: d.abre ?? base.abre,
      fecha: d.fecha ?? base.fecha,
      ingresso: d.ingresso ?? base.ingresso,
      promo: d.promo ?? base.promo,
      mesa2: d.mesa2 ?? PADROES.mesa2,
      mesa4: d.mesa4 ?? PADROES.mesa4,
      reservavel: !!d.reservavel,
      obs: d.obs || "",
    };
    if (d.reservavel) {
      const cat = S.cativos[d.turno] || {};
      S.ocup[id] = ocupacaoInicial(cat);
      S.reservas[id] = reservasDosCativos(cat, ator);
      S.hist[id] = [];
    }
    emitir("bailes");
    return id;
  }

  // ---- dados de exemplo ----
  const hoje = hojeISO();
  S.cativos.noite = {
    "01": { nome: "Cativo Exemplo A", telefone: "" },
    "12": { nome: "Cativo Exemplo B", telefone: "(11) 90000-0001" },
    "33": { nome: "Cativo Exemplo C", telefone: "" },
    "45": { nome: "Cativo Exemplo D", telefone: "" },
  };
  S.cativos.tarde = { "50": { nome: "Cativo Exemplo E", telefone: "" } };
  const sab1 = proximoDia(6, hoje, 0);
  const sab2 = proximoDia(6, hoje, 1);
  const sab3 = proximoDia(6, hoje, 2);
  const sistema = { nome: "Sistema" };
  const nSab1 = inserirBaile({ data: sab1, turno: "noite", banda: "Banda Exemplo Um", estilo: "Dança de salão · samba · bolero", reservavel: true }, sistema);
  inserirBaile({ data: sab1, turno: "tarde", banda: "Duo Exemplo", estilo: "Tarde dançante", reservavel: true }, sistema);
  inserirBaile({ data: sab2, turno: "noite", banda: "Banda Exemplo Dois", estilo: "Samba de gafieira", reservavel: true }, sistema);
  inserirBaile({ data: sab3, turno: "noite", banda: "Banda Exemplo Três", estilo: "Pop · MPB", reservavel: true }, sistema);
  inserirBaile({ data: somarDias(sab1, -1), turno: "unico", banda: "Noite de Boleros (exemplo)", estilo: "Baile temático", abre: "21h", fecha: "2h", ingresso: 30, reservavel: false }, sistema);
  inserirBaile({ data: somarDias(sab1, 1), turno: "unico", banda: "Gafieira Paulista (exemplo)", estilo: "Aula grátis às 18h", abre: "18h", fecha: "23h", ingresso: 0, reservavel: false }, sistema);

  // Algumas reservas de mentira no primeiro sábado à noite.
  const ator = { uid: "d2", nome: "Caixa (demo)" };
  const reservasDemo = [["05", "Maria Souza", "(11) 90000-1111", "Aniversário"], ["20", "João Pereira", "", ""], ["48", "Ana Lima", "(11) 90000-2222", "Chega às 23h"]];
  for (const [m, nome, tel, obs] of reservasDemo) {
    S.ocup[nSab1].mesas[m] = "reservada";
    S.reservas[nSab1][m] = { mesa: m, nome, telefone: tel, obs, tipo: "normal", pago: true, por: ator.nome, quando: Date.now() - 3600e3 };
    evento(nSab1, { mesa: m, acao: "reservou", nome, detalhe: "", por: ator.nome });
  }
  S.ocup[nSab1].mesas["57"] = "pendente";
  S.reservas[nSab1]["57"] = { mesa: "57", nome: "Carlos Rocha", telefone: "", obs: "Pix a confirmar", tipo: "normal", pago: false, por: ator.nome, quando: Date.now() - 1800e3 };
  evento(nSab1, { mesa: "57", acao: "reservou", nome: "Carlos Rocha", detalhe: "Aguardando pagamento", por: ator.nome });

  // ---- API ----
  const api = {
    modo: "demo",

    observarSessao(cb) {
      try {
        const uid = sessionStorage.getItem("zais-demo-uid");
        if (uid && !S.sessao) {
          const u = S.colabs.find((c) => c.uid === uid);
          if (u) S.sessao = { uid: u.uid, usuario: u.usuario, nome: u.nome, nivel: u.nivel };
        }
      } catch { /* ignora */ }
      return ouvir("sessao", () => cb(S.sessao ? { ...S.sessao } : null));
    },
    async entrar(usuario, senha) {
      const u = S.colabs.find((c) => c.usuario === String(usuario).trim().toLowerCase());
      if (!u || u.senha !== senha) falha("Usuário ou senha incorretos.");
      if (!u.ativo) falha("Este acesso está desativado.");
      S.sessao = { uid: u.uid, usuario: u.usuario, nome: u.nome, nivel: u.nivel };
      try { sessionStorage.setItem("zais-demo-uid", u.uid); } catch { /* ignora */ }
      emitir("sessao");
      return { ...S.sessao };
    },
    async sair() {
      S.sessao = null;
      try { sessionStorage.removeItem("zais-demo-uid"); } catch { /* ignora */ }
      emitir("sessao");
    },

    ouvirBailes(cb, { de } = {}) {
      const inicio = de || diaOperacional();
      return ouvir("bailes", () => cb(ordenarBailes(Object.values(S.bailes).filter((b) => b.data >= inicio)).map(clone)));
    },
    ouvirBaile(id, cb) {
      return ouvir("bailes", () => cb(clone(S.bailes[id]) || null));
    },
    ouvirOcupacao(id, cb) {
      return ouvir("ocup:" + id, () => cb(S.ocup[id] ? { ...S.ocup[id].mesas } : null));
    },
    async buscarBailesAnteriores(n = 20) {
      const h = diaOperacional();
      return ordenarBailes(Object.values(S.bailes).filter((b) => b.data < h)).reverse().slice(0, n).map(clone);
    },

    async criarBaile(d, ator) {
      return inserirBaile(d, ator);
    },
    async atualizarBaile(id, d) {
      const b = S.bailes[id] || falha("Baile não encontrado.");
      for (const k of ["banda", "estilo", "abre", "fecha", "ingresso", "promo", "mesa2", "mesa4", "obs"]) {
        if (k in d) b[k] = d[k];
      }
      emitir("bailes");
    },

    ouvirReservas(id, cb) {
      return ouvir("ocup:" + id, () => cb(clone(S.reservas[id] || {})));
    },
    ouvirHistorico(id, cb) {
      return ouvir("hist:" + id, () => cb(clone(S.hist[id] || []).sort((a, b) => b.quando - a.quando)));
    },

    async reservar(id, mesa, d, ator) {
      const oc = S.ocup[id] || falha("Este baile não aceita reservas de mesa.");
      if (oc.mesas[mesa] !== "livre") falha("Esta mesa não está livre. Outra pessoa pode ter acabado de reservar.");
      const nome = (d.nome || "").trim();
      if (!nome) falha("Informe o nome.");
      oc.mesas[mesa] = d.pendente ? "pendente" : "reservada";
      S.reservas[id][mesa] = { mesa, nome, telefone: (d.telefone || "").trim(), obs: (d.obs || "").trim(), tipo: "normal", pago: !d.pendente, por: ator.nome, quando: Date.now() };
      evento(id, { mesa, acao: "reservou", nome, detalhe: d.pendente ? "Aguardando pagamento" : "", por: ator.nome });
      emitir("ocup:" + id);
    },
    async editarReserva(id, mesa, d, ator) {
      const r = (S.reservas[id] || {})[mesa] || falha("Não há reserva nesta mesa.");
      const nome = (d.nome || "").trim();
      if (!nome) falha("Informe o nome.");
      const antes = r.nome;
      Object.assign(r, { nome, telefone: (d.telefone || "").trim(), obs: (d.obs || "").trim() });
      evento(id, { mesa, acao: "editou", nome, detalhe: antes !== nome ? `Nome anterior: ${antes}` : "", por: ator.nome });
      emitir("ocup:" + id);
    },
    async confirmarPagamento(id, mesa, ator) {
      const oc = S.ocup[id] || falha("Baile sem mesas.");
      if (oc.mesas[mesa] !== "pendente") falha("Esta mesa não está aguardando pagamento.");
      oc.mesas[mesa] = "reservada";
      S.reservas[id][mesa].pago = true;
      evento(id, { mesa, acao: "confirmou pagamento", nome: S.reservas[id][mesa].nome, detalhe: "", por: ator.nome });
      emitir("ocup:" + id);
    },
    async cancelarReserva(id, mesa, ator) {
      const oc = S.ocup[id] || falha("Baile sem mesas.");
      if (!["reservada", "pendente", "cativa"].includes(oc.mesas[mesa])) falha("Não há reserva para cancelar nesta mesa.");
      const r = S.reservas[id][mesa] || {};
      oc.mesas[mesa] = "livre";
      delete S.reservas[id][mesa];
      evento(id, { mesa, acao: r.tipo === "cativo" ? "removeu cativo" : "cancelou", nome: r.nome || "", detalhe: r.tipo === "cativo" ? "Só neste baile" : "", por: ator.nome });
      emitir("ocup:" + id);
    },
    async definirBloqueio(id, mesa, bloquear, ator) {
      const oc = S.ocup[id] || falha("Baile sem mesas.");
      if (bloquear && oc.mesas[mesa] !== "livre") falha("Só dá para bloquear uma mesa livre.");
      if (!bloquear && oc.mesas[mesa] !== "bloqueada") falha("A mesa não está bloqueada.");
      oc.mesas[mesa] = bloquear ? "bloqueada" : "livre";
      evento(id, { mesa, acao: bloquear ? "bloqueou" : "liberou", nome: "", detalhe: "", por: ator.nome });
      emitir("ocup:" + id);
    },
    async aplicarCativos(id, ator) {
      const b = S.bailes[id] || falha("Baile não encontrado.");
      const oc = S.ocup[id] || falha("Baile sem mesas.");
      const cat = S.cativos[b.turno] || {};
      let qtd = 0;
      for (const [m, r] of Object.entries(reservasDosCativos(cat, ator))) {
        if (oc.mesas[m] === "livre" || oc.mesas[m] === "bloqueada") {
          oc.mesas[m] = "cativa";
          S.reservas[id][m] = { ...r, quando: Date.now() };
          evento(id, { mesa: m, acao: "aplicou cativo", nome: r.nome, detalhe: "", por: ator.nome });
          qtd++;
        }
      }
      emitir("ocup:" + id);
      return qtd;
    },

    async lerCativos(turno) {
      return clone(S.cativos[turno] || {});
    },
    async salvarCativos(turno, mapa) {
      S.cativos[turno] = clone(mapa);
    },

    ouvirColaboradores(cb) {
      return ouvir("colabs", () => cb(S.colabs.map(({ senha, ...c }) => ({ ...c }))));
    },
    async criarColaborador({ nome, usuario, senha, nivel }) {
      const u = String(usuario || "").trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,}$/.test(u)) falha("Usuário: use letras minúsculas, números, ponto, traço ou _ (mínimo 3).");
      if ((senha || "").length < 6) falha("A senha precisa ter pelo menos 6 caracteres.");
      if (S.colabs.some((c) => c.usuario === u)) falha("Já existe um colaborador com este usuário.");
      S.colabs.push({ uid: "d" + Date.now(), usuario: u, senha, nome: nome.trim() || u, nivel: Number(nivel), ativo: true });
      emitir("colabs");
    },
    async atualizarColaborador(uid, d) {
      const c = S.colabs.find((x) => x.uid === uid) || falha("Colaborador não encontrado.");
      if ("nivel" in d) c.nivel = Number(d.nivel);
      if ("ativo" in d) c.ativo = !!d.ativo;
      if ("nome" in d) c.nome = d.nome;
      emitir("colabs");
    },
  };
  return api;
}
