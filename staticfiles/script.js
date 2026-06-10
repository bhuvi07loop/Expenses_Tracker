// script.js

(function () {
  const params = new URLSearchParams(window.location.search);
  const forcedLogout =
    params.get("logged_out") === "1" || params.get("logout") === "1";

  window.__WEALTH_FORCED_LOGOUT__ = forcedLogout;

  if (forcedLogout) {
    sessionStorage.clear();
    localStorage.removeItem("wealth_logged_in");
    localStorage.removeItem("wealth_current_email");
  }
})();

document.addEventListener("DOMContentLoaded", function () {
  const root = document.documentElement;
  const body = document.body;

  const $ = (id) => document.getElementById(id);
  const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getInputValue(id) {
    const el = $(id);
    return el ? el.value : "";
  }

  function setInputValue(id, value) {
    const el = $(id);
    if (el) el.value = value;
  }

  function getNumber(id) {
    return Number(getInputValue(id) || 0);
  }

  const login = $("page-login");
  const app = $("app");

  const forcedLogout = window.__WEALTH_FORCED_LOGOUT__ === true;
  const djangoAuth = body.dataset.djangoAuth === "true";
  const djangoEmail = String(body.dataset.djangoEmail || "").trim().toLowerCase();

  let currentEmail = "";
  let expenses = [];
  let investments = [];
  let editingExpense = null;
  let editingInvestment = null;
  let activeCat = "all";
  let pendingConfirmAction = null;
  let maturityManuallyEdited = false;
  let cloudSaveTimer = null;
  let expensesExpanded = false;

  function clearLoginSessionOnly() {
    sessionStorage.clear();
    localStorage.removeItem("wealth_logged_in");
    localStorage.removeItem("wealth_current_email");
  }

  function cleanEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function userKey(name) {
    const email = cleanEmail(
      currentEmail || localStorage.getItem("wealth_current_email") || "guest"
    );
    return "wealth_" + email + "_" + name;
  }

  function loadUserData() {
    currentEmail = cleanEmail(djangoEmail || localStorage.getItem("wealth_current_email"));

    try {
      expenses = JSON.parse(localStorage.getItem(userKey("expenses")) || "[]");
    } catch {
      expenses = [];
    }

    try {
      investments = JSON.parse(localStorage.getItem(userKey("investments")) || "[]");
    } catch {
      investments = [];
    }
  }

  function saveUserData() {
    localStorage.setItem(userKey("expenses"), JSON.stringify(expenses));
    localStorage.setItem(userKey("investments"), JSON.stringify(investments));
    saveToDatabaseDebounced();
  }

  function getIncome() {
    return Number(localStorage.getItem(userKey("income")) || 0);
  }

  function setIncome(value) {
    localStorage.setItem(userKey("income"), Number(value || 0));
    saveToDatabaseDebounced();
  }

  function hasSavedName() {
    return !!localStorage.getItem(userKey("name"));
  }

  function defaultNameFromEmail() {
    if (!currentEmail) return "User";
    return currentEmail.split("@")[0];
  }

  function getName() {
    const savedName = localStorage.getItem(userKey("name"));
    if (savedName) return savedName;
    return defaultNameFromEmail();
  }

  function setName(name) {
    localStorage.setItem(userKey("name"), name);
    saveToDatabaseDebounced();
  }

  function getSavedPage() {
    return Number(localStorage.getItem(userKey("active_page")) || 1);
  }

  function saveActivePage(num) {
    localStorage.setItem(userKey("active_page"), String(num));
    saveToDatabaseDebounced();
  }

  function getCookie(name) {
    const cookies = document.cookie ? document.cookie.split(";") : [];

    for (let cookie of cookies) {
      cookie = cookie.trim();

      if (cookie.startsWith(name + "=")) {
        return decodeURIComponent(cookie.substring(name.length + 1));
      }
    }

    return "";
  }

  function getSnapshotForDatabase() {
    return {
      name: getName(),
      income: getIncome(),
      expenses: expenses,
      investments: investments,
      active_page: getSavedPage(),
    };
  }

  async function loadFromDatabase() {
    if (!djangoAuth || !djangoEmail) return;

    const localHadData =
      expenses.length > 0 ||
      investments.length > 0 ||
      getIncome() > 0 ||
      hasSavedName();

    try {
      const response = await fetch("/api/finance/", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) return;

      const data = await response.json();

      currentEmail = cleanEmail(data.email || currentEmail);

      if (!data.has_data && localHadData) {
        await saveToDatabaseNow();
        return;
      }

      expenses = Array.isArray(data.expenses) ? data.expenses : [];
      investments = Array.isArray(data.investments) ? data.investments : [];

      localStorage.setItem(userKey("expenses"), JSON.stringify(expenses));
      localStorage.setItem(userKey("investments"), JSON.stringify(investments));
      localStorage.setItem(userKey("income"), Number(data.income || 0));
      localStorage.setItem(userKey("active_page"), String(data.active_page || 1));

      if (data.name) {
        localStorage.setItem(userKey("name"), data.name);
      }
    } catch (error) {
      console.log("Cloud load failed:", error);
    }
  }

  async function saveToDatabaseNow() {
    if (!djangoAuth || !currentEmail) return;

    try {
      await fetch("/api/finance/save/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify(getSnapshotForDatabase()),
      });
    } catch (error) {
      console.log("Cloud save failed:", error);
    }
  }

  function saveToDatabaseDebounced() {
    if (!djangoAuth || !currentEmail) return;

    clearTimeout(cloudSaveTimer);

    cloudSaveTimer = setTimeout(() => {
      saveToDatabaseNow();
    }, 500);
  }

  function resetCurrentUserValues() {
    localStorage.removeItem(userKey("income"));
    localStorage.removeItem(userKey("expenses"));
    localStorage.removeItem(userKey("investments"));
    localStorage.removeItem(userKey("name"));
    localStorage.removeItem(userKey("active_page"));

    expenses = [];
    investments = [];
    editingExpense = null;
    editingInvestment = null;

    if ($("modal-reset")) $("modal-reset").classList.add("hidden");
    if ($("input-name")) $("input-name").value = defaultNameFromEmail();
    if ($("modal-name")) $("modal-name").classList.remove("hidden");

    setPage(1);
    renderAll();
    saveToDatabaseDebounced();
  }

  function setTheme(theme = "dark") {
    const nextTheme = theme === "light" ? "light" : "dark";

    root.setAttribute("data-theme", nextTheme);
    localStorage.setItem("wealth_theme", nextTheme);

    document.querySelectorAll(".theme-toggle").forEach((btn) => {
      btn.innerHTML =
        nextTheme === "dark"
          ? '<i class="bi bi-sun-fill"></i><span class="theme-text">Light</span>'
          : '<i class="bi bi-moon-stars-fill"></i><span class="theme-text">Dark</span>';
    });
  }

  function openConfirm(options) {
    const title = options.title || "Are you sure?";
    const message = options.message || "Please confirm this action.";
    const confirmText = options.confirmText || "Yes, continue";
    const danger = options.danger !== false;

    pendingConfirmAction =
      typeof options.onConfirm === "function" ? options.onConfirm : null;

    if ($("confirm-title")) $("confirm-title").textContent = title;
    if ($("confirm-message")) $("confirm-message").textContent = message;

    if ($("btn-confirm-ok")) {
      $("btn-confirm-ok").innerHTML =
        `<i class="bi bi-check-circle-fill"></i> ${confirmText}`;
      $("btn-confirm-ok").className = danger ? "btn-danger" : "btn-primary";
    }

    if ($("modal-confirm")) $("modal-confirm").classList.remove("hidden");
  }

  function closeConfirm() {
    pendingConfirmAction = null;
    if ($("modal-confirm")) $("modal-confirm").classList.add("hidden");
  }

  if ($("btn-confirm-cancel")) {
    $("btn-confirm-cancel").addEventListener("click", closeConfirm);
  }

  if ($("btn-confirm-ok")) {
    $("btn-confirm-ok").addEventListener("click", () => {
      const action = pendingConfirmAction;
      closeConfirm();
      if (action) action();
    });
  }

  if ($("modal-confirm")) {
    $("modal-confirm").addEventListener("click", (e) => {
      if (e.target === $("modal-confirm")) closeConfirm();
    });
  }

  function showLogin() {
    if (!login || !app) return;

    login.classList.remove("hidden");
    login.classList.add("active");

    app.classList.add("hidden");
    app.classList.remove("active");

    body.dataset.djangoAuth = "false";
    body.dataset.djangoEmail = "";
  }

  async function showApp() {
    if (!login || !app) return;

    loadUserData();
    await loadFromDatabase();

    login.classList.add("hidden");
    login.classList.remove("active");

    app.classList.remove("hidden");
    app.classList.add("active");

    updateUserUI();
    renderAll();
    setPage(getSavedPage() === 2 ? 2 : 1, false);

    if (!hasSavedName()) {
      if ($("input-name")) $("input-name").value = getName();
      if ($("modal-name")) $("modal-name").classList.remove("hidden");
    }
  }

  function updateUserUI() {
    const name = getName();

    if ($("display-name")) $("display-name").textContent = name;
    if ($("inv-display-name")) $("inv-display-name").textContent = name;
    if ($("dash-avatar")) $("dash-avatar").textContent = name.charAt(0).toUpperCase();
    if ($("logged-email")) $("logged-email").textContent = currentEmail;
  }

  if (localStorage.getItem("wealth_dark_default_fixed") !== "1") {
    localStorage.setItem("wealth_theme", "dark");
    localStorage.setItem("wealth_dark_default_fixed", "1");
  }

  setTheme(localStorage.getItem("wealth_theme") || "dark");

  document.querySelectorAll(".theme-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || "dark";
      setTheme(current === "dark" ? "light" : "dark");
    });
  });

  if ($("btn-see-more")) {
    $("btn-see-more").addEventListener("click", () => {
      if (!$("more-info")) return;

      $("more-info").classList.toggle("hidden");

      $("btn-see-more").textContent = $("more-info").classList.contains("hidden")
        ? "See more"
        : "See less";
    });
  }

  if (forcedLogout) {
    clearLoginSessionOnly();
    currentEmail = "";
    showLogin();
    window.history.replaceState({}, document.title, "/");
  } else if (djangoAuth && djangoEmail) {
    currentEmail = djangoEmail;
    localStorage.setItem("wealth_logged_in", "true");
    localStorage.setItem("wealth_current_email", djangoEmail);
    showApp();
  } else {
    const localEmail = cleanEmail(localStorage.getItem("wealth_current_email"));
    const localLoggedIn = localStorage.getItem("wealth_logged_in") === "true";

    if (localLoggedIn && localEmail) {
      currentEmail = localEmail;
      showApp();
    } else {
      clearLoginSessionOnly();
      currentEmail = "";
      showLogin();
    }
  }

  if ($("btn-logout-link")) {
    $("btn-logout-link").addEventListener("click", function (e) {
      e.preventDefault();

      openConfirm({
        title: "Logout?",
        message:
          "Your saved values will remain safe for this email. You can login again anytime.",
        confirmText: "Logout",
        danger: true,
        onConfirm: () => {
          clearLoginSessionOnly();
          window.location.href = "/logout/";
        },
      });
    });
  }

  if ($("btn-email-login")) {
    $("btn-email-login").addEventListener("click", () => {
      const email = cleanEmail(getInputValue("input-email-login"));

      if (!email.includes("@") || !email.includes(".")) {
        if ($("email-error")) $("email-error").textContent = "Enter a valid email address";
        return;
      }

      if ($("email-error")) $("email-error").textContent = "";

      currentEmail = email;
      localStorage.setItem("wealth_logged_in", "true");
      localStorage.setItem("wealth_current_email", email);

      showApp();
    });
  }

  if ($("btn-edit-name")) {
    $("btn-edit-name").addEventListener("click", () => {
      setInputValue("input-name", getName());
      if ($("modal-name")) $("modal-name").classList.remove("hidden");
    });
  }

  if ($("btn-save-name")) {
    $("btn-save-name").addEventListener("click", () => {
      const name = getInputValue("input-name").trim();
      if (!name) return;

      setName(name);
      if ($("modal-name")) $("modal-name").classList.add("hidden");
      updateUserUI();
    });
  }

  if ($("btn-close-name")) {
    $("btn-close-name").addEventListener("click", () => {
      if (!hasSavedName()) {
        setName(getName());
      }

      if ($("modal-name")) $("modal-name").classList.add("hidden");
      updateUserUI();
    });
  }

  if ($("btn-clear-name")) {
    $("btn-clear-name").addEventListener("click", () => {
      setInputValue("input-name", "");
      if ($("input-name")) $("input-name").focus();
    });
  }

  if ($("btn-open-reset")) {
    $("btn-open-reset").addEventListener("click", () => {
      if ($("reset-robot-check")) $("reset-robot-check").checked = false;
      setInputValue("reset-name-input", "");
      if ($("reset-error")) $("reset-error").textContent = "";
      if ($("reset-confirm-name")) $("reset-confirm-name").textContent = getName();
      if ($("modal-reset")) $("modal-reset").classList.remove("hidden");
    });
  }

  if ($("btn-close-reset")) {
    $("btn-close-reset").addEventListener("click", () => {
      if ($("modal-reset")) $("modal-reset").classList.add("hidden");
    });
  }

  if ($("btn-confirm-reset")) {
    $("btn-confirm-reset").addEventListener("click", () => {
      const robotOk = $("reset-robot-check")?.checked;
      const typedName = getInputValue("reset-name-input").trim().toLowerCase();
      const actualName = getName().trim().toLowerCase();

      if (!robotOk) {
        if ($("reset-error")) $("reset-error").textContent = "Please tick: I am not a robot";
        return;
      }

      if (typedName !== actualName) {
        if ($("reset-error")) $("reset-error").textContent = "Name does not match";
        return;
      }

      resetCurrentUserValues();
    });
  }

  function updateTopTabs(pageNum) {
    if ($("tab-dashboard")) $("tab-dashboard").classList.toggle("active", pageNum === 1);
    if ($("tab-investments")) $("tab-investments").classList.toggle("active", pageNum === 2);
  }

  function setPage(num, persist = true) {
    const pageNum = num === 2 ? 2 : 1;
    const isPage2 = pageNum === 2;

    if ($("pg-dashboard")) $("pg-dashboard").classList.toggle("active", !isPage2);
    if ($("pg-investments")) $("pg-investments").classList.toggle("active", isPage2);

    updateTopTabs(pageNum);

    if (persist && currentEmail) {
      saveActivePage(pageNum);
    }
  }

  if ($("tab-dashboard")) {
    $("tab-dashboard").addEventListener("click", () => setPage(1));
  }

  if ($("tab-investments")) {
    $("tab-investments").addEventListener("click", () => setPage(2));
  }

  if ($("btn-edit-income")) {
    $("btn-edit-income").addEventListener("click", () => {
      setInputValue("input-income", getIncome());
      if ($("income-panel")) $("income-panel").classList.remove("hidden");
    });
  }

  if ($("btn-cancel-income")) {
    $("btn-cancel-income").addEventListener("click", () => {
      if ($("income-panel")) $("income-panel").classList.add("hidden");
    });
  }

  if ($("btn-save-income")) {
    $("btn-save-income").addEventListener("click", () => {
      setIncome(getInputValue("input-income"));
      if ($("income-panel")) $("income-panel").classList.add("hidden");
      renderAll();
    });
  }

  if ($("btn-add-expense")) {
    $("btn-add-expense").addEventListener("click", () => {
      editingExpense = null;
      if ($("expense-form-title")) $("expense-form-title").textContent = "New Expense";
      setInputValue("exp-title", "");
      setInputValue("exp-amount", "");
      if ($("expense-form")) $("expense-form").classList.remove("hidden");
    });
  }

  if ($("btn-cancel-expense")) {
    $("btn-cancel-expense").addEventListener("click", () => {
      if ($("expense-form")) $("expense-form").classList.add("hidden");
    });
  }

  if ($("btn-save-expense")) {
    $("btn-save-expense").addEventListener("click", () => {
      const title = getInputValue("exp-title").trim();
      const amount = getNumber("exp-amount");

      if (!title || amount <= 0) return;

      const item = { title, amount };

      if (editingExpense === null) {
        expenses.push(item);
      } else {
        expenses[editingExpense] = item;
      }

      editingExpense = null;
      if ($("expense-form")) $("expense-form").classList.add("hidden");

      saveUserData();
      renderAll();
    });
  }

  function getVisibleExpenses() {
    if (expensesExpanded) return expenses;
    return expenses.slice(0, 3);
  }

  function renderExpenses() {
    const list = $("expenses-list");
    if (!list) return;

    list.innerHTML = "";

    if (expenses.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <i class="bi bi-receipt-cutoff"></i>
          </div>
          <p>No expenses yet. Tap <strong>+ Add</strong> to begin.</p>
        </div>
      `;

      if ($("btn-toggle-expenses")) {
        $("btn-toggle-expenses").style.display = "none";
      }
      return;
    }

    const visibleExpenses = getVisibleExpenses();

    visibleExpenses.forEach((item) => {
      const realIndex = expenses.indexOf(item);

      const div = document.createElement("div");
      div.className = "item-card";
      div.innerHTML = `
        <div>
          <div class="item-title">${esc(item.title)}</div>
          <div class="item-meta">Monthly expense</div>
        </div>
        <div>
          <div class="item-amount">${money(item.amount)}</div>
          <div class="item-actions">
            <button class="mini-btn" data-edit-exp="${realIndex}">
              <i class="bi bi-pencil-square"></i>
              Edit
            </button>
            <button class="mini-btn delete" data-del-exp="${realIndex}">
              <i class="bi bi-trash3-fill"></i>
              Delete
            </button>
          </div>
        </div>
      `;
      list.appendChild(div);
    });

    document.querySelectorAll("[data-edit-exp]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.editExp);
        editingExpense = index;
        if ($("expense-form-title")) $("expense-form-title").textContent = "Edit Expense";
        setInputValue("exp-title", expenses[index].title);
        setInputValue("exp-amount", expenses[index].amount);
        if ($("expense-form")) $("expense-form").classList.remove("hidden");
      });
    });

    document.querySelectorAll("[data-del-exp]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.delExp);
        const itemName = expenses[index]?.title || "this expense";

        openConfirm({
          title: "Delete expense?",
          message: `Delete "${itemName}"? This cannot be undone.`,
          confirmText: "Delete",
          danger: true,
          onConfirm: () => {
            expenses.splice(index, 1);
            saveUserData();
            renderAll();
          },
        });
      });
    });

    if ($("btn-toggle-expenses")) {
      if (expenses.length <= 3) {
        $("btn-toggle-expenses").style.display = "none";
      } else {
        $("btn-toggle-expenses").style.display = "inline-flex";
        $("btn-toggle-expenses").textContent =
          expensesExpanded ? "View less" : "View all";
      }
    }
  }

  if ($("btn-toggle-expenses")) {
    $("btn-toggle-expenses").addEventListener("click", () => {
      expensesExpanded = !expensesExpanded;
      renderExpenses();
    });
  }

  function updateInvestmentFields() {
    if (!$("inv-category")) return;

    const category = getInputValue("inv-category");

    if ($("normal-invest-wrap")) $("normal-invest-wrap").classList.add("hidden");
    if ($("gold-invest-wrap")) $("gold-invest-wrap").classList.add("hidden");
    if ($("bank-invest-wrap")) $("bank-invest-wrap").classList.add("hidden");

    if (category === "Gold") {
      $("gold-invest-wrap").classList.remove("hidden");
    } else if (category === "FD" || category === "RD") {
      $("bank-invest-wrap").classList.remove("hidden");

      if (category === "RD") {
        if ($("bank-amount-label")) $("bank-amount-label").textContent = "Monthly Amount";
        if ($("bank-principal")) $("bank-principal").placeholder = "Monthly RD amount";
        if ($("bank-hint")) {
          $("bank-hint").textContent =
            "RD maturity is auto calculated approximately. You can change the maturity amount manually.";
        }
      } else {
        if ($("bank-amount-label")) $("bank-amount-label").textContent = "Principal Amount";
        if ($("bank-principal")) $("bank-principal").placeholder = "Principal amount";
        if ($("bank-hint")) {
          $("bank-hint").textContent =
            "FD maturity is auto calculated with annual compounding. You can change the maturity amount manually.";
        }
      }

      updateMaturityAmount(false);
    } else {
      $("normal-invest-wrap").classList.remove("hidden");

      if (category === "Stock" || category === "Mutual Fund") {
        if ($("inv-return-wrap")) $("inv-return-wrap").classList.remove("hidden");
      } else {
        if ($("inv-return-wrap")) $("inv-return-wrap").classList.add("hidden");
      }
    }
  }

  function yearsEquivalentFromInput() {
    const years = getNumber("bank-years");
    const months = getNumber("bank-duration");
    const days = getNumber("bank-days");

    return years + months / 12 + days / 365;
  }

  function totalMonthsFromInput() {
    const years = getNumber("bank-years");
    const months = getNumber("bank-duration");
    const days = getNumber("bank-days");

    return years * 12 + months + days / 30;
  }

  function calculateBankMaturity() {
    const category = getInputValue("inv-category");
    const rate = getNumber("bank-interest") / 100;

    if (category === "FD") {
      const principal = getNumber("bank-principal");
      const yearsEq = yearsEquivalentFromInput();

      if (principal <= 0 || yearsEq <= 0) return 0;

      const maturity = principal * Math.pow(1 + rate, yearsEq);
      return Math.round(maturity);
    }

    if (category === "RD") {
      const monthlyAmount = getNumber("bank-principal");
      const months = Math.max(0, totalMonthsFromInput());

      if (monthlyAmount <= 0 || months <= 0) return 0;

      const principalTotal = monthlyAmount * months;
      const interestApprox = (monthlyAmount * months * (months + 1) * rate) / 24;

      return Math.round(principalTotal + interestApprox);
    }

    return 0;
  }

  function updateMaturityAmount(force) {
    if (maturityManuallyEdited && !force) return;

    const category = getInputValue("inv-category");
    if (category !== "FD" && category !== "RD") return;

    const maturity = calculateBankMaturity();
    if (maturity > 0) {
      setInputValue("bank-return", maturity);
    }
  }

  if ($("inv-category")) {
    $("inv-category").addEventListener("change", () => {
      maturityManuallyEdited = false;
      updateInvestmentFields();
    });
  }

  ["bank-principal", "bank-interest", "bank-years", "bank-duration", "bank-days"].forEach((id) => {
    const el = $(id);
    if (el) {
      el.addEventListener("input", () => updateMaturityAmount(false));
    }
  });

  if ($("bank-return")) {
    $("bank-return").addEventListener("input", () => {
      maturityManuallyEdited = true;
    });
  }

  if ($("btn-auto-maturity")) {
    $("btn-auto-maturity").addEventListener("click", () => {
      maturityManuallyEdited = false;
      updateMaturityAmount(true);
    });
  }

  if ($("btn-add-investment")) {
    $("btn-add-investment").addEventListener("click", () => {
      editingInvestment = null;
      maturityManuallyEdited = false;

      if ($("inv-form-title")) $("inv-form-title").textContent = "New Investment";

      setInputValue("inv-title", "");
      setInputValue("inv-category", "");
      setInputValue("inv-amount", "");
      setInputValue("inv-return", "");
      setInputValue("gold-digital", "");
      setInputValue("gold-physical", "");
      setInputValue("bank-principal", "");
      setInputValue("bank-interest", "");
      setInputValue("bank-years", "");
      setInputValue("bank-duration", "");
      setInputValue("bank-days", "");
      setInputValue("bank-return", "");

      updateInvestmentFields();

      if ($("investment-form")) $("investment-form").classList.remove("hidden");
    });
  }

  if ($("btn-cancel-investment")) {
    $("btn-cancel-investment").addEventListener("click", () => {
      if ($("investment-form")) $("investment-form").classList.add("hidden");
    });
  }

  if ($("btn-save-investment")) {
    $("btn-save-investment").addEventListener("click", () => {
      const title = getInputValue("inv-title").trim();
      const category = getInputValue("inv-category");

      if (!title || !category) return;

      let item = {
        title,
        category,
        amount: 0,
      };

      if (category === "Gold") {
        const digitalGold = getNumber("gold-digital");
        const physicalGold = getNumber("gold-physical");
        const total = digitalGold + physicalGold;

        if (total <= 0) return;

        item.digitalGold = digitalGold;
        item.physicalGold = physicalGold;
        item.amount = total;
      } else if (category === "FD") {
        const principal = getNumber("bank-principal");
        const interest = getNumber("bank-interest");
        const years = getNumber("bank-years");
        const duration = getNumber("bank-duration");
        const days = getNumber("bank-days");
        let returnAmount = getNumber("bank-return");

        if (returnAmount <= 0) {
          returnAmount = calculateBankMaturity();
        }

        if (principal <= 0 || years + duration + days <= 0) return;

        item.principal = principal;
        item.interest = interest;
        item.years = years;
        item.duration = duration;
        item.days = days;
        item.returnAmount = returnAmount;
        item.amount = principal;
      } else if (category === "RD") {
        const monthlyAmount = getNumber("bank-principal");
        const interest = getNumber("bank-interest");
        const years = getNumber("bank-years");
        const duration = getNumber("bank-duration");
        const days = getNumber("bank-days");
        let returnAmount = getNumber("bank-return");

        const totalMonths = totalMonthsFromInput();
        const totalInvestment = Math.round(monthlyAmount * totalMonths);

        if (returnAmount <= 0) {
          returnAmount = calculateBankMaturity();
        }

        if (monthlyAmount <= 0 || years + duration + days <= 0) return;

        item.monthlyAmount = monthlyAmount;
        item.interest = interest;
        item.years = years;
        item.duration = duration;
        item.days = days;
        item.returnAmount = returnAmount;
        item.amount = totalInvestment;
      } else {
        const amount = getNumber("inv-amount");

        if (amount <= 0) return;

        item.amount = amount;

        if (category === "Stock" || category === "Mutual Fund") {
          item.expectedReturn = getNumber("inv-return");
        }
      }

      if (editingInvestment === null) {
        investments.push(item);
      } else {
        investments[editingInvestment] = item;
      }

      editingInvestment = null;

      if ($("investment-form")) $("investment-form").classList.add("hidden");

      saveUserData();
      renderAll();
    });
  }

  document.querySelectorAll(".cat-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".cat-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeCat = btn.dataset.cat;
      renderInvestments();
    });
  });

  function durationText(item) {
    const years = Number(item.years || 0);
    const months = Number(item.duration || 0);
    const days = Number(item.days || 0);

    const parts = [];

    if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`);
    if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`);
    if (days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);

    return parts.length ? parts.join(" ") : "0 months";
  }

  function investmentDisplayAmount(item) {
    if ((item.category === "FD" || item.category === "RD") && Number(item.returnAmount) > 0) {
      return Number(item.returnAmount);
    }

    return Number(item.amount || 0);
  }

  function investmentMeta(item) {
    if (item.category === "Gold") {
      return `Digital Gold ${money(item.digitalGold)} • Physical Gold ${money(item.physicalGold)}`;
    }

    if (item.category === "FD") {
      return `Principal ${money(item.principal)} • ${item.interest || 0}% • ${durationText(item)} • Maturity ${money(item.returnAmount)}`;
    }

    if (item.category === "RD") {
      return `Monthly ${money(item.monthlyAmount)} • ${durationText(item)} • Invested ${money(item.amount)} • Maturity ${money(item.returnAmount)}`;
    }

    if (item.expectedReturn) {
      return `${item.category} • Expected ${item.expectedReturn}%/yr`;
    }

    return item.category;
  }

  function renderInvestments() {
    const list = $("investments-list");
    if (!list) return;

    list.innerHTML = "";

    const filtered =
      activeCat === "all"
        ? investments
        : investments.filter((item) => item.category === activeCat);

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <i class="bi bi-graph-up-arrow"></i>
          </div>
          <p>No investments yet. Tap <strong>+ Add</strong> to start growing.</p>
        </div>
      `;
      return;
    }

    filtered.forEach((item) => {
      const realIndex = investments.indexOf(item);
      const displayAmount = investmentDisplayAmount(item);

      const div = document.createElement("div");
      div.className = "item-card";
      div.innerHTML = `
        <div>
          <div class="item-title">${esc(item.title)}</div>
          <div class="item-meta">${esc(investmentMeta(item))}</div>
        </div>
        <div>
          <div class="item-amount">${money(displayAmount)}</div>
          <div class="item-actions">
            <button class="mini-btn" data-edit-inv="${realIndex}">
              <i class="bi bi-pencil-square"></i>
              Edit
            </button>
            <button class="mini-btn delete" data-del-inv="${realIndex}">
              <i class="bi bi-trash3-fill"></i>
              Delete
            </button>
          </div>
        </div>
      `;
      list.appendChild(div);
    });

    document.querySelectorAll("[data-edit-inv]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.editInv);
        const item = investments[index];

        editingInvestment = index;
        maturityManuallyEdited = false;

        if ($("inv-form-title")) $("inv-form-title").textContent = "Edit Investment";

        setInputValue("inv-title", item.title);
        setInputValue("inv-category", item.category);
        setInputValue("inv-amount", item.amount || "");
        setInputValue("inv-return", item.expectedReturn || "");
        setInputValue("gold-digital", item.digitalGold || "");
        setInputValue("gold-physical", item.physicalGold || "");
        setInputValue("bank-principal", item.principal || item.monthlyAmount || "");
        setInputValue("bank-interest", item.interest || "");
        setInputValue("bank-years", item.years || "");
        setInputValue("bank-duration", item.duration || "");
        setInputValue("bank-days", item.days || "");
        setInputValue("bank-return", item.returnAmount || "");

        updateInvestmentFields();

        if ($("investment-form")) $("investment-form").classList.remove("hidden");
      });
    });

    document.querySelectorAll("[data-del-inv]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.delInv);
        const itemName = investments[index]?.title || "this investment";

        openConfirm({
          title: "Delete investment?",
          message: `Delete "${itemName}"? This cannot be undone.`,
          confirmText: "Delete",
          danger: true,
          onConfirm: () => {
            investments.splice(index, 1);
            saveUserData();
            renderAll();
          },
        });
      });
    });
  }

  function clampPercent(value) {
    return Math.max(0, Math.min(100, Math.round(value || 0)));
  }

  function updateExpenseSplit(totalExpenses) {
    const donut = $("expense-donut");
    const wrap = $("expense-share-list");

    if (!donut || !wrap) return;

    if (!expenses.length || totalExpenses <= 0) {
      donut.style.setProperty(
        "--expense-donut-bg",
        "conic-gradient(#334155 0deg 360deg)"
      );
      if ($("expense-donut-main")) $("expense-donut-main").textContent = "0%";
      wrap.innerHTML = `<p class="empty-mini">No expense data yet</p>`;
      return;
    }

    const colors = [
      "#ef4444",
      "#f59e0b",
      "#2563eb",
      "#10b981",
      "#111827",
      "#8b5cf6",
      "#06b6d4",
    ];

    const sorted = [...expenses]
      .map((item) => ({
        title: item.title || "Expense",
        amount: Number(item.amount || 0),
      }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    let startDeg = 0;

    const gradientParts = sorted.map((item, index) => {
      const pct = totalExpenses > 0 ? item.amount / totalExpenses : 0;
      const deg = pct * 360;
      const endDeg = startDeg + deg;
      const color = colors[index % colors.length];

      const part = `${color} ${startDeg}deg ${endDeg}deg`;
      startDeg = endDeg;

      return part;
    });

    donut.style.setProperty(
      "--expense-donut-bg",
      `conic-gradient(${gradientParts.join(", ")})`
    );

    const topPct = Math.round((sorted[0].amount / totalExpenses) * 100);
    if ($("expense-donut-main")) $("expense-donut-main").textContent = topPct + "%";

    wrap.innerHTML = sorted
      .map((item, index) => {
        const pct = Math.round((item.amount / totalExpenses) * 100);
        const color = colors[index % colors.length];

        return `
          <div class="expense-donut-legend-row">
            <div class="expense-legend-left">
              <span class="expense-color-dot" style="background:${color};"></span>
              <div>
                <strong>${esc(item.title)}</strong>
                <span>${pct}% of expenses</span>
              </div>
            </div>
            <b>${money(item.amount)}</b>
          </div>
        `;
      })
      .join("");
  }

  function renderSummary() {
    const income = getIncome();

    const totalExpenses = expenses.reduce((sum, item) => {
      return sum + Number(item.amount || 0);
    }, 0);

    const totalInv = investments.reduce((sum, item) => {
      return sum + investmentDisplayAmount(item);
    }, 0);

    const netSavings = income - totalExpenses;
    const savedPct = income > 0 ? (netSavings / income) * 100 : 0;

    if ($("sum-income")) $("sum-income").textContent = money(income);
    if ($("sum-expenses")) $("sum-expenses").textContent = money(totalExpenses);
    if ($("sum-savings")) $("sum-savings").textContent = money(netSavings);
    if ($("inv-total")) $("inv-total").textContent = money(totalInv);

    if ($("savings-pct")) $("savings-pct").textContent = clampPercent(savedPct) + "%";
    if ($("sb-fill")) $("sb-fill").style.width = clampPercent(savedPct) + "%";

    updateExpenseSplit(totalExpenses);
  }

  function renderAll() {
    updateUserUI();
    renderExpenses();
    renderInvestments();
    renderSummary();
  }
});