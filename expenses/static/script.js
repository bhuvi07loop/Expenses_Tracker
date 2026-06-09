document.addEventListener("DOMContentLoaded", function () {
  const root = document.documentElement;
  const body = document.body;

  const $ = (id) => document.getElementById(id);
  const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

  // -----------------------------
  // GOOGLE LOGIN FIX
  // -----------------------------
  const googleLoginBtn = $("btn-google-login");

  if (googleLoginBtn) {
    googleLoginBtn.setAttribute("href", "/auth/login/google-oauth2/");

    googleLoginBtn.addEventListener("click", function (e) {
      e.preventDefault();

      // Important:
      // Login must start here.
      // Do NOT redirect to /auth/complete/google-oauth2/
      window.location.href = "/auth/login/google-oauth2/";
    });
  }

  const login = $("page-login");
  const app = $("app");

  const djangoAuth = body.dataset.djangoAuth === "true";
  const djangoEmail = String(body.dataset.djangoEmail || "").trim().toLowerCase();

  let currentEmail = "";
  let expenses = [];
  let investments = [];
  let editingExpense = null;
  let editingInvestment = null;
  let activeCat = "all";

  function cleanEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function userKey(name) {
    const email = cleanEmail(currentEmail || localStorage.getItem("wealth_current_email"));
    return "wealth_" + email + "_" + name;
  }

  function loadUserData() {
    currentEmail = cleanEmail(djangoEmail || localStorage.getItem("wealth_current_email"));
    expenses = JSON.parse(localStorage.getItem(userKey("expenses")) || "[]");
    investments = JSON.parse(localStorage.getItem(userKey("investments")) || "[]");
  }

  function saveUserData() {
    localStorage.setItem(userKey("expenses"), JSON.stringify(expenses));
    localStorage.setItem(userKey("investments"), JSON.stringify(investments));
  }

  function getIncome() {
    return Number(localStorage.getItem(userKey("income")) || 0);
  }

  function setIncome(value) {
    localStorage.setItem(userKey("income"), Number(value || 0));
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
  }

  function resetCurrentUserValues() {
    localStorage.removeItem(userKey("income"));
    localStorage.removeItem(userKey("expenses"));
    localStorage.removeItem(userKey("investments"));
    localStorage.removeItem(userKey("name"));

    expenses = [];
    investments = [];

    if ($("modal-reset")) $("modal-reset").classList.add("hidden");
    if ($("input-name")) $("input-name").value = defaultNameFromEmail();
    if ($("modal-name")) $("modal-name").classList.remove("hidden");

    renderAll();
  }

  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    localStorage.setItem("wealth_theme", theme);

    document.querySelectorAll(".theme-toggle").forEach((btn) => {
      btn.textContent = theme === "dark" ? "☀️" : "🌙";
    });
  }

  setTheme(localStorage.getItem("wealth_theme") || "light");

  document.querySelectorAll(".theme-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || "light";
      setTheme(current === "dark" ? "light" : "dark");
    });
  });

  if ($("btn-see-more")) {
    $("btn-see-more").addEventListener("click", () => {
      $("more-info").classList.toggle("hidden");
      $("btn-see-more").textContent = $("more-info").classList.contains("hidden")
        ? "See more"
        : "See less";
    });
  }

  function showLogin() {
    if (!login || !app) return;

    login.classList.remove("hidden");
    login.classList.add("active");
    app.classList.add("hidden");
  }

  function showApp() {
    if (!login || !app) return;

    loadUserData();

    login.classList.add("hidden");
    login.classList.remove("active");
    app.classList.remove("hidden");

    updateUserUI();
    renderAll();

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

  if (djangoAuth && djangoEmail) {
    localStorage.setItem("wealth_logged_in", "true");
    localStorage.setItem("wealth_current_email", djangoEmail);
    currentEmail = djangoEmail;
  } else {
    currentEmail = cleanEmail(localStorage.getItem("wealth_current_email"));
  }

  const loggedIn = djangoAuth || localStorage.getItem("wealth_logged_in") === "true";

  if (loggedIn && currentEmail) {
    showApp();
  } else {
    showLogin();
  }

  if ($("btn-email-login")) {
    $("btn-email-login").addEventListener("click", () => {
      const email = cleanEmail($("input-email-login").value);

      if (!email.includes("@") || !email.includes(".")) {
        $("email-error").textContent = "Enter a valid email address";
        return;
      }

      $("email-error").textContent = "";

      currentEmail = email;
      localStorage.setItem("wealth_logged_in", "true");
      localStorage.setItem("wealth_current_email", email);

      showApp();
    });
  }

  if ($("btn-logout")) {
    $("btn-logout").addEventListener("click", (e) => {
      localStorage.removeItem("wealth_logged_in");
      localStorage.removeItem("wealth_current_email");

      if (!djangoAuth) {
        e.preventDefault();
        currentEmail = "";
        showLogin();
      }
    });
  }

  if ($("btn-edit-name")) {
    $("btn-edit-name").addEventListener("click", () => {
      $("input-name").value = getName();
      $("modal-name").classList.remove("hidden");
    });
  }

  if ($("btn-save-name")) {
    $("btn-save-name").addEventListener("click", () => {
      const name = $("input-name").value.trim();
      if (!name) return;

      setName(name);
      $("modal-name").classList.add("hidden");
      updateUserUI();
    });
  }

  if ($("btn-close-name")) {
    $("btn-close-name").addEventListener("click", () => {
      if (!hasSavedName()) {
        setName(getName());
      }

      $("modal-name").classList.add("hidden");
      updateUserUI();
    });
  }

  if ($("btn-clear-name")) {
    $("btn-clear-name").addEventListener("click", () => {
      $("input-name").value = "";
      $("input-name").focus();
    });
  }

  if ($("btn-open-reset")) {
    $("btn-open-reset").addEventListener("click", () => {
      $("reset-robot-check").checked = false;
      $("reset-name-input").value = "";
      $("reset-error").textContent = "";
      $("reset-confirm-name").textContent = getName();
      $("modal-reset").classList.remove("hidden");
    });
  }

  if ($("btn-close-reset")) {
    $("btn-close-reset").addEventListener("click", () => {
      $("modal-reset").classList.add("hidden");
    });
  }

  if ($("btn-confirm-reset")) {
    $("btn-confirm-reset").addEventListener("click", () => {
      const robotOk = $("reset-robot-check").checked;
      const typedName = $("reset-name-input").value.trim().toLowerCase();
      const actualName = getName().trim().toLowerCase();

      if (!robotOk) {
        $("reset-error").textContent = "Please tick: I am not a robot";
        return;
      }

      if (typedName !== actualName) {
        $("reset-error").textContent = "Name does not match";
        return;
      }

      resetCurrentUserValues();
    });
  }

  function setPage(num) {
    const isPage2 = num === 2;

    if ($("pg-dashboard")) $("pg-dashboard").classList.toggle("active", !isPage2);
    if ($("pg-investments")) $("pg-investments").classList.toggle("active", isPage2);

    if ($("bnav-1")) $("bnav-1").classList.toggle("active", !isPage2);
    if ($("bnav-2")) $("bnav-2").classList.toggle("active", isPage2);

    if ($("dot-1")) $("dot-1").classList.toggle("active", !isPage2);
    if ($("dot-2")) $("dot-2").classList.toggle("active", isPage2);

    if ($("btn-top-page")) {
      $("btn-top-page").textContent = isPage2 ? "← Page 1" : "Page 2 →";
    }
  }

  if ($("btn-top-page")) {
    $("btn-top-page").addEventListener("click", () => {
      const isPage2 = $("pg-investments").classList.contains("active");
      setPage(isPage2 ? 1 : 2);
    });
  }

  if ($("bnav-1")) $("bnav-1").addEventListener("click", () => setPage(1));
  if ($("bnav-2")) $("bnav-2").addEventListener("click", () => setPage(2));

  if ($("btn-edit-income")) {
    $("btn-edit-income").addEventListener("click", () => {
      $("input-income").value = getIncome();
      $("income-panel").classList.remove("hidden");
    });
  }

  if ($("btn-cancel-income")) {
    $("btn-cancel-income").addEventListener("click", () => {
      $("income-panel").classList.add("hidden");
    });
  }

  if ($("btn-save-income")) {
    $("btn-save-income").addEventListener("click", () => {
      setIncome($("input-income").value);
      $("income-panel").classList.add("hidden");
      renderAll();
    });
  }

  if ($("btn-add-expense")) {
    $("btn-add-expense").addEventListener("click", () => {
      editingExpense = null;
      $("expense-form-title").textContent = "New Expense";
      $("exp-title").value = "";
      $("exp-amount").value = "";
      $("expense-form").classList.remove("hidden");
    });
  }

  if ($("btn-cancel-expense")) {
    $("btn-cancel-expense").addEventListener("click", () => {
      $("expense-form").classList.add("hidden");
    });
  }

  if ($("btn-save-expense")) {
    $("btn-save-expense").addEventListener("click", () => {
      const title = $("exp-title").value.trim();
      const amount = Number($("exp-amount").value || 0);

      if (!title || amount <= 0) return;

      const item = { title, amount };

      if (editingExpense === null) {
        expenses.push(item);
      } else {
        expenses[editingExpense] = item;
      }

      editingExpense = null;
      $("expense-form").classList.add("hidden");

      saveUserData();
      renderAll();
    });
  }

  function renderExpenses() {
    const list = $("expenses-list");
    if (!list) return;

    list.innerHTML = "";

    if (expenses.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🧾</div>
          <p>No expenses yet. Tap <strong>+ Add</strong> to begin.</p>
        </div>
      `;
      return;
    }

    expenses.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "item-card";
      div.innerHTML = `
        <div>
          <div class="item-title">${item.title}</div>
          <div class="item-meta">Monthly expense</div>
        </div>
        <div>
          <div class="item-amount">${money(item.amount)}</div>
          <div class="item-actions">
            <button class="mini-btn" data-edit-exp="${index}">Edit</button>
            <button class="mini-btn delete" data-del-exp="${index}">Delete</button>
          </div>
        </div>
      `;
      list.appendChild(div);
    });

    document.querySelectorAll("[data-edit-exp]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.editExp);
        editingExpense = index;
        $("expense-form-title").textContent = "Edit Expense";
        $("exp-title").value = expenses[index].title;
        $("exp-amount").value = expenses[index].amount;
        $("expense-form").classList.remove("hidden");
      });
    });

    document.querySelectorAll("[data-del-exp]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.delExp);
        expenses.splice(index, 1);
        saveUserData();
        renderAll();
      });
    });
  }

  function updateInvestmentFields() {
    if (!$("inv-category")) return;

    const category = $("inv-category").value;

    if ($("normal-invest-wrap")) $("normal-invest-wrap").classList.add("hidden");
    if ($("gold-invest-wrap")) $("gold-invest-wrap").classList.add("hidden");
    if ($("bank-invest-wrap")) $("bank-invest-wrap").classList.add("hidden");

    if (category === "Gold") {
      $("gold-invest-wrap").classList.remove("hidden");
    } else if (category === "FD" || category === "RD") {
      $("bank-invest-wrap").classList.remove("hidden");

      if (category === "RD") {
        $("bank-amount-label").textContent = "Monthly Amount";
        $("bank-principal").placeholder = "Monthly RD amount";
        $("bank-hint").textContent = "RD total investment = monthly amount × duration.";
      } else {
        $("bank-amount-label").textContent = "Principal Amount";
        $("bank-principal").placeholder = "Principal amount";
        $("bank-hint").textContent = "FD total investment = principal amount.";
      }
    } else {
      $("normal-invest-wrap").classList.remove("hidden");

      if (category === "Stock" || category === "Mutual Fund") {
        $("inv-return-wrap").classList.remove("hidden");
      } else {
        $("inv-return-wrap").classList.add("hidden");
      }
    }
  }

  if ($("inv-category")) {
    $("inv-category").addEventListener("change", updateInvestmentFields);
  }

  if ($("btn-add-investment")) {
    $("btn-add-investment").addEventListener("click", () => {
      editingInvestment = null;
      $("inv-form-title").textContent = "New Investment";

      $("inv-title").value = "";
      $("inv-category").value = "";

      $("inv-amount").value = "";
      $("inv-return").value = "";

      $("gold-digital").value = "";
      $("gold-physical").value = "";

      $("bank-principal").value = "";
      $("bank-interest").value = "";
      $("bank-duration").value = "";
      $("bank-return").value = "";

      updateInvestmentFields();
      $("investment-form").classList.remove("hidden");
    });
  }

  if ($("btn-cancel-investment")) {
    $("btn-cancel-investment").addEventListener("click", () => {
      $("investment-form").classList.add("hidden");
    });
  }

  if ($("btn-save-investment")) {
    $("btn-save-investment").addEventListener("click", () => {
      const title = $("inv-title").value.trim();
      const category = $("inv-category").value;

      if (!title || !category) return;

      let item = {
        title,
        category,
        amount: 0
      };

      if (category === "Gold") {
        const digitalGold = Number($("gold-digital").value || 0);
        const physicalGold = Number($("gold-physical").value || 0);
        const total = digitalGold + physicalGold;

        if (total <= 0) return;

        item.digitalGold = digitalGold;
        item.physicalGold = physicalGold;
        item.amount = total;
      } else if (category === "FD") {
        const principal = Number($("bank-principal").value || 0);
        const interest = Number($("bank-interest").value || 0);
        const duration = Number($("bank-duration").value || 0);
        const returnAmount = Number($("bank-return").value || 0);

        if (principal <= 0 || duration <= 0) return;

        item.principal = principal;
        item.interest = interest;
        item.duration = duration;
        item.returnAmount = returnAmount;
        item.amount = principal;
      } else if (category === "RD") {
        const monthlyAmount = Number($("bank-principal").value || 0);
        const interest = Number($("bank-interest").value || 0);
        const duration = Number($("bank-duration").value || 0);
        const returnAmount = Number($("bank-return").value || 0);
        const totalInvestment = monthlyAmount * duration;

        if (monthlyAmount <= 0 || duration <= 0) return;

        item.monthlyAmount = monthlyAmount;
        item.interest = interest;
        item.duration = duration;
        item.returnAmount = returnAmount;
        item.amount = totalInvestment;
      } else {
        const amount = Number($("inv-amount").value || 0);

        if (amount <= 0) return;

        item.amount = amount;

        if (category === "Stock" || category === "Mutual Fund") {
          item.expectedReturn = Number($("inv-return").value || 0);
        }
      }

      if (editingInvestment === null) {
        investments.push(item);
      } else {
        investments[editingInvestment] = item;
      }

      editingInvestment = null;
      $("investment-form").classList.add("hidden");

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

  function investmentMeta(item) {
    if (item.category === "Gold") {
      return `Digital Gold ${money(item.digitalGold)} • Physical Gold ${money(item.physicalGold)}`;
    }

    if (item.category === "FD") {
      return `Principal ${money(item.principal)} • ${item.interest || 0}% • ${item.duration} months • Return ${money(item.returnAmount)}`;
    }

    if (item.category === "RD") {
      return `Monthly ${money(item.monthlyAmount)} × ${item.duration} months • Total ${money(item.amount)} • Return ${money(item.returnAmount)}`;
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
          <div class="empty-icon">📈</div>
          <p>No investments yet. Tap <strong>+ Add</strong> to start growing.</p>
        </div>
      `;
      return;
    }

    filtered.forEach((item) => {
      const realIndex = investments.indexOf(item);

      const div = document.createElement("div");
      div.className = "item-card";
      div.innerHTML = `
        <div>
          <div class="item-title">${item.title}</div>
          <div class="item-meta">${investmentMeta(item)}</div>
        </div>
        <div>
          <div class="item-amount">${money(item.amount)}</div>
          <div class="item-actions">
            <button class="mini-btn" data-edit-inv="${realIndex}">Edit</button>
            <button class="mini-btn delete" data-del-inv="${realIndex}">Delete</button>
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

        $("inv-form-title").textContent = "Edit Investment";
        $("inv-title").value = item.title;
        $("inv-category").value = item.category;

        $("inv-amount").value = item.amount || "";
        $("inv-return").value = item.expectedReturn || "";

        $("gold-digital").value = item.digitalGold || "";
        $("gold-physical").value = item.physicalGold || "";

        $("bank-principal").value = item.principal || item.monthlyAmount || "";
        $("bank-interest").value = item.interest || "";
        $("bank-duration").value = item.duration || "";
        $("bank-return").value = item.returnAmount || "";

        updateInvestmentFields();
        $("investment-form").classList.remove("hidden");
      });
    });

    document.querySelectorAll("[data-del-inv]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.delInv);
        investments.splice(index, 1);
        saveUserData();
        renderAll();
      });
    });
  }

  function renderSummary() {
    const income = getIncome();
    const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const savings = income - totalExpenses;
    const pct = income > 0 ? Math.max(0, Math.round((savings / income) * 100)) : 0;
    const totalInv = investments.reduce((sum, item) => sum + Number(item.amount), 0);

    if ($("sum-income")) $("sum-income").textContent = money(income);
    if ($("sum-expenses")) $("sum-expenses").textContent = money(totalExpenses);
    if ($("sum-savings")) $("sum-savings").textContent = money(savings);
    if ($("savings-pct")) $("savings-pct").textContent = pct + "%";
    if ($("sb-fill")) $("sb-fill").style.width = Math.min(pct, 100) + "%";
    if ($("inv-total")) $("inv-total").textContent = money(totalInv);
  }

  function renderAll() {
    updateUserUI();
    renderExpenses();
    renderInvestments();
    renderSummary();
  }
});