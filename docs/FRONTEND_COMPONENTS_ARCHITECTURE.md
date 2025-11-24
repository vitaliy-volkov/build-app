# Архитектура фронтенд компонентов для системы технического надзора

## 🏗️ Общая архитектура

### Структура приложения
```
src/
├── components/           # Переиспользуемые компоненты
├── pages/               # Страницы/экраны
├── layouts/             # Layout компоненты
├── hooks/               # Custom hooks
├── stores/              # State management
├── services/            # API сервисы
├── utils/               # Утилиты
├── types/               # TypeScript типы
└── assets/              # Статические ресурсы
```

### Технологический стек
- **React 18** с TypeScript
- **React Router v6** для навигации
- **Zustand** для state management
- **React Query** для server state
- **Fabric.js** для canvas рисования
- **React PDF** для просмотра PDF
- **React Hook Form** для форм
- **TailwindCSS** для стилей
- **Framer Motion** для анимаций

## 🎨 Core компоненты

### 1. PDFViewer - Просмотр PDF чертежей

```typescript
interface PDFViewerProps {
  drawing: Drawing;
  annotations: Annotation[];
  mode: 'view' | 'annotate' | 'compare';
  currentPage: number;
  onPageChange: (page: number) => void;
  onAnnotationCreate: (annotation: Annotation) => void;
  onAnnotationUpdate: (annotation: Annotation) => void;
  onAnnotationDelete: (id: string) => void;
  className?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  drawing,
  annotations,
  mode,
  currentPage,
  onPageChange,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
  className
}) => {
  const [scale, setScale] = useState(1);
  const [viewport, setViewport] = useState<Viewport>();
  const [isLoading, setIsLoading] = useState(true);
  
  return (
    <div className="pdf-viewer">
      <PDFControls
        scale={scale}
        onScaleChange={setScale}
        currentPage={currentPage}
        totalPages={drawing.pageCount}
        onPageChange={onPageChange}
      />
      
      <PDFCanvas
        drawing={drawing}
        pageNumber={currentPage}
        scale={scale}
        annotations={annotations.filter(a => a.pageNumber === currentPage)}
        mode={mode}
        onAnnotationCreate={onAnnotationCreate}
        onAnnotationUpdate={onAnnotationUpdate}
        onAnnotationDelete={onAnnotationDelete}
      />
      
      <PDFNavigation
        currentPage={currentPage}
        totalPages={drawing.pageCount}
        onPageChange={onPageChange}
      />
    </div>
  );
};
```

### 2. DrawingCanvas - Canvas для разметки

```typescript
interface DrawingCanvasProps {
  pdfPage: PDFPage;
  annotations: Annotation[];
  tool: AnnotationTool;
  onAnnotationCreate: (annotation: Annotation) => void;
  onAnnotationUpdate: (annotation: Annotation) => void;
  onAnnotationDelete: (id: string) => void;
  disabled?: boolean;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  pdfPage,
  annotations,
  tool,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
  disabled = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas>();
  const [isDrawing, setIsDrawing] = useState(false);
  
  useEffect(() => {
    // Инициализация Fabric.js canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: pdfPage.width * scale,
      height: pdfPage.height * scale,
      selection: !disabled
    });
    
    fabricCanvasRef.current = canvas;
    
    // Загрузка фонового изображения (PDF страница)
    loadPDFPageAsBackground(canvas, pdfPage);
    
    // Загрузка существующих аннотаций
    loadAnnotations(canvas, annotations);
    
    // Настройка инструментов
    setupDrawingTool(canvas, tool);
    
    return () => {
      canvas.dispose();
    };
  }, [pdfPage, scale]);
  
  const handleCanvasClick = useCallback((e: fabric.IEvent) => {
    if (disabled || !tool) return;
    
    const pointer = canvas.getPointer(e.e);
    const annotation = createAnnotationFromTool(tool, pointer);
    
    onAnnotationCreate(annotation);
  }, [tool, disabled, onAnnotationCreate]);
  
  return (
    <div className="drawing-canvas-container">
      <canvas ref={canvasRef} />
      {isDrawing && <DrawingIndicator />}
    </div>
  );
};
```

### 3. AnnotationTools - Панель инструментов

