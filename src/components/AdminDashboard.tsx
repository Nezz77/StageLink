import { useEffect, useState, type ReactNode } from 'react';
import { BarChart3, CreditCard, Cpu, BrainCircuit, MessageCircle, ShieldCheck, TriangleAlert } from 'lucide-react';
import DashboardShell from './DashboardShell';
import AdminPayments from './AdminPayments';
import AdminAIEngine from './AdminAIEngine';
import AdminAnalytics from './AdminAnalytics';
import AdminReviewDesk from './AdminReviewDesk';
import SystemControls from './SystemControls';
import { requestDashboardNavigation } from './DashboardUI';
import { useDashboard } from '../lib/DashboardContext';
import { terminalCase } from '../lib/dashboard';

export default function AdminDashboard({ onGoToLanding, roleControl, paymentTarget }: { paymentTarget?: { id: string; key: number }; onGoToLanding?: () => void; roleControl?: ReactNode }) {
  const { state } = useDashboard();
  const [activeTab, setActiveTab] = useState(paymentTarget ? 'payments' : 'analytics');
  const [paymentId, setPaymentId] = useState(paymentTarget?.id);
  useEffect(() => { if (paymentTarget) { setPaymentId(paymentTarget.id); setActiveTab('payments'); } }, [paymentTarget]);
  const navigate = (tab: string) => requestDashboardNavigation(() => setActiveTab(tab));
  const openPayment = (id: string) => requestDashboardNavigation(() => { setPaymentId(id); setActiveTab('payments'); });
  const pending = (kind: string) => state.cases.filter(item => item.kind === kind && !terminalCase(item)).length;
  const nav = [
    { id: 'payments', icon: CreditCard, label: 'Payments' }, { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'verification', icon: ShieldCheck, label: 'Verification', count: pending('verification') },
    { id: 'disputes', icon: TriangleAlert, label: 'Disputes', count: pending('disputes') },
    { id: 'ai-engine', icon: BrainCircuit, label: 'AI Engine' }, { id: 'system', icon: Cpu, label: 'System' }, { id: 'support', icon: MessageCircle, label: 'Support', count: pending('support') },
  ];
  return <DashboardShell controls={roleControl} role="admin" navItems={nav} activeTab={activeTab} onNavigate={navigate} onGoToLanding={() => requestDashboardNavigation(() => onGoToLanding?.())}>
    {activeTab === 'payments' && <AdminPayments key={`${paymentTarget?.key}:${paymentId}`} initialBookingId={paymentId} />}
    {activeTab === 'analytics' && <AdminAnalytics onNavigate={navigate} onPayment={openPayment} />}
    {(activeTab === 'verification' || activeTab === 'disputes' || activeTab === 'support') && <AdminReviewDesk key={activeTab} kind={activeTab} onPayment={openPayment} />}
    {activeTab === 'ai-engine' && <AdminAIEngine />}
    {activeTab === 'system' && <SystemControls />}
  </DashboardShell>;
}
