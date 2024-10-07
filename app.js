const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('node:path');
const fs = require('node:fs');
const session = require('express-session');

// express app
const app = express();
const port = 3000;

const dataPath = path.join(__dirname, 'data', 'users.json');

// view engine
app.set('view engine', 'ejs');

// express-ejs-layouts middleware
app.use(expressLayouts);

// Setting layout 
app.set('layout', 'layout');

// Used for proper parsing of incoming request 
app.use(express.urlencoded({ extended: false }));

app.use(session({
    secret: "It's a secret",
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 60000 * 60,
    }
}));

app.use(express.static('public'));

// Middleware to check if the user is logged in
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        res.redirect('/'); // Redirect to home if already logged in
    } else {
        next(); // Proceed to the login page
    }
}



// login page
app.get('/login', isAuthenticated, (req, res) => {
    const error = req.session.error;
    req.session.error = null;

    // Setting headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Expires', '0');
    res.setHeader('Pragma', 'no-cache');

    res.render('login.ejs', {
        title: 'Login',
        error: error,
    });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            console.log("Error reading JSON file");
            return res.status(500).send('Internal server error');
        }
        const users = JSON.parse(data);

        const user = users.find(detail => detail.username === username && detail.password === password);

        if (user) {
            req.session.user = user;
            // res.send('Login successful! You can now access the protected route.');
            res.redirect('/');
        }
        else {
            // res.status(401).send('Invalid username or password');
            req.session.error = 'Invalid username or password';
            res.redirect('/login');
        }
    });
});

// Middleware to ensure authentication for protected routes
function ensureAuthenticated(req, res, next) {
    if (req.session.user) {
        next(); // User is authenticated, proceed to the requested route
    } else {
        res.redirect('/login'); // User is not authenticated, redirect to login
    }
}

app.get('/', ensureAuthenticated, (req, res) => {

    // Setting headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Expires', '0');
    res.setHeader('Pragma', 'no-cache');

    if (req.session.user) {
        res.render('index.ejs', {
            title: 'home',
            user: req.session.user.username,
            layout: false,
        })
        console.log(req.session);
    }
    else {
        res.redirect('/login');
    }
});

// register page
app.get('/register', (req, res) => {
    res.render('register.ejs', { title: 'Register' });
});

// app.post('/regsiter', (req, res) => {
//     res.redirect('/login');
// });

// Register user
app.post('/register', (req, res) => {
    const newUser = {
        username: req.body.username,
        password: req.body.password,
    };

    // Reading the JSON file
    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            console.log("Error reading JSON file");
            return res.status(500).send('500 - Internal server error');
        }
        let users = [];
        if (data) {
            users = JSON.parse(data);
            console.log(users);
            
        }
        // Add new user
        users.push(newUser);


        // write stream to write data back to file
        fs.writeFile(dataPath, JSON.stringify(users, null, 2), (err) => {
            if (err) {
                console.error('Error writing to JSON file:', err);
                return res.status(500).send('Internal Server Error');
            }
            res.redirect('/login');
        });
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Internal server error')
        }
        res.redirect('/login');
    });

});

// For endpoint without any defined routes
app.use((req, res) => {
    res.send('Error 404 - page not found')
});

// Listen to a port
app.listen(port, () => {
    console.log(`Server started running on port ${port}`);
});