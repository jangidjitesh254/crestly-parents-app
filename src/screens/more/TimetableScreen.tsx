/**
 * Class timetable — weekly period grid for the active child.
 * Mirrors apps/web/src/pages/parent/ParentTimetablePage.tsx.
 */
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../store/auth";
import { useParentTimetable } from "../../hooks/queries";
import { ChildSwitcher } from "../../components/ChildSwitcher";
import { Card, FadeInView, Screen, StateView } from "../../components/ui";
import { TopBar } from "../../components/TopBar";
import { PageHead } from "../../components/PageHead";
import { colors, fontSize, radius, space, tints } from "../../theme";
import type { MoreStackParams } from "../../navigation/types";
import type { ParentTimetableCell } from "../../types/api";

type Props = NativeStackScreenProps<MoreStackParams, "Timetable">;

const DAYS = [
  { idx: 1, short: "Mon" },
  { idx: 2, short: "Tue" },
  { idx: 3, short: "Wed" },
  { idx: 4, short: "Thu" },
  { idx: 5, short: "Fri" },
  { idx: 6, short: "Sat" },
];

export function TimetableScreen({ navigation }: Props) {
  const { kids, activeChildSr } = useAuth();
  const sr = activeChildSr ?? kids[0]?.srNumber ?? 0;
  const activeKid = kids.find((k) => k.srNumber === sr) ?? kids[0];
  const grid = useParentTimetable(sr);

  const lookup = React.useMemo(() => {
    const m = new Map<string, ParentTimetableCell>();
    for (const c of grid.data?.cells ?? []) {
      m.set(`${c.dayOfWeek}|${c.periodId}`, c);
    }
    return m;
  }, [grid.data]);

  return (
    <View style={styles.root}>
      <TopBar showBack onBack={() => navigation.goBack()} />
      <Screen refreshing={grid.isFetching} onRefresh={() => void grid.refetch()}>
        <PageHead
          crumb="Timetable"
          title={activeKid?.studentName ?? "Timetable"}
          subtitle={grid.data ? `Class ${grid.data.classLabel} · Session ${grid.data.sessionCode}` : undefined}
        />

        <ChildSwitcher />

        {grid.isLoading ? (
          <StateView loading />
        ) : grid.error ? (
          <StateView error={grid.error} onRetry={() => void grid.refetch()} />
        ) : !grid.data?.periods.length ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Timetable not published yet</Text>
            <Text style={styles.emptyHint}>
              The school hasn't set up the schedule. Check back soon.
            </Text>
          </View>
        ) : (
          <FadeInView delay={0}>
            <Card style={{ padding: 0 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View>
                  <View style={styles.headerRow}>
                    <View style={[styles.periodHeadCell, styles.cornerCell]}>
                      <Text style={styles.cornerText}>PERIOD</Text>
                    </View>
                    {DAYS.map((d) => (
                      <View key={d.idx} style={[styles.dayHeadCell, styles.dayHeader]}>
                        <Text style={styles.dayHeadText}>{d.short.toUpperCase()}</Text>
                      </View>
                    ))}
                  </View>
                  {grid.data!.periods.map((p) => (
                    <View key={p.id} style={styles.row}>
                      <View style={[styles.periodHeadCell, { backgroundColor: colors.cream }]}>
                        <Text style={styles.periodName}>{p.name}</Text>
                        <Text style={styles.periodTime}>
                          {p.startTime.slice(0, 5)}–{p.endTime.slice(0, 5)}
                        </Text>
                      </View>
                      {p.isBreak ? (
                        <View style={[styles.breakCell, { backgroundColor: tints.wheat.base }]}>
                          <Text style={[styles.breakText, { color: tints.wheat.deep }]}>
                            {p.name}
                          </Text>
                        </View>
                      ) : (
                        DAYS.map((d) => {
                          const c = lookup.get(`${d.idx}|${p.id}`);
                          const filled = !!c?.subjectName;
                          return (
                            <View
                              key={d.idx}
                              style={[
                                styles.subjectCell,
                                filled && { backgroundColor: tints.wheat.base },
                              ]}
                            >
                              {filled ? (
                                <>
                                  <Text style={styles.subjectName} numberOfLines={2}>
                                    {c!.subjectName ?? c!.subjectCode}
                                  </Text>
                                  {c!.teacherName ? (
                                    <Text style={styles.subjectTeacher} numberOfLines={1}>
                                      {c!.teacherName!.split(" ").slice(-1)[0]}
                                    </Text>
                                  ) : null}
                                  {c!.room ? (
                                    <Text style={styles.subjectRoom}>{c!.room}</Text>
                                  ) : null}
                                </>
                              ) : (
                                <Text style={styles.empty2}>—</Text>
                              )}
                            </View>
                          );
                        })
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </Card>
          </FadeInView>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.creamSoft },

  headerRow: { flexDirection: "row" },
  row: { flexDirection: "row" },

  periodHeadCell: {
    width: 100,
    paddingHorizontal: space[2],
    paddingVertical: space[2],
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.ruleSoft,
    justifyContent: "center",
    gap: 2,
  },
  cornerCell: { backgroundColor: colors.cream },
  cornerText: {
    fontSize: fontSize.label,
    fontWeight: "800",
    color: colors.ink60,
    letterSpacing: 1.2,
  },

  dayHeadCell: {
    width: 80,
    paddingVertical: space[2],
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.ruleSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  dayHeader: { backgroundColor: colors.cream },
  dayHeadText: {
    fontSize: fontSize.label,
    fontWeight: "800",
    color: colors.ink60,
    letterSpacing: 1.0,
  },

  periodName: { fontSize: fontSize.bodyS, fontWeight: "800", color: colors.ink },
  periodTime: { fontSize: 10, color: colors.ink40, fontWeight: "700" },

  subjectCell: {
    width: 80,
    minHeight: 60,
    padding: 4,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.ruleSoft,
    justifyContent: "center",
    gap: 1,
  },
  subjectName: { fontSize: fontSize.bodyS, fontWeight: "800", color: colors.ink },
  subjectTeacher: { fontSize: 10, color: colors.ink60, fontWeight: "700" },
  subjectRoom: { fontSize: 9, color: colors.ink40 },
  empty2: { color: colors.ink20, fontWeight: "700", textAlign: "center" },

  breakCell: {
    flex: 1,
    minHeight: 60,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderColor: colors.ruleSoft,
  },
  breakText: {
    fontSize: fontSize.bodyS,
    fontWeight: "800",
    letterSpacing: 0.6,
    fontStyle: "italic",
  },

  empty: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.rule,
    borderStyle: "dashed",
    padding: space[6],
    alignItems: "center",
    gap: space[1],
  },
  emptyTitle: { fontSize: fontSize.bodyL, fontWeight: "800", color: colors.ink },
  emptyHint: { fontSize: fontSize.bodyS, color: colors.ink60, textAlign: "center" },
});
