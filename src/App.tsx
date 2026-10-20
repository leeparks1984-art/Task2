import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, updateDoc, deleteDoc, 
  onSnapshot, getDoc, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { 
  CheckCircle2, Circle, Plus, Trash2, Users, LogOut, Copy, 
  Check, AlertCircle, Clock, Tag, UserCheck, Sparkles, LayoutDashboard, Search, Filter
} from 'lucide-react';

// ==========================================
// PASTE YOUR FIREBASE CONFIG KEYS HERE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBLZp9YgbBeE32Y-NH1JW9KaGSCq9mgkPA",
  authDomain: "team-task-app-3a941.firebaseapp.com",
  projectId: "team-task-app-3a941",
  storageBucket: "team-task-app-3a941.firebasestorage.app",
  messagingSenderId: "465646950979",
  appId: "1:465646950979:web:9497d4fc6290d1245152f6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('task_app_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [workspaceCode, setWorkspaceCode] = useState('');
  const [workspaceData, setWorkspaceData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [newTaskAssignee, setNewTaskAssignee] = useState('Unassigned');
  const [newTaskTag, setNewTaskTag] = useState('General');

  // Filters
  const [filterAssignee, setFilterAssignee] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      localStorage.setItem('task_app_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('task_app_user');
    }
  }, [user]);

  useEffect(() => {
    if (!workspaceCode) return;

    setLoading(true);
    const wsRef = doc(db, 'workspaces', workspaceCode);
    
    const unsubWs = onSnapshot(wsRef, (docSnap) => {
      if (docSnap.exists()) {
        setWorkspaceData(docSnap.data());
      } else {
        setError('Workspace not found.');
        setWorkspaceCode('');
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Failed to sync workspace.');
      setLoading(false);
    });

    const tasksRef = collection(db, 'workspaces', workspaceCode, 'tasks');
    const unsubTasks = onSnapshot(tasksRef, (snapshot) => {
      const taskList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTasks(taskList);
    });

    return () => {
      unsubWs();
      unsubTasks();
    };
  }, [workspaceCode]);

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    const name = e.target.userName.value.trim();
    const wsName = e.target.wsName.value.trim();
    if (!name || !wsName) return;

    const code = generateCode();
    const newUser = { id: Math.random().toString(36).substring(2, 9), name, role: 'Admin' };

    try {
      await setDoc(doc(db, 'workspaces', code), {
        name: wsName,
        createdAt: Date.now(),
        members: [newUser]
      });
      setUser(newUser);
      setWorkspaceCode(code);
    } catch (err) {
      console.error(err);
      setError('Error creating workspace.');
    }
  };

  const handleJoinWorkspace = async (e) => {
    e.preventDefault();
    const name = e.target.userName.value.trim();
    const code = e.target.wsCode.value.trim().toUpperCase();
    if (!name || !code) return;

    try {
      const wsRef = doc(db, 'workspaces', code);
      const wsSnap = await getDoc(wsRef);

      if (!wsSnap.exists()) {
        setError('Workspace code not found.');
        return;
      }

      const data = wsSnap.data();
      if (data.members && data.members.length >= 15) {
        setError('Workspace is full (max 15 members).');
        return;
      }

      const newUser = { id: Math.random().toString(36).substring(2, 9), name, role: 'Member' };
      
      await updateDoc(wsRef, {
        members: arrayUnion(newUser)
      });

      setUser(newUser);
      setWorkspaceCode(code);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to join workspace.');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const taskId = Math.random().toString(36).substring(2, 9);
    const taskRef = doc(db, 'workspaces', workspaceCode, 'tasks', taskId);

    try {
      await setDoc(taskRef, {
        title: newTaskTitle,
        description: newTaskDesc,
        priority: newTaskPriority,
        assignee: newTaskAssignee,
        tag: newTaskTag,
        completed: false,
        createdBy: user.name,
        createdAt: Date.now()
      });
      setNewTaskTitle('');
      setNewTaskDesc('');
    } catch (err) {
      console.error(err);
      setError('Failed to add task.');
    }
  };

  const toggleTask = async (task) => {
    const taskRef = doc(db, 'workspaces', workspaceCode, 'tasks', task.id);
    try {
      await updateDoc(taskRef, { completed: !task.completed });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTask = async (taskId) => {
    const taskRef = doc(db, 'workspaces', workspaceCode, 'tasks', taskId);
    try {
      await deleteDoc(taskRef);
    } catch (err) {
      console.error(err);
    }
  };

  const leaveWorkspace = async () => {
    if (workspaceData && user) {
      try {
        const wsRef = doc(db, 'workspaces', workspaceCode);
        await updateDoc(wsRef, {
          members: arrayRemove(user)
        });
      } catch (e) {
        console.error(e);
      }
    }
    setUser(null);
    setWorkspaceCode('');
    setWorkspaceData(null);
    setTasks([]);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(workspaceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Welcome / Join Screen
  if (!user || !workspaceCode) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Glow ambient effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl w-full max-w-md p-8 shadow-2xl shadow-indigo-950/50 relative z-10">
          <div className="text-center mb-8">
            <div className="bg-gradient-to-tr from-indigo-600 to-violet-500 w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300">
              Team Workspace
            </h1>
            <p className="text-slate-400 text-sm mt-1.5">Real-time sync for up to 15 team members</p>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl mb-6 text-sm flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-6">
            <form onSubmit={handleCreateWorkspace} className="space-y-3.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Create Workspace
              </h2>
              <input 
                name="userName" 
                required
                placeholder="Your name (e.g. Alex)"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" 
              />
              <input 
                name="wsName" 
                required
                placeholder="Workspace name (e.g. Design Team)"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" 
              />
              <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-semibold py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-sm active:scale-[0.99]">
                Create & Launch
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">Or</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <form onSubmit={handleJoinWorkspace} className="space-y-3.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Join Existing Board
              </h2>
              <input 
                name="userName" 
                required
                placeholder="Your name"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition" 
              />
              <input 
                name="wsCode" 
                required
                maxLength={6}
                placeholder="6-Character Code (e.g. X8K2P9)"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm uppercase tracking-widest font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition" 
              />
              <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-semibold py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-sm active:scale-[0.99]">
                Join Team
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const filteredTasks = tasks.filter(task => {
    const matchesAssignee = filterAssignee === 'All' || task.assignee === filterAssignee;
    const matchesStatus = filterStatus === 'All' || (filterStatus === 'Completed' ? task.completed : !task.completed);
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesAssignee && matchesStatus && matchesSearch;
  });

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const membersList = workspaceData?.members || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Dynamic Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-tr from-indigo-600 to-violet-500 w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/25">
            {workspaceData?.name?.[0]?.toUpperCase() || 'T'}
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
              {workspaceData?.name || 'Workspace'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>Invite Code: <strong className="text-indigo-400 font-mono tracking-wider bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-800/50">{workspaceCode}</strong></span>
              <button onClick={copyCode} className="hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/80 transition flex items-center gap-1.5 text-[11px]">
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/70 px-3.5 py-1.5 rounded-xl text-xs text-slate-300 shadow-inner">
            <Users className="w-4 h-4 text-indigo-400" />
            <span><strong className="text-white">{membersList.length}</strong> / 15 Active Members</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/70 px-3.5 py-1.5 rounded-xl text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
            <span className="font-semibold text-slate-200">{user.name}</span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-md border border-indigo-500/30">{user.role}</span>
          </div>

          <button 
            onClick={leaveWorkspace}
            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-xl transition text-xs font-medium flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>
      </header>

      {/* Workspace Dashboard */}
      <main className="max-w-7xl w-full mx-auto p-4 md:p-8 flex-grow grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Control Panel */}
        <div className="space-y-6">
          {/* Realtime Progress Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                Team Completion Rate
              </h3>
              <span className="text-sm font-black text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-800/80 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700/50 mb-3">
              <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500 shadow-sm shadow-indigo-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="flex justify-between text-xs text-slate-400 font-medium">
              <span>Done: <strong className="text-emerald-400">{completedCount}</strong></span>
              <span>Pending: <strong className="text-amber-400">{totalCount - completedCount}</strong></span>
              <span>Total: <strong className="text-slate-200">{totalCount}</strong></span>
            </div>
          </div>

          {/* New Task Creator */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
              <div className="bg-indigo-600/20 p-1.5 rounded-lg border border-indigo-500/30">
                <Plus className="w-4 h-4 text-indigo-400" />
              </div>
              New Team Task
            </h3>
            <form onSubmit={handleAddTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Title</label>
                <input 
                  type="text" 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Details</label>
                <textarea 
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Additional context..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Priority</label>
                  <select 
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Assign To</label>
                  <select 
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 truncate"
                  >
                    <option value="Unassigned">Anyone</option>
                    {membersList.map((m, idx) => (
                      <option key={idx} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Category Tag</label>
                <input 
                  type="text" 
                  value={newTaskTag}
                  onChange={(e) => setNewTaskTag(e.target.value)}
                  placeholder="Tag (e.g. Design, Dev)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-semibold py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition text-sm active:scale-[0.99]">
                Add Task
              </button>
            </form>
          </div>

          {/* Member List */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
              <span>Team Roster ({membersList.length})</span>
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {membersList.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-950/70 border border-slate-800/80 px-3 py-2 rounded-xl text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-black flex items-center justify-center">
                      {m.name[0]?.toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-200">{m.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">{m.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Task Stream */}
        <div className="lg:col-span-2 space-y-6">
          {/* Controls Header */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-auto flex-grow">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tasks or tags..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            
            <div className="flex gap-2.5 w-full sm:w-auto shrink-0">
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 flex-1 sm:flex-none"
              >
                <option value="All">All Tasks</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
              </select>

              <select 
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 flex-1 sm:flex-none"
              >
                <option value="All">All Assignees</option>
                <option value="Unassigned">Unassigned</option>
                {membersList.map((m, idx) => (
                  <option key={idx} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cards Stream */}
          <div className="space-y-3.5">
            {filteredTasks.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl p-12 text-center text-slate-500">
                <Clock className="w-10 h-10 mx-auto mb-3 opacity-30 text-indigo-400" />
                <p className="text-sm font-medium">No tasks found matching current filters.</p>
              </div>
            ) : (
              filteredTasks.map((task) => (
                <div 
                  key={task.id} 
                  className={`group bg-slate-900/90 border rounded-3xl p-5 shadow-lg transition-all duration-200 flex items-start justify-between gap-4 hover:shadow-indigo-950/30 ${
                    task.completed ? 'border-emerald-500/30 bg-slate-900/40 opacity-75' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-grow">
                    <button 
                      onClick={() => toggleTask(task)} 
                      className="mt-0.5 text-slate-500 hover:text-emerald-400 transition shrink-0"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-600 group-hover:text-slate-400" />
                      )}
                    </button>
                    <div className="space-y-1.5">
                      <h4 className={`font-semibold text-sm leading-snug ${task.completed ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-slate-400 leading-relaxed">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 pt-1.5 flex-wrap">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          task.priority === 'High' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                          task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                          'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                        }`}>
                          {task.priority}
                        </span>
                        <span className="text-[10px] bg-slate-800/90 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-700 flex items-center gap-1 font-medium">
                          <UserCheck className="w-3 h-3 text-indigo-400" />
                          {task.assignee}
                        </span>
                        {task.tag && (
                          <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30 flex items-center gap-1 font-medium">
                            <Tag className="w-3 h-3" />
                            {task.tag}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">By {task.createdBy}</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="text-slate-600 hover:text-rose-400 transition p-2 rounded-xl hover:bg-slate-800 shrink-0"
                    title="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
}