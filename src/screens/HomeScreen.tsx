/**
 * Parent home — a friendly, interactive dashboard.
 *
 *   greeting → Crestly brand banner (static; backend-driven later)
 *   → quick-access grid (navigates to the other tabs / screens)
 *   → per-child snapshot cards (today's attendance + academics).
 *
 * Identity, family and transport details now live on the Profile tab.
 */
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { MaterialTopTabScreenProps } from "@react-navigation/material-top-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../store/auth";
import {
  useParentHome, useParentAttendance, useParentExams, useParentSchoolInfo,
} from "../hooks/queries";
import { FadeInView, Screen, Skeleton, StateView } from "../components/ui";
import { currentSessionLabel } from "../lib/dates";
import { colors, fontSize, radius, shadow, space, tints } from "../theme";
import type { HomeStackParams, MainTabParams } from "../navigation/types";
import type { ParentKid } from "../types/api";

type Props = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParams, "HomeHome">,
  MaterialTopTabScreenProps<MainTabParams>
>;

const STATUS: Record<string, { bg: string; fg: string; label: string }> = {
  present: { bg: tints.mint.base, fg: tints.mint.deep, label: "Present" },
  absent: { bg: colors.errorSoft, fg: colors.error, label: "Absent" },
  late: { bg: colors.warnSoft, fg: colors.warn, label: "Late" },
  excused: { bg: tints.sky.base, fg: tints.sky.deep, label: "Excused" },
  not_marked: { bg: colors.cream, fg: colors.ink40, label: "Not marked" },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] ?? "?").slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}
function todayLabel(): string {
  return new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
}
function firstName(full: string | null): string | null {
  if (!full) return null;
  return full.trim().split(/\s+/)[0] ?? null;
}

export function HomeScreen({ navigation }: Props) {
  const { kids, setActiveChildSr } = useAuth();
  const home = useParentHome();
  const school = useParentSchoolInfo();
  const schoolName = school.data?.name?.trim() || "School";
  const freshKids = home.data?.kids ?? kids;
  const greetName = firstName(home.data?.parentName?.trim() || null);

  const ACTIONS: {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    sub: string;
    tint: { base: string; deep: string };
    go: () => void;
  }[] = [
    { key: "att", icon: "checkbox-outline", label: "Attendance", sub: "Daily record", tint: tints.mint, go: () => navigation.navigate("Attendance" as never) },
    { key: "exam", icon: "school-outline", label: "Results", sub: "Exams & marks", tint: tints.sky, go: () => navigation.navigate("Exams" as never) },
    { key: "fee", icon: "wallet-outline", label: "Fees", sub: "Dues & receipts", tint: tints.peach, go: () => navigation.navigate("Fees" as never) },
    { key: "diary", icon: "book-outline", label: "Diary", sub: "Homework", tint: tints.wheat, go: () => navigation.navigate("Profile", { screen: "Diary" } as never) },
    { key: "tt", icon: "grid-outline", label: "Timetable", sub: "Weekly plan", tint: tints.rose, go: () => navigation.navigate("Profile", { screen: "Timetable" } as never) },
    { key: "call", icon: "call-outline", label: "Contact", sub: "Reach school", tint: tints.mustard, go: () => navigation.navigate("Profile", { screen: "Contact" } as never) },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <Screen refreshing={home.isFetching} onRefresh={() => void home.refetch()}>
        {/* Top zone — school line + greeting (airy, no box) */}
        <FadeInView delay={0}>
          <View style={styles.topRow}>
            <Image source={require("../../assets/icon.png")} style={styles.brandCoin} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.schoolName} numberOfLines={1}>{schoolName}</Text>
              <Text style={styles.portalTag}>Parent Portal</Text>
            </View>
            <View style={styles.sessionPill}>
              <View style={styles.sessionDot} />
              <Text style={styles.sessionText}>{currentSessionLabel()}</Text>
            </View>
          </View>

          <Text style={styles.greetHi} numberOfLines={1}>
            {greetName ? `Namaste, ${greetName} Ji` : "Namaste"}  🙏
          </Text>
          <Text style={styles.greetDate}>{todayLabel()}</Text>
        </FadeInView>

        {/* Crestly brand banner (static for now) */}
        <FadeInView delay={50}>
          <View style={styles.banner}>
            <View style={styles.bannerBlobA} />
            <View style={styles.bannerBlobB} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.bannerKicker}>WELCOME TO</Text>
              <Text style={styles.bannerTitle}>
                Crestly<Text style={styles.bannerDot}>.</Text>
              </Text>
              <Text style={styles.bannerSub}>
                Your child’s school day — attendance, marks, fees & diary, all in one place.
              </Text>
            </View>
            <View style={styles.bannerBadge}>
              <Image source={require("../../assets/icon.png")} style={styles.bannerBadgeImg} />
            </View>
          </View>
        </FadeInView>

        {/* Quick access */}
        <FadeInView delay={90}>
          <Text style={styles.sectionTitle}>Quick access</Text>
          <View style={styles.grid}>
            {ACTIONS.map((a) => (
              <Pressable
                key={a.key}
                onPress={a.go}
                android_ripple={{ color: "rgba(16,13,10,0.06)" }}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: a.tint.base },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name={a.icon} size={20} color={a.tint.deep} />
                </View>
                <Text style={[styles.actionLabel, { color: a.tint.deep }]}>{a.label}</Text>
                <Text style={styles.actionSub}>{a.sub}</Text>
              </Pressable>
            ))}
          </View>
        </FadeInView>

        {/* Children */}
        <Text style={styles.sectionTitle}>
          {freshKids.length === 1 ? "Your child" : "Your children"}
        </Text>
        {home.isLoading && freshKids.length === 0 ? (
          <Skeleton height={150} radius={24} />
        ) : freshKids.length === 0 ? (
          <StateView empty emptyText="No children linked to this number yet." />
        ) : (
          freshKids.map((k, i) => (
            <FadeInView key={k.srNumber} delay={120 + i * 60}>
              <KidCard
                kid={k}
                onPress={() => {
                  void setActiveChildSr(k.srNumber);
                  navigation.navigate("Attendance" as never);
                }}
              />
            </FadeInView>
          ))
        )}
      </Screen>
    </SafeAreaView>
  );
}

