/**
 * More tab — Contact at top, then Academics (Diary + Timetable), School
 * info, and Account (sign-out). Mirrors apps/web/src/pages/parent/ParentMorePage
 * with the addition of a Contact row, since the mobile app moves Contact
 * out of the bottom-tab bar to keep it to five tabs.
 */
import React from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../../store/auth";
import { useParentMoreInfo } from "../../hooks/queries";
import { FadeInView, Screen, SectionHeader } from "../../components/ui";
import { TopBar } from "../../components/TopBar";
import { PageHead } from "../../components/PageHead";
import { colors, fontSize, radius, space, tints } from "../../theme";
import type { MoreStackParams } from "../../navigation/types";

type Props = NativeStackScreenProps<MoreStackParams, "MoreHome">;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function MoreScreen({ navigation }: Props) {
  const { kids, parentLabel, signOut } = useAuth();
  const more = useParentMoreInfo();
  const firstKid = kids[0];

  function confirmSignOut() {
    Alert.alert("Sign out?", "End this session on this device?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() },
    ]);
  }

  return (
    <View style={styles.root}>
      <TopBar />
      <Screen refreshing={more.isFetching} onRefresh={() => void more.refetch()}>
        <PageHead crumb="Account" title="Profile" subtitle="Contact, classes, school info & logout." />

        {/* Identity card */}
        <FadeInView delay={0}>
          <View style={styles.idCard}>
            <View style={styles.idAvi}>
              <Text style={styles.idAviText}>
                {firstKid ? initials(firstKid.studentName) : "?"}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.idLabel}>SIGNED IN</Text>
              <Text style={styles.idName} numberOfLines={1}>
                {parentLabel ?? "Parent"}
              </Text>
              <Text style={styles.idSub} numberOfLines={1}>
                {kids.length} {kids.length === 1 ? "child linked" : "children linked"}
              </Text>
            </View>
          </View>
        </FadeInView>

        {/* Reach out */}
        <SectionHeader label="Reach out" />
        <View style={styles.list}>
          <Row
            icon="call-outline"
            tint={{ bg: tints.rose.base, fg: tints.rose.deep }}
            title="Contact School"
            subtitle="Subject teachers, principal & school office"
            onPress={() => navigation.navigate("Contact")}
            last
          />
        </View>

        {/* Academics */}
        <SectionHeader label="Academics" />
        <View style={styles.list}>
          <Row
            icon="book-outline"
            tint={{ bg: tints.wheat.base, fg: tints.wheat.deep }}
            title="Diary & Homework"
            subtitle="What was taught + today's homework"
            onPress={() => navigation.navigate("Diary")}
          />
          <Row
            icon="grid-outline"
            tint={{ bg: tints.sky.base, fg: tints.sky.deep }}
            title="Class Timetable"
            subtitle="Weekly period-wise schedule"
            onPress={() => navigation.navigate("Timetable")}
            last
          />
        </View>

        {/* School */}
        {more.data ? (
          <>
            <SectionHeader label="School" />
            <View style={styles.list}>
              {more.data.address ? (
                <Row
                  icon="location-outline"
                  tint={{ bg: tints.peach.base, fg: tints.peach.deep }}
                  title={more.data.schoolName}
                  subtitle={more.data.address}
                  onPress={
                    more.data.mapsLink
                      ? () => Linking.openURL(more.data!.mapsLink!).catch(() => undefined)
                      : undefined
                  }
                />
              ) : null}
              {more.data.officeHours ? (
                <Row
                  icon="time-outline"
                  tint={{ bg: tints.mustard.base, fg: tints.mustard.deep }}
                  title="Office hours"
                  subtitle={more.data.officeHours}
                />
              ) : null}
              {more.data.affiliation ? (
                <Row
                  icon="ribbon-outline"
                  tint={{ bg: tints.mint.base, fg: tints.mint.deep }}
                  title="Affiliation"
                  subtitle={more.data.affiliation}
                  last
                />
              ) : null}
            </View>
          </>
        ) : null}

        {/* Account */}
        <SectionHeader label="Account" />
        <View style={styles.list}>
          <Row
            icon="log-out-outline"
            tint={{ bg: colors.errorSoft, fg: colors.error }}
            title="Logout"
            subtitle="End this session on this device"
            danger
            onPress={confirmSignOut}
            last
          />
        </View>

        <Text style={styles.footer}>
          Parent Portal · v1.0{"\n"}
          Powered by Shadowbiz Startups Developer
        </Text>
      </Screen>
    </View>
  );
}

function Row({
  icon,
  tint,
  title,
  subtitle,
  onPress,
  danger,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: { bg: string; fg: string };
  title: string;
  subtitle: string;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      android_ripple={onPress ? { color: "rgba(16,13,10,0.08)" } : undefined}
      style={({ pressed }) => [
        styles.row,
        !last && styles.rowBorder,
        pressed && onPress && { backgroundColor: colors.creamSoft },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: tint.bg }]}>
        <Ionicons name={icon} size={18} color={tint.fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, danger && { color: colors.error }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={2}>{subtitle}</Text>
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.ink40} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.creamSoft },

  idCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.rule,
    padding: space[4],
  },
  idAvi: {
    width: 56,
    height: 56,
    borderRadius: radius[4],
    backgroundColor: colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  idAviText: { color: colors.white, fontSize: 20, fontWeight: "800" },
  idLabel: {
    fontSize: fontSize.label,
    fontWeight: "800",
    color: colors.ink40,
    letterSpacing: 1.4,
  },
  idName: {
    fontSize: fontSize.bodyL,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 2,
  },
  idSub: { fontSize: fontSize.bodyS, color: colors.ink60, marginTop: 2 },

  list: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.rule,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[4],
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.ruleSoft,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius[2],
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: fontSize.body, fontWeight: "700", color: colors.ink },
  rowSub: { fontSize: fontSize.bodyS, color: colors.ink60, marginTop: 2 },

  footer: {
    marginTop: space[7],
    paddingTop: space[5],
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    fontSize: fontSize.cap,
    color: colors.ink40,
    textAlign: "center",
    lineHeight: 18,
  },
});
