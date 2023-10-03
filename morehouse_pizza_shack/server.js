const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

let db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Failed to open database', err.message);
    } else {
        console.log('Connected to SQLite database');

        db.run('PRAGMA foreign_keys = ON;', (err) => {
            if (err) {
                console.error('Failed to enable foreign key support', err.message);
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS user(
            userID INTEGER PRIMARY KEY AUTOINCREMENT,
            userEmail TEXT UNIQUE NOT NULL,
            userPassword TEXT UNIQUE NOT NULL,
            userType TEXT NOT NULL
        )`, [], (err) => {
            if (err) {
                console.error("Error creating table", err.message);
            } else {
                console.log("User table created!");
            }
        });

        db.run(`CREATE TABLE IF NOT EXISTS orders(
            orderID INTEGER PRIMARY KEY AUTOINCREMENT,
            orderStatus TEXT NOT NULL,
            orderPaymentType TEXT NOT NULL,
            orderCreditCardNumber TEXT,
            orderDeliveryAddress TEXT NOT NULL,
            orderPizza TEXT NOT NULL,
            orderComment TEXT,
            userName Text,
            userIDCustomer INTEGER,
            userIDEmployee INTEGER,
            FOREIGN KEY (userIDEmployee) REFERENCES user(userID) ON DELETE CASCADE,
            FOREIGN KEY (userIDCustomer) REFERENCES user(userID)
        )`, [], (err) => {
            if (err) {
                console.error("Error creating table", err.message);
            } else {
                console.log("Order table created!");
            }
        });

        insertData();
    }
});

const insertData = () => {
    let users = [
        {email: 'alice@example.com', password: 'alice123', type: 'customer'},
        {email: 'bob@example.com', password: 'bob123', type: 'employee'},
        {email: 'charlie@example.com', password: 'charlie123', type: 'customer'},
        {email: 'david@example.com', password: 'david123', type: 'employee'},
        {email: 'eve@example.com', password: 'eve123', type: 'customer'},
        {email: 'frank@example.com', password: 'frank123', type: 'employee'},
        {email: 'grace@example.com', password: 'grace123', type: 'customer'},
        {email: 'hannah@example.com', password: 'hannah123', type: 'employee'},
        {email: 'ian@example.com', password: 'ian123', type: 'customer'},
        {email: 'jane@example.com', password: 'jane123', type: 'employee'}
    ];

    users.forEach(user => {
        db.run(`INSERT INTO user (userEmail, userPassword, userType) VALUES (?, ?, ?)`, [user.email, user.password, user.type], function (err) {
            if (err) {
                console.error("Error inserting data", err.message);
            } else {
                console.log(`User ${user.email} inserted with ID: ${this.lastID}`);
            }
        });
    });
};

app.get('/', (req, res) => {
    res.send('Hello from the Morehouse Pizza Shack website!');
});

app.listen(PORT, (req, res) => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// user table CRUD

app.post('/user', (req, res) => {
    const {userEmail, userPassword, userType} = req.body;
    if (!userEmail || !userPassword || !userType) {
        return res.status(400).json({error: 'Please provide full user data'});
    }
    const sql = `INSERT INTO user (userEmail, userPassword, userType) VALUES (?, ?, ?)`;
    db.run(sql, [userEmail, userPassword, userType], function (err) {
        if (err) {
            return res.status(500).json({error: err.message});
        }
        res.json({message: 'User created', userID: this.lastID});
    });
});

app.get('/user/:id', (req, res) => {
    const userID = req.params.id;
    const sql = `SELECT * FROM user WHERE userID = ?`;
    db.get(sql, [userID], (err, row) => {
        if (err) {
            return res.status(500).json({error: err.message});
        }
        res.json(row);
    });
});

app.put('/user/:id', (req, res) => {
    const {userEmail, userPassword, userType} = req.body;
    const userID = req.params.id;
    const sql = `UPDATE user SET userEmail = ?, userPassword = ?, userType = ? WHERE userID = ?`;
    db.run(sql, [userEmail, userPassword, userType, userID], function (err) {
        if (err) {
            return res.status(500).json({error: err.message});
        }
        res.json({message: 'User updated', changes: this.changes});
    });
});

app.delete('/user/:id', (req, res) => {
    const userID = req.params.id;
    const sql = `DELETE FROM user WHERE userID = ?`;
    db.run(sql, [userID], function (err) {
        if (err) {
            return res.status(500).json({error: err.message});
        }
        res.json({message: 'User deleted', changes: this.changes});
    });
});

// user table auth

app.post('/auth/login', (req, res) => {
    const {userEmail, userPassword} = req.body;

    if (!userEmail || !userPassword) {
        return res.status(400).json({error: 'Please provide email and password.'});
    }

    const sql = `SELECT * FROM user WHERE userEmail = ?`;
    db.get(sql, [userEmail], (err, row) => {
        if (err) {
            return res.status(500).json({error: err.message});
        }
        if (row && row.userPassword === userPassword) {
            res.json({success: true, message: 'Authentication successful!', user: row});
        } else {
            res.json({success: false, message: 'Incorrect email or password.'});
        }
    });
});

// order table CRUD

app.post('/orders', (req, res) => {
    const {
        orderStatus,
        orderPaymentType,
        orderCreditCardNumber,
        orderDeliveryAddress,
        orderPizza,
        orderComment,
        userIDCustomer,
        userIDEmployee,
        userName
    } = req.body;

    const sql = `
        INSERT INTO orders (orderStatus, orderPaymentType, orderCreditCardNumber, orderDeliveryAddress, orderPizza, orderComment, userIDCustomer, userIDEmployee, userName)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [orderStatus, orderPaymentType, orderCreditCardNumber, orderDeliveryAddress, orderPizza, orderComment, userIDCustomer, userIDEmployee, userName], function (err) {
        if (err) {
            return res.status(400).json({error: err.message});
        }
        res.json({orderID: this.lastID});
    });
});

app.get('/orders/:id', (req, res) => {
    const sql = `SELECT * FROM orders WHERE userIDCustomer = ?`;
    db.get(sql, [req.params.id], (err, order) => {
        if (err) {
            return res.status(400).json({error: err.message});
        }
        res.json(order);
    });
});

app.get('/orders', (req, res) => {
    const sql = `SELECT * FROM orders`;
    db.all(sql, [], (err, orders) => {
        if (err) {
            return res.status(400).json({error: err.message});
        }
        res.json(orders);
   });
});

app.put('/orders/:id', (req, res) => {
    const {
        orderStatus,
        orderPaymentType,
        orderCreditCardNumber,
        orderDeliveryAddress,
        orderPizza,
        orderComment,
        userIDCustomer,
        userIDEmployee
    } = req.body;

    const sql = `
        UPDATE orders 
        SET orderStatus = ?, orderPaymentType = ?, orderCreditCardNumber = ?, orderDeliveryAddress = ?, orderPizza = ?, orderComment = ?, userIDCustomer = ?, userIDEmployee = ?
        WHERE orderID = ?
    `;

    db.run(sql, [orderStatus, orderPaymentType, orderCreditCardNumber, orderDeliveryAddress, orderPizza, orderComment, userIDCustomer, userIDEmployee, req.params.id], function (err) {
        if (err) {
            return res.status(400).json({error: err.message});
        }
        res.json({message: 'Order updated successfully'});
    });
});

app.delete('/orders/:id', (req, res) => {
    const sql = `DELETE FROM orders WHERE orderID = ?`;

    db.run(sql, [req.params.id], function (err) {
        if (err) {
            return res.status(400).json({error: err.message});
        }
        res.json({message: 'Order deleted successfully'});
    });
});

