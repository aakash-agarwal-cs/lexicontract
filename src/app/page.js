import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <main className="max-w-2xl mx-auto mt-20 p-6">
      <h1 className="text-2xl font-bold">LexiContract</h1>
      <p className="mt-2">
        Logged in as {session.name} ({session.role})
      </p>
      <LogoutButton />
    </main>
  );
}