function KidCard({ kid, onPress }: { kid: ParentKid; onPress: () => void }) {
  const month = currentMonth();
  const att = useParentAttendance(kid.srNumber, month);
  const exams = useParentExams(kid.srNumber);

  const today = att.data ? STATUS[att.data.todayStatus] ?? STATUS.not_marked! : STATUS.not_marked!;
  const sum = att.data?.monthSummary;
  const overall = exams.data?.overall ?? null;

  return (
    <View style={styles.kidCard}>
      {/* Header */}
      <View style={styles.kidHead}>
        <View style={styles.kidAvi}>
          <Text style={styles.kidAviText}>{initials(kid.studentName)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.kidName} numberOfLines={1}>{kid.studentName}</Text>
          <View style={styles.kidMetaRow}>
            <View style={styles.classPill}>
              <Text style={styles.classPillText}>Class {kid.classLabel}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.todayPill, { backgroundColor: today.bg }]}>
          <Text style={[styles.todayPillText, { color: today.fg }]}>{today.label}</Text>
        </View>
      </View>

      {/* Attendance strip */}
      <View style={[styles.attStrip, { backgroundColor: today.bg }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.attKicker, { color: today.fg }]}>THIS MONTH</Text>
          <Text style={[styles.attPct, { color: today.fg }]}>
            {sum?.percent ?? 0}<Text style={styles.attPctSign}>%</Text>
          </Text>
        </View>
        <View style={styles.counts}>
          <Count label="P" value={sum?.present} tone={tints.mint.deep} />
          <Count label="L" value={sum?.late} tone={colors.warn} />
          <Count label="A" value={sum?.absent} tone={colors.error} />
          <Count label="E" value={sum?.excused} tone={tints.sky.deep} />
        </View>
      </View>

      {/* Academics — only when marks are published */}
      {overall ? (
        <View style={styles.acadRow}>
          <View style={styles.acadIcon}>
            <Ionicons name="ribbon-outline" size={18} color={tints.wheat.deep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.acadGrade}>
              Grade {overall.grade} · {Math.round(overall.weightedPct)}%
            </Text>
            <Text style={styles.acadHint}>Overall weighted score</Text>
          </View>
          <View
            style={[
              styles.resultPill,
              { backgroundColor: overall.result === "PASS" ? tints.mint.deep : colors.error },
            ]}
          >
            <Text style={styles.resultPillText}>{overall.result}</Text>
          </View>
        </View>
      ) : null}

      {/* CTA */}
      <Pressable onPress={onPress} style={styles.kidCta} android_ripple={{ color: "rgba(16,13,10,0.06)" }}>
        <Text style={styles.kidCtaText}>View attendance</Text>
        <Ionicons name="arrow-forward" size={15} color={colors.orangeDeep} />
      </Pressable>
    </View>
  );
}

