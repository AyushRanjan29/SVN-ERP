import { redirect } from "next/navigation";
import { getUserRole } from "./getUserRole";

type UserRole = "admin" | "teacher" | "student" | "parent";

export async function requireRole(allowedRoles: UserRole[]) {
  const role = await getUserRole();

  if (!role) {
    redirect("/login");
  }

  if (!allowedRoles.includes(role as UserRole)) {
    redirect("/");
  }

  return role as UserRole;
}
