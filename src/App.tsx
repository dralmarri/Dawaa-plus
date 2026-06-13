import { useState, useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import BottomNav from "@/components/BottomNav";
import { setStoreUid, syncFromCloud, migrateLocalToCloud, initStore, hasLocalData, clearLocalData } from "@/lib/store";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

const AuthRoute = ({ user, setGuestMode }: { user: any; setGuestMode: (v: boolean) => void }) => {
  const location = useLocation();
  if (user && !(location.state as any)?.fromSettings) return <Navigate to="/" replace />;
  return <AuthPage onSkip={() => setGuestMode(true)} />;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const [guestMode, setGuestMode] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const pendingUserId = useRef<string | null>(null);
  const { reschedule } = useNotifications();

  // Wire up cloud sync when user logs in
  useEffect(() => {
    initStore();
  }, []);

  useEffect(() => {
    if (user) {
      setStoreUid(user.id);
      const MIGRATED_KEY = `dawaa_migrated_${user.id}`;
      const alreadyHandled = localStorage.getItem(MIGRATED_KEY);
      const guestDataExists = !alreadyHandled && hasLocalData();

      if (guestDataExists) {
        pendingUserId.current = user.id;
        setImportDialogOpen(true);
      } else {
        syncFromCloud(user.id);
      }
    } else {
      setStoreUid(null);
    }
  }, [user]);

  const handleImportConfirm = async () => {
    const uid = pendingUserId.current;
    if (!uid) return;
    setImportDialogOpen(false);
    const count = await migrateLocalToCloud(uid);
    if (count > 0) toast.success(`تم ترحيل ${count} عنصر إلى السحابة`);
    await syncFromCloud(uid);
  };

  const handleImportCancel = async () => {
    const uid = pendingUserId.current;
    setImportDialogOpen(false);
    if (uid) {
      await clearLocalData();
      localStorage.setItem(`dawaa_migrated_${uid}`, "skipped");
      await syncFromCloud(uid);
    }
  };

  const isLoggedIn = !!user || guestMode;

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
    <AlertDialog open={importDialogOpen} onOpenChange={(open) => { if (!open) handleImportCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>استيراد بيانات وضع الضيف</AlertDialogTitle>
          <AlertDialogDescription>
            تم العثور على بيانات محفوظة من وضع الضيف. هل تريد استيرادها إلى هذا الحساب؟
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleImportCancel}>بدء حساب جديد فارغ</AlertDialogCancel>
          <AlertDialogAction onClick={handleImportConfirm}>استيراد البيانات</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <div className="min-h-[100dvh] bg-background pb-20">
      <Routes>
        <Route path="/auth" element={<AuthRoute user={user} setGuestMode={setGuestMode} />} />
        <Route path="/" element={<ProtectedRoute guestMode={guestMode}><HomePage /></ProtectedRoute>} />
        <Route path="/medications" element={<ProtectedRoute guestMode={guestMode}><MedicationsPage /></ProtectedRoute>} />
        <Route path="/medications/add" element={<ProtectedRoute guestMode={guestMode}><AddMedicationPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute guestMode={guestMode}><HistoryPage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute guestMode={guestMode}><SettingsPage onSwitchToAuth={() => setGuestMode(false)} /></ProtectedRoute>} />
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
    </>
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
