import React from 'react';
import ProjectForm, { ProjectHeader } from './ui/ProjectForm';
import ScenarioForm from './ui/ScenarioForm';
import ResultPanel from './ui/ResultPanel';

function App() {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <ProjectForm />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <ProjectHeader />

        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <ScenarioForm />
            <ResultPanel />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