```typescript
interface AnnotationToolsProps {
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  onPropertiesChange: (properties: AnnotationProperties) => void;
  availableTools: AnnotationTool[];
  disabled?: boolean;
}

const AnnotationTools: React.FC<AnnotationToolsProps> = ({
  activeTool,
  onToolChange,
  onPropertiesChange,
  availableTools,
  disabled = false
}) => {
  const [showProperties, setShowProperties] = useState(false);
  
  return (
    <div className="annotation-tools">
      <ToolPalette
        tools={availableTools}
        activeTool={activeTool}
        onToolSelect={onToolChange}
        disabled={disabled}
      />
      
      <ToolProperties
        tool={activeTool}
        onChange={onPropertiesChange}
        visible={showProperties}
        onToggle={setShowProperties}
      />
      
      <AITools
        onSuggestAnnotations={handleAISuggestions}
        onAutoDetect={handleAIDetection}
        disabled={disabled}
      />
    </div>
  );
};
```

### 4. VersionComparison - Сравнение версий

```typescript
interface VersionComparisonProps {
  drawing: Drawing;
  fromVersion: number;
  toVersion: number;
  comparison: VersionComparison;
  onVersionChange: (from: number, to: number) => void;
}

const VersionComparison: React.FC<VersionComparisonProps> = ({
  drawing,
  fromVersion,
  toVersion,
  comparison,
  onVersionChange
}) => {
  const [viewMode, setViewMode] = useState<'overlay' | 'side-by-side' | 'slider'>('overlay');
  const [highlightChanges, setHighlightChanges] = useState(true);
  
  return (
    <div className="version-comparison">
      <ComparisonControls
        viewMode={viewMode}
        onModeChange={setViewMode}
        highlightChanges={highlightChanges}
        onHighlightChange={setHighlightChanges}
      />
      
      <VersionSlider
        drawing={drawing}
        fromVersion={fromVersion}
        toVersion={toVersion}
        onChange={onVersionChange}
      />
      
      <ComparisonViewer
        mode={viewMode}
        fromVersion={fromVersion}
        toVersion={toVersion}
        comparison={comparison}
        highlightChanges={highlightChanges}
      />
      
      <ChangeList
        changes={comparison.changes}
        filters={['added', 'removed', 'modified']}
      />
    </div>
  );
};
```

## 📱 Мобильные компоненты (React Native)

### 1. MobilePDFViewer

```typescript
interface MobilePDFViewerProps {
  drawing: Drawing;
  annotations: Annotation[];
  mode: 'view' | 'annotate';
  onPageChange: (page: number) => void;
  onAnnotationCreate: (annotation: Annotation) => void;
}

const MobilePDFViewer: React.FC<MobilePDFViewerProps> = ({
  drawing,
  annotations,
  mode,
  onPageChange,
  onAnnotationCreate
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  
  return (
    <View style={styles.container}>
      <PDFControls
        scale={scale}
        onScaleChange={setScale}
        currentPage={currentPage}
        totalPages={drawing.pageCount}
        onPageChange={setCurrentPage}
      />
      
      <ScrollView
        horizontal
        pagingEnabled
        onMomentumScrollEnd={handlePageChange}
      >
        {drawing.pages.map((page) => (
          <PDFPage
            key={page.pageNumber}
            page={page}
            scale={scale}
            annotations={annotations.filter(a => a.pageNumber === page.pageNumber)}
            mode={mode}
            onAnnotationCreate={onAnnotationCreate}
          />
        ))}
      </ScrollView>
      
      <AnnotationToolbar
        mode={mode}
        onToolSelect={handleToolSelect}
      />
    </View>
  );
};
```

### 2. MobileAnnotationCanvas

