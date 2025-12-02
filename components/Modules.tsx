
import React, { useState, useEffect } from 'react';
import { ToDoItem, User, ClassSchedule, Announcement, PriorityLevel, TodoCategory, AnnouncementCategory, Resource, Grade } from '../types';
import { getTodos, saveTodo, deleteTodo, getSchedule, saveScheduleItem, deleteScheduleItem, getAnnouncements, addAnnouncement, logAccess, getUsers, getResources, getGrades, generateAttendanceReport } from '../services/dataService';
import { Plus, Check, Trash2, Users, Lock, Calendar as CalendarIcon, Bell, Send, Edit2, Clock, UserCircle, Filter, Link as LinkIcon, BookOpen, Tag, Megaphone, FileText, Download, GraduationCap, Copy, MapPin, Search, Image as ImageIcon, LayoutList, ChevronLeft, ChevronRight } from 'lucide-react';
import { PERMISSIONS } from '../constants';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';
import { FileUploader } from './ui/FileUploader';
import { CustomSelect, Option } from './ui/CustomSelect';

// --- Shared Todo List Component ---

export const TodoModule: React.FC<{ user: User }> = ({ user }) => {
  const { showToast } = useToast();
  const [todos, setTodos] = useState<ToDoItem[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [schedule, setSchedule] = useState<ClassSchedule[]>([]);
  
  // View Mode
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SHARED' | 'PERSONAL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | PriorityLevel>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | TodoCategory>('ALL');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ToDoItem | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<'SHARED' | 'PERSONAL'>('SHARED');
  const [deadline, setDeadline] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('MEDIUM');
  const [category, setCategory] = useState<TodoCategory>('HOMEWORK');
  const [subject, setSubject] = useState('');
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    refreshTodos();
    setAllUsers(getUsers());
    setSchedule(getSchedule());
  }, [user]);

  // Check for deadlines on mount
  useEffect(() => {
      const now = Date.now();
      const nearFuture = now + (24 * 60 * 60 * 1000); // 24 hours
      
      const urgentTasks = todos.filter(t => 
          !t.isCompleted && 
          t.deadline && 
          t.deadline > now && 
          t.deadline < nearFuture &&
          (t.type === 'SHARED' || t.assignee === user.id)
      );

      if (urgentTasks.length > 0) {
          showToast(`You have ${urgentTasks.length} tasks due within 24 hours!`, 'warning');
      }
  }, [todos.length, user.id]);

  const refreshTodos = () => {
    const all = getTodos();
    setTodos(all.filter(t => t.type === 'SHARED' || t.createdBy === user.id || t.assignee === user.id));
  };

  const openModal = (task?: ToDoItem) => {
    if (task) {
        setEditingTask(task);
        setTitle(task.title);
        setDesc(task.description || '');
        setType(task.type);
        setDeadline(task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '');
        setAssignee(task.assignee || '');
        setPriority(task.priority || 'MEDIUM');
        setCategory(task.category || 'HOMEWORK');
        setSubject(task.subject || '');
        setSelectedDependencies(task.dependencies || []);
    } else {
        setEditingTask(null);
        setTitle('');
        setDesc('');
        setType('SHARED');
        setDeadline('');
        setAssignee(user.id);
        setPriority('MEDIUM');
        setCategory('HOMEWORK');
        setSubject('');
        setSelectedDependencies([]);
    }
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const task: ToDoItem = {
      id: editingTask ? editingTask.id : Date.now().toString(),
      title,
      description: desc,
      isCompleted: editingTask ? editingTask.isCompleted : false,
      type,
      createdBy: editingTask ? editingTask.createdBy : user.id,
      assignee: type === 'PERSONAL' ? assignee : undefined,
      createdAt: editingTask ? editingTask.createdAt : Date.now(),
      deadline: deadline ? new Date(deadline).getTime() : undefined,
      priority,
      category,
      subject,
      dependencies: selectedDependencies
    };

    saveTodo(task);
    showToast(editingTask ? 'Task updated!' : 'Task created!', 'success');
    setIsModalOpen(false);
    refreshTodos();
  };

  const handleDelete = (id: string) => {
      if(confirm('Are you sure you want to delete this task?')) {
          deleteTodo(id);
          showToast('Task deleted', 'info');
          refreshTodos();
      }
  };

  const toggleComplete = (item: ToDoItem) => {
    const blocked = isTaskBlocked(item);
    if (blocked && !item.isCompleted) {
        showToast('Cannot complete this task until dependencies are met!', 'error');
        return;
    }
    const updated = { ...item, isCompleted: !item.isCompleted };
    saveTodo(updated);
    refreshTodos();
  };

  const isTaskBlocked = (item: ToDoItem): boolean => {
      if (!item.dependencies || item.dependencies.length === 0) return false;
      const dependencies = todos.filter(t => item.dependencies?.includes(t.id));
      return dependencies.some(d => !d.isCompleted);
  };

  const visibleTodos = todos.filter(t => {
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
      if (statusFilter === 'PENDING' && t.isCompleted) return false;
      if (statusFilter === 'COMPLETED' && !t.isCompleted) return false;
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
      return true;
  }).sort((a,b) => {
     if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
     const pMap = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
     if ((pMap[a.priority] || 2) !== (pMap[b.priority] || 2)) return (pMap[b.priority] || 2) - (pMap[a.priority] || 2);
     if (a.deadline && b.deadline) return a.deadline - b.deadline;
     if (a.deadline) return -1;
     if (b.deadline) return 1;
     return 0;
  });

  const getPriorityColor = (p: PriorityLevel) => {
      switch(p) {
          case 'HIGH': return 'text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800';
          case 'MEDIUM': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
          case 'LOW': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
          default: return 'text-stone-600 bg-stone-100';
      }
  };

  const getCategoryColor = (c: TodoCategory) => {
      switch(c) {
          case 'EXAM': return 'bg-red-500';
          case 'HOMEWORK': return 'bg-blue-500';
          case 'PROJECT': return 'bg-purple-500';
          case 'ACTIVITY': return 'bg-orange-500';
          default: return 'bg-stone-500';
      }
  };

  const getCategoryBadgeClass = (c: TodoCategory) => {
      switch(c) {
          case 'EXAM': return 'text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300 border-red-200 dark:border-red-800';
          case 'HOMEWORK': return 'text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 border-blue-200 dark:border-blue-800';
          case 'PROJECT': return 'text-purple-700 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-300 border-purple-200 dark:border-purple-800';
          case 'ACTIVITY': return 'text-orange-700 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-300 border-orange-200 dark:border-orange-800';
          default: return 'text-stone-700 bg-stone-50 dark:bg-stone-800 dark:text-stone-300 border-stone-200';
      }
  }

  // Dropdown Options
  const priorityOptions: Option[] = [
    { value: 'HIGH', label: 'High Priority', color: 'bg-red-500' },
    { value: 'MEDIUM', label: 'Medium Priority', color: 'bg-amber-500' },
    { value: 'LOW', label: 'Low Priority', color: 'bg-emerald-500' }
  ];

  const categoryOptions: Option[] = [
    { value: 'HOMEWORK', label: 'Homework', color: 'bg-blue-500' },
    { value: 'PROJECT', label: 'Project', color: 'bg-purple-500' },
    { value: 'EXAM', label: 'Exam', color: 'bg-red-500' },
    { value: 'ACTIVITY', label: 'Activity', color: 'bg-orange-500' },
    { value: 'OTHER', label: 'Other', color: 'bg-stone-500' }
  ];

  // Subjects - Combine Schedule subjects + any subjects already in existing Todos to ensure we don't lose created ones
  const subjectSet = new Set<string>();
  schedule.forEach(s => subjectSet.add(s.subject));
  todos.forEach(t => { if(t.subject) subjectSet.add(t.subject) });
  const subjectOptions: Option[] = Array.from(subjectSet).map(s => ({ value: s, label: s }));

  const typeOptions: Option[] = [
      { value: 'SHARED', label: 'Shared / Class Task' },
      { value: 'PERSONAL', label: 'Personal Task' }
  ];

  // --- Calendar Logic ---
  const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
      return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentDate);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const changeMonth = (offset: number) => {
      const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset));
      setCurrentDate(new Date(newDate));
  };

  return (
    <>
    <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 transition-colors">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold font-display text-stone-800 dark:text-stone-100 flex items-center">
                <Check className="mr-2 text-amber-600 w-6 h-6" /> Class Tasks
            </h2>
            <div className="flex bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
                <button 
                    onClick={() => setViewMode('LIST')} 
                    className={`p-2 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-stone-700 shadow text-amber-600' : 'text-stone-400'}`}
                >
                    <LayoutList size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('CALENDAR')} 
                    className={`p-2 rounded-md transition-all ${viewMode === 'CALENDAR' ? 'bg-white dark:bg-stone-700 shadow text-amber-600' : 'text-stone-400'}`}
                >
                    <CalendarIcon size={18} />
                </button>
            </div>
        </div>
        
        {/* Filters - Only show in List view for cleaner UI */}
        {viewMode === 'LIST' && (
            <div className="flex flex-wrap gap-2 items-center">
                <div className="w-40">
                    <CustomSelect 
                        value={categoryFilter} 
                        onChange={(v) => setCategoryFilter(v as any)} 
                        options={[{value: 'ALL', label: 'All Categories'}, ...categoryOptions]} 
                    />
                </div>
                <div className="w-32">
                    <CustomSelect 
                        value={priorityFilter} 
                        onChange={(v) => setPriorityFilter(v as any)} 
                        options={[{value: 'ALL', label: 'All Priorities'}, ...priorityOptions]} 
                    />
                </div>

                <button onClick={() => openModal()} className="bg-amber-700 hover:bg-amber-800 text-white rounded-lg px-3 py-2.5 text-sm flex items-center shadow-lg shadow-amber-900/20 transition-all font-medium">
                    <Plus size={16} className="mr-1" /> New Task
                </button>
            </div>
        )}
         {viewMode === 'CALENDAR' && (
              <button onClick={() => openModal()} className="bg-amber-700 hover:bg-amber-800 text-white rounded-lg px-3 py-2 text-sm flex items-center shadow-lg shadow-amber-900/20 transition-all font-medium">
                <Plus size={16} className="mr-1" /> New Task
            </button>
         )}
      </div>

      {viewMode === 'LIST' ? (
        <div className="space-y-3">
            {visibleTodos.length === 0 ? (
            <div className="text-center py-10 text-stone-400">
                <Check size={48} className="mx-auto mb-2 opacity-20" />
                <p>No tasks found. Relax!</p>
            </div>
            ) : (
            visibleTodos.map(todo => {
                const blocked = isTaskBlocked(todo);
                return (
                    <div 
                        key={todo.id} 
                        className={`
                            group relative p-4 rounded-xl border transition-all duration-200
                            ${todo.isCompleted 
                                ? 'bg-stone-50 dark:bg-stone-800/50 border-stone-100 dark:border-stone-800 opacity-75' 
                                : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700'}
                        `}
                    >
                    <div className="flex items-start gap-3">
                        <button 
                        onClick={() => toggleComplete(todo)}
                        className={`
                            mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                            ${todo.isCompleted 
                                ? 'bg-green-500 border-green-500 text-white' 
                                : blocked 
                                    ? 'border-stone-300 text-stone-300 cursor-not-allowed bg-stone-100 dark:bg-stone-900 dark:border-stone-700'
                                    : 'border-stone-300 dark:border-stone-600 text-transparent hover:border-amber-500'}
                        `}
                        >
                        {todo.isCompleted ? <Check size={14} /> : blocked ? <Lock size={12} /> : null}
                        </button>
                        
                        <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className={`font-semibold text-stone-800 dark:text-stone-200 truncate ${todo.isCompleted ? 'line-through text-stone-500' : ''}`}>
                                {todo.title}
                            </h3>
                            {todo.subject && (
                                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400">
                                    {todo.subject}
                                </span>
                            )}
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getCategoryBadgeClass(todo.category)}`}>
                                {todo.category}
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${getPriorityColor(todo.priority)}`}>
                                {todo.priority}
                            </span>
                        </div>
                        
                        {todo.description && <p className="text-sm text-stone-600 dark:text-stone-400 mb-2 line-clamp-2">{todo.description}</p>}
                        
                        <div className="flex items-center text-xs text-stone-500 dark:text-stone-500 space-x-4">
                            {todo.deadline && (
                                <span className={`flex items-center ${!todo.isCompleted && todo.deadline < Date.now() ? 'text-red-500 font-bold' : ''}`}>
                                    <Clock size={12} className="mr-1" />
                                    {new Date(todo.deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                            {todo.type === 'SHARED' ? (
                                <span className="flex items-center text-indigo-500 dark:text-indigo-400" title="Shared Task">
                                    <Users size={12} className="mr-1" /> Class
                                </span>
                            ) : (
                                <span className="flex items-center" title="Personal Task">
                                    <UserCircle size={12} className="mr-1" /> Personal
                                </span>
                            )}
                            {blocked && (
                                <span className="flex items-center text-red-500" title="Waiting for other tasks">
                                    <LinkIcon size={12} className="mr-1" /> Blocked
                                </span>
                            )}
                        </div>
                        </div>

                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal(todo)} className="p-2 text-stone-400 hover:text-amber-600 transition-colors">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(todo.id)} className="p-2 text-stone-400 hover:text-red-600 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                    </div>
                );
            })
            )}
        </div>
      ) : (
        /* Calendar View */
        <div className="animate-in">
             <div className="flex justify-between items-center mb-4">
                 <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300">
                     <ChevronLeft size={20} />
                 </button>
                 <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                 <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300">
                     <ChevronRight size={20} />
                 </button>
             </div>

             <div className="grid grid-cols-7 gap-1">
                 {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                     <div key={d} className="text-center text-xs font-bold text-stone-400 uppercase py-2">{d}</div>
                 ))}
                 
                 {/* Empty Cells */}
                 {Array.from({ length: firstDay }).map((_, i) => (
                     <div key={`empty-${i}`} className="h-24 bg-transparent"></div>
                 ))}

                 {/* Days */}
                 {Array.from({ length: days }).map((_, i) => {
                     const dayNum = i + 1;
                     // Find tasks for this day
                     const dayTasks = visibleTodos.filter(t => {
                         if (!t.deadline) return false;
                         const d = new Date(t.deadline);
                         return d.getDate() === dayNum && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
                     });
                     
                     const isToday = dayNum === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

                     return (
                         <div 
                            key={dayNum} 
                            className={`
                                h-28 border border-stone-100 dark:border-stone-800 rounded-lg p-2 overflow-y-auto custom-scrollbar relative
                                ${isToday ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' : 'bg-stone-50 dark:bg-stone-800/50'}
                            `}
                         >
                             <span className={`text-xs font-bold ${isToday ? 'text-amber-600' : 'text-stone-500'} block mb-1`}>{dayNum}</span>
                             <div className="space-y-1">
                                 {dayTasks.map(t => (
                                     <div 
                                        key={t.id} 
                                        onClick={() => openModal(t)}
                                        className={`
                                            text-[10px] px-1.5 py-1 rounded truncate cursor-pointer font-medium
                                            ${t.isCompleted ? 'line-through opacity-50 bg-stone-200 text-stone-500' : 'text-white ' + getCategoryColor(t.category)}
                                        `}
                                        title={t.title}
                                     >
                                         {t.title}
                                     </div>
                                 ))}
                             </div>
                         </div>
                     );
                 })}
             </div>
        </div>
      )}
    </div>

    {/* Task Modal */}
    <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? "Edit Task" : "New Task"}
        footer={
            <>
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-900 transition-colors shadow-lg shadow-stone-900/20">Save Task</button>
            </>
        }
    >
        <form className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Task Title</label>
                <input 
                    type="text" 
                    required
                    className="input-field w-full"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Read Chapter 4"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                     <CustomSelect
                        label="Category"
                        value={category}
                        onChange={(v) => setCategory(v as any)}
                        options={categoryOptions}
                        icon={<Tag size={16} />}
                     />
                </div>
                <div>
                     <CustomSelect
                        label="Subject"
                        value={subject}
                        onChange={setSubject}
                        options={subjectOptions}
                        icon={<BookOpen size={16} />}
                        searchable
                        allowCreate
                        placeholder="Select or Create..."
                     />
                     <p className="text-[10px] text-stone-400 mt-1 ml-1">* Type to create new Subject</p>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Description</label>
                <textarea 
                    className="input-field w-full"
                    rows={3}
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="Add details, links, or instructions..."
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <CustomSelect
                        label="Priority"
                        value={priority}
                        onChange={(v) => setPriority(v as any)}
                        options={priorityOptions}
                        icon={<Filter size={16} />}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">Deadline</label>
                    <input 
                        type="datetime-local" 
                        className="input-field w-full"
                        value={deadline}
                        onChange={e => setDeadline(e.target.value)}
                    />
                </div>
            </div>

            <div>
                 <CustomSelect
                    label="Task Type"
                    value={type}
                    onChange={(v) => setType(v as any)}
                    options={typeOptions}
                    icon={<Users size={16} />}
                 />
            </div>
            
            {type === 'PERSONAL' && (
                 <div>
                    <CustomSelect
                        label="Assignee"
                        value={assignee}
                        onChange={setAssignee}
                        options={allUsers.map(u => ({ value: u.id, label: `${u.fullName} (${u.role})` }))}
                        icon={<UserCircle size={16} />}
                        searchable
                    />
                </div>
            )}
            
             <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Dependencies (Optional)</label>
                <div className="max-h-32 overflow-y-auto border border-stone-200 dark:border-stone-700 rounded-lg p-2 bg-stone-50 dark:bg-stone-900/50">
                     {todos.filter(t => t.id !== editingTask?.id).map(t => (
                         <label key={t.id} className="flex items-center p-2 hover:bg-white dark:hover:bg-stone-800 rounded cursor-pointer">
                             <input 
                                type="checkbox"
                                checked={selectedDependencies.includes(t.id)}
                                onChange={(e) => {
                                    if (e.target.checked) setSelectedDependencies([...selectedDependencies, t.id]);
                                    else setSelectedDependencies(selectedDependencies.filter(id => id !== t.id));
                                }}
                                className="mr-2 rounded text-amber-600 focus:ring-amber-500"
                             />
                             <span className="text-sm truncate text-stone-700 dark:text-stone-300">{t.title}</span>
                         </label>
                     ))}
                     {todos.length <= (editingTask ? 1 : 0) && <p className="text-xs text-stone-400 text-center">No other tasks available to link.</p>}
                </div>
                <p className="text-xs text-stone-500 mt-1">Select tasks that must be completed before this one.</p>
            </div>

        </form>
    </Modal>
    </>
  );
};


