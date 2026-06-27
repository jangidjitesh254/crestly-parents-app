/**
 * Profile tab — a dark identity hero (centred avatar + quick-action tiles),
 * collapsible per-child detail cards, a menu list and sign-out.
 */
import React, { useState } from "react";
import {
  Alert, Image, LayoutAnimation, Linking, Platform, Pressable,
  StyleSheet, Text, UIManager, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const EXPAND_ANIM = LayoutAnimation.create(240, "easeInEaseOut", "opacity");
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../store/auth";
import { useParentMoreInfo, useParentHome, useParentTransport } from "../../hooks/queries";
import { FadeInView, Screen } from "../../components/ui";
import { appVersion, openAppUpdate } from "../../lib/appUpdate";
import { ageFromDob, formatDob } from "../../lib/dates";
import { colors, fontSize, radius, shadow, space, tints } from "../../theme";
import type { MoreStackParams } from "../../navigation/types";
import type { ParentKid } from "../../types/api";

type Props = NativeStackScreenProps<MoreStackParams, "MoreHome">;
type Tint = { base: string; deep: string };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function MoreScreen({ navigation }: Props) {
  const { kids, parentLabel, signOut } = useAuth();
  const more = useParentMoreInfo();
  const home = useParentHome();
  const relationship = home.data?.relationship?.trim() || null;

  const phone = (parentLabel ?? "").split("·")[0]?.trim() || "Parent account";
  const realName = home.data?.parentName?.trim() || null;
  const parentName = realName ?? "Parent";
  const subLine = [phone, relationship].filter(Boolean).join("  ·  ");

  // Which student cards are expanded (all collapsed by default).
  const [open, setOpen] = useState<Set<number>>(() => new Set<number>());
  function toggle(sr: number) {
    LayoutAnimation.configureNext(EXPAND_ANIM);
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(sr) ? next.delete(sr) : next.add(sr);
      return next;
    });
  }
  function toggleAll() {
    LayoutAnimation.configureNext(EXPAND_ANIM);
    setOpen((prev) =>
      prev.size >= kids.length ? new Set() : new Set(kids.map((k) => k.srNumber)),
    );
  }

  function confirmSignOut() {
    Alert.alert("Sign out?", "End this session on this device?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  }
  function openNotifications() {
    Alert.alert("Notifications", "You’re all caught up. School notices and alerts will appear here.");
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <Screen refreshing={more.isFetching} onRefresh={() => void more.refetch()}>
        {/* Hero */}
        <FadeInView delay={0}>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>My Profile</Text>

            <View style={styles.heroCenter}>
              <View style={styles.avi}>
                <Image source={require("../../../assets/avatar-dummy.png")} style={styles.aviImg} />
                <View style={styles.aviBadge}>
                  <Ionicons name="checkmark" size={12} color={colors.white} />
                </View>
              </View>
              <Text style={styles.name} numberOfLines={1}>{parentName}</Text>
              <Text style={styles.handle} numberOfLines={1}>{subLine}</Text>
            </View>

            <View style={styles.tilesRow}>
              <HeroTile icon="notifications-outline" label="Notifications" onPress={openNotifications} />
              <HeroTile icon="people-outline" label="Details" onPress={toggleAll} />
              <HeroTile icon="call-outline" label="Contact" onPress={() => navigation.navigate("Contact")} />
            </View>
          </View>
        </FadeInView>

        {/* Student details (collapsible) */}
        {kids.map((k, i) => (
          <FadeInView key={k.srNumber} delay={60 + i * 50}>
            <ChildDetailCard
              kid={k}
              relationship={relationship}
              open={open.has(k.srNumber)}
              onToggle={() => toggle(k.srNumber)}
            />
          </FadeInView>
        ))}

        {/* Menu */}
        <FadeInView delay={160}>
          <View style={styles.menu}>
            <MenuRow
              icon="calendar-outline"
              label="School Calendar"
              sub="Events, holidays & exams"
              onPress={() => navigation.navigate("Calendar")}
            />
            <MenuRow
              icon="document-text-outline"
              label="Online Tests"
              sub="Attempt tests & see scores"
              onPress={() => navigation.navigate("Tests")}
            />
            <MenuRow
              icon="book-outline"
              label="Diary & Homework"
              sub="What was taught + homework"
              onPress={() => navigation.navigate("Diary")}
            />
            <MenuRow
              icon="grid-outline"
              label="Class Timetable"
              sub="Weekly period-wise schedule"
              onPress={() => navigation.navigate("Timetable")}
            />
            {more.data?.address ? (
              <MenuRow
                icon="location-outline"
                label={more.data.schoolName}
                sub={more.data.address}
                onPress={
                  more.data.mapsLink
                    ? () => Linking.openURL(more.data!.mapsLink!).catch(() => undefined)
                    : undefined
                }
              />
            ) : null}
            <MenuRow
              icon="cloud-download-outline"
              label="Update app"
              sub={`Get the latest version · v${appVersion()}`}
              onPress={() => void openAppUpdate()}
            />
            <MenuRow
              icon="log-out-outline"
              label="Log out"
              sub="End this session on this device"
              danger
              onPress={confirmSignOut}
              last
            />
          </View>
        </FadeInView>
      </Screen>
    </SafeAreaView>
  );
}

function HeroTile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(255,255,255,0.12)" }}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.85 }]}
    >
      <Ionicons name={icon} size={20} color={colors.white} />
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

function ChildDetailCard({
  kid,
  relationship,
  open,
  onToggle,
}: {
  kid: ParentKid;
  relationship: string | null;
  open: boolean;
  onToggle: () => void;
}) {
  const t = useParentTransport(kid.srNumber);
  const age = ageFromDob(kid.dob);
  const d = t.data;
  const transportVal = kid.isHostel
    ? "Hosteller"
    : !d
      ? "—"
      : d.usesTransport
        ? (d.pickupPointName ?? "School bus")
        : "Day scholar";

  return (
    <View style={styles.detailCard}>
      <Pressable
        style={styles.detailHead}
        onPress={onToggle}
        android_ripple={{ color: "rgba(16,13,10,0.06)" }}
      >
        <View style={styles.detailAvi}>
          <Text style={styles.detailAviText}>{initials(kid.studentName)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.detailName} numberOfLines={1}>{kid.studentName}</Text>
          <Text style={styles.detailSub}>Class {kid.classLabel} · SR {kid.srNumber}</Text>
        </View>
        <View style={styles.chev}>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.ink60} />
        </View>
      </Pressable>

      {open ? (
        <View style={styles.detailBody}>
          <View style={styles.factGrid}>
            <Fact icon="calendar-outline" tint={tints.peach} label="Date of birth" value={formatDob(kid.dob)} />
            <Fact icon="hourglass-outline" tint={tints.sky} label="Age" value={age != null ? `${age} yrs` : "—"} />
            <Fact icon="male-female-outline" tint={tints.mint} label="Gender" value={kid.gender ?? "—"} />
            <Fact icon="bus-outline" tint={tints.mustard} label="Transport" value={transportVal} />
          </View>

          {kid.fatherName || kid.motherName || kid.guardianName ? (
            <>
              <Text style={styles.detailLabel}>CONTACTS</Text>
              <View style={{ gap: space[2] }}>
                {kid.fatherName ? (
                  <ContactRow role="Father" tint={tints.mint} name={kid.fatherName} phone={kid.fatherPhone} you={relationship === "Father"} />
                ) : null}
                {kid.motherName ? (
                  <ContactRow role="Mother" tint={tints.rose} name={kid.motherName} phone={kid.motherPhone} you={relationship === "Mother"} />
                ) : null}
                {kid.guardianName ? (
                  <ContactRow role="Guardian" tint={tints.wheat} name={kid.guardianName} phone={kid.guardianPhone} you={relationship === "Guardian"} />
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Fact({
  icon,
  tint,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: Tint;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.fact}>
      <View style={[styles.factIcon, { backgroundColor: tint.base }]}>
        <Ionicons name={icon} size={15} color={tint.deep} />
      </View>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ContactRow({
  role,
  tint,
  name,
  phone,
  you,
}: {
  role: string;
  tint: Tint;
  name: string;
  phone: string | null;
  you: boolean;
}) {
  const tel = phone
    ? () => Linking.openURL(`tel:${phone}`).catch(() => undefined)
    : undefined;
  return (
    <Pressable
      onPress={tel}
      android_ripple={phone ? { color: "rgba(16,13,10,0.05)" } : undefined}
      style={styles.contactRow}
      accessibilityLabel={phone ? `Call ${role}` : undefined}
    >
      <View style={[styles.contactAvi, { backgroundColor: tint.base }]}>
        <Text style={[styles.contactAviText, { color: tint.deep }]}>{initials(name)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.contactName} numberOfLines={1}>
          {name}
          {you ? <Text style={styles.youTag}> · YOU</Text> : null}
        </Text>
        <Text style={styles.contactRole} numberOfLines={1}>
          {role}{phone ? `  ·  ${phone}` : ""}
        </Text>
      </View>
      {phone ? <Ionicons name="call-outline" size={16} color={colors.ink40} /> : null}
    </Pressable>
  );
}

function MenuRow({
  icon,
  label,
  sub,
  onPress,
  danger,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const fg = danger ? colors.error : colors.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      android_ripple={onPress ? { color: "rgba(16,13,10,0.06)" } : undefined}
      style={({ pressed }) => [
        styles.mRow,
        !last && styles.mBorder,
        pressed && onPress && { backgroundColor: colors.creamSoft },
      ]}
    >
      <View style={[styles.mIcon, danger && { backgroundColor: colors.errorSoft }]}>
        <Ionicons name={icon} size={18} color={danger ? colors.error : colors.ink80} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.mLabel, { color: fg }]} numberOfLines={1}>{label}</Text>
        {sub ? <Text style={styles.mSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color={danger ? colors.error : colors.ink40} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },

  /* Hero — dark identity card */
  hero: {
    backgroundColor: colors.ink,
    borderRadius: 28,
    padding: space[5],
    overflow: "hidden",
  },
  heroTitle: { textAlign: "center", color: colors.white, fontSize: fontSize.bodyL, fontWeight: "800", letterSpacing: -0.2 },
  heroCenter: { alignItems: "center", marginTop: space[4] },
  avi: {
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: "#E7DFD2",
    alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "rgba(255,255,255,0.16)",
  },
  aviImg: { width: 86, height: 86, borderRadius: 43 },
  aviBadge: {
    position: "absolute", right: 2, bottom: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: tints.mint.deep,
    borderWidth: 3, borderColor: colors.ink,
    alignItems: "center", justifyContent: "center",
  },
  name: { fontSize: fontSize.displayS, fontWeight: "800", color: colors.white, marginTop: space[3], letterSpacing: -0.3 },
  handle: { fontSize: fontSize.bodyS, color: "rgba(255,255,255,0.6)", marginTop: 4, fontWeight: "600" },

  tilesRow: { flexDirection: "row", gap: space[3], marginTop: space[5] },
  tile: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 16,
    paddingVertical: space[3],
    alignItems: "center",
    gap: 7,
  },
  tileLabel: { color: "rgba(255,255,255,0.92)", fontSize: 11, fontWeight: "700" },

  /* Student detail card */
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.rule,
    overflow: "hidden",
    ...shadow.card,
  },
  detailHead: { flexDirection: "row", alignItems: "center", gap: space[3], padding: space[4] },
  detailAvi: {
    width: 48, height: 48, borderRadius: radius[4],
    backgroundColor: colors.orange,
    alignItems: "center", justifyContent: "center",
  },
  detailAviText: { color: colors.white, fontSize: 18, fontWeight: "800" },
  detailName: { fontSize: fontSize.h1, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  detailSub: { fontSize: fontSize.bodyS, color: colors.ink60, marginTop: 2, fontWeight: "600" },
  chev: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.creamSoft,
    alignItems: "center", justifyContent: "center",
  },

  detailBody: {
    paddingHorizontal: space[4],
    paddingBottom: space[4],
    gap: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.ruleSoft,
    paddingTop: space[4],
  },
  factGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: space[2] },
  fact: {
    width: "48.5%",
    backgroundColor: "#F4F3F0",
    borderRadius: 16,
    padding: space[4],
    gap: 9,
  },
  factIcon: {
    width: 34, height: 34, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  factLabel: { fontSize: 9.5, fontWeight: "800", color: colors.ink40, letterSpacing: 0.8, textTransform: "uppercase" },
  factValue: { fontSize: 16, fontWeight: "800", color: colors.ink, letterSpacing: -0.2 },

  detailLabel: { fontSize: fontSize.label, fontWeight: "800", color: colors.ink40, letterSpacing: 1.2, marginTop: space[1] },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    backgroundColor: "#F4F3F0",
    borderRadius: 14,
    paddingVertical: space[2],
    paddingHorizontal: space[3],
  },
  contactAvi: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
  },
  contactAviText: { fontSize: 13, fontWeight: "800" },
  contactName: { fontSize: fontSize.body, fontWeight: "800", color: colors.ink },
  contactRole: { fontSize: fontSize.bodyS, color: colors.ink60, marginTop: 1, fontWeight: "600" },
  youTag: { fontSize: fontSize.cap, fontWeight: "800", color: colors.orangeDeep },

  /* Menu */
  menu: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.rule,
    overflow: "hidden",
    ...shadow.card,
  },
  mRow: { flexDirection: "row", alignItems: "center", gap: space[3], padding: space[4] },
  mBorder: { borderBottomWidth: 1, borderBottomColor: colors.ruleSoft },
  mIcon: {
    width: 38, height: 38, borderRadius: radius[4],
    backgroundColor: colors.creamSoft,
    alignItems: "center", justifyContent: "center",
  },
  mLabel: { fontSize: fontSize.body, fontWeight: "800" },
  mSub: { fontSize: fontSize.bodyS, color: colors.ink60, marginTop: 2 },
});
