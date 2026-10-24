/**
 * FINDIT@CAMPUS - Frontend Integration & Smart Match Script
 */

const API_BASE = (window.FINDIT_API_BASE || "/api").replace(/\/$/, "");

function bindItemDetails(container, items) {
    container.querySelectorAll("[data-item-details]").forEach((button, index) => {
        button.addEventListener("click", () => viewItemDetails(items[index]));
    });
}

// ==========================================
// AUTH UTILITIES & TOKEN MANAGEMENT
// ==========================================

function getToken() {
    return localStorage.getItem("token");
}

function getUserEmail() {
    return localStorage.getItem("userEmail");
}

function setAuth(token, email) {
    localStorage.setItem("token", token);
    localStorage.setItem("userEmail", email);
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    window.location.href = "login.html";
}

// Global API Request Helper with JWT Auth & Error Handling
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = options.headers || {};

    if (!headers["Content-Type"] && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const token = getToken();
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            // Handle expired / unauthorized token
            if (response.status === 401 && token) {
                console.warn("Session expired or invalid token.");
                // Only clear and redirect if on a protected page
                const isProtectedPage =
                    window.location.pathname.includes("dashboard.html") ||
                    window.location.pathname.includes("my-reports.html");

                if (isProtectedPage) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("userEmail");
                    window.location.href = "login.html";
                }
            }

            const error = new Error(data.message || `Request failed with status ${response.status}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    } catch (err) {
        throw err;
    }
}

// UI Alert Helper
function showAlert(containerId, message, type = "error") {
    const box = document.getElementById(containerId);
    if (!box) return;

    box.className = `alert-box alert-${type}`;
    box.textContent = message;
    box.style.display = "block";
}

function hideAlert(containerId) {
    const box = document.getElementById(containerId);
    if (box) box.style.display = "none";
}

// Sync Navigation Auth State
function updateNavAuth() {
    const nav = document.getElementById("mainNav");
    const navAuthBtn = document.getElementById("navAuthBtn");
    const token = getToken();
    const userEmail = getUserEmail();

    if (!nav) return;

    if (token && userEmail) {
        // Ensure My Reports and Dashboard links exist
        if (!nav.querySelector('a[href="my-reports.html"]')) {
            const myReportsLink = document.createElement("a");
            myReportsLink.href = "my-reports.html";
            myReportsLink.textContent = "My Reports";
            nav.insertBefore(myReportsLink, navAuthBtn);
        }

        if (!nav.querySelector('a[href="dashboard.html"]')) {
            const dashLink = document.createElement("a");
            dashLink.href = "dashboard.html";
            dashLink.textContent = "Dashboard";
            nav.insertBefore(dashLink, navAuthBtn);
        }

        if (navAuthBtn) {
            navAuthBtn.textContent = `Logout (${userEmail.split("@")[0]})`;
            navAuthBtn.href = "#";
            navAuthBtn.className = "login-btn logout-link";
            navAuthBtn.onclick = (e) => {
                e.preventDefault();
                logout();
            };
        }
    } else {
        if (navAuthBtn) {
            navAuthBtn.textContent = "Login";
            navAuthBtn.href = "login.html";
            navAuthBtn.className = "login-btn";
            navAuthBtn.onclick = null;
        }
    }
}

// ==========================================
// 1. AUTH / LOGIN PAGE
// ==========================================

const loginForm = document.getElementById("loginForm");
const otpSection = document.getElementById("otpSection");
const verifyOtpBtn = document.getElementById("verifyOtpBtn");
const loginMessage = document.getElementById("loginMessage");
const sendOtpBtn = document.getElementById("sendOtpBtn");

if (loginForm) {
    let pendingEmail = "";

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        hideAlert("loginAlert");

        const emailInput = document.getElementById("email");
        const email = emailInput.value.trim();

        if (!email) {
            showAlert("loginAlert", "Please enter your college email.", "error");
            return;
        }

        if (!email.toLowerCase().endsWith("@sru.edu.in")) {
            showAlert("loginAlert", "Please use your valid college email ending in @sru.edu.in", "error");
            return;
        }

        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = "Sending OTP...";

        try {
            const res = await apiRequest("/auth/send-otp", {
                method: "POST",
                body: JSON.stringify({ email }),
            });

            pendingEmail = email;
            otpSection.style.display = "block";
            loginMessage.textContent = res.message || "OTP has been sent to your college email.";
            loginMessage.style.color = "green";
            showAlert("loginAlert", "OTP sent! Please check your college inbox.", "success");
        } catch (err) {
            showAlert("loginAlert", err.message || "Failed to send OTP. Please try again.", "error");
        } finally {
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = "Resend OTP";
        }
    });

    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener("click", async function () {
            const otpInput = document.getElementById("otp");
            const otp = otpInput.value.trim();

            if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
                loginMessage.textContent = "Please enter a valid 6-digit numeric OTP.";
                loginMessage.style.color = "red";
                return;
            }

            verifyOtpBtn.disabled = true;
            verifyOtpBtn.textContent = "Verifying...";

            try {
                const res = await apiRequest("/auth/verify-otp", {
                    method: "POST",
                    body: JSON.stringify({ email: pendingEmail, otp }),
                });

                loginMessage.textContent = "OTP verified! Login successful.";
                loginMessage.style.color = "green";
                showAlert("loginAlert", "Login successful! Redirecting...", "success");

                setAuth(res.token, pendingEmail);

                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 800);
            } catch (err) {
                loginMessage.textContent = err.message || "Incorrect or expired OTP.";
                loginMessage.style.color = "red";
                showAlert("loginAlert", err.message || "Verification failed.", "error");
            } finally {
                verifyOtpBtn.disabled = false;
                verifyOtpBtn.textContent = "Verify OTP";
            }
        });
    }
}

// ==========================================
// 2. REPORT LOST ITEM
// ==========================================

const lostItemForm = document.getElementById("lostItemForm");
if (lostItemForm) {
    lostItemForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        hideAlert("lostFormAlert");

        if (!getToken()) {
            showAlert(
                "lostFormAlert",
                'Please log in using the navigation before submitting a report.',
                "error"
            );
            return;
        }

        const itemName = document.getElementById("itemName").value.trim();
        const category = document.getElementById("category").value;
        const description = document.getElementById("description").value.trim();
        const location = document.getElementById("location").value.trim();
        const contactNumber = document.getElementById("contactNumber").value.trim();

        const submitBtn = document.getElementById("submitLostBtn");
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting Report...";

        try {
            await apiRequest("/items", {
                method: "POST",
                body: JSON.stringify({
                    type: "lost",
                    itemName,
                    category,
                    description,
                    location,
                    contactNumber,
                }),
            });

            showAlert("lostFormAlert", "Lost item report submitted successfully! Redirecting to My Reports...", "success");
            lostItemForm.reset();

            setTimeout(() => {
                window.location.href = "my-reports.html";
            }, 1200);
        } catch (err) {
            showAlert("lostFormAlert", err.message || "Failed to submit lost item report.", "error");
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Lost Item Report";
        }
    });
}

// ==========================================
// 3. REPORT FOUND ITEM
// ==========================================

const foundItemForm = document.getElementById("foundItemForm");
if (foundItemForm) {
    foundItemForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        hideAlert("foundFormAlert");

        if (!getToken()) {
            showAlert(
                "foundFormAlert",
                'Please log in using the navigation before reporting a found item.',
                "error"
            );
            return;
        }

        const itemName = document.getElementById("foundItemName").value.trim();
        const category = document.getElementById("foundCategory").value;
        const description = document.getElementById("foundDescription").value.trim();
        const location = document.getElementById("foundLocation").value.trim();
        const roomNumber = document.getElementById("roomNumber").value.trim() || "8001";
        const contactNumber = document.getElementById("foundContactNumber").value.trim();

        const submitBtn = document.getElementById("submitFoundBtn");
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting Report...";

        try {
            await apiRequest("/items", {
                method: "POST",
                body: JSON.stringify({
                    type: "found",
                    itemName,
                    category,
                    description,
                    location,
                    roomNumber,
                    contactNumber,
                }),
            });

            showAlert("foundFormAlert", "Found item report submitted successfully! Redirecting to My Reports...", "success");
            foundItemForm.reset();

            setTimeout(() => {
                window.location.href = "my-reports.html";
            }, 1200);
        } catch (err) {
            showAlert("foundFormAlert", err.message || "Failed to submit found item report.", "error");
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit Found Item Report";
        }
    });
}

// ==========================================
// 4. SEARCH ITEMS
// ==========================================

let searchDebounceTimer = null;
function debounceSearch() {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(searchItems, 400);
}

async function searchItems() {
    const searchResults = document.getElementById("searchResults");
    if (!searchResults) return;

    const searchInput = (document.getElementById("searchInput")?.value || "").trim();
    const typeFilter = document.getElementById("typeFilter")?.value || "";
    const categoryFilter = document.getElementById("categoryFilter")?.value || "";
    const locationFilter = (document.getElementById("locationFilter")?.value || "").trim();

    searchResults.innerHTML = `
        <div class="loading-indicator">
            <div class="spinner"></div>
            <p>Searching items...</p>
        </div>
    `;

    try {
        const queryParams = new URLSearchParams();
        if (searchInput) queryParams.append("q", searchInput);
        if (typeFilter) queryParams.append("type", typeFilter);
        if (categoryFilter) queryParams.append("category", categoryFilter);
        if (locationFilter) queryParams.append("location", locationFilter);

        const data = await apiRequest(`/items/search?${queryParams.toString()}`);
        const items = data.items || [];

        displaySearchResults(items);
    } catch (err) {
        searchResults.innerHTML = `
            <div class="empty-message">
                <div class="empty-icon">⚠️</div>
                <h3>Failed to load items</h3>
                <p>${escapeHtml(err.message || "Please check your network and try again.")}</p>
            </div>
        `;
    }
}

function displaySearchResults(results) {
    const searchResults = document.getElementById("searchResults");
    if (!searchResults) return;

    if (results.length === 0) {
        searchResults.innerHTML = `
            <div class="empty-message">
                <div class="empty-icon">🔍</div>
                <h3>No items found</h3>
                <p>Try searching with different keywords, categories, or locations.</p>
            </div>
        `;
        return;
    }

    searchResults.innerHTML = results
        .map((item) => {
            const isLost = item.type === "lost";
            const dateStr = item.createdAt
                ? new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                  })
                : "";

            return `
            <div class="item-card">
                <span class="item-status" style="background: ${isLost ? "#fee2e2" : "#dcfce7"}; color: ${
                isLost ? "#b91c1c" : "#15803d"
            }">
                    ${escapeHtml((item.type || "").toUpperCase())}
                </span>

                <h3>${escapeHtml(item.itemName)}</h3>

                <p>
                    <strong>Category:</strong> ${escapeHtml(item.category || "N/A")}
                </p>

                <p>
                    <strong>Location:</strong> ${escapeHtml(item.location || "Not specified")}
                </p>

                ${
                    !isLost && item.roomNumber
                        ? `<p><strong>Handed In At:</strong> Room ${escapeHtml(item.roomNumber)}</p>`
                        : ""
                }

                <p>
                    <strong>Description:</strong> ${escapeHtml(item.description || "")}
                </p>

                ${dateStr ? `<p><small style="color: #9ca3af;">Reported on ${dateStr}</small></p>` : ""}

                <button
                    class="primary-btn"
                    style="margin-top: 10px; width: 100%;"
                    data-item-details
                >
                    View Details
                </button>
            </div>
        `;
        })
        .join("");
    bindItemDetails(searchResults, results);
}

// ==========================================
// 5. MY REPORTS PAGE
// ==========================================

async function loadMyReports() {
    const container = document.getElementById("myReportsContainer");
    if (!container) return;

    if (!getToken()) {
        showAlert(
            "reportsAlert",
            'Please Login using the navigation to view your reports.',
            "error"
        );
        container.innerHTML = `
            <div class="empty-message">
                <div class="empty-icon">🔒</div>
                <h3>Authentication Required</h3>
                <p>You need to be logged in with your college email to view your submitted reports.</p>
                <br>
                <a href="login.html" class="primary-btn" style="text-decoration: none; display: inline-block;">Login Now</a>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="loading-indicator">
            <div class="spinner"></div>
            <p>Loading your reported items...</p>
        </div>
    `;

    try {
        const data = await apiRequest("/items/mine");
        const items = data.items || [];

        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-message">
                    <div class="empty-icon">📋</div>
                    <h3>No reports found</h3>
                    <p>You haven't submitted any lost or found item reports yet.</p>
                    <br>
                    <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                        <a href="report-lost.html" class="primary-btn" style="text-decoration: none;">Report Lost</a>
                        <a href="report-found.html" class="secondary-btn" style="text-decoration: none;">Report Found</a>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = items
            .map((item) => {
                const isLost = item.type === "lost";
                const isResolved = item.status === "resolved";
                const dateStr = item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                      })
                    : "";

                return `
                <div class="report-item-card">
                    <div class="report-top">
                        <span class="report-type ${isLost ? "lost" : "found"}">
                            ${escapeHtml((item.type || "").toUpperCase())}
                        </span>
                        <span class="report-status" style="color: ${isResolved ? "#15803d" : "#2563eb"};">
                            ${isResolved ? "Resolved" : "Active"}
                        </span>
                    </div>

                    <h3>${escapeHtml(item.itemName)}</h3>

                    <p>
                        <strong>Category:</strong> ${escapeHtml(item.category || "N/A")}
                    </p>

                    <p>
                        <strong>Location:</strong> ${escapeHtml(item.location || "N/A")}
                    </p>

                    ${
                        !isLost && item.roomNumber
                            ? `<p><strong>Handed In At:</strong> Room ${escapeHtml(item.roomNumber)}</p>`
                            : ""
                    }

                    <p>
                        <strong>Description:</strong> ${escapeHtml(item.description || "")}
                    </p>

                    ${dateStr ? `<p><small style="color: #9ca3af;">Reported on ${dateStr}</small></p>` : ""}

                    <button class="secondary-btn" data-item-details>
                        View Details
                    </button>
                </div>
            `;
            })
            .join("");
        bindItemDetails(container, items);
    } catch (err) {
        showAlert("reportsAlert", err.message || "Failed to load reports.", "error");
        container.innerHTML = `
            <div class="empty-message">
                <div class="empty-icon">⚠️</div>
                <h3>Failed to load reports</h3>
                <p>${escapeHtml(err.message || "Please try again later.")}</p>
            </div>
        `;
    }
}

// ==========================================
// 6. DASHBOARD & SMART MATCH
// ==========================================

async function loadDashboardData() {
    const welcomeHeader = document.getElementById("welcomeUserHeader");
    const statMyReports = document.getElementById("statMyReports");
    const statMatches = document.getElementById("statMatches");
    const statReturned = document.getElementById("statReturned");
    const matchesContainer = document.getElementById("matchesContainer");

    if (!statMyReports) return;

    if (!getToken()) {
        showAlert(
            "dashboardAlert",
            'Please Login using the navigation to access your dashboard.',
            "error"
        );
        if (matchesContainer) {
            matchesContainer.innerHTML = `
                <div class="empty-message">
                    <div class="empty-icon">🔒</div>
                    <h3>Authentication Required</h3>
                    <p>Please login with your college email to view your dashboard and smart matches.</p>
                    <br>
                    <a href="login.html" class="primary-btn" style="text-decoration: none; display: inline-block;">Login Now</a>
                </div>
            `;
        }
        return;
    }

    const email = getUserEmail();
    if (welcomeHeader && email) {
        const username = email.split("@")[0];
        welcomeHeader.textContent = `Welcome back, ${username}! 👋`;
    }

    try {
        const stats = await apiRequest("/items/dashboard-stats");

        if (statMyReports) statMyReports.textContent = stats.totalReports ?? 0;
        if (statMatches) statMatches.textContent = stats.matchesCount ?? 0;
        if (statReturned) statReturned.textContent = stats.resolvedCount ?? 0;

        const matches = stats.topMatches || [];

        if (matches.length === 0) {
            matchesContainer.innerHTML = `
                <div style="text-align: center; padding: 30px; color: #6b7280;">
                    <div style="font-size: 36px; margin-bottom: 10px;">⚡</div>
                    <h3>No matches found yet</h3>
                    <p>When someone reports an item that matches your lost or found reports, it will appear here automatically.</p>
                </div>
            `;
            return;
        }

        matchesContainer.innerHTML = matches
            .map((m) => {
                const target = m.matchedItem;
                const mine = m.myItem;
                const score = m.matchScore || 0;
                const reasons = m.reasons || [];

                return `
                <div class="match-card" style="margin-bottom: 15px;">
                    <div class="match-icon">⚡</div>

                    <div class="match-content">
                        <h3>
                            Match for your ${mine.type === "lost" ? "lost" : "found"} "${escapeHtml(mine.itemName)}"
                        </h3>

                        <p>
                            A matching ${escapeHtml(target.type)} item <strong>"${escapeHtml(target.itemName)}"</strong> was reported at <strong>${escapeHtml(target.location || "Campus")}</strong>.
                            ${target.roomNumber ? `Handed in at Room ${escapeHtml(target.roomNumber)}.` : ""}
                        </p>

                        <div class="match-reasons-list">
                            ${reasons.map((r) => `<span class="match-reason-tag">✓ ${escapeHtml(r)}</span>`).join("")}
                        </div>

                        <span class="match-score" style="background: ${
                            score >= 70 ? "#dcfce7" : "#fef3c7"
                        }; color: ${score >= 70 ? "#15803d" : "#b45309"};">
                            ${score}% Match
                        </span>
                    </div>

                    <button class="primary-btn" data-item-details>
                        View Match Details
                    </button>
                </div>
            `;
            })
            .join("");
        bindItemDetails(matchesContainer, matches.map((match) => match.matchedItem));
    } catch (err) {
        showAlert("dashboardAlert", err.message || "Failed to load dashboard data.", "error");
        if (matchesContainer) {
            matchesContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #b91c1c;">
                    <p>Could not fetch smart matches. Please try again later.</p>
                </div>
            `;
        }
    }
}

