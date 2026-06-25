/**
 * Diary & Homework — day-by-day class log for the active child.
 * Mirrors apps/web/src/pages/parent/ParentDiaryPage.tsx with a date stepper,
 * recent-dates pill row, and per-period entries with separate "Taught"
 * and "Homework" blocks.
 */
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../store/auth";
import { useParentDiary } from "../../hooks/queries";
import { ChildSwitcher } from "../../components/ChildSwitcher";
import {
  Card,
  EmptyState,
  FadeInView,
  Screen,
  Skeleton,
  StateView,
  Stepper,
} from "../../components/ui";
import { TopBar } from "../../components/TopBar";
import { PageHead } from "../../components/PageHead";
import { addDays, formatBreadcrumbDate, todayIso } from "../../lib/dates";
import { colors, fontSize, radius, space, tints } from "../../theme";
import type { MoreStackParams } from "../../navigation/types";

type Props = NativeStackScreenProps<MoreStackParams, "Diary">;

function dayLabel(iso: string): string {
  if (iso === todayIso()) return "Today";
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function DiaryScreen({ navigation }: Props) {
  const { kids, activeChildSr } = useAuth();
  const sr = activeChildSr ?? kids[0]?.srNumber ?? 0;
  const activeKid = kids.find((k) => k.srNumber === sr) ?? kids[0];
  const [date, setDate] = useState(todayIso());
  const diary = useParentDiary(sr, date);
  const isFuture = date > todayIso();

  return (
    <View style={styles.root}>
      <TopBar showBack onBack={() => navigation.goBack()} />
      <Screen refreshing={diary.isFetching} onRefresh={() => void diary.refetch()}>
        <PageHead
          crumb="Diary"
          date={formatBreadcrumbDate(date)}
          title="Diary & Homework"
          subtitle={activeKid ? `${activeKid.studentName} · Class ${activeKid.classLabel}` : undefined}
        />

        <ChildSwitcher />

        <Stepper
          label={dayLabel(date)}
          onPrev={() => setDate(addDays(date, -1))}
          onNext={() => setDate(addDays(date, 1))}
          nextDisabled={isFuture}
        />

        {/* Recent dates pill row */}
        {diary.data && diary.data.recentDates.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentRow}
          >
            {diary.data.recentDates.map((d) => {
              const active = d === date;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDate(d)}
                  android_ripple={{ color: "rgba(16,13,10,0.08)" }}
                  style={[styles.recentPill, active && styles.recentPillActive]}
                >
                  <Text style={[styles.recentText, active && styles.recentTextActive]}>
                    {dayLabel(d)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {diary.isLoading ? (
          <View style={{ gap: space[3] }}>
            <Skeleton height={120} radius={16} />
            <Skeleton height={120} radius={16} />
          </View>
        ) : diary.error ? (
          <StateView error={diary.error} onRetry={() => void diary.refetch()} />
        ) : diary.data && diary.data.entries.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="book-outline" size={26} color={tints.wheat.deep} />}
            title="Nothing logged yet"
            body="Teachers update through the day — check back later, or use the recent-dates pills above to look back."
          />
        ) : (
          (diary.data?.entries ?? []).map((e, i) => (
            <FadeInView key={i} delay={i * 50}>
              <Card>
                <View style={styles.entryHead}>
                  {e.startTime ? (
                    <View style={styles.timeBadge}>
                      <Text style={styles.timeText}>
                        {e.startTime.slice(0, 5)}
                        {e.endTime ? `–${e.endTime.slice(0, 5)}` : ""}
                      </Text>
                    </View>
                  ) : null}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.entrySubject} numberOfLines={1}>
                      {e.subjectName ?? e.subjectCode ?? "Activity"}
                    </Text>
                    {e.teacherName ? (
                      <Text style={styles.entryTeacher} numberOfLines={1}>
                        {e.teacherName}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {e.topic ? (
                  <View style={styles.block}>
                    <Text style={styles.blockLabel}>TAUGHT</Text>
                    <Text style={styles.blockText}>{e.topic}</Text>
                  </View>
                ) : null}

                {e.homework ? (
                  <View style={styles.hwBlock}>
                    <View style={styles.hwLabelRow}>
                      <Ionicons name="pencil" size={12} color={colors.orangeDeep} />
                      <Text style={[styles.blockLabel, { color: colors.orangeDeep }]}>
                        HOMEWORK
                      </Text>
                    </View>
                    <Text style={styles.hwText}>{e.homework}</Text>
                  </View>
                ) : null}
              </Card>
            </FadeInView>
          ))
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },

  recentRow: { gap: space[2], paddingVertical: 2 },
  recentPill: {
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.pill,
  },
  recentPillActive: {
    backgroundColor: colors.orangeTint,
    borderColor: colors.orange,
  },
  recentText: { fontSize: fontSize.bodyS, color: colors.ink60, fontWeight: "700" },
  recentTextActive: { color: colors.orangeDeep, fontWeight: "800" },

  entryHead: {
    flexDirection: "row",
    gap: space[3],
    alignItems: "flex-start",
    marginBottom: space[2],
  },
  timeBadge: {
    backgroundColor: colors.cream,
    paddingHorizontal: space[2],
    paddingVertical: 4,
    borderRadius: radius[2],
  },
  timeText: {
    fontSize: fontSize.label,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: 0.4,
  },
  entrySubject: { fontSize: fontSize.bodyL, fontWeight: "800", color: colors.ink },
  entryTeacher: { fontSize: fontSize.bodyS, color: colors.ink60, marginTop: 2 },

  block: { marginTop: space[2], gap: 4 },
  blockLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.ink40,
    letterSpacing: 1.4,
  },
  blockText: { fontSize: fontSize.body, color: colors.ink, lineHeight: 20 },

  hwBlock: {
    marginTop: space[3],
    backgroundColor: tints.wheat.base,
    borderLeftWidth: 3,
    borderLeftColor: colors.orange,
    padding: space[3],
    borderRadius: radius[2],
    gap: 4,
  },
  hwLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  hwText: { fontSize: fontSize.body, color: colors.ink, lineHeight: 20 },
});