function Count({ label, value, tone }: { label: string; value?: number; tone: string }) {
  return (
    <View style={styles.countItem}>
      <Text style={[styles.countNum, { color: tone }]}>{value ?? 0}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },

  /* Top row — round logo coin + school line + session */
  topRow: { flexDirection: "row", alignItems: "center", gap: space[3], marginBottom: space[5] },
  brandCoin: { width: 40, height: 40, borderRadius: 20 },
  schoolName: { fontSize: 15, fontWeight: "800", color: colors.ink, letterSpacing: -0.2 },
  portalTag: { fontSize: 11, fontWeight: "700", color: colors.orangeDeep, letterSpacing: 0.2, marginTop: 1 },

  /* Greeting */
  greetHi: { fontSize: 25, fontWeight: "900", color: colors.ink, letterSpacing: -0.7 },
  greetDate: { fontSize: fontSize.bodyS, color: colors.ink60, marginTop: 4, fontWeight: "600" },
  sessionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.orangeTint,
    paddingHorizontal: space[3],
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  sessionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.orange },
  sessionText: { fontSize: fontSize.label, fontWeight: "800", color: colors.orangeDeep, letterSpacing: 0.8 },

  /* Banner — premium dark */
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    backgroundColor: colors.ink,
    borderRadius: 24,
    padding: space[5],
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 5,
  },
  bannerBlobA: {
    position: "absolute", width: 160, height: 160, borderRadius: 80,
    backgroundColor: "rgba(242,92,25,0.20)", right: -44, top: -54,
  },
  bannerBlobB: {
    position: "absolute", width: 96, height: 96, borderRadius: 48,
    backgroundColor: "rgba(242,92,25,0.12)", right: 56, bottom: -44,
  },
  bannerKicker: { fontSize: 10, fontWeight: "900", color: colors.orangeSoft, letterSpacing: 1.8 },
  bannerTitle: { fontSize: 25, fontWeight: "900", color: colors.white, letterSpacing: -0.6, marginTop: 3 },
  bannerDot: { color: colors.orange },
  bannerSub: { fontSize: 12.5, color: "rgba(255,255,255,0.66)", lineHeight: 18, marginTop: 7 },
  bannerBadge: {
    width: 56, height: 56,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerBadgeImg: { width: 40, height: 40, borderRadius: 11 },

  /* Section title */
  sectionTitle: {
    fontSize: fontSize.h2,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.3,
    marginTop: space[2],
    marginBottom: space[3],
  },

  /* Quick access grid */
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space[3] },
  action: {
    width: "48%",
    borderRadius: 18,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  actionIcon: {
    width: 38, height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  actionLabel: { fontSize: fontSize.body, fontWeight: "800" },
  actionSub: { fontSize: fontSize.bodyS, color: colors.ink60, marginTop: 1 },

  /* Kid card */
  kidCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.rule,
    padding: space[4],
    gap: space[3],
    ...shadow.card,
  },
  kidHead: { flexDirection: "row", alignItems: "center", gap: space[3] },
  kidAvi: {
    width: 48, height: 48,
    borderRadius: radius[4],
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  kidAviText: { color: colors.white, fontSize: 17, fontWeight: "800" },
  kidName: { fontSize: fontSize.h1, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  kidMetaRow: { flexDirection: "row", alignItems: "center", gap: space[2], marginTop: 4 },
  classPill: {
    backgroundColor: tints.wheat.base,
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius[2],
  },
  classPillText: { fontSize: 11, fontWeight: "800", color: tints.wheat.deep, letterSpacing: 0.4 },
  kidMeta: { fontSize: fontSize.bodyS, color: colors.ink60, fontWeight: "600" },
  todayPill: { paddingHorizontal: space[3], paddingVertical: 5, borderRadius: radius.pill },
  todayPillText: { fontSize: fontSize.cap, fontWeight: "800", letterSpacing: 0.3 },

  attStrip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: space[4],
    gap: space[3],
  },
  attKicker: { fontSize: fontSize.label, fontWeight: "800", letterSpacing: 1.4 },
  attPct: { fontSize: 30, fontWeight: "900", letterSpacing: -1, marginTop: 2 },
  attPctSign: { fontSize: 18, fontWeight: "800" },
  counts: { flexDirection: "row", gap: space[3] },
  countItem: { alignItems: "center", minWidth: 22 },
  countNum: { fontSize: fontSize.h1, fontWeight: "800" },
  countLabel: { fontSize: 10, fontWeight: "700", color: "rgba(16,13,10,0.45)", marginTop: 1 },

  acadRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
  acadIcon: {
    width: 38, height: 38,
    borderRadius: radius[3],
    backgroundColor: tints.wheat.base,
    alignItems: "center",
    justifyContent: "center",
  },
  acadGrade: { fontSize: fontSize.body, fontWeight: "800", color: colors.ink },
  acadHint: { fontSize: fontSize.bodyS, color: colors.ink60, marginTop: 1 },
  acadEmpty: { flex: 1, fontSize: fontSize.body, color: colors.ink60, fontStyle: "italic" },
  resultPill: { paddingHorizontal: space[3], paddingVertical: 4, borderRadius: radius.pill },
  resultPillText: { color: colors.white, fontSize: fontSize.cap, fontWeight: "800", letterSpacing: 0.4 },

  kidCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.orangeTint,
    borderRadius: 14,
    paddingVertical: 13,
  },
  kidCtaText: { fontSize: fontSize.body, fontWeight: "800", color: colors.orangeDeep },

  footer: {
    marginTop: space[6],
    paddingTop: space[5],
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    fontSize: fontSize.cap,
    color: colors.ink40,
    textAlign: "center",
    lineHeight: 18,
  },
});
