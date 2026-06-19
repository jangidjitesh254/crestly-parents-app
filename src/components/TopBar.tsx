/**
 * App-wide top bar — white surface (matching the Staff app), with a dark
 * Crestly mark, the school name and a small "PARENT PORTAL" caption.
 *
 * Sign-out lives on the Profile tab now, so the bar carries no logout
 * button. Every screen renders its own TopBar so the brand surface stays
 * consistent across stack pushes — see RootNavigator (`headerShown:false`).
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useParentSchoolInfo } from "../hooks/queries";
import { colors, fontSize, radius, space } from "../theme";

interface Props {
  showBack?: boolean;
  onBack?: () => void;
}

export function TopBar({ showBack, onBack }: Props) {
  const school = useParentSchoolInfo();
  const name = school.data?.name?.trim() || "School";

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.bar}>
        {showBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={10}
            android_ripple={{ color: "rgba(16,13,10,0.08)", borderless: true }}
            style={styles.iconBtn}
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
        ) : (
          <View style={styles.mark}>
            <Text style={styles.markLetter}>C</Text>
            <View style={styles.markDot} />
          </View>
        )}

        <View style={styles.idBlock}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.sub}>PARENT PORTAL</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    minHeight: 58,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: radius[3],
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  markLetter: {
    color: colors.white,
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -1,
  },
  markDot: {
    position: "absolute",
    width: 5,
    height: 5,
    backgroundColor: colors.orange,
    borderRadius: 2.5,
    bottom: 6,
    right: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(16,13,10,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  idBlock: { flex: 1, minWidth: 0 },
  name: {
    color: colors.ink,
    fontSize: fontSize.bodyL,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sub: {
    color: colors.ink40,
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginTop: 1,
  },
});
