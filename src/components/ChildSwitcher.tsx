/**
 * Horizontal pill row to switch between siblings. Reads the kids list
 * from the auth context — the parent-login response already contains
 * every sibling expanded via family_id, so we don't make a separate API
 * call here. Hides itself when the parent has only one child.
 */
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../store/auth";
import { colors, fontSize, radius, space } from "../theme";

export function ChildSwitcher() {
  const { kids, activeChildSr, setActiveChildSr } = useAuth();

  if (kids.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {kids.map((c) => {
        const active = c.srNumber === activeChildSr;
        const initial = (c.studentName[0] ?? "?").toUpperCase();
        return (
          <Pressable
            key={c.srNumber}
            onPress={() => void setActiveChildSr(c.srNumber)}
            android_ripple={{ color: "rgba(16,13,10,0.08)" }}
            style={[styles.chip, active && styles.chipActive]}
          >
            <View style={[styles.avatar, active && styles.avatarActive]}>
              <Text style={[styles.avatarText, active && styles.avatarTextActive]}>
                {initial}
              </Text>
            </View>
            <View style={{ minWidth: 0 }}>
              <Text style={[styles.name, active && styles.nameActive]} numberOfLines={1}>
                {c.studentName.split(" ")[0]}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {c.classLabel}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space[2], paddingVertical: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingLeft: 4,
    paddingRight: space[3],
    paddingVertical: 4,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.rule,
    borderRadius: radius.pill,
    minWidth: 120,
    maxWidth: 200,
  },
  chipActive: {
    backgroundColor: colors.orangeTint,
    borderColor: colors.orange,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarActive: { backgroundColor: colors.orangeDeep },
  avatarText: { fontSize: fontSize.body, fontWeight: "800", color: colors.ink60 },
  avatarTextActive: { color: colors.white },
  name: { fontSize: fontSize.body, fontWeight: "800", color: colors.ink },
  nameActive: { color: colors.orangeDeep },
  meta: {
    fontSize: fontSize.label,
    color: colors.ink40,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});
