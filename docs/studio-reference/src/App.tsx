import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from '@/components/ui-custom/Sidebar';
import { Dashboard } from '@/pages/Dashboard';
import { WorkflowList } from '@/pages/WorkflowList';
import { ExecutionHistory } from '@/pages/ExecutionHistory';
import { Credentials } from '@/pages/Credentials';
import { Settings } from '@/pages/Settings';
import { AgentLibrary } from '@/pages/AgentLibrary';
import { WorkflowEditorPage } from '@/pages/WorkflowEditorPage';
import { ShowcasePage } from '@/pages/ShowcasePage';
import { NPCs } from '@/pages/NPCs';
import { cn } from '@/lib/utils';

const queryClient = new QueryClient();

type Page = 'dashboard' | 'workflows' | 'executions' | 'credentials' | 'templates' | 'settings' | 'editor' | 'showcase' | 'npcs';

const MOBILE_BREAKPOINT = 768;

const App = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Default sidebar to collapsed on small viewports so content has room
  useEffect(() => {
    const check = () => setSidebarCollapsed((c) => (window.innerWidth < MOBILE_BREAKPOINT ? true : c));
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const onNavigate = (page: string) => setCurrentPage(page as Page);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={onNavigate} />;
      case 'workflows': return <WorkflowList onNavigate={onNavigate} />;
      case 'executions': return <ExecutionHistory onNavigate={onNavigate} />;
      case 'credentials': return <Credentials onNavigate={onNavigate} />;
      case 'templates': return <AgentLibrary onNavigate={onNavigate} />;
      case 'settings': return <Settings onNavigate={onNavigate} />;
      case 'npcs': return <NPCs onNavigate={onNavigate} />;
      case 'editor': return <WorkflowEditorPage onNavigate={onNavigate} />;
      case 'showcase': return <ShowcasePage />;
      default: return <Dashboard onNavigate={onNavigate} />;
    }
  };

  // Editor page has different layout (no sidebar)
  if (currentPage === 'editor') {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner theme="dark" />
          <div className="min-h-screen bg-dark text-white font-urbanist">
            {renderPage()}
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner theme="dark" />
        <div className="min-h-screen bg-dark text-white font-urbanist">
          <Sidebar
            isCollapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            activeItem={currentPage}
            onItemClick={(id) => setCurrentPage(id as Page)}
          />
          <main className={cn(
            "transition-all duration-moderate ease-out-expo",
            "max-md:ml-16",
            sidebarCollapsed ? 'ml-16' : 'ml-60'
          )}>
            {renderPage()}
          </main>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
