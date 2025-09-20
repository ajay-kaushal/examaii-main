
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import TeacherPage from './pages/TeacherPage';
import ExamPage from './pages/ExamPage';
import ResultsPage from './pages/ResultsPage';
import AuthPage from './pages/AuthPage';
import { Header } from './components/ui';
import { useAuth } from './hooks/useAuth';

const App: React.FC = () => {
  const { user, profile, loading } = useAuth();

  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="p-8 text-center">Loading...</div>
            ) : (
              <Routes>
                <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
                <Route path="/" element={user ? <TeacherPage /> : <Navigate to="/auth" replace />} />
                <Route path="/exam/:examId" element={<ExamPage />} />
                <Route path="/exam/:examId/submissions" element={<ResultsPage />} />
                <Route path="/results/:submissionId" element={<ResultsPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            )}
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
