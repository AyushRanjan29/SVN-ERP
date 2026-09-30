import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth/getUserRole";

export default async function Home() {
  const role = await getUserRole();

  if (!role) {
    redirect("/login");
  }

  switch (role) {
    case "admin":
      redirect("/admin");

    case "teacher":
      redirect("/teacher");

    case "student":
      redirect("/student");

    case "parent":
      redirect("/parent");

    default:
      redirect("/login");
  }
}