// --- Schedule Component ---

export const ScheduleModule: React.FC<{ user: User }> = ({ user }) => {
    // ... [Previous Schedule Component Code Unchanged - it uses native inputs mostly or custom grid]
    // Reusing the exact same logic as before, just ensuring imports are clean
    // For brevity, I'm keeping the core logic but ensuring types match. 
    
    const { showToast } = useToast();
    const [schedule, setSchedule] = useState<ClassSchedule[]>([]);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [isDayModalOpen, setIsDayModalOpen] = useState(false);
    
    const canEdit = PERMISSIONS.CAN_EDIT_SCHEDULE.includes(user.role);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<ClassSchedule>({
        id: '', subject: '', day: 'Monday', startTime: '', endTime: '', isMakeup: false, room: ''
    });

    useEffect(() => {
        setSchedule(getSchedule());
    }, []);

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const handleCopyAttendance = () => {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const reportDate = new Date().toISOString().split('T')[0];
        const report = generateAttendanceReport(reportDate);
        navigator.clipboard.writeText(report);
        showToast('Attendance report copied to clipboard!', 'success');
    };

    const handleDayClick = (day: string) => {
        setSelectedDay(day);
        setIsDayModalOpen(true);
    };

    const handleSaveClass = (e: React.FormEvent) => {
        e.preventDefault();
        const newClass = { ...editForm, id: editForm.id || Date.now().toString() };
        saveScheduleItem(newClass);
        setSchedule(getSchedule());
        setEditForm({ id: '', subject: '', day: 'Monday', startTime: '', endTime: '', isMakeup: false, room: '' });
        setIsEditing(false);
        showToast('Schedule updated!', 'success');
    };

    const handleDeleteClass = (id: string) => {
        if (confirm('Remove this class?')) {
            deleteScheduleItem(id);
            setSchedule(getSchedule());
        }
    };

    return (
        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-xl font-bold font-display text-stone-800 dark:text-stone-100 flex items-center">
                    <CalendarIcon className="mr-2 text-amber-600" /> Class Schedule
                </h2>
                
                <div className="flex gap-2">
                    {PERMISSIONS.CAN_TAKE_ATTENDANCE.includes(user.role) && (
                        <button onClick={handleCopyAttendance} className="flex items-center text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-2 rounded hover:bg-indigo-100 transition-colors">
                            <Copy size={14} className="mr-1" /> Copy Attendance Report
                        </button>
                    )}
                    {canEdit && (
                        <button onClick={() => setIsEditing(!isEditing)} className="flex items-center text-xs font-bold bg-stone-100 text-stone-700 px-3 py-2 rounded hover:bg-stone-200 transition-colors dark:bg-stone-800 dark:text-stone-300">
                            {isEditing ? 'Done Editing' : 'Edit Schedule'}
                        </button>
                    )}
                </div>
            </div>
            
            {isEditing && (
                <form onSubmit={handleSaveClass} className="mb-8 bg-stone-50 dark:bg-stone-800/50 p-4 rounded-lg border border-stone-200 dark:border-stone-700 animate-in grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <input type="text" placeholder="Subject" className="input-field text-xs" value={editForm.subject} onChange={e => setEditForm({...editForm, subject: e.target.value})} required />
                    
                    {/* Using CustomSelect for Day */}
                    <div className="relative">
                        <CustomSelect 
                            value={editForm.day} 
                            onChange={(v) => setEditForm({...editForm, day: v})} 
                            options={days.map(d => ({value: d, label: d}))}
                            placeholder="Day"
                        />
                    </div>

                    <div className="flex gap-2">
                        <input type="time" className="input-field text-xs w-full" value={editForm.startTime} onChange={e => setEditForm({...editForm, startTime: e.target.value})} required />
                        <input type="time" className="input-field text-xs w-full" value={editForm.endTime} onChange={e => setEditForm({...editForm, endTime: e.target.value})} required />
                    </div>
                    <input type="text" placeholder="Room (Opt)" className="input-field text-xs" value={editForm.room || ''} onChange={e => setEditForm({...editForm, room: e.target.value})} />
                    
                    <div className="flex items-center gap-2">
                         <label className="flex items-center text-xs text-stone-600 dark:text-stone-400">
                             <input type="checkbox" checked={editForm.isMakeup} onChange={e => setEditForm({...editForm, isMakeup: e.target.checked})} className="mr-1" /> Makeup?
                         </label>
                         <button type="submit" className="btn-primary py-1 px-3 text-xs w-full">Save Class</button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {days.map(day => {
                    const classes = schedule.filter(s => s.day === day).sort((a,b) => a.startTime.localeCompare(b.startTime));
                    const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;

                    return (
                        <div 
                            key={day} 
                            onClick={() => handleDayClick(day)}
                            className={`
                                rounded-lg border cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 h-full
                                ${isToday ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10' : 'border-stone-200 bg-white dark:bg-stone-800 dark:border-stone-700'}
                            `}
                        >
                            <div className={`p-3 text-center border-b ${isToday ? 'border-amber-200 text-amber-800 dark:text-amber-200 font-bold' : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 font-medium'}`}>
                                {day}
                            </div>
                            <div className="p-2 space-y-2 min-h-[100px]">
                                {classes.length > 0 ? classes.map(c => (
                                    <div key={c.id} className="bg-white dark:bg-stone-900 p-2 rounded border border-stone-100 dark:border-stone-800 shadow-sm relative group">
                                        <p className="font-semibold text-xs text-stone-800 dark:text-stone-200 truncate">{c.subject}</p>
                                        <p className="text-[10px] text-stone-500">{c.startTime}-{c.endTime}</p>
                                        {c.isMakeup && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
                                        {canEdit && isEditing && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteClass(c.id); }}
                                                className="absolute top-1 right-1 text-red-500 bg-white dark:bg-stone-800 rounded-full p-0.5 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                )) : (
                                    <div className="text-center py-4 text-xs text-stone-300 italic">Free Day</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Day Details Modal - Same as before */}
            <Modal
                isOpen={isDayModalOpen}
                onClose={() => setIsDayModalOpen(false)}
                title={`${selectedDay}'s Details`}
            >
                <div className="space-y-6">
                    <div>
                        <h4 className="font-bold text-stone-800 dark:text-white mb-2 flex items-center text-sm uppercase tracking-wide">
                            <Clock size={16} className="mr-2 text-amber-600" /> Class Schedule
                        </h4>
                        <div className="space-y-2">
                             {schedule.filter(s => s.day === selectedDay).sort((a,b) => a.startTime.localeCompare(b.startTime)).map(c => (
                                 <div key={c.id} className="flex justify-between items-center p-3 bg-stone-50 dark:bg-stone-800 rounded-lg border border-stone-200 dark:border-stone-700">
                                     <div>
                                         <p className="font-bold text-stone-900 dark:text-white">{c.subject}</p>
                                         <p className="text-xs text-stone-500 flex items-center">
                                             <MapPin size={10} className="mr-1"/> {c.room || 'No Room'}
                                         </p>
                                     </div>
                                     <div className="text-right">
                                         <span className="text-sm font-mono font-medium text-stone-700 dark:text-stone-300">{c.startTime} - {c.endTime}</span>
                                         {c.isMakeup && <p className="text-[10px] text-red-600 font-bold uppercase mt-1">Make Up Class</p>}
                                     </div>
                                 </div>
                             ))}
                             {schedule.filter(s => s.day === selectedDay).length === 0 && <p className="text-sm text-stone-500 italic">No classes scheduled.</p>}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};


// --- Announcement Component ---

export const AnnouncementModule: React.FC<{ user: User }> = ({ user }) => {
    const { showToast } = useToast();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedAnn, setSelectedAnn] = useState<Announcement | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<AnnouncementCategory>('GENERAL');
    const [attachment, setAttachment] = useState('');

    useEffect(() => {
        setAnnouncements(getAnnouncements());
    }, []);

    const canPost = PERMISSIONS.CAN_POST_ANNOUNCEMENTS.includes(user.role);

    const handlePost = (e: React.FormEvent) => {
        e.preventDefault();
        if(!title || !content) return;

        const newAnn: Announcement = {
            id: Date.now().toString(),
            title,
            subtitle,
            content,
            authorId: user.id,
            date: Date.now(),
            isEmailSent: true,
            category,
            attachmentUrl: attachment
        };

        addAnnouncement(newAnn);
        logAccess(user.id, 'ANNOUNCEMENT', `Posted: ${title}`);
        setAnnouncements(getAnnouncements());
        setIsCreateOpen(false);
        resetForm();
        showToast('Announcement posted and emailed to all students!', 'success');
    };

    const resetForm = () => {
        setTitle(''); setSubtitle(''); setContent(''); setCategory('GENERAL'); setAttachment('');
    }

    const categoryOptions: Option[] = [
        { value: 'GENERAL', label: 'General', color: 'bg-stone-500' },
        { value: 'URGENT', label: 'Urgent', color: 'bg-red-500' },
        { value: 'EVENT', label: 'Event', color: 'bg-purple-500' },
        { value: 'ACADEMIC', label: 'Academic', color: 'bg-blue-500' },
        { value: 'FINANCE', label: 'Finance', color: 'bg-emerald-500' }
    ];

    const getBadgeColor = (cat: AnnouncementCategory) => {
        switch(cat) {
            case 'URGENT': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
            case 'ACADEMIC': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
            case 'EVENT': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
            case 'FINANCE': return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
            default: return 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300';
        }
    };

    const filteredAnnouncements = announcements.filter(a => 
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-stone-900 p-4 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-2.5 text-stone-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Search announcements..." 
                        className="input-field w-full pl-9 text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                {canPost && (
                    <button onClick={() => setIsCreateOpen(true)} className="btn-primary flex items-center px-4 py-2 w-full sm:w-auto justify-center">
                        <Megaphone size={16} className="mr-2" /> Post Announcement
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAnnouncements.map(ann => (
                    <div 
                        key={ann.id} 
                        onClick={() => setSelectedAnn(ann)}
                        className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-5 transition-all hover:shadow-lg cursor-pointer flex flex-col group h-full"
                    >
                        <div className="flex justify-between items-start mb-3">
                             <span className={`text-[10px] uppercase font-bold font-sans px-2 py-0.5 rounded-full border ${getBadgeColor(ann.category)}`}>
                                 {ann.category}
                             </span>
                             <span className="text-xs text-stone-400 flex items-center">
                                 <Clock size={12} className="mr-1" />
                                 {new Date(ann.date).toLocaleDateString()}
                             </span>
                        </div>
                        <h3 className="text-lg font-bold font-display text-stone-800 dark:text-white mb-1 group-hover:text-amber-600 transition-colors line-clamp-2">
                            {ann.title}
                        </h3>
                        {ann.subtitle && <p className="text-sm font-medium text-amber-600 dark:text-amber-500 mb-2">{ann.subtitle}</p>}
                        
                        <p className="text-sm text-stone-600 dark:text-stone-300 line-clamp-3 mb-4 flex-1">
                            {ann.content}
                        </p>
                        
                        {ann.attachmentUrl && (
                             <div className="mt-auto pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center text-xs text-indigo-500 font-medium">
                                 <ImageIcon size={14} className="mr-1" /> Has Attachment
                             </div>
                        )}
                    </div>
                ))}
                {filteredAnnouncements.length === 0 && (
                    <div className="col-span-full text-center py-12 text-stone-400 italic">No announcements found.</div>
                )}
            </div>

            {/* Create Modal */}
            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Announcement">
                 <form onSubmit={handlePost} className="space-y-4">
                        <div>
                             <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Title</label>
                             <input type="text" className="input-field w-full" value={title} onChange={e => setTitle(e.target.value)} placeholder="Main Headline" required />
                        </div>
                        <div>
                             <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Subtitle</label>
                             <input type="text" className="input-field w-full" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Brief summary or catchy sub-headline" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <CustomSelect 
                                    label="Category"
                                    value={category}
                                    onChange={(v) => setCategory(v as any)}
                                    options={categoryOptions}
                                />
                            </div>
                            <div>
                                 <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Attachment</label>
                                 <FileUploader onUpload={setAttachment} label="Upload Image/File" />
                            </div>
                        </div>
                        <div>
                             <label className="block text-xs font-bold uppercase text-stone-500 mb-1">Content</label>
                             <textarea rows={6} className="input-field w-full" value={content} onChange={e => setContent(e.target.value)} placeholder="Write your full announcement here..." required />
                        </div>
                        <button type="submit" className="w-full btn-primary flex items-center justify-center py-3">
                            <Send size={16} className="mr-2" /> Post & Notify Students
                        </button>
                    </form>
            </Modal>
             {/* View Details Modal Logic Same as before */}
             <Modal isOpen={!!selectedAnn} onClose={() => setSelectedAnn(null)} title="Announcement Details">
                 {selectedAnn && (
                     <div className="space-y-6">
                         {selectedAnn.attachmentUrl && (
                             <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800">
                                 <img src={selectedAnn.attachmentUrl} alt="Attachment" className="w-full h-full object-cover" />
                             </div>
                         )}
                         <div>
                             <div className="flex justify-between items-start mb-2">
                                 <span className={`text-[10px] uppercase font-bold font-sans px-2 py-0.5 rounded-full border ${getBadgeColor(selectedAnn.category)}`}>
                                     {selectedAnn.category}
                                 </span>
                                 <span className="text-xs text-stone-500">{new Date(selectedAnn.date).toLocaleString()}</span>
                             </div>
                             <h2 className="text-2xl font-bold font-display text-stone-900 dark:text-white">{selectedAnn.title}</h2>
                             {selectedAnn.subtitle && <p className="text-lg text-amber-600 dark:text-amber-500 font-medium mt-1">{selectedAnn.subtitle}</p>}
                         </div>
                         <div className="prose prose-stone dark:prose-invert max-w-none text-sm leading-relaxed">
                            {selectedAnn.content.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                         </div>
                         <div className="pt-6 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-400">
                             Posted by: {selectedAnn.authorId}
                         </div>
                     </div>
                 )}
            </Modal>
        </div>
    );
};

// ResourcesModule and GradesModule remain largely the same visual cards/tables, no selects to change there.
export const ResourcesModule: React.FC = () => {
    // ... [Same Resources Module Code as previous]
    const [resources, setResources] = useState<Resource[]>([]);

    useEffect(() => {
        setResources(getResources());
    }, []);

    const getTypeIcon = (type: string) => {
        switch(type) {
            case 'PDF': return <FileText size={24} className="text-red-500" />;
            case 'DOC': return <FileText size={24} className="text-blue-500" />;
            case 'LINK': return <LinkIcon size={24} className="text-amber-500" />;
            default: return <BookOpen size={24} className="text-stone-500" />;
        }
    };

    return (
        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6">
            <h2 className="text-xl font-bold font-display text-stone-800 dark:text-stone-100 flex items-center mb-6">
                <BookOpen className="mr-2 text-amber-600" /> Class Resources
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resources.map(res => (
                    <div key={res.id} className="border border-stone-200 dark:border-stone-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-stone-50 dark:bg-stone-800/50">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                {getTypeIcon(res.type)}
                                <div>
                                    <h4 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">{res.title}</h4>
                                    <p className="text-xs text-stone-500 dark:text-stone-400">{new Date(res.dateAdded).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-stone-600 dark:text-stone-300 mt-2 mb-4 line-clamp-2">{res.description}</p>
                        <a href={res.url} className="w-full btn-primary py-1.5 text-xs flex items-center justify-center rounded">
                            <Download size={14} className="mr-2" /> Download / View
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const GradesModule: React.FC<{ user: User }> = ({ user }) => {
    // ... [Same Grades Module Code as previous]
    const [grades, setGrades] = useState<Grade[]>([]);

    useEffect(() => {
        setGrades(getGrades(user.id));
    }, [user.id]);

    const getGradeColor = (score: number) => {
        if(score >= 90) return 'text-green-600';
        if(score >= 80) return 'text-blue-600';
        if(score >= 75) return 'text-amber-600';
        return 'text-red-600';
    };

    return (
        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6">
            <h2 className="text-xl font-bold font-display text-stone-800 dark:text-stone-100 flex items-center mb-6">
                <GraduationCap className="mr-2 text-amber-600" /> My Grades
            </h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-stone-50 dark:bg-stone-800 text-stone-500 dark:text-stone-400 uppercase text-xs font-semibold">
                        <tr>
                            <th className="p-3 rounded-tl-lg">Subject</th>
                            <th className="p-3">Assessment Type</th>
                            <th className="p-3">Weight</th>
                            <th className="p-3">Quarter</th>
                            <th className="p-3 text-right rounded-tr-lg">Score</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                        {grades.map(g => (
                            <tr key={g.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                <td className="p-3 font-medium text-stone-800 dark:text-stone-200">{g.subject}</td>
                                <td className="p-3">
                                    <span className="px-2 py-1 bg-stone-100 dark:bg-stone-800 rounded text-xs text-stone-600 dark:text-stone-400 font-medium border border-stone-200 dark:border-stone-700">
                                        {g.type}
                                    </span>
                                </td>
                                <td className="p-3 text-stone-500">{g.weight}%</td>
                                <td className="p-3 text-stone-500">{g.quarter}</td>
                                <td className={`p-3 text-right font-bold ${getGradeColor(g.score)}`}>{g.score}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
