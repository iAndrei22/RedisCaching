const { useState } = React;

const LoginPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [form, setForm] = useState({ username: "", email: "", password: "" });
    const [msg, setMsg] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg("Processing...");

        const endpoint = isLogin ? "/login" : "/register";
        const body = isLogin 
            ? { email: form.email, password: form.password } 
            : form;

        try {
            const res = await fetch(API_URL + endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (!res.ok) return setMsg("Error: " + data.message);

            if (isLogin) {
                // Store user info (id, username, email, badges) in localStorage
                const { _id, username, email, badges } = data.user;
                localStorage.setItem("user", JSON.stringify({ _id, username, email, badges }));
                window.location.hash = "#/home";
            } else {
                setMsg("Account created! Please log in.");
                setIsLogin(true);
            }
        } catch {
            setMsg("Network error");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-indigo-100 p-4">
            <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-soft fade-in border border-white">
                
                {/* Logo Area */}
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-brand-600 rounded-xl mx-auto flex items-center justify-center mb-3 text-white shadow-glow">
                        <i className="ph-bold ph-lightning text-2xl"></i>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">DisciplineBuddy</h1>
                    <p className="text-gray-500 text-sm mt-1">Master your daily habits</p>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                    <button 
                        onClick={() => setIsLogin(true)}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${isLogin ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Login
                    </button>
                    <button 
                        onClick={() => setIsLogin(false)}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${!isLogin ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Register
                    </button>
                </div>

                {msg && (
                    <div className={`mb-4 p-3 rounded-lg text-sm text-center font-medium ${msg.includes("Error") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                        {msg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div className="relative">
                            <i className="ph ph-user absolute left-3 top-3.5 text-gray-400"></i>
                            <input 
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                                placeholder="Username"
                                onChange={e => setForm({ ...form, username: e.target.value })}
                            />
                        </div>
                    )}

                    <div className="relative">
                        <i className="ph ph-envelope absolute left-3 top-3.5 text-gray-400"></i>
                        <input 
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                            type="email"
                            placeholder="Email Address"
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                    </div>

                    <div className="relative">
                        <i className="ph ph-lock absolute left-3 top-3.5 text-gray-400"></i>
                        <input 
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all"
                            type="password"
                            placeholder="Password"
                            onChange={e => setForm({ ...form, password: e.target.value })}
                        />
                    </div>

                    <button className="w-full bg-brand-600 hover:bg-brand-900 text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2">
                        <span>{isLogin ? "Sign In" : "Create Account"}</span>
                        <i className="ph-bold ph-arrow-right"></i>
                    </button>
                </form>
            </div>
        </div>
    );
};

window.LoginPage = LoginPage;