
"use strict";

const DASHBOARD_STORAGE_KEY = "smartQueueTokens";

function getDashboardTokens() {
    try {
        const savedTokens = JSON.parse(
            localStorage.getItem(DASHBOARD_STORAGE_KEY) || "[]"
        );

        if (!Array.isArray(savedTokens)) {
            return [];
        }

        return savedTokens.filter(token =>
            token &&
            typeof token === "object" &&
            !Array.isArray(token)
        );
    } catch (error) {
        console.error("Unable to load dashboard tokens:", error);
        return [];
    }
}

function setDashboardText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = String(value);
    }
}

function getDashboardTimestamp(token) {
    const timestamp = new Date(token.createdAt || 0).getTime();

    return Number.isFinite(timestamp) ? timestamp : 0;
}

function renderDashboard() {
    const tokens = getDashboardTokens();

    setDashboardText("totalTokens", tokens.length);
    setDashboardText(
        "waitingTokens",
        tokens.filter(token => token.status === "Waiting").length
    );
    setDashboardText(
        "servingTokens",
        tokens.filter(token => token.status === "Serving").length
    );
    setDashboardText(
        "completedTokens",
        tokens.filter(token => token.status === "Completed").length
    );

    renderRecentTokens(tokens);
    renderServiceSummary(tokens);
}

function renderRecentTokens(tokens) {
    const tableBody = document.getElementById("recentTokens");

    if (!tableBody) return;

    tableBody.replaceChildren();

    const recentTokens = [...tokens]
        .sort((a, b) =>
            getDashboardTimestamp(b) - getDashboardTimestamp(a)
        )
        .slice(0, 8);

    recentTokens.forEach(token => {
        const row = document.createElement("tr");

        const values = [
            token.tokenNumber || "",
            token.name || "",
            token.service || "",
            token.status || ""
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = String(value);
            row.appendChild(cell);
        });

        const priorityCell = document.createElement("td");

        if (token.priority) {
            const badge = document.createElement("span");
            badge.className = "priority-badge";
            badge.textContent = "Priority";
            priorityCell.appendChild(badge);
        } else {
            priorityCell.textContent = "Regular";
        }

        row.appendChild(priorityCell);

        const timeCell = document.createElement("td");
        const timestamp = getDashboardTimestamp(token);

        timeCell.textContent = timestamp
            ? new Date(timestamp).toLocaleString()
            : "";

        row.appendChild(timeCell);
        tableBody.appendChild(row);
    });
}

function renderServiceSummary(tokens) {
    const container = document.getElementById("serviceSummary");

    if (!container) return;

    const services = [
        "College Office",
        "Clinic",
        "College Canteen"
    ];

    container.replaceChildren();

    services.forEach(service => {
        const serviceTokens = tokens.filter(
            token => token.service === service
        );

        const waiting = serviceTokens.filter(
            token => token.status === "Waiting"
        ).length;

        const serving = serviceTokens.filter(
            token => token.status === "Serving"
        ).length;

        const completed = serviceTokens.filter(
            token => token.status === "Completed"
        ).length;

        const card = document.createElement("div");
        card.className = "service-summary-card";

        const heading = document.createElement("h3");
        heading.textContent = service;

        const details = document.createElement("p");
        details.textContent =
            `Waiting: ${waiting} | Serving: ${serving} | Completed: ${completed}`;

        card.append(heading, details);
        container.appendChild(card);
    });
}

document.addEventListener("DOMContentLoaded", function () {
    if (typeof updateAuthNavigation === "function") {
        updateAuthNavigation();
    }

    renderDashboard();

    window.addEventListener("storage", function (event) {
        if (
            event.key === DASHBOARD_STORAGE_KEY ||
            event.key === null
        ) {
            renderDashboard();
        }
    });

    // Keep the dashboard updated while it is open.
    setInterval(renderDashboard, 3000);
});
