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
  role_id: string | null;
  status: string;
  designation: string | null;
  is_class_teacher: boolean;
  department_id: string | null;
  institutions: {
    id: string;
    name: string;
    short_name: string | null;
    type: string;
  } | null;
};


const STORAGE_KEY = "edqorix.institution";

async function fetchMemberships(): Promise<{ rows: MembershipRow[]; isPlatformAdmin: boolean }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { rows: [], isPlatformAdmin: false };

  const [{ data, error }, { data: platform }] = await Promise.all([
    supabase
      .from("memberships")
      .select(
        "id, institution_id, role, role_id, status, designation, is_class_teacher, department_id, institutions(id, name, short_name, type)",
      )
      .eq("user_id", auth.user.id)
      .eq("is_active", true)
      .eq("status", "active"),
    supabase.rpc("is_platform_admin"),
  ]);
  if (error) throw error;
  const rows = (data ?? []) as unknown as MembershipRow[];
  const isPlatformAdmin = platform === true;

  if (!isPlatformAdmin) return { rows, isPlatformAdmin };

  // Platform owners administer every institution.
  const { data: institutions } = await supabase
    .from("institutions")
    .select("id, name, short_name, type")
    .order("name");
  const owned: MembershipRow[] = (institutions ?? [])
    .filter((inst) => !rows.some((r) => r.institution_id === inst.id && r.role === "admin"))
    .map((inst) => ({
      id: `platform-${inst.id}`,
      institution_id: inst.id,
      role: "admin" as AppRole,
      role_id: null,
      status: "active",
      designation: "Platform owner",
      is_class_teacher: false,
      department_id: null,
      institutions: inst,
    }));
  return { rows: [...owned, ...rows], isPlatformAdmin };
}


export function useMembershipsQuery() {
  return useQuery({ queryKey: ["memberships"], queryFn: fetchMemberships });
}


async function fetchEffectivePermissions(
  institutionId: string,
  roleId: string | null,
): Promise<{ keys: string[] }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { keys: [] };
  const [rolePerms, overrides] = await Promise.all([
    roleId
      ? supabase.from("role_permissions").select("permission_key").eq("role_id", roleId)
      : Promise.resolve({ data: [] as { permission_key: string }[] }),
    supabase
      .from("user_permissions")
      .select("permission_key, granted")
      .eq("institution_id", institutionId)
      .eq("user_id", auth.user.id),
  ]);
  const set = new Set((rolePerms.data ?? []).map((r) => r.permission_key));
  for (const row of overrides.data ?? []) {
    if (row.granted) set.add(row.permission_key);
    else set.delete(row.permission_key);
  }
  return { keys: [...set] };
}

type InstitutionContextValue = {
  memberships: MembershipRow[];
  institutionId: string | null;
  institutionName: string;
  roles: AppRole[];
  roleId: string | null;
  designation: string | null;
  isClassTeacher: boolean;
  departmentIds: string[];
  isLoading: boolean;
  canManage: boolean;
  isAdmin: boolean;
  isExamCell: boolean;
  isHod: boolean;
  isFaculty: boolean;
  isPlatformAdmin: boolean;
  permissions: string[];
  can: (permission: string) => boolean;
  setInstitutionId: (id: string) => void;
};

const InstitutionContext = createContext<InstitutionContextValue | null>(null);

export function InstitutionProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useMembershipsQuery();
  const memberships = data?.rows ?? [];
  const isPlatformAdmin = data?.isPlatformAdmin ?? false;
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setSelected(stored);
  }, []);

  const institutionId = useMemo(() => {
    if (selected && memberships.some((m) => m.institution_id === selected)) return selected;
    return memberships[0]?.institution_id ?? null;
  }, [selected, memberships]);

  const mine = useMemo(
    () => memberships.filter((m) => m.institution_id === institutionId),
    [memberships, institutionId],
  );
  const roleId = mine[0]?.role_id ?? null;

  const { data: permData } = useQuery({
    queryKey: ["effective-permissions", institutionId, roleId],
    enabled: Boolean(institutionId),
    queryFn: () => fetchEffectivePermissions(institutionId as string, roleId),
  });

  const value = useMemo<InstitutionContextValue>(() => {
    const roles = mine.map((m) => m.role);
    const isAdmin = isPlatformAdmin || roles.includes("admin");
    const permissions = permData?.keys ?? [];
    return {
      memberships,
      institutionId,
      institutionName: mine[0]?.institutions?.name ?? "",
      roles,
      roleId,
      designation: mine[0]?.designation ?? null,
      isClassTeacher: mine.some((m) => m.is_class_teacher),
      departmentIds: mine.map((m) => m.department_id).filter((d): d is string => Boolean(d)),
      isLoading,
      canManage: isAdmin || roles.includes("exam_cell"),
      isAdmin,
      isExamCell: isPlatformAdmin || roles.includes("exam_cell"),
      isHod: roles.includes("hod"),
      isFaculty: roles.includes("faculty"),
      isPlatformAdmin,
      permissions,
      // Super Admin / platform owner bypasses every granular check.
      can: (permission: string) => isAdmin || permissions.includes(permission),
      setInstitutionId: (id: string) => {
        window.localStorage.setItem(STORAGE_KEY, id);
        setSelected(id);
      },
    };
  }, [memberships, mine, roleId, institutionId, isLoading, isPlatformAdmin, permData]);

  return <InstitutionContext.Provider value={value}>{children}</InstitutionContext.Provider>;
}


export function useInstitution() {
  const ctx = useContext(InstitutionContext);
  if (!ctx) throw new Error("useInstitution must be used inside InstitutionProvider");
  return ctx;
}
