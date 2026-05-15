import AuthForm from "@/components/AuthForm";
import { currentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SignupPage() {
  const user = await currentUser();
  if (user) redirect("/dashboard");

  return <AuthForm mode="signup" />;
}
