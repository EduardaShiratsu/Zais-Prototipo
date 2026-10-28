// Planta real do salão da Zais (as mesmas posições do mapa do ReservaMesas).
// Coordenadas no espaço do SVG (viewBox abaixo). Cada mesa mede 40x40.

export const VIEWBOX = { x: 10, y: 14, w: 980, h: 836 };
export const MESA = 40;

const POS = {
  "01": [720, 40], "02": [670, 40], "03": [620, 40], "04": [570, 40], "05": [520, 40], "06": [470, 40],
  "07": [420, 40], "08": [370, 40], "09": [320, 40], "10": [270, 40], "11": [220, 40], "12": [170, 40], "13": [120, 40],
  "14": [50, 110], "15": [50, 170], "16": [40, 240], "17": [40, 340], "18": [100, 340], "19": [110, 240], "20": [140, 180],
  "21": [260, 120], "22": [310, 120], "32": [240, 180], "31": [290, 180], "30": [340, 180],
  "23": [490, 120], "24": [540, 120], "25": [590, 120], "29": [490, 180], "28": [540, 180], "27": [590, 180],
  "26": [790, 180],
  "33": [250, 270], "34": [300, 270], "35": [350, 270], "36": [430, 300],
  "37": [480, 280], "38": [530, 280], "39": [580, 280], "40": [630, 280], "41": [680, 280], "42": [730, 280],
  "52": [250, 360], "51": [300, 360], "50": [350, 360], "49": [450, 380], "48": [500, 360], "47": [550, 360], "46": [600, 360],
  "45": [650, 360], "44": [700, 360], "43": [750, 360],
  "93": [50, 540], "85": [130, 540], "84": [210, 540],
  "94": [50, 610], "86": [130, 610], "83": [210, 610],
  "95": [50, 680], "87": [130, 680], "82": [210, 680],
  "97": [50, 780], "89": [130, 780], "88": [210, 780],
  "53": [290, 540], "54": [360, 540], "55": [430, 540],
  "71": [290, 610], "70": [360, 610], "69": [430, 610],
  "72": [290, 680], "73": [360, 680],
  "81": [290, 780], "80": [360, 780],
  "79": [430, 780], "78": [500, 780], "77": [570, 780], "76": [640, 780], "75": [710, 780], "74": [780, 780],
  "56": [480, 560], "57": [550, 580], "58": [620, 580], "59": [690, 580], "60": [760, 580],
  "68": [460, 640], "67": [550, 640], "66": [620, 640], "65": [690, 640],
  "98": [780, 680], "99": [850, 680], "100": [920, 680],
  "63": [780, 750], "62": [850, 750], "61": [920, 750],
};

// Lugares por mesa.
const LUGARES = {
  "01": 4, "02": 2, "03": 2, "04": 2, "05": 2, "06": 2, "07": 2, "08": 2, "09": 2, "10": 2,
  "11": 2, "12": 2, "13": 2, "14": 2, "15": 2, "16": 4, "17": 2, "18": 2, "19": 4, "20": 2,
  "21": 2, "22": 2, "23": 2, "24": 2, "25": 2, "26": 2, "27": 2, "28": 2, "29": 2, "30": 2,
  "31": 4, "32": 4, "33": 4, "34": 4, "35": 4, "36": 2, "37": 2, "38": 2, "39": 2, "40": 2,
  "41": 2, "42": 2, "43": 4, "44": 4, "45": 4, "46": 4, "47": 4, "48": 4, "49": 4, "50": 4,
  "51": 4, "52": 4, "53": 4, "54": 4, "55": 4, "56": 4, "57": 4, "58": 4, "59": 4, "60": 4,
  "61": 4, "62": 4, "63": 4, "65": 2, "66": 2, "67": 2, "68": 4, "69": 4, "70": 4,
  "71": 2, "72": 4, "73": 4, "74": 2, "75": 2, "76": 2, "77": 2, "78": 2, "79": 2, "80": 2,
  "81": 2, "82": 4, "83": 4, "84": 4, "85": 4, "86": 4, "87": 4, "88": 2, "89": 2, "90": 2,
  "91": 2, "92": 2, "93": 4, "94": 4, "95": 4, "96": 4, "97": 2, "98": 4, "99": 4, "100": 4,
};

// Números que existiam na grade do sistema antigo mas não aparecem na planta.
// Ficam fora do mapa e bloqueados por padrão (o admin pode liberar na tela do baile).
export const EXTRAS = ["90", "91", "92", "96"];

// Mesas que a casa mantém bloqueadas por padrão.
export const BLOQUEADAS_PADRAO = ["26", ...EXTRAS];

// Zonas usadas na navegação do mapa e na lista.
export const ZONAS = [
  { id: "parede", nome: "Parede", mesas: range(1, 13) },
  { id: "esquerda", nome: "Lado esquerdo", mesas: range(14, 20) },
  { id: "centro", nome: "Salão central", mesas: [...range(21, 35), ...range(50, 52)] },
  { id: "pista-cima", nome: "Pista (em cima)", mesas: range(36, 49) },
  { id: "pista-baixo", nome: "Pista (embaixo)", mesas: [...range(56, 60), ...range(65, 68)] },
  { id: "fundo", nome: "Fundo do salão", mesas: [...range(53, 55), ...range(69, 81)] },
  { id: "entrada", nome: "Entrada", mesas: [...range(82, 89), ...range(93, 97)] },
  { id: "palco", nome: "Perto do palco", mesas: [...range(61, 63), ...range(98, 100)] },
];

function range(a, b) {
  const r = [];
  for (let i = a; i <= b; i++) r.push(String(i).padStart(2, "0"));
  return r;
}

const zonaDe = {};
for (const z of ZONAS) for (const n of z.mesas) zonaDe[n] = z.id;

// Lista final das mesas que existem no mapa.
export const MESAS = Object.keys(POS)
  .sort((a, b) => Number(a) - Number(b))
  .map((n) => ({
    n,
    x: POS[n][0],
    y: POS[n][1],
    lugares: LUGARES[n] || 2,
    zona: zonaDe[n] || "centro",
  }));

export const MESA_POR_NUMERO = Object.fromEntries(MESAS.map((m) => [m.n, m]));

// Todas as mesas que existem nos dados (mapa + extras fora do mapa).
export const TODAS = [
  ...MESAS.map((m) => m.n),
  ...EXTRAS,
].sort((a, b) => Number(a) - Number(b));

// Centro e tamanho de cada zona (para o botão "ir para a zona" do mapa).
export const ZONA_GEO = Object.fromEntries(
  ZONAS.map((z) => {
    const ms = z.mesas.map((n) => MESA_POR_NUMERO[n]).filter(Boolean);
    const xs = ms.map((m) => m.x), ys = ms.map((m) => m.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs) + MESA;
    const y0 = Math.min(...ys), y1 = Math.max(...ys) + MESA;
    return [z.id, { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 }];
  })
);

export function lugaresDe(n) {
  return LUGARES[n] || 2;
}

export function zonaDaMesa(n) {
  return zonaDe[n] || "extras";
}
