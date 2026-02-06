
import React, { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, TaskStatus, Subject, isHexColor } from '../types';
import { Plus, PlayCircle, Trash2, GripVertical } from 'lucide-react';
import { dbService } from '../services/db';

interface KanbanBoardProps {
  tasks: Task[];
  subjects: Subject[];
  onTaskUpdate: () => void;
  onStartSession: (subjectId: string) => void;
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'done', title: 'Done' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, subjects, onTaskUpdate, onStartSession }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState<TaskStatus | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState(subjects[0]?.id || '');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const overTask = tasks.find(t => t.id === overId);
    
    // Determine target column and status
    let newStatus: TaskStatus = activeTask.status;
    if (COLUMNS.some(c => c.id === overId)) {
      newStatus = overId as TaskStatus;
    } else if (overTask) {
      newStatus = overTask.status;
    }

    // Handle Column Change
    if (activeTask.status !== newStatus) {
      // Calculate new order: append to end of list
      const columnTasks = tasks.filter(t => t.status === newStatus).sort((a, b) => a.order - b.order);
      const maxOrder = columnTasks.length > 0 ? columnTasks[columnTasks.length - 1].order : 0;

      const updatedTask = { 
        ...activeTask, 
        status: newStatus, 
        order: maxOrder + 1000,
        updatedAt: Date.now() 
      };
      await dbService.saveTask(updatedTask);
      onTaskUpdate();
    } 
    // Handle Reorder within same column
    else if (activeId !== overId) {
      const columnTasks = tasks.filter(t => t.status === newStatus).sort((a, b) => a.order - b.order);
      const oldIndex = columnTasks.findIndex(t => t.id === activeId);
      const newIndex = columnTasks.findIndex(t => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrderTasks = arrayMove(columnTasks, oldIndex, newIndex);
        
        // Update orders for all tasks in this column
        const updates = newOrderTasks.map((t, index) => ({
          ...t,
          order: (index + 1) * 1000
        }));

        await Promise.all(updates.map(t => dbService.saveTask(t)));
        onTaskUpdate();
      }
    }
  };

  const handleAddTask = async (status: TaskStatus) => {
    if (!newTaskTitle.trim()) return;
    
    // Get max order for column
    const columnTasks = tasks.filter(t => t.status === status).sort((a, b) => a.order - b.order);
    const maxOrder = columnTasks.length > 0 ? columnTasks[columnTasks.length - 1].order : 0;

    const newTask: Task = {
        id: crypto.randomUUID(),
        title: newTaskTitle.trim(),
        status,
        subjectId: newTaskSubject,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        order: maxOrder + 1000,
    };

    await dbService.saveTask(newTask);
    setIsAdding(null);
    setNewTaskTitle('');
    onTaskUpdate();
  };

  const handleDelete = async (id: string) => {
      if(window.confirm("Delete this task?")) {
        await dbService.deleteTask(id);
        onTaskUpdate();
      }
  };

  // Group tasks
  const tasksByColumn = {
      todo: tasks.filter(t => t.status === 'todo').sort((a, b) => a.order - b.order),
      'in-progress': tasks.filter(t => t.status === 'in-progress').sort((a, b) => a.order - b.order),
      // Sort done by order too for consistent DnD, was updatedAt previously
      done: tasks.filter(t => t.status === 'done').sort((a, b) => a.order - b.order),
  };

  const activeTaskData = tasks.find(t => t.id === activeId);

  return (
    <div className="h-full w-full overflow-x-auto overflow-y-hidden">
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-full gap-4 min-w-[800px] md:min-w-0">
          {COLUMNS.map(col => (
            <div key={col.id} className="flex-1 flex flex-col bg-slate-800/30 border border-slate-700/50 rounded-2xl h-full max-h-full">
              {/* Column Header */}
              <div className="p-4 flex justify-between items-center border-b border-slate-700/50 flex-none">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-200">{col.title}</h3>
                    <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">{tasksByColumn[col.id].length}</span>
                </div>
                <button onClick={() => { setIsAdding(col.id); setNewTaskTitle(''); }} className="text-slate-400 hover:text-white p-1 hover:bg-slate-700 rounded">
                    <Plus size={18} />
                </button>
              </div>

              {/* Droppable Area */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                 <SortableContext items={tasksByColumn[col.id].map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {/* Add Form */}
                    {isAdding === col.id && (
                        <div className="bg-slate-800 p-3 rounded-xl border border-indigo-500/50 shadow-lg mb-3">
                            <input 
                                autoFocus
                                className="w-full bg-transparent text-sm text-white placeholder-slate-500 mb-3 focus:outline-none"
                                placeholder="Task title..."
                                value={newTaskTitle}
                                onChange={e => setNewTaskTitle(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddTask(col.id)}
                            />
                            <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar pb-1">
                                {subjects.filter(s => !s.isArchived).map(sub => {
                                    const isHex = isHexColor(sub.color);
                                    return (
                                        <button 
                                            key={sub.id} 
                                            onClick={() => setNewTaskSubject(sub.id)}
                                            className={`w-4 h-4 rounded-full flex-none ${!isHex ? sub.color : ''} ${newTaskSubject === sub.id ? 'ring-2 ring-white scale-110' : 'opacity-50'}`}
                                            style={isHex ? { backgroundColor: sub.color } : {}}
                                        />
                                    );
                                })}
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsAdding(null)} className="text-xs text-slate-400 px-2 py-1">Cancel</button>
                                <button onClick={() => handleAddTask(col.id)} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-md">Add</button>
                            </div>
                        </div>
                    )}

                    {tasksByColumn[col.id].map(task => (
                        <SortableTask 
                            key={task.id} 
                            task={task} 
                            subject={subjects.find(s => s.id === task.subjectId)} 
                            onStartSession={onStartSession}
                            onDelete={handleDelete}
                        />
                    ))}
                    {/* Invisible Drop Zone filler if empty */}
                    {tasksByColumn[col.id].length === 0 && !isAdding && (
                         <div className="h-20 border-2 border-dashed border-slate-700/50 rounded-xl flex items-center justify-center text-slate-600 text-xs">
                             Drop items here
                         </div>
                    )}
                 </SortableContext>
              </div>
            </div>
          ))}
        </div>

        <DragOverlay>
            {activeTaskData ? (
                <div className="opacity-90 rotate-2 cursor-grabbing">
                   <TaskCard task={activeTaskData} subject={subjects.find(s => s.id === activeTaskData.subjectId)} />
                </div>
            ) : null}
        </DragOverlay>

      </DndContext>
    </div>
  );
};

// --- Sub Components ---

interface SortableTaskProps {
    task: Task;
    subject?: Subject;
    onStartSession: (id: string) => void;
    onDelete: (id: string) => void;
}

const SortableTask: React.FC<SortableTaskProps> = ({ task, subject, onStartSession, onDelete }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="touch-none">
            <TaskCard 
                task={task} 
                subject={subject} 
                dragHandleProps={{...listeners, ...attributes}} 
                onStartSession={onStartSession}
                onDelete={onDelete}
            />
        </div>
    );
};

