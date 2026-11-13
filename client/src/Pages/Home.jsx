import { useState } from "react";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";

export default function Home() {
  const [mode, setMode] = useState("login");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuthStore();

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "register") await register({ userName, email, password });
      else await login({ userName, password });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow-one" /><div className="auth-glow auth-glow-two" />
      <nav className="auth-nav"><a className="brand" href="/"><span className="brand-mark">q</span> quicktalk</a><span className="nav-caption">A quieter kind of connection</span></nav>
      <section className="auth-layout">
        <div className="auth-story">
          <div className="eyebrow"><span className="pulse-dot" /> YOUR SPACE, YOUR PEOPLE</div>
          <h1>Conversations that feel <span>closer.</span></h1>
          <p>Private messaging, effortless calls, and a little AI help when words are hard to find.</p>
          <div className="feature-pills"><span>✳ End-to-end encryption</span><span>◉ Crystal-clear calls</span><span>✦ Thoughtful AI</span></div>
          <div className="preview-card">
            <div className="preview-top"><span className="preview-avatar">M</span><div><b>Meet me there?</b><small>Today · 10:42 AM</small></div><span className="preview-check">✓✓</span></div>
            <div className="preview-bubble">Already on my way ✨</div>
            <div className="preview-ai"><span>✦</span> AI suggestion <b>“Save me a seat!”</b></div>
          </div>
        </div>
        <div className="auth-card">
          <div className="auth-card-heading"><span className="eyebrow">WELCOME {mode === "login" ? "BACK" : "ABOARD"}</span><h2>{mode === "login" ? "Sign in to QuickTalk" : "Create your account"}</h2><p>{mode === "login" ? "Your conversations are waiting." : "Your next great conversation starts here."}</p></div>
          <form onSubmit={submit} className="auth-form">
            <label>Username<input value={userName} onChange={e => setUserName(e.target.value)} placeholder="e.g. anuj_pal" minLength={3} maxLength={24} autoComplete="username" required /></label>
            {mode === "register" && <label>Email <span className="optional">OPTIONAL</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label>}
            <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === "register" ? "At least 10 characters" : "Enter your password"} minLength={mode === "register" ? 10 : 1} autoComplete={mode === "register" ? "new-password" : "current-password"} required /></label>
            <button className="primary-button auth-submit" disabled={busy}>{busy ? <span className="button-spinner" /> : mode === "login" ? "Sign in" : "Create account"} <span>↗</span></button>
          </form>
          <div className="auth-switch">{mode === "login" ? "New to QuickTalk?" : "Already have an account?"} <button onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create account" : "Sign in"}</button></div>
          <div className="auth-footnote"><span>◈</span> Your private space begins with a secure session.</div>
        </div>
      </section>
      <footer className="auth-footer"><span>© 2026 QuickTalk</span><span>Built for meaningful conversations</span><span>Privacy first · Always</span></footer>
    </main>
  );
}
