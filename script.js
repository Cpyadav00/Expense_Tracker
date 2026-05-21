// Expense Tracker app logic (Grouped by Date) with backend API

document.addEventListener("DOMContentLoaded", () => {
  const expenseForm = document.getElementById("expense-form");
  const expenseDate = document.getElementById("expense-date");
  const expenseDesc = document.getElementById("expense-desc");
  const expenseAmount = document.getElementById("expense-amount");
  const expensesTableBody = document.querySelector("#expenses-table tbody");
  const totalAmountSpan = document.getElementById("total-amount");

  let expenses = [];

  // Fetch expenses from backend
  async function loadExpenses() {
    try {
      const res = await fetch('/api/expenses');
      expenses = await res.json();
    } catch (error) {
      console.error('Failed to load expenses', error);
      expenses = [];
    }
  }

  // Save expenses to backend
  async function saveExpenses() {
    // No bulk save needed, all ops are separate API calls
  }

  // Group expenses by date
  function groupByDate() {
    const groups = {};
    expenses.forEach((expense, index) => {
      if (!groups[expense.date]) {
        groups[expense.date] = {
          items: [],
          total: 0
        };
      }
      groups[expense.date].items.push({ ...expense, globalIndex: index });
      groups[expense.date].total += parseFloat(expense.amount);
    });
    return groups;
  }

// Render grouped expenses with inline expandable details
function renderExpenses() {
  expensesTableBody.innerHTML = "";
  let grandTotal = 0;
  const groups = groupByDate();
  const dates = Object.keys(groups).sort();

  dates.forEach((date, i) => {
    const group = groups[date];
    grandTotal += group.total;

    // Main summary row for this date
    const row = document.createElement("tr");
    row.classList.add("date-row");

    const dateCell = document.createElement("td");
    dateCell.textContent = date;
    row.appendChild(dateCell);

    const totalCell = document.createElement("td");
    totalCell.textContent = `₹${group.total.toFixed(2)}`;
    row.appendChild(totalCell);

    const detailsCell = document.createElement("td");
    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "Show Details";
    toggleBtn.classList.add("action-btn", "edit");
    toggleBtn.dataset.expanded = "false";

    toggleBtn.addEventListener("click", function () {
      const expanded = toggleBtn.dataset.expanded === "true";
      toggleBtn.dataset.expanded = !expanded;
      toggleBtn.textContent = expanded ? "Show Details" : "Hide Details";
      if (expanded) {
        // Always remove detailsRow from the DOM, if present
        if (detailsRow.parentNode) {
          detailsRow.parentNode.removeChild(detailsRow);
        }
      } else {
        // Show after this date row
        if (row.nextSibling) {
          expensesTableBody.insertBefore(detailsRow, row.nextSibling);
        } else {
          expensesTableBody.appendChild(detailsRow);
        }
      }
    });
    detailsCell.appendChild(toggleBtn);
    row.appendChild(detailsCell);
    expensesTableBody.appendChild(row);

    // Details row (initially NOT shown)
    const detailsRow = document.createElement("tr");
    detailsRow.classList.add("details-row");
    const detailsTd = document.createElement("td");
    detailsTd.colSpan = 3;
    // Build nested table
    const nestedTable = document.createElement("table");
    nestedTable.classList.add("details-table");
    const thead = document.createElement("thead");
    const theadTr = document.createElement("tr");
    ["Description", "Amount", "Actions"].forEach(txt => {
      const th = document.createElement("th");
      th.textContent = txt;
      theadTr.appendChild(th);
    });
    thead.appendChild(theadTr);
    nestedTable.appendChild(thead);

    const nestedTbody = document.createElement("tbody");
    group.items.forEach((item, idx) => {
      const itemRow = document.createElement("tr");
      const descTd = document.createElement("td");
      descTd.textContent = item.description;
      itemRow.appendChild(descTd);

      const amountTd = document.createElement("td");
      amountTd.textContent = `₹${parseFloat(item.amount).toFixed(2)}`;
      itemRow.appendChild(amountTd);

      const actionsTd = document.createElement("td");

      const editBtn = document.createElement("button");
      editBtn.classList.add("action-btn", "edit");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => editExpense(item.globalIndex));
      actionsTd.appendChild(editBtn);

      const delBtn = document.createElement("button");
      delBtn.classList.add("action-btn", "delete");
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => deleteExpense(item.globalIndex));
      actionsTd.appendChild(delBtn);

      itemRow.appendChild(actionsTd);
      nestedTbody.appendChild(itemRow);
    });
    nestedTable.appendChild(nestedTbody);
    detailsTd.appendChild(nestedTable);
    detailsRow.appendChild(detailsTd);
  });

  totalAmountSpan.textContent = grandTotal.toFixed(2);
}

// REMOVE: showDetailsForDate function (now replaced by inline table view)


  // Add expense via backend API with merging logic (if description matches on the same date, increase amount)
  async function addExpense(expense) {
    try {
      // Find existing expense index matching same date and description
      const existingIndex = expenses.findIndex(e =>
        e.date === expense.date && e.description.toLowerCase() === expense.description.toLowerCase()
      );
      if (existingIndex !== -1) {
        // Merge amounts
        const existingExpense = expenses[existingIndex];
        const newAmount = (parseFloat(existingExpense.amount) + parseFloat(expense.amount)).toFixed(2);
        const updatedExpense = { ...existingExpense, amount: newAmount };
        // Update on backend
        const res = await fetch(`/api/expenses/${existingIndex}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedExpense)
        });
        if (!res.ok) throw new Error('Failed to update existing');
      } else {
        // Add new expense as usual
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expense)
        });
        if (!res.ok) throw new Error('Failed to add new');
      }
      await loadExpenses();
      renderExpenses();
    } catch (error) {
      alert('Error adding or merging expense');
      console.error(error);
    }
  }

  // Edit expense via backend API
  async function editExpense(index) {
    const expense = expenses[index];
    expenseDate.value = expense.date;
    expenseDesc.value = expense.description;
    expenseAmount.value = expense.amount;
    expenseForm.dataset.editIndex = index;
    expenseForm.querySelector("button[type='submit']").textContent =
      "Update Expense";
  }

  // Delete expense via backend API
  async function deleteExpense(index) {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      const res = await fetch(`/api/expenses/${index}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete');
      await loadExpenses();
      renderExpenses();
      resetForm();
    } catch (error) {
      alert('Error deleting expense');
      console.error(error);
    }
  }

  // Reset form
  function resetForm() {
    expenseForm.reset();
    delete expenseForm.dataset.editIndex;
    expenseForm.querySelector("button[type='submit']").textContent =
      "Add Expense";
  }

  // Handle submit
  expenseForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const date = expenseDate.value;
    const description = expenseDesc.value.trim();
    const amountNumber = parseFloat(expenseAmount.value);

    if (!date || !description || isNaN(amountNumber) || amountNumber <= 0) {
      alert("Please enter valid details.");
      return;
    }

    const expenseData = {
      date,
      description,
      amount: amountNumber.toFixed(2)
    };

    if (expenseForm.dataset.editIndex !== undefined) {
      const idx = parseInt(expenseForm.dataset.editIndex, 10);
      try {
        const res = await fetch(`/api/expenses/${idx}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenseData)
        });
        if (!res.ok) throw new Error('Failed to update');
        await loadExpenses();
        renderExpenses();
        resetForm();
      } catch (error) {
        alert('Error updating expense');
        console.error(error);
      }
    } else {
      await addExpense(expenseData);
      resetForm();
    }
  });

  // Initialize
  loadExpenses().then(renderExpenses);
});