interface TaskCardProps {
    task: Task;
    subject?: Subject;
    dragHandleProps?: any;
    onStartSession?: (id: string) => void;
    onDelete?: (id: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, subject, dragHandleProps, onStartSession, onDelete }) => {
    const color = subject?.color || '#64748b';
    const isHex = isHexColor(color);

    return (
        <div className="bg-slate-800 hover:bg-slate-750 p-3 rounded-xl border border-slate-700 shadow-sm group relative">
            <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div 
                            className={`w-2 h-2 rounded-full ${!isHex ? color : ''}`} 
                            style={isHex ? { backgroundColor: color } : {}}
                        />
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider truncate max-w-[120px]">
                            {subject?.name || 'Unknown'}
                        </span>
                    </div>
                    <p className="text-sm font-medium text-slate-200 leading-snug">{task.title}</p>
                </div>
                <div 
                    {...dragHandleProps}
                    className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing p-1 -mr-1"
                >
                    <GripVertical size={14} />
                </div>
            </div>
            
            <div className="mt-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                {task.status === 'in-progress' && onStartSession ? (
                    <button 
                        onClick={() => onStartSession(task.subjectId)}
                        className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                        <PlayCircle size={14} /> Focus
                    </button>
                ) : <div />}
                
                {onDelete && (
                    <button 
                        onClick={() => onDelete(task.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};
