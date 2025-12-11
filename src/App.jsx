//App.jsx
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import SettingPage from "./pages/SettingPage";
import ProfilePage from "./pages/ProfilePage";
import { useAuthStore } from "./store/useAuthStore";
import { useChatStore } from "./store/useChatStore"; // NEW: Import useChatStore
import { useEffect } from "react";
import { Loader } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { useThemeStore } from "./store/useThemeStore";
import HomePage from "./pages/HomePage";

const App = () => {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore();
  const { getUnreadCount, subscribeToUnreadCount } = useChatStore(); // NEW: Get functions
  const { theme } = useThemeStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // NEW: Initialize unread count when user is authenticated
  useEffect(() => {
    if (authUser) {
      console.log("User authenticated, fetching unread count..."); // Debug log
      getUnreadCount(); // Fetch initial unread count
      subscribeToUnreadCount(); // Subscribe to real-time updates
    }
  }, [authUser, getUnreadCount, subscribeToUnreadCount]);

  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );
  }

  return (
    <div data-theme={theme}>
      <Navbar />
      <Routes>
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to="/login" />}
        />
        <Route
          path="/chat"
          element={authUser ? <ChatPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/signup"
          element={!authUser ? <SignupPage /> : <Navigate to="/" />}
        />
        <Route path="/settings" element={<SettingPage />} />
        <Route
          path="/profile"
          element={authUser ? <ProfilePage /> : <Navigate to="/login" />}
        />
      </Routes>
      <Toaster />
    </div>
  );
};

export default App;