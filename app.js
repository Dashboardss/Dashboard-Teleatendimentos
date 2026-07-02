'use strict';
/* ============================================================
   APP.JS – SPA Dashboard – Panorama de Atendimentos 2026
   Pages: Overview | Professionals | Reports | Settings
   ============================================================ */

/* ============================================================
   1. CHART REGISTRY
   ============================================================ */
const Charts = {
  instances: {},
  add(id, c)  { this.instances[id] = c; },
  get(id)     { return this.instances[id]; },
  destroy(id) { if (this.instances[id]) { this.instances[id].destroy(); delete this.instances[id]; } },
  destroyAll() { Object.keys(this.instances).forEach(id => this.destroy(id)); },
};
window.Charts = Charts;

/* ============================================================
   2. CHART DEFAULTS & CONSTANTS
   ============================================================ */
Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.color        = '#475569';
Chart.defaults.plugins.tooltip.padding      = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.displayColors = true;

const C = {
  green:      '#22c55e',
  greenDark:  '#16a34a',
  red:        '#ef4444',
  redDark:    '#dc2626',
  blue:       '#3b82f6',
  purple:     '#8b5cf6',
  grid:       'rgba(226,232,240,.8)',
  gridDark:   'rgba(48,54,61,.8)',
};
function gridColor() {
  return document.body.classList.contains('dark-mode') ? C.gridDark : C.grid;
}
function textColor() {
  return document.body.classList.contains('dark-mode') ? '#8b949e' : '#475569';
}

/* ============================================================
   3. UTILITIES
   ============================================================ */
function pct(a, b)  { return b ? ((a / b) * 100).toFixed(1) : '0.0'; }
function fmtN(n)    { return Number(n).toLocaleString('pt-BR'); }

function animateCount(el) {
  const target = parseInt(el.dataset.target, 10);
  if (isNaN(target)) return;
  const dur = 1300;
  const t0  = performance.now();
  function step(now) {
    const prog = Math.min((now - t0) / dur, 1);
    const ease = 1 - Math.pow(1 - prog, 3);
    el.textContent = Math.round(ease * target).toLocaleString('pt-BR');
    if (prog < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function observeCounters(scope = document) {
  const els = scope.querySelectorAll('[data-target]');
  if (!els.length) return;
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { animateCount(e.target); obs.unobserve(e.target); } });
    }, { threshold: .3 });
    els.forEach(el => obs.observe(el));
  } else { els.forEach(animateCount); }
}

function animateBars(scope = document) {
  requestAnimationFrame(() => {
    setTimeout(() => {
      scope.querySelectorAll('[data-progress]').forEach(el => {
        el.style.width = el.dataset.progress;
      });
    }, 200);
  });
}

function exportCSV(filename, headers, rows) {
  const csv  = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

/* ============================================================
   4. SHARED CHART BUILDERS
   ============================================================ */
function mkBarChart(id, labels, dataR, dataNR, opts = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  const c = new Chart(el, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Realizados',    data: dataR,   backgroundColor: C.green,  borderRadius: 8, borderSkipped: false },
        { label: 'Não realizados',data: dataNR,  backgroundColor: C.red,    borderRadius: 8, borderSkipped: false },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: opts.showLegend || false },
        tooltip: { callbacks: {
          label:  ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}`,
          footer: items => ` Total: ${items.reduce((s,i)=>s+i.parsed.y,0)}`,
        }},
      },
      scales: {
        x: { grid:{display:false}, border:{display:false}, ticks:{font:{size:12,weight:'500'},color:textColor()} },
        y: { beginAtZero:true, grid:{color:gridColor()}, border:{display:false}, ticks:{font:{size:11},color:textColor(),stepSize:50} },
      },
    },
  });
  Charts.add(id, c); return c;
}

function mkDonutChart(id, r, nr) {
  const el = document.getElementById(id);
  if (!el) return;
  const c = new Chart(el, {
    type: 'doughnut',
    data: {
      labels: ['Realizados','Não realizados'],
      datasets: [{ data:[r,nr], backgroundColor:[C.green,C.red], hoverBackgroundColor:[C.greenDark,C.redDark], borderWidth:0, hoverOffset:6 }],
    },
    options: {
      responsive:true, maintainAspectRatio:true, cutout:'72%',
      plugins: {
        legend: { display:false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmtN(ctx.parsed)} (${pct(ctx.parsed, r+nr)}%)` } },
      },
      animation: { animateRotate:true, duration:1200 },
    },
  });
  Charts.add(id, c); return c;
}

function mkLineChart(id, labels, rates, opts = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  const ctx = el.getContext('2d');
  const g   = ctx.createLinearGradient(0,0,0,200);
  g.addColorStop(0,'rgba(34,197,94,.28)');
  g.addColorStop(1,'rgba(34,197,94,0)');
  const c = new Chart(el, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label:'Taxa (%)', data:rates, borderColor:C.greenDark, backgroundColor:g,
        borderWidth:2.5, pointRadius:5, pointBackgroundColor:C.greenDark,
        pointBorderColor:'#fff', pointBorderWidth:2, pointHoverRadius:8,
        fill:true, tension:.4,
      }],
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins: {
        legend:{display:false},
        tooltip:{ callbacks:{ label: ctx => ` Taxa: ${ctx.parsed.y}%` } },
      },
      scales: {
        x:{ grid:{display:false}, border:{display:false}, ticks:{font:{size:12,weight:'500'},color:textColor()} },
        y:{ min:opts.yMin||50, max:100, grid:{color:gridColor()}, border:{display:false}, ticks:{font:{size:11},color:textColor(),callback:v=>v+'%'} },
      },
    },
  });
  Charts.add(id, c); return c;
}

