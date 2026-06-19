import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../store/auth";
import { useParentAttendance } from "../hooks/queries";
import { ChildSwitcher } from "../components/ChildSwitcher";
import {
  Card,
  FadeInView,
  Screen,
  SectionHeader,
  Skeleton,
  StateView,
  Stepper,
} from "../components/ui";
import { TopBar } from "../components/TopBar";
import { PageHead } from "../components/PageHead";
import { colors, fontSize, radius, space, tints } from "../theme";

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  present: { bg: tints.mint.base, fg: tints.mint.deep },
  late: { bg: colors.warnSoft, fg: colors.warn },
  excused: { bg: tints.sky.base, fg: tints.sky.deep },
  absent: { bg: colors.errorSoft, fg: colors.error },
  not_marked: { bg: colors.cream, fg: colors.ink40 },
};

const WEEKDAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}
function shiftMonth(m: string, delta: number): string {
  const [y, mm] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y!, mm! - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(m: string): string {
  const [y, mm] = m.split("-").map(Number);
  return new Date(Date.UTC(y!, mm! - 1, 1))
    .toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}
function labelStatus(s: string): string {
  return s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function shortStatus(s: string): string {
  return s === "present" ? "P"
    : s === "absent" ? "A"
    : s === "late" ? "L"
    : s === "excused" ? "E"
    : "·";
}

export function AttendanceScreen() {
  const { kids, activeChildSr } = useAuth();
  const sr = activeChildSr ?? kids[0]?.srNumber ?? 0;
  const activeKid = kids.find((k) => k.srNumber === sr) ?? kids[0];
  const [month, setMonth] = useState(currentMonth());
  const att = useParentAttendance(sr, month);
  const today = new Date().toISOString().slice(0, 7);

  const [yy, mm] = month.split("-").map(Number);
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(yy!, mm! - 1, 1));
    const daysInMonth = new Date(Date.UTC(yy!, mm!, 0)).getUTCDate();
    const startOffset = first.getUTCDay();
    const arr: { day: number | null }[] = [];
    for (let i = 0; i < startOffset; i++) arr.push({ day: null });
    for (let d = 1; d <= daysInMonth; d++) arr.push({ day: d });
    while (arr.length % 7 !== 0) arr.push({ day: null });
    return arr;
  }, [yy, mm]);

  const todayColor = att.data
    ? STATUS_COLOR[att.data.todayStatus] ?? STATUS_COLOR.not_marked!
    : STATUS_COLOR.not_marked!;

  return (
    <View style={styles.root}>
      <TopBar />
      <Screen refreshing={att.isFetching} onRefresh={() => void att.refetch()}>
        <PageHead
          crumb="Attendance"
          title={activeKid?.studentName ?? "Attendance"}
          subtitle={activeKid ? `Class ${activeKid.classLabel}` : undefined}
        />

        <ChildSwitcher />

        {/* Today hero */}
        <FadeInView delay={0}>
          <View style={[styles.todayCard, { backgroundColor: todayColor.bg }]}>
            <View style={styles.todayLeft}>
              <Text style={[styles.todayLabel, { color: todayColor.fg }]}>
                TODAY
              </Text>
              <Text style={[styles.todayValue, { color: todayColor.fg }]}>
                {att.data ? labelStatus(att.data.todayStatus) : "—"}
              </Text>
            </View>
            <View style={[styles.todayIcon, { backgroundColor: "rgba(255,255,255,0.4)" }]}>
              <Ionicons
                name={
                  att.data?.todayStatus === "present"
                    ? "checkmark-circle"
                    : att.data?.todayStatus === "absent"
                    ? "close-circle"
                    : att.data?.todayStatus === "late"
                    ? "time"
                    : att.data?.todayStatus === "excused"
                    ? "information-circle"
                    : "calendar-outline"
                }
                size={28}
                color={todayColor.fg}
              />
            </View>
          </View>
        </FadeInView>

        {/* Last 7 */}
        <FadeInView delay={60}>
          <SectionHeader label="Last 7 days" />
          <View style={styles.last7Row}>
            {att.isLoading
              ? Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} height={56} radius={10} style={{ flex: 1 }} />
                ))
              : (att.data?.last7 ?? []).map((d) => {
                  const c = STATUS_COLOR[d.status] ?? STATUS_COLOR.not_marked!;
                  return (
                    <View
                      key={d.iso}
                      style={[styles.last7Cell, { backgroundColor: c.bg, borderColor: c.fg }]}
                    >
                      <Text style={[styles.last7Day, { color: c.fg }]}>
                        {d.iso.slice(8, 10)}
                      </Text>
                      <Text style={[styles.last7Status, { color: c.fg }]}>
                        {shortStatus(d.status)}
                      </Text>
                    </View>
                  );
                })}
          </View>
        </FadeInView>

        {/* Month stepper */}
        <FadeInView delay={120}>
          <SectionHeader label="Month view" />
          <Stepper
            label={monthLabel(month)}
            onPrev={() => setMonth(shiftMonth(month, -1))}
            onNext={() => setMonth(shiftMonth(month, +1))}
            nextDisabled={month >= today}
          />
        </FadeInView>

        {/* Summary stats */}
        <FadeInView delay={150}>
          <View style={styles.statsRow}>
            <Stat label="%" value={`${att.data?.monthSummary.percent ?? 0}%`} tone={tints.mint} primary />
            <Stat label="Present" value={String(att.data?.monthSummary.present ?? 0)} tone={tints.mint} />
            <Stat label="Late" value={String(att.data?.monthSummary.late ?? 0)} tone={tints.mustard} />
            <Stat label="Absent" value={String(att.data?.monthSummary.absent ?? 0)} tone={tints.rose} />
            <Stat label="Excused" value={String(att.data?.monthSummary.excused ?? 0)} tone={tints.sky} />
          </View>
        </FadeInView>

        {/* Calendar */}
        <FadeInView delay={180}>
          <Card>
            {att.isLoading ? (
              <View style={{ gap: space[2] }}>
                <Skeleton height={20} />
                <Skeleton height={220} />
              </View>
            ) : att.error ? (
              <StateView error={att.error} onRetry={() => void att.refetch()} />
            ) : (
              <View>
                <View style={styles.weekRow}>
                  {WEEKDAY_HEADERS.map((h, i) => (
                    <Text key={i} style={styles.weekHeader}>{h}</Text>
                  ))}
                </View>
                <View style={styles.calGrid}>
                  {cells.map((c, i) => {
                    if (!c.day) return <View key={i} style={styles.calCell} />;
                    const status = att.data?.days[String(c.day)] ?? "not_marked";
                    const col = STATUS_COLOR[status] ?? STATUS_COLOR.not_marked!;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.calCell,
                          { backgroundColor: col.bg, borderColor: col.fg, borderWidth: 1 },
                        ]}
                      >
                        <Text style={[styles.calDay, { color: col.fg }]}>{c.day}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </Card>
        </FadeInView>

        {/* Legend */}
        <View style={styles.legend}>
          {(["present", "absent", "late", "excused", "not_marked"] as const).map((s) => {
            const c = STATUS_COLOR[s]!;
            return (
              <View key={s} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: c.bg, borderColor: c.fg }]} />
                <Text style={styles.legendText}>{labelStatus(s)}</Text>
              </View>
            );
          })}
        </View>
      </Screen>
    </View>
  );
}

