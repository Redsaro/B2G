import React, { useState } from 'react';
import Layout from './components/Layout';
import RoleSelector from './components/RoleSelector';
import VerifyView from './components/VerifyView';
import DashboardView from './components/DashboardView';
import HealthMirrorView from './components/HealthMirrorView';
import InvestorView from './components/InvestorView';
import { Role } from './types';

const App: React.FC = () => {
  const [role, setRole] = useState<Role>('LANDING');

  const renderContent = () => {
    switch (role) {
      case 'CHW':
        return <VerifyView />;
      case 'NGO':
        return <DashboardView />;
      case 'COMMUNITY':
        return <HealthMirrorView />;
      case 'INVESTOR':
        return <InvestorView />;
      default:
        return null;
    }
  };

  if (role === 'LANDING') {
    return <RoleSelector onSelect={setRole} />;
  }

  return (
    <Layout role={role} onBack={() => setRole('LANDING')}>
      {renderContent()}
    </Layout>
  );
};

export default App;
