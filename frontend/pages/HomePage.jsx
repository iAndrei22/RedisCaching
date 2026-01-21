const HomePage = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const [leaderboard, setLeaderboard] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    if (!user) {
        window.location.hash = "#/login";
        return null;
    }

    React.useEffect(() => {
        // Fetch top 3 users leaderboard from Redis
        fetch("http://localhost:3000/api/leaderboard")
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setLeaderboard(data.leaderboard);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch leaderboard:", err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="max-w-2xl mx-auto p-6 fade-in">
            {/* Header */}
            <header className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-600">
                        <span className="font-bold text-lg">{user.username.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Hi, {user.username}! 👋</h1>
                        <p className="text-sm text-gray-500">Ready for today?</p>
                    </div>
                </div>
                <div>
                    <button 
                        onClick={() => { localStorage.removeItem("user"); window.location.hash = "#/login"; }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <i className="ph-bold ph-sign-out text-xl"></i>
                    </button>
                </div>
            </header>

            {/* Profile Button */}
            <a href="#/profile" className="ml-4 px-4 py-2 bg-brand-100 text-brand-600 rounded-xl font-semibold hover:bg-brand-200 transition-colors shadow-soft">
                <i className="ph-bold ph-user text-lg mr-1"></i> My Profile
            </a>

            {/* Hero Card */}
            <div className="bg-gradient-to-r from-brand-600 to-indigo-600 rounded-3xl p-8 text-white shadow-glow mb-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
                    <i className="ph-fill ph-trophy text-[120px]"></i>
                </div>
                
                <h2 className="text-3xl font-bold mb-2">Focus Mode</h2>
                
                <a href="#/tasks" className="inline-flex items-center gap-2 bg-white text-brand-600 px-6 py-3 rounded-xl font-bold hover:bg-brand-50 transition-colors shadow-lg">
                    Go to My Tasks
                    <i className="ph-bold ph-arrow-right"></i>
                </a>
            </div>

            {/* Quick Stats (Static Visuals) */}
            <div className="grid grid-cols-2 gap-4">
            </div>

            {/* Leaderboard Section - Cached in Redis Sorted Set */}
            <div className="mt-8 bg-white rounded-3xl p-6 shadow-soft border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <i className="ph-fill ph-trophy text-yellow-500"></i>
                        Top Users
                    </h3>
                </div>
                
                {loading ? (
                    <div className="text-center py-8 text-gray-400">
                        <i className="ph-bold ph-spinner text-2xl animate-spin"></i>
                    </div>
                ) : leaderboard.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <i className="ph-bold ph-users text-3xl mb-2"></i>
                        <p>No users yet. Complete tasks to appear on the leaderboard!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {leaderboard.map((entry) => (
                            <div 
                                key={entry.userId}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                                    entry.userId === user._id ? 'bg-brand-50 border-2 border-brand-200' : 'bg-gray-50 hover:bg-gray-100'
                                }`}
                            >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                    entry.rank === 1 ? 'bg-yellow-100 text-yellow-600' :
                                    entry.rank === 2 ? 'bg-gray-200 text-gray-600' :
                                    entry.rank === 3 ? 'bg-orange-100 text-orange-600' :
                                    'bg-gray-100 text-gray-500'
                                }`}>
                                    {entry.rank}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900">
                                        {entry.username}
                                        {entry.userId === user._id && (
                                            <span className="ml-2 text-xs text-brand-600 font-normal">(You)</span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 text-brand-600 font-bold">
                                    <i className="ph-fill ph-star text-yellow-500"></i>
                                    {entry.points}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

window.HomePage = HomePage;