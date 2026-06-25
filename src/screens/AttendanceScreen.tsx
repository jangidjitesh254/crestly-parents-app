import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../store/auth";
import { useParentAttendance } from "../hooks/queries";
import { ChildSwitcher } from "../components/ChildSwitcher";
import { FadeInView, Screen, Skeleton, StateView } from "../components/ui";
import { TopBar } from "../components/TopBar";
import { PageHead } from "../components/PageHead";
import { colors, fontSize, radius, shadow, space, tints } from "../theme";

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  present: { bg: tints.mint.base, fg: tints.mint.deep },
  late: { bg: colors.warnSoft, fg: colors.warn },
  excused: { bg: tints.sky.base, fg: tints.sky.deep },
  absent: { bg: colors.errorSoft, fg: colors.error },
  not_marked: { bg: colors.cream, fg: colors.ink40 },
};

const WEEKDAY_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];
const LEGEND = [
  { key: "present", label: "Present", tint: tints.mint },
  { key: "absent", label: "Absent", tint: tints.rose },
  { key: "late", label: "Late", tint: tints.mustard },
  { key: "excused", label: "Excused", tint: tints.sky },
] as const;

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
function todayCaption(status?: string): string {
  switch (status) {
    case "present": return "Marked present at school today.";
    case "absent": return "Marked absent today.";
    case "late": return "Marked late today.";
    case "excused": return "Excused today.";
    default: return "Today’s attendance isn’t marked yet.";
  }
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
  const sum = att.data?.monthSummary;
  const pct = sum?.percent ?? 0;
  const marked = sum ? sum.present + sum.late + sum.absent + sum.excused : 0;
  const atMax = month >= today;
  const dateLabel = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

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

        {/* Today */}
        <FadeInView delay={0}>
          <View style={[styles.todayCard, { backgroundColor: todayColor.bg }]}>
            <View style={styles.todayBlob} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.todayTopRow}>
                <Text style={[styles.todayKicker, { color: todayColor.fg }]}>TODAY</Text>
                <View style={styles.todayDateChip}>
                  <Text style={[styles.todayDateText, { color: todayColor.fg }]}>{dateLabel}</Text>
                </View>
              </View>
              <Text style={[styles.todayValue, { color: todayColor.fg }]} numberOfLines={1}>
                {att.data ? labelStatus(att.data.todayStatus) : "—"}
              </Text>
              <Text style={[styles.todayCaption, { color: todayColor.fg }]}>
                {todayCaption(att.data?.todayStatus)}
              </Text>
            </View>
            <View style={[styles.todayIcon, { backgroundColor: "rgba(255,255,255,0.5)" }]}>
              <Ionicons
                name={
                  att.data?.todayStatus === "present" ? "checkmark-circle"
                  : att.data?.todayStatus === "absent" ? "close-circle"
                  : att.data?.todayStatus === "late" ? "time"
                  : att.data?.todayStatus === "excused" ? "information-circle"
                  : "calendar-outline"
                }
                size={28}
                color={todayColor.fg}
              />
            </View>
          </View>
        </FadeInView>

        {/* Month summary */}
        <FadeInView delay={60}>
          <View style={styles.card}>
            {/* Month stepper */}
            <View style={styles.monthRow}>
              <Pressable onPress={() => setMonth(shiftMonth(month, -1))} hitSlop={8} style={styles.monthBtn}>
                <Ionicons name="chevron-back" size={20} color={colors.orange} />
              </Pressable>
              <Text style={styles.monthLabel}>{monthLabel(month)}</Text>
              <Pressable
                onPress={() => !atMax && setMonth(shiftMonth(month, +1))}
                disabled={atMax}
                hitSlop={8}
                style={[styles.monthBtn, atMax && { opacity: 0.3 }]}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.orange} />
              </Pressable>
            </View>

            {/* Big % + progress */}
            <View style={styles.pctRow}>
              <Text style={styles.bigPct}>
                {pct}<Text style={styles.pctSign}>%</Text>
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.pctCaption}>
                  {marked > 0 ? `${sum?.present ?? 0} present of ${marked} marked days` : "No days marked yet"}
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: pct >= 75 ? tints.mint.deep : colors.warn },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Counts */}
            <View style={styles.chipsRow}>
              <CountChip label="Present" value={sum?.present ?? 0} tint={tints.mint} />
              <CountChip label="Late" value={sum?.late ?? 0} tint={tints.mustard} />
              <CountChip label="Absent" value={sum?.absent ?? 0} tint={tints.rose} />
              <CountChip label="Excused" value={sum?.excused ?? 0} tint={tints.sky} />
            </View>
          </View>
        </FadeInView>

        {/* Calendar */}
        <FadeInView delay={120}>
          <View style={styles.card}>
            {att.isLoading ? (
              <View style={{ gap: space[2] }}>
                <Skeleton height={20} />
                <Skeleton height={220} />
              </View>
            ) : att.error ? (
              <StateView error={att.error} onRetry={() => void att.refetch()} />
            ) : (
              <>
                <View style={styles.weekRow}>
                  {WEEKDAY_HEADERS.map((h, i) => (
                    <Text key={i} style={styles.weekHeader}>{h}</Text>
                  ))}
                </View>
                <View style={styles.calGrid}>
                  {cells.map((c, i) => {
                    if (!c.day) return <View key={i} style={styles.calCell} />;
                    const status = att.data?.days[String(c.day)] ?? "not_marked";
                    const isMarked = status !== "not_marked";
                    const col = STATUS_COLOR[status] ?? STATUS_COLOR.not_marked!;
                    return (
                      <View key={i} style={styles.calCell}>
                        <View style={[styles.dayPill, isMarked && { backgroundColor: col.bg }]}>
                          <Text style={[styles.calDay, { color: isMarked ? col.fg : colors.ink60 }]}>
                            {c.day}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Legend */}
                <View style={styles.legend}>
                  {LEGEND.map((l) => (
                    <View key={l.key} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: l.tint.base }]} />
                      <Text style={styles.legendText}>{l.label}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        </FadeInView>
      </Screen>
    </View>
  );
}

function CountChip({
  label,
  value,
  tint,
}: {
  label: string;
  value: number;
  tint: { base: string; deep: string };
}) {
  return (
    <View style={[styles.chip, { backgroundColor: tint.base }]}>
      <Text style={[styles.chipNum, { color: tint.deep }]}>{value}</Text>
      <Text style={[styles.chipLabel, { color: tint.deep }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },

  /* Today */
  todayCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: space[4],
    borderRadius: 22,
    gap: space[3],
    overflow: "hidden",
  },
  todayBlob: {
    position: "absolute",
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.18)",
    right: -28, top: -46,
  },
  todayTopRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  todayKicker: { fontSize: fontSize.label, fontWeight: "900", letterSpacing: 2 },
  todayDateChip: {
    backgroundColor: "rgba(255,255,255,0.45)",
    borderRadius: radius.pill,
    paddingHorizontal: space[2],
    paddingVertical: 2,
  },
  todayDateText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  todayValue: { fontSize: 26, fontWeight: "900", letterSpacing: -0.8, marginTop: 5 },
  todayCaption: { fontSize: fontSize.bodyS, fontWeight: "600", marginTop: 5, opacity: 0.75 },
  todayIcon: {
    width: 48, height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Card */
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.rule,
    padding: space[4],
    gap: space[4],
    ...shadow.card,
  },

  /* Month stepper */
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: colors.orangeTint,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: { fontSize: fontSize.bodyL, fontWeight: "800", color: colors.ink, letterSpacing: -0.2 },

  /* Percent + progress */
  pctRow: { flexDirection: "row", alignItems: "center", gap: space[4] },
  bigPct: { fontSize: 32, fontWeight: "900", color: colors.ink, letterSpacing: -1.4 },
  pctSign: { fontSize: 17, fontWeight: "800", color: colors.ink60 },
  pctCaption: { fontSize: fontSize.bodyS, color: colors.ink60, fontWeight: "600", marginBottom: 8 },
  progressTrack: { height: 9, backgroundColor: colors.cream, borderRadius: radius.pill, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: radius.pill },

  /* Count chips */
  chipsRow: { flexDirection: "row", gap: space[2] },
  chip: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: space[3],
    alignItems: "center",
    gap: 3,
  },
  chipNum: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  chipLabel: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.6 },

  /* Calendar */
  weekRow: { flexDirection: "row" },
  weekHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: fontSize.label,
    fontWeight: "800",
    color: colors.ink40,
    letterSpacing: 0.4,
  },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  dayPill: { flex: 1, borderRadius: radius[3], alignItems: "center", justifyContent: "center" },
  calDay: { fontSize: fontSize.body, fontWeight: "700" },

  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space[3],
    justifyContent: "center",
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.ruleSoft,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 4 },
  legendText: { fontSize: fontSize.bodyS, color: colors.ink60, fontWeight: "600" },
});
