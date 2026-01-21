window.API_URL = "http://localhost:3000/api";

// Simple wrapper for GET requests
window.apiGet = async (url) => {
    const res = await fetch(API_URL + url);
    return res.json();
};

// Simple wrapper for POST requests
window.apiPost = async (url, body) => {
    const res = await fetch(API_URL + url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    return res.json();
};

// Simple wrapper for PATCH/PUT requests (backend uses PUT for toggling completion)
window.apiPatch = async (url, body) => {
    const res = await fetch(API_URL + url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    return res.json();
};

// Also expose apiPut as an alias
window.apiPut = window.apiPatch;
