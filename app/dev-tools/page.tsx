'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Node,
    Edge,
    Connection,
    BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface ProjectItem {
    id: string;
    name: string;
    path: string;
    type: 'file' | 'folder';
    fileType?: 'component' | 'page' | 'hook' | 'utility' | 'context' | 'types';
    imports?: string[];
    exports?: string[];
}

interface ProjectNode extends Node {
    data: ProjectItem & {
        label: string;
        isClickable?: boolean;
    };
}

// Определение типа файла
function getFileType(fileName: string): ProjectItem['fileType'] {
    if (fileName.includes('page.tsx')) return 'page';
    if (fileName.startsWith('use') && fileName.endsWith('.ts')) return 'hook';
    if (fileName.toLowerCase().includes('context')) return 'context';
    if (fileName.endsWith('.ts') && !fileName.endsWith('.tsx')) return 'types';
    return 'component';
}

// Цвета для файлов
function getFileColor(fileType: ProjectItem['fileType']): string {
    switch (fileType) {
        case 'page': return '#2196F3';
        case 'component': return '#4CAF50';
        case 'hook': return '#9C27B0';
        case 'context': return '#FF5722';
        case 'types': return '#607D8B';
        case 'utility': return '#FF9800';
        default: return '#666';
    }
}

// Структура проекта (статичная для начала)
const projectStructure = {
    'app': {
        files: ['page.tsx', 'layout.tsx', 'context.tsx', 'types.ts', 'globals.css'],
        folders: {
            'common': {
                files: ['QuickNotes.tsx', 'context_dnd.tsx', 'context_misc.tsx'],
                folders: {}
            },
            'init': {
                files: ['logger.tsx', 'usePersistentState.ts', 'useWindowSize.ts'],
                folders: {
                    'sync': {
                        files: ['CustomProgress.tsx', '_syncData.tsx', '_uploadData.tsx', 'usePerformUpload.ts', 'useSetupSubscription.ts', 'realtimeSubscription.ts', 'useNetworkMonitoring.ts', 'showNetworkToast.tsx', 'useTestSubscription.ts', 'useReloadAllItems.tsx', 'compareWithRemote.ts'],
                        folders: {}
                    },
                    'dbase': {
                        files: ['dataInitializer.tsx', 'supabaseClient.ts', 'initialData.ts'],
                        folders: {}
                    },
                    'providers': {
                        files: ['ThemeToggle.tsx', 'mobDtToggle.tsx', 'HeroUIProvider.tsx', 'ClerkProvider.tsx', 'MobileDetect.tsx', 'ThemeProvider.tsx', 'themeScript.ts', 'themeIcons.tsx'],
                        folders: {}
                    }
                }
            },
            'main': {
                files: [],
                folders: {}
            },
            'mobile': {
                files: [],
                folders: {}
            },
            'win_calendar': {
                files: ['page.tsx'],
                folders: {}
            },
            'win_money': {
                files: [],
                folders: {}
            }
        }
    }
};

// Получение элементов текущего уровня
function getCurrentLevelItems(path: string): ProjectItem[] {
    const pathParts = path.split('/');
    let current: any = projectStructure;

    for (const part of pathParts) {
        current = current[part];
        if (!current) return [];
    }

    const items: ProjectItem[] = [];

    // Добавляем файлы
    if (current.files) {
        current.files.forEach((fileName: string) => {
            items.push({
                id: `${path}/${fileName}`,
                name: fileName,
                path: `${path}/${fileName}`,
                type: 'file',
                fileType: getFileType(fileName),
                imports: [],
                exports: []
            });
        });
    }

    // Добавляем папки
    if (current.folders) {
        Object.keys(current.folders).forEach(folderName => {
            items.push({
                id: `${path}/${folderName}`,
                name: folderName,
                path: `${path}/${folderName}`,
                type: 'folder'
            });
        });
    }

    return items;
}

