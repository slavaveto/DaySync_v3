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

interface ProjectFile {
    id: string;
    name: string;
    path: string;
    type: 'component' | 'page' | 'hook' | 'utility' | 'context' | 'types';
    imports: string[];
    exports: string[];
}


interface ProjectNode extends Node {
    data: ProjectFile & {
        label: string;
        isHidden?: boolean;
    };
}

// Функция для определения типа файла
function getFileType(filePath: string, fileName: string): ProjectFile['type'] {
    if (fileName.includes('page.tsx')) return 'page';
    if (fileName.startsWith('use') && fileName.endsWith('.ts')) return 'hook';
    if (fileName.toLowerCase().includes('context')) return 'context';
    if (fileName.endsWith('.ts') && !fileName.endsWith('.tsx')) return 'types';
    return 'component';
}

// Функция для получения цвета узла
function getNodeColor(type: ProjectFile['type']): string {
    switch (type) {
        case 'page': return '#2196F3';
        case 'component': return '#4CAF50';
        case 'hook': return '#9C27B0';
        case 'context': return '#FF5722';
        case 'types': return '#607D8B';
        case 'utility': return '#FF9800';
        default: return '#666';
    }
}

// Простой анализатор imports (пока без полноценного AST)
function extractImports(content: string): string[] {
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('./') || importPath.startsWith('../') || importPath.startsWith('@/')) {
            imports.push(importPath);
        }
    }

    return imports;
}

// Функция для сканирования файлов проекта
// Функция для сканирования файлов проекта
async function scanProjectFiles(): Promise<ProjectFile[]> {
    try {
        const projectFiles: ProjectFile[] = [];

        // Рекурсивно сканируем папку app
        const scanDirectory = async (dirPath: string) => {
            try {
                const response = await fetch(`/api/scan-files?path=${encodeURIComponent(dirPath)}`);
                if (!response.ok) throw new Error('Failed to scan directory');
                const files = await response.json();

                for (const file of files) {
                    if (file.type === 'file' && /\.(tsx?|jsx?)$/.test(file.name)) {
                        const fileName = file.name;
                        const filePath = file.path;
                        const fileType = getFileType(filePath, fileName);

                        // Читаем содержимое файла для анализа imports
                        const contentResponse = await fetch(`/api/read-file?path=${encodeURIComponent(filePath)}`);
                        let imports: string[] = [];

                        if (contentResponse.ok) {
                            const content = await contentResponse.text();
                            imports = extractImports(content);
                        }

                        projectFiles.push({
                            id: filePath.replace(/[^a-zA-Z0-9]/g, '-'),
                            name: fileName,
                            path: filePath,
                            type: fileType,
                            imports: imports,
                            exports: [fileName.replace(/\.(tsx?|jsx?)$/, '')],
                        });
                    } else if (file.type === 'directory') {
                        await scanDirectory(file.path);
                    }
                }
            } catch (error) {
                console.error('Error scanning directory:', dirPath, error);
            }
        };

        await scanDirectory('app');
        return projectFiles;

    } catch (error) {
        console.error('Error scanning project files:', error);
        return [];
    }
}

