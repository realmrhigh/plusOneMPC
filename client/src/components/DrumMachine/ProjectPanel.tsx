// client/src/components/DrumMachine/ProjectPanel.tsx
import React, { useState, useEffect } from 'react';
import { useDrumMachineStore } from '@/lib/stores/useDrumMachine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner'; // For notifications
import { Save, FolderOpen, Trash2 } from 'lucide-react';

interface ProjectPanelProps {
  onClose?: () => void;
}

const ProjectPanel: React.FC<ProjectPanelProps> = ({ onClose }) => {
  const {
    saveProject,
    loadProject,
    listProjects,
    deleteProject,
    currentProjectName
  } = useDrumMachineStore();

  const [projectNameInput, setProjectNameInput] = useState('');
  const [savedProjects, setSavedProjects] = useState<string[]>([]);

  const refreshProjectList = () => {
    setSavedProjects(listProjects());
  };

  useEffect(() => {
    refreshProjectList();
  }, []);

  // Refresh list when currentProjectName changes (e.g. after a save creating a new project entry)
  useEffect(() => {
    refreshProjectList();
  }, [currentProjectName]);

  const handleSaveProject = () => {
    if (!projectNameInput.trim()) {
      toast.error('Project name cannot be empty.');
      return;
    }
    try {
      saveProject(projectNameInput.trim());
      toast.success(`Project "${projectNameInput.trim()}" saved!`);
      setProjectNameInput(''); // Clear input after save
      refreshProjectList(); // Refresh list to show new project
    } catch (e) {
      toast.error('Failed to save project.');
      console.error(e);
    }
  };

  const handleLoadProject = (name: string) => {
    try {
      if (loadProject(name)) {
        toast.success(`Project "${name}" loaded!`);
        if (onClose) onClose(); // Close panel on successful load
      } else {
        toast.error(`Failed to load project "${name}". It might be an incompatible version or corrupted.`);
      }
      // currentProjectName will be updated by the store, effect will refresh list
    } catch (e) {
      toast.error('Failed to load project.');
      console.error(e);
    }
  };

  const handleDeleteProject = (name: string) => {
    // Consider adding a confirmation dialog here for better UX
    // For example: if (window.confirm(`Are you sure you want to delete ${name}?`)) { ... }
    try {
      deleteProject(name);
      toast.info(`Project "${name}" deleted.`);
      refreshProjectList(); // Refresh list to remove deleted project
    } catch (e) {
      toast.error('Failed to delete project.');
      console.error(e);
    }
  };

  return (
    <div className="p-4 space-y-6 bg-red-800 text-white rounded-lg shadow-xl" style={{ touchAction: 'auto' }}>
      <div>
        <h3 className="text-lg font-semibold mb-2 text-white">Save Current Project As</h3>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Enter new project name..."
            value={projectNameInput}
            onChange={(e) => setProjectNameInput(e.target.value)}
            className="bg-red-900 border-red-700 text-white placeholder-red-400 focus:border-red-500"
          />
          <Button
            onClick={handleSaveProject}
            disabled={!projectNameInput.trim()}
            className="bg-green-600 hover:bg-green-500 text-white"
            title="Save Project"
          >
            <Save size={18} className="mr-2" /> Save As
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2 text-white">Load Project</h3>
        {currentProjectName && (
          <p className="text-sm text-yellow-300 mb-2">Currently loaded: <strong>{currentProjectName}</strong></p>
        )}
        <ScrollArea className="h-[200px] p-3 bg-red-900 rounded-md border border-red-700">
          {savedProjects.length === 0 ? (
            <p className="text-red-400 text-center py-4">No saved projects found.</p>
          ) : (
            <ul className="space-y-2">
              {savedProjects.map((name) => (
                <li key={name} className="flex items-center justify-between p-2 bg-red-700 rounded-md hover:bg-red-600 transition-colors">
                  <span className="truncate text-sm font-medium text-white mr-2">{name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLoadProject(name)}
                      className="bg-blue-600 hover:bg-blue-500 border-blue-500 text-white px-2"
                      title="Load Project"
                    >
                      <FolderOpen size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteProject(name)}
                      className="bg-red-600 hover:bg-red-500 border-red-500 text-white px-2"
                      title="Delete Project"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>
       {onClose && (
         <Button onClick={onClose} variant="outline" className="w-full mt-4 bg-red-700 hover:bg-red-600 border-red-500 text-white">
           Close Panel
         </Button>
       )}
    </div>
  );
};

export default ProjectPanel;
