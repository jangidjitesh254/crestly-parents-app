/**
 * API contract types for the Crestly Parents mobile app.
 *
 * Mirrors `packages/shared/src/parent.ts` from the Crestly backend. The
 * parent portal lives entirely under /api/parent/* and is separate from
 * the staff/admin auth — different login (phone + child DOB DDMMYYYY)
 * and a different JWT (`kind: "parent"`).
 */

/* ------------------------------------------------------------- login */

export interface ParentLoginInput {
  /** 10-13 digits, may include +91 prefix and spaces — normalised server-side. */
  phone: string;
  /** Child's DOB as 8 digits DDMMYYYY — e.g. "08072008" for 8 July 2008. */
  dob: string;
}

export interface ParentKid {
  srNumber: number;
  studentName: string;
  /** e.g. "6-A" */
  classLabel: string;
  /** ISO YYYY-MM-DD or null */
  dob: string | null;
  isHostel: boolean;
  /** "Male" | "Female" | "Other" | null */
  gender: string | null;
  /** Per-kid contacts straight off the student record. */
  fatherName: string | null;
  fatherPhone: string | null;
  motherName: string | null;
  motherPhone: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
}

export interface ParentLoginResponse {
  accessToken: string;
  /** Welcome-screen label — typically "<phone> · N children". */
  parentLabel: string;
  /** Name of the logged-in parent, resolved from the matched contact field. */
  parentName: string | null;
  /** "Father" | "Mother" | "Guardian" | null — which contact the login phone matched. */
  relationship: string | null;
  familyId: number | null;
  kids: ParentKid[];
}

/* ------------------------------------------------------ attendance */

export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "excused"
  | "not_marked";

export interface ParentAttendanceMonth {
  srNumber: number;
  /** 'YYYY-MM' */
  month: string;
  /** present|absent|late|excused|not_marked */
  todayStatus: string;
  monthSummary: {
    present: number;
    absent: number;
    late: number;
    excused: number;
    marked: number;
    percent: number;
  };
  /** day -> status map for the month, 1-indexed. Days with no record are absent from the map. */
  days: Record<string, string>;
  /** Last 7 days */
  last7: { iso: string; status: string }[];
}

/* ------------------------------------------------------------- exams */

export interface ParentExamsResponse {
  srNumber: number;
  sessionCode: string;
  /** null = no published marksheet yet. */
  overall: {
    weightedPct: number;
    grade: string;
    result: string;
    totalObtained: number;
    totalMax: number;
  } | null;
  subjects: {
    id: number;
    name: string;
    shortCode: string;
    finalPct: number | null;
    finalGrade: string | null;
  }[];
  terms: {
    id: number;
    name: string;
    shortCode: string;
    weightPercent: number;
    pct: number | null;
  }[];
}

/* -------------------------------------------------------------- fees */

export interface ParentFeesResponse {
  srNumber: number;
  sessionCode: string;
  /** paid|partial|pending|overdue */
  status: string;
  totalCharged: number;
  paidAmount: number;
  dueAmount: number;
  /** Installment plan figures (0 if the school doesn't offer that cadence). */
  quarterlyInstallment: number;
  monthlyEmi: number;
  breakdown: { label: string; amount: number; note?: string }[];
  payments: {
    id: number;
    receiptNo: string;
    paidOn: string;
    amount: number;
    method: string;
    reference: string | null;
    recordedBy: string | null;
  }[];
}

/* ---------------------------------------------------- transport / pickup */

export interface ParentTransportResponse {
  srNumber: number;
  /** True when the student is enrolled for school transport. */
  usesTransport: boolean;
  pickupPointName: string | null;
  /** Slab/route code, e.g. "S2". */
  routeSlab: string | null;
  routeRange: string | null; // "3–5 km"
  distanceKm: number | null;
  /** Yearly transport fee charged to this student (rupees). */
  transportFee: number;
  yearlyFee: number | null;
  quarterlyFee: number | null;
  monthlyFee: number | null;
  mapsLink: string | null;
}