function mkProfLineChart(id, prof) {
  const el = document.getElementById(id);
  if (!el) return;
  const ctx = el.getContext('2d');
  const g   = ctx.createLinearGradient(0,0,0,180);
  g.addColorStop(0, prof.color+'44');
  g.addColorStop(1, prof.color+'00');
  const c = new Chart(el, {
    type: 'line',
    data: {
      labels: MONTHS_SHORT,
      datasets: [
        {
          label:'Realizados', data:prof.monthly.map(m=>m.realizados),
          borderColor:prof.color, backgroundColor:g, borderWidth:2.5,
          pointRadius:5, pointBackgroundColor:prof.color, pointBorderColor:'#fff', pointBorderWidth:2,
          pointHoverRadius:8, fill:true, tension:.4,
        },
        {
          label:'Não Realizados', data:prof.monthly.map(m=>m.naoRealizados),
          borderColor:C.red, backgroundColor:'rgba(239,68,68,.08)', borderWidth:2,
          pointRadius:4, pointBackgroundColor:C.red, pointBorderColor:'#fff', pointBorderWidth:2,
          fill:true, tension:.4,
        },
      ],
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      interaction:{mode:'index',intersect:false},
      plugins:{ legend:{ display:true, position:'top', labels:{font:{size:11}, boxWidth:8, boxHeight:8, usePointStyle:true} } },
      scales:{
        x:{ grid:{display:false}, border:{display:false}, ticks:{font:{size:11},color:textColor()} },
        y:{ beginAtZero:true, grid:{color:gridColor()}, border:{display:false}, ticks:{font:{size:11},color:textColor()} },
      },
    },
  });
  Charts.add(id, c); return c;
}

/* ============================================================
   5. PAGE: OVERVIEW
   ============================================================ */
