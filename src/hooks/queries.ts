/**
 * React Query hooks wrapping the /parent/* endpoints. The parent portal
 * is fully self-contained — all data lives under one namespace and the
 * JWT carries the list of SRs in scope (see ParentJwtGuard server-side).
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  CheckoutSession,
  ParentAttendanceMonth,
  ParentContactResponse,
  ParentDiaryResponse,
  ParentExamsResponse,
  ParentFeesResponse,
  ParentLoginResponse,
  ParentMoreInfo,
  ParentSchoolInfo,
  ParentTimetableResponse,
  ParentTransportResponse,
} from "../types/api";

const KEY = ["parent"] as const;

/** School name + branding for the login screen (public, no token needed). */
export function useParentSchoolInfo() {
  return useQuery({
    queryKey: [...KEY, "school-info"],
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () =>
      (await api.get<ParentSchoolInfo>("/parent/school-info")).data,
  });
}

/** Refresh the kids list from the server (auth store already has a cached copy). */
export function useParentHome() {
  return useQuery({
    queryKey: [...KEY, "home"],
    queryFn: async () =>
      (await api.get<ParentLoginResponse>("/parent/home")).data,
  });
}

export function useParentAttendance(sr: number, month: string) {
  return useQuery({
    queryKey: [...KEY, "attendance", sr, month],
    enabled: sr > 0,
    queryFn: async () =>
      (
        await api.get<ParentAttendanceMonth>("/parent/attendance", {
          params: { sr, m: month },
        })
      ).data,
  });
}

export function useParentExams(sr: number) {
  return useQuery({
    queryKey: [...KEY, "exams", sr],
    enabled: sr > 0,
    queryFn: async () =>
      (await api.get<ParentExamsResponse>("/parent/exams", { params: { sr } }))
        .data,
  });
}

export function useParentFees(sr: number) {
  return useQuery({
    queryKey: [...KEY, "fees", sr],
    enabled: sr > 0,
    queryFn: async () =>
      (await api.get<ParentFeesResponse>("/parent/fees", { params: { sr } }))
        .data,
  });
}

export function useParentDiary(sr: number, date: string) {
  return useQuery({
    queryKey: [...KEY, "diary", sr, date],
    enabled: sr > 0,
    queryFn: async () =>
      (
        await api.get<ParentDiaryResponse>("/parent/diary", {
          params: { sr, d: date },
        })
      ).data,
  });
}

export function useParentTimetable(sr: number) {
  return useQuery({
    queryKey: [...KEY, "timetable", sr],
    enabled: sr > 0,
    queryFn: async () =>
      (
        await api.get<ParentTimetableResponse>("/parent/timetable", {
          params: { sr },
        })
      ).data,
    staleTime: 5 * 60_000,
  });
}

export function useParentContact(sr: number) {
  return useQuery({
    queryKey: [...KEY, "contact", sr],
    enabled: sr > 0,
    queryFn: async () =>
      (
        await api.get<ParentContactResponse>("/parent/contact", {
          params: { sr },
        })
      ).data,
  });
}

export function useParentMoreInfo() {
  return useQuery({
    queryKey: [...KEY, "more"],
    staleTime: 5 * 60_000,
    queryFn: async () =>
      (await api.get<ParentMoreInfo>("/parent/more")).data,
  });
}

export function useParentTransport(sr: number) {
  return useQuery({
    queryKey: [...KEY, "transport", sr],
    enabled: sr > 0,
    staleTime: 5 * 60_000,
    queryFn: async () =>
      (await api.get<ParentTransportResponse>("/parent/transport", { params: { sr } })).data,
  });
}

/**
 * Start an HDFC hosted-checkout for a kid's fees. Returns a CheckoutSession
 * whose `checkoutUrl` the app opens in a browser; HDFC reconciles the
 * payment server-side (return + webhook), so the screen just refetches
 * /parent/fees after the browser closes.
 */
export function useCreateCheckout() {
  return useMutation({
    mutationFn: async (vars: { sr: number; amount: number; notes?: string | null }) => {
      const { data } = await api.post<CheckoutSession>(
        "/parent/fees/checkout",
        { amount: vars.amount, notes: vars.notes ?? null },
        { params: { sr: vars.sr } },
      );
      return data;
    },
  });
}
