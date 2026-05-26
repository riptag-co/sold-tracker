"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AnimatedNumber from "@/components/AnimatedNumber";
import CircularProgress from "@/components/CircularProgress";
import LinearProgress from "@/components/LinearProgress";
import Dropdown from "@/components/Dropdown";
import {
  computeStoreStats,
  formatMoneyMinor,
  groupSnapshots,
  type Snapshot,
  type Store,
} from "@/lib/stats";
import { colorForStore } from "@/lib/colors";

type Period = "day" | "week" | "month";
type Metric = "sales" | "revenue";

type Goal = {
  id: string;
  store_id: string | null;
  period: Period;
  metric: Metric;
  target: number;
  label: string | null;
};

export default function GoalsView({
  stores,
  snapshots,
  goals,
  mainGoalId,
}: {
  stores: Store[];
  snapshots: Snapshot[];
  goals: Goal[];
  mainGoalId: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const snapsByStore = useMemo(() => groupSnapshots(snapshots), [snapshots]);

  // Two-tap delete: first tap arms, second tap within 3s commits.
  const [armedId, setArmedId] = useState<string | null>(null);
  const armedTimer = useRef<number | null>(null);
  function arm(id: string, onConfirmed: () => void) {
    if (armedId === id) {
      if (armedTimer.current) window.clearTimeout(armedTimer.current);
      setArmedId(null);
      onConfirmed();
      return;
    }
    setArmedId(id);
    if (armedTimer.current) window.clearTimeout(armedTimer.current);
    armedTimer.current = window.setTimeout(() => {
      setArmedId((cur) => (cur === id ? null : cur));
    }, 3000);
  }

  const [period, setPeriod] = useState<Period>("day");
  const [metric, setMetric] = useState<Metric>("sales");
  const [scope, setScope] = useState<string>("all");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const periodOptions: { value: Period; label: string }[] = [
    { value: "day", label: "Daily" },
    { value: "week", label: "Weekly" },
    { value: "month", label: "Monthly" },
  ];
  const metricOptions: { value: Metric; label: string }[] = [
    { value: "sales", label: "Sales" },
    { value: "revenue", label: "Revenue ($)" },
  ];
  const scopeOptions = [
    { value: "all", label: "All stores" },
    ...stores.map((s) => ({ value: s.id, label: s.username })),
  ];

  async function addGoal() {
    setErr(null);
    const raw = parseFloat(target);
    if (!Number.isFinite(raw) || raw <= 0) {
      setErr("Enter a target greater than 0.");
      return;
    }
    const value = metric === "revenue" ? Math.round(raw * 100) : Math.round(raw);
    setBusy(true);
    const { error } = await supabase.from("goals").insert({
      period,
      metric,
      target: value,
      store_id: scope === "all" ? null : scope,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setTarget("");
    router.refresh();
  }

  async function removeGoal(id: string) {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (!error) router.refresh();
  }

  async function toggleMain(id: string) {
    const next = mainGoalId === id ? null : id;
    const { error } = await supabase
      .from("control")
      .update({ main_goal_id: next })
      .eq("id", 1);
    if (!error) router.refresh();
  }

  const computed = useMemo(() => {
    return goals.map((g) => {
      const value = computeGoalProgress(g, stores, snapsByStore);
      return { goal: g, value };
    });
  }, [goals, stores, snapsByStore]);

  const primary = computed[0];

  return (
    <>
      <h1 className="text-[26px] font-bold mt-1 sm:mt-3 mb-3 tracking-tight">Goals</h1>

      {/* Featured ring */}
      {primary ? (
        <section className="glass p-7 sm:p-10 mb-3 text-center animate-fade-up relative">
          {/* Star — top-left, sets this as the Main goal */}
          <StarButton
            isMain={mainGoalId === primary.goal.id}
            onClick={() => toggleMain(primary.goal.id)}
            className="absolute top-3 left-3"
          />
          {/* Delete — top-right with 2-tap confirm */}
          {(() => {
            const id = primary.goal.id;
            const armed = armedId === id;
            return (
              <button
                onClick={() => arm(id, () => removeGoal(id))}
                aria-label={armed ? "Tap again to confirm delete" : "Remove goal"}
                title={armed ? "Tap again to confirm" : "Remove goal"}
                className={`absolute top-3 right-3 rounded-full inline-flex items-center justify-center transition-all active:scale-90 ${
                  armed ? "h-9 px-3 gap-1.5" : "w-9 h-9"
                }`}
                style={{
                  background: armed ? "rgba(248,113,113,0.18)" : "rgba(255,255,255,0.05)",
                  border: armed
                    ? "1px solid rgba(248,113,113,0.45)"
                    : "1px solid rgba(255,255,255,0.12)",
                  color: armed ? "#FCA5A5" : "rgba(255,255,255,0.55)",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                {armed && (
                  <span className="text-[11px] font-semibold tracking-wide">Confirm</span>
                )}
              </button>
            );
          })()}
          <FeaturedGoal goal={primary.goal} value={primary.value} stores={stores} />
        </section>
      ) : (
        <section className="glass p-9 mb-3 text-center animate-fade-up">
          <div className="text-[15px] font-semibold mb-1 tracking-tight">
            No goals yet
          </div>
          <p className="text-[13px] text-text-3 max-w-xs mx-auto leading-relaxed">
            Set a daily, weekly, or monthly target below and watch the ring fill in live.
          </p>
        </section>
      )}

      {/* Linear bars for other goals */}
      {computed.length > 1 && (
        <section
          className="glass p-6 mb-3 animate-fade-up"
          style={{ animationDelay: "60ms" }}
        >
          <div className="text-[12px] text-text-3 mb-5 font-semibold tracking-wider uppercase">
            All goals
          </div>
          <div className="space-y-5">
            {computed.slice(1).map(({ goal, value }) => (
              <LinearGoalRow
                key={goal.id}
                goal={goal}
                value={value}
                stores={stores}
                armed={armedId === goal.id}
                isMain={mainGoalId === goal.id}
                onRemove={() => arm(goal.id, () => removeGoal(goal.id))}
                onToggleMain={() => toggleMain(goal.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Add goal */}
      <section
        className="glass p-6 animate-fade-up"
        style={{ animationDelay: "120ms" }}
      >
        <h2 className="text-[16px] font-semibold mb-1 tracking-tight">
          Add a goal
        </h2>
        <p className="text-[12.5px] text-text-3 mb-5 leading-relaxed">
          Sets a target for a period. Progress updates live.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          <Dropdown value={period} options={periodOptions} onChange={(v) => setPeriod(v)} />
          <Dropdown value={metric} options={metricOptions} onChange={(v) => setMetric(v)} />
          <Dropdown value={scope} options={scopeOptions} onChange={setScope} />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            {metric === "revenue" && (
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-3 text-[14px] pointer-events-none">$</span>
            )}
            <input
              type="number"
              min="0"
              step={metric === "revenue" ? "0.01" : "1"}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={metric === "revenue" ? "Target revenue" : "Target sales"}
              className={`field text-[14px] num-tight ${metric === "revenue" ? "!pl-8" : ""}`}
            />
          </div>
          <button
            className="pill"
            onClick={addGoal}
            disabled={busy || !target.trim()}
          >
            Add
          </button>
        </div>
        {err && <div className="text-[12.5px] text-red-300/90 mt-3">{err}</div>}
      </section>
    </>
  );
}

function periodLabel(p: Period): string {
  return p === "day" ? "today" : p === "week" ? "this week" : "this month";
}

function periodLabelLong(p: Period): string {
  return p === "day" ? "daily" : p === "week" ? "weekly" : "monthly";
}

function goalSubtitle(g: Goal, stores: Store[]): string {
  const scope = g.store_id
    ? `@${stores.find((s) => s.id === g.store_id)?.username ?? "?"}`
    : "All stores";
  const m = g.metric === "revenue" ? "revenue" : "sales";
  return `${scope} · ${periodLabelLong(g.period)} ${m}`;
}

function formatTarget(g: Goal, currency = "USD"): string {
  if (g.metric === "revenue")
    return formatMoneyMinor(g.target, currency) ?? "$0";
  return g.target.toLocaleString("en-US");
}

function formatValue(g: Goal, value: number, currency = "USD"): string {
  if (g.metric === "revenue")
    return formatMoneyMinor(Math.round(value), currency) ?? "$0";
  return Math.round(value).toLocaleString("en-US");
}

function FeaturedGoal({
  goal,
  value,
  stores,
}: {
  goal: Goal;
  value: number;
  stores: Store[];
}) {
  const percent = goal.target > 0 ? value / goal.target : 0;
  const store = stores.find((s) => s.id === goal.store_id) ?? null;
  const currency = store?.currency ?? "USD";
  const baseTint = store ? colorForStore(store) : "#34D399";
  const reached = percent >= 1;
  const tint = reached ? "#34D399" : baseTint;

  const remaining = Math.max(0, goal.target - value);
  const remainingLabel = goal.metric === "revenue"
    ? formatMoneyMinor(remaining, currency)
    : remaining.toLocaleString("en-US");

  return (
    <div className="flex flex-col items-center">
      <div className="text-[10px] text-text-3 mb-1 font-semibold tracking-[0.18em] uppercase">
        {periodLabelLong(goal.period)} goal
      </div>
      <div className="text-[12.5px] text-text-2 mb-5 font-medium">
        {goalSubtitle(goal, stores)}
      </div>

      <CircularProgress percent={percent} color={tint} size={220} stroke={16}>
        <div className="text-center px-2">
          <div className="num text-[44px] sm:text-[52px] font-bold leading-none">
            {Math.round(percent * 100)}
            <span className="text-[24px] text-text-3 ml-0.5">%</span>
          </div>
          <div className="text-[11px] text-text-3 mt-2 font-semibold tracking-wider uppercase">
            {formatValue(goal, value, currency)} / {formatTarget(goal, currency)}
          </div>
        </div>
      </CircularProgress>

      {reached ? (
        <div className="mt-6 text-[13.5px] font-bold text-money flex items-center gap-2 animate-fade-in">
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <path d="M3 7.5L5.5 10L11 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {percent > 1.1 ? `Beat goal by ${Math.round((percent - 1) * 100)}%` : "Goal hit"}
        </div>
      ) : (
        <div className="mt-6 text-[13px] text-text-3">
          <span className="num text-white font-semibold">{remainingLabel}</span>
          {" "}
          to go {periodLabel(goal.period)}
        </div>
      )}
    </div>
  );
}

function LinearGoalRow({
  goal,
  value,
  stores,
  armed,
  isMain,
  onRemove,
  onToggleMain,
}: {
  goal: Goal;
  value: number;
  stores: Store[];
  armed: boolean;
  isMain: boolean;
  onRemove: () => void;
  onToggleMain: () => void;
}) {
  const percent = goal.target > 0 ? value / goal.target : 0;
  const store = stores.find((s) => s.id === goal.store_id) ?? null;
  const currency = store?.currency ?? "USD";
  const tint = store ? colorForStore(store) : "#34D399";
  const reached = percent >= 1;

  return (
    <div>
      <div className="flex justify-between items-baseline mb-2 gap-2">
        <div className="min-w-0 flex items-start gap-2">
          <StarButton isMain={isMain} onClick={onToggleMain} small />
          <div className="min-w-0">
          <div className="text-[13.5px] font-semibold truncate flex items-center gap-2">
            {goalSubtitle(goal, stores)}
            {reached && (
              <span className="text-[10px] font-bold text-money uppercase tracking-wider">Hit</span>
            )}
          </div>
          <div className="text-[11.5px] text-text-3 mt-0.5 num-tight">
            <AnimatedNumber
              value={value}
              format={goal.metric === "revenue" ? "money" : "count"}
              currency={currency}
              className="num text-white font-semibold"
            />
            {" / "}
            <span className="num">{formatTarget(goal, currency)}</span>
            <span className="text-text-3 ml-2">
              {Math.round(percent * 100)}%
            </span>
          </div>
          </div>
        </div>
        <button
          onClick={onRemove}
          className={`text-[11px] transition-colors flex-shrink-0 font-semibold ${
            armed ? "text-red-300" : "text-text-3 hover:text-white"
          }`}
        >
          {armed ? "Tap to confirm" : "Remove"}
        </button>
      </div>
      <LinearProgress percent={percent} color={tint} />
    </div>
  );
}

function StarButton({
  isMain,
  onClick,
  small = false,
  className = "",
}: {
  isMain: boolean;
  onClick: () => void;
  small?: boolean;
  className?: string;
}) {
  const size = small ? 22 : 36;
  const iconSize = small ? 13 : 17;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isMain ? "Unstar main goal" : "Mark as main goal"}
      title={isMain ? "Main goal" : "Set as main goal"}
      className={`inline-flex items-center justify-center rounded-full transition-all active:scale-90 flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: isMain ? "rgba(255,213,76,0.16)" : "rgba(255,255,255,0.05)",
        border: isMain
          ? "1px solid rgba(255,213,76,0.55)"
          : "1px solid rgba(255,255,255,0.12)",
        color: isMain ? "#FFD54C" : "rgba(255,255,255,0.55)",
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill={isMain ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        style={
          isMain
            ? { filter: "drop-shadow(0 0 4px rgba(255,213,76,0.5))" }
            : undefined
        }
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}

function computeGoalProgress(
  goal: Goal,
  stores: Store[],
  snapsByStore: Map<string, Snapshot[]>,
): number {
  const relevantStores = goal.store_id
    ? stores.filter((s) => s.id === goal.store_id)
    : stores;
  let totalCount = 0;
  let totalRevenue = 0;
  for (const s of relevantStores) {
    const stats = computeStoreStats(
      snapsByStore.get(s.id) ?? [],
      null,
      s.avg_price_minor,
    );
    if (goal.period === "day") {
      totalCount += stats.today;
      totalRevenue += stats.todayRevenue ?? 0;
    } else if (goal.period === "week") {
      totalCount += stats.week;
      totalRevenue += stats.weekRevenue ?? 0;
    } else {
      totalCount += stats.month;
      totalRevenue += stats.monthRevenue ?? 0;
    }
  }
  return goal.metric === "revenue" ? totalRevenue : totalCount;
}