const OverviewPage = {
  render() {
    let startIdx = 0, endIdx = 5;
    const gs = document.getElementById('globalStartMonth'), ge = document.getElementById('globalEndMonth');
    if(gs && ge && gs.value && ge.value) { 
      startIdx = parseInt(gs.value.split('-')[1], 10) - 1; 
      endIdx = parseInt(ge.value.split('-')[1], 10) - 1; 
      if(isNaN(startIdx) || startIdx < 0) startIdx = 0;
      if(isNaN(endIdx) || endIdx > 5) endIdx = 5;
      if(startIdx > endIdx) endIdx = startIdx; 
    }
    
    const fd = MONTHLY_DATA.slice(startIdx, endIdx + 1);
    const r = fd.reduce((s, d) => s + d.realizados, 0);
    const nr = fd.reduce((s, d) => s + d.naoRealizados, 0);
    const t = r + nr;
    const m = Math.round(r / (fd.length || 1));
    this._pctGeral = pct(r, t);

    const kpis = [
      { id:'realizados',    label:'Atendimentos Realizados', val:r, sub:'No período', cls:'kpi-green', trend:'up',      trendTxt:'+4,2%', icon:'<polyline points="20 6 9 17 4 12"/>' },
      { id:'naoRealizados', label:'Não Realizados',          val:nr,  sub:'No período', cls:'kpi-red',   trend:'down',    trendTxt:'-2,1%', icon:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' },
      { id:'total',         label:'Total de Agendamentos',   val:t, sub:'Realizados + não realizados', cls:'kpi-blue', trend:'neutral', trendTxt:'Total', icon:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>' },
      { id:'media',         label:'Média Mensal Realizada',  val:m,  sub:'Atendimentos por mês', cls:'kpi-purple', trend:'up', trendTxt:'+1,8%', icon:'<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>' },
    ];
    return `
    <section class="kpi-section" aria-label="Indicadores principais">
      ${kpis.map(k=>`
        <div class="kpi-card" id="kpi-${k.id}">
          <div class="kpi-icon ${k.cls}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${k.icon}</svg></div>
          <div class="kpi-content">
            <span class="kpi-label">${k.label}</span>
            <span class="kpi-value" data-target="${k.val}">0</span>
            <span class="kpi-sub">${k.sub}</span>
          </div>
          <div class="kpi-trend ${k.trend}">${k.trendTxt}</div>
        </div>`).join('')}
    </section>

    <section class="charts-row" aria-label="Gráficos principais">
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <h2 class="chart-title">Atendimentos por Mês</h2>
            <p class="chart-subtitle">Realizados vs Não realizados por mês</p>
          </div>
          <div class="chart-legend">
            <span class="legend-dot green"></span><span>Realizados</span>
            <span class="legend-dot red"></span><span>Não realizados</span>
          </div>
        </div>
        <div class="chart-container"><canvas id="ovBarChart"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-card-header"><div>
          <h2 class="chart-title">Panorama Geral</h2>
          <p class="chart-subtitle">Semestre consolidado</p>
        </div></div>
        <div class="donut-wrapper">
          <canvas id="ovDonutChart"></canvas>
          <div class="donut-center">
            <span class="donut-pct">${this._pctGeral}%</span>
            <span class="donut-label">Realizados</span>
          </div>
        </div>
        <div class="donut-legend">
          <div class="donut-legend-item"><span class="legend-dot green"></span><span class="legend-text">Realizados</span><span class="legend-val green-text">${fmtN(kpis[0].val)}</span></div>
          <div class="donut-legend-item"><span class="legend-dot red"></span><span class="legend-text">Não realizados</span><span class="legend-val red-text">${fmtN(kpis[1].val)}</span></div>
        </div>
      </div>
    </section>

    <section class="charts-row single" aria-label="Taxa de realização">
      <div class="chart-card">
        <div class="chart-card-header">
          <div>
            <h2 class="chart-title">Taxa de Realização por Mês</h2>
            <p class="chart-subtitle">Percentual de atendimentos realizados em relação ao total agendado</p>
          </div>
          <div class="avg-badge"><span class="avg-label">Geral</span><span class="avg-value">${this._pctGeral}%</span></div>
        </div>
        <div class="chart-container chart-container-line"><canvas id="ovLineChart"></canvas></div>
      </div>
    </section>

    <section class="highlights-grid" aria-label="Destaques">
      ${[
        { cls:'green-bg',  label:'Maior volume',           title:'Março',                desc:'210 atendimentos', icon:'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>' },
        { cls:'yellow-bg', label:'Aproveitamento',         title:'Maio',                 desc:'Taxa de 84,5%', icon:'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' },
        { cls:'red-bg',    label:'Atenção',                title:'Junho',                desc:'55 não realizados', icon:'<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
        { cls:'blue-bg',   label:'Média não real.',        title:'~42 / mês',            desc:'No semestre', icon:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' },
      ].map(h=>`
        <div class="highlight-item highlight-card-style">
          <div class="highlight-icon ${h.cls}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${h.icon}</svg></div>
          <div class="highlight-content">
            <span class="highlight-label">${h.label}</span>
            <span class="highlight-title">${h.title}</span>
            <span class="highlight-desc">${h.desc}</span>
          </div>
        </div>`).join('')}
    </section>

    <footer class="dashboard-footer">
      <p>Dashboard gerado automaticamente · Dados baseados no período selecionado</p>
    </footer>`;
  },

  init() {
    let startIdx = 0, endIdx = 5;
    const gs = document.getElementById('globalStartMonth'), ge = document.getElementById('globalEndMonth');
    if(gs && ge && gs.value && ge.value) { 
      startIdx = parseInt(gs.value.split('-')[1], 10) - 1; 
      endIdx = parseInt(ge.value.split('-')[1], 10) - 1; 
      if(isNaN(startIdx) || startIdx < 0) startIdx = 0;
      if(isNaN(endIdx) || endIdx > 5) endIdx = 5;
      if(startIdx > endIdx) endIdx = startIdx; 
    }
    
    const fd = MONTHLY_DATA.slice(startIdx, endIdx + 1);
    const lbls = MONTHS_SHORT.slice(startIdx, endIdx + 1);

    observeCounters();
    animateBars();
    
    mkBarChart('ovBarChart', lbls, fd.map(d=>d.realizados), fd.map(d=>d.naoRealizados));
    
    const r = fd.reduce((s, d) => s + d.realizados, 0);
    const nr = fd.reduce((s, d) => s + d.naoRealizados, 0);
    mkDonutChart('ovDonutChart', r, nr);
    
    mkLineChart('ovLineChart', lbls, fd.map(d=>parseFloat(pct(d.realizados,d.total))));
  },
};

/* ============================================================
   6. PAGE: PROFESSIONALS
   ============================================================ */
const ProfessionalsPage = {
  render() {
    return `
    <div class="prof-page">
      <div class="prof-detail-grid">
        ${PROFESSIONALS.map((prof, i) => this._renderCard(prof, i)).join('')}
      </div>
      <div class="comparison-card">
        <div class="chart-card-header">
          <div>
            <h2 class="chart-title">Comparativo por Profissional</h2>
            <p class="chart-subtitle">Realizados por mês — análise comparativa entre profissionais</p>
          </div>
          <div class="chart-legend">
            ${PROFESSIONALS.map(p=>`<span class="legend-dot" style="background:${p.color}"></span><span>${p.nameShort || p.name.split(' ').slice(-1)[0]}</span>`).join('')}
          </div>
        </div>
        <div class="comparison-chart-container"><canvas id="comparisonChart"></canvas></div>
      </div>
    </div>`;
  },

  _renderCard(prof, i) {
    const r     = pct(prof.realizados, prof.total);
    const rows  = MONTHS.map((m, j) => {
      const d     = prof.monthly[j];
      const tot   = d.realizados + d.naoRealizados;
      const rate  = pct(d.realizados, tot);
      return `<tr>
        <td><strong>${MONTHS_SHORT[j]}</strong></td>
        <td class="text-right green-text">${d.realizados}</td>
        <td class="text-right red-text">${d.naoRealizados}</td>
        <td class="text-right">${tot}</td>
        <td class="text-right" style="font-weight:700;color:${prof.color}">${rate}%</td>
      </tr>`;
    }).join('');
    return `
    <div class="prof-detail-card">
      <div class="prof-detail-banner" style="background:linear-gradient(135deg,${prof.color},${prof.color}88)">
        <div class="prof-detail-avatar-lg">${prof.initials}</div>
      </div>
      <div class="prof-detail-body">
        <div class="prof-detail-meta">
          <h2 class="prof-detail-name">${prof.name}</h2>
          <p class="prof-detail-role">${prof.role} · ${prof.specialty}</p>
          <span class="prof-rate-badge" style="background:${prof.colorLight};color:${prof.color}">${r}% taxa de realização</span>
        </div>
        <div class="prof-kpi-row">
          <div class="prof-kpi-item">
            <span class="prof-kpi-val" style="color:var(--green)" data-target="${prof.realizados}">0</span>
            <span class="prof-kpi-label">Realizados</span>
          </div>
          <div class="prof-kpi-item">
            <span class="prof-kpi-val" style="color:var(--red)" data-target="${prof.naoRealizados}">0</span>
            <span class="prof-kpi-label">Não real.</span>
          </div>
          <div class="prof-kpi-item">
            <span class="prof-kpi-val" data-target="${prof.total}">0</span>
            <span class="prof-kpi-label">Total</span>
          </div>
        </div>
        <div class="prof-chart-section">
          <p class="prof-section-title">Evolução Mensal</p>
          <div class="prof-chart-container"><canvas id="profChart${i}"></canvas></div>
        </div>
        <div class="prof-table-section">
          <p class="prof-section-title">Detalhamento por Mês</p>
          <table class="data-table prof-mini-table">
            <thead><tr>
              <th>Mês</th><th class="text-right">Real.</th>
              <th class="text-right">Não real.</th><th class="text-right">Total</th><th class="text-right">Taxa</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>`;
  },

  init() {
    observeCounters();
    PROFESSIONALS.forEach((prof, i) => mkProfLineChart(`profChart${i}`, prof));

    /* Comparison bar chart */
    const el = document.getElementById('comparisonChart');
    if (el) {
      const c = new Chart(el, {
        type: 'bar',
        data: {
          labels: MONTHS_SHORT,
          datasets: PROFESSIONALS.map(prof => ({
            label: prof.nameShort || prof.name,
            data: prof.monthly.map(m => m.realizados),
            backgroundColor: prof.color + 'cc',
            borderRadius: 7,
            borderSkipped: false,
          })),
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode:'index', intersect:false },
          plugins: { legend:{ display:true, position:'top', labels:{ font:{size:11}, boxWidth:8, boxHeight:8, usePointStyle:true } } },
          scales: {
            x: { grid:{display:false}, border:{display:false}, ticks:{font:{size:12,weight:'500'},color:textColor()} },
            y: { beginAtZero:true, grid:{color:gridColor()}, border:{display:false}, ticks:{font:{size:11},color:textColor()} },
          },
        },
      });
      Charts.add('comparisonChart', c);
    }
  },
};

/* ============================================================
   7. PAGE: REPORTS
   ============================================================ */
let reportsState = {
  months: [0,1,2,3,4,5],
  professionals: PROFESSIONALS.map(p=>p.id),
};

const ReportsPage = {
  render() {
    return `
    <div class="reports-page">

      <!-- Filter Bar -->
      <div class="filter-bar" id="filterBar">
        <div class="filter-group">
          <span class="filter-label">Meses</span>
          <div class="filter-chips" id="monthChips">
            ${MONTHS_SHORT.map((m,i)=>`<button class="month-chip active" data-month="${i}" id="mchip-${i}">${m}</button>`).join('')}
          </div>
        </div>
        <div class="filter-group">
          <span class="filter-label">Profissionais</span>
          <div class="filter-chips" id="profChips">
            ${PROFESSIONALS.map(p=>`
              <button class="prof-filter-chip active style-${p.color==='#7c3aed'?'purple':'blue'}" data-prof="${p.id}">
                <span class="prof-filter-chip-dot" style="background:${p.color}"></span>
                ${p.initials}
              </button>`).join('')}
          </div>
        </div>
        <div class="filter-spacer"></div>
        <button class="btn-export" id="rExportBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Exportar CSV
        </button>
      </div>

      <!-- Summary stats -->
      <div class="reports-summary-row">
        <div class="report-stat-card">
          <span class="report-stat-val green-text" id="rStatR">1.018</span>
          <span class="report-stat-label">Realizados</span>
        </div>
        <div class="report-stat-card">
          <span class="report-stat-val red-text" id="rStatNR">253</span>
          <span class="report-stat-label">Não realizados</span>
        </div>
        <div class="report-stat-card">
          <span class="report-stat-val" id="rStatTotal">1.271</span>
          <span class="report-stat-label">Total</span>
        </div>
        <div class="report-stat-card">
          <span class="report-stat-val" style="color:var(--green)" id="rStatRate">80,1%</span>
          <span class="report-stat-label">Taxa geral</span>
        </div>
      </div>

      <!-- Charts Grid -->
      <div class="reports-charts-grid">
        <div class="chart-card">
          <div class="chart-card-header">
            <div><h2 class="chart-title">Atendimentos por Mês</h2><p class="chart-subtitle">Filtrado pelo período selecionado</p></div>
            <div class="chart-legend"><span class="legend-dot green"></span><span>Realizados</span><span class="legend-dot red"></span><span>Não realizados</span></div>
          </div>
          <div class="chart-container"><canvas id="rBarChart"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-card-header"><div><h2 class="chart-title">Distribuição</h2><p class="chart-subtitle">Período filtrado</p></div></div>
          <div class="reports-donut-wrapper">
            <canvas id="rDonutChart"></canvas>
            <div class="reports-donut-center">
              <span class="reports-donut-pct" id="rDonutPct">80,1%</span>
              <span class="reports-donut-lbl">Realizados</span>
            </div>
          </div>
          <div class="donut-legend" style="margin-top:10px">
            <div class="donut-legend-item"><span class="legend-dot green"></span><span class="legend-text">Realizados</span><span class="legend-val green-text" id="rLegendR">1.018</span></div>
            <div class="donut-legend-item"><span class="legend-dot red"></span><span class="legend-text">Não realizados</span><span class="legend-val red-text" id="rLegendNR">253</span></div>
          </div>
        </div>
      </div>

      <!-- Line chart -->
      <div class="chart-card">
        <div class="chart-card-header">
          <div><h2 class="chart-title">Taxa de Realização por Mês</h2><p class="chart-subtitle">Período selecionado</p></div>
          <div class="avg-badge"><span class="avg-label">Média</span><span class="avg-value" id="rAvgRate">80,1%</span></div>
        </div>
        <div class="reports-line-container"><canvas id="rLineChart"></canvas></div>
      </div>

      <!-- Table -->
      <div class="table-card">
        <div class="chart-card-header">
          <div><h2 class="chart-title">Tabela Detalhada</h2><p class="chart-subtitle">Dados filtrados pelo período e profissionais selecionados</p></div>
        </div>
        <div class="table-wrapper">
          <table class="data-table" aria-label="Tabela de relatório">
            <thead><tr>
              <th>Mês</th><th class="text-right">Realizados</th>
              <th class="text-right">Não real.</th><th class="text-right">Total</th><th>Taxa</th>
            </tr></thead>
            <tbody id="rTableBody"></tbody>
            <tfoot><tr class="table-total">
              <td>Subtotal</td>
              <td class="text-right green-text" id="rTotalR">1.018</td>
              <td class="text-right red-text"   id="rTotalNR">253</td>
              <td class="text-right"            id="rTotalAll">1.271</td>
              <td><div class="progress-bar-mini"><div class="progress-fill" id="rTotalBar" style="width:80.1%"></div></div></td>
            </tr></tfoot>
          </table>
        </div>
      </div>
    </div>`;
  },

  init() {
    reportsState = { months:[0,1,2,3,4,5], professionals: PROFESSIONALS.map(p=>p.id) };

    /* Initial charts */
    this._buildCharts();
    this._updateTable();

    /* Month chips */
    document.querySelectorAll('#monthChips .month-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const mi = parseInt(btn.dataset.month, 10);
        if (reportsState.months.includes(mi)) {
          if (reportsState.months.length > 1) {
            reportsState.months = reportsState.months.filter(x=>x!==mi);
            btn.classList.remove('active');
          }
        } else {
          reportsState.months.push(mi);
          reportsState.months.sort((a,b)=>a-b);
          btn.classList.add('active');
        }
        this._refresh();
      });
    });

    /* Prof chips */
    document.querySelectorAll('#profChips .prof-filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const pid = btn.dataset.prof;
        if (reportsState.professionals.includes(pid)) {
          if (reportsState.professionals.length > 1) {
            reportsState.professionals = reportsState.professionals.filter(x=>x!==pid);
            btn.classList.remove('active');
          }
        } else {
          reportsState.professionals.push(pid);
          btn.classList.add('active');
        }
        this._refresh();
      });
    });

    /* Export */
    document.getElementById('rExportBtn')?.addEventListener('click', () => {
      const filtered = this._getFiltered();
      exportCSV('atendimentos-2026.csv',
        ['Mês','Realizados','Não Realizados','Total','Taxa (%)'],
        filtered.map(d=>[d.month, d.realizados, d.naoRealizados, d.total, pct(d.realizados,d.total)])
      );
    });
  },

  _getFiltered() {
    const profFilter  = reportsState.professionals;
    const monthFilter = reportsState.months;

    return monthFilter.map(mi => {
      const base = { ...MONTHLY_DATA[mi] };
      if (profFilter.length < PROFESSIONALS.length) {
        let r = 0, nr = 0;
        PROFESSIONALS.forEach(prof => {
          if (profFilter.includes(prof.id)) {
            r  += prof.monthly[mi].realizados;
            nr += prof.monthly[mi].naoRealizados;
          }
        });
        base.realizados    = r;
        base.naoRealizados = nr;
        base.total         = r + nr;
      }
      return base;
    });
  },

  _buildCharts() {
    const filtered = this._getFiltered();
    const labels   = reportsState.months.map(i=>MONTHS_SHORT[i]);
    const dataR    = filtered.map(d=>d.realizados);
    const dataNR   = filtered.map(d=>d.naoRealizados);
    const rates    = filtered.map(d=>parseFloat(pct(d.realizados,d.total)));

    Charts.destroy('rBarChart');
    Charts.destroy('rDonutChart');
    Charts.destroy('rLineChart');

    mkBarChart('rBarChart', labels, dataR, dataNR);

    const totR  = dataR.reduce((a,b)=>a+b,0);
    const totNR = dataNR.reduce((a,b)=>a+b,0);
    mkDonutChart('rDonutChart', totR, totNR);
    mkLineChart('rLineChart', labels, rates, { yMin:50 });
  },

  _refresh() {
    const filtered = this._getFiltered();
    const labels   = reportsState.months.map(i=>MONTHS_SHORT[i]);
    const dataR    = filtered.map(d=>d.realizados);
    const dataNR   = filtered.map(d=>d.naoRealizados);
    const rates    = filtered.map(d=>parseFloat(pct(d.realizados,d.total)));
    const totR     = dataR.reduce((a,b)=>a+b,0);
    const totNR    = dataNR.reduce((a,b)=>a+b,0);
    const totAll   = totR + totNR;
    const rate     = pct(totR, totAll);
    const avgRate  = rates.length ? (rates.reduce((a,b)=>a+b,0)/rates.length).toFixed(1) : '0.0';

    /* Update bar chart */
    const bar = Charts.get('rBarChart');
    if (bar) {
      bar.data.labels = labels;
      bar.data.datasets[0].data = dataR;
      bar.data.datasets[1].data = dataNR;
      bar.update('active');
    }
    /* Update donut chart */
    const donut = Charts.get('rDonutChart');
    if (donut) { donut.data.datasets[0].data=[totR,totNR]; donut.update('active'); }
    /* Update line chart */
    const line = Charts.get('rLineChart');
    if (line) { line.data.labels=labels; line.data.datasets[0].data=rates; line.update('active'); }

    /* Update summary */
    const q = id => document.getElementById(id);
    if (q('rStatR'))    q('rStatR').textContent    = fmtN(totR);
    if (q('rStatNR'))   q('rStatNR').textContent   = fmtN(totNR);
    if (q('rStatTotal'))q('rStatTotal').textContent = fmtN(totAll);
    if (q('rStatRate')) q('rStatRate').textContent  = rate.replace('.',',')+'%';
    if (q('rDonutPct')) q('rDonutPct').textContent  = rate.replace('.',',')+'%';
    if (q('rLegendR'))  q('rLegendR').textContent   = fmtN(totR);
    if (q('rLegendNR')) q('rLegendNR').textContent  = fmtN(totNR);
    if (q('rAvgRate'))  q('rAvgRate').textContent   = avgRate.replace('.',',')+'%';
    if (q('rTotalR'))   q('rTotalR').textContent    = fmtN(totR);
    if (q('rTotalNR'))  q('rTotalNR').textContent   = fmtN(totNR);
    if (q('rTotalAll')) q('rTotalAll').textContent  = fmtN(totAll);
    if (q('rTotalBar')) q('rTotalBar').style.width  = rate+'%';

    this._updateTable(filtered);
  },

  _updateTable(filtered) {
    filtered = filtered || this._getFiltered();
    const tbody = document.getElementById('rTableBody');
    if (!tbody) return;
    tbody.innerHTML = filtered.map(row => {
      const r = pct(row.realizados, row.total);
      return `<tr>
        <td><strong>${row.month}</strong></td>
        <td class="text-right green-text">${fmtN(row.realizados)}</td>
        <td class="text-right red-text">${fmtN(row.naoRealizados)}</td>
        <td class="text-right">${fmtN(row.total)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <div class="progress-bar-mini" style="flex:1">
              <div class="progress-fill" style="width:${r}%"></div>
            </div>
            <span style="font-size:.72rem;font-weight:600;color:var(--green)">${r}%</span>
          </div>
        </td>
      </tr>`;
    }).join('');
  },
};

