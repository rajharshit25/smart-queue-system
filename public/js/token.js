
"use strict";

const TOKEN_STORAGE_KEY = "smartQueueTokens";
const LATEST_TOKEN_KEY = "smartQueueLatestToken";

const SERVICE_PREFIXES = {
    "College Office": "CO",
    "Clinic": "CL",
    "College Canteen": "CA"
};

function loadSavedTokens() {
    try {
        const savedData = JSON.parse(
            localStorage.getItem(TOKEN_STORAGE_KEY) || "[]"
        );

        return Array.isArray(savedData)
            ? savedData.filter(token =>
                token &&
                typeof token === "object" &&
                !Array.isArray(token)
            )
            : [];
    } catch (error) {
        console.error("Unable to load saved tokens:", error);
        return [];
    }
}

function saveTokens(tokens) {
    try {
        localStorage.setItem(
            TOKEN_STORAGE_KEY,
            JSON.stringify(tokens)
        );
        return true;
    } catch (error) {
        console.error("Unable to save tokens:", error);
        alert("Unable to save your token. Please check browser storage.");
        return false;
    }
}

function generateTokenNumber(service, tokens) {
    const prefix = SERVICE_PREFIXES[service];

    if (!prefix) {
        throw new Error("Please select a valid service.");
    }

    const highestNumber = tokens
        .filter(token => token.service === service)
        .reduce((highest, token) => {
            const match = String(token.tokenNumber || "").match(/\d+$/);
            return Math.max(highest, match ? Number(match[0]) : 0);
        }, 0);

    return prefix + String(highestNumber + 1).padStart(3, "0");
}

function createToken(name, service, priority = false) {
    if (typeof name !== "string" || !name.trim()) {
        alert("Please enter your name.");
        return null;
    }

    if (!Object.prototype.hasOwnProperty.call(SERVICE_PREFIXES, service)) {
        alert("Please select a valid service.");
        return null;
    }

    const tokens = loadSavedTokens();

    const token = {
        id: Date.now().toString() +
            Math.random().toString(16).slice(2),
        name: name.trim(),
        service,
        tokenNumber: generateTokenNumber(service, tokens),
        status: "Waiting",
        createdAt: new Date().toISOString(),
        priority: Boolean(priority)
    };

    tokens.push(token);

    if (!saveTokens(tokens)) {
        return null;
    }

    try {
        sessionStorage.setItem(
            LATEST_TOKEN_KEY,
            JSON.stringify(token)
        );
    } catch (error) {
        console.warn("Could not save the latest token receipt:", error);
    }

    return token;
}

function getQueuePosition(token, tokens = loadSavedTokens()) {
    if (!token) return 0;

    const activeTokens = tokens
        .filter(item =>
            item.service === token.service &&
            (item.status === "Waiting" || item.status === "Serving")
        )
        .sort((a, b) => {
            if (a.status === "Serving" && b.status !== "Serving") return -1;
            if (b.status === "Serving" && a.status !== "Serving") return 1;

            if (a.status === "Waiting" && b.status === "Waiting") {
                if (Boolean(a.priority) !== Boolean(b.priority)) {
                    return a.priority ? -1 : 1;
                }
            }

            const timeA = new Date(a.createdAt || 0).getTime() || 0;
            const timeB = new Date(b.createdAt || 0).getTime() || 0;

            return timeA - timeB;
        });

    const index = activeTokens.findIndex(item => item.id === token.id);

    return index === -1 ? 0 : index + 1;
}
