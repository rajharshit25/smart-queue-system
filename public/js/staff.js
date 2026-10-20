
"use strict";

const STORAGE_KEY = "smartQueueTokens";

function getTokens() {
    try {
        const data = JSON.parse(
            localStorage.getItem(STORAGE_KEY) || "[]"
        );

        return Array.isArray(data)
            ? data.filter(token =>
                token &&
                typeof token === "object" &&
                !Array.isArray(token)
            )
            : [];
    } catch (error) {
        console.error("Unable to load queue tokens:", error);
        return [];
    }
}

function saveTokens(tokens) {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(tokens)
        );
        return true;
    } catch (error) {
        console.error("Unable to save queue tokens:", error);
        return false;
    }
}

function getTokenTime(token) {
    const time = new Date(token.createdAt || 0).getTime();
    return Number.isFinite(time) ? time : 0;
}

function sortWaitingTokens(tokens) {
    return tokens.sort((a, b) => {
        const priorityDifference =
            Number(Boolean(b.priority)) -
            Number(Boolean(a.priority));

        return priorityDifference ||
            getTokenTime(a) - getTokenTime(b);
    });
}

function getCurrentToken(tokens, service) {
    return tokens.find(token =>
        token.service === service &&
        token.status === "Serving"
    );
}

function callNextToken() {
    const service = document.getElementById("serviceFilter")?.value
        || "College Office";

    const tokens = getTokens();

    if (getCurrentToken(tokens, service)) {
        showStaffMessage(
            "Complete the current token before calling another."
        );
        return;
    }

    const nextToken = sortWaitingTokens(
        tokens.filter(token =>
            token.service === service &&
            token.status === "Waiting"
        )
    )[0];

    if (!nextToken) {
        showStaffMessage(
            "There are no waiting tokens for this service."
        );
        renderStaff();
        return;
    }

    nextToken.status = "Serving";

    if (!saveTokens(tokens)) {
        showStaffMessage("Could not save the queue changes.");
        return;
    }

    showStaffMessage(
        "Now serving " + nextToken.tokenNumber +
        (nextToken.priority ? " — Priority token." : ".")
    );

    renderStaff();
}

function completeToken(id) {
    const tokens = getTokens();
    const token = tokens.find(item => item.id === id);

    if (!token || token.status !== "Serving") {
        showStaffMessage("The serving token could not be found.");
        return;
    }

    token.status = "Completed";

    if (!saveTokens(tokens)) {
        showStaffMessage("Could not save the queue changes.");
        return;
    }

    showStaffMessage(
        (token.tokenNumber || "Token") + " marked completed."
    );

    renderStaff();
}

function deleteToken(id) {
    const tokens = getTokens();
    const token = tokens.find(item => item.id === id);

    if (!token) {
        showStaffMessage("Token not found.");
        return;
    }

    if (!confirm(
        "Delete token " + (token.tokenNumber || "") + "?\n" +
        "This action cannot be undone."
    )) {
        return;
    }

    if (!saveTokens(tokens.filter(item => item.id !== id))) {
        showStaffMessage("Could not save the queue changes.");
        return;
    }

    showStaffMessage(
        (token.tokenNumber || "Token") + " deleted."
    );

    renderStaff();
}

function togglePriority(id) {
    const tokens = getTokens();
    const token = tokens.find(item => item.id === id);

    if (!token || token.status !== "Waiting") {
        showStaffMessage(
            "Only waiting tokens can have their priority changed."
        );
        return;
    }

    token.priority = !Boolean(token.priority);

    if (!saveTokens(tokens)) {
        showStaffMessage("Could not save the priority change.");
        return;
    }

    showStaffMessage(
        token.tokenNumber +
        (token.priority
            ? " marked as priority."
            : " is now a regular token.")
    );

    renderStaff();
}

function showStaffMessage(message) {
    const element = document.getElementById("staffMessage");

    if (element) {
        element.textContent = message;
    }
}

