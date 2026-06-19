import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabBarProps,
} from "@react-navigation/material-top-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useAuth } from "../store/auth";
import { colors, fontSize, space } from "../theme";
import type {
  HomeStackParams,
  MainTabParams,
  MoreStackParams,
} from "./types";

import { LoginScreen } from "../screens/LoginScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { AttendanceScreen } from "../screens/AttendanceScreen";
import { ExamsScreen } from "../screens/ExamsScreen";
import { FeesScreen } from "../screens/FeesScreen";
import { ContactScreen } from "../screens/ContactScreen";
import { MoreScreen } from "../screens/more/MoreScreen";
import { DiaryScreen } from "../screens/more/DiaryScreen";
import { TimetableScreen } from "../screens/more/TimetableScreen";

const stackScreenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.creamSoft },
  animation: "slide_from_right" as const,
};

/* ----------------------------------------------------------------- Home */

const HomeStack = createNativeStackNavigator<HomeStackParams>();
function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
      <HomeStack.Screen name="HomeHome" component={HomeScreen} />
    </HomeStack.Navigator>
  );
}

/* ------------------------------------------------------------------ More */

const MoreStack = createNativeStackNavigator<MoreStackParams>();
function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={stackScreenOptions}>
      <MoreStack.Screen name="MoreHome" component={MoreScreen} />
      <MoreStack.Screen name="Contact" component={ContactScreen} />
      <MoreStack.Screen name="Diary" component={DiaryScreen} />
      <MoreStack.Screen name="Timetable" component={TimetableScreen} />
    </MoreStack.Navigator>
  );
}

/* ------------------------------------------------------------- Main tabs */

const Tabs = createMaterialTopTabNavigator<MainTabParams>();

const TAB_ICON: Record<
  keyof MainTabParams,
  { off: keyof typeof Ionicons.glyphMap; on: keyof typeof Ionicons.glyphMap }
> = {
  Home: { off: "home-outline", on: "home" },
  Attendance: { off: "checkbox-outline", on: "checkbox" },
  Exams: { off: "school-outline", on: "school" },
  Fees: { off: "wallet-outline", on: "wallet" },
  Profile: { off: "person-circle-outline", on: "person-circle" },
};

/**
 * Custom floating tab bar — a compact, content-width pill centred at the
 * bottom of the screen, icons only (no labels). The active tab gets a soft
 * rounded highlight. Dark ink surface to match the top bar.
 */
function FloatingTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const bandHeight = Math.max(insets.bottom, 10) + 86;
  return (
    <View pointerEvents="box-none" style={fb.root}>
      {/* Full-width frosted band — blurs ALL page content behind/around the
          pill, not just the strip directly under it. */}
      <BlurView
        pointerEvents="none"
        intensity={36}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={[fb.band, { height: bandHeight }]}
      />
      <View pointerEvents="box-none" style={[fb.wrap, { bottom: Math.max(insets.bottom, 10) }]}>
      <View style={fb.shadow}>
        <BlurView
          intensity={55}
          tint="light"
          experimentalBlurMethod="dimezisBlurView"
          style={fb.bar}
        >
          {state.routes.map((route, index) => {
          const focused = state.index === index;
          const icon = TAB_ICON[route.name as keyof MainTabParams];
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };
          const tint = focused ? colors.orange : colors.ink60;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              android_ripple={{ color: "rgba(16,13,10,0.08)", borderless: true, radius: 30 }}
              style={fb.item}
            >
              <View style={[fb.iconWrap, focused && fb.iconWrapActive]}>
                <Ionicons name={focused ? icon.on : icon.off} size={22} color={tint} />
              </View>
              <Text style={[fb.label, { color: tint }]} numberOfLines={1}>
                {route.name}
              </Text>
            </Pressable>
          );
          })}
        </BlurView>
      </View>
      </View>
    </View>
  );
}

function MainTabs() {
  return (
    <Tabs.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      tabBarPosition="bottom"
      // Swipe left/right between tabs (pager-backed), lazy-mount each screen.
      screenOptions={{ swipeEnabled: true, lazy: true }}
    >
      <Tabs.Screen name="Home" component={HomeNavigator} />
      <Tabs.Screen name="Attendance" component={AttendanceScreen} />
      <Tabs.Screen name="Exams" component={ExamsScreen} />
      <Tabs.Screen name="Fees" component={FeesScreen} />
      <Tabs.Screen name="Profile" component={MoreNavigator} />
    </Tabs.Navigator>
  );
}

const fb = StyleSheet.create({
  // Covers the bottom strip of the screen; children position within it.
  root: { position: "absolute", left: 0, right: 0, bottom: 0 },
  // Full-width frosted band pinned to the very bottom, behind the pill.
  band: { position: "absolute", left: 0, right: 0, bottom: 0 },
  // Full-width transparent layer that centres the pill horizontally.
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  // Shadow + a faint white backing live on the wrapper; the BlurView clips
  // to the same radius on top so the frosted glass stays crisp.
  shadow: {
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.45)",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 12,
  },
  // The frosted-glass bar — blurs whatever scrolls behind it.
  bar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 30,
    overflow: "hidden",
    // Faint white film over the blur lifts contrast for the dark icons.
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 2,
  },
  // minWidth 64 × 5 tabs ≈ 15% wider than the icons-only pill.
  item: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
    paddingHorizontal: 4,
    gap: 3,
  },
  // Round (circular) highlight behind the active icon. A very large radius
  // guarantees a perfect circle (avoids sub-pixel square corners on Android).
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  iconWrapActive: { backgroundColor: "rgba(242,92,25,0.15)" },
  label: { fontSize: 10, fontWeight: "700", letterSpacing: 0.2 },
});

/* ----------------------------------------------------------------- Root */

function Splash() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.orange,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator color={colors.white} size="large" />
    </View>
  );
}

export function RootNavigator() {
  const { token, loading } = useAuth();
  if (loading) return <Splash />;
  return token ? <MainTabs /> : <LoginScreen />;
}

export { space };
