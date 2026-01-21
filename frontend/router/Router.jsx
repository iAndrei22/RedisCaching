const { useState, useEffect } = React;

// Lazy-load page components
const loadPage = async (path) => {
    switch (path) {
        case "#/login":
            return window.LoginPage;
        case "#/home":
            return window.HomePage;
        case "#/tasks":
            return window.TasksPage;
        case "#/profile":
            return window.ProfilePage;
        default:
            return window.LoginPage;
    }
};

const Router = () => {
    const [Page, setPage] = useState(null);

    // Load correct component when hash changes
    const updateRoute = async () => {
        const pagePath = window.location.hash || "#/login";
        const Component = await loadPage(pagePath);
        setPage(() => Component);
    };

    useEffect(() => {
        updateRoute();
        window.addEventListener("hashchange", updateRoute);
        return () => window.removeEventListener("hashchange", updateRoute);
    }, []);

    return Page ? <Page /> : <p>Loading...</p>;
};

window.Router = Router;