/* ----------------------------------------------------- fee checkout */

export interface CheckoutCreateInput {
  /** Rupees (no paise). */
  amount: number;
  notes?: string | null;
}

export interface CheckoutSession {
  orderId: string;
  /** Hosted-page URL the parent opens. */
  checkoutUrl: string;
  amount: number;
  currency: string;
  expiresAt: string;
  whatsappShareUrl: string | null;
}

/* ------------------------------------------------- single receipt */

export interface ParentReceiptResponse {
  id: number;
  receiptNo: string;
  srNumber: number;
  studentName: string;
  classLabel: string;
  fatherName: string | null;
  sessionCode: string;
  paidOn: string;
  amount: number;
  method: string;
  reference: string | null;
  notes: string | null;
  recordedBy: string | null;
  schoolName: string;
  schoolAddress: string | null;
}

/* -------------------------------------------------------------- diary */

export interface ParentDiaryEntry {
  periodName: string;
  startTime: string | null;
  endTime: string | null;
  subjectName: string | null;
  subjectCode: string | null;
  teacherName: string | null;
  topic: string | null;
  homework: string | null;
}

export interface ParentDiaryResponse {
  srNumber: number;
  /** 'YYYY-MM-DD' */
  date: string;
  classLabel: string;
  entries: ParentDiaryEntry[];
  /** Last 7 dates with any entry. */
  recentDates: string[];
}

/* ---------------------------------------------------------- timetable */

export interface ParentTimetableCell {
  /** 1..6 (Mon..Sat) */
  dayOfWeek: number;
  periodId: number;
  subjectName: string | null;
  subjectCode: string | null;
  teacherName: string | null;
  room: string | null;
}

