/**
 * Parent home — a per-child dashboard.
 *
 * One card per child (siblings stack). Each card composes the child's
 * snapshot from the existing read-only endpoints:
 *   - attendance MTD + today's status   (/parent/attendance)
 *   - academics published-state         (/parent/exams)
 * plus quick tiles into Diary & Timetable. Identity (name, class, SR, age,
 * gender, DOB), the family contact block and the transport block all come
 * from the enriched /parent/* endpoints.
 */
import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { MaterialTopTabScreenProps } from "@react-navigation/material-top-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../store/auth";
import {
  useParentHome, useParentAttendance, useParentExams, useParentTransport,
} from "../hooks/queries";
import { FadeInView, Screen, Skeleton, StateView } from "../components/ui";
import { TopBar } from "../components/TopBar";
import { ageFromDob, currentSessionLabel, formatDob } from "../lib/dates";
import { rupees } from "../lib/money";
import { colors, fontSize, radius, space, tints } from "../theme";
import type { HomeStackParams, MainTabParams } from "../navigation/types";
import type { ParentKid } from "../types/api";

type Props = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParams, "HomeHome">,
  MaterialTopTabScreenProps<MainTabParams>
>;

/* Attendance status → tint pairing for the "today" pill. */
const STATUS: Record<string, { bg: string; fg: string; label: string }> = {
  present: { bg: tints.mint.base, fg: tints.mint.deep, label: "PRESENT" },
  absent: { bg: colors.errorSoft, fg: colors.error, label: "ABSENT" },
  late: { bg: colors.warnSoft, fg: colors.warn, label: "LATE" },
  excused: { bg: tints.sky.base, fg: tints.sky.deep, label: "EXCUSED" },
  not_marked: { bg: colors.cream, fg: colors.ink40, label: "NOT MARKED" },
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

function monthYearUpper(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, 1))
    .toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })
    .toUpperCase();
}

export function HomeScreen({ navigation }: Props) {
  const { kids, parentLabel, setActiveChildSr } = useAuth();
  const home = useParentHome();

  const freshKids = home.data?.kids ?? kids;

  // The parent's own name (resolved server-side from the matched contact
  // number). Until the backend returns it, fall back to a generic greeting.
  const parentName = home.data?.parentName?.trim() || null;
  const relationship = home.data?.relationship?.trim() || null;
  const greetingTitle = parentName ?? (freshKids.length === 1 ? "Your child" : "Your children");
  const greetingMeta = parentName
    ? [relationship, `${freshKids.length} ${freshKids.length === 1 ? "child" : "children"}`, parentLabel]
        .filter(Boolean)
        .join(" · ")
    : parentLabel
      ? `${freshKids.length} ${freshKids.length === 1 ? "child" : "children"} · ${parentLabel}`
      : null;

  function openInMore(kid: ParentKid, screen: "Diary" | "Timetable") {
    void setActiveChildSr(kid.srNumber);
    navigation.navigate("Profile", { screen } as never);
  }

  return (
    <View style={styles.root}>
      <TopBar />
      <Screen refreshing={home.isFetching} onRefresh={() => void home.refetch()}>
        {/* Welcome */}
        <FadeInView delay={0}>
          <View style={styles.welcome}>
            <Text style={styles.namaste}>NAMASTE  🙏</Text>
            <Text style={styles.welcomeTitle} numberOfLines={2}>
              {greetingTitle}
              <Text style={styles.brandDot}>.</Text>
            </Text>
            {greetingMeta ? (
              <Text style={styles.welcomeMeta} numberOfLines={1}>
                {greetingMeta}
              </Text>
            ) : null}
            <View style={styles.sessionPill}>
              <View style={styles.sessionDot} />
              <Text style={styles.sessionText}>SESSION {currentSessionLabel()}</Text>
            </View>
          </View>
        </FadeInView>

        {home.isLoading && freshKids.length === 0 ? (
          <View style={{ gap: space[3] }}>
            <Skeleton height={260} radius={18} />
            <Skeleton height={260} radius={18} />
          </View>
        ) : freshKids.length === 0 ? (
          <StateView empty emptyText="No children linked to this number yet." />
        ) : (
          freshKids.map((k, i) => (
            <FadeInView key={k.srNumber} delay={60 + i * 60}>
              <KidCard
                kid={k}
                relationship={relationship}
                onOpenDiary={() => openInMore(k, "Diary")}
                onOpenTimetable={() => openInMore(k, "Timetable")}
              />
            </FadeInView>
          ))
        )}

        <Text style={styles.footer}>
          Powered by Shadowbiz Startups Developer{"\n"}
          Built to support the school ecosystem.
        </Text>
      </Screen>
    </View>
  );
}

