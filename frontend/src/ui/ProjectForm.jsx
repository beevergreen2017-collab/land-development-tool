import React, { useState, useEffect } from 'react';
import { Plus, Edit, Search, Archive, Pin, PinOff, MoreVertical, RotateCcw, Trash2, Calendar, Clock } from 'lucide-react';
import useProjectStore from '../store/useProjectStore';

const ProjectForm = () => {
    const {
        projects, selectedProject, fetchProjects, createProject, selectProject, deleteProject,
        projectSearch, setProjectSearch,
        projectSort, setProjectSort,
        showArchived, toggleShowArchived,
        pinProject, archiveProject, restoreProject, markProjectOpened
    } = useProjectStore();

    // Local State
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [menuOpenId, setMenuOpenId] = useState(null); // ID of project with open menu

    // Initial Fetch
    useEffect(() => {
        if (typeof fetchProjects === 'function') {
            fetchProjects();
        }
    }, [fetchProjects]);

    // Close menu when clicking outside (Simple implementation)
    useEffect(() => {
        const closeMenu = () => setMenuOpenId(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    const handleCreateProject = async (e) => {
        e.preventDefault();
        await createProject(newProjectName);
        setIsProjectModalOpen(false);
        setNewProjectName('');
    };

    const handleProjectClick = (e, project) => {
        // Prevent if clicking menu trigger
        if (e.target.closest('.project-menu-trigger')) return;

        markProjectOpened(project.id);
        selectProject(project);
    };

    // --- Filtering & Sorting Logic ---
    const getFilteredProjects = () => {
        let filtered = [...projects];

        // 1. Search
        if (projectSearch) {
            const lowerInfo = projectSearch.toLowerCase();
            filtered = filtered.filter(p => p.name.toLowerCase().includes(lowerInfo));
        }

        // 2. Sort
        filtered.sort((a, b) => {
            if (projectSort === 'name_asc') return a.name.localeCompare(b.name);
            if (projectSort === 'created_desc') return new Date(b.created_at) - new Date(a.created_at);
            if (projectSort === 'recent_opened') {
                const ta = a.last_opened_at ? new Date(a.last_opened_at) : 0;
                const tb = b.last_opened_at ? new Date(b.last_opened_at) : 0;
                return tb - ta || new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
            }
            // default: recent_updated
            const ua = new Date(a.updated_at || a.created_at);
            const ub = new Date(b.updated_at || b.created_at);
            return ub - ua;
        });

        return filtered;
    };

    const allFiltered = getFilteredProjects();
    const pinned = allFiltered.filter(p => p.is_pinned && !p.archived_at);
    const active = allFiltered.filter(p => !p.is_pinned && !p.archived_at);
    const archived = allFiltered.filter(p => p.archived_at);

    // --- Render Helper ---
    const renderProjectItem = (project) => (
        <div
            key={project.id}
            onClick={(e) => handleProjectClick(e, project)}
            className={`group relative flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 mb-1
                ${selectedProject?.id === project.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'hover:bg-gray-800 text-gray-300'
                }
                ${project.archived_at ? 'opacity-60 bg-gray-800/50' : ''}
            `}
        >
            <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2">
                    {project.is_pinned && <Pin size={12} className="text-yellow-400 fill-yellow-400 shrink-0" />}
                    <div className="truncate font-medium text-sm">{project.name}</div>
                </div>
                <div className={`text-[10px] truncate mt-0.5 flex gap-2 ${selectedProject?.id === project.id ? 'text-blue-200' : 'text-gray-500'}`}>
                    <span>{(new Date(project.updated_at || project.created_at)).toLocaleDateString()}</span>
                    {project.archived_at && <span className="bg-gray-700 text-gray-300 px-1 rounded flex items-center">Archived</span>}
                </div>
            </div>

            {/* Menu Trigger */}
            <div className="relative project-menu-trigger">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === project.id ? null : project.id);
                    }}
                    className={`p-1 rounded hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity ${menuOpenId === project.id ? 'opacity-100 bg-white/20' : ''}`}
                >
                    <MoreVertical size={16} />
                </button>

                {/* Dropdown Menu */}
                {menuOpenId === project.id && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded shadow-xl border border-gray-200 z-50 overflow-hidden">
                        {project.is_pinned ? (
                            <button onClick={(e) => { e.stopPropagation(); pinProject(project.id, false); setMenuOpenId(null); }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                <PinOff size={14} /> Unpin
                            </button>
                        ) : (
                            <button onClick={(e) => { e.stopPropagation(); pinProject(project.id, true); setMenuOpenId(null); }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                <Pin size={14} /> Pin
                            </button>
                        )}

                        {project.archived_at ? (
                            <button onClick={(e) => { e.stopPropagation(); restoreProject(project.id); setMenuOpenId(null); }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                <RotateCcw size={14} /> Restore
                            </button>
                        ) : (
                            <button onClick={(e) => { e.stopPropagation(); archiveProject(project.id); setMenuOpenId(null); }}
                                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                                <Archive size={14} /> Archive
                            </button>
                        )}

                        <div className="border-t border-gray-200 my-1"></div>

                        <button onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('確定要刪除此專案嗎？')) {
                                deleteProject(project.id);
                            }
                            setMenuOpenId(null);
                        }}
                            className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2">
                            <Trash2 size={14} /> Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="w-72 bg-gray-900 text-white flex flex-col shadow-xl h-screen border-r border-gray-800">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-900 shrink-0">
                <h1 className="text-xl font-bold tracking-wider flex items-center gap-2 mb-4">
                    <span className="bg-blue-600 text-white p-1 rounded">Arch</span>Cost
                </h1>

                {/* Search & Action Bar */}
                <div className="space-y-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 text-gray-500" size={14} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={projectSearch}
                            onChange={e => setProjectSearch(e.target.value)}
                            className="w-full bg-gray-800 text-sm pl-8 pr-2 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none text-gray-200 placeholder-gray-500"
                        />
                    </div>

                    <div className="flex gap-2">
                        <select
                            value={projectSort}
                            onChange={e => setProjectSort(e.target.value)}
                            className="flex-1 bg-gray-800 text-xs py-1.5 px-2 rounded border border-gray-700 focus:outline-none text-gray-300"
                        >
                            <option value="recent_updated">Recent Updated</option>
                            <option value="recent_opened">Recent Opened</option>
                            <option value="name_asc">Name (A-Z)</option>
                            <option value="created_desc">Created (Newest)</option>
                        </select>
                        <button
                            onClick={toggleShowArchived}
                            className={`px-2 rounded border border-gray-700 flex items-center justify-center ${showArchived ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-500 hover:text-gray-300'}`}
                            title={showArchived ? "Hide Archived" : "Show Archived"}
                        >
                            <Archive size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">

                {/* Pinned Section */}
                {pinned.length > 0 && (
                    <div className="mb-4">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1 flex items-center gap-1">
                            <Pin size={10} /> Pinned
                        </div>
                        {pinned.map(renderProjectItem)}
                    </div>
                )}

                {/* Active Section */}
                <div className="mb-4">
                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                        <span>Projects ({active.length})</span>
                        <button onClick={() => setIsProjectModalOpen(true)} className="hover:text-white transition-colors p-1 bg-gray-800 rounded">
                            <Plus size={12} />
                        </button>
                    </div>
                    {/* Empty State */}
                    {active.length === 0 && !projectSearch && (
                        <div className="text-gray-600 text-xs text-center py-4 border border-dashed border-gray-800 rounded">
                            No active projects
                        </div>
                    )}
                    {active.map(renderProjectItem)}
                </div>

                {/* Archived Section */}
                {showArchived && archived.length > 0 && (
                    <div className="mt-6 border-t border-gray-800 pt-4">
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1 flex items-center gap-1">
                            <Archive size={10} /> Archived ({archived.length})
                        </div>
                        {archived.map(renderProjectItem)}
                    </div>
                )}

                {allFiltered.length === 0 && projectSearch && (
                    <div className="text-gray-500 text-sm text-center mt-10">
                        No matches found.
                    </div>
                )}
            </div>

            {/* Create Modal */}
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
