"use client";
import { useState } from "react";

export default function LoginPage() {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ full_name: "", email: "", password: "" });
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const data = await res.json();
    if (!res.ok) return setMsg(data.error);
    if (mode === "register") {
      setMode("login");
      setMsg("Registered. Please log in.");
    } else {
      window.location.href = "/";
    }
  }

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  return (
    <main className="max-w-sm mx-auto mt-20 p-6 border rounded">
      <h1 className="text-xl font-bold mb-4">
        {mode === "login" ? "Log in" : "Register"}
      </h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === "register" && (
          <input className="border p-2" placeholder="Full name" value={f.full_name} onChange={set("full_name")} />
        )}
        <input className="border p-2" placeholder="Email" value={f.email} onChange={set("email")} />
        <input className="border p-2" type="password" placeholder="Password" value={f.password} onChange={set("password")} />
        <button className="bg-black text-white p-2 rounded">
          {mode === "login" ? "Log in" : "Register"}
        </button>
      </form>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
      <button className="mt-4 text-sm underline" onClick={() => { setMode(mode === "login" ? "register" : "login"); setMsg(""); }}>
        {mode === "login" ? "Need an account? Register" : "Have an account? Log in"}
      </button>
    </main>
  );
}