import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Download,
  FileSpreadsheet,
  FileUp,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Printer,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type RecordRow = {
  date: string;
  month_label: string;
  professional: string;
  unit: string;
  weekday: string;
  hour: string;
  status: string;
};
type BaseData = {
  meta: { generated_at: string; sheets_analyzed: number; records: number };
  records: RecordRow[];
};
type ImportLog = {
  id: string;
  file: string;
  at: string;
  rows: number;
  accepted: number;
  duplicates: number;
  issues: number;
  user: string;
};

const STATUS = [
  "Atendido",
  "Não atendido",
  "Cancelado",
  "Desistência",
  "Vagas livres",
  "Remanejado",
  "Sem status",
];
const STATUS_COLOR: Record<string, string> = {
  Atendido: "#10a89e",
  "Não atendido": "#e45d69",
  Cancelado: "#f2a341",
  Desistência: "#7b61d1",
  "Vagas livres": "#9aa9bd",
  Remanejado: "#4775e8",
  "Sem status": "#cbd5e1",
};
const monthName = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
const toDate = (s: string) => new Date(`${s}T12:00:00`);
const fmt = (n: number) => new Intl.NumberFormat("pt-BR").format(n);
const pct = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;
const normalize = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

function statusOf(raw: unknown, name: string) {
  const s = normalize(raw);
  const n = normalize(name);
  const all = `${s} ${n}`;
  if (all.includes("vaga") && all.includes("livre")) return "Vagas livres";
  if (all.includes("nao atend")) return "Não atendido";
  if (all.includes("desist")) return "Desistência";
  if (all.includes("cancel")) return "Cancelado";
  if (all.includes("atendid")) return "Atendido";
  if (all.includes("remanejad")) return "Remanejado";
  if (!s && !n) return "";
  return s ? String(raw).trim() : "Sem status";
}
function professionalOf(name: string, title: string) {
  const n = normalize(`${name} ${title}`);
  if (n.includes("camila")) return "Dra. Camila Queiroga";
  if (n.includes("viridiana")) return "Dra. Viridiana Dourado Castro";
  if (n.includes("priscila")) return "Dra. Priscila Ferreira";
  const match = `${name} ${title}`.match(
    /\b(Dras?\.?|Dra°?)\s+([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+){0,4})/i
  );
  if (match) return `${match[1].replace("°", ".")} ${match[2].trim()}`;
  return "Não identificado";
}
function parseDateText(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return value.toISOString().slice(0, 10);
  const m = String(value ?? "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : "";
}
function parseHour(value: unknown) {
  const m = String(value ?? "").match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : String(value ?? "").trim();
}

async function parseWorkbook(
  file: File
): Promise<{ rows: RecordRow[]; issues: number; sheetCount: number }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { cellDates: true });
  const rows: RecordRow[] = [];
  let issues = 0;
  workbook.SheetNames.forEach(sheetName => {
    if (!/26|2026/i.test(sheetName)) return;
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
    });
    let headerIndex = -1;
    let header: string[] = [];
    for (let i = 0; i < Math.min(matrix.length, 30); i++) {
      const candidate = (matrix[i] as unknown[]).map(normalize);
      if (candidate.some(v => v.startsWith("status"))) {
        headerIndex = i;
        header = candidate;
        break;
      }
    }
    if (headerIndex < 0) {
      issues++;
      return;
    }
    const title = String((matrix[0] as unknown[] | undefined)?.[0] ?? "");
    const professional = professionalOf(sheetName, title);
    let date = "";
    for (let i = 0; i < Math.min(headerIndex, 5); i++) {
      date = parseDateText((matrix[i] as unknown[])[0]);
      if (date) break;
    }
    if (!date) {
      issues++;
      return;
    }
    const idx = (key: string, fallback: number) =>
      header.findIndex(h => h.includes(key)) >= 0
        ? header.findIndex(h => h.includes(key))
        : fallback;
    const unitIdx = idx("unidade", 1),
      timeIdx = idx("horario", 3),
      statusIdx = idx("status", 8),
      nameIdx = idx("nome completo", 6);
    (matrix.slice(headerIndex + 1) as unknown[][]).forEach(r => {
      const slot = String(r[0] ?? "").trim();
      if (!/^\d+(?:\.0)?$/.test(slot)) return;
      const name = String(r[nameIdx] ?? "").trim();
      const status = statusOf(r[statusIdx], name);
      if (!status) {
        issues++;
        return;
      }
      rows.push({
        date,
        month_label: monthName(toDate(date)),
        professional,
        unit: String(r[unitIdx] ?? "").trim() || "Não informado",
        weekday: toDate(date).toLocaleDateString("pt-BR", { weekday: "long" }),
        hour: parseHour(r[timeIdx]),
        status,
      });
    });
  });
  return { rows, issues, sheetCount: workbook.SheetNames.length };
}