export default function ProjectVisualizerPage() {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [currentPath, setCurrentPath] = useState<string>('app');
    const [breadcrumbs, setBreadcrumbs] = useState<string[]>(['app']);
    const [isLoading, setIsLoading] = useState(false);

    // Генерация узлов для текущего уровня
    const generateNodesForLevel = useCallback((path: string) => {
        const items = getCurrentLevelItems(path);
        const newNodes: ProjectNode[] = [];

        items.forEach((item, index) => {
            const x = (index % 6) * 200 + 100;
            const y = Math.floor(index / 6) * 150 + 100;

            const isFolder = item.type === 'folder';
            const color = isFolder ? '#FFA726' : getFileColor(item.fileType);

            newNodes.push({
                id: item.id,
                type: 'default',
                position: { x, y },
                data: {
                    ...item,
                    label: isFolder ? `📁 ${item.name}` : item.name,
                    isClickable: isFolder
                },
                style: {
                    background: color,
                    color: 'white',
                    border: `2px solid ${color}`,
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 'bold',
                    cursor: isFolder ? 'pointer' : 'default',
                    minWidth: 120,
                    textAlign: 'center'
                }
            });
        });

        setNodes(newNodes);
        setEdges([]); // Пока без связей между уровнями
    }, [setNodes, setEdges]);

    // Навигация в папку
    const navigateToFolder = useCallback((folderPath: string) => {
        setCurrentPath(folderPath);
        const pathParts = folderPath.split('/');
        setBreadcrumbs(pathParts);
        generateNodesForLevel(folderPath);
    }, [generateNodesForLevel]);

    // Навигация назад
    const navigateBack = useCallback(() => {
        if (breadcrumbs.length > 1) {
            const newBreadcrumbs = breadcrumbs.slice(0, -1);
            const newPath = newBreadcrumbs.join('/');
            setBreadcrumbs(newBreadcrumbs);
            setCurrentPath(newPath);
            generateNodesForLevel(newPath);
        }
    }, [breadcrumbs, generateNodesForLevel]);

    // Навигация по хлебным крошкам
    const navigateToBreadcrumb = useCallback((index: number) => {
        const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
        const newPath = newBreadcrumbs.join('/');
        setBreadcrumbs(newBreadcrumbs);
        setCurrentPath(newPath);
        generateNodesForLevel(newPath);
    }, [breadcrumbs, generateNodesForLevel]);

    // Обработка кликов по узлам
    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        if (node.data.type === 'folder') {
            navigateToFolder(node.data.path);
        }
    }, [navigateToFolder]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    // Инициализация
    useEffect(() => {
        generateNodesForLevel('app');
    }, [generateNodesForLevel]);

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="p-4 border-b border-gray-700">
                <h1 className="text-2xl font-bold mb-4">
                    Project Structure Visualizer
                    <span className="text-sm text-gray-400 ml-2">
                        (Навигация по уровням)
                    </span>
                </h1>

                {/* Хлебные крошки */}
                <div className="mb-4">
                    <div className="flex items-center space-x-2 text-sm">
                        <span className="text-gray-400">Путь:</span>
                        {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={index}>
                                <button
                                    className={`px-2 py-1 rounded transition-colors ${
                                        index === breadcrumbs.length - 1
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                                    }`}
                                    onClick={() => navigateToBreadcrumb(index)}
                                >
                                    {crumb}
                                </button>
                                {index < breadcrumbs.length - 1 && (
                                    <span className="text-gray-500">/</span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Кнопки управления */}
                <div className="space-x-2 mb-4">
                    <button
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
                        onClick={navigateBack}
                        disabled={breadcrumbs.length <= 1}
                    >
                        ← Назад
                    </button>
                    <button
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
                        onClick={() => navigateToFolder('app')}
                    >
                        🏠 В корень
                    </button>
                </div>

                {/* Легенда */}
                <div className="mb-4">
                    <h3 className="text-sm font-semibold mb-2">Легенда:</h3>
                    <div className="flex flex-wrap gap-3 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{backgroundColor: '#FFA726'}}></div>
                            <span>📁 Папки (кликабельны)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{backgroundColor: getFileColor('page')}}></div>
                            <span>Pages</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{backgroundColor: getFileColor('component')}}></div>
                            <span>Components</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{backgroundColor: getFileColor('hook')}}></div>
                            <span>Hooks</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{backgroundColor: getFileColor('context')}}></div>
                            <span>Context</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* React Flow Graph */}
            <div style={{ width: '100%', height: 'calc(100vh - 300px)' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    fitView
                    className="bg-gray-800"
                >
                    <Controls className="bg-gray-700 border-gray-600" />
                    <MiniMap
                        className="bg-gray-700 border-gray-600"
                        nodeColor={(node) =>
                            node.data.type === 'folder' ? '#FFA726' : getFileColor(node.data.fileType)
                        }
                    />
                    <Background
                        variant={BackgroundVariant.Dots}
                        gap={12}
                        size={1}
                        color="#333"
                    />
                </ReactFlow>
            </div>

            <div className="p-4 border-t border-gray-700 text-sm text-gray-400">
                <p>💡 <strong>Совет:</strong> Кликните на 📁 папку чтобы войти в неё • Используйте хлебные крошки для быстрой навигации</p>
            </div>
        </div>
    );
}