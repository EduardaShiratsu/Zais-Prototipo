// =====================================================================
// Configuração do site da Zais.
// Tudo que muda com frequência (horários, valores, contatos) fica aqui.
// Dados de clientes NUNCA ficam neste arquivo: o repositório é público.
// =====================================================================

// Configuração web do Firebase. Não é segredo: quem protege os dados
// são as regras do banco (arquivo firestore.rules).
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA_Vfef4Z8JXDEj970Q4JjNadapNk67uLk",
  authDomain: "reserva-mesas-e6b98.firebaseapp.com",
  projectId: "reserva-mesas-e6b98",
  storageBucket: "reserva-mesas-e6b98.firebasestorage.app",
  messagingSenderId: "662638990559",
  appId: "1:662638990559:web:6fe500487520d1f4a8856a",
};

// Modo demonstração: abra o site com ?demo no endereço.
// Usa dados de mentira, só na memória do navegador. Nada vai para o Firebase.
export const MODO_DEMO = new URLSearchParams(location.search).has("demo");

// O Firebase só entende e-mail. O "usuário" do colaborador vira
// usuario@zais-staff.app por baixo dos panos (nenhum e-mail é enviado).
export const SUFIXO_EMAIL = "@zais-staff.app";

export const FUSO = "America/Sao_Paulo";

export const ZAIS = {
  nome: "Zais",
  slogan: "A casa mais dançante",
  endereco: "Rua Domingos de Morais, 1630",
  bairro: "Vila Mariana, São Paulo",
  referencia: "Ao lado do Metrô Vila Mariana",
  // O primeiro número é o WhatsApp usado nos botões de reserva.
  whatsapp: { rotulo: "(11) 95329-1804", numero: "5511953291804" },
  telefoneFixo: "(11) 5549-5890",
  instagram: "zaisacasamaisdancante",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Rua+Domingos+de+Morais+1630+Vila+Mariana+S%C3%A3o+Paulo",
  extras: "Valet na porta · chapelaria R$ 5",
};

// Horário de funcionamento semanal (0 = domingo ... 6 = sábado).
// A Zais não abre às terças. Quinta: confirme o horário e ajuste aqui.
export const HORARIOS = [
  { dia: 1, nome: "Segunda", horas: "20h às 1h30", curto: "20h–1h30", nota: "Segunda-feira Dançante" },
  { dia: 2, nome: "Terça", horas: "Fechado", curto: "fechado", fechado: true },
  { dia: 3, nome: "Quarta", horas: "21h às 2h", curto: "21h–2h" },
  { dia: 4, nome: "Quinta", horas: "Normalmente 21h às 2h (nem sempre tem baile — veja a programação)", curto: "veja a programação" },
  { dia: 5, nome: "Sexta", horas: "21h às 2h", curto: "21h–2h", nota: "Bailes temáticos" },
  { dia: 6, nome: "Sábado", horas: "Tarde 15h às 20h · Noite 22h às 4h", curto: "15h–20h · 22h–4h", nota: "Bandas ao vivo" },
  { dia: 0, nome: "Domingo", horas: "18h às 23h", curto: "18h–23h", nota: "Gafieira Paulista · aula grátis às 18h" },
];

// Valores padrão (cada baile pode ter os seus; o admin edita na tela do baile).
export const PADROES = {
  tarde: { abre: "15h", fecha: "20h", ingresso: 30, promo: null },
  noite: { abre: "22h", fecha: "4h", ingresso: 45, promo: 35 },
  unico: { abre: "", fecha: "", ingresso: 0, promo: null },
  mesa2: 15,
  mesa4: 30,
};

export const NIVEIS = {
  1: { nome: "Reservas", desc: "Faz reservas. Não cancela nem edita." },
  2: { nome: "Reservas e cancelamentos", desc: "Faz, edita e cancela reservas." },
  3: { nome: "Administrador", desc: "Acesso total: bailes, preços, cativos e equipe." },
};

export const TURNOS = {
  tarde: "Tarde",
  noite: "Noite",
  unico: "Único",
};
