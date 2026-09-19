"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Download,
  FileText,
  Gauge,
  History,
  Info,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Upload,
  Waves,
  AlertCircle,
  Clock,
  ArrowDown,
} from "lucide-react";
import { Dialog } from "../components/ui/dialog";
import type {
  CaseSnapshot,
  Context,
  ImportPreview,
  ObservationInput,
  PolicyDecision,
  RepairComparison,
  WorkspaceState,
  StoredReport,
} from "../domain/types";
import { measureWindow } from "../domain/observations";
import { parseTotalMl } from "../domain/units";
type CaseView = CaseSnapshot & {
  policy: PolicyDecision;
  comparison: RepairComparison;
};
type State = Omit<WorkspaceState, "cases"> & { cases: CaseView[] };
const labels: Record<string, string> = {
  insufficient_evidence: "Not enough evidence",
  context_unresolved: "Context needed",
  water_movement_observed: "Movement observed",
  no_movement_above_resolution: "Below display allowance",
  observed_reduction: "Observed reduction",
  no_clear_reduction: "No clear reduction",
  not_comparable: "Not comparable",
};
const num = (n: number | null, d = 2) =>
  n === null
    ? "—"
    : n.toLocaleString("en-IN", {
        maximumFractionDigits: d,
        minimumFractionDigits: d,
      });
