const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration (Security)
app.use(session({
  secret: 'ems_enterprise_secret_key_2023',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

const path = require('path');

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// In-Memory Database
const db = { users: [], employees: [], attendance: [], salaries: [] };

// Seed Admin
db.users.push({
  id: 'USR001',
  username: 'admin',
  password: bcrypt.hashSync('admin123', 10),
  role: 'admin',
  name: 'System Administrator'
});

// Seed Employees
const seedEmployees = [
  { id: 'EMP001', name: 'Ahmed Khan', emiratesId: '784-1990-1234567-1', passport: 'A1234567', nationality: 'Pakistani', department: 'IT', trade: 'Developer', salary: 5000, phone: '+971500000001', email: 'ahmed@ems.com', joiningDate: '2023-01-15', status: 'Active', photo: 'https://i.pravatar.cc/150?img=1' },
  { id: 'EMP002', name: 'Jane Smith', emiratesId: '784-1991-1234567-2', passport: 'B1234567', nationality: 'British', department: 'HR', trade: 'Manager', salary: 6000, phone: '+971500000002', email: 'jane@ems.com', joiningDate: '2022-05-15', status: 'Active', photo: 'https://i.pravatar.cc/150?img=2' },
  { id: 'EMP003', name: 'Li Wei', emiratesId: '784-1992-1234567-3', passport: 'C1234567', nationality: 'Chinese', department: 'Finance', trade: 'Accountant', salary: 4500, phone: '+971500000003', email: 'li@ems.com', joiningDate: '2023-03-20', status: 'Active', photo: 'https://i.pravatar.cc/150?img=3' }
];

seedEmployees.forEach(emp => {
  db.employees.push(emp);
  db.users.push({ id: emp.id, username: emp.id, password: bcrypt.hashSync('emp123', 10), role: 'employee', name: emp.name });
});

// Seed Attendance (Today)
const today = new Date().toISOString().split('T')[0];
db.attendance.push({ id: 'ATT001', employeeId: 'EMP001', employeeName: 'Ahmed Khan', department: 'IT', date: today, checkIn: '09:05', checkOut: '18:00', breakTime: 1, workingHours: 8, overtime: 0, status: 'Late', remarks: 'Traffic' });
db.attendance.push({ id: 'ATT002', employeeId: 'EMP002', employeeName: 'Jane Smith', department: 'HR', date: today, checkIn: '09:00', checkOut: '17:30', breakTime: 1, workingHours: 7.5, overtime: 0, status: 'Present', remarks: '' });
db.attendance.push({ id: 'ATT003', employeeId: 'EMP003', employeeName: 'Li Wei', department: 'Finance', date: today, checkIn: '-', checkOut: '-', breakTime: 0, workingHours: 0, overtime: 0, status: 'Absent', remarks: 'Sick Leave' });

// Seed Salaries
const currentMonth = new Date().getMonth();
const currentYear = new Date().getFullYear();
db.salaries.push({ id: 'SAL001', employeeId: 'EMP001', employeeName: 'Ahmed Khan', month: currentMonth, year: currentYear, basic: 5000, allowance: 500, overtime: 0, bonus: 0, commission: 0, deductions: 0, advance: 0, penalty: 0, loan: 0, net: 5500, status: 'Paid', paymentMethod: 'Bank', transactionId: 'TXN001', reference: 'REF001', paymentDate: today });
db.salaries.push({ id: 'SAL002', employeeId: 'EMP002', employeeName: 'Jane Smith', month: currentMonth, year: currentYear, basic: 6000, allowance: 600, overtime: 0, bonus: 0, commission: 0, deductions: 0, advance: 0, penalty: 0, loan: 0, net: 6600, status: 'Pending', paymentMethod: '', transactionId: '', reference: '', paymentDate: '' });

// Auth Middleware
const isAuthenticated = (req, res, next) => {
  if (req.session.user) return next();
  res.status(401).json({ error: 'Unauthorized' });
};
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') return next();
  res.status(403).json({ error: 'Forbidden' });
};

// Routes
app.get('/', (req, res) => {
  res.render('index', { user: req.session.user || null });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.users.find(u => u.username === username);
  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user = { id: user.id, username: user.username, role: user.role, name: user.name };
    return res.json({ success: true, user: req.session.user });
  }
  res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// Get State
app.get('/api/state', isAuthenticated, (req, res) => {
  const userId = req.session.user.id;
  const role = req.session.user.role;
  let employees = db.employees, attendance = db.attendance, salaries = db.salaries;
  if (role === 'employee') {
    employees = db.employees.filter(e => e.id === userId);
    attendance = db.attendance.filter(a => a.employeeId === userId);
    salaries = db.salaries.filter(s => s.employeeId === userId);
  }
  res.json({ employees, attendance, salaries, user: req.session.user });
});

// Employee CRUD
app.post('/api/employees', isAdmin, (req, res) => {
  try {
    const newEmp = { ...req.body, photo: req.body.photo || 'https://i.pravatar.cc/150' };
    db.employees.push(newEmp);
    db.users.push({ id: newEmp.id, username: newEmp.id, password: bcrypt.hashSync('emp123', 10), role: 'employee', name: newEmp.name });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/employees/:id', isAdmin, (req, res) => {
  const emp = db.employees.find(e => e.id === req.params.id);
  if (emp) { Object.assign(emp, req.body); res.json({ success: true }); }
  else res.status(404).json({ error: 'Not found' });
});

app.delete('/api/employees/:id', isAdmin, (req, res) => {
  db.employees = db.employees.filter(e => e.id !== req.params.id);
  db.users = db.users.filter(u => u.id !== req.params.id);
  res.json({ success: true });
});

// Attendance
app.post('/api/attendance/checkin', isAuthenticated, (req, res) => {
  const userId = req.session.user.id;
  const empId = req.session.user.role === 'admin' && req.body.employeeId ? req.body.employeeId : userId;
  const dateStr = new Date().toISOString().split('T')[0];
  let record = db.attendance.find(a => a.employeeId === empId && a.date === dateStr);
  if (record && record.checkIn !== '-') return res.status(400).json({ error: 'Already checked in' });
  
  const emp = db.employees.find(e => e.id === empId);
  const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const isLate = time > '09:00';
  
  if (record) {
    record.checkIn = time; record.status = isLate ? 'Late' : 'Present';
  } else {
    db.attendance.push({ id: 'ATT' + Date.now(), employeeId: empId, employeeName: emp.name, department: emp.department, date: dateStr, checkIn: time, checkOut: '-', breakTime: 1, workingHours: 0, overtime: 0, status: isLate ? 'Late' : 'Present', remarks: '' });
  }
  res.json({ success: true });
});

app.post('/api/attendance/checkout', isAuthenticated, (req, res) => {
  const userId = req.session.user.id;
  const empId = req.session.user.role === 'admin' && req.body.employeeId ? req.body.employeeId : userId;
  const dateStr = new Date().toISOString().split('T')[0];
  let record = db.attendance.find(a => a.employeeId === empId && a.date === dateStr);
  if (!record || record.checkIn === '-') return res.status(400).json({ error: 'Not checked in' });
  if (record.checkOut !== '-') return res.status(400).json({ error: 'Already checked out' });
  
  const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  record.checkOut = time;
  const [inH, inM] = record.checkIn.split(':').map(Number);
  const [outH, outM] = time.split(':').map(Number);
  let diff = (outH * 60 + outM) - (inH * 60 + inM) - (record.breakTime * 60);
  record.workingHours = Math.max(0, parseFloat((diff / 60).toFixed(2)));
  record.overtime = record.workingHours > 8 ? parseFloat((record.workingHours - 8).toFixed(2)) : 0;
  if (record.workingHours < 4) record.status = 'Half Day';
  res.json({ success: true });
});

// Salaries
app.post('/api/salaries/generate', isAdmin, (req, res) => {
  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  db.salaries = db.salaries.filter(s => !(s.month === month && s.year === year && s.status === 'Pending'));
  db.employees.forEach(emp => {
    const empAtt = db.attendance.filter(a => a.employeeId === emp.id && new Date(a.date).getMonth() === month);
    const overtimeHrs = empAtt.reduce((sum, a) => sum + (a.overtime || 0), 0);
    const basic = parseFloat(emp.salary);
    const allowance = parseFloat((basic * 0.1).toFixed(2));
    const overtimePay = parseFloat(((basic / 30 / 8) * overtimeHrs).toFixed(2));
    const deductions = 0;
    const net = parseFloat((basic + allowance + overtimePay - deductions).toFixed(2));
    db.salaries.push({ id: 'SAL' + Date.now() + emp.id, employeeId: emp.id, employeeName: emp.name, month, year, basic, allowance, overtime: overtimePay, bonus: 0, commission: 0, deductions, advance: 0, penalty: 0, loan: 0, net, status: 'Pending', paymentMethod: '', transactionId: '', reference: '', paymentDate: '' });
  });
  res.json({ success: true });
});

app.post('/api/salaries/pay/:id', isAdmin, (req, res) => {
  const sal = db.salaries.find(s => s.id === req.params.id);
  if (!sal) return res.status(404).json({ error: 'Not found' });
  sal.status = 'Paid';
  sal.paymentMethod = req.body.method;
  sal.transactionId = req.body.transactionId;
  sal.reference = req.body.reference;
  sal.paymentDate = req.body.date;
  res.json({ success: true });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`EMS Enterprise running on port ${PORT}`));