```typescript
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

interface MobileAnnotationCanvasProps {
  pdfPage: PDFPage;
  annotations: Annotation[];
  tool: AnnotationTool;
  onAnnotationCreate: (annotation: Annotation) => void;
}

const MobileAnnotationCanvas: React.FC<MobileAnnotationCanvasProps> = ({
  pdfPage,
  annotations,
  tool,
  onAnnotationCreate
}) => {
  const [paths, setPaths] = useState<Path[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const handleTouch = useCallback((touch: TouchEvent) => {
    if (!tool || isDrawing) return;
    
    const newPath = createPathFromTouch(touch, tool);
    setPaths(prev => [...prev, newPath]);
    setIsDrawing(true);
  }, [tool, isDrawing]);
  
  return (
    <Canvas style={styles.canvas}>
      {/* Фоновое изображение PDF страницы */}
      <Image
        image={pdfPage.image}
        x={0}
        y={0}
        width={pdfPage.width}
        height={pdfPage.height}
      />
      
      {/* Существующие аннотации */}
      {annotations.map(annotation => (
        <AnnotationRenderer
          key={annotation.id}
          annotation={annotation}
        />
      ))}
      
      {/* Текущий рисунок */}
      {paths.map((path, index) => (
        <Path
          key={index}
          path={path}
          color={tool.properties.color}
          strokeWidth={tool.properties.strokeWidth}
        />
      ))}
      
      {/* Обработка касаний */}
      <TouchHandler
        onTouchStart={handleTouch}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </Canvas>
  );
};
```

## 🗂️ Структура страниц

### 1. DrawingViewerPage

```typescript
const DrawingViewerPage: React.FC = () => {
  const { drawingId } = useParams<{ drawingId: string }>();
  const { data: drawing, isLoading } = useDrawing(drawingId!);
  const { data: annotations } = useAnnotations(drawingId!);
  const [mode, setMode] = useState<'view' | 'annotate' | 'compare'>('view');
  const [currentPage, setCurrentPage] = useState(1);
  
  const handleAnnotationCreate = useCallback((annotation: CreateAnnotationRequest) => {
    return createAnnotation(drawingId!, annotation);
  }, [drawingId]);
  
  if (isLoading) return <LoadingSpinner />;
  if (!drawing) return <NotFound />;
  
  return (
    <PageLayout>
      <PageHeader>
        <DrawingInfo drawing={drawing} />
        <ViewModeSelector mode={mode} onModeChange={setMode} />
      </PageHeader>
      
      <PageContent>
        <PDFViewer
          drawing={drawing}
          annotations={annotations}
          mode={mode}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onAnnotationCreate={handleAnnotationCreate}
        />
        
        {mode === 'annotate' && (
          <AnnotationSidebar
            annotations={annotations}
            currentPage={currentPage}
          />
        )}
      </PageContent>
      
      <PageFooter>
        <DrawingNavigation
          drawing={drawing}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </PageFooter>
    </PageLayout>
  );
};
```

### 2. DefectManagementPage

```typescript
const DefectManagementPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: defects, isLoading } = useProjectDefects(projectId!);
  const [selectedDefect, setSelectedDefect] = useState<Defect | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  return (
    <PageLayout>
      <PageHeader>
        <PageTitle>Управление дефектами</PageTitle>
        <Button onClick={() => setShowCreateModal(true)}>
          Создать дефект
        </Button>
      </PageHeader>
      
      <PageContent>
        <DefectFilters />
        
        <DefectList
          defects={defects}
          onDefectSelect={setSelectedDefect}
          onDefectUpdate={handleDefectUpdate}
        />
        
        {selectedDefect && (
          <DefectDetails
            defect={selectedDefect}
            onClose={() => setSelectedDefect(null)}
            onUpdate={handleDefectUpdate}
          />
        )}
      </PageContent>
      
      {showCreateModal && (
        <CreateDefectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleDefectCreated}
        />
      )}
    </PageLayout>
  );
};
```

## 🔧 Custom Hooks

### 1. useDrawing

```typescript
const useDrawing = (drawingId: string) => {
  return useQuery({
    queryKey: ['drawing', drawingId],
    queryFn: () => drawingService.getDrawing(drawingId),
    enabled: !!drawingId,
    staleTime: 5 * 60 * 1000, // 5 минут
    cacheTime: 10 * 60 * 1000, // 10 минут
  });
};
```

### 2. useAnnotations