const time = (s: string, timezone = "Asia/Kolkata") =>
  new Date(s).toLocaleString("en-GB", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const blankContext: Context = {
  declaredNoUse: "unknown",
  scheduledUse: "unknown",
  automaticUse: "unknown",
  supplyStatus: "unknown",
  storageStatus: "unknown",
  meterHealth: "unknown",
  healthEvidenceId: null,
  regimeId: "",
  recordedBy: "",
  recordedAt: new Date().toISOString(),
};
function Badge({ outcome }: { outcome: string }) {
  return (
    <span
      className={`badge ${outcome === "observed_reduction" ? "positive" : outcome === "water_movement_observed" ? "blue" : "amber"}`}
    >
      <span className="status-dot" />
      {labels[outcome] || outcome.replaceAll("_", " ")}
    </span>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function ContextFields({
  value,
  set,
  health,
}: {
  value: Context;
  set: (c: Context) => void;
  health: { id: string; basis: string }[];
}) {
  const fields: [keyof Context, string, string[]][] = [
    ["declaredNoUse", "No water use declared", ["unknown", "yes", "no"]],
    [
      "scheduledUse",
      "Cleaning / scheduled use",
      ["unknown", "none", "present"],
    ],
    [
      "automaticUse",
      "Automatic filling / irrigation",
      ["unknown", "none", "present"],
    ],
    [
      "supplyStatus",
      "Supply during observation",
      ["unknown", "available", "interrupted"],
    ],
    [
      "storageStatus",
      "Storage conditions",
      ["unknown", "stable", "changing", "not_applicable"],
    ],
    ["meterHealth", "Meter response", ["unknown", "supported", "suspect"]],
  ];
  return (
    <>
      <div className="form-grid">
        {fields.map(([key, label, options]) => (
          <Field key={key} label={label}>
            <select
              value={String(value[key])}
              onChange={(e) => set({ ...value, [key]: e.target.value })}
            >
              {options.map((o) => (
                <option key={o} value={o}>
                  {o.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>
        ))}
        <Field label="Operating regime">
          <input
            value={value.regimeId}
            placeholder="e.g. Term time, normal occupancy"
            onChange={(e) => set({ ...value, regimeId: e.target.value })}
          />
        </Field>
        <Field label="Recorded by">
          <input
            required
            value={value.recordedBy}
            onChange={(e) => set({ ...value, recordedBy: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Supporting meter-health report">
        <select
          value={value.healthEvidenceId || ""}
          onChange={(e) =>
            set({ ...value, healthEvidenceId: e.target.value || null })
          }
        >
          <option value="">Unknown / no report</option>
          {health.map((h) => (
            <option value={h.id} key={h.id}>
              {h.basis.slice(0, 100)}
            </option>
          ))}
        </select>
      </Field>
      <p className="hint">
        A supported meter needs an attributed report covering the observation.
        Never interrupt essential water service to create a no-use window.
      </p>
    </>
  );
}
export default function Workspace() {
  const router = useRouter(),
    path = usePathname();
  const retryKeys = useRef(new Map<string, string>());
  const [state, setState] = useState<State | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [dialog, setDialog] = useState<string | null>(null),
    [tab, setTab] = useState("overview"),
    [selectedObservation, setSelectedObservation] =
      useState<ObservationInput | null>(null),
    [context, setContext] = useState<Context>(blankContext),
    [preview, setPreview] = useState<ImportPreview | null>(null),
    [exclude, setExclude] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const f = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));
  const refresh = useCallback(async () => {
    const r = await fetch("/api/state");
    if (r.ok) setState(await r.json());
    else if (r.status === 401) setState(null);
    else {
      const x = await r.json();
      setError(x.error.message);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    let live = true;
    fetch("/api/state")
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          if (live) setState(data);
        } else if (r.status !== 401) {
          const data = await r.json();
          if (live) setError(data.error.message);
        }
      })
      .catch(() => {
        if (live) setError("Unable to load the workspace. Please reload.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);
  async function send(url: string, body: unknown, revision?: number) {
    const signature = url + JSON.stringify(body) + revision;
    const key = retryKeys.current.get(signature) || crypto.randomUUID();
    retryKeys.current.set(signature, key);
    const r = await fetch("/api/" + url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": key,
        ...(revision === undefined ? {} : { "If-Match": String(revision) }),
      },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) {
      if (r.status < 500) retryKeys.current.delete(signature);
      throw new Error(
        (data.error?.message || "Unable to save") +
          (data.error?.requestId
            ? " · Request " + data.error.requestId.slice(0, 8)
            : ""),
      );
    }
    retryKeys.current.delete(signature);
    return data;
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function start(mode: "synthetic" | "uploaded") {
    await run(async () => {
      setState(await send("workspaces", { mode }));
      router.push("/cases");
      setDialog(null);
    });
  }
  const caseId = path.startsWith("/cases/") ? path.split("/")[2] : null;
  const active = state?.cases.find((c) => c.id === caseId) || null;
  const report = state?.reports.find((r) => r.id === path.split("/")[2]);
  async function event(body: unknown) {
    if (!active) return;
    await run(async () => {
      await send(`cases/${active.id}/events`, body, active.revision);
      await refresh();
      setDialog(null);
      setNotice("Evidence saved. Recommendation updated.");
    });
  }
  function open(name: string) {
    setForm({});
    setError("");
    setDialog(name);
  }
  function editContext(w: ObservationInput) {
    setSelectedObservation(w);
    setContext(w.context);
    open("context");
  }
  function openObservation(w?: ObservationInput) {
    open("observation");
    setSelectedObservation(w || null);
    setContext(
      w
        ? { ...w.context }
        : { ...blankContext, recordedAt: new Date().toISOString() },
    );
    if (w)
      setForm({
        start: w.start?.id || "",
        end: w.end?.id || "",
        phase: w.phase,
      });
  }
  async function exportReport() {
    if (!active) return;
    await run(async () => {
      const r = await send(`cases/${active.id}/reports`, {}, active.revision);
      await refresh();
      router.push(`/reports/${r.id}`);
    });
  }
  const meter =
    state?.meters.find((m) => m.id === active?.meterId) || state?.meters[0];
  const source =
    state?.mode === "synthetic"
      ? "Simulated historical replay"
      : "Your readings · temporary workspace";
  if (loading)
    return (
      <div className="loading">
        <Gauge />
        Opening your field notebook…
      </div>
    );
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {!state ? (
        <div className="entry">
          <header className="entry-header">
            <Logo />
            <span>WATER INVESTIGATION NOTEBOOK</span>
            <button className="text-button" onClick={() => open("about")}>
              About the method <ArrowUpRight size={16} />
            </button>
          </header>
          <main id="main" className="entry-main">
            <div className="eyebrow">
              <span className="tiny-line" />
              FROM READING TO REASON
            </div>
            <h1>
              A reading raises
              <br />a question.
              <br />
              <span>Follow the evidence.</span>
            </h1>
            <p className="entry-description">
              Make sense of unexpected water use. Find the next useful check,
              record what happened, and see what changed after a repair.
            </p>
            <div className="entry-actions">
              <button
                className="primary"
                disabled={busy}
                onClick={() => start("synthetic")}
              >
                Explore a sample investigation <ArrowRight size={18} />
              </button>
              <button className="secondary" onClick={() => open("start")}>
                Start with your readings
              </button>
            </div>
            <p className="hint">
              <ShieldCheck size={15} /> No login. No sensor required. Sample
              data is synthetic.
            </p>
            <div className="entry-steps">
              {[
                [
                  "01",
                  "Read the interval",
                  "Start with two cumulative meter readings.",
                ],
                [
                  "02",
                  "Resolve the unknown",
                  "Collect the context that changes your next step.",
                ],
                [
                  "03",
                  "Check what changed",
                  "Compare the evidence after an intervention.",
                ],
              ].map(([n, t, d]) => (
                <div key={n}>
                  <span className="mono">{n}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          </main>
          <aside className="entry-note">
            <div className="note-top">
              <span>FIELD NOTE / 001</span>
              <Waves size={22} />
            </div>
            <h2>
              216 litres.
              <br />
              One unanswered question.
            </h2>
            <div className="sample-meter">
              <span>100,000 L</span>
              <span className="meter-guide" />
              <span>100,216 L</span>
            </div>
            <div className="sample-times">
              <span>02:00</span>
              <span>04:00</span>
            </div>
            <div className="note-question">
              <span className="circle-icon">
                <Search size={22} />
              </span>
              <div>
                <strong>Was cleaning scheduled?</strong>
                <p>
                  Consumption is a fact.
                  <br />
                  The cause needs another check.
                </p>
              </div>
            </div>
            <div className="note-footer">
              HOSTEL A <span>ILLUSTRATIVE SAMPLE</span>
            </div>
          </aside>
        </div>
      ) : (
        <div className="app-shell">
          <aside className="rail">
            <Logo />
            <div className="workspace-label">FIELD WORKSPACE</div>
            <nav>
              <button
                className={
                  path.startsWith("/cases") ? "nav-item active" : "nav-item"
                }
                onClick={() => router.push("/cases")}
              >
                <BookOpen size={18} />
                Investigations
                <span>{state.cases.length.toString().padStart(2, "0")}</span>
              </button>
              <button
                className={
                  path === "/readings" ? "nav-item active" : "nav-item"
                }
                onClick={() => router.push("/readings")}
              >
                <Gauge size={18} />
                Meter readings
              </button>
              <button
                className={
                  path.startsWith("/reports") ? "nav-item active" : "nav-item"
                }
                onClick={() => router.push("/reports")}
              >
                <FileText size={18} />
                Evidence receipts
              </button>
            </nav>
            <div className="rail-bottom">
              <div className="rule-mark">
                <ShieldCheck size={20} />
                <p>
                  Evidence before
                  <br />
                  assumptions.
                </p>
              </div>
              <button className="nav-item" onClick={() => open("about")}>
                <Info size={18} />
                About & methods
              </button>
              <div className="workspace-person">
                <span>FP</span>
                <div>
                  Temporary workspace<small>14-day access</small>
                </div>
              </div>
            </div>
          </aside>
          <div className="app-main">
            <header className="topbar">
              <div className="source-label">
                <span className="status-dot" />
                {source}
              </div>
              <div className="topbar-actions">
                {state.mode === "synthetic" && (
                  <button className="text-button" onClick={() => open("reset")}>
                    <RotateCcw size={14} />
                    Reset sample
                  </button>
                )}
                <button
                  className="icon-button"
                  aria-label="About this workspace"
                  onClick={() => open("about")}
                >
                  <Info size={18} />
                </button>
              </div>
            </header>
            <main id="main" className="main-content">
              {error && (
                <div role="alert" className="error-banner">
                  <AlertCircle size={18} />
                  {error}
                  <button
                    className="text-button"
                    onClick={() => {
                      setError("");
                      void refresh();
                    }}
                  >
                    Reload
                  </button>
                </div>
              )}
              <div role="status" className={notice ? "notice" : "sr-only"}>
                {notice}
              </div>
              {active ? (
                <>
                  <div className="breadcrumb">
                    <button onClick={() => router.push("/cases")}>
                      Investigations
                    </button>
                    <ChevronRight size={14} />
                    <span>{active.name}</span>
                    <span className="mono">
                      FP · {active.id === "hostel-a" ? "001" : "002"}
                    </span>
                  </div>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">
                        {active.repairAt
                          ? "FOLLOW-UP INVESTIGATION"
                          : "OPEN INVESTIGATION"}{" "}
                        <span>
                          REV {String(active.revision).padStart(2, "0")}
                        </span>
                      </div>
                      <h1>
                        {active.name}:{" "}
                        {active.repairAt
                          ? "follow the repair evidence"
                          : "investigate overnight use"}
                      </h1>
                      <p>
                        {active.repairAt
                          ? "A reported repair starts the follow-up. Comparable readings tell us what changed."
                          : "A little more context makes the next step clearer."}
                      </p>
                    </div>
                    <button
                      className="secondary"
                      onClick={exportReport}
                      disabled={busy}
                    >
                      <FileText size={16} />
                      Create receipt
                    </button>
                  </div>
                  <div className="case-strip">
                    <span>
                      <Gauge size={16} />
                      {meter?.name || active.meterId}
                    </span>
                    <span>
                      <Clock size={15} />
                      {meter?.timezone || "Asia/Kolkata"}
                    </span>
                    <Badge outcome={active.policy.outcome} />
                  </div>
                  <div className="case-layout">
                    <section className="case-body">
                      <div
                        className="tabs"
                        role="tablist"
                        aria-label="Case views"
                      >
                        {[
                          ["overview", "Investigation"],
                          ["sources", "Source readings"],
                          ["history", "Activity log"],
                        ].map(([id, label]) => (
                          <button
                            role="tab"
                            tabIndex={tab === id ? 0 : -1}
                            onKeyDown={(e) => {
                              const ids = ["overview", "sources", "history"];
                              let next = ids.indexOf(id);
                              if (e.key === "ArrowRight") next = (next + 1) % 3;
                              else if (e.key === "ArrowLeft")
                                next = (next + 2) % 3;
                              else if (e.key === "Home") next = 0;
                              else if (e.key === "End") next = 2;
                              else return;
                              e.preventDefault();
                              setTab(ids[next]);
                              (
                                e.currentTarget.parentElement?.querySelectorAll(
                                  "button",
                                )[next] as HTMLButtonElement
                              )?.focus();
                            }}
                            aria-selected={tab === id}
                            key={id}
                            onClick={() => setTab(id)}
                          >
                            {label}
                            {id === "history" && (
                              <span>{active.events.length}</span>
                            )}
                          </button>
                        ))}
                      </div>
                      {tab === "overview" ? (
                        <>
                          {active.repairAt ? (
                            <Comparison c={active} />
                          ) : (
                            <ObservationChart
                              observations={active.observations}
                            />
                          )}
                          <div className="section-heading">
                            <div>
                              <span className="eyebrow">FOLLOW THE THREAD</span>
                              <h2>The evidence trail</h2>
                            </div>
                            <span className="subtle">
                              {active.observations.length} observation
                              {active.observations.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="evidence-spine">
                            {active.observations.map((w, i) => {
                              const m = measureWindow(w);
                              return (
                                <div className="evidence-node" key={w.id}>
                                  <div className="node-icon">
                                    {m.volumeL === null ? (
                                      <AlertCircle size={17} />
                                    ) : (
                                      <Gauge size={17} />
                                    )}
                                  </div>
                                  <div className="node-content">
                                    <div className="node-meta">
                                      OBSERVATION{" "}
                                      {String(i + 1).padStart(2, "0")}
                                      <span>
                                        {w.phase.replaceAll("_", " ")}
                                      </span>
                                    </div>
                                    <h3>
                                      {m.volumeL === null
                                        ? "An endpoint is still missing"
                                        : `${num(m.volumeL, 0)} L across ${num(m.durationMinutes, 0)} minutes`}
                                    </h3>
                                    <p>
                                      {w.context.scheduledUse === "unknown"
                                        ? "Cleaning schedule has not been confirmed."
                                        : w.context.scheduledUse === "present"
                                          ? "Scheduled use recorded. Excluded from no-use evidence."
                                          : "No scheduled use declared. Inspect context and meter-health evidence."}
                                    </p>
                                    <button
                                      className="text-button"
                                      onClick={() => {
                                        setSelectedObservation(w);
                                        open("source");
                                      }}
                                    >
                                      Inspect source <ArrowUpRight size={14} />
                                    </button>
                                    <button
                                      className="text-button"
                                      onClick={() => editContext(w)}
                                    >
                                      Edit context <Settings2 size={14} />
                                    </button>
                                    <button
                                      className="text-button"
                                      onClick={() => openObservation(w)}
                                    >
                                      Revise endpoints <Plus size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            <div className="evidence-node pending">
                              <div className="node-icon">
                                <ClipboardList size={17} />
                              </div>
                              <div className="node-content">
                                <div className="node-meta">
                                  HUMAN OBSERVATION
                                </div>
                                <h3>
                                  {active.repairAt
                                    ? "Repair reported. Evidence stays separate."
                                    : "The meter cannot tell us the cause."}
                                </h3>
                                <p>
                                  {active.repairAt
                                    ? `Actual intervention: ${time(active.repairAt)} IST`
                                    : "An authorized inspection can establish what happened."}
                                </p>
                                <button
                                  className="text-button"
                                  onClick={() => open("inspection")}
                                >
                                  Record inspection <Plus size={14} />
                                </button>
                                <button
                                  className="text-button"
                                  onClick={() => open("repair")}
                                >
                                  Record repair <Plus size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                          <div className="case-footer">
                            <span>
                              Workflow: {active.workflow.replaceAll("_", " ")}
                            </span>
                            <button
                              className="text-button"
                              onClick={() => open("close")}
                            >
                              {active.workflow === "closed"
                                ? "Reopen case"
                                : "Close case with a reason"}
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </>
                      ) : tab === "sources" ? (
                        <SourceTable observations={active.observations} />
                      ) : (
                        <div className="activity">
                          <h2>Recorded activity</h2>
                          <p className="subtle">
                            Original evidence and earlier reports are retained.
                          </p>
                          {active.events.length ? (
                            active.events
                              .slice()
                              .reverse()
                              .map((e) => (
                                <article key={e.id}>
                                  <span className="mono">
                                    {time(e.recordedAt)}
                                  </span>
                                  <h3>{e.type.replaceAll("_", " ")}</h3>
                                  <p>{e.reportedBy}</p>
                                  <details>
                                    <summary>Event details</summary>
                                    <p className="break-word">{e.notes}</p>
                                  </details>
                                </article>
                              ))
                          ) : (
                            <div className="empty-small">
                              No changes yet. Start by adding context to the
                              first observation.
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                    <aside className="case-side">
                      <section className="next-card">
                        <div className="next-label">
                          <span className="circle-icon">
                            <ArrowUpRight size={18} />
                          </span>
                          NEXT USEFUL CHECK
                          <span className="mono">
                            {active.policy.nextAction.ruleId}
                          </span>
                        </div>
                        <h2>{active.policy.nextAction.title}</h2>
                        <p>{active.policy.nextAction.reason}</p>
                        <button
                          className="primary full"
                          disabled={busy}
                          onClick={() => {
                            const rule = active.policy.nextAction.ruleId;
                            if (rule === "R05" || rule === "R04")
                              editContext(active.observations[0]);
                            else if (rule === "R03") open("health");
                            else if (rule === "R07" || rule === "R11")
                              open("inspection");
                            else if (rule === "R10") setTab("overview");
                            else if (rule === "R02")
                              openObservation(
                                active.observations.find(
                                  (w) => !w.end || !w.start,
                                ),
                              );
                            else openObservation();
                          }}
                        >
                          {["R05", "R04"].includes(
                            active.policy.nextAction.ruleId,
                          )
                            ? "Record context"
                            : active.policy.nextAction.ruleId === "R10"
                              ? "Review comparison"
                              : active.policy.nextAction.ruleId === "R03"
                                ? "Record meter-health evidence"
                                : active.policy.nextAction.ruleId === "R02"
                                  ? "Complete observation"
                                  : ["R07", "R11"].includes(
                                        active.policy.nextAction.ruleId,
                                      )
                                    ? "Record inspection"
                                    : "Add observation"}
                          <ArrowRight size={17} />
                        </button>
                        <details className="why">
                          <summary>Why this check?</summary>
                          <p>
                            {active.policy.nextAction.ruleId} · next-check-v1.
                            This rule is evaluated from the saved readings and
                            context at revision {active.revision}.
                          </p>
                          <p className="break-word">
                            Evidence: {active.policy.evidenceIds.join(", ")}
                          </p>
                        </details>
                      </section>
                      <section className="facts">
                        <h3>What we know</h3>
                        <Fact
                          label="Source"
                          value={
                            state.mode === "synthetic"
                              ? "Synthetic sample"
                              : "Operator readings"
                          }
                        />
                        <Fact
                          label="Meter resolution"
                          value={`${Number(meter?.resolutionMl || 1000) / 1000} L`}
                        />
                        <Fact label="Reading type" value="Cumulative total" />
                        <Fact
                          label="Reported repair"
                          value={active.repairAt ? "Recorded" : "Not recorded"}
                        />
                        <div className="fact-note">
                          <Info size={16} />
                          <span>
                            Observed consumption is not automatically water
                            waste.
                          </span>
                        </div>
                      </section>
                      {state.mode === "synthetic" &&
                        active.meterId === "hostel-a" && (
                          <section className="replay">
                            <div className="eyebrow">
                              <History size={14} />
                              SAMPLE REPLAY
                            </div>
                            <h3>See the investigation evolve</h3>
                            <p>
                              Reveal synthetic historical evidence. Dates jump;
                              the policy recalculates.
                            </p>
                            <button
                              className="replay-step"
                              disabled={busy}
                              onClick={() =>
                                event({ type: "replay", stage: "quiet" })
                              }
                            >
                              <span>01</span>Reveal a quiet observation
                              <ChevronRight size={16} />
                            </button>
                            <button
                              className="replay-step"
                              disabled={busy}
                              onClick={() =>
                                event({ type: "replay", stage: "repair" })
                              }
                            >
                              <span>02</span>Reveal a reported repair
                              <ChevronRight size={16} />
                            </button>
                            <button
                              className="replay-step"
                              disabled={busy}
                              onClick={() =>
                                event({ type: "replay", stage: "comparison" })
                              }
                            >
                              <span>03</span>Reveal follow-up readings
                              <ChevronRight size={16} />
                            </button>
                            <details>
                              <summary>Change the sample facts</summary>
                              <Field label="Post-repair supply">
                                <select
                                  onChange={(e) =>
                                    event({
                                      type: "scenario",
                                      supplyComparable:
                                        e.target.value === "same",
                                    })
                                  }
                                  defaultValue="same"
                                >
                                  <option value="same">
                                    Comparable / available
                                  </option>
                                  <option value="changed">
                                    Supply interrupted
                                  </option>
                                </select>
                              </Field>
                              <Field label="Meter health">
                                <select
                                  onChange={(e) =>
                                    event({
                                      type: "scenario",
                                      meterHealth: e.target.value,
                                    })
                                  }
                                  defaultValue="supported"
                                >
                                  <option value="supported">Supported</option>
                                  <option value="suspect">Suspect</option>
                                  <option value="unknown">Unknown</option>
                                </select>
                              </Field>
                              <Field label="Scheduled use">
                                <select
                                  onChange={(e) =>
                                    event({
                                      type: "scenario",
                                      scheduledUse: e.target.value,
                                    })
                                  }
                                  defaultValue="unknown"
                                >
                                  <option value="unknown">Unknown</option>
                                  <option value="present">Present</option>
                                  <option value="none">None</option>
                                </select>
                              </Field>
                            </details>
                          </section>
                        )}
                    </aside>
                  </div>
                </>
              ) : path === "/readings" ? (
                <>
                  <div className="eyebrow">SOURCE EVIDENCE</div>
                  <div className="page-heading">
                    <div>
                      <h1>Meter readings</h1>
                      <p>
                        Keep the original reading. Make every interval
                        traceable.
                      </p>
                    </div>
                    <div className="button-group">
                      <button
                        className="secondary"
                        onClick={() => open("import")}
                      >
                        <Upload size={16} />
                        Import CSV
                      </button>
                      <button
                        className="primary"
                        onClick={() => open("reading")}
                      >
                        <Plus size={16} />
                        Add reading
                      </button>
                    </div>
                  </div>
                  <div className="meter-bar">
                    <Gauge size={22} />
                    <div>
                      <strong>{meter?.name || "No meter configured"}</strong>
                      <p>
                        {meter
                          ? `${meter.timezone} · ${Number(meter.resolutionMl) / 1000} L display resolution`
                          : "Create a meter before adding readings."}
                      </p>
                    </div>
                    <button className="secondary" onClick={() => open("meter")}>
                      Add meter
                    </button>
                    <button
                      className="text-button"
                      onClick={() => open("health")}
                    >
                      Health report
                    </button>
                    <button
                      className="text-button"
                      onClick={() => open("resetMeter")}
                    >
                      Meter reset
                    </button>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Observed at (meter local time)</th>
                          <th>Cumulative total</th>
                          <th>Quality</th>
                          <th>Source ID</th>
                          <th>Revision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.readings.map((r) => (
                          <tr key={r.id}>
                            <td>
                              {time(
                                r.timestamp,
                                state?.meters.find((m) => m.id === r.meterId)
                                  ?.timezone,
                              )}
                            </td>
                            <td className="numeric">
                              {r.totalMl === null
                                ? "Missing"
                                : `${num(Number(r.totalMl) / 1000, 3)} L`}
                            </td>
                            <td>
                              <span className="badge neutral">{r.quality}</span>
                            </td>
                            <td className="mono">{r.id.slice(0, 15)}</td>
                            <td>
                              <button
                                className="text-button"
                                onClick={() => {
                                  open("correction");
                                  setForm({
                                    readingId: r.id,
                                    meter: r.meterId,
                                    total: r.sourceTotal,
                                    at: r.timestamp,
                                    unit: r.unit,
                                    quality: r.quality,
                                  });
                                }}
                              >
                                Correct
                              </button>
                              {r.supersedesId && (
                                <span className="subtle">Revised evidence</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!state.readings.length && (
                      <div className="empty-small">
                        Add two readings to measure use over an interval.
                      </div>
                    )}
                  </div>
                  <div className="info-box">
                    <Info size={18} />
                    <p>
                      Enter the cumulative total shown on your meter, in L or
                      m³. Missing readings stay missing. CSV timestamps must
                      include an explicit UTC offset.
                    </p>
                  </div>
                  {state.imports
                    .filter((i) => i.committed)
                    .map((i) => (
                      <div key={i.id} className="info-box">
                        Import {i.id.slice(0, 8)}: {i.rows.length} accepted;{" "}
                        {i.excludedRows?.length || 0} explicitly excluded rows (
                        {i.excludedRows?.join(", ") || "none"}).
                      </div>
                    ))}
                </>
              ) : report ? (
                <Receipt
                  report={report}
                  superseded={
                    state.cases.find((c) => c.id === report.caseId)
                      ?.revision !== report.revision
                  }
                />
              ) : path.startsWith("/reports") ? (
                <>
                  <div className="eyebrow">IMMUTABLE SNAPSHOTS</div>
                  <div className="page-heading">
                    <div>
                      <h1>Evidence receipts</h1>
                      <p>
                        A record of the inputs, method, and result at a specific
                        revision.
                      </p>
                    </div>
                  </div>
                  {state.reports.length ? (
                    state.reports
                      .slice()
                      .reverse()
                      .map((r) => (
                        <button
                          className="case-row"
                          key={r.id}
                          onClick={() => router.push(`/reports/${r.id}`)}
                        >
                          <FileText />
                          <div>
                            <h3>Receipt · revision {r.revision}</h3>
                            <p>
                              {time(r.createdAt)} · {r.caseId}
                            </p>
                          </div>
                          <ChevronRight />
                        </button>
                      ))
                  ) : (
                    <div className="empty-state">
                      <FileText size={32} />
                      <h2>No receipts yet</h2>
                      <p>
                        Open an investigation and create an evidence receipt.
                      </p>
                      <button
                        className="primary"
                        onClick={() => router.push("/cases")}
                      >
                        View investigations <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="eyebrow">
                    THE FIELD NOTEBOOK <span>01 / INVESTIGATIONS</span>
                  </div>
                  <div className="page-heading">
                    <div>
                      <h1>Every reading has a next step.</h1>
                      <p>
                        Work through the unknowns. Keep the evidence connected.
                      </p>
                    </div>
                    <button className="primary" onClick={() => open("case")}>
                      <Plus size={16} />
                      New investigation
                    </button>
                  </div>
                  <div className="queue-summary">
                    <div>
                      <span className="small-measure">
                        {state.cases.length.toString().padStart(2, "0")}
                      </span>
                      <span>active investigations</span>
                    </div>
                    <p>
                      <ShieldCheck size={19} />A closed ticket is not proof of
                      lower water use.
                      <br />
                      Follow-up evidence lives here.
                    </p>
                  </div>
                  <div className="list-heading">
                    <h2>Your investigations</h2>
                    <span className="subtle">Ordered by evidence needed</span>
                  </div>
                  {state.cases
                    .slice()
                    .sort(
                      (a, b) =>
                        (a.policy.nextAction.ruleId === "R02" ? -1 : 0) -
                        (b.policy.nextAction.ruleId === "R02" ? -1 : 0),
                    )
                    .map((c, i) => (
                      <button
                        className="case-row"
                        key={c.id}
                        onClick={() => {
                          setTab("overview");
                          router.push(`/cases/${c.id}`);
                        }}
                      >
                        <div className="case-number">
                          {String(i + 1).padStart(2, "0")}
                        </div>
                        <div className="case-row-main">
                          <span className="eyebrow">
                            {c.repairAt
                              ? "REPAIR FOLLOW-UP"
                              : "OVERNIGHT OBSERVATION"}
                          </span>
                          <h3>{c.name}</h3>
                          <p>{c.policy.nextAction.title}</p>
                        </div>
                        <div className="case-row-meta">
                          <Badge outcome={c.policy.outcome} />
                          <span>
                            {c.observations.length} observation
                            {c.observations.length !== 1 ? "s" : ""} · revision{" "}
                            {c.revision}
                          </span>
                        </div>
                        <ArrowUpRight size={21} />
                      </button>
                    ))}
                  {!state.cases.length && (
                    <div className="empty-state">
                      <BookOpen size={32} />
                      <h2>Begin with a meter and two readings.</h2>
                      <p>
                        Your workspace is empty. Add the source evidence, then
                        open an investigation.
                      </p>
                      <button
                        className="primary"
                        onClick={() => router.push("/readings")}
                      >
                        Add source readings <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                  <div className="notebook-bottom">
                    <span className="mono">FLOWPROOF / FIELD NOTES</span>
                    <p>Known facts. Open questions. A useful next check.</p>
                  </div>
                </>
              )}
            </main>
            <nav className="mobile-nav">
              <button onClick={() => router.push("/cases")}>
                <BookOpen size={18} />
                Cases
              </button>
              <button onClick={() => router.push("/readings")}>
                <Gauge size={18} />
                Readings
              </button>
              <button onClick={() => open("about")}>
                <Info size={18} />
                About
              </button>
            </nav>
          </div>
        </div>
      )}
      <Dialog
        open={!!dialog}
        onOpenChange={(o) => {
          if (!o) setDialog(null);
        }}
        title={
          {
            about: "An evidence-first field notebook",
            start: "Start a temporary workspace",
            reset: "Reset this sample?",
            context: "Record operating context",
            source: "Inspect the source evidence",
            inspection: "Record an inspection",
            repair: "Record a reported repair",
            reading: "Add a cumulative reading",
            correction: "Correct a reading",
            resetMeter: "Acknowledge a meter reset",
            meter: "Add a meter",
            import: "Import cumulative readings",
            case: "Open an investigation",
            observation: "Add an observation window",
            health: "Record meter-health evidence",
            close:
              active?.workflow === "closed"
                ? "Reopen this case"
                : "Close this case",
          }[dialog || ""] || "FlowProof"
        }
      >
        {error && (
          <div role="alert" className="error-banner">
            {error}
          </div>
        )}
        {dialog === "about" ? (
          <div className="prose">
            <p>
              FlowProof links cumulative water readings to the next useful check
              and a transparent comparison after a repair.
            </p>
            <h3>What the method establishes</h3>
            <p>
              Two endpoints establish consumption across an interval. A
              supported no-use observation can identify movement above the
              meter’s display allowance. It does not diagnose a leak.
            </p>
            <h3>Honest comparisons</h3>
            <p>
              Three eligible observations before and after a reported repair are
              selected by a fixed policy. Unknown health, missing endpoints, or
              changed conditions block a positive result.
            </p>
            <h3>Your temporary workspace</h3>
            <p>
              Data is isolated by an HttpOnly session and expires after 14 days.
              The local cleanup command is available; scheduled deletion is not
              enabled yet. Use non-confidential data only.
            </p>
            <p>
              Sample measurements, facilities, and technician reports are
              synthetic. This prototype has not been validated in a field
              deployment. The investigation assistant is rules-based and
              requires no model key.
            </p>
            {state && (
              <button
                className="secondary"
                onClick={() =>
                  start(state.mode === "synthetic" ? "uploaded" : "synthetic")
                }
              >
                Start a new {state.mode === "synthetic" ? "readings" : "sample"}{" "}
                workspace <ArrowRight size={16} />
              </button>
            )}
          </div>
        ) : dialog === "start" ? (
          <>
            <p>
              This prototype stores readings in an isolated workspace for 14
              days. Use only non-confidential data. No account is required;
              access depends on this browser’s session.
            </p>
            <button
              className="primary full"
              disabled={busy}
              onClick={() => start("uploaded")}
            >
              Create my workspace <ArrowRight size={16} />
            </button>
          </>
        ) : dialog === "reset" ? (
          <>
            <p>
              This resets the synthetic investigation in your session.
              Downloaded receipts remain snapshots of their original evidence.
            </p>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await send("demo/reset", {});
                  await refresh();
                  setDialog(null);
                  router.push("/cases");
                })
              }
            >
              Reset sample
            </button>
          </>
        ) : dialog === "context" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void event({
                type: "context",
                observationId: selectedObservation?.id,
                context: { ...context, recordedAt: new Date().toISOString() },
              });
            }}
          >
            <ContextFields
              value={context}
              set={setContext}
              health={meter?.healthEvidence || []}
            />
            <button className="primary full" disabled={busy}>
              Save context & update check <ArrowRight size={16} />
            </button>
          </form>
        ) : dialog === "source" && selectedObservation ? (
          <>
            <SourceTable observations={[selectedObservation]} />
            <h3>Recorded context</h3>
            <dl className="source-facts">
              {Object.entries(selectedObservation.context).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{String(v || "Unknown")}</dd>
                </div>
              ))}
            </dl>
            <h3>Health evidence</h3>
            <p>
              {selectedObservation.healthEvidence?.basis ||
                "No supporting report"}
            </p>
            <p>
              Recorded by{" "}
              {selectedObservation.healthEvidence?.reportedBy || "Unknown"}
            </p>
          </>
        ) : dialog === "inspection" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void event({
                type: "inspection",
                observedAt: form.at,
                reportedBy: form.by,
                outcome: form.outcome,
                notes: form.notes,
              });
            }}
          >
            <Field label="Inspection time (ISO timestamp with UTC offset)">
              <input
                required
                placeholder="2026-09-13T11:00:00+05:30"
                onChange={(e) => f("at", e.target.value)}
              />
            </Field>
            <Field label="Reported by">
              <input required onChange={(e) => f("by", e.target.value)} />
            </Field>
            <Field label="Outcome">
              <select
                required
                defaultValue=""
                onChange={(e) => f("outcome", e.target.value)}
              >
                <option value="" disabled>
                  Select actual finding
                </option>
                <option value="leak_found">Leak found by technician</option>
                <option value="no_fault_found">No fault found</option>
                <option value="inconclusive">Inconclusive</option>
              </select>
            </Field>
            <Field label="What was observed?">
              <textarea
                required
                maxLength={2000}
                onChange={(e) => f("notes", e.target.value)}
              />
            </Field>
            <button className="primary full" disabled={busy}>
              Save inspection
            </button>
          </form>
        ) : dialog === "repair" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void event({
                type: "repair",
                actualRepairAt: form.at,
                reportedBy: form.by,
                workDescription: form.notes,
              });
            }}
          >
            <p className="info-box">
              Recording a repair creates a follow-up task. It does not establish
              a reduction in water use.
            </p>
            <Field label="Actual repair time (ISO with UTC offset)">
              <input
                required
                placeholder="2026-09-13T12:00:00+05:30"
                onChange={(e) => f("at", e.target.value)}
              />
            </Field>
            <Field label="Reported by">
              <input required onChange={(e) => f("by", e.target.value)} />
            </Field>
            <Field label="Work performed">
              <textarea
                required
                maxLength={2000}
                onChange={(e) => f("notes", e.target.value)}
              />
            </Field>
            <button className="primary full" disabled={busy}>
              Save reported repair
            </button>
          </form>
        ) : dialog === "close" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void event({
                type: active?.workflow === "closed" ? "reopening" : "closure",
                reason: form.notes,
              });
            }}
          >
            <p>Workflow changes do not change the analytical result.</p>
            <Field label="Reason">
              <textarea
                required
                maxLength={2000}
                onChange={(e) => f("notes", e.target.value)}
              />
            </Field>
            <button className="primary full" disabled={busy}>
              Save workflow change
            </button>
          </form>
        ) : dialog === "meter" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await send("meters", {
                  name: form.name,
                  timezone: form.timezone || "Asia/Kolkata",
                  resolution: form.resolution,
                  unit: form.unit || "L",
                });
                await refresh();
                setDialog(null);
              });
            }}
          >
            <Field label="Meter name">
              <input
                required
                maxLength={100}
                onChange={(e) => f("name", e.target.value)}
              />
            </Field>
            <Field label="IANA timezone">
              <input
                defaultValue="Asia/Kolkata"
                onChange={(e) => f("timezone", e.target.value)}
              />
            </Field>
            <div className="form-grid">
              <Field label="Display unit">
                <select onChange={(e) => f("unit", e.target.value)}>
                  <option>L</option>
                  <option value="m3">m³</option>
                </select>
              </Field>
              <Field label="Smallest display increment">
                <input
                  required
                  inputMode="decimal"
                  placeholder="1"
                  onChange={(e) => f("resolution", e.target.value)}
                />
              </Field>
            </div>
            <button className="primary full" disabled={busy}>
              Create meter
            </button>
          </form>
        ) : dialog === "reading" || dialog === "correction" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await send(
                  dialog === "correction"
                    ? `readings/${form.readingId}/revisions`
                    : "readings",
                  {
                    reason: form.reason,
                    meterId: form.meter || meter?.id,
                    sourceTotal: form.total || "",
                    timestamp: form.at,
                    unit: form.unit || "L",
                    quality: form.quality || "valid",
                  },
                );
                await refresh();
                setDialog(null);
                setNotice("Original cumulative reading saved.");
              });
            }}
          >
            <MeterSelect
              state={state}
              value={form.meter || meter?.id}
              onChange={(v) => f("meter", v)}
            />
            <Field label="Observed time (ISO with UTC offset)">
              <input
                required
                value={form.at || ""}
                placeholder="2026-09-10T02:00:00+05:30"
                onChange={(e) => f("at", e.target.value)}
              />
            </Field>
            <div className="form-grid">
              <Field label="Displayed cumulative total">
                <input
                  value={form.total || ""}
                  inputMode="decimal"
                  placeholder="100000.000"
                  onChange={(e) => f("total", e.target.value)}
                />
              </Field>
              <Field label="Unit">
                <select
                  value={form.unit || "L"}
                  onChange={(e) => f("unit", e.target.value)}
                >
                  <option>L</option>
                  <option value="m3">m³</option>
                </select>
              </Field>
            </div>
            <Field label="Reading quality">
              <select
                value={form.quality || "valid"}
                onChange={(e) => f("quality", e.target.value)}
              >
                <option value="valid">Valid observation</option>
                <option value="missing">Missing — leave total empty</option>
                <option value="invalid">Invalid / unreliable</option>
              </select>
            </Field>
            {dialog === "correction" && (
              <Field label="Reason for correction">
                <textarea
                  required
                  maxLength={2000}
                  onChange={(e) => f("reason", e.target.value)}
                />
              </Field>
            )}
            <p className="normalized">
              Normalized:{" "}
              <strong>
                {(() => {
                  try {
                    return `${parseTotalMl(form.total || "", form.unit || "L").toLocaleString()} mL`;
                  } catch {
                    return "Enter a supported decimal total";
                  }
                })()}
              </strong>
            </p>
            <button
              className="primary full"
              disabled={busy || !state?.meters.length}
            >
              Save reading
            </button>
          </form>
        ) : dialog === "case" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const c = await send("cases", {
                  meterId: form.meter || meter?.id,
                  name: form.name,
                });
                await refresh();
                setDialog(null);
                router.push(`/cases/${c.id}`);
              });
            }}
          >
            <MeterSelect
              state={state}
              value={form.meter || meter?.id}
              onChange={(v) => f("meter", v)}
            />
            <Field label="Investigation name">
              <input required onChange={(e) => f("name", e.target.value)} />
            </Field>
            <button
              className="primary full"
              disabled={busy || !state?.meters.length}
            >
              Open investigation
            </button>
            {!state?.meters.length && (
              <p>Add a meter in Meter readings first.</p>
            )}
          </form>
        ) : dialog === "resetMeter" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await send(`meters/${form.meter || meter?.id}/events`, {
                  type: "reset",
                  at: form.at,
                  acknowledged: true,
                });
                await refresh();
                setDialog(null);
                setNotice(
                  "New meter epoch started. Crossing observations are blocked.",
                );
              });
            }}
          >
            <MeterSelect
              state={state}
              value={form.meter || meter?.id}
              onChange={(v) => f("meter", v)}
            />
            <p className="info-box">
              This starts a new epoch for future readings. Existing totals
              remain unchanged. Observations crossing the reset are blocked.
            </p>
            <Field label="Actual reset time (ISO with offset)">
              <input
                required
                placeholder="2026-09-19T12:00:00+05:30"
                onChange={(e) => f("at", e.target.value)}
              />
            </Field>
            <label className="check-label">
              <input type="checkbox" required />I confirm the meter was reset or
              replaced at this time.
            </label>
            <button className="primary full" disabled={busy}>
              Record reset boundary
            </button>
          </form>
        ) : dialog === "health" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await send(`meters/${form.meter || meter?.id}/events`, {
                  type: "health",
                  from: form.from,
                  to: form.to,
                  reportedBy: form.by,
                  basis: form.notes,
                });
                await refresh();
                setDialog(null);
                setNotice(
                  "Health report saved. Link it in the observation context.",
                );
              });
            }}
          >
            <MeterSelect
              state={state}
              value={form.meter || meter?.id}
              onChange={(v) => f("meter", v)}
            />
            <Field label="Coverage starts (ISO with offset)">
              <input
                required
                placeholder="2026-09-01T00:00:00+05:30"
                onChange={(e) => f("from", e.target.value)}
              />
            </Field>
            <Field label="Coverage ends (ISO with offset)">
              <input
                required
                placeholder="2026-09-30T23:59:59+05:30"
                onChange={(e) => f("to", e.target.value)}
              />
            </Field>
            <Field label="Reported by">
              <input required onChange={(e) => f("by", e.target.value)} />
            </Field>
            <Field label="Basis for the health report">
              <textarea
                required
                maxLength={2000}
                placeholder="Authorized report or response during ordinary legitimate use"
                onChange={(e) => f("notes", e.target.value)}
              />
            </Field>
            <button className="primary full" disabled={busy}>
              Save supporting report
            </button>
          </form>
        ) : dialog === "observation" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await send(
                  `cases/${active?.id}/observations`,
                  {
                    replacesId: selectedObservation?.id,
                    startId: form.start,
                    endId: form.end || null,
                    phase: form.phase || "exploratory",
                    context: {
                      ...context,
                      recordedAt: new Date().toISOString(),
                    },
                  },
                  active?.revision,
                );
                await refresh();
                setDialog(null);
                setNotice("Observation saved and policy recalculated.");
              });
            }}
          >
            <div className="form-grid">
              {["start", "end"].map((k) => (
                <Field
                  key={k}
                  label={`${k === "start" ? "Start" : "End"} source reading`}
                >
                  <select
                    required={k === "start"}
                    value={form[k] || ""}
                    onChange={(e) => f(k, e.target.value)}
                  >
                    <option value="">
                      {k === "end" ? "Missing endpoint" : "Choose reading"}
                    </option>
                    {state?.readings
                      .filter((r) => r.meterId === active?.meterId)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {time(
                            r.timestamp,
                            state?.meters.find((m) => m.id === r.meterId)
                              ?.timezone,
                          )}{" "}
                          · {r.sourceTotal} {r.unit}
                        </option>
                      ))}
                  </select>
                </Field>
              ))}
            </div>
            <Field label="Observation phase">
              <select
                value={form.phase || "exploratory"}
                onChange={(e) => f("phase", e.target.value)}
              >
                <option value="exploratory">Exploratory</option>
                <option value="pre_repair">Before repair</option>
                <option value="post_repair">After repair</option>
              </select>
            </Field>
            <ContextFields
              value={context}
              set={setContext}
              health={meter?.healthEvidence || []}
            />
            <button className="primary full" disabled={busy}>
              Save observation
            </button>
          </form>
        ) : dialog === "import" ? (
          <>
            <p className="hint">
              Up to 2 MiB / 5,000 rows. Create a meter first and use its ID in
              the meter_id column.
            </p>
            <p className="mono break-word">
              Meter ID: {meter?.id || "No meter created"}
            </p>
            <Field label="CSV file">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file)
                    void run(async () => {
                      if (file.size > 2 * 1024 * 1024)
                        throw new Error("CSV must be at most 2 MiB");
                      setPreview(
                        await send("imports/preview", {
                          csv: await file.text(),
                        }),
                      );
                      setExclude(false);
                    });
                }}
              />
            </Field>
            <details>
              <summary>CSV format</summary>
              <pre className="csv-example">
                meter_id,timestamp,total,unit,quality{`\n`}
                {meter?.id || "meter-id"}
                ,2026-09-10T02:00:00+05:30,100000,L,valid
              </pre>
            </details>
            {preview && (
              <div className="import-preview">
                <h3>Review before importing</h3>
                <p>
                  {preview.rows.length} accepted · {preview.errors.length}{" "}
                  rejected · {preview.duplicates} duplicates
                </p>
                {preview.errors.map((e) => (
                  <p className="error-text" key={e.row}>
                    Row {e.row}: {e.message}
                  </p>
                ))}
                {preview.warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
                <p>
                  {num(preview.spanDays, 1)} days · totals normalized to integer
                  mL
                </p>
                {preview.errors.length > 0 && (
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={exclude}
                      onChange={(e) => setExclude(e.target.checked)}
                    />
                    I acknowledge excluding the rejected rows listed above.
                  </label>
                )}
                <button
                  className="primary full"
                  disabled={busy || (preview.errors.length > 0 && !exclude)}
                  onClick={() =>
                    run(async () => {
                      await send("imports/commit", {
                        previewId: preview.id,
                        acknowledgeExclusions: exclude,
                      });
                      await refresh();
                      setDialog(null);
                      setNotice("Import saved with its source manifest.");
                    })
                  }
                >
                  Commit reviewed import
                </button>
              </div>
            )}
          </>
        ) : null}
      </Dialog>
      {!state && error && (
        <div className="floating-error" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
function Logo() {
  return (
    <div className="logo">
      <span>
        <Gauge size={23} strokeWidth={1.8} />
      </span>
      FlowProof<span className="logo-period">.</span>
    </div>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function MeterSelect({
  state,
  value,
  onChange,
}: {
  state: State | null;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <Field label="Meter">
      <select
        required
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {!state?.meters.length && (
          <option value="">Create a meter first</option>
        )}
        {state?.meters.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </Field>
  );
}
function SourceTable({ observations }: { observations: ObservationInput[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Observation (local time)</th>
            <th>Start total</th>
            <th>End total</th>
            <th>Volume</th>
          </tr>
        </thead>
        <tbody>
          {observations.map((w) => (
            <tr key={w.id}>
              <td>
                {w.start ? time(w.start.timestamp, w.timezone) : "Missing"}
                <br />
                <span className="subtle">
                  {w.end ? time(w.end.timestamp, w.timezone) : "End missing"}
                </span>
              </td>
              <td>
                {w.start?.sourceTotal ?? "Missing"} {w.start?.unit}
              </td>
              <td>
                {w.end?.sourceTotal ?? "Missing"} {w.end?.unit}
              </td>
              <td className="numeric">{num(measureWindow(w).volumeL, 1)} L</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function ObservationChart({
  observations,
}: {
  observations: ObservationInput[];
}) {
  const latest = observations[observations.length - 1],
    m = latest ? measureWindow(latest) : null;
  const maxVolume =
    Math.max(240, ...observations.map((w) => measureWindow(w).volumeL || 0)) *
    1.1;
  return (
    <section className="chart-section">
      <div className="chart-title">
        <h2>Consumption by observation</h2>
        <span className="subtle">Cumulative meter · L</span>
      </div>
      <div className="measurement">
        <strong>{num(m?.volumeL ?? null, 0)}</strong>
        <span>
          litres observed
          <small>
            {m?.durationMinutes
              ? `across ${num(m.durationMinutes, 0)} minutes`
              : "Add source endpoints"}
          </small>
        </span>
      </div>
      <div className="interval-plot">
        <div className="plot-axis">
          <span>{num(maxVolume, 0)} L</span>
          <span>{num(maxVolume / 2, 0)} L</span>
          <span>0 L</span>
        </div>
        <div className="plot-area">
          <div className="plot-grid" />
          <div className="plot-grid middle" />
          {observations.map((w, i) => {
            const measure = measureWindow(w);
            return (
              <div className="plot-column" key={w.id}>
                <div
                  className={`bar ${w.context.scheduledUse !== "none" ? "hatched" : ""}`}
                  style={{
                    height: `${Math.min(100, ((measure.volumeL || 0) / maxVolume) * 100)}%`,
                  }}
                >
                  <span>{num(measure.volumeL, 0)} L</span>
                </div>
                <span className="bar-label">
                  {w.start
                    ? time(w.start.timestamp, w.timezone).split(",")[0]
                    : `Observation ${i + 1}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="chart-caption">
        <span className="legend-swatch" />
        Observed interval use{" "}
        <span className="caption-right">Not confirmed waste</span>
      </div>
      <details>
        <summary>View source data table</summary>
        <SourceTable observations={observations} />
      </details>
    </section>
  );
}
function Comparison({ c }: { c: CaseView }) {
  const r = c.comparison;
  const selected = [...r.selectedPre, ...r.selectedPost];
  return (
    <section className="comparison">
      <div className="chart-title">
        <h2>Observed change</h2>
        <Badge outcome={r.outcome} />
      </div>
      <p className="subtle">In comparable no-use periods</p>
      {r.rateChangeLpm === null ? (
        <div className="comparison-empty">
          <AlertCircle size={26} />
          <h3>{labels[r.outcome]}</h3>
          <p>
            {r.reasons[0] ||
              "Complete the follow-up evidence before comparing."}
          </p>
        </div>
      ) : (
        <>
          <div className="measurement">
            <ArrowDown size={30} />
            <strong>{num(r.rateChangeLpm)}</strong>
            <span>
              L/min<small>median rate change</small>
            </span>
          </div>
          <div className="comparison-pairs">
            <div>
              <span>BEFORE REPAIR</span>
              <strong>
                {num(r.preMedianLpm)} <small>L/min</small>
              </strong>
              <p>
                {r.preVolumeL} L / {r.preMinutes} min
              </p>
            </div>
            <ArrowRight size={20} />
            <div>
              <span>AFTER REPAIR</span>
              <strong>
                {num(r.postMedianLpm)} <small>L/min</small>
              </strong>
              <p>
                {r.postVolumeL} L / {r.postMinutes} min
              </p>
            </div>
          </div>
        </>
      )}
      <div
        className="comparison-bars"
        aria-label="Average consumption for each observation"
      >
        {c.observations
          .filter((w) => w.phase !== "exploratory")
          .map((w) => {
            const m = measureWindow(w);
            return (
              <div
                className={`mini-column ${w.phase === "post_repair" ? "post" : ""}`}
                key={w.id}
              >
                <span>{m.rateLpm === null ? "Missing" : num(m.rateLpm)}</span>
                <div className="mini-track">
                  <i
                    style={{
                      height:
                        m.rateLpm === null
                          ? "0"
                          : `${Math.max(2, Math.min(100, (m.rateLpm / 2.2) * 100))}%`,
                    }}
                  />
                </div>
                <small>
                  {w.start
                    ? new Date(w.start.timestamp).toLocaleDateString("en-GB", {
                        timeZone: w.timezone,
                        day: "numeric",
                        month: "short",
                      })
                    : "Missing"}
                </small>
              </div>
            );
          })}
      </div>
      <p className="chart-caption">
        Observation averages · L/min ·{" "}
        {c.observations[0]?.timezone || "Asia/Kolkata"}
      </p>
      <details>
        <summary>Calculation & selection details</summary>
        <p>Median difference: {num(r.rateChangeLpm, 6)} L/min</p>
        <p>
          Observed-window comparison range: {num(r.observedRangeLowLpm, 6)} to{" "}
          {num(r.observedRangeHighLpm, 6)} L/min
        </p>
        <p>
          {selected.length} selected observations. Each endpoint contributes one
          display increment to the allowance.
        </p>
        {r.excluded.map((w) => (
          <p key={w.id}>
            {w.id}: {w.reasons.join("; ")}
          </p>
        ))}
        <SourceTable observations={c.observations} />
      </details>
      <div className="comparison-disclaimer">
        <Info size={16} />
        <p>
          This comparison does not prove that the repair caused the change or
          that every leak is fixed.
        </p>
      </div>
    </section>
  );
}
function Receipt({
  report,
  superseded,
}: {
  report: StoredReport;
  superseded: boolean;
}) {
  return (
    <article className="receipt">
      <div className="eyebrow">
        EVIDENCE RECEIPT <span>REV {report.revision}</span>
      </div>
      <div className="page-heading">
        <div>
          <h1>A record you can inspect.</h1>
          <p>{time(report.createdAt)} · Immutable evidence snapshot</p>
        </div>
      </div>
      <div className="info-box">
        {report.snapshot.sourceMode === "synthetic"
          ? "Synthetic sample evidence"
          : "Operator-supplied evidence"}{" "}
        ·{" "}
        {superseded ? "Superseded — newer evidence exists" : "Current revision"}
      </div>
      <h2>{labels[report.snapshot.comparison.outcome]}</h2>
      <p>{report.snapshot.policy.nextAction.reason}</p>
      <div className="button-group">
        <a className="primary" href={`/api/reports/${report.id}?format=html`}>
          <Download size={16} />
          Download HTML
        </a>
        <a className="secondary" href={`/api/reports/${report.id}?format=json`}>
          <Download size={16} />
          Download JSON
        </a>
      </div>
      <SourceTable observations={report.snapshot.observations} />
      <h3>Method & limitations</h3>
      <p>
        Change = median pre-repair rate − median post-repair rate. The
        observed-window range includes variation between selected windows and a
        two-endpoint display-resolution allowance.
      </p>
      <ul>
        {report.snapshot.limitations.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <p className="mono break-word">SHA-256: {report.hash}</p>
      <p className="subtle">
        Facility names and free-text notes are redacted from exported receipts.
      </p>
    </article>
  );
}
