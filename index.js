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
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const PORT = process.env.PORT || 3000;
const app = express();





const fs = require('fs')
const csv = require('csv-parser')
var uuid = require('uuid');

var bodyParser = require('body-parser')

// support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({
    extended: true
}));
// Extended: https://swagger.io/specification/#infoObject
const swaggerOptions = {
    swaggerDefinition: {
        info: {
            version: "1.0.0",
            title: "Accounting Service API",
            description: "Customer API Information",
            contact: {
                name: "Ahmad Abdullah Qadir"
            },
            servers: [process.env.address]
        }
    },
    // ['.routes/*.js']
    apis: ["index.js"]
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

//Express Setter
require('events').EventEmitter.defaultMaxListeners = Infinity
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
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use(cors());


//Mongoose ODM
mongoose.connect("mongodb+srv://Accountant:Accountant@cluster0.c5jxd.mongodb.net/AccountingMS?retryWrites=true&w=majority").then(
    console.log('Connected to database server')
);

//Collections
const EmployeeClass = require('./models/Employee');
const ProductsCollection = require('./models/Product')
const swaggerJSDoc = require('swagger-jsdoc');
const RecordsCollection = require('./models/records');
const ProfileCollection = require('./models/Profiles');
const TrailerCollection = require('./models/Trailers');
const CompanyCollection = require('./models/Companies');
require('./Controller/prod')


app.get('/import', async (req, res) => {
    fs.createReadStream("C:\\Users\\Ahmad\\Desktop\\metalsteel.csv")
        .pipe(csv())
        .on('data', async function (row) {
            const newProduct = new ProductsCollection({
                itemName: row.itemName,
                itemCode: uuid.v1(),
                itemModel: row.itemModel,
                itemUnit: row.itemUnit,
                itemType: row.itemType,
                manufacturerCompany: row.manufacturerCompany,
                companyCode: row.companyCode,
                countryCompany: row.countryCompany,
                unit: row.unit,
                usedIn: row.usedIn,
                weight: row.weight,
                totalWeight: row.weight * row.perPacket,
                color: row.color,
                packet: row.packet,
                perPacket: row.perPacket,
                remainedPacket: 0,
                remainedPerPacket: 0,
                totalQuantity: 0,
                status: "New Product",
                expireDate: Date.now(),
                camePrice: row.camePrice,
                sellPriceMufrad: row.sellPriceMufrad,
                sellPriceMahal: row.sellPriceMahal,
                sellPriceWasta: row.sellPriceWasta,
                sellPriceWakil: row.sellPriceWakil,
                sellPriceSharika: row.sellPriceSharika,
                totalPrice: row.camePrice * row.perPacket,
                trailerNumber: 1,
                addedBy: "Ahmad Qadir",
                updatedBy: "Ahmad Qadir",
                note: ".",
                softdelete: "false"
            });
            await newProduct.save();
            const newItem = new RecordsCollection({
                packet: row.packet,
                camePrice: row.camePrice,
                sellPriceMufrad: row.sellPriceMufrad,
                sellPriceMahal: row.sellPriceMahal,
                sellPriceWasta: row.sellPriceWasta,
                sellPriceWakil: row.sellPriceWakil,
                sellPriceSharika: row.sellPriceSharika,
                totalPrice: row.camePrice * row.perPacket,
                perPacket: row.perPacket,
                totalQuantity: row.perPacket,
                status: "New Product",
                trailerNumber: 1,
                addedBy: "Ahmad Qadir",
                updatedBy: "Ahmad Qadir",
                note: ".",
                softdelete: "false",
                productID: newProduct['_id'],
            });
            await newItem.save();
            await ProductsCollection.findByIdAndUpdate({
                _id: newProduct['_id']
            }, {
                itemHistory: newItem["_id"]
            });

        })
        .on('end', function () {
            res.send("end")
            // TODO: SAVE users data to another file
        })
})

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

        const Records = await RecordsCollection.find({}).populate("productID").sort({
            "createdAt": -1
        });
        const Profiles = await ProfileCollection.find({});
        const Trailers = await TrailerCollection.find({
            softdelete: false
        }).sort({
            "createdAt": 1
        }).limit(5);
        const TotalExpenses = await RecordsCollection.find({
            status: {
                $nin: ["Customer Request"]
            }
        }).populate("productID");
        const TotalIncome = await RecordsCollection.find({
            status: "Customer Request"
        }).populate("productID");

        var totalPrice = 0
        var Expenses = []
        for (let index = 0; index < TotalExpenses.length; index++) {
            const element = TotalExpenses[index];
            totalPrice = totalPrice + element['sellPrice'] * element['totalQuantity'];
        }
        Expenses = [totalPrice]
        //==============================================
        var totalPriceIncome = 0
        var Income = []
        for (let index = 0; index < TotalIncome.length; index++) {
            const element = TotalIncome[index];
            totalPriceIncome = totalPriceIncome + element['sellPrice'] * element['totalQuantity'];
        }
        Income = [totalPriceIncome]
        const Products = await ProductsCollection
            .find({
                softdelete: false
            })
            .sort({
                "createdAt": -1
            }).
            populate('itemHistory')


        const _MostWanted = await ProductsCollection
            .find({
                softdelete: false
            })
            .sort({
                "totalQuantity": -1
            }).limit(10)
        var total_Products = 0;
        for (let index = 0; index < Products.length; index++) {
            const element = Products[index];
            total_Products = total_Products + element['totalQuantity']
        }
        // var _balance = Income * (parseFloat(User['ratio']) / 100)
        // await EmployeeClass.findByIdAndUpdate({
        //     _id: User['_id']
        // }, {
        //     $set: {
        //         balance: _balance
        //     }
        // });


        res.render("Dashboard", {
            title: "Dashboard",
            product: Products,
            mostwanted: _MostWanted,
            records: Records,
            expenses: Expenses,
            Income: Income,
            profiles: Profiles,
            trailers: Trailers,
            user: User,
            totalP: total_Products
        })
    } else {
        res.render('Login', {
            title: "Login",
        });
    }
});


