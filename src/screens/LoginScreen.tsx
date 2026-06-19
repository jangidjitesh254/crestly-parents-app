import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../store/auth";
import { getErrorMessage } from "../lib/api";

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg:       "#E8E3D8",   // exact warm sand from screenshot
  card:     "#FFFFFF",
  orange:   "#E8621A",
  ink:      "#111111",
  ink70:    "#2E2B27",
  ink50:    "#9E9990",
  ink30:    "#B8B3AD",
  ink20:    "#C2BDB7",
  ink10:    "#D0CBC4",
  label:    "#2E2B27",
  sheet:    "#F2EDE6",   // picker sheet bg
};

const softShadow = {
  shadowColor: "#00000049",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.055,
  shadowRadius: 10,
  elevation: 2,
};

// ─── Drum column (single scroll-snapping list) ────────────────────────────────
const ITEM_H  = 44;
const VISIBLE = 5;                    // odd number keeps selection centred
const PADDING = Math.floor(VISIBLE / 2);

type DrumProps = {
  data: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
};

function DrumColumn({ data, selectedIndex, onSelect }: DrumProps) {
  const ref = useRef<FlatList>(null);

  // pad top & bottom so selected item sits in the middle
  const padded = [
    ...Array(PADDING).fill(""),
    ...data,
    ...Array(PADDING).fill(""),
  ];

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!viewableItems.length) return;
      // middle item of visible window
      const mid = viewableItems[Math.floor(viewableItems.length / 2)];
      const realIdx = (mid?.index ?? PADDING) - PADDING;
      if (realIdx >= 0 && realIdx < data.length) onSelect(realIdx);
    },
    [data.length, onSelect]
  );

  return (
    <FlatList
      ref={ref}
      data={padded}
      keyExtractor={(_, i) => String(i)}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      style={{ flex: 1, height: ITEM_H * VISIBLE }}
      getItemLayout={(_, index) => ({
        length: ITEM_H, offset: ITEM_H * index, index,
      })}
      initialScrollIndex={selectedIndex}         // scroll to preselected
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
      renderItem={({ item, index }) => {
        const realIdx = index - PADDING;
        const isSelected = realIdx === selectedIndex;
        return (
          <View style={drum.itemWrap}>
            <Text style={[drum.item, isSelected && drum.itemSel]}>
              {item}
            </Text>
          </View>
        );
      }}
    />
  );
}

const drum = StyleSheet.create({
  itemWrap: {
    height: ITEM_H,
    alignItems: "center",
    justifyContent: "center",
  },
  item: {
    fontSize: 17,
    fontWeight: "500",
    color: C.ink20,
  },
  itemSel: {
    fontSize: 21,
    fontWeight: "700",
    color: C.ink,
  },
});

// ─── DOB picker modal ─────────────────────────────────────────────────────────
const DAYS   = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const CY     = new Date().getFullYear();
const YEARS  = Array.from({ length: 35 }, (_, i) => String(CY - 4 - i));

type DOBValue = { day: number; month: number; year: number };

type PickerProps = {
  visible: boolean;
  value: DOBValue;
  onChange: (v: DOBValue) => void;
  onClose: () => void;
};