function Stat({
  label,
  value,
  tone,
  primary,
}: {
  label: string;
  value: string;
  tone: { base: string; deep: string };
  primary?: boolean;
}) {
  return (
    <View
      style={[
        styles.stat,
        { backgroundColor: tone.base },
        primary && { paddingVertical: space[4] },
      ]}
    >
      <Text style={[styles.statValue, { color: tone.deep, fontSize: primary ? 24 : 18 }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: tone.deep }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.creamSoft },

  /* Today hero */
  todayCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: space[5],
    borderRadius: 20,
    gap: space[3],
  },
  todayLeft: { flex: 1 },
  todayLabel: { fontSize: fontSize.label, fontWeight: "800", letterSpacing: 1.6 },
  todayValue: {
    fontSize: fontSize.displayM,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginTop: 4,
  },
  todayIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Last 7 */
  last7Row: { flexDirection: "row", gap: 6 },
  last7Cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius[3],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  last7Day: { fontSize: fontSize.body, fontWeight: "800" },
  last7Status: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },

  /* Stats */
  statsRow: { flexDirection: "row", gap: 6 },
  stat: {
    flex: 1,
    borderRadius: radius[3],
    paddingVertical: space[3],
    paddingHorizontal: 2,
    alignItems: "center",
    gap: 2,
  },
  statValue: { fontWeight: "800", letterSpacing: -0.4 },
  statLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },

  /* Calendar */
  weekRow: { flexDirection: "row", marginBottom: space[2] },
  weekHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: fontSize.label,
    fontWeight: "800",
    color: colors.ink40,
    letterSpacing: 0.4,
  },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius[2],
  },
  calDay: { fontSize: fontSize.bodyS, fontWeight: "700" },

  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space[3],
    justifyContent: "center",
    marginTop: space[2],
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: space[1] },
  legendDot: { width: 14, height: 14, borderRadius: radius[2], borderWidth: 1 },
  legendText: { fontSize: fontSize.bodyS, color: colors.ink60 },
});
