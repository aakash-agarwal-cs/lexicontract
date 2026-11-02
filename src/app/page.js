import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white shadow rounded-lg p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">LexiContract Dashboard</h1>
        <p className="text-gray-600 mb-6">Welcome, {session.name} ({session.role})</p>
        <div className="space-y-3">
          <Link href="/vendors" className="block w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Manage Vendors</Link>
          <Link href="/contracts" className="block w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700">Manage Contracts</Link>
          <Link href="/reports" className="block w-full bg-gray-600 text-white p-2 rounded hover:bg-gray-700">View Reports</Link>
        </div>
      </div>
    </div>
  );
}