```typescript
const useAnnotations = (drawingId: string) => {
  const queryClient = useQueryClient();
  
  const { data, ...rest } = useQuery({
    queryKey: ['annotations', drawingId],
    queryFn: () => annotationService.getAnnotations(drawingId),
    enabled: !!drawingId,
  });
  
  const createAnnotation = useMutation({
    mutationFn: annotationService.createAnnotation,
    onSuccess: (newAnnotation) => {
      queryClient.setQueryData(['annotations', drawingId], (old: Annotation[] = []) => 
        [...old, newAnnotation]
      );
    },
  });
  
  const updateAnnotation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateAnnotationRequest }) =>
      annotationService.updateAnnotation(id, updates),
    onSuccess: (updatedAnnotation) => {
      queryClient.setQueryData(['annotations', drawingId], (old: Annotation[] = []) =>
        old.map(a => a.id === updatedAnnotation.id ? updatedAnnotation : a)
      );
    },
  });
  
  return {
    ...rest,
    data: data || [],
    createAnnotation: createAnnotation.mutateAsync,
    updateAnnotation: updateAnnotation.mutateAsync,
  };
};
```

### 3. useDrawingCanvas

```typescript
const useDrawingCanvas = (pdfPage: PDFPage, tool: AnnotationTool) => {
  const canvasRef = useRef<fabric.Canvas>();
  const [isReady, setIsReady] = useState(false);
  
  const initializeCanvas = useCallback(() => {
    if (!canvasRef.current || !pdfPage) return;
    
    const canvas = canvasRef.current;
    
    // Настройка canvas
    canvas.setWidth(pdfPage.width);
    canvas.setHeight(pdfPage.height);
    
    // Загрузка фона
    loadBackground(canvas, pdfPage);
    
    // Настройка инструментов
    setupTool(canvas, tool);
    
    setIsReady(true);
  }, [pdfPage, tool]);
  
  const clearCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    
    canvasRef.current.clear();
    loadBackground(canvasRef.current, pdfPage);
  }, [pdfPage]);
  
  const exportCanvas = useCallback(() => {
    if (!canvasRef.current) return null;
    
    return canvasRef.current.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2
    });
  }, []);
  
  return {
    canvasRef,
    isReady,
    initializeCanvas,
    clearCanvas,
    exportCanvas
  };
};
```

### 4. useOfflineSync

```typescript
const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingChanges, setPendingChanges] = useState<SyncChange[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  useEffect(() => {
    if (isOnline && pendingChanges.length > 0) {
      syncPendingChanges();
    }
  }, [isOnline, pendingChanges]);
  
  const addPendingChange = useCallback((change: SyncChange) => {
    setPendingChanges(prev => [...prev, change]);
  }, []);
  
  const syncPendingChanges = useCallback(async () => {
    setSyncStatus('syncing');
    
    try {
      for (const change of pendingChanges) {
        await syncService.processChange(change);
      }
      
      setPendingChanges([]);
      setSyncStatus('idle');
    } catch (error) {
      setSyncStatus('error');
      console.error('Sync failed:', error);
    }
  }, [pendingChanges]);
  
  return {
    isOnline,
    syncStatus,
    pendingChanges,
    addPendingChange,
    syncPendingChanges
  };
};
```

## 🏪 State Management (Zustand)

### 1. Drawing Store

```typescript
interface DrawingStore {
  // State
  currentDrawing: Drawing | null;
  currentPage: number;
  scale: number;
  mode: 'view' | 'annotate' | 'compare';
  selectedAnnotations: string[];
  activeTool: AnnotationTool;
  
  // Actions
  setCurrentDrawing: (drawing: Drawing) => void;
  setCurrentPage: (page: number) => void;
  setScale: (scale: number) => void;
  setMode: (mode: 'view' | 'annotate' | 'compare') => void;
  setSelectedAnnotations: (ids: string[]) => void;
  setActiveTool: (tool: AnnotationTool) => void;
  
  // Computed
  currentPageAnnotations: Annotation[];
  isAnnotating: boolean;
}

const useDrawingStore = create<DrawingStore>((set, get) => ({
  // Initial state
  currentDrawing: null,
  currentPage: 1,
  scale: 1,
  mode: 'view',
  selectedAnnotations: [],
  activeTool: DEFAULT_TOOL,
  
  // Actions
  setCurrentDrawing: (drawing) => set({ currentDrawing: drawing }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setScale: (scale) => set({ scale }),
  setMode: (mode) => set({ mode }),
  setSelectedAnnotations: (ids) => set({ selectedAnnotations: ids }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  
  // Computed
  get currentPageAnnotations() {
    const { currentDrawing, currentPage } = get();
    if (!currentDrawing) return [];
    return currentDrawing.annotations.filter(a => a.pageNumber === currentPage);
  },
  
  get isAnnotating() {
    return get().mode === 'annotate';
  }
}));
```

