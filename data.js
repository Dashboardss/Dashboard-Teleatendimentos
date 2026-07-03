// ================================================
// DATA – Panorama de Atendimentos 2026
// ================================================

const MONTHS       = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho'];
const MONTHS_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun'];

const MONTHLY_DATA = [
  { month: 'Janeiro',   realizados: 140, naoRealizados: 42, total: 182 },
  { month: 'Fevereiro', realizados: 165, naoRealizados: 40, total: 205 },
  { month: 'Março',     realizados: 210, naoRealizados: 45, total: 255 },
  { month: 'Abril',     realizados: 175, naoRealizados: 38, total: 213 },
  { month: 'Maio',      realizados: 180, naoRealizados: 33, total: 213 },
  { month: 'Junho',     realizados: 148, naoRealizados: 55, total: 203 },
];

// Sums: Camila 120+130+140+110+75+46=621, NR 15+18+12+12+10+12=79, Total 700
// Sums: Priscila 20+35+70+65+105+102=397, NR 27+22+33+26+23+43=174, Total 571
// Monthly totals match MONTHLY_DATA ✓

const PROFESSIONALS = [
  {
    id: 'camila',
    name: 'Dra. Camila Domingos',
    nameShort: 'Camila Domingos',
    role: 'Médica',
    specialty: 'Cardiologista',
    realizados: 621,
    naoRealizados: 79,
    total: 700,
    color: '#7c3aed',
    colorLight: '#ede9fe',
    initials: 'CD',
    monthly: [
      { realizados: 120, naoRealizados: 15 },
      { realizados: 130, naoRealizados: 18 },
      { realizados: 140, naoRealizados: 12 },
      { realizados: 110, naoRealizados: 12 },
      { realizados:  75, naoRealizados: 10 },
      { realizados:  46, naoRealizados: 12 },
    ],
  },
  {
    id: 'priscila',
    name: 'Dra. Priscila Ferreira',
    nameShort: 'Priscila Ferreira',
    role: 'Médica',
    specialty: 'Cardiologista',
    realizados: 397,
    naoRealizados: 174,
    total: 571,
    color: '#2563eb',
    colorLight: '#dbeafe',
    initials: 'PF',
    monthly: [
      { realizados:  20, naoRealizados: 27 },
      { realizados:  35, naoRealizados: 22 },
      { realizados:  70, naoRealizados: 33 },
      { realizados:  65, naoRealizados: 26 },
      { realizados: 105, naoRealizados: 23 },
      { realizados: 102, naoRealizados: 43 },
    ],
  },
];