// ==========================================
// 7. MODAL / ITEM DETAILS VIEWER
// ==========================================

function viewItemDetails(item) {
    if (typeof item === "string") {
        try {
            item = JSON.parse(item);
        } catch (e) {
            item = { itemName: item };
        }
    }

    const modal = document.getElementById("itemModal");
    const modalContent = document.getElementById("modalContent");

    if (!modal || !modalContent) {
        alert(
            `Item: ${item.itemName}\nType: ${escapeHtml((item.type || "").toUpperCase())}\nCategory: ${
                item.category || "N/A"
            }\nLocation: ${item.location || "N/A"}\nDescription: ${item.description || ""}`
        );
        return;
    }

    const isLost = item.type === "lost";
    const dateStr = item.createdAt
        ? new Date(item.createdAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
          })
        : "Recently";

    modalContent.innerHTML = `
        <div style="margin-bottom: 15px;">
            <span class="report-type ${isLost ? "lost" : "found"}" style="display: inline-block; margin-bottom: 8px;">
                ${escapeHtml((item.type || "").toUpperCase())} ITEM
            </span>
            <h2 style="font-size: 24px; color: #111827;">${escapeHtml(item.itemName)}</h2>
        </div>

        <div class="modal-detail-row">
            <strong>Category:</strong> ${escapeHtml(item.category || "General")}
        </div>

        <div class="modal-detail-row">
            <strong>Location:</strong> ${escapeHtml(item.location || "Campus")}
        </div>

        ${
            !isLost && item.roomNumber
                ? `<div class="modal-detail-row"><strong>Handed In At:</strong> Room ${escapeHtml(
                      item.roomNumber
                  )} (Lost & Found Desk)</div>`
                : ""
        }

        <div class="modal-detail-row">
            <strong>Reported On:</strong> ${dateStr}
        </div>

        <div class="modal-detail-row">
            <strong>Status:</strong> ${escapeHtml(item.status === "resolved" ? "Resolved" : "Active / Pending")}
        </div>

        ${
            item.contactNumber
                ? `<div class="modal-detail-row"><strong>Contact:</strong> ${escapeHtml(item.contactNumber)}</div>`
                : ""
        }

        ${
            item.reporterEmail
                ? `<div class="modal-detail-row"><strong>Reporter:</strong> ${escapeHtml(item.reporterEmail)}</div>`
                : ""
        }

        <div style="margin-top: 15px; padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
            <strong style="display: block; margin-bottom: 4px; color: #374151;">Description:</strong>
            <p style="color: #4b5563; line-height: 1.5;">${escapeHtml(item.description || "No description provided.")}</p>
        </div>

        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
            <button class="secondary-btn" onclick="closeModal()">Close</button>
        </div>
    `;

    modal.style.display = "flex";
}

function closeModal() {
    const modal = document.getElementById("itemModal");
    if (modal) modal.style.display = "none";
}

// Utility: HTML Escaping to prevent injection
function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Close modal on escape or background click
window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
});

window.addEventListener("click", (e) => {
    const modal = document.getElementById("itemModal");
    if (e.target === modal) closeModal();
});

// ==========================================
// INITIALIZATION ON PAGE LOAD
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    updateNavAuth();

    if (document.getElementById("searchResults")) {
        searchItems();
    }

    if (document.getElementById("myReportsContainer")) {
        loadMyReports();
    }

    if (document.getElementById("statMyReports")) {
        loadDashboardData();
    }
});
