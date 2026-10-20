
"use strict";

// ============================================
// SMARTQUEUE AUTHENTICATION SYSTEM
// Demo authentication using browser localStorage.
// Not suitable for production security.
// ============================================

const AUTH_STORAGE_KEY = "smartQueueUser";

const DEMO_USERS = [
    {
        username: "admin",
        password: "Admin123",
        name: "SmartQueue Admin",
        role: "Admin"
    },
    {
        username: "staff",
        password: "Staff123",
        name: "SmartQueue Staff",
        role: "Staff"
    },
    {
        username: "student",
        password: "Student123",
        name: "Demo Student",
        role: "Student"
    }
];

const VALID_ROLES = ["Admin", "Staff", "Student"];

const ROLE_HOME = {
    Admin: "dashboard.html",
    Staff: "staff.html",
    Student: "token.html"
};

const PAGE_PERMISSIONS = {
    "index.html": ["Admin", "Staff", "Student"],
    "login.html": ["Admin", "Staff", "Student"],
    "dashboard.html": ["Admin"],
    "reports.html": ["Admin"],
    "staff.html": ["Admin", "Staff"],
    "token.html": ["Admin", "Student"],
    "status.html": ["Admin", "Staff", "Student"],
    "display.html": []
};

// ============================================
// GET CURRENT USER
// ============================================

function getCurrentUser() {
    try {
        const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);

        if (!savedUser) return null;

        const user = JSON.parse(savedUser);

        if (
            !user ||
            typeof user.username !== "string" ||
            typeof user.name !== "string" ||
            !VALID_ROLES.includes(user.role)
        ) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            return null;
        }

        return user;
    } catch (error) {
        console.error("Unable to read login session:", error);
        return null;
    }
}

// ============================================
// LOGIN
// ============================================

function loginUser(username, password) {
    const cleanUsername = String(username || "").trim();
    const cleanPassword = String(password || "");

    const matchedUser = DEMO_USERS.find(user =>
        user.username === cleanUsername &&
        user.password === cleanPassword
    );

    if (!matchedUser) {
        return {
            success: false,
            message: "Invalid username or password."
        };
    }

    const session = {
        username: matchedUser.username,
        name: matchedUser.name,
        role: matchedUser.role
    };

    try {
        localStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify(session)
        );

        return {
            success: true,
            user: session
        };
    } catch (error) {
        console.error("Unable to save login session:", error);

        return {
            success: false,
            message: "Could not save login in this browser."
        };
    }
}

// ============================================
// LOGOUT
// ============================================

function logoutUser() {
    try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        window.location.replace("login.html");
    } catch (error) {
        console.error("Could not clear login session:", error);
        alert("Unable to log out. Please try again.");
    }
}

// ============================================
// ROLE HOME PAGE
// ============================================

function getRoleHome(role) {
    return ROLE_HOME[role] || "index.html";
}

// ============================================
// CHECK ROLE ACCESS
// ============================================

function requireRole(allowedRoles) {
    const user = getCurrentUser();

    if (!user) {
        window.location.replace("login.html");
        return null;
    }

    // Admin can access every protected project page.
    if (
        user.role !== "Admin" &&
        !Array.isArray(allowedRoles)
            || (
                user.role !== "Admin" &&
                !allowedRoles.includes(user.role)
            )
    ) {
        alert(
            "Access denied. Your " +
            user.role +
            " account cannot access this page."
        );

        window.location.replace(getRoleHome(user.role));
        return null;
    }

    return user;
}

// ============================================
// PROTECT CURRENT PAGE
// ============================================

function protectCurrentPage() {
    const filename = window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();

    if (
        !Object.prototype.hasOwnProperty.call(
            PAGE_PERMISSIONS,
            filename
        )
    ) {
        return true;
    }

    // Login and live display are public.
    if (
        filename === "login.html" ||
        filename === "display.html"
    ) {
        return true;
    }

    const allowedRoles = PAGE_PERMISSIONS[filename];

    if (allowedRoles.length === 0) {
        return true;
    }

    return Boolean(requireRole(allowedRoles));
}

// ============================================
// UPDATE NAVIGATION
// ============================================

function updateAuthNavigation() {
    const user = getCurrentUser();

    const userInfo = document.getElementById("authUserInfo");
    const loginLink = document.getElementById("authLoginLink");
    const logoutButton = document.getElementById("authLogoutButton");

    if (userInfo) {
        userInfo.textContent = user
            ? "Logged in: " + user.name + " (" + user.role + ")"
            : "Not logged in";
    }

    if (loginLink) {
        loginLink.hidden = Boolean(user);
    }

    if (logoutButton) {
        logoutButton.hidden = !user;
    }

    document.querySelectorAll("[data-allowed-roles]").forEach(element => {
        const allowedRoles = (element.dataset.allowedRoles || "")
            .split(",")
            .map(role => role.trim())
            .filter(Boolean);

        element.hidden = !user || (
            user.role !== "Admin" &&
            !allowedRoles.includes(user.role)
        );
    });
}

// ============================================
// CHECK WHETHER USER HAS A ROLE
// ============================================

function userHasRole(allowedRoles) {
    const user = getCurrentUser();

    return Boolean(
        user &&
        Array.isArray(allowedRoles) &&
        allowedRoles.includes(user.role)
    );
}

// ============================================
// INITIALIZE AUTHENTICATION
// ============================================

document.addEventListener("DOMContentLoaded", function () {
    const filename = window.location.pathname
        .split("/")
        .pop()
        .toLowerCase();

    // Do not automatically redirect from the login page.
    if (filename === "login.html") {
        updateAuthNavigation();
        return;
    }

    const accessGranted = protectCurrentPage();

    // Avoid further navigation updates if access was denied.
    if (accessGranted !== false) {
        updateAuthNavigation();
    }
});
