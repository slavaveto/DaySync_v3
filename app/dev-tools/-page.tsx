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
    MarkerType,
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
    dependencies?: string[];
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
    if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) return 'component';
    return 'utility';
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

// Зависимости между файлами (анализ импортов)
const fileDependencies: Record<string, string[]> = {
    'app/page.tsx': ['app/context.tsx', 'app/types.ts'],
    'app/main/common/QuickNotes.tsx': ['app/main/common/context_dnd.tsx', 'app/main/common/context_misc.tsx'],
    'app/main/common/context_dnd.tsx': ['app/context.tsx'],
    'app/main/common/context_misc.tsx': ['app/context.tsx', 'app/init/usePersistentState.ts'],
    'app/dev-tools/page.tsx': ['app/types.ts'],
    'app/layout.tsx': ['app/context.tsx', 'app/init/providers/ThemeProvider.tsx'],
    'app/context.tsx': ['app/types.ts'],
};

// Реальная структура проекта с зависимостями
const projectStructure = {
    'app': {
        files: [
            { name: 'page.tsx', deps: ['app/context.tsx', 'app/types.ts'] },
            { name: 'layout.tsx', deps: ['app/context.tsx'] },
            { name: 'context.tsx', deps: ['app/types.ts'] },
            { name: 'types.ts', deps: [] },
            { name: 'globals.css', deps: [] }
        ],
        folders: {
            'api': {
                files: [],
                folders: {}
            },
            'dev-tools': {
                files: [
                    { name: 'page.tsx', deps: ['app/types.ts'] }
                ],
                folders: {}
            },
            'init': {
                files: [
                    { name: 'logger.tsx', deps: [] },
                    { name: 'usePersistentState.ts', deps: [] },
                    { name: 'useWindowSize.ts', deps: [] }
                ],
                folders: {
                    'sync': { files: [], folders: {} },
                    'dbase': { files: [], folders: {} },
                    'providers': { files: [], folders: {} }
                }
            },
            'main': {
                files: [],
                folders: {
                    'common': {
                        files: [
                            { name: 'QuickNotes.tsx', deps: ['app/main/common/context_dnd.tsx', 'app/main/common/context_misc.tsx'] },
                            { name: 'context_dnd.tsx', deps: ['app/context.tsx'] },
                            { name: 'context_misc.tsx', deps: ['app/context.tsx', 'app/init/usePersistentState.ts'] }
                        ],
                        folders: {}
                    }
                }
            },
            'win_calendar': {
                files: [],
                folders: {}
            }
        }
    }
};

// Добавить эту функцию перед компонентом
function getAllProjectFiles(): ProjectItem[] {
    const allFiles: ProjectItem[] = [];
    
    function traverseStructure(structure: any, currentPath: string) {
        if (structure.files) {
            structure.files.forEach((file: any) => {
                const fileName = typeof file === 'string' ? file : file.name;
                const deps = typeof file === 'object' ? file.deps : [];
                
                allFiles.push({
                    id: `${currentPath}/${fileName}`,
                    name: fileName,
                    path: `${currentPath}/${fileName}`,
                    type: 'file',
                    fileType: getFileType(fileName),
                    dependencies: deps,
                    imports: [],
                    exports: []
                });
            });
        }
        
        if (structure.folders) {
            Object.keys(structure.folders).forEach(folderName => {
                traverseStructure(structure.folders[folderName], `${currentPath}/${folderName}`);
            });
        }
    }
    
    traverseStructure(projectStructure.app, 'app');
    return allFiles;
}

