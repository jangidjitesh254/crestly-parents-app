import React, { useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useAuth } from "../store/auth";
import { getErrorMessage } from "../lib/api";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:        "#FFFFFF",
  card:      "#FFFFFF",
  orange:    "#E8621A",
  orangeDeep:"#C9460C",
  orangeTint:"#FCE7DA",
  ink:       "#15110D",
  ink70:     "#3A342D",
  ink50:     "#8C857A",
  ink30:     "#B4ADA1",
  ink20:     "#C9C2B6",
  ink10:     "#E7E1D6",
  hair:      "#ECE6DB",
  fieldBg:   "#FFFFFF",
};

// ─── DOB helpers ───────────────────────────────────────────────────────────────
const CY = new Date().getFullYear();
const DEFAULT_DOB = new Date(CY - 10, 0, 1);
const MIN_DOB = new Date(CY - 30, 0, 1);
const MAX_DOB = new Date();
const pad = (n: number, len = 2) => String(n).padStart(len, "0");
const onlyDigits = (v: string) => v.replace(/\D/g, "");

export function LoginScreen({ navigation: _navigation }: { navigation?: any }) {
  const { signIn } = useAuth();
  const { width } = useWindowDimensions();
  const maxW = Math.min(width, 460);

  const [phone, setPhone] = useState("");
  const [day, setDay]     = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear]   = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy]   = useState(false);

  const monthRef = useRef<TextInput>(null);
  const yearRef  = useRef<TextInput>(null);

  const dobComplete =
    day !== "" && month !== "" && year.length === 4 &&
    Number(day) >= 1 && Number(day) <= 31 &&
    Number(month) >= 1 && Number(month) <= 12;

  function onPickDate(event: DateTimePickerEvent, picked?: Date) {
    if (Platform.OS === "android") setShowPicker(false);
    if (event.type === "dismissed") return;
    if (picked) {
      setDay(pad(picked.getDate()));
      setMonth(pad(picked.getMonth() + 1));
      setYear(String(picked.getFullYear()));
      setError(null);
    }
  }

  const pickerValue = dobComplete
    ? new Date(Number(year), Number(month) - 1, Number(day))
    : DEFAULT_DOB;

  async function submit() {
    if (busy) return;
    setError(null);
    const digits = onlyDigits(phone);
    if (digits.length < 10) {
      setError("Enter your registered 10-digit mobile number.");
      return;
    }
    if (!dobComplete) {
      setError("Enter your child's date of birth (DD / MM / YYYY).");
      return;
    }
    const dobStr = `${pad(Number(day))}${pad(Number(month))}${year}`;
    setBusy(true);
    try {
      await signIn(digits, dobStr);
    } catch (err) {
      setError(getErrorMessage(err, "Could not sign in. Please check the details."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[s.formCol, { maxWidth: maxW }]}>
            {/* Brand */}
            <View style={s.brand}>
              <Image source={require("../../assets/icon.png")} style={s.markImg} />
              <Text style={s.wordmark}>Crestly</Text>
              <View style={s.pill}>
                <Text style={s.pillText}>PARENTS</Text>
              </View>
            </View>

            {/* Two-tone heading */}
            <Text style={s.hello}>Welcome</Text>
            <Text style={s.there}>back!</Text>
            <Text style={s.sub}>Sign in to follow your child’s school day.</Text>

            {/* Mobile */}
            <View style={s.field}>
              <Ionicons name="call-outline" size={19} color={C.ink50} />
              <TextInput
                style={s.fieldInput}
                value={phone}
                onChangeText={(v) => setPhone(v.replace(/[^\d+ ]/g, "").slice(0, 13))}
                keyboardType="phone-pad"
                autoComplete="tel"
                placeholder="Enter your mobile number"
                placeholderTextColor={C.ink20}
                maxLength={13}
                returnKeyType="next"
              />
            </View>

            {/* DOB */}
            <View style={s.field}>
              <Ionicons name="lock-closed-outline" size={19} color={C.ink50} />
              <TextInput
                style={s.dobInput}
                value={day}
                onChangeText={(v) => {
                  const nv = onlyDigits(v).slice(0, 2);
                  setDay(nv);
                  if (nv.length === 2) monthRef.current?.focus();
                }}
                keyboardType="number-pad"
                placeholder="DD"
                placeholderTextColor={C.ink20}
                maxLength={2}
                returnKeyType="next"
              />
              <Text style={s.dobSlash}>/</Text>
              <TextInput
                ref={monthRef}
                style={s.dobInput}
                value={month}
                onChangeText={(v) => {
                  const nv = onlyDigits(v).slice(0, 2);
                  setMonth(nv);
                  if (nv.length === 2) yearRef.current?.focus();
                }}
                keyboardType="number-pad"
                placeholder="MM"
                placeholderTextColor={C.ink20}
                maxLength={2}
                returnKeyType="next"
              />
              <Text style={s.dobSlash}>/</Text>
              <TextInput
                ref={yearRef}
                style={[s.dobInput, s.dobYear]}
                value={year}
                onChangeText={(v) => setYear(onlyDigits(v).slice(0, 4))}
                keyboardType="number-pad"
                placeholder="YYYY"
                placeholderTextColor={C.ink20}
                maxLength={4}
                returnKeyType="done"
                onSubmitEditing={submit}
              />
              <TouchableOpacity
                onPress={() => setShowPicker(true)}
                activeOpacity={0.7}
                style={s.calBtn}
                accessibilityLabel="Open date wheel"
              >
                <Ionicons name="calendar-outline" size={20} color={C.orange} />
              </TouchableOpacity>
            </View>
            {/* Error */}
            {error ? (
              <View style={s.error}>
                <Ionicons name="alert-circle" size={16} color="#C0392B" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* CTA */}
            <TouchableOpacity
              style={[s.btn, busy && s.btnBusy]}
              onPress={submit}
              activeOpacity={0.88}
              disabled={busy}
            >
              <Text style={s.btnText}>{busy ? "Signing in…" : "Sign in"}</Text>
              {!busy ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : null}
            </TouchableOpacity>
          </View>

          {/* Footer pinned to the bottom */}
          <View style={[s.footerWrap, { maxWidth: maxW }]}>
            <Text style={s.privacy}>
              By continuing you agree to our{" "}
              <Text style={s.privacyBold}>Terms</Text> &{" "}
              <Text style={s.privacyBold}>Privacy Policy</Text>.
            </Text>
            <Text style={s.brandFoot}>Powered by Shadowbiz Startups</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Native date spinner — reliable OS wheel */}
      {showPicker ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="spinner"
          minimumDate={MIN_DOB}
          maximumDate={MAX_DOB}
          onChange={onPickDate}
        />
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: C.bg },
  flex:  { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 26,
    paddingTop: 24,
    paddingBottom: 18,
  },
  formCol: { flex: 1, width: "100%", alignSelf: "center", justifyContent: "center" },
  footerWrap: { width: "100%", alignSelf: "center", paddingTop: 16 },

  /* Brand */
  brand: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 34 },
  markImg: { width: 44, height: 44, borderRadius: 13 },
  wordmark: { fontSize: 22, fontWeight: "800", color: C.ink, letterSpacing: -0.5 },
  pill: {
    backgroundColor: C.orangeTint,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontSize: 10, fontWeight: "900", color: C.orangeDeep, letterSpacing: 1.4 },

  /* Two-tone heading */
  hello: { fontSize: 42, fontWeight: "900", color: C.orange, letterSpacing: -1.4, lineHeight: 46 },
  there: { fontSize: 42, fontWeight: "900", color: C.ink, letterSpacing: -1.4, lineHeight: 46, marginBottom: 12 },
  sub: { fontSize: 14.5, color: C.ink50, lineHeight: 22, marginBottom: 30 },

  /* Fields — flat, airy */
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.fieldBg,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 60,
    marginBottom: 14,
  },
  fieldInput: { flex: 1, fontSize: 16, color: C.ink, paddingVertical: 16 },

  dobInput: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 16,
    fontSize: 16,
    color: C.ink,
  },
  dobYear: { flex: 1.5 },
  dobSlash: { fontSize: 18, color: C.ink10, fontWeight: "300" },
  calBtn: {
    width: 40, height: 40,
    borderRadius: 12,
    backgroundColor: C.orangeTint,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { fontSize: 12.5, color: C.ink30, marginTop: 2, marginLeft: 4, marginBottom: 4 },

  error: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FCEDEB",
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 12,
  },
  errorText: { flex: 1, color: "#B23B2A", fontSize: 13, fontWeight: "700" },

  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.orange,
    borderRadius: 16,
    paddingVertical: 19,
    marginTop: 22,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 5,
  },
  btnBusy: { opacity: 0.65 },
  btnText: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: 0.2 },

  divRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 26, marginBottom: 16 },
  divLine: { flex: 1, height: 1, backgroundColor: C.hair },
  divTxt: { fontSize: 12, color: C.ink30, fontWeight: "700" },

  privacy: { textAlign: "center", fontSize: 12.5, color: C.ink30, lineHeight: 19 },
  privacyBold: { fontWeight: "800", color: C.ink50 },
  brandFoot: { textAlign: "center", fontSize: 11, color: C.ink20, fontWeight: "700", marginTop: 12, letterSpacing: 0.3 },
});
