import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FolderOpen, Clock, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../hooks/useProject';
import type { Project } from '../types/database';

interface MyProjectsSectionProps {
  onOpenProject: (projectId: string) => void;
  onCreateNew: () => void;
}

export const MyProjectsSection: React.FC<MyProjectsSectionProps> = ({
  onOpenProject,
  onCreateNew,
}) => {
  const { user } = useAuth();
  const { projects, loadProjects, isLoading } = useProject();
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (user && !hasLoaded) {
      loadProjects().then(() => setHasLoaded(true));
    }
  }, [user, hasLoaded, loadProjects]);

  // 로그인하지 않은 경우 표시하지 않음
  if (!user) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    if (days < 30) return `${Math.floor(days / 7)}주 전`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-20 px-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            내 프로젝트
          </h2>
          {projects.length > 0 && (
            <span className="text-sm text-gray-400 dark:text-gray-500">
              ({projects.length})
            </span>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && !hasLoaded && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500 dark:text-gray-400">프로젝트 불러오는 중...</span>
        </div>
      )}

      {/* Empty State */}
      {hasLoaded && projects.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl"
        >
          <FolderOpen className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">아직 프로젝트가 없습니다</p>
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            새 프로젝트 시작
          </button>
        </motion.div>
      )}

      {/* Projects Grid */}
      {hasLoaded && projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onOpenProject(project.id)}
              className="group cursor-pointer"
            >
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-lg transition-all duration-200">
                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 relative overflow-hidden">
                  {project.thumbnail_url ? (
                    <img 
                      src={project.thumbnail_url} 
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                        <FolderOpen className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {project.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400 dark:text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDate(project.updated_at)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyProjectsSection;