/* ============================================================
   8. PAGE: SETTINGS
   ============================================================ */
const SettingsPage = {
  render() {
    const isDark = document.body.classList.contains('dark-mode');
    return `
    <div class="settings-page">
      <div class="settings-grid">

        <!-- Aparência -->
        <div class="settings-card">
          <div class="settings-card-header">
            <div class="settings-card-icon" style="background:var(--purple-light);color:var(--purple)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            </div>
            <div>
              <div class="settings-card-title">Aparência</div>
              <div class="settings-card-desc">Personalize o visual do dashboard</div>
            </div>
          </div>
          <div class="settings-rows">
            <div class="settings-row">
              <div class="settings-row-info">
                <span class="settings-row-name">Tema Escuro</span>
                <span class="settings-row-desc">Ativar modo noturno</span>
              </div>
              <label class="toggle-switch" for="darkModeToggle">
                <input type="checkbox" id="darkModeToggle" ${isDark?'checked':''}>
                <span class="toggle-track"></span>
              </label>
            </div>
            <div class="settings-row">
              <div class="settings-row-info">
                <span class="settings-row-name">Cor de Destaque</span>
                <span class="settings-row-desc">Cor primária do sistema</span>
              </div>
              <div class="accent-picker">
                ${(() => {
                  const currentAccent = localStorage.getItem('accentColor') || '#16a34a';
                  return [
                    {color:'#16a34a',label:'Verde'},
                    {color:'#2563eb',label:'Azul'},
                    {color:'#7c3aed',label:'Roxo'},
                    {color:'#dc2626',label:'Vermelho'},
                    {color:'#d97706',label:'Laranja'},
                  ].map(a=>`
                    <button class="accent-swatch ${a.color===currentAccent?'active':''}" style="background:${a.color}" title="${a.label}" data-color="${a.color}"></button>
                  `).join('');
                })()}
              </div>
            </div>
          </div>
        </div>

        <!-- Período -->
        <div class="settings-card">
          <div class="settings-card-header">
            <div class="settings-card-icon" style="background:var(--blue-light);color:var(--blue)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div>
              <div class="settings-card-title">Período de Análise</div>
              <div class="settings-card-desc">Defina o intervalo temporal para exibição</div>
            </div>
          </div>
          <div class="settings-rows">
            <div class="settings-row" style="flex-direction:column;align-items:flex-start">
              <div class="period-selector" style="width:100%">
                <span class="period-year-label">Ano: 2026</span>
                <div class="period-nav-btns">
                  <button class="period-nav-btn" id="periodPrev">◀</button>
                  <button class="period-nav-btn" id="periodNext">▶</button>
                </div>
              </div>
              <div class="month-chips-grid" id="settingsMonthGrid" style="width:100%">
                ${MONTHS_SHORT.map((m,i)=>`<button class="month-chip-setting active" data-sidx="${i}">${m}</button>`).join('')}
              </div>
              <div class="settings-info-box" style="margin-top:12px;width:100%">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Os filtros de período afetam os relatórios e exportações.
              </div>
            </div>
          </div>
        </div>

        <!-- Profissionais -->
        <div class="settings-card">
          <div class="settings-card-header">
            <div class="settings-card-icon" style="background:var(--green-light);color:var(--green)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <div>
              <div class="settings-card-title">Profissionais Ativos</div>
              <div class="settings-card-desc">Selecione quais profissionais incluir nos dados</div>
            </div>
          </div>
          <div class="settings-rows">
            ${PROFESSIONALS.map(prof=>`
              <div class="settings-row">
                <div style="display:flex;align-items:center;gap:12px">
                  <div class="prof-mini-avatar" style="background:${prof.color}">${prof.initials}</div>
                  <div class="settings-row-info">
                    <span class="settings-row-name">${prof.name}</span>
                    <span class="settings-row-desc">${prof.role} · ${fmtN(prof.realizados)} realizados</span>
                  </div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" checked>
                  <span class="toggle-track"></span>
                </label>
              </div>
            `).join('')}
            <div class="settings-row" style="padding-top:12px">
              <div class="settings-row-info">
                <span class="settings-row-name">Total de profissionais ativos</span>
              </div>
              <span style="font-size:.9rem;font-weight:800;color:var(--green)">${PROFESSIONALS.length}</span>
            </div>
          </div>
        </div>

        <!-- Exportação -->
        <div class="settings-card">
          <div class="settings-card-header">
            <div class="settings-card-icon" style="background:var(--yellow-light);color:var(--yellow)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <div>
              <div class="settings-card-title">Exportação de Dados</div>
              <div class="settings-card-desc">Baixe os dados em diferentes formatos</div>
            </div>
          </div>
          <div class="export-actions">
            <button class="export-action-btn green-action" id="sExportCsv">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>
              Exportar CSV Mensal
              <span class="export-badge">6 meses</span>
            </button>
            <button class="export-action-btn blue-action" id="sExportJson">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              Exportar JSON Completo
              <span class="export-badge">Todos os dados</span>
            </button>
            <button class="export-action-btn print-action" id="sPrint">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Imprimir Dashboard
              <span class="export-badge">PDF via browser</span>
            </button>
          </div>
          <div class="settings-info-box" style="margin-top:14px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Todos os dados são processados localmente. Nenhuma informação é enviada a servidores externos.
          </div>
        </div>

      </div>
    </div>`;
  },

  init() {
    /* Dark mode toggle */
    document.getElementById('darkModeToggle')?.addEventListener('change', e => {
      setTheme(e.target.checked);
    });

    /* Accent color swatches */
    document.querySelectorAll('.accent-swatch').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.accent-swatch').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        
        const color = btn.dataset.color;
        const lightMap = {
          '#16a34a': '#dcfce7', '#2563eb': '#dbeafe', '#7c3aed': '#ede9fe',
          '#dc2626': '#fee2e2', '#d97706': '#fef3c7'
        };
        document.documentElement.style.setProperty('--accent', color);
        document.documentElement.style.setProperty('--accent-light', lightMap[color] || '#dcfce7');
        localStorage.setItem('accentColor', color);
      });
    });

    /* Period chips (visual toggle) */
    document.querySelectorAll('.month-chip-setting').forEach(btn => {
      btn.addEventListener('click', () => btn.classList.toggle('active'));
    });

    /* Period year buttons (visual) */
    const yearLabel = document.querySelector('.period-year-label');
    let year = 2026;
    document.getElementById('periodPrev')?.addEventListener('click', () => { year--; if (yearLabel) yearLabel.textContent = `Ano: ${year}`; });
    document.getElementById('periodNext')?.addEventListener('click', () => { year++; if (yearLabel) yearLabel.textContent = `Ano: ${year}`; });

    /* Export CSV */
    document.getElementById('sExportCsv')?.addEventListener('click', () => {
      exportCSV('panorama-atendimentos-2026.csv',
        ['Mês','Realizados','Não Realizados','Total','Taxa (%)'],
        MONTHLY_DATA.map(d=>[d.month, d.realizados, d.naoRealizados, d.total, pct(d.realizados,d.total)])
      );
    });

    /* Export JSON */
    document.getElementById('sExportJson')?.addEventListener('click', () => {
      exportJSON('panorama-atendimentos-2026.json', {
        periodo: '1º Semestre 2026',
        exportadoEm: new Date().toISOString(),
        resumo: { realizados:1018, naoRealizados:253, total:1271, taxaGeral:'80.1%' },
        mensal: MONTHLY_DATA,
        profissionais: PROFESSIONALS.map(p => ({
          nome: p.name, area: p.role,
          realizados: p.realizados, naoRealizados: p.naoRealizados, total: p.total,
          taxaRealizacao: pct(p.realizados,p.total)+'%',
          mensal: MONTHS.map((m,i)=>({ mes:m, ...p.monthly[i] })),
        })),
      });
    });

    /* Print */
    document.getElementById('sPrint')?.addEventListener('click', () => window.print());
  },
};

