
"use strict";

const DISPLAY_STORAGE_KEY = "smartQueueTokens";

const DISPLAY_SERVICE_MINUTES = {
    "College Office": 5,
    "Clinic": 10,
    "College Canteen": 3
};

function getDisplayTokens() {
    try {
        const data = JSON.parse(
            localStorage.getItem(DISPLAY_STORAGE_KEY) || "[]"
        );

        if (!Array.isArray(data)) return [];

        return data.filter(token =>
            token &&
            typeof token === "object" &&
            !Array.isArray(token)
        );
    } catch (error) {
        console.error("Unable to load queue tokens:", error);
        return [];
    }
}

function getDisplayTime(token) {
    const timestamp = new Date(token.createdAt || 0).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortDisplayTokens(tokens) {
    const statusOrder = {
        Serving: 0,
        Waiting: 1,
        Completed: 2
    };

    return tokens.sort((a, b) => {
        const difference =
            (statusOrder[a.status] ?? 3) -
            (statusOrder[b.status] ?? 3);

        if (difference !== 0) return difference;

        if (a.status === "Waiting" && b.status === "Waiting") {
            const priorityDifference =
                Number(Boolean(b.priority)) -
                Number(Boolean(a.priority));

            if (priorityDifference !== 0) {
                return priorityDifference;
            }
        }

        return getDisplayTime(a) - getDisplayTime(b);
    });
}

function getEstimatedWait(tokens, token) {
    if (token.status === "Serving" || token.status === "Completed") {
        return token.status === "Serving" ? "Serving now" : "—";
    }

    const serviceTokens = tokens.filter(item =>
        item.service === token.service &&
        (item.status === "Serving" || item.status === "Waiting")
    );

    const waiting = sortDisplayTokens(
        serviceTokens.filter(item => item.status === "Waiting")
    );

    const position = waiting.findIndex(item => item.id === token.id);

    if (position === -1) return "—";

    let minutes = serviceTokens
        .filter(item => item.status === "Serving")
        .reduce((total, item) => {
            return total +
                (DISPLAY_SERVICE_MINUTES[item.service] || 5);
        }, 0);

    for (let i = 0; i < position; i++) {
        minutes += DISPLAY_SERVICE_MINUTES[waiting[i].service] || 5;
    }

    return minutes + " min";
}

function renderDisplay() {
    const allTokens = getDisplayTokens();

    const filter = document.getElementById("serviceFilter");
    const selectedService = filter ? filter.value : "All";

    const tokens = allTokens.filter(token =>
        selectedService === "All" ||
        token.service === selectedService
    );

    const serving = sortDisplayTokens(
        tokens.filter(token => token.status === "Serving")
    );

    const waiting = sortDisplayTokens(
        tokens.filter(token => token.status === "Waiting")
    );

    const completed = sortDisplayTokens(
        tokens.filter(token => token.status === "Completed")
    );

    const orderedTokens = [...serving, ...waiting, ...completed];

    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = String(value);
    };

    setText(
        "nowServing",
        serving.length
            ? serving.map(token => token.tokenNumber || "—").join(", ")
            : "None"
    );

    setText("waitingCount", waiting.length);
    setText("completedCount", completed.length);
    setText("totalCount", tokens.length);

    setText(
        "nextToken",
        waiting.length ? (waiting[0].tokenNumber || "—") : "—"
    );

    const tbody = document.getElementById("queueTableBody")
        || document.getElementById("displayQueueBody");

    if (!tbody) {
        // The updated display.html uses a different table ID and
        // renders its queue independently in its own inline script.
        return;
    }

    tbody.replaceChildren();

    orderedTokens.forEach((token, index) => {
        const row = document.createElement("tr");

        const position = token.status === "Serving"
            ? "Serving"
            : token.status === "Completed"
                ? "Done"
                : "#" + (
                    waiting.findIndex(item => item.id === token.id) + 1
                );

        const addCell = (value, className) => {
            const cell = document.createElement("td");
            cell.textContent = value == null ? "" : String(value);
            if (className) cell.className = className;
            row.appendChild(cell);
            return cell;
        };

        addCell(position);
        addCell(token.tokenNumber || "—", "token-cell");
        addCell(token.name || "—");
        addCell(token.service || "—");

        const priorityCell = addCell("");

        if (token.priority) {
            const badge = document.createElement("span");
            badge.className = "priority-badge";
            badge.textContent = "★ PRIORITY";
            priorityCell.appendChild(badge);
        } else {
            priorityCell.textContent = "Regular";
        }

        const statusCell = addCell("");
        const badge = document.createElement("span");

        badge.className = "status " + ({
            Waiting: "waiting",
            Serving: "serving",
            Completed: "completed"
        }[token.status] || "waiting");

        badge.textContent = token.status || "Waiting";
        statusCell.appendChild(badge);

        addCell(getEstimatedWait(allTokens, token));

        tbody.appendChild(row);
    });

    setText(
        "lastUpdated",
        "Updated " + new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        })
    );

    const emptyMessage = document.getElementById("emptyMessage");

    if (emptyMessage) {
        emptyMessage.style.display = tokens.length ? "none" : "block";
    }
}

document.addEventListener("DOMContentLoaded", function () {
    if (typeof updateAuthNavigation === "function") {
        updateAuthNavigation();
    }

    const filter = document.getElementById("serviceFilter");

    if (filter) {
        filter.addEventListener("change", renderDisplay);
    }

    renderDisplay();

    window.addEventListener("storage", function (event) {
        if (event.key === DISPLAY_STORAGE_KEY || event.key === null) {
            renderDisplay();
        }
    });

    setInterval(renderDisplay, 3000);
});
