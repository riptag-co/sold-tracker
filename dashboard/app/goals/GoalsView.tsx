"use client";

import { useMemo, useState } from "react";
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
}: {
  stores: Store[];
  snapshots: Snapshot[];
  goals: Goal[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const snapsByStore = useMemo(() => groupSnapshots(snapshots), [snapshots]);

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

  const computed = useMemo(() => {
    return goals.map((g) => {
      const value = computeGoalProgress(g, stores, snapsByStore);
      return { goal: g, value };
    });
  }, [goals, stores, snapsByStore]);

  const primary = computed[0];

  return (
    <>
      <h1 className="text-[26px] font-bold mt-5 mb-5 tracking-tight">Goals</h1>

      {/* Featured ring */}
      {primary ? (
        <section className="glass p-7 sm:p-10 mb-3 text-center animate-fade-up">
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
                onRemove={() => removeGoal(goal.id)}
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
  onRemove,
}: {
  goal: Goal;
  value: number;
  stores: Store[];
  onRemove: () => void;
}) {
  const percent = goal.target > 0 ? value / goal.target : 0;
  const store = stores.find((s) => s.id === goal.store_id) ?? null;
  const currency = store?.currency ?? "USD";
  const tint = store ? colorForStore(store) : "#34D399";
  const reached = percent >= 1;

  return (
    <div>
      <div className="flex justify-between items-baseline mb-2 gap-2">
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
        <button
          onClick={onRemove}
          className="text-[11px] text-text-3 hover:text-white transition-colors flex-shrink-0"
        >
          Remove
        </button>
      </div>
      <LinearProgress percent={percent} color={tint} />
    </div>
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
