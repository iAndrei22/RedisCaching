const { useState, useEffect } = React;

const TasksPage = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const [tasks, setTasks] = useState([]);
    const [taskForm, setTaskForm] = useState({ title: "", description: "", points: 10 });
    const [editId, setEditId] = useState(null);
    const [editForm, setEditForm] = useState({ title: "", description: "", points: 10 });
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    if (!user) {
        window.location.hash = "#/login";
        return null;
    }

    const loadTasks = async () => {
        const res = await fetch(`${API_URL}/tasks/${user._id}`);
        const data = await res.json();
        setTasks(data);
    };

    useEffect(() => { loadTasks(); }, []);

    const createTask = async () => {
        if (!taskForm.title.trim() || !taskForm.description.trim()) return;
        await apiPost("/tasks", { userId: user._id, ...taskForm });
        setTaskForm({ title: "", description: "", points: 10 });
        loadTasks();
    };

    const toggleTask = async (task) => {
        await apiPatch(`/tasks/${task._id}`, { isCompleted: !task.isCompleted });
        loadTasks();
    };

        const startEdit = (task) => {
            setEditId(task._id);
            setEditForm({ title: task.title, description: task.description, points: task.points });
        };

        const saveEdit = async () => {
            await fetch(`${API_URL}/tasks/${editId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editForm)
            });
            setEditId(null);
            loadTasks();
        };

        const deleteTask = async (taskId) => {
            await fetch(`${API_URL}/tasks/${taskId}`, { method: "DELETE" });
            setConfirmDeleteId(null);
            loadTasks();
        };

    return (
        <div className="max-w-xl mx-auto p-6 fade-in">
            {/* Header with Back Button */}
            <div className="flex items-center gap-4 mb-8">
                <a href="#/home" className="p-2 bg-white rounded-full text-gray-500 hover:text-brand-600 shadow-sm border border-gray-100 transition-colors">
                    <i className="ph-bold ph-arrow-left text-xl"></i>
                </a>
                <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
            </div>

            {/* Add Task Card */}
            <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 mb-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-brand-50 rounded-bl-full -mr-8 -mt-8 z-0 transition-transform group-hover:scale-110"></div>
                
                <h2 className="text-sm font-bold text-brand-600 uppercase tracking-wider mb-4 relative z-10">New Challenge</h2>

                <input
                    className="w-full text-lg font-semibold placeholder-gray-300 border-b border-gray-100 py-2 focus:border-brand-500 outline-none transition-colors mb-4 bg-transparent relative z-10"
                    placeholder="What needs to be done?"
                    value={taskForm.title}
                    onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                />

                <div className="flex gap-3 relative z-10">
                    <input
                        className="flex-1 text-sm bg-gray-50 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-100 transition"
                        placeholder="Details..."
                        value={taskForm.description}
                        onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                    />
                    <div className="flex items-center bg-gray-50 rounded-lg px-3 border border-gray-100">
                        <i className="ph-fill ph-star text-yellow-400 mr-1"></i>
                        <input
                            type="number"
                            className="w-10 bg-transparent text-sm font-bold text-gray-700 outline-none"
                            value={taskForm.points}
                            onChange={e => setTaskForm({ ...taskForm, points: Number(e.target.value) })}
                        />
                    </div>
                </div>

                <button 
                    onClick={createTask}
                    className="mt-4 w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 relative z-10"
                >
                    <i className="ph-bold ph-plus"></i> Add Task
                </button>
            </div>

            {/* Task List */}
            <div className="space-y-3">
                {tasks.map(task => (
                    <div 
                        key={task._id} 
                        className={`group p-4 bg-white rounded-xl border transition-all duration-200 flex items-start gap-4 ${
                            task.isCompleted 
                            ? "border-gray-100 opacity-60" 
                            : "border-gray-100 hover:border-brand-200 hover:shadow-md"
                        }`}
                    >
                        <button 
                            onClick={() => toggleTask(task)}
                            className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                task.isCompleted 
                                ? "bg-green-500 border-green-500 text-white" 
                                : "border-gray-300 text-transparent hover:border-brand-400"
                            }`}
                        >
                            <i className="ph-bold ph-check text-xs"></i>
                        </button>

                        <div className="flex-1">
                                {editId === task._id ? (
                                    <>
                                        <input 
                                            className="font-semibold text-gray-800 mb-1 w-full border border-brand-300 bg-brand-50 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-200 transition"
                                            value={editForm.title}
                                            onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                        />
                                        <input 
                                            className="text-sm text-gray-700 mb-1 w-full border border-brand-200 bg-brand-50 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-100 transition"
                                            value={editForm.description}
                                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                        />
                                        <input 
                                            type="number"
                                            className="text-xs font-bold mb-1 w-16 border border-brand-200 bg-brand-50 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-100 transition"
                                            value={editForm.points}
                                            onChange={e => setEditForm({ ...editForm, points: Number(e.target.value) })}
                                        />
                                        <button onClick={saveEdit} className="mr-2 text-xs text-green-600">Save</button>
                                        <button onClick={() => setEditId(null)} className="text-xs text-gray-400">Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        <h3 className={`font-semibold text-gray-800 ${task.isCompleted ? "line-through text-gray-400" : ""}`}>{task.title}</h3>
                                        <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>
                                    </>
                                )}
                        </div>

                        <div className="bg-brand-50 text-brand-700 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 h-fit">
                            <i className="ph-fill ph-star text-brand-400"></i>
                            +{task.points}
                        </div>
                            <div className="flex flex-col gap-1 ml-2 relative">
                                <button onClick={() => startEdit(task)} className="text-xs text-blue-500">Edit</button>
                                {confirmDeleteId === task._id ? (
                                    <div className="bg-white border border-gray-200 rounded shadow-sm p-2 flex flex-col items-center animate-fade-in text-xs z-30 absolute top-0 right-[-220px] min-w-[200px] shadow-lg">
                                        <span className="mb-2 text-gray-700">Are you sure you want to delete this task?</span>
                                        <div className="flex gap-2">
                                            <button onClick={() => deleteTask(task._id)} className="text-red-600 font-bold">Yes</button>
                                            <button onClick={() => setConfirmDeleteId(null)} className="text-gray-400">No</button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setConfirmDeleteId(task._id)} className="text-xs text-red-500">Delete</button>
                                )}
                            </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

window.TasksPage = TasksPage;