const TOKEN_KEY = "token";

let memoryToken = "";

const getStorage = (type) => {
    try {
        return window[type];
    } catch {
        return null;
    }
};

const getCookieToken = () => {
    if (typeof document === "undefined") {
        return "";
    }

    return document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${TOKEN_KEY}=`))
        ?.split("=")[1] || "";
};

const setCookieToken = (token) => {
    if (typeof document === "undefined") {
        return;
    }

    document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Lax`;
};

const clearCookieToken = () => {
    if (typeof document === "undefined") {
        return;
    }

    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
};

export const getToken = () => {
    const session = getStorage("sessionStorage");
    const local = getStorage("localStorage");

    try {
        return session?.getItem(TOKEN_KEY)
            || local?.getItem(TOKEN_KEY)
            || memoryToken
            || getCookieToken();
    } catch {
        return memoryToken || getCookieToken();
    }
};

export const saveToken = (token) => {
    const session = getStorage("sessionStorage");
    const local = getStorage("localStorage");

    memoryToken = token;

    try {
        session?.setItem(TOKEN_KEY, token);
        local?.removeItem(TOKEN_KEY);

        if (!session) {
            setCookieToken(token);
        }
    } catch {
        setCookieToken(token);
    }
};

export const clearToken = () => {
    const session = getStorage("sessionStorage");
    const local = getStorage("localStorage");

    memoryToken = "";

    try {
        session?.removeItem(TOKEN_KEY);
        local?.removeItem(TOKEN_KEY);
    } finally {
        clearCookieToken();
    }
};

export const isAuthenticated = () => Boolean(getToken());
