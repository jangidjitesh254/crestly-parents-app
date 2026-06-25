/**
 * Fees — a modern "balance card" experience.
 *
 *   stacked TOTAL DUE hero → pay panel (HDFC hosted checkout)
 *   → fee breakdown → recent activity (receipts).
 *
 * Online payment opens an HDFC hosted-checkout in the browser; HDFC reconciles
 * server-side, so we just refetch /parent/fees after the browser closes.
 */
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, TextInput, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "../store/auth";
import { useParentFees, useCreateCheckout } from "../hooks/queries";
import { ChildSwitcher } from "../components/ChildSwitcher";
import { EmptyState, FadeInView, Screen, Skeleton, StateView } from "../components/ui";
import { TopBar } from "../components/TopBar";
import { PageHead } from "../components/PageHead";
import { api, getErrorMessage } from "../lib/api";
import { rupees } from "../lib/money";
import { colors, fontSize, radius, shadow, space, tints } from "../theme";
import type { ParentReceiptResponse } from "../types/api";

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function methodLabel(m: string): string {
  return m.replace(/_/g, " ").toUpperCase();
}

export function FeesScreen() {
  const { kids, activeChildSr } = useAuth();
  const sr = activeChildSr ?? kids[0]?.srNumber ?? 0;
  const activeKid = kids.find((k) => k.srNumber === sr) ?? kids[0];
  const fees = useParentFees(sr);
  const d = fees.data;

  const pct = d && d.totalCharged > 0 ? Math.round((d.paidAmount / d.totalCharged) * 100) : 0;
  const isClear = d ? d.dueAmount <= 0 : false;

  const [sharingId, setSharingId] = useState<number | null>(null);
  async function shareReceipt(id: number) {
    try {
      setSharingId(id);
      const { data: r } = await api.get<ParentReceiptResponse>(`/parent/fees/receipt/${id}`);
      const lines = [
        r.schoolName,
        r.schoolAddress ?? "",
        "",
        `Receipt: ${r.receiptNo}`,
        `Student: ${r.studentName} (${r.classLabel})`,
        r.fatherName ? `Father: ${r.fatherName}` : "",
        `Session: ${r.sessionCode}`,
        `Date: ${fmtDate(r.paidOn)}`,
        `Amount: ${rupees(r.amount)}`,
        `Method: ${methodLabel(r.method)}`,
        r.reference ? `Ref: ${r.reference}` : "",
        r.recordedBy ? `Recorded by: ${r.recordedBy}` : "",
      ].filter(Boolean);
      await Share.share({ message: lines.join("\n"), title: `Receipt ${r.receiptNo}` });
    } catch (e) {
      Alert.alert("Couldn't open receipt", getErrorMessage(e, "Please try again."));
    } finally {
      setSharingId(null);
    }
  }

  return (
    <View style={styles.root}>
      <TopBar />
      <Screen refreshing={fees.isFetching} onRefresh={() => void fees.refetch()}>
        <PageHead
          crumb="Fee ledger"
          title="Fees"
          subtitle={d ? `Session ${d.sessionCode}` : "Fee structure, payments & receipts"}
        />

        <ChildSwitcher />

        {fees.isLoading ? (
          <View style={{ gap: space[3] }}>
            <Skeleton height={170} radius={24} />
            <Skeleton height={200} radius={24} />
          </View>
        ) : fees.error ? (
          <StateView error={fees.error} onRetry={() => void fees.refetch()} />
        ) : d ? (
          <>
            {/* Hero — stacked balance card */}
            <FadeInView delay={0}>
              <View style={styles.heroStack}>
                {!isClear ? (
                  <>
                    <View style={[styles.heroLayer, styles.heroLayer2]} />
                    <View style={[styles.heroLayer, styles.heroLayer1]} />
                  </>
                ) : null}
                <View style={[styles.heroMain, isClear && { backgroundColor: tints.mint.deep }]}>
                  <View style={styles.heroTop}>
                    <View style={styles.heroChip}>
                      <Ionicons name={isClear ? "checkmark-circle" : "wallet-outline"} size={14} color="#fff" />
                      <Text style={styles.heroChipText}>{isClear ? "ALL CLEAR" : "TOTAL DUE"}</Text>
                    </View>
                    {activeKid ? (
                      <Text style={styles.heroStudent} numberOfLines={1}>{activeKid.studentName}</Text>
                    ) : null}
                  </View>

                  <Text style={styles.heroAmount}>{isClear ? "₹0" : rupees(d.dueAmount)}</Text>
                  <Text style={styles.heroSubText}>
                    {isClear ? "All fees cleared — thank you!" : `of ${rupees(d.totalCharged)} this session`}
                  </Text>

                  <View style={styles.heroProgressTrack}>
                    <View
                      style={[
                        styles.heroProgressFill,
                        { width: `${Math.max(2, Math.min(100, pct))}%`, backgroundColor: isClear ? "#fff" : colors.orange },
                      ]}
                    />
                  </View>
                  <View style={styles.heroFootRow}>
                    <Text style={styles.heroFootText}>Paid {rupees(d.paidAmount)}</Text>
                    <Text style={styles.heroFootText}>{pct}%</Text>
                  </View>
                </View>
              </View>
            </FadeInView>

            {/* Pay panel */}
            {!isClear ? (
              <FadeInView delay={60}>
                <PayPanel
                  sr={sr}
                  dueAmount={d.dueAmount}
                  quarterly={d.quarterlyInstallment}
                  onDone={() => void fees.refetch()}
                />
              </FadeInView>
            ) : null}

            {/* Breakdown */}
            {d.breakdown.length > 0 ? (
              <FadeInView delay={100}>
                <Text style={styles.sectionTitle}>Fee breakdown</Text>
                <View style={styles.card}>
                  {d.breakdown.map((b, i) => (
                    <View key={`${b.label}-${i}`} style={[styles.bRow, styles.rowBorder]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bLabel}>{b.label}</Text>
                        {b.note ? <Text style={styles.bNote}>{b.note}</Text> : null}
                      </View>
                      <Text style={styles.bAmount}>{rupees(b.amount)}</Text>
                    </View>
                  ))}
                  <View style={styles.bRow}>
                    <Text style={styles.bTotalLabel}>Total this year</Text>
                    <Text style={styles.bTotalAmount}>{rupees(d.totalCharged)}</Text>
                  </View>
                </View>
              </FadeInView>
            ) : null}

            {/* Recent activity */}
            <FadeInView delay={140}>
              <View style={styles.activityHead}>
                <Text style={styles.sectionTitle}>Recent activity</Text>
                <Text style={styles.activityCount}>
                  {d.payments.length} {d.payments.length === 1 ? "receipt" : "receipts"}
                </Text>
              </View>
              {d.payments.length === 0 ? (
                <EmptyState
                  icon={<Ionicons name="receipt-outline" size={24} color={colors.ink40} />}
                  title="No payments yet"
                  body="Receipts will appear here once a payment is recorded."
                />
              ) : (
                <View style={styles.card}>
                  {d.payments.map((p, i) => (
                    <View key={p.id} style={[styles.aRow, i < d.payments.length - 1 && styles.rowBorder]}>
                      <View style={styles.aIcon}>
                        <Ionicons name="checkmark" size={16} color={tints.mint.deep} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.aTitle} numberOfLines={1}>{p.receiptNo}</Text>
                        <Text style={styles.aMeta} numberOfLines={1}>
                          {fmtDate(p.paidOn)}  ·  {methodLabel(p.method)}
                        </Text>
                      </View>
                      <View style={styles.aRight}>
                        <Text style={styles.aAmount}>{rupees(p.amount)}</Text>
                        <Pressable
                          onPress={() => void shareReceipt(p.id)}
                          disabled={sharingId === p.id}
                          hitSlop={8}
                          style={styles.aShare}
                          accessibilityLabel="Share receipt"
                        >
                          {sharingId === p.id ? (
                            <ActivityIndicator size="small" color={colors.orangeDeep} />
                          ) : (
                            <Ionicons name="share-outline" size={15} color={colors.orangeDeep} />
                          )}
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </FadeInView>
          </>
        ) : null}
      </Screen>
    </View>
  );
}

/** Pay-online panel — amount chips, free amount, then HDFC hosted-checkout. */
function PayPanel({
  sr,
  dueAmount,
  quarterly,
  onDone,
}: {
  sr: number;
  dueAmount: number;
  quarterly: number;
  onDone: () => void;
}) {
  const checkout = useCreateCheckout();
  const [amount, setAmount] = useState(String(dueAmount));
  const half = Math.round(dueAmount / 2);
  const amt = Math.max(0, Math.min(dueAmount, Math.round(Number(amount) || 0)));

  const chips: { key: string; label: string; val: number }[] = [
    { key: "full", label: "Full", val: dueAmount },
    { key: "half", label: "Half", val: half },
    ...(quarterly > 0 && quarterly < dueAmount ? [{ key: "qtr", label: "Quarter", val: quarterly }] : []),
  ];

  async function pay() {
    if (amt <= 0) {
      Alert.alert("Enter an amount", "Please enter how much you'd like to pay.");
      return;
    }
    try {
      const session = await checkout.mutateAsync({ sr, amount: amt });
      await WebBrowser.openBrowserAsync(session.checkoutUrl);
      onDone();
    } catch (e) {
      Alert.alert("Payment couldn't start", getErrorMessage(e, "Please try again in a moment."));
    }
  }

  return (
    <View style={styles.payCard}>
      <View style={styles.payHead}>
        <View style={styles.payIcon}>
          <Ionicons name="card-outline" size={18} color={colors.orangeDeep} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.payTitle}>Pay fees online</Text>
          <Text style={styles.paySub}>UPI · Cards · Netbanking · Wallets</Text>
        </View>
      </View>

      <View style={styles.chipRow}>
        {chips.map((c) => {
          const active = amt === c.val;
          return (
            <Pressable
              key={c.key}
              onPress={() => setAmount(String(c.val))}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              <Text style={[styles.chipAmt, active && styles.chipTextActive]}>{rupees(c.val)}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.amtRow}>
        <Text style={styles.amtCur}>₹</Text>
        <TextInput
          style={styles.amtInput}
          value={amount}
          onChangeText={(v) => setAmount(v.replace(/[^\d]/g, ""))}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.ink40}
          maxLength={8}
        />
        <Text style={styles.amtMax}>max {rupees(dueAmount)}</Text>
      </View>

      <Pressable
        onPress={pay}
        disabled={checkout.isPending || amt <= 0}
        style={[styles.payBtn, (checkout.isPending || amt <= 0) && { opacity: 0.55 }]}
      >
        {checkout.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.payBtnText}>Pay {rupees(amt)} now</Text>
            <Ionicons name="arrow-forward" size={17} color="#fff" />
          </>
        )}
      </Pressable>

      <Text style={styles.paySecure}>Secured by HDFC SmartGateway · receipt generated automatically</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },

  /* Hero — stacked balance card */
  heroStack: { position: "relative", marginBottom: 16 },
  heroMain: {
    backgroundColor: colors.ink,
    borderRadius: 24,
    padding: space[5],
    overflow: "hidden",
    zIndex: 2,
  },
  heroLayer: { position: "absolute", height: 34, borderRadius: 22 },
  heroLayer1: { bottom: -8, left: 14, right: 14, backgroundColor: colors.ink80, zIndex: 1 },
  heroLayer2: { bottom: -16, left: 30, right: 30, backgroundColor: colors.ink60, zIndex: 0 },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[2] },
  heroChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: space[2], paddingVertical: 4,
    borderRadius: radius.pill,
  },
  heroChipText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  heroStudent: { color: "rgba(255,255,255,0.7)", fontSize: fontSize.bodyS, fontWeight: "700", flexShrink: 1 },
  heroAmount: { color: "#fff", fontSize: 36, fontWeight: "900", letterSpacing: -1.4, marginTop: space[3] },
  heroSubText: { color: "rgba(255,255,255,0.66)", fontSize: fontSize.bodyS, marginTop: 4, fontWeight: "600" },
  heroProgressTrack: {
    height: 8, backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: radius.pill, overflow: "hidden", marginTop: space[4],
  },
  heroProgressFill: { height: "100%", borderRadius: radius.pill },
  heroFootRow: { flexDirection: "row", justifyContent: "space-between", marginTop: space[2] },
  heroFootText: { color: "rgba(255,255,255,0.7)", fontSize: fontSize.bodyS, fontWeight: "700" },

  /* Section title */
  sectionTitle: {
    fontSize: fontSize.h2, fontWeight: "800", color: colors.ink,
    letterSpacing: -0.3, marginBottom: space[3],
  },

  /* Pay panel */
  payCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.rule,
    padding: space[4],
    gap: space[3],
    ...shadow.card,
  },
  payHead: { flexDirection: "row", alignItems: "center", gap: space[3] },
  payIcon: {
    width: 40, height: 40, borderRadius: radius[4],
    backgroundColor: colors.orangeTint,
    alignItems: "center", justifyContent: "center",
  },
  payTitle: { fontSize: fontSize.bodyL, fontWeight: "800", color: colors.ink },
  paySub: { fontSize: fontSize.bodyS, color: colors.ink60, marginTop: 1 },
  chipRow: { flexDirection: "row", gap: space[2] },
  chip: {
    flex: 1,
    backgroundColor: colors.creamSoft,
    borderWidth: 1, borderColor: colors.rule,
    borderRadius: 14,
    paddingVertical: space[2],
    alignItems: "center",
    gap: 1,
  },
  chipActive: { backgroundColor: colors.orange, borderColor: colors.orange },
  chipText: { fontSize: fontSize.bodyS, fontWeight: "800", color: colors.ink },
  chipAmt: { fontSize: 11, fontWeight: "700", color: colors.ink60 },
  chipTextActive: { color: "#fff" },
  amtRow: {
    flexDirection: "row", alignItems: "center", gap: space[2],
    backgroundColor: colors.creamSoft,
    borderRadius: 14,
    paddingHorizontal: space[3],
    minHeight: 54,
  },
  amtCur: { fontSize: fontSize.h1, fontWeight: "800", color: colors.ink },
  amtInput: { flex: 1, fontSize: fontSize.displayS, fontWeight: "800", color: colors.ink, paddingVertical: space[2] },
  amtMax: { fontSize: fontSize.bodyS, color: colors.ink40, fontWeight: "600" },
  payBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.orange,
    borderRadius: 16,
    minHeight: 54,
  },
  payBtnText: { fontSize: fontSize.bodyL, fontWeight: "800", color: "#fff" },
  paySecure: { fontSize: fontSize.cap, color: colors.ink40, textAlign: "center" },

  /* Generic card */
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.rule,
    paddingHorizontal: space[4],
    ...shadow.card,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.ruleSoft },

  /* Breakdown */
  bRow: { flexDirection: "row", alignItems: "center", gap: space[2], paddingVertical: space[3] },
  bLabel: { fontSize: fontSize.body, color: colors.ink80, fontWeight: "600" },
  bNote: { fontSize: fontSize.cap, color: colors.ink60, marginTop: 2 },
  bAmount: { fontSize: fontSize.body, color: colors.ink, fontWeight: "800" },
  bTotalLabel: { flex: 1, fontSize: fontSize.bodyL, fontWeight: "800", color: colors.ink },
  bTotalAmount: { fontSize: fontSize.bodyL, fontWeight: "800", color: colors.orangeDeep },

  /* Recent activity */
  activityHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  activityCount: { fontSize: fontSize.bodyS, color: colors.ink40, fontWeight: "700", marginBottom: space[3] },
  aRow: { flexDirection: "row", alignItems: "center", gap: space[3], paddingVertical: space[4] },
  aIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: tints.mint.base,
    alignItems: "center", justifyContent: "center",
  },
  aTitle: { fontSize: fontSize.body, fontWeight: "800", color: colors.ink },
  aMeta: { fontSize: fontSize.bodyS, color: colors.ink60, marginTop: 2, fontWeight: "600" },
  aRight: { alignItems: "flex-end", gap: 6 },
  aAmount: { fontSize: fontSize.bodyL, fontWeight: "800", color: tints.mint.deep },
  aShare: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.orangeTint,
    alignItems: "center", justifyContent: "center",
  },
});
