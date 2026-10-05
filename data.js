// ================================================
// DATA – Panorama de Atendimentos 2025–2026
// Atualizado em: 2026-10-05 (fonte: ESCALA TELEAUTÔNOMO 2026.xlsx)
// Contagem real de status "Atendido" / "Não Realizado" para todos os profissionais
// ================================================

// Meses em ordem cronológica
const MONTHS = [
  'Outubro/25', 'Novembro/25', 'Dezembro/25',
  'Janeiro/26', 'Fevereiro/26', 'Março/26', 'Abril/26', 'Maio/26', 'Junho/26', 'Julho/26', 'Agosto/26', 'Setembro/26', 'Outubro/26'
];

const MONTHS_SHORT = [
  'Out/25', 'Nov/25', 'Dez/25',
  'Jan/26', 'Fev/26', 'Mar/26', 'Abr/26', 'Mai/26', 'Jun/26', 'Jul/26', 'Ago/26', 'Set/26', 'Out/26'
];

// Totais gerais mensais
const MONTHLY_DATA = [
  { month: 'Outubro/25',  realizados:  53, naoRealizados: 104, total: 157 },
  { month: 'Novembro/25', realizados: 151, naoRealizados: 114, total: 265 },
  { month: 'Dezembro/25', realizados: 126, naoRealizados: 103, total: 229 },
  { month: 'Janeiro/26',  realizados:  72, naoRealizados:  56, total: 128 },
  { month: 'Fevereiro/26',realizados:  68, naoRealizados:  48, total: 116 },
  { month: 'Março/26',    realizados:  88, naoRealizados:  58, total: 146 },
  { month: 'Abril/26',    realizados:  75, naoRealizados:  58, total: 133 },
  { month: 'Maio/26',     realizados:  79, naoRealizados:  46, total: 125 },
  { month: 'Junho/26',    realizados:  72, naoRealizados:  50, total: 122 },
  { month: 'Julho/26',    realizados:  81, naoRealizados:  45, total: 126 },
  { month: 'Agosto/26',   realizados:  93, naoRealizados:  43, total: 136 },
  { month: 'Setembro/26', realizados:  44, naoRealizados:  40, total:  84 },
  { month: 'Outubro/26',  realizados:  18, naoRealizados:  18, total:  36 }
];

