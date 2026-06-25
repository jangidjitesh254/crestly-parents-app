/**
 * Page-level header used at the top of every screen body.
 *
 *   OVERVIEW · SUN 24 MAY 2026          ← mono breadcrumb, orange ·
 *   Hi, Kamlesh.                         ← big display title, orange period
 *   Parent                               ← optional subtitle
 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fontSize, space } from "../theme";

interface Props {
  crumb: string;
  date?: string;
  title: string;
  subtitle?: string;
}

export function PageHead({ crumb, date, title, subtitle }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.crumbRow}>
        <Text style={styles.crumb}>{crumb.toUpperCase()}</Text>
        {date ? (
          <>
            <View style={styles.dot} />
            <Text style={styles.crumb}>{date.toUpperCase()}</Text>
          </>
        ) : null}
      </View>
      <Text style={styles.title}>
        {title}
        <Text style={styles.titleDot}>.</Text>
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  crumbRow: { flexDirection: "row", alignItems: "center", gap: space[2] },
  crumb: {
    fontSize: fontSize.label,
    fontWeight: "800",
    color: colors.orangeDeep,
    letterSpacing: 1.6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ink40,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.6,
    lineHeight: 30,
  },
  titleDot: { color: colors.orange },
  subtitle: { fontSize: fontSize.body, color: colors.ink60 },
});
