/**
 * App-wide top bar. The school name / brand lives on the Home screen only
 * (Home renders its own header), so here we keep things minimal:
 *
 *  - Pushed screens (showBack): a single back chevron, no branding.
 *  - Tab screens (no back): just a clean status-bar spacer.
 *
 * Every screen still renders its own <TopBar /> so the safe-area inset is
 * handled consistently — see RootNavigator (`headerShown:false`).
 */
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, space } from "../theme";

interface Props {
  showBack?: boolean;
  onBack?: () => void;
}

export function TopBar({ showBack, onBack }: Props) {
  if (!showBack) {
    return <SafeAreaView edges={["top"]} style={styles.spacer} />;
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.bar}>
        <Pressable
          onPress={onBack}
          hitSlop={10}
          android_ripple={{ color: "rgba(16,13,10,0.08)", borderless: true }}
          style={styles.iconBtn}
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  spacer: { backgroundColor: colors.white },
  safe: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    minHeight: 58,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(16,13,10,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
});