// Получение элементов текущего уровня с зависимостями
function getCurrentLevelItems(path: string): ProjectItem[] {
    const pathParts = path.split('/').filter(part => part !== '');
    let current: any = projectStructure;

    for (const part of pathParts) {
        current = current[part];
        if (!current) return [];
    }

    const items: ProjectItem[] = [];

    // Добавляем файлы с зависимостями
    if (current.files) {
        current.files.forEach((file: any) => {
            const fileName = typeof file === 'string' ? file : file.name;
            const deps = typeof file === 'object' ? file.deps : [];

            items.push({
                id: `${path}/${fileName}`,
                name: fileName,
                path: `${path}/${fileName}`,
                type: 'file',
                fileType: getFileType(fileName),
                dependencies: deps,
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
    const [showDependencies, setShowDependencies] = useState(false);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);

    // Генерация узлов и связей для текущего уровня
    const generateNodesForLevel = useCallback((path: string) => {
        const items = getCurrentLevelItems(path);
        const newNodes: ProjectNode[] = [];
        const newEdges: Edge[] = [];

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
                    textAlign: 'center',
                    ...(selectedNode === item.id ? {
                        boxShadow: '0 0 20px rgba(255, 255, 255, 0.8)',
                        transform: 'scale(1.05)'
                    } : {})
                }
            });

            // Добавляем связи между файлами на текущем уровне
            if (showDependencies && item.dependencies && item.type === 'file') {
                item.dependencies.forEach((dep: string) => {
                    // Ищем зависимость среди ВСЕХ файлов проекта, не только текущего уровня
                    const allProjectFiles = getAllProjectFiles();
                    const targetFile = allProjectFiles.find(f => f.path === dep);
                    
                    if (targetFile) {
                        // Создаем "призрачный" узел для внешней зависимости
                        const ghostNodeId = `ghost-${dep}`;
                        const ghostExists = newNodes.find(n => n.id === ghostNodeId);
                        
                        if (!ghostExists) {
                            // Добавляем призрачный узел для внешней зависимости
                            newNodes.push({
                                id: ghostNodeId,
                                type: 'default',
                                position: { x: 50, y: 50 + newNodes.length * 100 },
                                data: {
                                    ...targetFile,
                                    label: `📎 ${targetFile.name}`,
                                    isClickable: false
                                },
                                style: {
                                    background: '#444',
                                    color: '#ccc',
                                    border: '2px dashed #666',
                                    borderRadius: 8,
                                    fontSize: 12,
                                    opacity: 0.7,
                                    minWidth: 120,
                                    textAlign: 'center'
                                }
                            });
                        }
                        
                        newEdges.push({
                            id: `${item.id}-${ghostNodeId}`,
                            source: item.id,
                            target: ghostNodeId,
                            type: 'smoothstep',
                            animated: selectedNode === item.id,
                            style: { 
                                stroke: selectedNode === item.id ? '#00ff00' : '#888',
                                strokeWidth: selectedNode === item.id ? 3 : 2,
                                strokeDasharray: '5,5' // пунктирная линия для внешних зависимостей
                            },
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                color: selectedNode === item.id ? '#00ff00' : '#888',
                            },
                        });
                    }
                    
                    // Также проверяем локальные зависимости (как было)
                    const targetInCurrentLevel = items.find(i => i.path === dep);
                    if (targetInCurrentLevel) {
                        newEdges.push({
                            id: `${item.id}-${targetInCurrentLevel.id}`,
                            source: item.id,
                            target: targetInCurrentLevel.id,
                            type: 'smoothstep',
                            animated: selectedNode === item.id || selectedNode === targetInCurrentLevel.id,
                            style: { 
                                stroke: selectedNode === item.id ? '#00ff00' : '#888',
                                strokeWidth: selectedNode === item.id ? 3 : 2
                            },
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                color: selectedNode === item.id ? '#00ff00' : '#888',
                            },
                        });
                    }
                });
            }
        });

        setNodes(newNodes);
        setEdges(newEdges);
    }, [setNodes, setEdges, showDependencies, selectedNode]);

    // Навигация в папку
    const navigateToFolder = useCallback((folderPath: string) => {
        setCurrentPath(folderPath);
        const pathParts = folderPath.split('/').filter(part => part !== '');
        setBreadcrumbs(pathParts);
        setSelectedNode(null);
        generateNodesForLevel(folderPath);
    }, [generateNodesForLevel]);

    // Навигация назад
    const navigateBack = useCallback(() => {
        if (breadcrumbs.length > 1) {
            const newBreadcrumbs = breadcrumbs.slice(0, -1);
            const newPath = newBreadcrumbs.join('/');
            setBreadcrumbs(newBreadcrumbs);
            setCurrentPath(newPath);
            setSelectedNode(null);
            generateNodesForLevel(newPath);
        }
    }, [breadcrumbs, generateNodesForLevel]);

    // Навигация по хлебным крошкам
    const navigateToBreadcrumb = useCallback((index: number) => {
        const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
        const newPath = newBreadcrumbs.join('/');
        setBreadcrumbs(newBreadcrumbs);
        setCurrentPath(newPath);
        setSelectedNode(null);
        generateNodesForLevel(newPath);
    }, [breadcrumbs, generateNodesForLevel]);

    // Обработка кликов по узлам
    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        if (node.data.type === 'folder') {
            navigateToFolder(node.data.path);
        } else {
            // Выделяем файл для показа его зависимостей
            setSelectedNode(selectedNode === node.id ? null : node.id);
        }
    }, [navigateToFolder, selectedNode]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    // Переключение отображения зависимостей
    const toggleDependencies = useCallback(() => {
        setShowDependencies(!showDependencies);
        setSelectedNode(null);
    }, [showDependencies]);

    // Обновление при изменении настроек
    useEffect(() => {
        generateNodesForLevel(currentPath);
    }, [generateNodesForLevel, currentPath, showDependencies, selectedNode]);

    // Инициализация
    useEffect(() => {
        generateNodesForLevel('app');
    }, []);

    const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode)?.data : null;

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="p-4 border-b border-gray-700">
                <h1 className="text-2xl font-bold mb-4">
                    Project Structure Visualizer
                    <span className="text-sm text-gray-400 ml-2">
                        (со связями и зависимостями)
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
                <div className="flex flex-wrap gap-2 mb-4">
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
                    <button
                        className={`px-4 py-2 rounded transition-colors ${
                            showDependencies
                                ? 'bg-purple-600 hover:bg-purple-700'
                                : 'bg-gray-600 hover:bg-gray-700'
                        }`}
                        onClick={toggleDependencies}
                    >
                        🔗 {showDependencies ? 'Скрыть связи' : 'Показать связи'}
                    </button>
                    {selectedNode && (
                        <button
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                            onClick={() => setSelectedNode(null)}
                        >
                            ✕ Сбросить выделение
                        </button>
                    )}
                </div>

                {/* Информация о выбранном файле */}
                {selectedNodeData && (
                    <div className="mb-4 p-3 bg-gray-800 rounded border-l-4 border-blue-500">
                        <h3 className="font-semibold text-blue-400 mb-2">
                            📄 {selectedNodeData.name}
                        </h3>
                        <div className="text-sm">
                            <p><span className="text-gray-400">Тип:</span> {selectedNodeData.fileType}</p>
                            <p><span className="text-gray-400">Путь:</span> {selectedNodeData.path}</p>
                            {selectedNodeData.dependencies && selectedNodeData.dependencies.length > 0 && (
                                <div className="mt-2">
                                    <span className="text-gray-400">Зависимости:</span>
                                    <ul className="mt-1 ml-4">
                                        {selectedNodeData.dependencies.map((dep: string) => (
                                            <li key={dep} className="text-green-400">→ {dep}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

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
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{backgroundColor: getFileColor('types')}}></div>
                            <span>Types</span>
                        </div>
                        {showDependencies && (
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-1 bg-gray-500" style={{clipPath: 'polygon(0 50%, 100% 0, 100% 100%)'}}></div>
                                <span>→ Зависимости</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* React Flow Graph */}
            <div style={{ width: '100%', height: 'calc(100vh - 400px)' }}>
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
                <p>💡 <strong>Навигация:</strong> 📁 папки = переход • 📄 файлы = выделение зависимостей</p>
                <p className="mt-1">🔗 Включите отображение связей для анализа зависимостей между файлами</p>
            </div>
        </div>
    );
}