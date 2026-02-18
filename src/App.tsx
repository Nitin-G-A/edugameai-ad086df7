import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

import StudentLayout from "./components/layout/StudentLayout";
import DoubtSolver from "./pages/student/DoubtSolver";
import Summarizer from "./pages/student/Summarizer";
import QuizArena from "./pages/student/QuizArena";
import StudentAssignments from "./pages/student/Assignments";
import ExplainMistake from "./pages/student/ExplainMistake";
import MyClasses from "./pages/student/MyClasses";

import TeacherLayout from "./components/layout/TeacherLayout";
import TeacherClasses from "./pages/teacher/Classes";
import TeacherQuizGenerator from "./pages/teacher/QuizGenerator";
import SavedQuizzes from "./pages/teacher/SavedQuizzes";
import TeacherAssignments from "./pages/teacher/Assignments";
import TeacherAnalytics from "./pages/teacher/Analytics";
import LessonPlanner from "./pages/teacher/LessonPlanner";
import SavedLessonPlans from "./pages/teacher/SavedLessonPlans";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Student Routes */}
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<DoubtSolver />} />
              <Route path="classes" element={<MyClasses />} />
              <Route path="summarizer" element={<Summarizer />} />
              <Route path="quizzes" element={<QuizArena />} />
              <Route path="assignments" element={<StudentAssignments />} />
              <Route path="mistakes" element={<ExplainMistake />} />
            </Route>

            {/* Teacher Routes */}
            <Route path="/teacher" element={<TeacherLayout />}>
              <Route index element={<TeacherClasses />} />
              <Route path="quizzes" element={<TeacherQuizGenerator />} />
              <Route path="saved-quizzes" element={<SavedQuizzes />} />
              <Route path="assignments" element={<TeacherAssignments />} />
              <Route path="analytics" element={<TeacherAnalytics />} />
              <Route path="lesson-planner" element={<LessonPlanner />} />
              <Route path="saved-lesson-plans" element={<SavedLessonPlans />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