app.get('/remover', async (req, res) => {
    var checker = await ProductsCollection.updateMany({
    }, {
        remainedPacket: 0,
        remainedPerPacket: 0,
        totalQuantity: 0
    });
    res.send(checker)
});

app.get('/removerOfCust', async (req, res) => {
    var checker = await ProfileCollection.updateMany({
    }, {
        borrowedBalance: 0,
        recoveredBalance: 0,
        remainedbalance: 0,
        invoiceID: []
    });
    res.send(checker)
});

app.get('/updater', async (req, res) => {
    fs.createReadStream("C:\\Users\\Ahmad\\Desktop\\qarz.csv")
        .pipe(csv())
        .on('data', async function (row) {

            const user = await ProfileCollection.findOne({
                clientName: row.clientName,
                companyName: row.companyName
            })
            var checker = await ProfileCollection.findByIdAndUpdate({
                _id: user['_id']
            }, {
                borrowedBalance: parseFloat(row.borrowedBalance),
                recoveredBalance: parseFloat(row.recoveredBalance),
                remainedbalance: parseFloat(row.remainedbalance),
            });
        })
        .on('end', function () {
            res.send("end")
            // TODO: SAVE users data to another file
        })

});



app.get('/royal', async (req, res) => {
    const user = await ProductsCollection.find({
        manufacturerCompany: "الافق"
    })

    // for (let index = 0; index < user.length; index++) {
    //     await ProductsCollection.findByIdAndUpdate({
    //         _id: user[index]['_id']
    //     }, {
    //         itemModel: user[index]['itemModel']+" "+user[index]['itemName'],
    //     });
    // }


    res.send(user)

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
