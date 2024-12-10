require("dotenv").config(); // Load environment variables from .env file
const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const path = require('path');
const bodyParser = require("body-parser");
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/style', express.static(path.join(__dirname, 'style')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));
app.use('/main', express.static(path.join(__dirname, 'main')));
app.use('/staff_pages', express.static(path.join(__dirname, 'staff_pages')));
app.use('/staff_scripts', express.static(path.join(__dirname, 'staff_scripts')));

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false, //false muna kasi local
            httpOnly: true,
        },
    })
);

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    timezone: '+8:00',
});
db.query("SELECT NOW()", (err, result) => {
    if (err) {
        console.error("Error fetching current date:", err);
    } else {
        console.log("Current date from MySQL:", result);
    }
 });

db.connect(err => {
    if (err) throw err;
    console.log('Connected to MySQL');
});


app.set('db', db);



const accountsRoutes = require("./routes/accounts"); 
app.use("/api/accounts", accountsRoutes);
app.use('/create-account', require('./routes/createAccount'));

const branchesRoutes = require("./routes/branches");
app.use("/api/branches", branchesRoutes);
app.use('/api', branchesRoutes);


const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard-stats', dashboardRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/dashboard', dashboardRoutes);


const salesOrderRoutes = require('./routes/sales-order');
app.use('/api/sales-order', salesOrderRoutes);
app.use("/api",salesOrderRoutes);

app.use("/components", express.static("components"));
app.use("/api/users", require("./routes/users"));
app.use("/receipts", express.static(path.join(__dirname, "receipts")));
app.get('/api/sales-order/unpaid', (req, res) => {
    res.json({ message: "Unpaid orders will be fetched here" });
});


const cors = require('cors');
app.use(cors({
})); // Allow all origins, or you can specify origins
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main', 'login.html'));
    
});
app.get("/debug-session", (req, res) => {
    res.json(req.session); // Returns the current session data
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});