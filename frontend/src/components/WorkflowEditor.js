import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  Tooltip,
  Menu,
  MenuItem as MenuItemComponent,
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Fab
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Settings,
  PlayArrow,
  Stop,
  ArrowForward,
  Circle,
  CheckCircle,
  Cancel,
  Schedule,
  Assignment,
  Notifications,
  Code,
  Webhook,
  Email,
  Sms
} from '@mui/icons-material';

const WorkflowEditor = ({ workflowType, statuses, transitions, onSave, onStatusCreate, onTransitionCreate }) => {
  const canvasRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [draggedNode, setDraggedNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Dialogs
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false);
  const [edgeDialogOpen, setEdgeDialogOpen] = useState(false);
  const [conditionsDialogOpen, setConditionsDialogOpen] = useState(false);
  const [actionsDialogOpen, setActionsDialogOpen] = useState(false);

  // Forms
  const [nodeForm, setNodeForm] = useState({
    id: '',
    type: 'status',
    label: '',
    description: '',
    color: '#6c757d',
    icon: 'circle',
    category: 'active',
    isInitial: false,
    isFinal: false,
    slaHours: null,
    position: { x: 0, y: 0 }
  });

  const [edgeForm, setEdgeForm] = useState({
    id: '',
    source: '',
    target: '',
    label: '',
    description: '',
    color: '#007bff',
    isAutomatic: false,
    requiresComment: false,
    requiresAssignment: false,
    allowedRoles: [],
    conditions: [],
    actions: []
  });

  const [conditionForm, setConditionForm] = useState({
    type: 'field',
    fieldName: '',
    operator: 'equals',
    expectedValue: '',
    group: 1
  });

  const [actionForm, setActionForm] = useState({
    type: 'notify',
    config: {}
  });

  // Initialize nodes and edges from props
  useEffect(() => {
    if (statuses && transitions) {
      initializeWorkflow();
    }
  }, [statuses, transitions]);

  const initializeWorkflow = () => {
    // Create nodes from statuses
    const statusNodes = statuses.map((status, index) => ({
      id: status.id,
      type: 'status',
      label: status.displayName?.ru || status.name,
      description: status.description?.ru || '',
      color: status.color,
      icon: status.icon,
      category: status.category,
      isInitial: status.isInitial,
      isFinal: status.isFinal,
      slaHours: status.slaHours,
      position: {
        x: 100 + (index % 4) * 200,
        y: 100 + Math.floor(index / 4) * 150
      },
      data: status
    }));

    // Create edges from transitions
    const transitionEdges = transitions.map(transition => ({
      id: transition.id,
      source: transition.fromStatusId || 'start',
      target: transition.toStatusId,
      label: transition.displayName?.ru || transition.name,
      description: transition.description?.ru || '',
      color: transition.color,
      isAutomatic: transition.isAutomatic,
      requiresComment: transition.requiresComment,
      requiresAssignment: transition.requiresAssignment,
      allowedRoles: transition.allowedRoles || [],
      conditions: transition.WorkflowConditions || [],
      actions: transition.WorkflowActions || [],
      data: transition
    }));

    setNodes(statusNodes);
    setEdges(transitionEdges);
  };

  const handleCanvasMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    // Check if clicking on a node
    const clickedNode = nodes.find(node => 
      x >= node.position.x && x <= node.position.x + 120 &&
      y >= node.position.y && y <= node.position.y + 80
    );

    if (clickedNode) {
      if (isConnecting) {
        // End connection
        if (connectionStart && connectionStart.id !== clickedNode.id) {
          createConnection(connectionStart, clickedNode);
        }
        setIsConnecting(false);
        setConnectionStart(null);
      } else {
        // Start dragging node
        setSelectedNode(clickedNode);
        setDraggedNode(clickedNode);
        setDragOffset({
          x: x - clickedNode.position.x,
          y: y - clickedNode.position.y
        });
        setIsDragging(true);
      }
    } else {
      // Clear selection
      setSelectedNode(null);
      setSelectedEdge(null);
    }

    setMousePosition({ x, y });
  };

  const handleCanvasMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    setMousePosition({ x, y });

    if (isDragging && draggedNode) {
      // Update node position
      setNodes(prev => prev.map(node => 
        node.id === draggedNode.id 
          ? { ...node, position: { x: x - dragOffset.x, y: y - dragOffset.y } }
          : node
      ));
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setDraggedNode(null);
  };

  const createConnection = (sourceNode, targetNode) => {
    const newEdge = {
      id: `edge-${Date.now()}`,
      source: sourceNode.id,
      target: targetNode.id,
      label: `${sourceNode.label} → ${targetNode.label}`,
      description: '',
      color: '#007bff',
      isAutomatic: false,
      requiresComment: false,
      requiresAssignment: false,
      allowedRoles: [],
      conditions: [],
      actions: []
    };

    setEdges(prev => [...prev, newEdge]);
    setSelectedEdge(newEdge);
    setEdgeForm(newEdge);
    setEdgeDialogOpen(true);
  };

  const handleNodeDoubleClick = (node) => {
    setSelectedNode(node);
    setNodeForm({
      ...node,
      label: node.label,
      description: node.description
    });
    setNodeDialogOpen(true);
  };

  const handleEdgeDoubleClick = (edge) => {
    setSelectedEdge(edge);
    setEdgeForm(edge);
    setEdgeDialogOpen(true);
  };

  const handleAddNode = () => {
    const newNode = {
      id: `node-${Date.now()}`,
      type: 'status',
      label: 'Новый статус',
      description: '',
      color: '#6c757d',
      icon: 'circle',
      category: 'active',
      isInitial: false,
      isFinal: false,
      slaHours: null,
      position: { x: mousePosition.x, y: mousePosition.y }
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNode(newNode);
    setNodeForm(newNode);
    setNodeDialogOpen(true);
  };

  const handleDeleteNode = (nodeId) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setEdges(prev => prev.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
  };

  const handleDeleteEdge = (edgeId) => {
    setEdges(prev => prev.filter(edge => edge.id !== edgeId));
    setSelectedEdge(null);
  };

  const handleSaveNode = () => {
    setNodes(prev => prev.map(node => 
      node.id === nodeForm.id ? { ...node, ...nodeForm } : node
    ));
    setNodeDialogOpen(false);
  };

  const handleSaveEdge = () => {
    setEdges(prev => prev.map(edge => 
      edge.id === edgeForm.id ? { ...edge, ...edgeForm } : edge
    ));
    setEdgeDialogOpen(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.3));
  };

  const handleCenterView = () => {
    if (nodes.length === 0) return;

    const bounds = nodes.reduce((acc, node) => ({
      minX: Math.min(acc.minX, node.position.x),
      maxX: Math.max(acc.maxX, node.position.x + 120),
      minY: Math.min(acc.minY, node.position.y),
      maxY: Math.max(acc.maxY, node.position.y + 80)
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const canvasRect = canvasRef.current.getBoundingClientRect();

    setPan({
      x: canvasRect.width / 2 - centerX * zoom,
      y: canvasRect.height / 2 - centerY * zoom
    });
  };

  const renderNode = (node) => {
    const isSelected = selectedNode?.id === node.id;
    const nodeStyle = {
      position: 'absolute',
      left: node.position.x,
      top: node.position.y,
      width: 120,
      height: 80,
      border: isSelected ? '2px solid #1976d2' : '1px solid #ccc',
      borderRadius: 8,
      backgroundColor: node.color,
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      userSelect: 'none',
      boxShadow: isSelected ? '0 4px 8px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
    };

    return (
      <div
        key={node.id}
        style={nodeStyle}
        onDoubleClick={() => handleNodeDoubleClick(node)}
        onContextMenu={(e) => {
          e.preventDefault();
          // Show context menu
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
          {node.label}
        </div>
        {node.isInitial && (
          <Chip size="small" label="Начальный" sx={{ mt: 0.5, fontSize: 8 }} />
        )}
        {node.isFinal && (
          <Chip size="small" label="Финальный" sx={{ mt: 0.5, fontSize: 8 }} />
        )}
        {node.slaHours && (
          <div style={{ fontSize: 10, marginTop: 2 }}>
            SLA: {node.slaHours}ч
          </div>
        )}
      </div>
    );
  };

  const renderEdge = (edge) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    if (!sourceNode || !targetNode) return null;

    const startX = sourceNode.position.x + 60;
    const startY = sourceNode.position.y + 40;
    const endX = targetNode.position.x + 60;
    const endY = targetNode.position.y + 40;

    const isSelected = selectedEdge?.id === edge.id;

    return (
      <g key={edge.id}>
        <defs>
          <marker
            id={`arrowhead-${edge.id}`}
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill={isSelected ? '#1976d2' : edge.color}
            />
          </marker>
        </defs>
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={isSelected ? '#1976d2' : edge.color}
          strokeWidth={isSelected ? 3 : 2}
          markerEnd={`url(#arrowhead-${edge.id})`}
          style={{ cursor: 'pointer' }}
          onDoubleClick={() => handleEdgeDoubleClick(edge)}
        />
        <text
          x={(startX + endX) / 2}
          y={(startY + endY) / 2 - 10}
          textAnchor="middle"
          fontSize="12"
          fill="#333"
          style={{ cursor: 'pointer' }}
          onDoubleClick={() => handleEdgeDoubleClick(edge)}
        >
          {edge.label}
        </text>
        {edge.isAutomatic && (
          <circle
            cx={(startX + endX) / 2}
            cy={(startY + endY) / 2 + 10}
            r="8"
            fill="#4caf50"
            style={{ cursor: 'pointer' }}
          />
        )}
      </g>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Paper sx={{ p: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Add />}
          onClick={handleAddNode}
        >
          Добавить статус
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ArrowForward />}
          onClick={() => setIsConnecting(!isConnecting)}
          color={isConnecting ? 'primary' : 'inherit'}
        >
          {isConnecting ? 'Отменить связь' : 'Создать переход'}
        </Button>
        <Divider orientation="vertical" flexItem />
        <IconButton size="small" onClick={handleZoomIn}>
          <ZoomIn />
        </IconButton>
        <IconButton size="small" onClick={handleZoomOut}>
          <ZoomOut />
        </IconButton>
        <IconButton size="small" onClick={handleCenterView}>
          <CenterFocusStrong />
        </IconButton>
        <Typography variant="body2" sx={{ ml: 1 }}>
          {Math.round(zoom * 100)}%
        </Typography>
        <Divider orientation="vertical" flexItem />
        <Button
          variant="contained"
          size="small"
          startIcon={<Save />}
          onClick={() => onSave && onSave({ nodes, edges })}
        >
          Сохранить
        </Button>
      </Paper>

      {/* Canvas */}
      <Paper
        ref={canvasRef}
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          cursor: isConnecting ? 'crosshair' : 'default'
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            position: 'relative'
          }}
        >
          {/* SVG for edges */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          >
            {edges.map(renderEdge)}
            {/* Connection preview */}
            {isConnecting && connectionStart && (
              <line
                x1={connectionStart.position.x + 60}
                y1={connectionStart.position.y + 40}
                x2={mousePosition.x}
                y2={mousePosition.y}
                stroke="#1976d2"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
            )}
          </svg>

          {/* Nodes */}
          {nodes.map(renderNode)}
        </div>
      </Paper>

      {/* Properties Panel */}
      {(selectedNode || selectedEdge) && (
        <Paper sx={{ p: 2, mt: 1, maxHeight: 200, overflow: 'auto' }}>
          {selectedNode && (
            <Box>
              <Typography variant="h6" mb={1}>
                Свойства статуса: {selectedNode.label}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Chip
                    size="small"
                    label={selectedNode.category}
                    sx={{ backgroundColor: selectedNode.color, color: 'white' }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Box display="flex" gap={1}>
                    <Button size="small" startIcon={<Edit />} onClick={() => handleNodeDoubleClick(selectedNode)}>
                      Редактировать
                    </Button>
                    <Button size="small" color="error" startIcon={<Delete />} onClick={() => handleDeleteNode(selectedNode.id)}>
                      Удалить
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {selectedEdge && (
            <Box>
              <Typography variant="h6" mb={1}>
                Свойства перехода: {selectedEdge.label}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box display="flex" gap={1}>
                    {selectedEdge.isAutomatic && <Chip size="small" label="Автоматический" color="success" />}
                    {selectedEdge.requiresComment && <Chip size="small" label="Требует комментарий" />}
                    {selectedEdge.requiresAssignment && <Chip size="small" label="Требует назначение" />}
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box display="flex" gap={1}>
                    <Button size="small" startIcon={<Edit />} onClick={() => handleEdgeDoubleClick(selectedEdge)}>
                      Редактировать
                    </Button>
                    <Button size="small" color="error" startIcon={<Delete />} onClick={() => handleDeleteEdge(selectedEdge.id)}>
                      Удалить
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>
      )}

      {/* Node Edit Dialog */}
      <Dialog open={nodeDialogOpen} onClose={() => setNodeDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Редактировать статус</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Название"
                value={nodeForm.label}
                onChange={(e) => setNodeForm(prev => ({ ...prev, label: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Категория</InputLabel>
                <Select
                  value={nodeForm.category}
                  onChange={(e) => setNodeForm(prev => ({ ...prev, category: e.target.value }))}
                  label="Категория"
                >
                  <MenuItem value="open">Открыт</MenuItem>
                  <MenuItem value="active">Активен</MenuItem>
                  <MenuItem value="pending">Ожидание</MenuItem>
                  <MenuItem value="resolved">Решен</MenuItem>
                  <MenuItem value="closed">Закрыт</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Описание"
                value={nodeForm.description}
                onChange={(e) => setNodeForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="color"
                label="Цвет"
                value={nodeForm.color}
                onChange={(e) => setNodeForm(prev => ({ ...prev, color: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="SLA (часы)"
                value={nodeForm.slaHours || ''}
                onChange={(e) => setNodeForm(prev => ({ 
                  ...prev, 
                  slaHours: e.target.value ? parseInt(e.target.value) : null 
                }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={nodeForm.isInitial}
                    onChange={(e) => setNodeForm(prev => ({ ...prev, isInitial: e.target.checked }))}
                  />
                }
                label="Начальный статус"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={nodeForm.isFinal}
                    onChange={(e) => setNodeForm(prev => ({ ...prev, isFinal: e.target.checked }))}
                  />
                }
                label="Финальный статус"
                sx={{ ml: 2 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNodeDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSaveNode} variant="contained">Сохранить</Button>
        </DialogActions>
      </Dialog>

      {/* Edge Edit Dialog */}
      <Dialog open={edgeDialogOpen} onClose={() => setEdgeDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Редактировать переход</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Название"
                value={edgeForm.label}
                onChange={(e) => setEdgeForm(prev => ({ ...prev, label: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="color"
                label="Цвет"
                value={edgeForm.color}
                onChange={(e) => setEdgeForm(prev => ({ ...prev, color: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Описание"
                value={edgeForm.description}
                onChange={(e) => setEdgeForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={edgeForm.isAutomatic}
                    onChange={(e) => setEdgeForm(prev => ({ ...prev, isAutomatic: e.target.checked }))}
                  />
                }
                label="Автоматический переход"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={edgeForm.requiresComment}
                    onChange={(e) => setEdgeForm(prev => ({ ...prev, requiresComment: e.target.checked }))}
                  />
                }
                label="Требует комментарий"
                sx={{ ml: 2 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={edgeForm.requiresAssignment}
                    onChange={(e) => setEdgeForm(prev => ({ ...prev, requiresAssignment: e.target.checked }))}
                  />
                }
                label="Требует назначение"
              />
            </Grid>
            <Grid item xs={12}>
              <Box display="flex" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<Settings />}
                  onClick={() => setConditionsDialogOpen(true)}
                >
                  Условия ({edgeForm.conditions?.length || 0})
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PlayArrow />}
                  onClick={() => setActionsDialogOpen(true)}
                >
                  Действия ({edgeForm.actions?.length || 0})
                </Button>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdgeDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleSaveEdge} variant="contained">Сохранить</Button>
        </DialogActions>
      </Dialog>

      {/* Help Text */}
      {nodes.length === 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'text.secondary'
          }}
        >
          <Typography variant="h6" mb={2}>
            Добро пожаловать в редактор Workflow!
          </Typography>
          <Typography variant="body2" mb={2}>
            Нажмите "Добавить статус" чтобы начать создание workflow
          </Typography>
          <Typography variant="body2">
            Используйте "Создать переход" для связывания статусов
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default WorkflowEditor;