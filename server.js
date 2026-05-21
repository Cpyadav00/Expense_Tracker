const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, 'expenses_db.json');

app.use(cors()); // enable CORS for all origins
app.use(express.json());
app.use(express.static(__dirname)); // serve frontend files (index.html, style.css, script.js)

// Helper to read data file
function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading data:', err);
    return [];
  }
}

// Helper to write data file
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing data:', err);
  }
}

// Get all expenses
app.get('/api/expenses', (req, res) => {
  const expenses = readData();
  res.json(expenses);
});

// Add a new expense
app.post('/api/expenses', (req, res) => {
  const newExpense = req.body;
  if (!newExpense.date || !newExpense.description || !newExpense.amount) {
    return res.status(400).json({ error: 'Missing expense fields' });
  }
  const expenses = readData();
  expenses.push(newExpense);
  writeData(expenses);
  res.status(201).json(newExpense);
});

// Update expense by index
app.put('/api/expenses/:index', (req, res) => {
  const index = parseInt(req.params.index, 10);
  const updatedExpense = req.body;

  if (isNaN(index)) {
    return res.status(400).json({ error: 'Invalid index' });
  }
  const expenses = readData();
  if (index < 0 || index >= expenses.length) {
    return res.status(404).json({ error: 'Expense not found' });
  }
  expenses[index] = updatedExpense;
  writeData(expenses);
  res.json(updatedExpense);
});

// Delete expense by index
app.delete('/api/expenses/:index', (req, res) => {
  const index = parseInt(req.params.index, 10);
  if (isNaN(index)) {
    return res.status(400).json({ error: 'Invalid index' });
  }
  const expenses = readData();
  if (index < 0 || index >= expenses.length) {
    return res.status(404).json({ error: 'Expense not found' });
  }
  expenses.splice(index, 1);
  writeData(expenses);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Expense Tracker backend running at http://localhost:${PORT}`);
});
