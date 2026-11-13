import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Home from "./Pages/Home";
import Chat from "./Pages/Chat";
import useAuthStore from "./store/authStore";

function App() {
  const { authUser, isAuthenticated, isCheckingAuth, checkAuth } = useAuthStore();
  useEffect(() => { checkAuth(); }, [checkAuth]);

  if (isCheckingAuth) return <div className="app-loader"><div className="loader-orbit" /><span>Preparing your private space…</span></div>;

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style: { background: "#171a23", color: "#f5f7fb", border: "1px solid #2a3040" } }} />
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to="/app" replace /> : <Home />} />
        <Route path="/app/*" element={isAuthenticated && authUser ? <Chat /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/app" : "/"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
