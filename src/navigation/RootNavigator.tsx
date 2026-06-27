import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  createMaterialTopTabNavigator,
  type MaterialTopTabBarProps,
} from "@react-navigation/material-top-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../store/auth";
import { colors, fontSize, space } from "../theme";
import type {
  HomeStackParams,
  MainTabParams,
  MoreStackParams,
} from "./types";

import { LoginScreen } from "../screens/LoginScreen";
import { LoginSuccess } from "../components/LoginSuccess";
import { HomeScreen } from "../screens/HomeScreen";
import { AttendanceScreen } from "../screens/AttendanceScreen";
import { ExamsScreen } from "../screens/ExamsScreen";
import { FeesScreen } from "../screens/FeesScreen";
import { ContactScreen } from "../screens/ContactScreen";
import { CalendarScreen } from "../screens/CalendarScreen";
import { TestsScreen } from "../screens/tests/TestsScreen";
import { TestAttemptScreen } from "../screens/tests/TestAttemptScreen";
import { MoreScreen } from "../screens/more/MoreScreen";
import { DiaryScreen } from "../screens/more/DiaryScreen";
import { TimetableScreen } from "../screens/more/TimetableScreen";

const stackScreenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.white },
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
      <MoreStack.Screen name="Calendar" component={CalendarScreen} />
      <MoreStack.Screen name="Tests" component={TestsScreen} />
      <MoreStack.Screen name="TestAttempt" component={TestAttemptScreen} />
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
  return (
    <View pointerEvents="box-none" style={fb.root}>
      <View pointerEvents="box-none" style={[fb.wrap, { bottom: Math.max(insets.bottom, 10) }]}>
      <View style={fb.shadow}>
        <View style={fb.bar}>
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
        </View>
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
  // Full-width transparent layer that centres the pill horizontally.
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  // Soft shadow lives on the wrapper so the solid bar stays crisp.
  shadow: {
    borderRadius: 30,
    boxShadow: "0px 8px 24px rgba(0,0,0,0.10)",
  },
  // Clean, crisp solid floating bar — no blur over page content.
  bar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
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
  const { token, loading, justSignedIn, clearJustSignedIn } = useAuth();
  if (loading) return <Splash />;
  if (!token) return <LoginScreen />;
  return (
    <View style={{ flex: 1 }}>
      <MainTabs />
      {justSignedIn ? <LoginSuccess onDone={clearJustSignedIn} /> : null}
    </View>
  );
}

export { space };
