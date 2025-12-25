import React, { useState, useEffect } from 'react';
import { Plus, Edit } from 'lucide-react';
import useProjectStore from '../store/useProjectStore';

const ProjectForm = () => {
    const { projects, selectedProject, fetchProjects, createProject, selectProject } = useProjectStore();

    if (!fetchProjects) {
        console.error('ProjectForm: fetchProjects is missing from store');
    }

    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    useEffect(() => {
        if (typeof fetchProjects === 'function') {
            fetchProjects();
        }
    }, [fetchProjects]);

    const handleCreateProject = async (e) => {
        e.preventDefault();
        await createProject(newProjectName);
        setIsProjectModalOpen(false);
        setNewProjectName('');
    };

    return (
        <div className="w-64 bg-gray-900 text-white flex flex-col shadow-xl h-screen">
            <div className="p-6 border-b border-gray-800 bg-gray-900">
                <h1 className="text-xl font-bold tracking-wider flex items-center gap-2">
                    <span className="bg-blue-600 text-white p-1 rounded">Arch</span>Cost
                </h1>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Estimation Platform</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <div className="flex justify-between items-center text-gray-400 text-xs uppercase tracking-wider mb-2 font-bold">
                    <span>Projects</span>
                    <button onClick={() => setIsProjectModalOpen(true)} className="hover:text-white transition-colors"><Plus size={16} /></button>
                </div>
                {/* Error State in Sidebar */}
                {/* Note: Header already shows full error detail, but sidebar shouldn't just be empty. */}
                {/* Only show simplified retry here if projects is empty. */}
                {projects.length === 0 && useProjectStore.getState().error && (
                    <div className="p-4 text-center">
                        <p className="text-red-400 text-xs mb-2">無法載入專案</p>
                        <button
                            onClick={() => fetchProjects()}
                            className="px-3 py-1 bg-red-900/50 text-red-200 text-xs rounded hover:bg-red-900/80 transition"
                        >
                            Retry
                        </button>
                    </div>
                )}
                {projects.map(project => (
                    <div
                        key={project.id}
                        onClick={() => selectProject(project)}
                        className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${selectedProject?.id === project.id ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-gray-800 text-gray-300'}`}
                    >
                        <div className="truncate font-medium">{project.name}</div>
                    </div>
                ))}
            </div>

            {/* Create Project Modal */}
            {isProjectModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md text-gray-900">
                        <h3 className="text-lg font-bold mb-4">Create New Project</h3>
                        <form onSubmit={handleCreateProject}>
                            <input autoFocus type="text" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Project Name" className="w-full border p-2 rounded mb-4" />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsProjectModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}



            {/* Header controls should be in main layout or here? 
               User requested ProjectForm, let's keep it focused on Sidebar interaction
               But we also need the header "Rename" button. 
               Let's export a Header component or just handle it in App.jsx layout.
               Actually, I'll put the Edit Rename modal trigger logic in a separate Header component or keep it clean here.
               Wait, the rename modal state is local here. So the button to trigger it must be here or exposed.
               The previous App.jsx had the rename button in the HEADER. 
               Let's create a `ProjectHeader.jsx` nearby or inside ui/ folder if needed. 
               For now, I'll assume App.jsx handles layout and this is just the sidebar form.
               Wait, I see `isRenameModalOpen` used here. If the button is effectively outside (in header), 
               I might need to move Rename logic to the header or use the store to control modal visibility.
               For simplicity, I will implement `Sidebar` (this file) and a `TopBar` separately, or put them all in `App.jsx` layout.
               
               Let's assume this `ProjectForm` is the Sidebar.
            */}
        </div>
    );
};

export const ProjectHeader = () => {
    const { selectedProject, updateProject, error, fetchProjects, isLoading } = useProjectStore();
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [renameProjectName, setRenameProjectName] = useState('');

    useEffect(() => {
        if (selectedProject) {
            setRenameProjectName(selectedProject.name);
        }
    }, [selectedProject]);

    const handleRename = async (e) => {
        e.preventDefault();
        await updateProject({ name: renameProjectName });
        setIsRenameModalOpen(false);
    }

    if (error) {
        // Safe access to error properties (it might be a string if legacy, or object if new)
        const errorTitle = error.title || 'Error';
        const errorMessage = error.message || (typeof error === 'string' ? error : 'Unknown error');
        const errorHint = error.hint || '';

        return (
            <div className="h-auto min-h-16 bg-red-50 border-b border-red-200 flex flex-col justify-center px-8 py-2 text-red-600">
                <div className="flex items-start justify-between w-full">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 font-bold">
                            <span>⚠️ {errorTitle}</span>
                        </div>
                        <span className="text-sm">{errorMessage}</span>
                        {errorHint && <span className="text-xs text-red-400 mt-1 bg-red-100/50 p-1 rounded px-2">{errorHint}</span>}
                    </div>
                    <button
                        onClick={() => fetchProjects()}
                        disabled={isLoading}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-red-200 rounded text-sm text-red-600 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm shrink-0 ml-4"
                    >
                        {isLoading ? 'Retrying...' : 'Retry'}
                    </button>
                </div>
            </div>
        );
    }

    if (!selectedProject) return <div className="h-16 bg-white border-b flex items-center px-8 text-gray-400">Select a project</div>;

    return (
        <header className="h-16 bg-white shadow-sm border-b flex items-center justify-between px-8 z-10">
            <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold text-gray-800">{selectedProject.name}</h2>
                <button onClick={() => { setIsRenameModalOpen(true); setRenameProjectName(selectedProject.name) }} className="text-gray-400 hover:text-gray-600"><Edit size={16} /></button>
            </div>

            {isRenameModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md text-gray-900">
                        <h3 className="text-lg font-bold mb-4">Rename Project</h3>
                        <form onSubmit={handleRename}>
                            <input autoFocus type="text" value={renameProjectName} onChange={e => setRenameProjectName(e.target.value)} className="w-full border p-2 rounded mb-4" />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsRenameModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </header>
    )
}

export default ProjectForm;
