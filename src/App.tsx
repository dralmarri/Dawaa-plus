import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import BottomNav from "@/components/BottomNav";
import { setStoreUid, syncFromCloud, migrateLocalToCloud, initStore, hasLocalData, clearLocalData } from "@/lib/store";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";

import AuthPage from "@/pages/AuthPage";
import HomePage from "@/pages/HomePage";
import MedicationsPage from "@/pages/MedicationsPage";
import AddMedicationPage from "@/pages/AddMedicationPage";
import HistoryPage from "@/pages/HistoryPage";
import SettingsPage from "@/pages/SettingsPage";
import BloodPressurePage from "@/pages/BloodPressurePage";
import AppointmentsPage from "@/pages/AppointmentsPage";
import LabTestsPage from "@/pages/LabTestsPage";
import EmergencyContactPage from "@/pages/EmergencyContactPage";
import TermsOfUsePage from "@/pages/TermsOfUsePage";
import PrivacyPolicyPage from "@/pages/PrivacyPolicyPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ContactUsPage from "@/pages/ContactUsPage";
import ReportsPage from "@/pages/ReportsPage";

import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, guestMode }: { children: React.ReactNode; guestMode: boolean }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user && !guestMode) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const [guestMode, setGuestMode] = useState(false);
  const { reschedule } = useNotifications();

  // Wire up cloud sync when user logs in
  useEffect(() => {
    initStore();
  }, []);

  useEffect(() => {
    if (user) {
      setStoreUid(user.id);
      // Migrate local data then sync from cloud
      migrateLocalToCloud(user.id).then((count) => {
        if (count > 0) {
          toast.success(`تم ترحيل ${count} عنصر إلى السحابة`);
        }
        return syncFromCloud(user.id);
      });
    } else {
      setStoreUid(null);
    }
  }, [user]);

  const isLoggedIn = !!user || guestMode;

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background pb-20">
      <Routes>
        <Route path="/auth" element={(user || guestMode) ? <Navigate to="/" replace /> : <AuthPage onSkip={() => setGuestMode(true)} />} />
        <Route path="/" element={<ProtectedRoute guestMode={guestMode}><HomePage /></ProtectedRoute>} />
        <Route path="/medications" element={<ProtectedRoute guestMode={guestMode}><MedicationsPage /></ProtectedRoute>} />
        <Route path="/medications/add" element={<ProtectedRoute guestMode={guestMode}><AddMedicationPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute guestMode={guestMode}><HistoryPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute guestMode={guestMode}><SettingsPage /></ProtectedRoute>} />
        <Route path="/blood-pressure" element={<ProtectedRoute guestMode={guestMode}><BloodPressurePage /></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute guestMode={guestMode}><AppointmentsPage /></ProtectedRoute>} />
        <Route path="/lab-tests" element={<ProtectedRoute guestMode={guestMode}><LabTestsPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute guestMode={guestMode}><ReportsPage /></ProtectedRoute>} />
        <Route path="/emergency-contact" element={<ProtectedRoute guestMode={guestMode}><EmergencyContactPage /></ProtectedRoute>} />
        
        <Route path="/terms" element={<TermsOfUsePage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/contact" element={<ContactUsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {isLoggedIn && <BottomNav />}
    </div>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <AppRoutes />
              <Toaster />
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
