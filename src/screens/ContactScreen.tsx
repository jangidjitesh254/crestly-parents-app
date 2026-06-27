/**
 * Contact School — subject teachers + the school office/admin chain, each
 * with one-tap Call and WhatsApp. A top banner shows the school's office
 * hours and the current time.
 *
 * Two privacy rules from the API drive the buttons (all enforced server-side):
 *  - Office-hours gating: `canCallNow` is true only inside a staffer's call
 *    window. Outside it, Call is hidden and only WhatsApp is offered.
 *  - Masked calling: when `callMasked` is true the personal `phone` comes back
 *    null and the call is placed via the API (ExoPhone bridge); WhatsApp then
 *    routes to the school's number (`schoolWhatsapp`), never a personal one.
 */
import React, { useEffect, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../store/auth";
import { useParentContact, useParentMoreInfo, usePlaceMaskedCall } from "../hooks/queries";
import { getErrorMessage } from "../lib/api";
import { ChildSwitcher } from "../components/ChildSwitcher";
import { Card, FadeInView, SavedToast, Screen, StateView } from "../components/ui";
import { TopBar } from "../components/TopBar";
import { PageHead } from "../components/PageHead";
import { colors, fontSize, radius, space, tints } from "../theme";
import type { MoreStackParams } from "../navigation/types";
import type { ParentContactStaff } from "../types/api";

type Props = NativeStackScreenProps<MoreStackParams, "Contact">;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

/** "HH:MM[:SS]" → "9:00 AM". */
function fmtTime(t: string | null): string | null {
  if (!t) return null;
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const m = Number(mStr ?? 0);
  if (!Number.isFinite(h)) return null;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(Number.isFinite(m) ? m : 0).padStart(2, "0")} ${ampm}`;
}

function openWhatsapp(num: string | null | undefined) {
  if (!num) return;
  const digits = num.replace(/\D/g, "");
  if (digits) Linking.openURL(`https://wa.me/${digits}`).catch(() => undefined);
}

export function ContactScreen({ navigation }: Props) {
  const { kids, activeChildSr } = useAuth();
  const sr = activeChildSr ?? kids[0]?.srNumber ?? 0;
  const contact = useParentContact(sr);
  const more = useParentMoreInfo();
  const placeCall = usePlaceMaskedCall();
  const d = contact.data;

  const [toast, setToast] = useState<string | null>(null);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const clock = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const office = d?.office;
  const open = office?.isOpen ?? false;
  const officeTint = open ? tints.mint : tints.wheat;
  const officeHours = office?.hoursLabel ?? more.data?.officeHours ?? "Mon–Fri 8 AM – 4 PM · Sat till 1 PM";

  function callMasked(s: ParentContactStaff) {
    if (placeCall.isPending) return;
    placeCall.mutate(
      { sr, staffId: s.id },
      {
        onSuccess: (r) => {
          setToast(r.message ?? "Connecting… your phone will ring.");
        },
        onError: (e) => {
          Alert.alert("Couldn't place call", getErrorMessage(e, "Please try again in a moment."));
        },
      },
    );
  }

  return (
    <View style={styles.root}>
      <TopBar showBack onBack={() => navigation.goBack()} />
      <SavedToast visible={!!toast} text={toast ?? ""} onHide={() => setToast(null)} />
      <Screen refreshing={contact.isFetching} onRefresh={() => void contact.refetch()}>
        <PageHead
          crumb="Contact"
          title="Contact School"
          subtitle="Reach the right person — teachers, leadership & office."
        />

        <ChildSwitcher />

        {/* Office-hours banner */}
        <FadeInView delay={0}>
          <View style={styles.office}>
            <View style={[styles.officeIcon, { backgroundColor: officeTint.base }]}>
              <Ionicons name={open ? "time" : "time-outline"} size={18} color={officeTint.deep} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.officeLead}>{office?.label ?? "Office hours"}</Text>
              <Text style={styles.officeSub} numberOfLines={2}>
                {officeHours} · WhatsApp 24×7
              </Text>
            </View>
            <View style={styles.clockPill}>
              <Text style={styles.clockText}>{clock}</Text>
            </View>
          </View>
        </FadeInView>

        {contact.isLoading ? (
          <StateView loading />
        ) : contact.error ? (
          <StateView error={contact.error} onRetry={() => void contact.refetch()} />
        ) : d ? (
          <>
            {d.subjectTeachers.length > 0 ? (
              <FadeInView delay={60}>
                <Text style={styles.sectionLabel}>SUBJECT TEACHERS</Text>
                {d.subjectTeachers.map((s) => (
                  <StaffCard
                    key={s.id}
                    s={s}
                    schoolWhatsapp={d.schoolWhatsapp ?? null}
                    placing={placeCall.isPending}
                    onMaskedCall={() => callMasked(s)}
                  />
                ))}
              </FadeInView>
            ) : null}

            {d.schoolChain.length > 0 ? (
              <FadeInView delay={120}>
                <Text style={styles.sectionLabel}>SCHOOL OFFICE & ADMIN</Text>
                {d.schoolChain.map((s) => (
                  <StaffCard
                    key={s.id}
                    s={s}
                    schoolWhatsapp={d.schoolWhatsapp ?? null}
                    placing={placeCall.isPending}
                    onMaskedCall={() => callMasked(s)}
                  />
                ))}
              </FadeInView>
            ) : null}

            {/* How to reach */}
            <View style={styles.help}>
              <Text style={styles.helpTitle}>How to reach school</Text>
              <Bullet text="Tap Call during a staffer's call window — outside it, use WhatsApp." />
              <Bullet text="Some calls connect through a school line, so numbers stay private." />
              <Bullet text="WhatsApp is open 24×7 — leave a message and staff will read it when free." />
            </View>
          </>
        ) : null}
      </Screen>
    </View>
  );
}

