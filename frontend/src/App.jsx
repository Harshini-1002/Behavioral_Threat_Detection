import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import DatasetAnalysis from './pages/DatasetAnalysis';
import AccountAnalysis from './pages/AccountAnalysis';
import ThreatDetails from './pages/ThreatDetails';
import ModelPerformance from './pages/ModelPerformance';
import ThreatHistory from './pages/ThreatHistory';
import BlockchainNetwork from './pages/BlockchainNetwork';
import AuthPage from './pages/AuthPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RefreshCw } from 'lucide-react';

function MainApp() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedThreat, setSelectedThreat] = useState(null);

  const handleThreatSelect = (threatData) => {
    setSelectedThreat(threatData);
    setActiveTab('threat-details');
  };

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#030712',
        color: '#06b6d4'
      }}>
        <RefreshCw size={36} className="spin" style={{ marginBottom: '1rem' }} />
        <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
          Validating Security Session with MongoDB...
        </div>
      </div>
    );
  }

  // If not authenticated, render Login/Register Page
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigateToAnalysis={() => setActiveTab('account-analysis')} />;
      case 'dataset-analysis':
        return <DatasetAnalysis onInspectAccount={handleThreatSelect} />;
      case 'account-analysis':
        return <AccountAnalysis onThreatSelect={handleThreatSelect} />;
      case 'threat-details':
        return (
          <ThreatDetails 
            selectedThreat={selectedThreat} 
            onBackToAnalysis={() => setActiveTab('account-analysis')} 
          />
        );
      case 'model-performance':
        return <ModelPerformance />;
      case 'threat-history':
        return <ThreatHistory />;
      case 'blockchain-network':
        return <BlockchainNetwork onInspectAccount={(acc) => setActiveTab('account-analysis')} />;
      default:
        return <Dashboard onNavigateToAnalysis={() => setActiveTab('account-analysis')} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-content">
        <Navbar activeTab={activeTab} />
        <main style={{ flex: 1 }}>
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