function renderStaff() {
    const service = document.getElementById("serviceFilter")?.value
        || "College Office";

    const tokens = getTokens();

    const serviceTokens = tokens
        .filter(token => token.service === service)
        .sort((a, b) => {
            const statusOrder = {
                Serving: 0,
                Waiting: 1,
                Completed: 2
            };

            const difference =
                (statusOrder[a.status] ?? 3) -
                (statusOrder[b.status] ?? 3);

            if (difference !== 0) return difference;

            if (a.status === "Waiting") {
                return sortWaitingTokens([a, b])[0] === a ? -1 : 1;
            }

            return getTokenTime(a) - getTokenTime(b);
        });

    const waiting = sortWaitingTokens(
        serviceTokens.filter(token => token.status === "Waiting")
    );

    const completed = serviceTokens.filter(
        token => token.status === "Completed"
    );

    const current = getCurrentToken(serviceTokens, service);
    const next = waiting[0];

    const setText = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    setText(
        "currentToken",
        current ? (current.tokenNumber || "—") : "---"
    );

    setText(
        "currentName",
        current ? "Customer: " + (current.name || "Unknown")
                : "No active token"
    );

    setText(
        "currentService",
        current ? service : "Choose Call Next Token to begin service."
    );

    setText("waitingCount", waiting.length);
    setText("completedCount", completed.length);
    setText("totalCount", serviceTokens.length);
    setText("nextToken", next ? (next.tokenNumber || "—") : "—");

    const callButton = document.getElementById("callNextButton");
    const completeButton = document.getElementById("completeButton");

    if (callButton) {
        callButton.disabled = Boolean(current) || waiting.length === 0;
    }

    if (completeButton) {
        completeButton.disabled = !current;
    }

    const tbody = document.getElementById("staffQueueBody");
    if (!tbody) return;

    tbody.replaceChildren();

    function addCell(row, value, className) {
        const cell = document.createElement("td");
        cell.textContent = value == null ? "" : String(value);

        if (className) cell.className = className;

        row.appendChild(cell);
        return cell;
    }

    function addButton(parent, text, className, handler) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.textContent = text;
        button.addEventListener("click", handler);
        parent.appendChild(button);
    }

    serviceTokens.forEach(token => {
        const row = document.createElement("tr");

        if (token.status === "Waiting" && token.priority) {
            row.classList.add("priority-row");
        }

        let position = "—";

        if (token.status === "Serving") {
            position = "Serving";
        } else if (token.status === "Waiting") {
            position = "#" + (waiting.indexOf(token) + 1);
        } else if (token.status === "Completed") {
            position = "Done";
        }

        addCell(row, position);
        addCell(row, token.tokenNumber || "—", "token-cell");
        addCell(row, token.name || "—");

        const priorityCell = addCell(row, "");

        if (token.status === "Waiting" && token.priority) {
            const badge = document.createElement("span");
            badge.className = "priority-badge";
            badge.textContent = "★ PRIORITY";
            priorityCell.appendChild(badge);
        } else {
            priorityCell.textContent =
                token.status === "Waiting" ? "Regular" : "—";
        }

        const statusCell = addCell(row, "");
        const statusBadge = document.createElement("span");

        statusBadge.className = "status " + ({
            Waiting: "waiting",
            Serving: "serving",
            Completed: "completed"
        }[token.status] || "waiting");

        statusBadge.textContent = token.status || "Waiting";
        statusCell.appendChild(statusBadge);

        const actions = addCell(row, "");

        if (token.status === "Waiting") {
            addButton(
                actions,
                token.priority ? "★ Remove Priority" : "☆ Make Priority",
                "small-button priority-button",
                () => togglePriority(token.id)
            );

            const callTokenButton = document.createElement("button");
            callTokenButton.type = "button";
            callTokenButton.className = "small-button";
            callTokenButton.textContent = "Call Token";
            callTokenButton.disabled = Boolean(current);
            callTokenButton.addEventListener("click", () => {
                callSpecificToken(token.id);
            });
            actions.appendChild(callTokenButton);
        } else if (token.status === "Serving") {
            actions.appendChild(document.createTextNode("In service "));
        } else {
            actions.appendChild(document.createTextNode("Finished "));
        }

        addButton(
            actions,
            "Delete",
            "small-button delete-button",
            () => deleteToken(token.id)
        );

        tbody.appendChild(row);
    });

    const emptyMessage = document.getElementById("noTokensMessage");

    if (emptyMessage) {
        emptyMessage.style.display =
            serviceTokens.length ? "none" : "block";
    }

    setText(
        "lastUpdated",
        "Updated " + new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        })
    );
}

function callSpecificToken(id) {
    const service = document.getElementById("serviceFilter")?.value
        || "College Office";

    const tokens = getTokens();

    if (getCurrentToken(tokens, service)) {
        showStaffMessage("Complete the current token first.");
        return;
    }

    const token = tokens.find(item =>
        item.id === id &&
        item.service === service &&
        item.status === "Waiting"
    );

    if (!token) {
        showStaffMessage("Token is no longer waiting.");
        renderStaff();
        return;
    }

    const next = sortWaitingTokens(
        tokens.filter(item =>
            item.service === service && item.status === "Waiting"
        )
    )[0];

    if (next && next.id !== token.id) {
        showStaffMessage(
            "Please call " + next.tokenNumber + " first" +
            (next.priority ? " (Priority)." : ".")
        );
        return;
    }

    token.status = "Serving";

    if (!saveTokens(tokens)) {
        showStaffMessage("Could not save the queue changes.");
        return;
    }

    showStaffMessage("Now serving " + token.tokenNumber + ".");
    renderStaff();
}

document.addEventListener("DOMContentLoaded", function () {
    const serviceFilter = document.getElementById("serviceFilter");
    const callButton = document.getElementById("callNextButton");
    const completeButton = document.getElementById("completeButton");

    if (!serviceFilter || !callButton || !completeButton) {
        return;
    }

    serviceFilter.addEventListener("change", function () {
        showStaffMessage("Showing " + serviceFilter.value + " queue.");
        renderStaff();
    });

    callButton.addEventListener("click", callNextToken);

    completeButton.addEventListener("click", function () {
        const service = serviceFilter.value;
        const current = getCurrentToken(getTokens(), service);

        if (current) completeToken(current.id);
    });

    window.addEventListener("storage", function (event) {
        if (event.key === STORAGE_KEY || event.key === null) {
            renderStaff();
        }
    });

    renderStaff();
    setInterval(renderStaff, 3000);
});