/* ============================================================
   9. THEME HELPERS (dark mode)
   ============================================================ */
function setTheme(dark) {
  document.body.classList.toggle('dark-mode', dark);
  localStorage.setItem('theme', dark ? 'dark' : 'light');
  Chart.defaults.color = dark ? '#8b949e' : '#475569';
  
  const toggle = document.getElementById('darkModeToggle');
  if (toggle) toggle.checked = dark;

  // Atualizar as cores de eixos/grids nos gráficos existentes
  Object.values(Charts.instances).forEach(c => {
    if (c.options.scales && c.options.scales.x) {
      if (c.options.scales.x.ticks) c.options.scales.x.ticks.color = textColor();
    }
    if (c.options.scales && c.options.scales.y) {
      if (c.options.scales.y.ticks) c.options.scales.y.ticks.color = textColor();
      if (c.options.scales.y.grid)  c.options.scales.y.grid.color  = gridColor();
    }
    c.update();
  });
}

function initDarkMode() {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark') {
    document.body.classList.add('dark-mode');
    Chart.defaults.color = '#8b949e';
  }

  const storedAccent = localStorage.getItem('accentColor');
  if (storedAccent) {
    const lightMap = {
      '#16a34a': '#dcfce7', '#2563eb': '#dbeafe', '#7c3aed': '#ede9fe',
      '#dc2626': '#fee2e2', '#d97706': '#fef3c7'
    };
    document.documentElement.style.setProperty('--accent', storedAccent);
    document.documentElement.style.setProperty('--accent-light', lightMap[storedAccent] || '#dcfce7');
  }

  const headerBtn = document.getElementById('headerThemeToggle');
  if (headerBtn) {
    headerBtn.addEventListener('click', () => {
      const isDark = document.body.classList.contains('dark-mode');
      setTheme(!isDark);
    });
  }
}

