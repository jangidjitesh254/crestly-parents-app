import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../store/auth";
import { useParentExams } from "../hooks/queries";
import { ChildSwitcher } from "../components/ChildSwitcher";
import {
  Card,
  EmptyState,
  FadeInView,
  Screen,
  SectionHeader,
  Skeleton,
  StateView,
} from "../components/ui";
import { TopBar } from "../components/TopBar";
import { PageHead } from "../components/PageHead";
import { colors, fontSize, radius, space, tints } from "../theme";

export function ExamsScreen() {
  const { kids, activeChildSr } = useAuth();
  const sr = activeChildSr ?? kids[0]?.srNumber ?? 0;
  const activeKid = kids.find((k) => k.srNumber === sr) ?? kids[0];
  const exams = useParentExams(sr);
  const d = exams.data;
  const pass = d?.overall?.result === "PASS";

  return (
    <View style={styles.root}>
      <TopBar />
      <Screen refreshing={exams.isFetching} onRefresh={() => void exams.refetch()}>
        <PageHead
          crumb="Exam result"
          title={activeKid?.studentName ?? "Exams"}
          subtitle={activeKid ? `Class ${activeKid.classLabel}` : undefined}
        />

        <ChildSwitcher />

        {exams.isLoading ? (
          <View style={{ gap: space[3] }}>
            <Skeleton height={140} radius={16} />
            <Skeleton height={160} radius={16} />
            <Skeleton height={200} radius={16} />
          </View>
        ) : exams.error ? (
          <StateView error={exams.error} onRetry={() => void exams.refetch()} />
        ) : !d?.overall ? (
          <EmptyState
            icon={<Ionicons name="hourglass-outline" size={26} color={tints.sky.deep} />}
            title="No results yet"
            body="Please check back after the term-end results are published by your school."
          />
        ) : (
          <>
            {/* Hero */}
            <FadeInView delay={0}>
              <View
                style={[
                  styles.hero,
                  { backgroundColor: pass ? tints.mint.base : tints.rose.base },
                ]}
              >
                <View style={styles.heroTop}>
                  <Text
                    style={[
                      styles.heroLabel,
                      { color: pass ? tints.mint.deep : tints.rose.deep },
                    ]}
                  >
                    SESSION {d.sessionCode}
                  </Text>
                  <View
                    style={[
                      styles.resultPill,
                      {
                        backgroundColor: pass ? tints.mint.deep : tints.rose.deep,
                      },
                    ]}
                  >
                    <Ionicons
                      name={pass ? "checkmark-circle" : "alert-circle"}
                      size={12}
                      color={colors.white}
                    />
                    <Text style={styles.resultPillText}>{d.overall.result}</Text>
                  </View>
                </View>
                <View style={styles.heroGrid}>
                  <View>
                    <Text style={styles.heroBig}>
                      {Math.round(d.overall.weightedPct)}
                      <Text style={styles.heroPct}>%</Text>
                    </Text>
                    <Text style={styles.heroHint}>Overall weighted</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.heroBig}>
                      {d.overall.totalObtained.toFixed(0)}
                      <Text style={styles.heroMax}> / {d.overall.totalMax}</Text>
                    </Text>
                    <Text style={styles.heroHint}>Grade {d.overall.grade}</Text>
                  </View>
                </View>
              </View>
            </FadeInView>

            {/* By term */}
            <FadeInView delay={60}>
              <SectionHeader label="Performance by term" />
              <Card>
                {d.terms.map((t, i) => (
                  <BarRow
                    key={t.id}
                    label={t.shortCode}
                    sub={`${t.weightPercent}%`}
                    pct={t.pct}
                    last={i === d.terms.length - 1}
                  />
                ))}
              </Card>
            </FadeInView>

            {/* By subject */}
            <FadeInView delay={120}>
              <SectionHeader label="Per subject" />
              <Card>
                {d.subjects.map((s, i) => (
                  <BarRow
                    key={s.id}
                    label={s.name}
                    sub={s.finalGrade ?? undefined}
                    pct={s.finalPct}
                    last={i === d.subjects.length - 1}
                  />
                ))}
              </Card>
            </FadeInView>
          </>
        )}
      </Screen>
    </View>
  );
}

function BarRow({
  label,
  sub,
  pct,
  last,
}: {
  label: string;
  sub?: string;
  pct: number | null;
  last?: boolean;
}) {
  const width = pct == null ? 0 : Math.min(100, pct);
  const color = pct == null
    ? colors.ink20
    : pct >= 75
    ? tints.mint.deep
    : pct >= 50
    ? colors.orangeDeep
    : tints.rose.deep;
  return (
    <View
      style={[
        styles.barWrap,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.ruleSoft },
      ]}
    >
      <View style={styles.barTopRow}>
        <Text style={styles.barLabel} numberOfLines={1}>
          {label}
          {sub ? <Text style={styles.barSub}>  ({sub})</Text> : null}
        </Text>
        <Text style={[styles.barPct, { color }]}>
          {pct == null ? "—" : `${Math.round(pct)}%`}
        </Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${width}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.creamSoft },

  /* Hero */
  hero: { borderRadius: 20, padding: space[5], gap: space[3] },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroLabel: { fontSize: fontSize.label, fontWeight: "800", letterSpacing: 1.6 },
  resultPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: space[2],
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  resultPillText: {
    color: colors.white,
    fontSize: fontSize.cap,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  heroGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  heroBig: { fontSize: 40, fontWeight: "800", color: colors.ink, letterSpacing: -1 },
  heroPct: { fontSize: 22, color: colors.ink60, fontWeight: "700" },
  heroMax: { fontSize: fontSize.bodyL, color: colors.ink40, fontWeight: "600" },
  heroHint: { fontSize: fontSize.bodyS, color: colors.ink60, marginTop: 2 },

  /* Bars */
  barWrap: { paddingVertical: space[2], gap: space[1] },
  barTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  barLabel: { fontSize: fontSize.body, fontWeight: "700", color: colors.ink, flex: 1, marginRight: space[2] },
  barSub: { fontSize: fontSize.bodyS, color: colors.ink40, fontWeight: "600" },
  barPct: {
    fontSize: fontSize.body,
    fontWeight: "800",
    minWidth: 50,
    textAlign: "right",
  },
  barTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.cream,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: radius.pill },
});
