/**
 * School Calendar — the merged feed (events + holidays + exam datesheets) for
 * the active child's class, as a month agenda. Read-only for parents.
 *
 * A month stepper drives the `?month=YYYY-MM` query; items come back flat and
 * date-sorted, and we group them by day for a clean agenda layout. Each item
 * carries its source/category so we can colour and badge it consistently.
 */
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../store/auth";
import { useParentCalendar } from "../hooks/queries";
import { ChildSwitcher } from "../components/ChildSwitcher";
import { Card, FadeInView, Screen, StateView, Stepper } from "../components/ui";
import { TopBar } from "../components/TopBar";
import { PageHead } from "../components/PageHead";
import { dayPad, monthShort, weekdayLong } from "../lib/dates";
import { colors, fontSize, radius, space, tints } from "../theme";
import type { MoreStackParams } from "../navigation/types";
import type { CalendarCategory, CalendarFeedItem } from "../types/api";

type Props = NativeStackScreenProps<MoreStackParams, "Calendar">;
type Tint = { base: string; deep: string };

const CATEGORY: Record<CalendarCategory, { tint: Tint; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  event: { tint: tints.sky, icon: "sparkles-outline", label: "Event" },
  ptm: { tint: tints.peach, icon: "people-outline", label: "PTM" },
  function: { tint: tints.rose, icon: "musical-notes-outline", label: "Function" },
  activity: { tint: tints.mint, icon: "color-palette-outline", label: "Activity" },
  sports: { tint: tints.mustard, icon: "football-outline", label: "Sports" },
  exam: { tint: tints.rose, icon: "school-outline", label: "Exam" },
  fee: { tint: tints.peach, icon: "wallet-outline", label: "Fee" },
  meeting: { tint: tints.sky, icon: "chatbubbles-outline", label: "Meeting" },
  notice: { tint: tints.wheat, icon: "megaphone-outline", label: "Notice" },
  holiday: { tint: tints.mint, icon: "sunny-outline", label: "Holiday" },
  other: { tint: tints.wheat, icon: "ellipse-outline", label: "Other" },
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function CalendarScreen({ navigation }: Props) {
  const { kids, activeChildSr } = useAuth();
  const sr = activeChildSr ?? kids[0]?.srNumber ?? 0;

  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const month = monthKey(cursor);
  const cal = useParentCalendar(sr, month);

  function step(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  // Group the flat, date-sorted feed by day.
  const days = useMemo(() => {
    const map = new Map<string, CalendarFeedItem[]>();
    for (const it of cal.data?.items ?? []) {
      const bucket = map.get(it.date);
      if (bucket) bucket.push(it);
      else map.set(it.date, [it]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [cal.data]);

  return (
    <View style={styles.root}>
      <TopBar showBack onBack={() => navigation.goBack()} />
      <Screen refreshing={cal.isFetching} onRefresh={() => void cal.refetch()}>
        <PageHead
          crumb="Calendar"
          title="School Calendar"
          subtitle="Events, holidays & exams for your child's class."
        />

        <ChildSwitcher />

        <Stepper label={monthLabel(cursor)} onPrev={() => step(-1)} onNext={() => step(1)} />

        <StateView
          loading={cal.isLoading}
          error={cal.error}
          empty={!cal.isLoading && !cal.error && days.length === 0}
          emptyText="Nothing on the calendar this month."
          onRetry={() => void cal.refetch()}
        />

        {days.map(([date, items], gi) => (
          <FadeInView key={date} delay={Math.min(gi * 40, 240)}>
            <View style={styles.dayBlock}>
              <View style={styles.dayHead}>
                <View style={styles.datePill}>
                  <Text style={styles.datePillDay}>{dayPad(date)}</Text>
                  <Text style={styles.datePillMon}>{monthShort(date)}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.dayWeekday}>{weekdayLong(date)}</Text>
                  <Text style={styles.dayCount}>
                    {items.length} {items.length === 1 ? "entry" : "entries"}
                  </Text>
                </View>
                {items.some((i) => i.isHoliday) ? (
                  <View style={styles.offBadge}>
                    <Text style={styles.offBadgeText}>HOLIDAY</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ gap: space[2] }}>
                {items.map((it) => <CalRow key={it.key} item={it} />)}
              </View>
            </View>
          </FadeInView>
        ))}
      </Screen>
    </View>
  );
}

function timeRange(it: CalendarFeedItem): string | null {
  if (it.allDay) return "All day";
  if (!it.startTime) return null;
  return it.endTime ? `${it.startTime}–${it.endTime}` : it.startTime;
}

function CalRow({ item }: { item: CalendarFeedItem }) {
  const c = CATEGORY[item.category] ?? CATEGORY.other;
  const muted = item.isHoliday;
  const tint = muted ? { base: colors.cream, deep: colors.ink60 } : c.tint;
  const t = timeRange(item);
  const multiDay = item.endDate && item.endDate !== item.date;

  return (
    <Card style={styles.row}>
      <View style={[styles.rowAccent, { backgroundColor: tint.deep }]} />
      <View style={[styles.rowIcon, { backgroundColor: tint.base }]}>
        <Ionicons name={c.icon} size={18} color={tint.deep} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.rowTags}>
          <View style={[styles.catChip, { backgroundColor: tint.base }]}>
            <Text style={[styles.catChipText, { color: tint.deep }]}>{c.label.toUpperCase()}</Text>
          </View>
          {item.classLabel ? (
            <Text style={styles.scope}>{item.classLabel}</Text>
          ) : (
            <Text style={styles.scope}>School-wide</Text>
          )}
        </View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        {(t || item.location || multiDay) ? (
          <View style={styles.metaRow}>
            {t ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={12} color={colors.ink40} />
                <Text style={styles.metaText}>{t}</Text>
              </View>
            ) : null}
            {multiDay ? (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={12} color={colors.ink40} />
                <Text style={styles.metaText}>
                  till {dayPad(item.endDate!)} {monthShort(item.endDate!)}
                </Text>
              </View>
            ) : null}
            {item.location ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={12} color={colors.ink40} />
                <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },

  dayBlock: { gap: space[2] },
  dayHead: { flexDirection: "row", alignItems: "center", gap: space[3], marginTop: space[2] },
  datePill: {
    width: 50,
    paddingVertical: space[2],
    borderRadius: radius[3],
    alignItems: "center",
    backgroundColor: colors.ink,
  },
  datePillDay: { fontSize: 17, fontWeight: "800", color: colors.white, letterSpacing: -0.3 },
  datePillMon: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.7)", letterSpacing: 0.6 },
  dayWeekday: { fontSize: fontSize.bodyL, fontWeight: "800", color: colors.ink, letterSpacing: -0.2 },
  dayCount: { fontSize: fontSize.bodyS, color: colors.ink60, marginTop: 1, fontWeight: "600" },
  offBadge: {
    backgroundColor: tints.mint.base,
    borderRadius: radius.pill,
    paddingHorizontal: space[2],
    paddingVertical: 3,
  },
  offBadgeText: { fontSize: 9.5, fontWeight: "800", color: tints.mint.deep, letterSpacing: 1.2 },

  row: { flexDirection: "row", alignItems: "center", gap: space[3], overflow: "hidden" },
  rowAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  rowIcon: {
    width: 40, height: 40, borderRadius: radius[3],
    alignItems: "center", justifyContent: "center",
    marginLeft: 2,
  },
  rowTags: { flexDirection: "row", alignItems: "center", gap: space[2] },
  catChip: { borderRadius: radius.pill, paddingHorizontal: space[2], paddingVertical: 2 },
  catChipText: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.8 },
  scope: { fontSize: fontSize.label, fontWeight: "700", color: colors.ink40, letterSpacing: 0.3 },
  title: { fontSize: fontSize.body, fontWeight: "800", color: colors.ink, marginTop: 3 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space[3], marginTop: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "100%" },
  metaText: { fontSize: fontSize.bodyS, color: colors.ink60, fontWeight: "600" },
});