/* ============================================================
   10. SIDEBAR TOGGLE (mobile)
   ============================================================ */
function initSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const toggle   = document.getElementById('menuToggle');
  const overlay  = document.getElementById('sidebarOverlay');
  function open()  { sidebar.classList.add('open');    overlay.classList.add('visible'); }
  function close() { sidebar.classList.remove('open'); overlay.classList.remove('visible'); }
  toggle?.addEventListener('click',  open);
  overlay?.addEventListener('click', close);
  /* Close on nav click (mobile) */
  document.querySelectorAll('.nav-item').forEach(el => el.addEventListener('click', close));
}

/* ============================================================
   11. REGISTER ROUTES & BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  initSidebar();

  const gStart = document.getElementById('globalStartMonth');
  const gEnd   = document.getElementById('globalEndMonth');
  const handleGlobalFilter = () => {
    if(!gStart.value || !gEnd.value) return;
    let sValue = gStart.value;
    let eValue = gEnd.value;
    if(sValue > eValue) { gEnd.value = sValue; }
    // Force re-render of current route to apply filters
    if(Router.current() === 'overview') {
      const content = document.getElementById('page-content');
      content.style.opacity = '0';
      setTimeout(() => {
        if(window.Charts) window.Charts.destroyAll();
        content.innerHTML = OverviewPage.render();
        OverviewPage.init();
        content.style.opacity = '1';
      }, 150);
    }
  };
  if(gStart && gEnd) {
    gStart.addEventListener('change', handleGlobalFilter);
    gEnd.addEventListener('change', handleGlobalFilter);
  }

  Router.register('overview',      OverviewPage);
  Router.register('professionals', ProfessionalsPage);
  Router.register('reports',       ReportsPage);
  Router.register('settings',      SettingsPage);

  Router.init();
});
