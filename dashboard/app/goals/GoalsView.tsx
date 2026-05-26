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
import { colorForUsername } from "@/lib/colors";

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

  // Add-goal form state
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
    ...stores.map((s) => ({
      value: s.id,
      label: s.display_name || s.username,
    })),
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

      {/* Featured circular ring for the most recent goal */}
      {primary && (
        <section className="glass p-7 sm:p-9 mb-3 text-center animate-fade-up">
          <FeaturedGoal goal={primary.goal} value={primary.value} stores={stores} />
        </section>
      )}

      {/* Linear bars for the rest */}
      {computed.length > 1 && (
        <section className="glass p-5 mb-3 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="text-[12px] text-text-3 mb-4 font-semibold tracking-wider uppercase">
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
      <section className="glass p-6 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <h2 className="text-[16px] font-semibold mb-1 tracking-tight">Add a goal</h2>
        <p className="text-[12.5px] text-text-3 mb-4 leading-relaxed">
          Sets a target for a period. Progress updates live.
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          <Dropdown value={period} options={periodOptions} onChange={(v) => setPeriod(v)} />
          <Dropdown value={metric} options={metricOptions} onChange={(v) => setMetric(v)} />
          <Dropdown value={scope} options={scopeOptions} onChange={setScope} />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step={metric === "revenue" ? "0.01" : "1"}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={metric === "revenue" ? "Target $" : "Target sales"}
            className="field text-[14px] flex-1"
          />
          <button className="pill" onClick={addGoal} disabled={busy || !target.trim()}>
            Add
          </button>
        </div>
        {err && <div className="text-[12.5px] text-red-300/90 mt-3">{err}</div>}
      </section>

      {goals.length === 0 && (
        <div className="text-[13px] text-text-3 text-center mt-8 leading-relaxed">
          No goals yet. Set one above and watch the ring fill in.
        </div>
      )}
    </>
  );
}

function periodLabel(p: Period): string {
  return p === "day" ? "today" : p === "week" ? "this week" : "this month";
}

function goalSubtitle(g: Goal, stores: Store[]): string {
  const scope = g.store_id
    ? `@${stores.find((s) => s.id === g.store_id)?.username ?? "?"}`
    : "All stores";
  const m = g.metric === "revenue" ? "revenue" : "sales";
  return `${scope} · ${periodLabel(g.period)} · ${m}`;
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
  const currency = stores.find((s) => s.id === goal.store_id)?.currency ?? "USD";
  const tint = goal.store_id
    ? colorForUsername(stores.find((s) => s.id === goal.store_id)?.username ?? "")
    : "#34D399";
  const reached = percent >= 1;

  return (
    <div className="flex flex-col items-center">
      <div className="text-[11px] text-text-3 mb-3 font-semibold tracking-wider uppercase">
        {goalSubtitle(goal, stores)}
      </div>

      <CircularProgress percent={percent} color={tint}>
        <div className="text-center px-2">
          <div className="num text-[40px] font-bold leading-none">
            {Math.round(percent * 100)}%
          </div>
          <div className="text-[11px] text-text-3 mt-1.5 font-medium">
            {formatValue(goal, value, currency)} / {formatTarget(goal, currency)}
          </div>
        </div>
      </CircularProgress>

      {reached && (
        <div className="mt-5 text-[13px] font-semibold text-money flex items-center gap-1.5 animate-fade-in">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 7.5L5.5 10L11 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Goal hit
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
  const currency = stores.find((s) => s.id === goal.store_id)?.currency ?? "USD";
  const tint = goal.store_id
    ? colorForUsername(stores.find((s) => s.id === goal.store_id)?.username ?? "")
    : "#34D399";

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <div className="min-w-0 mr-3">
          <div className="text-[13.5px] font-semibold truncate">
            {goalSubtitle(goal, stores)}
          </div>
          <div className="text-[11px] text-text-3 mt-0.5">
            <AnimatedNumber
              value={value}
              format={goal.metric === "revenue" ? "money" : "count"}
              currency={currency}
              className="num text-white"
            />
            {" / "}
            <span className="num">{formatTarget(goal, currency)}</span>
          </div>
        </div>
        <button onClick={onRemove} className="text-[11px] text-text-3 hover:text-white transition-colors">
          Remove
        </button>
      </div>
      <LinearProgress percent={percent} color={tint} />
    </div>
  );
}

// Compute current value for a goal based on stored snapshots.
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
