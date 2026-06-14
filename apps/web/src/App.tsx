import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EnterprisesPage } from './pages/EnterprisesPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { ReviewDetailPage } from './pages/ReviewDetailPage';
import { PublishedPolicyPage } from './pages/PublishedPolicyPage';
import { PolicyComparisonPage } from './pages/PolicyComparisonPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { AssistantPage } from './pages/AssistantPage';
import { AdminPage } from './pages/AdminPage';

export function App() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/enterprises" element={<EnterprisesPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/reviews/:reviewId" element={<ReviewDetailPage />} />
        <Route path="/policies/:policyId" element={<PublishedPolicyPage />} />
        <Route path="/policies/:policyId/comparison" element={<PolicyComparisonPage />} />
        <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}