function exportCsv(rows: RecordRow[]) {
  const header = "data;mes;profissional;unidade;dia;horario;status\n";
  const body = rows
    .map(r =>
      [
        r.date,
        r.month_label,
        r.professional,
        r.unit,
        r.weekday,
        r.hour,
        r.status,
      ]
        .map(v => `"${String(v).replaceAll('"', '""')}"`)
        .join(";")
    )
    .join("\n");
  const blob = new Blob(["\ufeff" + header + body], {
    type: "text/csv;charset=utf-8",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `relatorio-atendimentos-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function exportXlsx(rows: RecordRow[]) {
  const ws = XLSX.utils.json_to_sheet(
    rows.map(r => ({
      Data: r.date,
      Mês: r.month_label,
      Profissional: r.professional,
      Unidade: r.unit,
      Dia: r.weekday,
      Horário: r.hour,
      Status: r.status,
    }))
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");
  XLSX.writeFile(
    wb,
    `relatorio-atendimentos-${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

export default function Home() {
  const auth = useAuth();
  const isGithubPages = window.location.hostname.endsWith("github.io");
  const fileRef = useRef<HTMLInputElement>(null);
  const [base, setBase] = useState<BaseData | null>(null);
  const [tab, setTab] = useState<"dashboard" | "import" | "reports" | "access">(
    "dashboard"
  );
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [professional, setProfessional] = useState("all");
  const [unit, setUnit] = useState("all");
  const [status, setStatus] = useState("all");
  const [grouping, setGrouping] = useState("month");
  const [notice, setNotice] = useState("Carregando base operacional…");
  const [preview, setPreview] = useState<{
    file: string;
    rows: RecordRow[];
    issues: number;
    sheetCount: number;
  } | null>(null);
  const [logs, setLogs] = useState<ImportLog[]>(() =>
    JSON.parse(localStorage.getItem("atendimentos-imports") || "[]")
  );
  useState(() => {
    fetch("./base-data.json")
      .then(r => r.json())
      .then((d: BaseData) => {
        setBase(d);
        setNotice("Base pronta para análise");
      })
      .catch(() => setNotice("Não foi possível carregar a base inicial"));
  });
  const rows = base?.records ?? [];
  const professionals = useMemo(
    () => [...new Set(rows.map(r => r.professional))].sort(),
    [rows]
  );
  const units = useMemo(
    () => [...new Set(rows.map(r => r.unit))].sort(),
    [rows]
  );
  const minDate = rows.length ? rows.map(r => r.date).sort()[0] : "2026-01-01";
  const maxDate = rows.length
    ? rows
        .map(r => r.date)
        .sort()
        .at(-1)!
    : "2026-12-31";
  const filtered = useMemo(
    () =>
      rows.filter(
        r =>
          (!start || r.date >= start) &&
          (!end || r.date <= end) &&
          (professional === "all" || r.professional === professional) &&
          (unit === "all" || r.unit === unit) &&
          (status === "all" || r.status === status)
      ),
    [rows, start, end, professional, unit, status]
  );
  const metrics = useMemo(() => {
    const scheduled = filtered.filter(
      r => !["Vagas livres", "Remanejado", "Feriado"].includes(r.status)
    ).length;
    const attended = filtered.filter(r => r.status === "Atendido").length;
    return {
      total: filtered.length,
      scheduled,
      attended,
      noShow: filtered.filter(r => r.status === "Não atendido").length,
      loss: filtered.filter(r =>
        ["Cancelado", "Desistência"].includes(r.status)
      ).length,
      vacancies: filtered.filter(r => r.status === "Vagas livres").length,
      unknown: filtered.filter(r => r.status === "Sem status").length,
      rate: scheduled ? (attended / scheduled) * 100 : 0,
    };
  }, [filtered]);
  const groups = useMemo(() => {
    const m = new Map<string, { attended: number; loss: number }>();
    filtered.forEach(r => {
      let key = r.month_label;
      if (grouping === "day")
        key = new Date(r.date + "T12:00:00").toLocaleDateString("pt-BR");
      if (grouping === "week") {
        const d = toDate(r.date);
        const day = d.getDay() || 7;
        d.setDate(d.getDate() - day + 1);
        key = d.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        });
      }
      const v = m.get(key) || { attended: 0, loss: 0 };
      if (r.status === "Atendido") v.attended++;
      if (["Não atendido", "Cancelado", "Desistência"].includes(r.status))
        v.loss++;
      m.set(key, v);
    });
    return [...m.entries()];
  }, [filtered, grouping]);
  const applyRange = (days: number | null) => {
    if (!days) {
      setStart("");
      setEnd("");
      return;
    }
    const e = maxDate;
    const d = toDate(e);
    d.setDate(d.getDate() - days + 1);
    setStart(d.toISOString().slice(0, 10));
    setEnd(e);
  };
  const importFile = async (file: File) => {
    setNotice("Lendo planilha e removendo campos pessoais…");
    try {
      const result = await parseWorkbook(file);
      const dedupe = new Set(
        rows.map(
          r => `${r.date}|${r.professional}|${r.unit}|${r.hour}|${r.status}`
        )
      );
      const unique = result.rows.filter(
        r =>
          !dedupe.has(
            `${r.date}|${r.professional}|${r.unit}|${r.hour}|${r.status}`
          )
      );
      setPreview({
        file: file.name,
        rows: unique,
        issues: result.issues,
        sheetCount: result.sheetCount,
      });
      setNotice("Prévia pronta — confirme para atualizar a base");
    } catch {
      setNotice("Não foi possível interpretar esta planilha");
    }
  };
  const confirmImport = () => {
    if (!preview) return;
    const next = [...(base?.records ?? []), ...preview.rows];
    const log = {
      id: crypto.randomUUID(),
      file: preview.file,
      at: new Date().toISOString(),
      rows: preview.rows.length,
      accepted: preview.rows.length,
      duplicates: 0,
      issues: preview.issues,
      user: auth.user?.name || auth.user?.email || "usuário autenticado",
    };
    const nextLogs = [log, ...logs];
    setBase({
      meta: {
        generated_at: new Date().toISOString(),
        sheets_analyzed: preview.sheetCount,
        records: next.length,
      },
      records: next,
    });
    setLogs(nextLogs);
    localStorage.setItem("atendimentos-imports", JSON.stringify(nextLogs));
    setPreview(null);
    setTab("dashboard");
    setNotice(
      `Importação concluída: ${fmt(log.accepted)} registros adicionados`
    );
  };
  if (!base)
    return (
      <div className="loading-screen">
        <div className="logo-mark">A</div>
        <strong>Painel de atendimentos</strong>
        <span>{notice}</span>
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="logo-mark">A</div>
          <div>
            <strong>Atende</strong>
            <small>gestão operacional</small>
          </div>
        </div>
        <nav>
          <button
            className={tab === "dashboard" ? "active" : ""}
            onClick={() => setTab("dashboard")}
          >
            <LayoutDashboard />
            Dashboard
          </button>
          <button
            className={tab === "import" ? "active" : ""}
            onClick={() => setTab("import")}
          >
            <FileUp />
            Atualizar Excel
          </button>
          <button
            className={tab === "reports" ? "active" : ""}
            onClick={() => setTab("reports")}
          >
            <Download />
            Relatórios
          </button>
          {!isGithubPages && (
            <button
              className={tab === "access" ? "active" : ""}
              onClick={() => setTab("access")}
            >
              <Users />
              Acessos
            </button>
          )}
        </nav>
        <div className="sidebar-foot">
          <ShieldCheck />
          <span>
            Dados agregados
            <br />
            <b>sem identificadores pessoais</b>
          </span>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="kicker">Centro de controle</span>
            <h1>
              {tab === "dashboard"
                ? "Visão geral"
                : tab === "import"
                  ? "Atualizar base"
                  : tab === "reports"
                    ? "Relatórios"
                    : "Acessos e permissões"}
            </h1>
          </div>
          <div className="top-actions">
            <span className="public-access">Acesso público</span>
          </div>
        </header>
        <div className="notice">
          <span>
            <CheckCircle2 />
            {notice}
          </span>
          <span className="updated">{fmt(rows.length)} registros na base</span>
        </div>
        {tab === "dashboard" && (
          <DashboardView
            metrics={metrics}
            filtered={filtered}
            professionals={professionals}
            units={units}
            start={start}
            end={end}
            professional={professional}
            unit={unit}
            status={status}
            grouping={grouping}
            setStart={setStart}
            setEnd={setEnd}
            setProfessional={setProfessional}
            setUnit={setUnit}
            setStatus={setStatus}
            setGrouping={setGrouping}
            applyRange={applyRange}
            groups={groups}
          />
        )}{" "}
        {tab === "import" && (
          <ImportView
            fileRef={fileRef}
            preview={preview}
            onPick={importFile}
            onConfirm={confirmImport}
            onCancel={() => setPreview(null)}
            logs={logs}
          />
        )}{" "}
        {tab === "reports" && (
          <ReportsView
            rows={filtered}
            metrics={metrics}
            onCsv={() => exportCsv(filtered)}
            onXlsx={() => exportXlsx(filtered)}
            onPrint={() => window.print()}
          />
        )}{" "}
        {tab === "access" && <AccessView auth={auth} />}
      </main>
    </div>
  );
}

function DashboardView(p: {
  metrics: any;
  filtered: RecordRow[];
  professionals: string[];
  units: string[];
  start: string;
  end: string;
  professional: string;
  unit: string;
  status: string;
  grouping: string;
  setStart: (v: string) => void;
  setEnd: (v: string) => void;
  setProfessional: (v: string) => void;
  setUnit: (v: string) => void;
  setStatus: (v: string) => void;
  setGrouping: (v: string) => void;
  applyRange: (v: number | null) => void;
  groups: [string, { attended: number; loss: number }][];
}) {
  const statusCounts = STATUS.map(s => ({
    s,
    n: p.filtered.filter(r => r.status === s).length,
  })).filter(x => x.n);
  const prof = p.professionals
    .map(x => ({
      name: x,
      n: p.filtered.filter(r => r.professional === x && r.status === "Atendido")
        .length,
    }))
    .sort((a, b) => b.n - a.n);
  const max = Math.max(...prof.map(x => x.n), 1);
  const maxGroup = Math.max(
    ...p.groups.flatMap(x => [x[1].attended, x[1].loss]),
    1
  );
  return (
    <div className="content">
      <section className="filters-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">Análise flexível</span>
            <h2>Escolha o recorte da operação</h2>
          </div>
          <span className="period-chip">
            {p.start || p.end
              ? `${p.start || "início"} → ${p.end || "fim"}`
              : "período completo"}
          </span>
        </div>
        <div className="filter-grid">
          <label>
            Data inicial
            <input
              type="date"
              value={p.start}
              onChange={e => p.setStart(e.target.value)}
            />
          </label>
          <label>
            Data final
            <input
              type="date"
              value={p.end}
              onChange={e => p.setEnd(e.target.value)}
            />
          </label>
          <label>
            Agrupamento
            <select
              value={p.grouping}
              onChange={e => p.setGrouping(e.target.value)}
            >
              <option value="day">Diário</option>
              <option value="week">Semanal</option>
              <option value="month">Mensal</option>
            </select>
          </label>
          <label>
            Profissional
            <select
              value={p.professional}
              onChange={e => p.setProfessional(e.target.value)}
            >
              <option value="all">Todos os profissionais</option>
              {p.professionals.map(x => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Unidade
            <select value={p.unit} onChange={e => p.setUnit(e.target.value)}>
              <option value="all">Todas as unidades</option>
              {p.units.map(x => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={p.status}
              onChange={e => p.setStatus(e.target.value)}
            >
              <option value="all">Todos os status</option>
              {STATUS.map(x => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="shortcuts">
          <span>Atalhos</span>
          <button onClick={() => p.applyRange(null)}>Tudo</button>
          <button onClick={() => p.applyRange(7)}>7 dias</button>
          <button onClick={() => p.applyRange(30)}>30 dias</button>
          <button onClick={() => p.applyRange(90)}>90 dias</button>
        </div>
      </section>
      <div className="metric-grid">
        <Metric
          label="Atendidos"
          value={p.metrics.attended}
          hint={`taxa ${pct(p.metrics.rate)}`}
          tone="good"
          icon={<CheckCircle2 />}
        />
        <Metric
          label="Não atendidos"
          value={p.metrics.noShow}
          hint="requer atenção"
          tone="bad"
          icon={<XCircle />}
        />
        <Metric
          label="Cancelados + desistências"
          value={p.metrics.loss}
          hint="perdas operacionais"
          tone="warn"
          icon={<CircleAlert />}
        />
        <Metric
          label="Vagas livres"
          value={p.metrics.vacancies}
          hint="capacidade não ocupada"
          tone="neutral"
          icon={<CalendarDays />}
        />
        <Metric
          label="Sem status"
          value={p.metrics.unknown}
          hint="revisar cadastro"
          tone="neutral"
          icon={<CircleAlert />}
        />
      </div>
      <div className="analysis-grid">
        <Panel
          title="Evolução do período"
          meta={
            p.grouping === "day"
              ? "diário"
              : p.grouping === "week"
                ? "semanal"
                : "mensal"
          }
          wide
        >
          <div className="trend-chart">
            {p.groups.map(([label, v]) => (
              <div className="trend-col" key={label}>
                <div className="bars">
                  <i
                    style={{
                      height: `${Math.max(4, (v.attended / maxGroup) * 190)}px`,
                      background: "#10a89e",
                    }}
                    title={`Atendidos: ${v.attended}`}
                  />
                  <i
                    style={{
                      height: `${Math.max(4, (v.loss / maxGroup) * 190)}px`,
                      background: "#e45d69",
                    }}
                    title={`Perdas: ${v.loss}`}
                  />
                </div>
                <small>{label}</small>
              </div>
            ))}
          </div>
          <div className="legend">
            <span>
              <i style={{ background: "#10a89e" }} />
              Atendidos
            </span>
            <span>
              <i style={{ background: "#e45d69" }} />
              Perdas
            </span>
          </div>
        </Panel>
        <Panel title="Status da agenda" meta="registros filtrados">
          <div className="status-list">
            {statusCounts.map(x => (
              <div className="status-row" key={x.s}>
                <span>
                  <i style={{ background: STATUS_COLOR[x.s] }} />
                  {x.s}
                </span>
                <b>{fmt(x.n)}</b>
                <em>
                  {p.filtered.length
                    ? Math.round((x.n / p.filtered.length) * 100)
                    : 0}
                  %
                </em>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Atendimentos por profissional" meta="realizados">
          <div className="rank-list">
            {prof.map(x => (
              <div className="rank" key={x.name}>
                <div>
                  <span>{x.name}</span>
                  <b>{fmt(x.n)}</b>
                </div>
                <div className="bar">
                  <i style={{ width: `${(x.n / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Leitura rápida" meta="insights">
          <div className="insight-copy">
            <p>
              <strong>{fmt(p.metrics.attended)}</strong> atendimentos realizados
              no recorte atual, com taxa de{" "}
              <strong>{pct(p.metrics.rate)}</strong>.
            </p>
            <p>
              Há <strong>{fmt(p.metrics.noShow + p.metrics.loss)}</strong>{" "}
              ocorrências de não atendimento, cancelamento ou desistência.
            </p>
            <p>
              Use o módulo <strong>Relatórios</strong> para extrair esta visão
              em CSV, Excel ou PDF.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
function Metric({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: number;
  hint: string;
  tone: string;
  icon: React.ReactNode;
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{fmt(value)}</strong>
      <small>{hint}</small>
    </article>
  );
}
function Panel({
  title,
  meta,
  children,
  wide = false,
}: {
  title: string;
  meta: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <article className={`panel ${wide ? "wide" : ""}`}>
      <div className="panel-heading">
        <h3>{title}</h3>
        <span>{meta}</span>
      </div>
      {children}
    </article>
  );
}
function ImportView({
  fileRef,
  preview,
  onPick,
  onConfirm,
  onCancel,
  logs,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  preview: any;
  onPick: (f: File) => void;
  onConfirm: () => void;
  onCancel: () => void;
  logs: ImportLog[];
}) {
  return (
    <div className="content">
      <div className="page-intro">
        <div>
          <span className="eyebrow">Atualização semanal</span>
          <h2>Atualize a base sem retrabalho</h2>
          <p>
            Envie o Excel, revise a prévia e confirme. Campos pessoais são
            descartados antes de entrar no painel.
          </p>
        </div>
        <FileSpreadsheet size={42} />
      </div>
      <section className="upload-card">
        <input
          ref={fileRef}
          hidden
          type="file"
          accept=".xlsx,.xls"
          onChange={e => e.target.files?.[0] && onPick(e.target.files[0])}
        />
        {!preview ? (
          <>
            <div
              className="upload-drop"
              onClick={() => fileRef.current?.click()}
            >
              <FileUp size={30} />
              <strong>Arraste ou selecione sua planilha Excel</strong>
              <span>
                Formatos aceitos: .xlsx e .xls · a validação acontece antes da
                gravação
              </span>
              <Button onClick={() => fileRef.current?.click()}>
                Selecionar arquivo
              </Button>
            </div>
          </>
        ) : (
          <div className="preview-box">
            <div className="preview-header">
              <div>
                <span className="eyebrow">Prévia da importação</span>
                <h3>{preview.file}</h3>
              </div>
              <Button variant="ghost" onClick={onCancel}>
                <XCircle />
                Cancelar
              </Button>
            </div>
            <div className="preview-stats">
              <div>
                <b>{fmt(preview.rows.length)}</b>
                <span>novos registros</span>
              </div>
              <div>
                <b>{preview.sheetCount}</b>
                <span>abas lidas</span>
              </div>
              <div>
                <b>{preview.issues}</b>
                <span>inconsistências</span>
              </div>
              <div>
                <b>{preview.rows.length ? "0" : "—"}</b>
                <span>duplicidades</span>
              </div>
            </div>
            <div className="preview-table">
              {preview.rows.slice(0, 7).map((r: RecordRow, i: number) => (
                <div key={i}>
                  <span>{r.date}</span>
                  <span>{r.professional}</span>
                  <span>{r.unit}</span>
                  <span className="tag">{r.status}</span>
                </div>
              ))}
            </div>
            <Button className="confirm" onClick={onConfirm}>
              <CheckCircle2 />
              Confirmar importação
            </Button>
          </div>
        )}
      </section>
      <Panel title="Histórico de importações" meta={`${logs.length} registros`}>
        <div className="history-list">
          {logs.length ? (
            logs.map(log => (
              <div className="history-row" key={log.id}>
                <div className="history-icon">
                  <History />
                </div>
                <div>
                  <b>{log.file}</b>
                  <span>
                    {new Date(log.at).toLocaleString("pt-BR")} · {log.user}
                  </span>
                </div>
                <strong>{fmt(log.accepted)} registros</strong>
              </div>
            ))
          ) : (
            <div className="empty">
              Nenhuma importação feita nesta sessão ainda.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
function ReportsView({
  rows,
  metrics,
  onCsv,
  onXlsx,
  onPrint,
}: {
  rows: RecordRow[];
  metrics: any;
  onCsv: () => void;
  onXlsx: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="content">
      <div className="page-intro">
        <div>
          <span className="eyebrow">Saída operacional</span>
          <h2>Relatórios prontos para compartilhar</h2>
          <p>
            Os arquivos respeitam o recorte atual do dashboard e não contêm
            identificadores pessoais.
          </p>
        </div>
        <Download size={42} />
      </div>
      <div className="report-grid">
        <article className="report-main">
          <div className="report-banner">
            <div>
              <span>Visão atual</span>
              <strong>{fmt(rows.length)} registros</strong>
            </div>
            <div>
              <span>Atendidos</span>
              <strong>{fmt(metrics.attended)}</strong>
            </div>
            <div>
              <span>Taxa</span>
              <strong>{pct(metrics.rate)}</strong>
            </div>
          </div>
          <div className="report-table">
            <div className="table-head">
              <span>Data</span>
              <span>Profissional</span>
              <span>Unidade</span>
              <span>Status</span>
            </div>
            {rows.slice(0, 18).map((r, i) => (
              <div className="table-row" key={i}>
                <span>{r.date}</span>
                <span>{r.professional}</span>
                <span>{r.unit}</span>
                <span className="tag">{r.status}</span>
              </div>
            ))}
          </div>
          <small className="table-note">
            Exibindo até 18 linhas na prévia. A exportação contém todos os
            registros filtrados.
          </small>
        </article>
        <aside className="export-box">
          <h3>Exportar relatório</h3>
          <p>Escolha o formato mais útil para sua rotina.</p>
          <Button onClick={onCsv}>
            <Download />
            Baixar CSV
          </Button>
          <Button variant="outline" onClick={onXlsx}>
            <FileSpreadsheet />
            Baixar Excel
          </Button>
          <Button variant="outline" onClick={onPrint}>
            <Printer />
            Imprimir / PDF
          </Button>
        </aside>
      </div>
    </div>
  );
}
function AccessView({ auth }: { auth: any }) {
  const [form, setForm] = useState({ username: "", password: "", name: "" });
  const [message, setMessage] = useState("");
  const setupStatus = trpc.auth.setupStatus.useQuery();
  const localUsers = trpc.auth.localUsers.useQuery(undefined, {
    enabled: auth.user?.role === "admin",
  });
  const setupAdmin = trpc.auth.setupAdmin.useMutation({
    onSuccess: () => window.location.reload(),
    onError: e => setMessage(e.message),
  });
  const loginPassword = trpc.auth.loginPassword.useMutation({
    onSuccess: () => window.location.reload(),
    onError: e => setMessage(e.message),
  });
  const createUser = trpc.auth.createLocalUser.useMutation({
    onSuccess: () => {
      setMessage("Acesso criado.");
      setForm({ username: "", password: "", name: "" });
      localUsers.refetch();
    },
    onError: e => setMessage(e.message),
  });
  const toggleUser = trpc.auth.toggleLocalUser.useMutation({
    onSuccess: () => localUsers.refetch(),
  });
  const submitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    loginPassword.mutate({ username: form.username, password: form.password });
  };
  const submitSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setupAdmin.mutate({
      username: form.username,
      password: form.password,
      name: form.name,
    });
  };
  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate({
      username: form.username,
      password: form.password,
      name: form.name,
      role: "user",
    });
  };
  return (
    <div className="content">
      <div className="page-intro">
        <div>
          <span className="eyebrow">Controle seguro</span>
          <h2>Acessos e permissões</h2>
          <p>
            Crie um administrador e depois cadastre os acessos de gestores e
            visualizadores.
          </p>
        </div>
        <ShieldCheck size={42} />
      </div>
      <section className="access-card">
        <div className="access-icon">
          <Users />
        </div>
        <h3>
          {auth.user?.role === "admin"
            ? `Olá, ${auth.user.name || "administrador"}`
            : setupStatus.data?.configured
              ? "Entrar no painel"
              : "Primeiro acesso: criar administrador"}
        </h3>
        <p>
          {message ||
            "Os usuários ficam armazenados com senha protegida no banco da aplicação gerenciada."}
        </p>
        {auth.user?.role === "admin" ? (
          <>
            <div className="permission-grid">
              <div>
                <b>Perfil atual</b>
                <span>Administrador</span>
              </div>
              <div>
                <b>Importação</b>
                <span>Permitida</span>
              </div>
            </div>
            <form className="login-form" onSubmit={submitCreate}>
              <strong>Novo acesso visualizador</strong>
              <input
                placeholder="Nome"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
              />
              <input
                placeholder="Usuário"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                required
              />
              <input
                placeholder="Senha (8+ caracteres)"
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
              />
              <Button type="submit">Criar acesso</Button>
            </form>
            <div className="user-list">
              {(localUsers.data || []).map(u => (
                <div className="user-row" key={u.id}>
                  <span>
                    <b>{u.name}</b>
                    <small>
                      @{u.username} · {u.role}
                    </small>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toggleUser.mutate({ id: u.id, isActive: !u.isActive })
                    }
                  >
                    {u.isActive ? "Bloquear" : "Reativar"}
                  </Button>
                </div>
              ))}
            </div>
          </>
        ) : setupStatus.data?.configured ? (
          <form className="login-form" onSubmit={submitLogin}>
            <input
              placeholder="Usuário"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
            <input
              placeholder="Senha"
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
            <Button type="submit">Entrar</Button>
          </form>
        ) : (
          <form className="login-form" onSubmit={submitSetup}>
            <input
              placeholder="Nome do administrador"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              placeholder="Usuário"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              required
            />
            <input
              placeholder="Senha (8+ caracteres)"
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
            <Button type="submit">Criar administrador</Button>
          </form>
        )}
      </section>
    </div>
  );
}
