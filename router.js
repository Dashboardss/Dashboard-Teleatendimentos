/* ============================================================
   ROUTER.JS – Hash-based SPA Router
   Provides page transitions and nav state management
   ============================================================ */
const Router = (() => {
  'use strict';

  const _routes  = {};
  let   _current = null;

  const PAGE_META = {
    overview: {
      title:    'Panorama de Atendimentos',
      subtitle: 'Consolidação dos atendimentos realizados e não realizados no 1º semestre de 2026. Material de apoio para reuniões de acompanhamento.',
      period:   'Jan – Jun 2026',
    },
    professionals: {
      title:    'Profissionais',
      subtitle: 'Estatísticas individuais, evolução mensal e comparativo de desempenho por profissional de saúde.',
      period:   'Jan – Jun 2026',
    },
    reports: {
      title:    'Relatórios',
      subtitle: 'Análise detalhada com filtros interativos por período e profissional. Exporte os dados em CSV ou JSON.',
      period:   'Jan – Jun 2026',
    },
    settings: {
      title:    'Configurações',
      subtitle: 'Personalize a aparência, ajuste filtros de período e exporte seus dados em diferentes formatos.',
      period:   '2026',
    },
  };

  function getHash() {
    return window.location.hash.replace('#', '').trim() || 'overview';
  }

  function updateNav(route) {
    document.querySelectorAll('.nav-item[data-route]').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route);
    });
  }

  function updateHeader(route) {
    const m = PAGE_META[route] || PAGE_META.overview;
    const t  = document.getElementById('header-title');
    const s  = document.getElementById('header-subtitle');
    const p  = document.getElementById('header-period-text');
    if (t) t.textContent  = m.title;
    if (s) s.textContent  = m.subtitle;
    if (p) p.textContent  = m.period;
  }

  function navigate() {
    const route   = getHash();
    const handler = _routes[route] || _routes['overview'];
    if (!handler) return;

    _current = route;
    updateNav(route);
    updateHeader(route);

    const content = document.getElementById('page-content');

    /* ---- fade-out ---- */
    content.style.transition = 'opacity .18s ease, transform .18s ease';
    content.style.opacity    = '0';
    content.style.transform  = 'translateY(8px)';

    setTimeout(() => {
      /* destroy all active Chart.js instances */
      if (window.Charts) window.Charts.destroyAll();

      content.innerHTML = handler.render();
      content.scrollTop = 0;

      /* ---- fade-in ---- */
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          content.style.transition = 'opacity .28s ease, transform .28s ease';
          content.style.opacity    = '1';
          content.style.transform  = 'translateY(0)';
        });
      });

      /* init after paint */
      if (handler.init) setTimeout(() => handler.init(), 60);
    }, 180);
  }

  return {
    register(route, handler) { _routes[route] = handler; },
    go(path)  { window.location.hash = path; },
    current() { return _current; },
    init() {
      document.querySelectorAll('.nav-item[data-route]').forEach(el => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          Router.go(el.dataset.route);
        });
      });
      window.addEventListener('hashchange', navigate);
      navigate();
    },
  };
})();
