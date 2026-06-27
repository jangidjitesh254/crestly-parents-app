/**
 * Take a test, then see the graded result. The answer key is never present
 * before submission — on submit the server grades and returns the revealed
 * key, which we render inline (correct in green, your wrong pick in red).
 *
 * Grading (mirrored from the server, shown to the user so expectations match):
 *  - MCQ: correct only when the selected set exactly equals the correct set
 *    (multi-select supported; order ignored).
 *  - fill_blank: trimmed, case-insensitive match against any accepted answer.
 */
import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../store/auth";
import { useParentTest, useSubmitTest } from "../../hooks/queries";
import { getErrorMessage } from "../../lib/api";
import { Button, Card, FadeInView, Screen, StateView, TextField } from "../../components/ui";
import { TopBar } from "../../components/TopBar";
import { PageHead } from "../../components/PageHead";
import { InfoCard } from "../../components/InfoCard";
import { colors, fontSize, radius, space, tints } from "../../theme";
import type { MoreStackParams } from "../../navigation/types";
import type {
  GradedAnswer,
  ParentTestQuestion,
  TestAnswerInput,
  TestSubmitResult,
} from "../../types/api";

type Props = NativeStackScreenProps<MoreStackParams, "TestAttempt">;

interface LocalAnswer {
  selectedOptions?: number[];
  responseText?: string;
}

export function TestAttemptScreen({ route, navigation }: Props) {
  const { testId, title } = route.params;
  const { kids, activeChildSr } = useAuth();
  const sr = activeChildSr ?? kids[0]?.srNumber ?? 0;

  const detail = useParentTest(testId, sr);
  const submit = useSubmitTest();
  const [answers, setAnswers] = useState<Record<number, LocalAnswer>>({});
  const [result, setResult] = useState<TestSubmitResult | null>(null);

  const questions = detail.data?.questions ?? [];

  const answeredCount = useMemo(() => {
    let n = 0;
    for (const q of questions) {
      const a = answers[q.id];
      if (q.type === "mcq" && (a?.selectedOptions?.length ?? 0) > 0) n++;
      if (q.type === "fill_blank" && (a?.responseText ?? "").trim().length > 0) n++;
    }
    return n;
  }, [answers, questions]);

  function toggleOption(qid: number, idx: number) {
    setAnswers((prev) => {
      const cur = prev[qid]?.selectedOptions ?? [];
      const next = cur.includes(idx) ? cur.filter((i) => i !== idx) : [...cur, idx];
      return { ...prev, [qid]: { selectedOptions: next } };
    });
  }
  function setText(qid: number, text: string) {
    setAnswers((prev) => ({ ...prev, [qid]: { responseText: text } }));
  }

  function doSubmit() {
    const payload: TestAnswerInput[] = questions.map((q) =>
      q.type === "mcq"
        ? { questionId: q.id, selectedOptions: answers[q.id]?.selectedOptions ?? [] }
        : { questionId: q.id, responseText: (answers[q.id]?.responseText ?? "").trim() },
    );
    submit.mutate(
      { id: testId, body: { sr, answers: payload } },
      {
        onSuccess: (r) => setResult(r),
        onError: (e) => Alert.alert("Couldn't submit", getErrorMessage(e)),
      },
    );
  }

  function confirmSubmit() {
    const left = questions.length - answeredCount;
    if (left > 0) {
      Alert.alert(
        "Submit test?",
        `${left} question${left === 1 ? "" : "s"} still unanswered. Unanswered questions score zero.`,
        [
          { text: "Keep going", style: "cancel" },
          { text: "Submit anyway", style: "destructive", onPress: doSubmit },
        ],
      );
    } else {
      Alert.alert("Submit test?", "You can't change answers after submitting.", [
        { text: "Review", style: "cancel" },
        { text: "Submit", onPress: doSubmit },
      ]);
    }
  }

  /* ---------------------------------------------------------- result view */

  if (result) {
    return <ResultView title={title} result={result} questions={questions} onDone={() => navigation.goBack()} />;
  }

  return (
    <View style={styles.root}>
      <TopBar showBack onBack={() => navigation.goBack()} />
      <Screen>
        <PageHead crumb="Test" title={title} subtitle={detail.data?.subjectName ?? undefined} />

        <StateView
          loading={detail.isLoading}
          error={detail.error}
          onRetry={() => void detail.refetch()}
        />

        {detail.data?.alreadyAttempted ? (
          <InfoCard
            variant="success"
            lead="Already submitted."
            body="This test has been attempted. Open Tests to see the score."
          />
        ) : detail.data ? (
          <>
            {detail.data.instructions ? (
              <InfoCard lead="Instructions." body={detail.data.instructions} />
            ) : null}

            <View style={styles.summaryRow}>
              <Chip icon="help-circle-outline" text={`${questions.length} questions`} />
              <Chip icon="ribbon-outline" text={`${detail.data.totalMarks} marks`} />
              {detail.data.durationMin ? (
                <Chip icon="time-outline" text={`${detail.data.durationMin} min`} />
              ) : null}
            </View>

            {questions.map((q, i) => (
              <FadeInView key={q.id} delay={Math.min(i * 40, 240)}>
                <QuestionCard
                  index={i + 1}
                  q={q}
                  answer={answers[q.id]}
                  onToggle={(idx) => toggleOption(q.id, idx)}
                  onText={(t) => setText(q.id, t)}
                />
              </FadeInView>
            ))}

            <View style={styles.submitBar}>
              <Text style={styles.progress}>{answeredCount} / {questions.length} answered</Text>
              <Button
                label={submit.isPending ? "Submitting…" : "Submit test"}
                onPress={confirmSubmit}
                loading={submit.isPending}
              />
            </View>
          </>
        ) : null}
      </Screen>
    </View>
  );
}