export interface ParentTimetablePeriod {
  id: number;
  periodNo: number;
  name: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

export interface ParentTimetableResponse {
  srNumber: number;
  classLabel: string;
  sessionCode: string;
  periods: ParentTimetablePeriod[];
  cells: ParentTimetableCell[];
}

/* ------------------------------------------------------------ contact */

export interface ParentContactStaff {
  id: number;
  /** "Class Teacher", "Principal", etc. */
  roleLabel: string;
  name: string;
  designation: string | null;
  /** null when callMasked = true (number is never exposed to the client). */
  phone: string | null;
  /** Personal WhatsApp; use the school number when callMasked = true. */
  whatsapp: string | null;
  callStart: string | null;
  callEnd: string | null;
  /** false → outside the call window: disable Call, show WhatsApp only. */
  canCallNow?: boolean;
  /** true → place the call via the API (ExoPhone bridge), not a tel: link. */
  callMasked?: boolean;
  /** For subject teachers. */
  subjects?: string[];
  isClassTeacher?: boolean;
}

/** Structured "is the office open right now" status for the contact page. */
export interface ParentOfficeStatus {
  isOpen: boolean;
  /** "HH:MM" 24h, or null when hours are unknown. */
  opensAt: string | null;
  closesAt: string | null;
  /** Free-form hours line, e.g. "Mon–Sat 8 AM – 4 PM". */
  hoursLabel: string | null;
  /** One-line human status, e.g. "Open now · closes 4:00 PM". */
  label: string;
}

export interface ParentContactResponse {
  srNumber: number;
  classLabel: string;
  office: ParentOfficeStatus;
  /** Masked calling configured for this school (per-staff still gated by callMasked). */
  callingEnabled?: boolean;
  /** After-hours WhatsApp channel; null when WhatsApp isn't set up. */
  schoolWhatsapp?: string | null;
  subjectTeachers: ParentContactStaff[];
  /** reception → principal → etc. */
  schoolChain: ParentContactStaff[];
}

/* ----------------------------------------------------- masked calling */

export interface MaskedCallRequest {
  sr: number;
  /** users.id of the staffer to reach (ParentContactStaff.id). */
  staffId: number;
}

export interface MaskedCallResult {
  ok: boolean;
  callId: string | null;
  /** "ringing" etc. */
  status: string | null;
  message: string | null;
}

/* ----------------------------------------------------------- calendar */

export type CalendarSource = "event" | "holiday" | "exam";
export type CalendarAudience = "all" | "staff" | "parents";
export type CalendarCategory =
  | "event"
  | "ptm"
  | "function"
  | "activity"
  | "sports"
  | "exam"
  | "fee"
  | "meeting"
  | "notice"
  | "holiday"
  | "other";

export interface CalendarFeedItem {
  /** Stable composite id across sources, e.g. "event:12". */
  key: string;
  source: CalendarSource;
  refId: number;
  title: string;
  category: CalendarCategory;
  /** YYYY-MM-DD */
  date: string;
  /** Multi-day events only. */
  endDate: string | null;
  /** "HH:MM" when not all-day. */
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  /** true = non-working day (render greyed). */
  isHoliday: boolean;
  audience: CalendarAudience;
  /** null = school-wide. */
  classLabel: string | null;
  location: string | null;
  color: string | null;
  editable: boolean;
}

export interface CalendarFeedResponse {
  from: string;
  to: string;
  items: CalendarFeedItem[];
}

/* -------------------------------------------------------------- tests */

export type ParentTestState = "available" | "upcoming" | "closed" | "attempted";
export type TestQuestionType = "mcq" | "fill_blank";

export interface ParentTestListItem {
  id: number;
  title: string;
  subjectName: string | null;
  totalMarks: number;
  /** Pass threshold; null = no pass/fail. */
  passMarks: number | null;
  questionCount: number;
  durationMin: number | null;
  availableFrom: string | null;
  availableTo: string | null;
  state: ParentTestState;
  /** Set when state = "attempted". */
  score: number | null;
  /** score >= passMarks; null when no pass mark or not yet attempted. */
  passed: boolean | null;
}

export interface ParentTestListResponse {
  srNumber: number;
  tests: ParentTestListItem[];
}

export interface ParentTestOption {
  text: string;
}

export interface ParentTestQuestion {
  id: number;
  type: TestQuestionType;
  prompt: string;
  marks: number;
  /** MCQ options (no correctness flags); null for fill_blank. */
  options: ParentTestOption[] | null;
}

export interface ParentTestDetail {
  id: number;
  title: string;
  instructions: string | null;
  subjectName: string | null;
  durationMin: number | null;
  totalMarks: number;
  alreadyAttempted: boolean;
  questions: ParentTestQuestion[];
}

export interface TestAnswerInput {
  questionId: number;
  /** MCQ: selected option indices. */
  selectedOptions?: number[];
  /** fill_blank: typed text. */
  responseText?: string;
}

export interface TestSubmitInput {
  sr: number;
  answers: TestAnswerInput[];
}

export interface GradedAnswer {
  questionId: number;
  type: TestQuestionType;
  prompt: string;
  marks: number;
  awardedMarks: number;
  isCorrect: boolean;
  selectedOptions: number[] | null;
  responseText: string | null;
  /** Revealed after submission. */
  correctOptions: number[] | null;
  acceptedAnswers: string[] | null;
}

export interface TestSubmitResult {
  testId: number;
  srNumber: number;
  score: number;
  maxScore: number;
  percent: number;
  /** Pass threshold; null = no pass/fail for this test. */
  passMarks: number | null;
  /** score >= passMarks; null when no pass mark is set. */
  passed: boolean | null;
  submittedAt: string;
  answers: GradedAnswer[];
}

/* --------------------------------------------------------------- more */

export interface ParentMoreInfo {
  schoolName: string;
  address: string | null;
  officeHours: string | null;
  affiliation: string | null;
  mapsLink: string | null;
}

/* ------------------------------------------------------ school info */

/** Returned by the public GET /parent/school-info — only the school name. */
export interface ParentSchoolInfo {
  name: string;
}
