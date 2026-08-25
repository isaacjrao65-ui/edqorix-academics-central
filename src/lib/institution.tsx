import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "exam_cell" | "hod" | "faculty";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrator",
  exam_cell: "Examination Cell",
  hod: "Head of Department",
  faculty: "Faculty",
};

export type MembershipRow = {
  id: string;
  institution_id: string;
  role: AppRole;
  department_id: string | null;
  institutions: {
    id: string;
    name: string;
    short_name: string | null;
    type: string;
  } | null;
};

const STORAGE_KEY = "edqorix.institution";

async function fetchMemberships(): Promise<MembershipRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("memberships")
    .select("id, institution_id, role, department_id, institutions(id, name, short_name, type)")
    .eq("user_id", auth.user.id)
    .eq("is_active", true);
  if (error) throw error;
  return (data ?? []) as unknown as MembershipRow[];
}

export function useMembershipsQuery() {
  return useQuery({ queryKey: ["memberships"], queryFn: fetchMemberships });
}

type InstitutionContextValue = {
  memberships: MembershipRow[];
  institutionId: string | null;
  institutionName: string;
  roles: AppRole[];
  departmentIds: string[];
  isLoading: boolean;
  canManage: boolean;
  isAdmin: boolean;
  isExamCell: boolean;
  isHod: boolean;
  isFaculty: boolean;
  setInstitutionId: (id: string) => void;
};

const InstitutionContext = createContext<InstitutionContextValue | null>(null);

export function InstitutionProvider({ children }: { children: ReactNode }) {
  const { data: memberships = [], isLoading } = useMembershipsQuery();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setSelected(stored);
  }, []);

  const institutionId = useMemo(() => {
    if (selected && memberships.some((m) => m.institution_id === selected)) return selected;
    return memberships[0]?.institution_id ?? null;
  }, [selected, memberships]);

  const value = useMemo<InstitutionContextValue>(() => {
    const mine = memberships.filter((m) => m.institution_id === institutionId);
    const roles = mine.map((m) => m.role);
    return {
      memberships,
      institutionId,
      institutionName: mine[0]?.institutions?.name ?? "",
      roles,
      departmentIds: mine.map((m) => m.department_id).filter((d): d is string => Boolean(d)),
      isLoading,
      canManage: roles.includes("admin") || roles.includes("exam_cell"),
      isAdmin: roles.includes("admin"),
      isExamCell: roles.includes("exam_cell"),
      isHod: roles.includes("hod"),
      isFaculty: roles.includes("faculty"),
      setInstitutionId: (id: string) => {
        window.localStorage.setItem(STORAGE_KEY, id);
        setSelected(id);
      },
    };
  }, [memberships, institutionId, isLoading]);

  return <InstitutionContext.Provider value={value}>{children}</InstitutionContext.Provider>;
}

export function useInstitution() {
  const ctx = useContext(InstitutionContext);
  if (!ctx) throw new Error("useInstitution must be used inside InstitutionProvider");
  return ctx;
}
