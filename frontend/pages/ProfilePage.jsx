

// Helper to fetch user data (replace with your actual auth/user context)
const { useEffect, useState } = React;

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [badges, setBadges] = useState([]);
  const [points, setPoints] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);

  useEffect(() => {
    // Get user info from localStorage
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (!storedUser) return;
    setUser(storedUser);

    // Fetch user stats (total points, completed tasks) from backend (Redis-backed)
    fetch(`http://localhost:3000/api/user-stats/${storedUser._id}`)
      .then((res) => res.json())
      .then((stats) => {
        if (typeof stats.totalPoints === "number" && typeof stats.completedTasksCount === "number") {
          setPoints(stats.totalPoints);
          setCompletedTasks(stats.completedTasksCount);
        } else {
          // Fallback: fetch tasks and calculate if stats missing
          fetch(`http://localhost:3000/api/tasks/${storedUser._id}`)
            .then((res) => res.json())
            .then((tasks) => {
              const completed = tasks.filter((t) => t.isCompleted);
              setCompletedTasks(completed.length);
              setPoints(completed.reduce((sum, t) => sum + (t.points || 0), 0));
            });
        }
      });

    // Fetch badges metadata (cache in localStorage)
    const cachedBadges = localStorage.getItem("badges_metadata");
    if (cachedBadges) {
      const allBadges = JSON.parse(cachedBadges);
      setBadges(
        allBadges.filter((b) => storedUser.badges && storedUser.badges.includes(b.id))
      );
    } else {
      fetch("http://localhost:3000/api/badges")
        .then((res) => res.json())
        .then((allBadges) => {
          localStorage.setItem("badges_metadata", JSON.stringify(allBadges));
          setBadges(
            allBadges.filter((b) => storedUser.badges && storedUser.badges.includes(b.id))
          );
        });
    }
  }, []);

  if (!user) return <div>You are not authenticated.</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 fade-in">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-600">
            <span className="font-bold text-lg">{user.username.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user.username}'s Profile</h1>
            <p className="text-sm text-gray-500">Your progress and badges</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { window.location.hash = "#/home"; }}
            className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors" 
            title="Back to Home"
          >
            <i className="ph-bold ph-house text-xl"></i>
          </button>
          <button
            onClick={() => { localStorage.removeItem("user"); window.location.hash = "#/login"; }}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"     
            title="Logout"
          >
            <i className="ph-bold ph-sign-out text-xl"></i>
          </button>
        </div>
      </header>

      {/* Profile Card */}
      <div className="bg-gradient-to-r from-brand-600 to-indigo-600 rounded-3xl p-8 text-white shadow-glow mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
          <i className="ph-fill ph-user text-[120px]"></i>
        </div>
        <h2 className="text-3xl font-bold mb-2">Welcome, {user.username}!</h2>
        <p className="text-brand-100 mb-6 max-w-xs">Here you can see your progress and all badges you have earned so far.</p>
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 text-lg">
            <i className="ph-fill ph-star text-yellow-300"></i>
            <b>Total points:</b> {points}
          </span>
          <span className="inline-flex items-center gap-2 text-lg">
            <i className="ph-fill ph-check-circle text-green-200"></i>
            <b>Completed tasks:</b> {completedTasks}
          </span>
          <span className="inline-flex items-center gap-2 text-lg">
            <i className="ph-fill ph-envelope text-brand-100"></i>
            <b>Email:</b> {user.email}
          </span>
        </div>
      </div>

      {/* Badges Section */}
      <div className="mb-4">
        <div className="font-bold text-gray-700 mb-2 text-lg flex items-center gap-2">
          <i className="ph-fill ph-medal text-brand-600"></i> Badges earned
        </div>
        <div className="flex flex-wrap gap-3">
          {badges.length === 0 && <span className="text-gray-400">No badges yet.</span>}
          {badges.map((badge) => (
            <span key={badge.id} title={badge.description} className="flex items-center gap-2 bg-brand-50 text-brand-900 rounded-xl px-4 py-2 text-lg font-semibold shadow-soft">
              <span style={{ fontSize: 24 }}>{badge.label}</span>
              <span className="text-xs text-gray-500">{badge.description}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

window.ProfilePage = ProfilePage;