function StaffCard({
  s,
  schoolWhatsapp,
  placing,
  onMaskedCall,
}: {
  s: ParentContactStaff;
  schoolWhatsapp: string | null;
  placing: boolean;
  onMaskedCall: () => void;
}) {
  // Default to allowed when the server didn't send a window (older payloads).
  const canCallNow = s.canCallNow ?? true;
  const masked = s.callMasked ?? false;
  // Is calling possible at all? Masked always has a path; otherwise needs a number.
  const callable = masked || !!s.phone;
  // WhatsApp routes to the school number when the staffer is masked.
  const wa = masked ? schoolWhatsapp : s.whatsapp;

  function tel() {
    if (s.phone) Linking.openURL(`tel:${s.phone}`).catch(() => undefined);
  }
  function onCall() {
    if (masked) onMaskedCall();
    else tel();
  }

  const sub =
    s.subjects && s.subjects.length > 0
      ? `${s.designation ? s.designation + " · " : ""}${s.subjects.join(", ")}`
      : s.designation ?? "";

  const showCall = callable && canCallNow;

  return (
    <Card style={styles.staffCard}>
      <View style={styles.staffHead}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(s.name)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.roleLabel}>{s.roleLabel.toUpperCase()}</Text>
          <Text style={styles.name} numberOfLines={1}>{s.name}</Text>
          {sub ? <Text style={styles.designation} numberOfLines={2}>{sub}</Text> : null}
        </View>
        {masked ? (
          <View style={styles.maskedTag}>
            <Ionicons name="shield-checkmark" size={11} color={tints.sky.deep} />
            <Text style={styles.maskedTagText}>Private</Text>
          </View>
        ) : null}
      </View>

      {/* Call-window strip — green when callable now, muted otherwise. */}
      {s.callStart && s.callEnd ? (
        <View style={[styles.availRow, !canCallNow && styles.availRowOff]}>
          <View style={[styles.availDot, !canCallNow && styles.availDotOff]} />
          <Text style={[styles.availText, !canCallNow && styles.availTextOff]} numberOfLines={1}>
            {canCallNow ? "Available now · " : "Call window "}
            {fmtTime(s.callStart)} – {fmtTime(s.callEnd)}
          </Text>
        </View>
      ) : null}

      {(showCall || wa) ? (
        <View style={styles.actionRow}>
          {showCall ? (
            <Pressable
              onPress={onCall}
              disabled={placing && masked}
              android_ripple={{ color: "rgba(255,255,255,0.14)" }}
              style={({ pressed }) => [
                styles.callBtn,
                (pressed || (placing && masked)) && { opacity: 0.85 },
              ]}
            >
              <Ionicons name={masked ? "shield-half" : "call"} size={16} color={colors.cream} />
              <Text style={styles.callText}>{masked ? "Call privately" : "Call"}</Text>
            </Pressable>
          ) : null}
          {wa ? (
            <Pressable
              onPress={() => openWhatsapp(wa)}
              android_ripple={{ color: "rgba(255,255,255,0.14)" }}
              style={({ pressed }) => [styles.waBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="logo-whatsapp" size={16} color={colors.white} />
              <Text style={styles.waText}>WhatsApp</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!showCall && callable ? (
        <Text style={styles.offHint}>
          Calling opens during the call window — WhatsApp anytime.
        </Text>
      ) : null}
    </Card>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bullet}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },

  /* Office banner */
  office: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.rule,
    padding: space[3],
  },
  officeIcon: {
    width: 38,
    height: 38,
    borderRadius: radius[3],
    backgroundColor: tints.peach.base,
    alignItems: "center",
    justifyContent: "center",
  },
  officeLead: { fontSize: fontSize.body, fontWeight: "800", color: colors.ink },
  officeSub: { fontSize: fontSize.bodyS, color: colors.ink60, marginTop: 1 },
  clockPill: {
    backgroundColor: colors.cream,
    paddingHorizontal: space[3],
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  clockText: { fontSize: fontSize.bodyS, fontWeight: "800", color: colors.ink },

  sectionLabel: {
    fontSize: fontSize.label,
    fontWeight: "800",
    color: colors.ink40,
    letterSpacing: 1.6,
    marginBottom: space[2],
    marginTop: space[2],
  },

  /* Staff card */
  staffCard: { gap: space[3], marginBottom: space[2] },
  staffHead: { flexDirection: "row", alignItems: "center", gap: space[3] },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius[3],
    backgroundColor: colors.orangeTint,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: fontSize.body, fontWeight: "800", color: colors.orangeDeep },
  roleLabel: { fontSize: fontSize.label, fontWeight: "800", color: colors.orangeDeep, letterSpacing: 1.2 },
  name: { fontSize: fontSize.bodyL, fontWeight: "800", color: colors.ink, marginTop: 2 },
  designation: { fontSize: fontSize.bodyS, color: colors.ink60, marginTop: 2 },

  maskedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    alignSelf: "flex-start",
    backgroundColor: tints.sky.base,
    paddingHorizontal: space[2],
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  maskedTagText: { fontSize: 10, fontWeight: "800", color: tints.sky.deep, letterSpacing: 0.3 },

  availRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: tints.mint.base,
    paddingHorizontal: space[3],
    paddingVertical: 6,
    borderRadius: radius[2],
  },
  availRowOff: { backgroundColor: colors.cream },
  availDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: tints.mint.deep },
  availDotOff: { backgroundColor: colors.ink40 },
  availText: { fontSize: fontSize.bodyS, color: tints.mint.deep, fontWeight: "700" },
  availTextOff: { color: colors.ink60 },

  actionRow: { flexDirection: "row", gap: space[2] },
  callBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.ink,
    borderRadius: radius[3],
    paddingVertical: space[3],
  },
  callText: { color: colors.cream, fontSize: fontSize.body, fontWeight: "800" },
  waBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#25D366",
    borderRadius: radius[3],
    paddingVertical: space[3],
  },
  waText: { color: colors.white, fontSize: fontSize.body, fontWeight: "800" },
  offHint: { fontSize: fontSize.bodyS, color: colors.ink40, fontStyle: "italic" },

  /* How to reach */
  help: {
    backgroundColor: colors.cream,
    borderRadius: 20,
    padding: space[4],
    gap: space[2],
    marginTop: space[3],
  },
  helpTitle: { fontSize: fontSize.body, fontWeight: "800", color: colors.ink, marginBottom: 2 },
  bullet: { flexDirection: "row", alignItems: "flex-start", gap: space[2] },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.orange,
    marginTop: 7,
  },
  bulletText: { flex: 1, fontSize: fontSize.bodyS, color: colors.ink80, lineHeight: 19 },
});
