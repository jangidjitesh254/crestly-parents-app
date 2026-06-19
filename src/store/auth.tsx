import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  ParentKid,
  ParentLoginInput,
  ParentLoginResponse,
} from "../types/api";
import { api, setAuthToken, setUnauthorizedHandler } from "../lib/api";

const TOKEN_KEY = "crestly.parent.token";
const KIDS_KEY = "crestly.parent.kids";
const LABEL_KEY = "crestly.parent.label";
const FAMILY_KEY = "crestly.parent.familyId";
const ACTIVE_KEY = "crestly.parent.activeChild";

/**
 * Parent session — separate token namespace from the admin/staff app.
 * The login endpoint is /parent/login (phone + DOB DDMMYYYY) and returns
 * the parent's children, expanded across siblings via family_id.
 */
interface AuthState {
  token: string | null;
  kids: ParentKid[];
  parentLabel: string | null;
  familyId: number | null;
  loading: boolean;
  activeChildSr: number | null;
  setActiveChildSr: (sr: number) => Promise<void>;
  signIn: (phone: string, dob: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [kids, setKids] = useState<ParentKid[]>([]);
  const [parentLabel, setParentLabel] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<number | null>(null);
  const [activeChildSr, setActiveChildSrState] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(
    (
      t: string | null,
      ks: ParentKid[],
      label: string | null,
      fId: number | null,
    ) => {
      setAuthToken(t);
      setToken(t);
      setKids(ks);
      setParentLabel(label);
      setFamilyId(fId);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await AsyncStorage.multiRemove([
      TOKEN_KEY,
      KIDS_KEY,
      LABEL_KEY,
      FAMILY_KEY,
      ACTIVE_KEY,
    ]);
    applySession(null, [], null, null);
    setActiveChildSrState(null);
  }, [applySession]);

  // A 401 from any request means the token is dead — drop the session.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // Restore a stored session on cold start.
  useEffect(() => {
    (async () => {
      try {
        const [[, t], [, ks], [, lbl], [, fid], [, ac]] =
          await AsyncStorage.multiGet([
            TOKEN_KEY,
            KIDS_KEY,
            LABEL_KEY,
            FAMILY_KEY,
            ACTIVE_KEY,
          ]);
        if (t) {
          applySession(
            t,
            ks ? (JSON.parse(ks) as ParentKid[]) : [],
            lbl,
            fid ? Number(fid) : null,
          );
        }
        if (ac) setActiveChildSrState(Number(ac));
      } catch {
        // Corrupt storage — start signed out.
      } finally {
        setLoading(false);
      }
    })();
  }, [applySession]);

  // Default the active child once the kids list lands.
  useEffect(() => {
    if (kids.length > 0 && activeChildSr == null) {
      setActiveChildSrState(kids[0]!.srNumber);
      AsyncStorage.setItem(ACTIVE_KEY, String(kids[0]!.srNumber)).catch(() => undefined);
    }
  }, [kids, activeChildSr]);

  const signIn = useCallback(
    async (phone: string, dob: string) => {
      const body: ParentLoginInput = { phone, dob };
      const { data } = await api.post<ParentLoginResponse>("/parent/login", body);
      await AsyncStorage.multiSet([
        [TOKEN_KEY, data.accessToken],
        [KIDS_KEY, JSON.stringify(data.kids)],
        [LABEL_KEY, data.parentLabel],
        [FAMILY_KEY, String(data.familyId ?? "")],
      ]);
      applySession(
        data.accessToken,
        data.kids,
        data.parentLabel,
        data.familyId,
      );
    },
    [applySession],
  );

  const setActiveChildSr = useCallback(async (sr: number) => {
    setActiveChildSrState(sr);
    await AsyncStorage.setItem(ACTIVE_KEY, String(sr));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      token,
      kids,
      parentLabel,
      familyId,
      loading,
      activeChildSr,
      setActiveChildSr,
      signIn,
      signOut,
    }),
    [
      token,
      kids,
      parentLabel,
      familyId,
      loading,
      activeChildSr,
      setActiveChildSr,
      signIn,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Convenience: returns the active kid object or null if none selected. */
export function useActiveKid(): ParentKid | null {
  const { kids, activeChildSr } = useAuth();
  return kids.find((k) => k.srNumber === activeChildSr) ?? kids[0] ?? null;
}
