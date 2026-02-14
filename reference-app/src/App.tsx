import { useState } from 'react';
import { Sidebar } from '@/components/ui-custom/Sidebar';
import { Dashboard } from '@/pages/Dashboard';
import { WorkflowList } from '@/pages/WorkflowList';
import { ExecutionHistory } from '@/pages/ExecutionHistory';
import { Credentials } from '@/pages/Credentials';
import { Settings } from '@/pages/Settings';
import { AgentLibrary } from '@/pages/AgentLibrary';
import { WorkflowEditorPage } from '@/pages/WorkflowEditorPage';
import { ShowcasePage } from '@/pages/ShowcasePage';
import { cn } from '@/lib/utils';

type Page = 'dashboard' | 'workflows' | 'executions' | 'credentials' | 'templates' | 'settings' | 'editor' | 'showcase';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'workflows':
        return <WorkflowList />;
      case 'executions':
        return <ExecutionHistory />;
      case 'credentials':
        return <Credentials />;
      case 'templates':
        return <AgentLibrary />;
      case 'settings':
        return <Settings />;
      case 'editor':
        return <WorkflowEditorPage />;
      case 'showcase':
        return <ShowcasePage />;
      default:
        return <Dashboard />;
    }
  };

  // Editor page has different layout (no sidebar)
  if (currentPage === 'editor') {
    return (
      <div className="min-h-screen bg-dark text-white font-urbanist">
        {renderPage()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-white font-urbanist">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeItem={currentPage}
        onItemClick={(id) => setCurrentPage(id as Page)}
      />

      {/* Main Content */}
      <main 
        className={cn(
          "transition-all duration-moderate ease-out-expo",
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        )}
      >
        {renderPage()}
      </main>
    </div>
  );
}

export default App;
