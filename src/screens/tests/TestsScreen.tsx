/**
 * Online Tests — the list of MCQ / fill-in-the-blank tests assigned to the
 * active child. Available tests open into the attempt flow; attempted ones
 * show the score; upcoming / closed are disabled.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../store/auth";
import { useParentTests } from "../../hooks/queries";
import { ChildSwitcher } from "../../components/ChildSwitcher";
import { Card, FadeInView, Screen, StateView } from "../../components/ui";
import { TopBar } from "../../components/TopBar";
import { PageHead } from "../../components/PageHead";
import { colors, fontSize, radius, space, tints } from "../../theme";
import type { MoreStackParams } from "../../navigation/types";
import type { ParentTestListItem, ParentTestState } from "../../types/api";

type Props = NativeStackScreenProps<MoreStackParams, "Tests">;
type Tint = { base: string; deep: string };

const STATE: Record<ParentTestState, { tint: Tint; label: string }> = {
  available: { tint: tints.mint, label: "Available" },
  upcoming: { tint: tints.sky, label: "Upcoming" },
  closed: { tint: { base: colors.cream, deep: colors.ink60 }, label: "Closed" },
  attempted: { tint: tints.peach, label: "Attempted" },
};

export function TestsScreen({ navigation }: Props) {
  const { kids, activeChildSr } = useAuth();
  const sr = activeChildSr ?? kids[0]?.srNumber ?? 0;
  const tests = useParentTests(sr);
  const list = tests.data?.tests ?? [];

  return (
    <View style={styles.root}>
      <TopBar showBack onBack={() => navigation.goBack()} />
      <Screen refreshing={tests.isFetching} onRefresh={() => void tests.refetch()}>
        <PageHead
          crumb="Tests"
          title="Online Tests"
          subtitle="Attempt assigned tests — graded instantly on submit."
        />

        <ChildSwitcher />

        <StateView
          loading={tests.isLoading}
          error={tests.error}
          empty={!tests.isLoading && !tests.error && list.length === 0}
          emptyText="No tests assigned yet."
          onRetry={() => void tests.refetch()}
        />

        {list.map((t, i) => (
          <FadeInView key={t.id} delay={Math.min(i * 50, 240)}>
            <TestRow
              test={t}
              onStart={() =>
                navigation.navigate("TestAttempt", { testId: t.id, title: t.title })
              }
            />
          </FadeInView>
        ))}
      </Screen>
    </View>
  );
}

function TestRow({ test, onStart }: { test: ParentTestListItem; onStart: () => void }) {
  const st = STATE[test.state] ?? STATE.closed;
  const canStart = test.state === "available";
  const attempted = test.state === "attempted";

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: st.tint.base }]}>
          <Ionicons name="document-text-outline" size={20} color={st.tint.deep} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {test.subjectName ? (
            <Text style={styles.subject}>{test.subjectName.toUpperCase()}</Text>
          ) : null}
          <Text style={styles.title} numberOfLines={2}>{test.title}</Text>
        </View>
        <View style={[styles.stateChip, { backgroundColor: st.tint.base }]}>
          <Text style={[styles.stateChipText, { color: st.tint.deep }]}>{st.label}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Meta icon="help-circle-outline" text={`${test.questionCount} Qs`} />
        <Meta icon="ribbon-outline" text={`${test.totalMarks} marks`} />
        {test.durationMin ? <Meta icon="time-outline" text={`${test.durationMin} min`} /> : null}
      </View>

      {attempted ? (
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>YOUR SCORE</Text>
          <View style={styles.scoreRight}>
            {test.passed != null ? (
              <View style={[styles.passPill, { backgroundColor: test.passed ? tints.mint.base : colors.errorSoft }]}>
                <Text style={[styles.passText, { color: test.passed ? tints.mint.deep : colors.error }]}>
                  {test.passed ? "PASS" : "FAIL"}
                </Text>
              </View>
            ) : null}
            <Text style={styles.scoreValue}>
              {test.score ?? 0}<Text style={styles.scoreMax}> / {test.totalMarks}</Text>
            </Text>
          </View>
        </View>
      ) : canStart ? (
        <Pressable
          onPress={onStart}
          android_ripple={{ color: "rgba(255,255,255,0.18)" }}
          style={({ pressed }) => [styles.startBtn, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.startText}>Start test</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.white} />
        </Pressable>
      ) : (
        <View style={styles.lockedRow}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.ink40} />
          <Text style={styles.lockedText}>
            {test.state === "upcoming" ? "Not open yet" : "This test is closed"}
          </Text>
        </View>
      )}
    </Card>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={13} color={colors.ink40} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  card: { gap: space[3] },
  head: { flexDirection: "row", alignItems: "center", gap: space[3] },
  icon: {
    width: 44, height: 44, borderRadius: radius[3],
    alignItems: "center", justifyContent: "center",
  },
  subject: { fontSize: fontSize.label, fontWeight: "800", color: colors.orangeDeep, letterSpacing: 1 },
  title: { fontSize: fontSize.bodyL, fontWeight: "800", color: colors.ink, marginTop: 2, letterSpacing: -0.2 },
  stateChip: { borderRadius: radius.pill, paddingHorizontal: space[2], paddingVertical: 3, alignSelf: "flex-start" },
  stateChipText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: space[4] },
  meta: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: fontSize.bodyS, color: colors.ink60, fontWeight: "700" },

  scoreRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: tints.peach.base, borderRadius: radius[3], paddingHorizontal: space[4], paddingVertical: space[3],
  },
  scoreLabel: { fontSize: fontSize.label, fontWeight: "800", color: tints.peach.deep, letterSpacing: 1.2 },
  scoreRight: { flexDirection: "row", alignItems: "center", gap: space[2] },
  passPill: { borderRadius: radius.pill, paddingHorizontal: space[2], paddingVertical: 3 },
  passText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  scoreValue: { fontSize: fontSize.displayS, fontWeight: "900", color: colors.ink, letterSpacing: -0.5 },
  scoreMax: { fontSize: fontSize.body, fontWeight: "800", color: colors.ink60 },

  startBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.orange, borderRadius: radius[3], paddingVertical: space[3],
  },
  startText: { color: colors.white, fontSize: fontSize.bodyL, fontWeight: "800" },

  lockedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  lockedText: { fontSize: fontSize.bodyS, color: colors.ink40, fontWeight: "700" },
});