### 2. UI Store

```typescript
interface UIStore {
  // Layout
  sidebarOpen: boolean;
  sidebarWidth: number;
  toolbarVisible: boolean;
  
  // Theme
  theme: 'light' | 'dark';
  
  // Notifications
  notifications: Notification[];
  
  // Modals
  activeModal: string | null;
  
  // Actions
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setToolbarVisible: (visible: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  setActiveModal: (modal: string | null) => void;
}

const useUIStore = create<UIStore>((set) => ({
  // Initial state
  sidebarOpen: true,
  sidebarWidth: 300,
  toolbarVisible: true,
  theme: 'light',
  notifications: [],
  activeModal: null,
  
  // Actions
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setToolbarVisible: (visible) => set({ toolbarVisible: visible }),
  setTheme: (theme) => set({ theme }),
  addNotification: (notification) => set((state) => ({
    notifications: [...state.notifications, { ...notification, id: generateId() }]
  })),
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),
  setActiveModal: (modal) => set({ activeModal: modal })
}));
```

## 🎯 Оптимизация производительности

### 1. Ленивая загрузка компонентов

```typescript
// Ленивая загрузка тяжелых компонентов
const PDFViewer = lazy(() => import('@/components/PDFViewer'));
const AnnotationTools = lazy(() => import('@/components/AnnotationTools'));
const VersionComparison = lazy(() => import('@/components/VersionComparison'));

// Suspense boundary
const SuspenseWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<LoadingSpinner />}>
    {children}
  </Suspense>
);
```

### 2. Виртуализация списков

```typescript
import { FixedSizeList as List } from 'react-window';

const AnnotationList: React.FC<{ annotations: Annotation[] }> = ({ annotations }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <AnnotationItem annotation={annotations[index]} />
    </div>
  );
  
  return (
    <List
      height={400}
      itemCount={annotations.length}
      itemSize={60}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

### 3. Мемоизация компонентов

```typescript
const AnnotationItem = React.memo<{ annotation: Annotation }>(
  ({ annotation }) => {
    return (
      <div className="annotation-item">
        <AnnotationIcon type={annotation.type} />
        <AnnotationContent annotation={annotation} />
      </div>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.annotation.id === nextProps.annotation.id &&
           prevProps.annotation.version === nextProps.annotation.version;
  }
);
```

### 4. Debounce для поиска

```typescript
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};
```

## 🧪 Тестирование компонентов

### 1. Unit тесты

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { PDFViewer } from '@/components/PDFViewer';

describe('PDFViewer', () => {
  const mockDrawing = createMockDrawing();
  const mockAnnotations = createMockAnnotations();
  
  it('renders drawing pages correctly', () => {
    render(
      <PDFViewer
        drawing={mockDrawing}
        annotations={mockAnnotations}
        mode="view"
        currentPage={1}
        onPageChange={jest.fn()}
        onAnnotationCreate={jest.fn()}
        onAnnotationUpdate={jest.fn()}
        onAnnotationDelete={jest.fn()}
      />
    );
    
    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });
  
  it('handles page changes', () => {
    const onPageChange = jest.fn();
    
    render(
      <PDFViewer
        drawing={mockDrawing}
        annotations={mockAnnotations}
        mode="view"
        currentPage={1}
        onPageChange={onPageChange}
        onAnnotationCreate={jest.fn()}
        onAnnotationUpdate={jest.fn()}
        onAnnotationDelete={jest.fn()}
      />
    );
    
    fireEvent.click(screen.getByText('Next'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
```

### 2. Интеграционные тесты

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DrawingViewerPage } from '@/pages/DrawingViewerPage';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

describe('DrawingViewerPage Integration', () => {
  it('loads and displays drawing with annotations', async () => {
    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <DrawingViewerPage />
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
    });
    
    expect(screen.getByTestId('annotation-tools')).toBeInTheDocument();
  });
});
```

---

Эта архитектура фронтенд компонентов обеспечивает масштабируемую, производительную и тестируемую систему для работы с PDF чертежами и аннотациями в веб и мобильных приложениях.
