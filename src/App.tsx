import { useState, useEffect, useMemo, useRef, FormEvent } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Flag, 
  Tag, 
  BarChart3, 
  Flame, 
  Trophy,
  Clock,
  ChevronRight,
  MoreVertical,
  Edit3,
  X,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

type Priority = 'low' | 'medium' | 'high';
type Category = 'Work' | 'Personal' | 'Study' | 'Health' | 'Other';
type Recurrence = 'none' | 'daily' | 'weekly';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  category: Category;
  deadline?: string;
  recurrence: Recurrence;
  createdAt: string;
  completedAt?: string;
}

interface Analytics {
  completedToday: number;
  streak: number;
  mostProductiveDay: string;
  totalCompleted: number;
}

// --- Constants ---

const CATEGORIES: Category[] = ['Work', 'Personal', 'Study', 'Health', 'Other'];
const PRIORITIES: { value: Priority; color: string }[] = [
  { value: 'low', color: 'bg-priority-low' },
  { value: 'medium', color: 'bg-priority-medium' },
  { value: 'high', color: 'bg-priority-high' },
];

// --- Helper Functions ---

const getFormattedDate = (date: Date) => date.toISOString().split('T')[0];

const calculateStreak = (tasks: Task[]) => {
  const completedDates = tasks
    .filter(t => t.completed && t.completedAt)
    .map(t => t.completedAt!.split('T')[0])
    .sort()
    .reverse();
  
  const uniqueDates = Array.from(new Set(completedDates));
  if (uniqueDates.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  
  // Check if today or yesterday has a completion
  const todayStr = getFormattedDate(currentDate);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getFormattedDate(yesterday);

  if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
    return 0;
  }

  let checkDate = new Date(uniqueDates[0]);
  for (let i = 0; i < uniqueDates.length; i++) {
    const dateStr = getFormattedDate(checkDate);
    if (uniqueDates[i] === dateStr) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};

const getMostProductiveDay = (tasks: Task[]) => {
  const completionsByDay: Record<string, number> = {};
  tasks.forEach(t => {
    if (t.completed && t.completedAt) {
      const day = new Date(t.completedAt).toLocaleDateString('en-US', { weekday: 'long' });
      completionsByDay[day] = (completionsByDay[day] || 0) + 1;
    }
  });

  let maxDay = 'None';
  let maxCount = 0;
  Object.entries(completionsByDay).forEach(([day, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxDay = day;
    }
  });
  return maxDay;
};

// --- Components ---

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputText, setInputText] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('Personal');
  const [deadline, setDeadline] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lumina_tasks');
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse tasks", e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('lumina_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Handle Recurrence Logic
  useEffect(() => {
    const today = getFormattedDate(new Date());
    const recurringTasks = tasks.filter(t => t.recurrence !== 'none' && t.completed);
    
    // This is a simplified logic: if a recurring task was completed before today, 
    // and no "next" instance exists, we could regenerate. 
    // In a real app, we'd track "lastGeneratedDate".
    // For this demo, we'll just handle it on completion.
  }, [tasks]);

  const addTask = (e: FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      text: inputText,
      completed: false,
      priority,
      category,
      deadline: deadline || undefined,
      recurrence,
      createdAt: new Date().toISOString(),
    };

    setTasks([newTask, ...tasks]);
    setInputText('');
    setDeadline('');
    setIsAdding(false);
    showToast("Task created");
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const isCompleting = !t.completed;
        const updatedTask = { 
          ...t, 
          completed: isCompleting, 
          completedAt: isCompleting ? new Date().toISOString() : undefined 
        };

        // Handle Recurrence
        if (isCompleting && t.recurrence !== 'none') {
          setTimeout(() => handleRecurrence(t), 500);
        }

        return updatedTask;
      }
      return t;
    }));
  };

  const handleRecurrence = (task: Task) => {
    const nextDate = new Date();
    if (task.recurrence === 'daily') {
      nextDate.setDate(nextDate.getDate() + 1);
    } else if (task.recurrence === 'weekly') {
      nextDate.setDate(nextDate.getDate() + 7);
    }

    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      completed: false,
      completedAt: undefined,
      createdAt: new Date().toISOString(),
      deadline: task.deadline ? nextDate.toISOString().split('T')[0] : undefined
    };

    setTasks(prev => [newTask, ...prev]);
    showToast(`Recurring task scheduled for ${nextDate.toLocaleDateString()}`);
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    showToast("Task deleted");
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditText(task.text);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setTasks(prev => prev.map(t => t.id === editingId ? { ...t, text: editText } : t));
    setEditingId(null);
    showToast("Task updated");
  };

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Analytics
  const stats = useMemo(() => {
    const today = getFormattedDate(new Date());
    const completedToday = tasks.filter(t => t.completed && t.completedAt?.startsWith(today)).length;
    const totalCompleted = tasks.filter(t => t.completed).length;
    const progress = tasks.length > 0 ? (totalCompleted / tasks.length) * 100 : 0;
    
    return {
      completedToday,
      totalCompleted,
      progress,
      streak: calculateStreak(tasks),
      mostProductiveDay: getMostProductiveDay(tasks),
      activeTasks: tasks.filter(t => !t.completed).length
    };
  }, [tasks]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const priorityMap = { high: 0, medium: 1, low: 2 };
      return priorityMap[a.priority] - priorityMap[b.priority];
    });
  }, [tasks]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row p-4 md:p-8 gap-8 max-w-7xl mx-auto">
      
      {/* --- Sidebar / Analytics --- */}
      <aside className="w-full lg:w-80 space-y-6 order-2 lg:order-1">
        <div className="glass-card rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-lavender/20 rounded-lg">
              <BarChart3 className="w-5 h-5 text-lavender" />
            </div>
            <h2 className="font-display font-semibold text-lg">Insights</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <Flame className="w-5 h-5 text-orange-400 mb-1" />
              <span className="text-2xl font-bold">{stats.streak}</span>
              <span className="text-[10px] uppercase tracking-wider opacity-50">Day Streak</span>
            </div>
            <div className="bg-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <Trophy className="w-5 h-5 text-yellow-400 mb-1" />
              <span className="text-2xl font-bold">{stats.completedToday}</span>
              <span className="text-[10px] uppercase tracking-wider opacity-50">Today</span>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex justify-between text-sm">
              <span className="opacity-60">Productivity Day</span>
              <span className="font-medium text-lavender">{stats.mostProductiveDay}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="opacity-60">Total Completed</span>
              <span className="font-medium">{stats.totalCompleted}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-medium">Daily Goal</span>
              <span className="text-xs opacity-50">{Math.round(stats.progress)}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-lavender"
                initial={{ width: 0 }}
                animate={{ width: `${stats.progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 hidden lg:block">
          <h3 className="text-sm font-medium opacity-50 uppercase tracking-widest mb-4">Quick Filters</h3>
          <div className="space-y-2">
            {CATEGORIES.map(cat => (
              <button key={cat} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors text-sm group">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-white/20 group-hover:bg-lavender transition-colors" />
                  <span>{cat}</span>
                </div>
                <span className="text-xs opacity-30">{tasks.filter(t => t.category === cat && !t.completed).length}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 space-y-8 order-1 lg:order-2">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight text-white">
              Lumina <span className="text-lavender">Studio</span>
            </h1>
            <p className="text-gray-400 mt-1">Focus on what matters today.</p>
          </div>
          
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-lavender hover:bg-lavender-dark text-charcoal font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-lavender/20 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span>New Task</span>
          </button>
        </header>

        {/* Add Task Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card rounded-2xl p-6 shadow-2xl"
            >
              <form onSubmit={addTask} className="space-y-6">
                <div className="flex items-start gap-4">
                  <input 
                    autoFocus
                    type="text"
                    placeholder="What needs to be done?"
                    className="flex-1 bg-transparent border-none text-xl font-medium focus:ring-0 placeholder:opacity-30"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                  <button type="button" onClick={() => setIsAdding(false)} className="p-2 hover:bg-white/5 rounded-lg opacity-50">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                  {/* Priority */}
                  <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg">
                    {PRIORITIES.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPriority(p.value)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          priority === p.value ? `${p.color} text-charcoal` : 'hover:bg-white/5 opacity-50'
                        }`}
                      >
                        {p.value.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {/* Category */}
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="bg-white/5 border-none rounded-lg text-xs font-semibold px-3 py-2 focus:ring-1 focus:ring-lavender"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  {/* Deadline */}
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-lg text-xs opacity-70">
                    <Calendar className="w-3.5 h-3.5" />
                    <input 
                      type="date" 
                      className="bg-transparent border-none p-0 focus:ring-0 text-xs"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                    />
                  </div>

                  {/* Recurrence */}
                  <select 
                    value={recurrence}
                    onChange={(e) => setRecurrence(e.target.value as Recurrence)}
                    className="bg-white/5 border-none rounded-lg text-xs font-semibold px-3 py-2 focus:ring-1 focus:ring-lavender"
                  >
                    <option value="none">No Repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>

                <div className="flex justify-end pt-2">
                  <button 
                    type="submit"
                    className="bg-white text-charcoal font-bold px-8 py-2.5 rounded-xl hover:bg-lavender transition-colors"
                  >
                    Create Task
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Task List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-medium opacity-40 uppercase tracking-widest">
              {stats.activeTasks} Active Tasks
            </h3>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {sortedTasks.map(task => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`glass-card rounded-2xl p-4 flex items-center gap-4 task-card-hover group ${
                    task.completed ? 'opacity-40' : ''
                  }`}
                >
                  <button 
                    onClick={() => toggleTask(task.id)}
                    className={`transition-all duration-300 ${task.completed ? 'text-lavender' : 'text-white/20 hover:text-white/40'}`}
                  >
                    {task.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    {editingId === task.id ? (
                      <input 
                        autoFocus
                        className="w-full bg-white/5 border-none rounded px-2 py-1 text-white focus:ring-1 focus:ring-lavender"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      />
                    ) : (
                      <div className="flex flex-col">
                        <span className={`text-base font-medium truncate ${task.completed ? 'line-through' : ''}`}>
                          {task.text}
                        </span>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            task.priority === 'high' ? 'bg-priority-high/20 text-priority-high' :
                            task.priority === 'medium' ? 'bg-priority-medium/20 text-priority-medium' :
                            'bg-priority-low/20 text-priority-low'
                          }`}>
                            {task.priority}
                          </span>
                          <span className="text-[10px] opacity-40 flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {task.category}
                          </span>
                          {task.deadline && (
                            <span className={`text-[10px] flex items-center gap-1 ${
                              !task.completed && new Date(task.deadline) < new Date() ? 'text-priority-high font-bold' : 'opacity-40'
                            }`}>
                              <Clock className="w-3 h-3" />
                              {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {task.recurrence !== 'none' && (
                            <span className="text-[10px] opacity-40 flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" />
                              {task.recurrence}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => startEdit(task)}
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4 opacity-50" />
                    </button>
                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group/del"
                    >
                      <Trash2 className="w-4 h-4 text-red-500/50 group-hover/del:text-red-500" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {tasks.length === 0 && (
              <div className="text-center py-20 opacity-20">
                <div className="mb-4 flex justify-center">
                  <div className="p-6 bg-white/5 rounded-full">
                    <Plus className="w-12 h-12" />
                  </div>
                </div>
                <p className="text-xl font-display">No tasks yet. Start your journey.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white text-charcoal px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3 z-50"
          >
            <div className="w-2 h-2 bg-lavender rounded-full animate-pulse" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