function KidCard({
  kid,
  relationship,
  onOpenDiary,
  onOpenTimetable,
}: {
  kid: ParentKid;
  relationship: string | null;
  onOpenDiary: () => void;
  onOpenTimetable: () => void;
}) {
  const month = currentMonth();
  const att = useParentAttendance(kid.srNumber, month);
  const exams = useParentExams(kid.srNumber);

  const today = att.data ? STATUS[att.data.todayStatus] ?? STATUS.not_marked! : STATUS.not_marked!;
  const sum = att.data?.monthSummary;
  const age = ageFromDob(kid.dob);
  const sessionCode = exams.data?.sessionCode ?? currentSessionLabel();
  const overall = exams.data?.overall ?? null;

  return (
    <View style={styles.card}>
      {/* Identity */}
      <View style={styles.kidHead}>
        <View style={styles.kidAvi}>
          <Text style={styles.kidAviText}>{initials(kid.studentName)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.kidName} numberOfLines={1}>{kid.studentName}</Text>
          <View style={styles.kidMetaRow}>
            <View style={styles.classPill}>
              <Text style={styles.classPillText}>{kid.classLabel}</Text>
            </View>
            <Text style={styles.kidMeta}>SR {kid.srNumber}</Text>
            {age != null ? (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.kidMeta}>{age} yrs</Text>
              </>
            ) : null}
            {kid.gender ? (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.kidMeta}>{kid.gender}</Text>
              </>
            ) : null}
            {kid.isHostel ? (
              <>
                <View style={styles.metaDot} />
                <View style={styles.hostelTag}>
                  <Ionicons name="bed-outline" size={10} color={tints.wheat.deep} />
                  <Text style={styles.hostelText}>HOSTEL</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </View>

      {/* Attendance */}
      <View style={styles.section}>
        <View style={styles.sectionTop}>
          <Text style={styles.sectionLabel}>ATTENDANCE · {monthYearUpper(month)}</Text>
          <Text style={styles.mtd}>MTD</Text>
        </View>
        <View style={styles.attRow}>
          <View style={[styles.todayPill, { backgroundColor: today.bg }]}>
            <Text style={[styles.todayPillText, { color: today.fg }]}>{today.label}</Text>
          </View>
          <Text style={styles.todayWord}>Today</Text>
          <View style={{ flex: 1 }} />
          <View style={styles.counts}>
            <Count label="P" value={sum?.present} tone={tints.mint.deep} />
            <Count label="L" value={sum?.late} tone={colors.warn} />
            <Count label="A" value={sum?.absent} tone={colors.error} />
            <Count label="E" value={sum?.excused} tone={tints.sky.deep} />
          </View>
        </View>
      </View>

      {/* Quick tiles */}
      <Tile
        icon="book-outline"
        tint={tints.mint}
        title="Diary & Homework"
        sub="What was taught + homework"
        cta="Open"
        onPress={onOpenDiary}
      />
      <Tile
        icon="grid-outline"
        tint={tints.peach}
        title="Class Timetable"
        sub={`Weekly schedule · ${kid.classLabel}`}
        cta="View"
        onPress={onOpenTimetable}
      />

      {/* Academics */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ACADEMICS · SESSION {sessionCode}</Text>
        {overall ? (
          <View style={styles.acadRow}>
            <Text style={styles.acadPct}>
              {Math.round(overall.weightedPct)}<Text style={styles.acadPctSign}>%</Text>
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.acadGrade}>Grade {overall.grade}</Text>
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
        ) : (
          <Text style={styles.acadEmpty}>Marks not yet published for this session.</Text>
        )}
      </View>

      {/* Family */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>FAMILY</Text>
        {kid.fatherName ? (
          <FamilyRow label="Father" name={kid.fatherName} phone={kid.fatherPhone} you={relationship === "Father"} />
        ) : null}
        {kid.motherName ? (
          <FamilyRow label="Mother" name={kid.motherName} phone={kid.motherPhone} you={relationship === "Mother"} />
        ) : null}
        {kid.guardianName ? (
          <FamilyRow label="Guardian" name={kid.guardianName} phone={kid.guardianPhone} you={relationship === "Guardian"} />
        ) : null}
        <View style={styles.kvRow}>
          <Text style={styles.kvKey}>DOB</Text>
          <Text style={styles.kvVal}>{formatDob(kid.dob)}</Text>
        </View>
      </View>

      {/* Transport */}
      <TransportBlock sr={kid.srNumber} />
    </View>
  );
}

function FamilyRow({
  label,
  name,
  phone,
  you,
}: {
  label: string;
  name: string;
  phone: string | null;
  you: boolean;
}) {
  return (
    <View style={styles.famRow}>
      <Text style={styles.famLabel}>{label.toUpperCase()}</Text>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.famName} numberOfLines={1}>
          {name}
          {you ? <Text style={styles.youTag}>  · YOU</Text> : null}
        </Text>
        {phone ? (
          <Pressable onPress={() => Linking.openURL(`tel:${phone}`).catch(() => undefined)} hitSlop={6}>
            <Text style={styles.famPhone}>{phone}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function TransportBlock({ sr }: { sr: number }) {
  const t = useParentTransport(sr);
  const d = t.data;
  if (!d) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>TRANSPORT</Text>
      {d.usesTransport ? (
        <>
          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>Pickup</Text>
            <Text style={styles.kvVal} numberOfLines={1}>{d.pickupPointName ?? "—"}</Text>
          </View>
          {d.routeSlab || d.routeRange ? (
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>Route</Text>
              <Text style={styles.kvVal}>{[d.routeSlab, d.routeRange].filter(Boolean).join(" · ")}</Text>
            </View>
          ) : null}
          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>Transport fee</Text>
            <Text style={styles.kvVal}>{rupees(d.transportFee)}/yr</Text>
          </View>
        </>
      ) : (
        <Text style={styles.acadEmpty}>Day scholar — no school transport.</Text>
      )}
    </View>
  );
}

function Count({ label, value, tone }: { label: string; value?: number; tone: string }) {
  return (
    <Text style={styles.count}>
      <Text style={[styles.countLetter, { color: tone }]}>{label}</Text>
      <Text style={styles.countNum}>{value ?? 0}</Text>
    </Text>
  );
}

function Tile({
  icon,
  tint,
  title,
  sub,
  cta,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: { base: string; deep: string };
  title: string;
  sub: string;
  cta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(16,13,10,0.06)" }}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: tint.base },
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={[styles.tileIcon, { backgroundColor: "rgba(255,255,255,0.55)" }]}>
        <Ionicons name={icon} size={20} color={tint.deep} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.tileTitle, { color: tint.deep }]} numberOfLines={1}>{title}</Text>
        <Text style={styles.tileSub} numberOfLines={1}>{sub}</Text>
      </View>
      <View style={styles.tileCta}>
        <Text style={styles.tileCtaText}>{cta}</Text>
        <Ionicons name="chevron-forward" size={13} color={colors.cream} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.creamSoft },

  /* Welcome */
  welcome: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.rule,
    padding: space[5],
    gap: 4,
  },
  namaste: {
    fontSize: fontSize.label,
    fontWeight: "800",
    color: colors.orangeDeep,
    letterSpacing: 1.6,
  },
  welcomeTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  brandDot: { color: colors.orange },
  welcomeMeta: { fontSize: fontSize.bodyS, color: colors.ink60, marginTop: 2 },
  sessionPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: space[3],
    backgroundColor: colors.orangeTint,
    paddingHorizontal: space[3],
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  sessionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.orange },
  sessionText: {
    fontSize: fontSize.label,
    fontWeight: "800",
    color: colors.orangeDeep,
    letterSpacing: 1.2,
  },

  /* Kid card */
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.rule,
    padding: space[4],
    gap: space[4],
  },
  kidHead: { flexDirection: "row", alignItems: "center", gap: space[3] },
  kidAvi: {
    width: 52,
    height: 52,
    borderRadius: radius[4],
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  kidAviText: { color: colors.white, fontSize: 18, fontWeight: "800" },
  kidName: { fontSize: fontSize.h1, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  kidMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    marginTop: 5,
    flexWrap: "wrap",
  },
  classPill: {
    backgroundColor: tints.wheat.base,
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius[2],
  },
  classPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: tints.wheat.deep,
    letterSpacing: 0.4,
  },
  kidMeta: { fontSize: fontSize.bodyS, color: colors.ink60, fontWeight: "600" },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.ink20 },
  hostelTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: tints.wheat.base,
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  hostelText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.8, color: tints.wheat.deep },

  /* Sections */
  section: {
    borderTopWidth: 1,
    borderTopColor: colors.ruleSoft,
    paddingTop: space[3],
    gap: space[2],
  },
  sectionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionLabel: {
    fontSize: fontSize.label,
    fontWeight: "800",
    color: colors.ink40,
    letterSpacing: 1.4,
  },
  mtd: { fontSize: 9, fontWeight: "800", color: colors.ink20, letterSpacing: 1 },

  attRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  todayPill: {
    paddingHorizontal: space[2],
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  todayPillText: { fontSize: fontSize.cap, fontWeight: "800", letterSpacing: 0.4 },
  todayWord: { fontSize: fontSize.body, fontWeight: "700", color: colors.ink },
  counts: { flexDirection: "row", gap: space[2] },
  count: { fontSize: fontSize.bodyS },
  countLetter: { fontWeight: "800" },
  countNum: { fontWeight: "700", color: colors.ink60 },

  /* Tiles */
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    borderRadius: 20,
    padding: space[3],
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tileTitle: { fontSize: fontSize.body, fontWeight: "800" },
  tileSub: { fontSize: fontSize.bodyS, color: colors.ink60, marginTop: 1 },
  tileCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.ink,
    paddingLeft: space[3],
    paddingRight: space[2],
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  tileCtaText: { color: colors.cream, fontSize: fontSize.bodyS, fontWeight: "800" },

  /* Academics */
  acadRow: { flexDirection: "row", alignItems: "center", gap: space[3] },
  acadPct: { fontSize: 30, fontWeight: "800", color: colors.ink, letterSpacing: -1 },
  acadPctSign: { fontSize: 18, color: colors.ink60, fontWeight: "700" },
  acadGrade: { fontSize: fontSize.body, fontWeight: "800", color: colors.ink },
  acadHint: { fontSize: fontSize.bodyS, color: colors.ink60, marginTop: 1 },
  resultPill: { paddingHorizontal: space[3], paddingVertical: 4, borderRadius: radius.pill },
  resultPillText: { color: colors.white, fontSize: fontSize.cap, fontWeight: "800", letterSpacing: 0.4 },
  acadEmpty: { fontSize: fontSize.body, color: colors.ink60, fontStyle: "italic" },

  /* DOB */
  /* Key/value rows (DOB, transport) */
  kvRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space[3],
  },
  kvKey: { fontSize: fontSize.bodyS, color: colors.ink60, fontWeight: "600" },
  kvVal: { fontSize: fontSize.body, fontWeight: "700", color: colors.ink, flexShrink: 1, textAlign: "right" },

  /* Family rows */
  famRow: { flexDirection: "row", alignItems: "flex-start", gap: space[3] },
  famLabel: {
    fontSize: fontSize.label,
    fontWeight: "800",
    color: colors.ink40,
    letterSpacing: 1,
    width: 64,
    paddingTop: 2,
  },
  famName: { fontSize: fontSize.body, fontWeight: "700", color: colors.ink },
  youTag: { fontSize: fontSize.bodyS, fontWeight: "800", color: colors.orangeDeep },
  famPhone: { fontSize: fontSize.bodyS, color: tints.sky.deep, fontWeight: "600", marginTop: 1 },

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
