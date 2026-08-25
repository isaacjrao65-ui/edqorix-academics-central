import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type PermissionRow = {
  key: string;
  grp: string;
  label: string;
  sort_order: number;
};

export type RoleRow = {
  id: string;
  key: string | null;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
};

export type RolePermissionRow = {
  id: string;
  role_id: string;
  permission_key: string;
};

export type UserPermissionRow = {
  id: string;
  user_id: string;
  permission_key: string;
  granted: boolean;
};

export const PERMISSION_GROUP_ORDER = [
  "Students",
  "Teachers",
  "Users",
  "Academic",
  "Examinations",
  "Marks",
  "Documents",
  "Reports",
  "Institution",
  "System",
];

export function usePermissionCatalogue() {
  return useQuery({
    queryKey: ["permissions-catalogue"],
    queryFn: async (): Promise<PermissionRow[]> => {
      const { data, error } = await supabase
        .from("permissions")
        .select("key, grp, label, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useRoles(institutionId: string | null) {
  return useQuery({
    queryKey: ["roles", institutionId],
    enabled: Boolean(institutionId),
    queryFn: async (): Promise<RoleRow[]> => {
      const { data, error } = await supabase
        .from("roles")
        .select("id, key, name, description, is_system, created_at")
        .eq("institution_id", institutionId as string)
        .order("is_system", { ascending: false })
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRolePermissions(institutionId: string | null) {
  return useQuery({
    queryKey: ["role-permissions", institutionId],
    enabled: Boolean(institutionId),
    queryFn: async (): Promise<RolePermissionRow[]> => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("id, role_id, permission_key")
        .eq("institution_id", institutionId as string);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUserPermissions(institutionId: string | null) {
  return useQuery({
    queryKey: ["user-permissions", institutionId],
    enabled: Boolean(institutionId),
    queryFn: async (): Promise<UserPermissionRow[]> => {
      const { data, error } = await supabase
        .from("user_permissions")
        .select("id, user_id, permission_key, granted")
        .eq("institution_id", institutionId as string);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type MemberRow = {
  id: string;
  user_id: string;
  role: string;
  role_id: string | null;
  is_active: boolean;
  status: string;
  designation: string | null;
  is_class_teacher: boolean;
  department_id: string | null;
  created_at: string;
  profile: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    designation: string | null;
  } | null;
};

export function useMembers(institutionId: string | null) {
  return useQuery({
    queryKey: ["members", institutionId],
    enabled: Boolean(institutionId),
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await supabase
        .from("memberships")
        .select(
          "id, user_id, role, role_id, is_active, status, designation, is_class_teacher, department_id, created_at",
        )
        .eq("institution_id", institutionId as string)
        .order("created_at");
      if (error) throw error;
      const rows = data ?? [];
      if (rows.length === 0) return [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, designation")
        .in(
          "id",
          rows.map((r) => r.user_id),
        );
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({ ...r, profile: byId.get(r.user_id) ?? null })) as MemberRow[];
    },
  });
}