/* --------------------------------------------------------------- pieces */

function Chip({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={13} color={colors.ink60} />
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

function QuestionCard({
  index,
  q,
  answer,
  onToggle,
  onText,
}: {
  index: number;
  q: ParentTestQuestion;
  answer: LocalAnswer | undefined;
  onToggle: (idx: number) => void;
  onText: (t: string) => void;
}) {
  const selected = answer?.selectedOptions ?? [];
  return (
    <Card style={styles.qCard}>
      <View style={styles.qHead}>
        <View style={styles.qNum}>
          <Text style={styles.qNumText}>{index}</Text>
        </View>
        <Text style={styles.qPrompt}>{q.prompt}</Text>
        <Text style={styles.qMarks}>{q.marks}</Text>
      </View>

      {q.type === "mcq" ? (
        <View style={{ gap: space[2] }}>
          {(q.options ?? []).map((opt, idx) => {
            const on = selected.includes(idx);
            return (
              <Pressable
                key={idx}
                onPress={() => onToggle(idx)}
                android_ripple={{ color: "rgba(16,13,10,0.05)" }}
                style={[styles.option, on && styles.optionOn]}
              >
                <View style={[styles.checkbox, on && styles.checkboxOn]}>
                  {on ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                </View>
                <Text style={[styles.optionText, on && styles.optionTextOn]}>{opt.text}</Text>
              </Pressable>
            );
          })}
          <Text style={styles.hint}>Select all that apply.</Text>
        </View>
      ) : (
        <TextField
          value={answer?.responseText ?? ""}
          onChangeText={onText}
          placeholder="Type your answer"
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}
    </Card>
  );
}

/* ---------------------------------------------------------- result view */

function ResultView({
  title,
  result,
  questions,
  onDone,
}: {
  title: string;
  result: TestSubmitResult;
  questions: ParentTestQuestion[];
  onDone: () => void;
}) {
  // Pass/Fail is only meaningful when the test has a pass mark.
  const heroTint =
    result.passed === true ? tints.mint
    : result.passed === false ? tints.rose
    : tints.sky;
  const byId = new Map(result.answers.map((a) => [a.questionId, a]));

  return (
    <View style={styles.root}>
      <TopBar showBack onBack={onDone} />
      <Screen>
        <PageHead crumb="Result" title={title} />

        <FadeInView delay={0}>
          <View style={[styles.hero, { backgroundColor: heroTint.base }]}>
            <Text style={[styles.heroKicker, { color: heroTint.deep }]}>YOUR SCORE</Text>
            <Text style={styles.heroScore}>
              {result.score}<Text style={styles.heroMax}> / {result.maxScore}</Text>
            </Text>
            <View style={styles.heroBadges}>
              <View style={[styles.heroPct, { backgroundColor: heroTint.deep }]}>
                <Text style={styles.heroPctText}>{Math.round(result.percent)}%</Text>
              </View>
              {result.passed != null ? (
                <View style={[styles.heroPct, { backgroundColor: heroTint.deep }]}>
                  <Text style={styles.heroPctText}>{result.passed ? "PASS" : "FAIL"}</Text>
                </View>
              ) : null}
            </View>
            {result.passMarks != null ? (
              <Text style={[styles.heroPassNote, { color: heroTint.deep }]}>
                Pass mark · {result.passMarks} / {result.maxScore}
              </Text>
            ) : null}
          </View>
        </FadeInView>

        {questions.map((q, i) => {
          const g = byId.get(q.id);
          if (!g) return null;
          return (
            <FadeInView key={q.id} delay={Math.min(40 + i * 40, 280)}>
              <GradedCard index={i + 1} q={q} g={g} />
            </FadeInView>
          );
        })}

        <Button label="Done" onPress={onDone} variant="secondary" />
      </Screen>
    </View>
  );
}

function GradedCard({ index, q, g }: { index: number; q: ParentTestQuestion; g: GradedAnswer }) {
  const correctSet = new Set(g.correctOptions ?? []);
  const pickedSet = new Set(g.selectedOptions ?? []);
  return (
    <Card style={styles.qCard}>
      <View style={styles.qHead}>
        <View style={[styles.verdict, { backgroundColor: g.isCorrect ? tints.mint.base : colors.errorSoft }]}>
          <Ionicons
            name={g.isCorrect ? "checkmark" : "close"}
            size={15}
            color={g.isCorrect ? tints.mint.deep : colors.error}
          />
        </View>
        <Text style={styles.qPrompt}>
          <Text style={styles.qIndexInline}>Q{index}. </Text>{q.prompt}
        </Text>
        <Text style={[styles.qMarks, { color: g.isCorrect ? tints.mint.deep : colors.ink40 }]}>
          {g.awardedMarks}/{g.marks}
        </Text>
      </View>

      {q.type === "mcq" ? (
        <View style={{ gap: space[2] }}>
          {(q.options ?? []).map((opt, idx) => {
            const isCorrect = correctSet.has(idx);
            const isPicked = pickedSet.has(idx);
            const wrongPick = isPicked && !isCorrect;
            return (
              <View
                key={idx}
                style={[
                  styles.gradedOption,
                  isCorrect && styles.gradedCorrect,
                  wrongPick && styles.gradedWrong,
                ]}
              >
                <Ionicons
                  name={isCorrect ? "checkmark-circle" : wrongPick ? "close-circle" : "ellipse-outline"}
                  size={16}
                  color={isCorrect ? tints.mint.deep : wrongPick ? colors.error : colors.ink40}
                />
                <Text style={[styles.optionText, isCorrect && { color: tints.mint.deep, fontWeight: "800" }]}>
                  {opt.text}
                </Text>
                {isPicked ? <Text style={styles.youTag}>YOU</Text> : null}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: space[2] }}>
          <KeyVal label="Your answer" value={g.responseText || "—"} tone={g.isCorrect ? tints.mint.deep : colors.error} />
          {!g.isCorrect && g.acceptedAnswers && g.acceptedAnswers.length > 0 ? (
            <KeyVal label="Accepted" value={g.acceptedAnswers.join(", ")} tone={tints.mint.deep} />
          ) : null}
        </View>
      )}
    </Card>
  );
}

function KeyVal({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={styles.kvRow}>
      <Text style={styles.kvLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.kvValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },

  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.cream, borderRadius: radius.pill,
    paddingHorizontal: space[3], paddingVertical: 6,
  },
  chipText: { fontSize: fontSize.bodyS, fontWeight: "700", color: colors.ink80 },

  qCard: { gap: space[3] },
  qHead: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  qNum: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.ink, alignItems: "center", justifyContent: "center",
  },
  qNumText: { color: colors.white, fontSize: fontSize.bodyS, fontWeight: "800" },
  qPrompt: { flex: 1, fontSize: fontSize.bodyL, fontWeight: "700", color: colors.ink, lineHeight: 22 },
  qIndexInline: { fontWeight: "800", color: colors.ink60 },
  qMarks: { fontSize: fontSize.bodyS, fontWeight: "800", color: colors.ink40 },

  option: {
    flexDirection: "row", alignItems: "center", gap: space[3],
    borderWidth: 1.5, borderColor: colors.rule, borderRadius: radius[3],
    paddingHorizontal: space[3], paddingVertical: space[3],
  },
  optionOn: { borderColor: colors.orange, backgroundColor: colors.orangeTint },
  checkbox: {
    width: 22, height: 22, borderRadius: radius[2],
    borderWidth: 2, borderColor: colors.ruleStrong,
    alignItems: "center", justifyContent: "center",
  },
  checkboxOn: { backgroundColor: colors.orange, borderColor: colors.orange },
  optionText: { flex: 1, fontSize: fontSize.body, color: colors.ink, fontWeight: "600" },
  optionTextOn: { color: colors.orangeDeep, fontWeight: "800" },
  hint: { fontSize: fontSize.bodyS, color: colors.ink40, fontStyle: "italic" },

  submitBar: { gap: space[2], marginTop: space[2] },
  progress: { textAlign: "center", fontSize: fontSize.bodyS, color: colors.ink60, fontWeight: "700" },

  /* result */
  hero: { borderRadius: 24, padding: space[5], alignItems: "center", gap: 4 },
  heroKicker: { fontSize: fontSize.label, fontWeight: "800", letterSpacing: 1.6 },
  heroScore: { fontSize: 44, fontWeight: "900", color: colors.ink, letterSpacing: -1.5 },
  heroMax: { fontSize: fontSize.displayS, fontWeight: "800", color: colors.ink60 },
  heroBadges: { flexDirection: "row", gap: space[2], marginTop: space[2] },
  heroPct: { borderRadius: radius.pill, paddingHorizontal: space[4], paddingVertical: 5 },
  heroPctText: { color: colors.white, fontSize: fontSize.body, fontWeight: "800", letterSpacing: 0.3 },
  heroPassNote: { fontSize: fontSize.bodyS, fontWeight: "800", marginTop: space[2] },

  verdict: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: "center", justifyContent: "center",
  },
  gradedOption: {
    flexDirection: "row", alignItems: "center", gap: space[2],
    borderWidth: 1, borderColor: colors.rule, borderRadius: radius[3],
    paddingHorizontal: space[3], paddingVertical: space[2],
  },
  gradedCorrect: { borderColor: tints.mint.deep, backgroundColor: tints.mint.base },
  gradedWrong: { borderColor: colors.error, backgroundColor: colors.errorSoft },
  youTag: { fontSize: 9.5, fontWeight: "800", color: colors.ink40, letterSpacing: 0.6 },

  kvRow: { flexDirection: "row", justifyContent: "space-between", gap: space[3], alignItems: "center" },
  kvLabel: { fontSize: fontSize.label, fontWeight: "800", color: colors.ink40, letterSpacing: 0.8 },
  kvValue: { flex: 1, fontSize: fontSize.body, fontWeight: "800", textAlign: "right" },
});