function DOBPickerModal({ visible, value, onChange, onClose }: PickerProps) {
  const [d, setD] = useState(value.day);
  const [m, setM] = useState(value.month);
  const [y, setY] = useState(value.year);

  function confirm() {
    onChange({ day: d, month: m, year: y });
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onShow={() => {
      setD(value.day); setM(value.month); setY(value.year);
    }}>
      <Pressable style={pick.overlay} onPress={onClose}>
        <Pressable style={pick.sheet} onPress={() => {}}>
          {/* header */}
          <View style={pick.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={pick.cancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={pick.title}>Date of Birth</Text>
            <TouchableOpacity onPress={confirm}>
              <Text style={pick.done}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* drums */}
          <View style={pick.drumsWrap}>
            {/* centre highlight bar */}
            <View pointerEvents="none" style={pick.selector} />

            {/* fade top */}
            <View pointerEvents="none" style={[pick.fade, pick.fadeTop]} />

            <View style={pick.cols}>
              <DrumColumn
                data={DAYS}
                selectedIndex={d - 1}
                onSelect={(i) => setD(i + 1)}
              />
              <Text style={pick.sep}>/</Text>
              <DrumColumn
                data={MONTHS}
                selectedIndex={m - 1}
                onSelect={(i) => setM(i + 1)}
              />
              <Text style={pick.sep}>/</Text>
              <DrumColumn
                data={YEARS}
                selectedIndex={YEARS.indexOf(String(y))}
                onSelect={(i) => setY(Number(YEARS[i]))}
              />
            </View>

            {/* fade bottom */}
            <View pointerEvents="none" style={[pick.fade, pick.fadeBot]} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const pick = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  sheet: {
    backgroundColor: C.sheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 48,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title:  { fontSize: 17, fontWeight: "700", color: C.ink },
  cancel: { fontSize: 16, fontWeight: "500", color: C.ink50 },
  done:   { fontSize: 16, fontWeight: "700", color: C.orange },

  drumsWrap: {
    height: ITEM_H * VISIBLE,
    position: "relative",
    paddingHorizontal: 16,
  },
  cols: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  sep: {
    fontSize: 20,
    color: C.ink10,
    fontWeight: "300",
    paddingHorizontal: 4,
    marginBottom: ITEM_H * 0.5,   // offset to align with drum items
  },
  selector: {
    position: "absolute",
    left: 28,
    right: 28,
    top: "50%",
    marginTop: -ITEM_H / 2,
    height: ITEM_H,
    backgroundColor: "rgba(0,0,0,0.07)",
    borderRadius: 11,
    zIndex: 2,
  },
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    height: ITEM_H * 2,
    zIndex: 3,
  },
  fadeTop: {
    top: 0,
    // react-native linear gradient workaround using View opacity layers
    backgroundColor: C.sheet,
    opacity: 0.85,
  },
  fadeBot: {
    bottom: 0,
    backgroundColor: C.sheet,
    opacity: 0.85,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
const DEFAULT_DOB: DOBValue = { day: 1, month: 1, year: CY - 10 };

export function LoginScreen({ navigation }: { navigation?: any }) {
  const { signIn } = useAuth();
  const [phone, setPhone]       = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [busy,  setBusy]        = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dob,   setDob]         = useState<DOBValue | null>(null);

  const pad = (n: number, len = 2) => String(n).padStart(len, "0");

  async function submit() {
    if (busy) return;
    setError(null);
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Enter your registered 10-digit mobile number.");
      return;
    }
    if (!dob) {
      setError("Select your child's date of birth.");
      return;
    }
    const dobStr = `${pad(dob.day)}${pad(dob.month)}${dob.year}`;
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
          {/* Back */}
          <TouchableOpacity
            style={s.back}
            onPress={() => navigation?.goBack()}
            activeOpacity={0.75}
          >
            <Text style={s.backIcon}>‹</Text>
          </TouchableOpacity>

          {/* Header */}
          <Text style={s.title}>Log in</Text>
          <Text style={s.sub}>
            By logging in, you agree to our{" "}
            <Text style={s.termsText}>Terms of Use.</Text>
          </Text>

          {/* Phone */}
          <View style={s.fieldGroup}>
            <Text style={s.lbl}>Mobile number</Text>
            <View style={[s.inputWrap, softShadow]}>
              <TextInput
                style={s.input}
                value={phone}
                onChangeText={(v) =>
                  setPhone(v.replace(/[^\d+ ]/g, "").slice(0, 13))
                }
                keyboardType="phone-pad"
                autoComplete="tel"
                placeholder="98765 43210"
                placeholderTextColor={C.ink20}
                maxLength={13}
              />
            </View>
            <Text style={s.hint}>We will send you a login link via SMS.</Text>
          </View>

          {/* DOB tap trigger */}
          <View style={s.fieldGroup}>
            <Text style={s.lbl}>Child's DOB</Text>
            <TouchableOpacity
              style={[s.dobBox, softShadow]}
              onPress={() => setPickerOpen(true)}
              activeOpacity={0.75}
            >
              <View style={s.dobSeg}>
                <Text style={[s.dobVal, dob && s.dobValSet]}>
                  {dob ? pad(dob.day) : "DD"}
                </Text>
                <Text style={s.dobUnit}>Day</Text>
              </View>
              <Text style={s.dobSlash}>/</Text>
              <View style={s.dobSeg}>
                <Text style={[s.dobVal, dob && s.dobValSet]}>
                  {dob ? pad(dob.month) : "MM"}
                </Text>
                <Text style={s.dobUnit}>Month</Text>
              </View>
              <Text style={s.dobSlash}>/</Text>
              <View style={s.dobSeg}>
                <Text style={[s.dobVal, dob && s.dobValSet]}>
                  {dob ? String(dob.year) : "YYYY"}
                </Text>
                <Text style={s.dobUnit}>Year</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Error */}
          {error ? <Text style={s.error}>{error}</Text> : null}

          {/* CTA */}
          <TouchableOpacity
            style={[s.btn, busy && s.btnBusy]}
            onPress={submit}
            activeOpacity={0.85}
            disabled={busy}
          >
            <Text style={s.btnText}>{busy ? "Signing in…" : "Connect"}</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.divRow}>
            <View style={s.divLine} />
            <Text style={s.divTxt}>or</Text>
            <View style={s.divLine} />
          </View>

          {/* Privacy */}
          <Text style={s.privacy}>
            For more information, please see our{" "}
            <Text style={s.privacyBold}>Privacy policy.</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* DOB Picker */}
      <DOBPickerModal
        visible={pickerOpen}
        value={dob ?? DEFAULT_DOB}
        onChange={(v) => setDob(v)}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: C.bg },
  flex:  { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 48,
  },

  // back
  back: {
    width: 52, height: 52,
    borderRadius: 16,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    ...softShadow,
  },
  backIcon: { fontSize: 28, color: C.ink, lineHeight: 32, marginTop: -2 },

  // header
  title: {
    fontSize: 46,
    fontWeight: "900",
    color: C.ink,
    letterSpacing: -1.5,
    lineHeight: 50,
    marginBottom: 8,
  },
  sub: { fontSize: 14, color: C.ink50, lineHeight: 20, marginBottom: 30 },
  termsText: { fontWeight: "800", color: "#4A4640" },

  // field
  fieldGroup: { marginBottom: 20 },
  lbl: { fontSize: 14, fontWeight: "700", color: C.label, marginBottom: 9 },
  inputWrap: { backgroundColor: C.card, borderRadius: 16 },
  input: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    fontSize: 16,
    color: C.ink,
    borderRadius: 16,
  },
  hint: { fontSize: 12, color: C.ink30, marginTop: 7, marginLeft: 1 },

  // dob box
  dobBox: {
    backgroundColor: C.card,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  dobSeg:     { flex: 1, alignItems: "center", gap: 4 },
  dobVal:     { fontSize: 20, fontWeight: "600", color: C.ink20, letterSpacing: 1 },
  dobValSet:  { color: C.ink },
  dobUnit:    { fontSize: 10, fontWeight: "600", color: C.ink20, letterSpacing: 0.6 },
  dobSlash:   { fontSize: 20, color: C.ink10, fontWeight: "300", paddingHorizontal: 4, marginBottom: 14 },

  // error
  error: {
    backgroundColor: "#FDF0EF",
    color: "#C0392B",
    fontSize: 13,
    fontWeight: "600",
    padding: 13,
    borderRadius: 13,
    overflow: "hidden",
    marginBottom: 14,
  },

  // button
  btn: {
    backgroundColor: C.orange,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: "center",
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.26,
    shadowRadius: 20,
    elevation: 4,
    marginTop: 6,
  },
  btnBusy:   { opacity: 0.6 },
  btnText:   { color: "#fff", fontSize: 18, fontWeight: "700", letterSpacing: 0.1 },

  // divider
  divRow:  { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 22, marginBottom: 18 },
  divLine: { flex: 1, height: 1, backgroundColor: C.ink10 },
  divTxt:  { fontSize: 13, color: C.ink30 },

  // privacy
  privacy:     { textAlign: "center", fontSize: 13, color: C.ink30, lineHeight: 20 },
  privacyBold: { fontWeight: "800", color: "#5A5550" },
});