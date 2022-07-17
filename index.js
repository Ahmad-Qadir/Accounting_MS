//Packages
const cors = require('cors')
const path = require('path');
const express = require("express");
const config = require('config');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const session = require('express-session');
const PORT = process.env.PORT || 3000;
const app = express();

const fs = require('fs')
var uuid = require('uuid');

var bodyParser = require('body-parser')

// support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
    extended: true
}));

//Express Setter
require('events').EventEmitter.defaultMaxListeners = Infinity
app.engine('pug', require('pug').__express)
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.locals.basedir = 'views';

//Middlewares
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}))
app.use(cookieParser());
app.use(flash());
app.use(session({
    secret: 'keyboard cat',
    cookie: {
        maxAge: 60000
    },
    resave: true,
    saveUninitialized: true
}));
app.use(function (req, res, next) {
    res.locals.messages = require('express-messages')(req, res);
    next();
});
app.use(cors());


//Mongoose ODM
mongoose.connect("mongodb+srv://Accountant:Accountant@cluster0.c5jxd.mongodb.net/AccountingMS?retryWrites=true&w=majority").then(
    console.log('Connected to database server')
);

// mongoose.connect("mongodb://localhost:27017/AccountingMS").then(
//     console.log('Connected to database server')
// );

//Collections
const EmployeeClass = require('./models/Employee');
const ProductsCollection = require('./models/Product')
const RecordsCollection = require('./models/records');
const ProfileCollection = require('./models/Profiles');
const TrailerCollection = require('./models/Trailers');
const CompanyCollection = require('./models/Companies');


//Getting Access Token
app.use(async (req, res, next) => {
    if (req.cookies['x-access-token']) {
        try {
            const accessToken = req.cookies['x-access-token'];
            const {
                userId,
                exp
            } = await jwt.verify(accessToken, "TitanService_jwtPrivateKey");
            // If token has expired
            if (exp < Date.now().valueOf() / 1000) {
                return res.render('Login', {
                    title: "Login",
                });
            }
            res.locals.loggedInUser = await EmployeeClass.findById(userId);
            next();
        } catch (error) {
            next(error);
        }
    } else {
        next();
    }
});

// Routes
app.use('/', require('./Routes/router'));

app.get('/', async (req, res) => {
    if (req.cookies['x-access-token']) {
        const accessToken = req.cookies['x-access-token'];
        const {
            userId,
            exp
        } = await jwt.verify(accessToken, "TitanService_jwtPrivateKey");
        const User = await EmployeeClass.findById(userId);

        // Total Products
        const Products = await ProductsCollection.find({})

        // Total Users
        const Profiles = await ProfileCollection.find({});

        res.render("Dashboard", {
            title: "Dashboard",
            product: Products,
            profiles: Profiles,
            user: User,
        })
    } else {
        res.render('Login', {
            title: "Login",
        });
    }
});

//Error Handler
process.on('uncaughtException', function (err) {
    console.error((new Date).toUTCString() + ' uncaughtException:', err.message)
});

//Main Listner
app.listen(PORT, function () {
    console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
}).on('error', function (err) {
    console.log('Error Occured on error handler:' + err);
});
