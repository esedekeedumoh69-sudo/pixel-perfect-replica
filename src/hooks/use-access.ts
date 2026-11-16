import { useSuspenseQuery } from "@tanstack/react-query";
import { accessQueryOptions } from "@/lib/access";

export function useAccess() {
  const { data } = useSuspenseQuery(accessQueryOptions);
  const can = (perm: string) => data.permissions.includes(perm);
  const canAny = (...perms: string[]) => perms.some((p) => data.permissions.includes(p));
  return { access: data, can, canAny };
}