export default function ProjectVisualizerPage() {
    const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);  // ← Убираем типы, React Flow сам разберется
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [hiddenNodes, setHiddenNodes] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    // Генерация узлов и связей из файлов проекта
    const generateNodesAndEdges = useCallback((files: ProjectFile[]) => {
        const newNodes: ProjectNode[] = [];
        const newEdges: Edge[] = [];

        // Создаем узлы
        files.forEach((file, index) => {
            const x = (index % 8) * 200 + 100; // Размещаем в сетке
            const y = Math.floor(index / 8) * 150 + 100;

            newNodes.push({
                id: file.id,
                type: 'default',
                position: { x, y },
                data: {
                    ...file,
                    label: file.name,
                },
                style: {
                    background: getNodeColor(file.type),
                    color: 'white',
                    border: `2px solid ${getNodeColor(file.type)}`,
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 'bold',
                },
            });
        });

        // Создаем связи на основе imports (упрощенная логика)
        files.forEach((file) => {
            file.imports.forEach((importPath) => {
                // Ищем соответствующий файл для импорта
                const targetFile = files.find(f =>
                    importPath.includes(f.name.replace(/\.(tsx?|jsx?)$/, '')) ||
                    importPath.includes(f.path.replace('app/', '').replace(/\.(tsx?|jsx?)$/, ''))
                );

                if (targetFile && targetFile.id !== file.id) {
                    newEdges.push({
                        id: `${file.id}-${targetFile.id}`,
                        source: file.id,
                        target: targetFile.id,
                        type: 'smoothstep',
                        animated: true,
                        style: { stroke: '#666' },
                        label: 'imports',
                    });
                }
            });
        });

        setNodes(newNodes);
        setEdges(newEdges);
    }, [setNodes, setEdges]);

    // Загрузка файлов проекта
    useEffect(() => {
        const loadProjectFiles = async () => {
            setIsLoading(true);
            const files = await scanProjectFiles();
            setProjectFiles(files);
            generateNodesAndEdges(files);
            setIsLoading(false);
        };

        loadProjectFiles();
    }, [generateNodesAndEdges]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    // Сохранение позиций
    const saveLayout = useCallback(() => {
        const positions = nodes.reduce((acc, node) => {
            acc[node.id] = node.position;
            return acc;
        }, {} as Record<string, { x: number; y: number }>);

        localStorage.setItem('project-visualizer-positions', JSON.stringify(positions));
        localStorage.setItem('project-visualizer-hidden', JSON.stringify([...hiddenNodes]));

        alert('Layout saved!');
    }, [nodes, hiddenNodes]);

    // Загрузка позиций
    const loadLayout = useCallback(() => {
        const savedPositions = localStorage.getItem('project-visualizer-positions');

        if (savedPositions) {
            const positions = JSON.parse(savedPositions);
            setNodes((nds) =>
                nds.map((node) => ({
                    ...node,
                    position: positions[node.id] || node.position,
                }))
            );
        }
    }, [setNodes]);

    // Переобновление анализа
    const refreshAnalysis = useCallback(async () => {
        setIsLoading(true);
        const files = await scanProjectFiles();
        setProjectFiles(files);
        generateNodesAndEdges(files);
        setIsLoading(false);
    }, [generateNodesAndEdges]);

    // Скрытие/показ узла
    const toggleNodeVisibility = useCallback((nodeId: string) => {
        const newHidden = new Set(hiddenNodes);

        if (newHidden.has(nodeId)) {
            newHidden.delete(nodeId);
            const nodeToShow = projectFiles.find(f => f.id === nodeId);
            if (nodeToShow) {
                const x = Math.random() * 400 + 100;
                const y = Math.random() * 300 + 100;

                const newNode: ProjectNode = {
                    id: nodeToShow.id,
                    type: 'default',
                    position: { x, y },
                    data: { ...nodeToShow, label: nodeToShow.name },
                    style: {
                        background: getNodeColor(nodeToShow.type),
                        color: 'white',
                        border: `2px solid ${getNodeColor(nodeToShow.type)}`,
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 'bold',
                    },
                };

                setNodes((nds) => [...nds, newNode]);
            }
        } else {
            newHidden.add(nodeId);
            setNodes((nds) => nds.filter(n => n.id !== nodeId));
        }

        setHiddenNodes(newHidden);
    }, [hiddenNodes, projectFiles, setNodes]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-xl">Анализирую структуру проекта...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <div className="p-4 border-b border-gray-700">
                <h1 className="text-2xl font-bold mb-4">
                    Project Structure Visualizer
                    <span className="text-sm text-gray-400 ml-2">
                        ({projectFiles.length} файлов найдено)
                    </span>
                </h1>

                <div className="space-x-2 mb-4">
                    <button
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
                        onClick={refreshAnalysis}
                    >
                        🔄 Обновить анализ
                    </button>
                    <button
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                        onClick={saveLayout}
                    >
                        💾 Сохранить позиции
                    </button>
                    <button
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
                        onClick={loadLayout}
                    >
                        📂 Загрузить позиции
                    </button>
                </div>

                {/* Легенда типов файлов */}
                <div className="mb-4">
                    <h3 className="text-sm font-semibold mb-2">Типы файлов:</h3>
                    <div className="flex flex-wrap gap-3 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{backgroundColor: getNodeColor('page')}}></div>
                            <span>Pages</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{backgroundColor: getNodeColor('component')}}></div>
                            <span>Components</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{backgroundColor: getNodeColor('hook')}}></div>
                            <span>Hooks</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{backgroundColor: getNodeColor('context')}}></div>
                            <span>Context</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{backgroundColor: getNodeColor('types')}}></div>
                            <span>Types</span>
                        </div>
                    </div>
                </div>

                {/* Скрытые файлы */}
                {hiddenNodes.size > 0 && (
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold mb-2">Скрытые файлы ({hiddenNodes.size}):</h3>
                        <div className="flex flex-wrap gap-2">
                            {[...hiddenNodes].map(nodeId => {
                                const file = projectFiles.find(f => f.id === nodeId);
                                return file ? (
                                    <button
                                        key={nodeId}
                                        className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors"
                                        onClick={() => toggleNodeVisibility(nodeId)}
                                    >
                                        👁️ {file.name}
                                    </button>
                                ) : null;
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* React Flow Graph */}
            <div style={{ width: '100%', height: 'calc(100vh - 300px)' }}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    fitView
                    className="bg-gray-800"
                    onNodeContextMenu={(event, node) => {
                        event.preventDefault();
                        toggleNodeVisibility(node.id);
                    }}
                >
                    <Controls className="bg-gray-700 border-gray-600" />
                    <MiniMap
                        className="bg-gray-700 border-gray-600"
                        nodeColor={(node) => getNodeColor(node.data.type)}
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
                <p>💡 <strong>Tip:</strong> Перетаскивайте узлы • Правый клик чтобы скрыть • Колесо мыши для зума</p>
            </div>
        </div>
    );
}