const PROFESSIONALS = [
  {
    id: 'camila',
    name: 'Dra. Camila Queiroga',
    nameShort: 'Dra. Camila',
    role: 'Fonoaudióloga',
    specialty: 'Motricidade Orofacial',
    realizados: 200,
    naoRealizados: 210,
    total: 410,
    color: '#1b7a3e',
    colorLight: '#e8f5e9',
    initials: 'C',
    monthly: [
      { realizados:  44, naoRealizados:  84 }, // Out/25
      { realizados:  86, naoRealizados:  68 }, // Nov/25
      { realizados:  70, naoRealizados:  58 }, // Dez/25
      { realizados:   0, naoRealizados:   0 }, // Jan/26
      { realizados:   0, naoRealizados:   0 }, // Fev/26
      { realizados:   0, naoRealizados:   0 }, // Mar/26
      { realizados:   0, naoRealizados:   0 }, // Abr/26
      { realizados:   0, naoRealizados:   0 }, // Mai/26
      { realizados:   0, naoRealizados:   0 }, // Jun/26
      { realizados:   0, naoRealizados:   0 }, // Jul/26
      { realizados:   0, naoRealizados:   0 }, // Ago/26
      { realizados:   0, naoRealizados:   0 }, // Set/26
      { realizados:   0, naoRealizados:   0 }  // Out/26
    ]
  },
  {
    id: 'priscila',
    name: 'Dra. Priscila Ferreira',
    nameShort: 'Dra. Priscila',
    role: 'Psicóloga',
    specialty: 'Terapia Cognitivo-Comportamental',
    realizados: 811,
    naoRealizados: 559,
    total: 1370,
    color: '#2563eb',
    colorLight: '#dbeafe',
    initials: 'P',
    monthly: [
      { realizados:   0, naoRealizados:   6 }, // Out/25
      { realizados:  65, naoRealizados:  46 }, // Nov/25
      { realizados:  56, naoRealizados:  45 }, // Dez/25
      { realizados:  72, naoRealizados:  56 }, // Jan/26
      { realizados:  68, naoRealizados:  48 }, // Fev/26
      { realizados:  88, naoRealizados:  58 }, // Mar/26
      { realizados:  75, naoRealizados:  58 }, // Abr/26
      { realizados:  79, naoRealizados:  46 }, // Mai/26
      { realizados:  72, naoRealizados:  50 }, // Jun/26
      { realizados:  81, naoRealizados:  45 }, // Jul/26
      { realizados:  93, naoRealizados:  43 }, // Ago/26
      { realizados:  44, naoRealizados:  40 }, // Set/26
      { realizados:  18, naoRealizados:  18 }  // Out/26
    ]
  },
  {
    id: 'alice',
    name: 'Dra. Alice Peixoto',
    nameShort: 'Dra. Alice',
    role: 'Médica',
    specialty: 'Cardiologista',
    realizados: 0,
    naoRealizados: 0,
    total: 0,
    color: '#7c3aed',
    colorLight: '#ede9fe',
    initials: 'A',
    monthly: [
      { realizados: 0, naoRealizados: 0 }, // Out/25
      { realizados: 0, naoRealizados: 0 }, // Nov/25
      { realizados: 0, naoRealizados: 0 }, // Dez/25
      { realizados: 0, naoRealizados: 0 }, // Jan/26
      { realizados: 0, naoRealizados: 0 }, // Fev/26
      { realizados: 0, naoRealizados: 0 }, // Mar/26
      { realizados: 0, naoRealizados: 0 }, // Abr/26
      { realizados: 0, naoRealizados: 0 }, // Mai/26
      { realizados: 0, naoRealizados: 0 }, // Jun/26
      { realizados: 0, naoRealizados: 0 }, // Jul/26
      { realizados: 0, naoRealizados: 0 }, // Ago/26
      { realizados: 0, naoRealizados: 0 }, // Set/26
      { realizados: 0, naoRealizados: 0 }  // Out/26
    ]
  },
  {
    id: 'barbara',
    name: 'Dra. Barbara Cavalheiro',
    nameShort: 'Dra. Barbara',
    role: 'Fonoaudióloga',
    specialty: 'Audiologia',
    realizados: 0,
    naoRealizados: 0,
    total: 0,
    color: '#4f46e5',
    colorLight: '#e0e7ff',
    initials: 'B',
    monthly: [
      { realizados: 0, naoRealizados: 0 }, // Out/25
      { realizados: 0, naoRealizados: 0 }, // Nov/25
      { realizados: 0, naoRealizados: 0 }, // Dez/25
      { realizados: 0, naoRealizados: 0 }, // Jan/26
      { realizados: 0, naoRealizados: 0 }, // Fev/26
      { realizados: 0, naoRealizados: 0 }, // Mar/26
      { realizados: 0, naoRealizados: 0 }, // Abr/26
      { realizados: 0, naoRealizados: 0 }, // Mai/26
      { realizados: 0, naoRealizados: 0 }, // Jun/26
      { realizados: 0, naoRealizados: 0 }, // Jul/26
      { realizados: 0, naoRealizados: 0 }, // Ago/26
      { realizados: 0, naoRealizados: 0 }, // Set/26
      { realizados: 0, naoRealizados: 0 }  // Out/26
    ]
  },
  {
    id: 'karizia',
    name: 'Dra. Karizia Bianca',
    nameShort: 'Dra. Karizia',
    role: 'Psicóloga',
    specialty: 'Psicologia Escolar',
    realizados: 0,
    naoRealizados: 0,
    total: 0,
    color: '#0891b2',
    colorLight: '#ecfeff',
    initials: 'K',
    monthly: [
      { realizados: 0, naoRealizados: 0 }, // Out/25
      { realizados: 0, naoRealizados: 0 }, // Nov/25
      { realizados: 0, naoRealizados: 0 }, // Dez/25
      { realizados: 0, naoRealizados: 0 }, // Jan/26
      { realizados: 0, naoRealizados: 0 }, // Fev/26
      { realizados: 0, naoRealizados: 0 }, // Mar/26
      { realizados: 0, naoRealizados: 0 }, // Abr/26
      { realizados: 0, naoRealizados: 0 }, // Mai/26
      { realizados: 0, naoRealizados: 0 }, // Jun/26
      { realizados: 0, naoRealizados: 0 }, // Jul/26
      { realizados: 0, naoRealizados: 0 }, // Ago/26
      { realizados: 0, naoRealizados: 0 }, // Set/26
      { realizados: 0, naoRealizados: 0 }  // Out/26
    ]
  },
  {
    id: 'jessika',
    name: 'Dra. Jessika Tolentino',
    nameShort: 'Dra. Jessika',
    role: 'Terapeuta Ocupacional',
    specialty: 'Integração Sensorial',
    realizados: 4,
    naoRealizados: 4,
    total: 8,
    color: '#db2777',
    colorLight: '#fce7f3',
    initials: 'J',
    monthly: [
      { realizados: 4, naoRealizados: 4 }, // Out/25
      { realizados: 0, naoRealizados: 0 }, // Nov/25
      { realizados: 0, naoRealizados: 0 }, // Dez/25
      { realizados: 0, naoRealizados: 0 }, // Jan/26
      { realizados: 0, naoRealizados: 0 }, // Fev/26
      { realizados: 0, naoRealizados: 0 }, // Mar/26
      { realizados: 0, naoRealizados: 0 }, // Abr/26
      { realizados: 0, naoRealizados: 0 }, // Mai/26
      { realizados: 0, naoRealizados: 0 }, // Jun/26
      { realizados: 0, naoRealizados: 0 }, // Jul/26
      { realizados: 0, naoRealizados: 0 }, // Ago/26
      { realizados: 0, naoRealizados: 0 }, // Set/26
      { realizados: 0, naoRealizados: 0 }  // Out/26
    ]
  },
  {
    id: 'viviane',
    name: 'Dra. Viviane Lima',
    nameShort: 'Dra. Viviane',
    role: 'Fisioterapeuta',
    specialty: 'Fisioterapia Neurofuncional',
    realizados: 5,
    naoRealizados: 10,
    total: 15,
    color: '#059669',
    colorLight: '#d1fae5',
    initials: 'V',
    monthly: [
      { realizados: 5, naoRealizados: 10 }, // Out/25
      { realizados: 0, naoRealizados:  0 }, // Nov/25
      { realizados: 0, naoRealizados:  0 }, // Dez/25
      { realizados: 0, naoRealizados:  0 }, // Jan/26
      { realizados: 0, naoRealizados:  0 }, // Fev/26
      { realizados: 0, naoRealizados:  0 }, // Mar/26
      { realizados: 0, naoRealizados:  0 }, // Abr/26
      { realizados: 0, naoRealizados:  0 }, // Mai/26
      { realizados: 0, naoRealizados:  0 }, // Jun/26
      { realizados: 0, naoRealizados:  0 }, // Jul/26
      { realizados: 0, naoRealizados:  0 }, // Ago/26
      { realizados: 0, naoRealizados:  0 }, // Set/26
      { realizados: 0, naoRealizados:  0 }  // Out/26
    ]
  },
  {
    id: 'vera',
    name: 'Dra. Vera Lucia',
    nameShort: 'Dra. Vera',
    role: 'Assistente Social',
    specialty: 'Saúde Coletiva',
    realizados: 0,
    naoRealizados: 0,
    total: 0,
    color: '#d97706',
    colorLight: '#fef3c7',
    initials: 'VL',
    monthly: [
      { realizados: 0, naoRealizados: 0 }, // Out/25
      { realizados: 0, naoRealizados: 0 }, // Nov/25
      { realizados: 0, naoRealizados: 0 }, // Dez/25
      { realizados: 0, naoRealizados: 0 }, // Jan/26
      { realizados: 0, naoRealizados: 0 }, // Fev/26
      { realizados: 0, naoRealizados: 0 }, // Mar/26
      { realizados: 0, naoRealizados: 0 }, // Abr/26
      { realizados: 0, naoRealizados: 0 }, // Mai/26
      { realizados: 0, naoRealizados: 0 }, // Jun/26
      { realizados: 0, naoRealizados: 0 }, // Jul/26
      { realizados: 0, naoRealizados: 0 }, // Ago/26
      { realizados: 0, naoRealizados: 0 }, // Set/26
      { realizados: 0, naoRealizados: 0 }  // Out/26
    ]
  }
];
