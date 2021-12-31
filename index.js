//Packages
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
const port = process.env.PORT || 5000;
const app = express();
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
            servers: ["http://default_route:80"]
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
const fs = require('fs')
const csv = require('csv-parser')
var uuid = require('uuid');


//Mongoose ODM
mongoose.connect(config.get("MongoDB_URL")).then(
    console.log('Connected to database server')
);

//Collections
const EmployeeClass = require('./Models/Employee');
const ProductsCollection = require('./Models/Products')
const swaggerJSDoc = require('swagger-jsdoc');
const RecordsCollection = require('./Models/Records');
const ProfileCollection = require('./Models/Profiles');
const TrailerCollection = require('./Models/Trailers');
const CompanyCollection = require('./Models/Company');


app.post('/parser', async (req, res) => {
    // const Products = await ProductsCollection
    //     .find({
    //         softdelete: false,
    //     })
    //     .sort({
    //         "createdAt": -1
    //     }).limit(20)


    // res.send(Products)



    var searchStr = req.body.search.value;
    // console.log(searchStr)

    if (searchStr) {
        var regex = new RegExp(searchStr, "i")
        searchStr = {
            $or: [{
                'itemName': regex
            },{
                'itemModel': regex
            },{
                'itemUnit': regex
            }, {
                'manufacturerCompany': regex
            }, {
                'companyCode': regex
            }, {
                'countryCompany': regex
            }, {
                'unit': regex
            }, {
                'perUnit': regex
            }, {
                'itemType': regex
            }, {
                'usedIn': regex
            }, {
                'color': regex
            }, {
                'status': regex
            }]
        };


    } else {
        searchStr = {};
    }

    var recordsTotal = 0;
    var recordsFiltered = 0;

    ProductsCollection.count({}, function (err, c) {
        recordsTotal = c;
        // console.log(c);
        ProductsCollection.count(searchStr, function (err, c) {
            recordsFiltered = c;
            // console.log(c);
            // console.log(req.body.start);
            // console.log(req.body.length);
            ProductsCollection.find(searchStr, 'itemName itemModel itemUnit manufacturerCompany companyCode countryCompany unit itemType usedIn weight totalWeight color packet perPacket remainedPacket remainedPerPacket totalQuantity status expireDate camePrice sellPriceMufrad sellPriceMahal sellPriceWasta sellPriceWakil sellPriceSharika totalPrice trailerNumber addedBy updatedBy', {
                'skip': Number(req.body.start),
                'limit': Number(req.body.length)
            }, function (err, results) {
                if (err) {
                    console.log('error while getting results' + err);
                    return;
                }

                var data = JSON.stringify({
                    "draw": req.body.draw,
                    "recordsFiltered": recordsFiltered,
                    "recordsTotal": recordsTotal,
                    "data": results
                });
                res.send(data);
            });

        });
    });







})

app.get('/import', async (req, res) => {
    fs.createReadStream("C:\\Users\\Ahmed\\Desktop\\Items.csv")
        .pipe(csv())
        .on('data', async function (row) {
            const newProduct = new ProductsCollection({
                itemName: row.itemName,
                itemCode: uuid.v1(),
                itemModel: row.itemModel,
                itemUnit: row.itemUnit,
                manufacturerCompany: row.manufacturerCompany,
                companyCode: row.companyCode,
                countryCompany: row.countryCompany,
                unit: row.unit,
                itemType: row.itemType,
                usedIn: row.usedIn,
                weight: parseInt(row.weight),
                totalWeight: parseInt(row.weight) * parseInt(row.perPacket),
                color: row.color,
                packet: row.packet,
                camePrice: row.camePrice,
                sellPriceMufrad: row.sellPriceMufrad,
                sellPriceMahal: row.sellPriceMahal,
                sellPriceWasta: row.sellPriceWasta,
                sellPriceWakil: row.sellPriceWakil,
                sellPriceSharika: row.sellPriceSharika,
                totalPrice: row.camePrice * parseInt(row.perPacket),
                perPacket: parseInt(row.perPacket),
                remainedPacket: row.remainedPacket,
                remainedPerPacket: parseInt(row.perPacket),
                totalQuantity: parseInt(row.perPacket),
                status: "New Product",
                expireDate: Date.now(),
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
                totalPrice: row.camePrice * parseInt(row.perPacket),
                perPacket: parseInt(row.perPacket),
                remainedPacket: row.remainedPacket,
                remainedPerPacket: parseInt(row.perPacket),
                totalQuantity: parseInt(row.perPacket),
                status: "New Product",
                expireDate: Date.now(),
                trailerNumber: 1,
                addedBy: "Ahmad Qadir",
                updatedBy: "Ahmad Qadir",
                note: ".",
                softdelete: "false",
                productID: newProduct['_id'],
            });
            await newItem.save();
            const newTrailer = new TrailerCollection({
                itemName: row.itemName,
                itemCode: uuid.v1(),
                itemModel: row.itemModel,
                itemUnit: row.itemUnit,
                manufacturerCompany: row.manufacturerCompany,
                companyCode: row.companyCode,
                countryCompany: row.countryCompany,
                unit: row.unit,
                itemType: row.itemType,
                usedIn: row.usedIn,
                weight: parseInt(row.weight),
                totalWeight: parseInt(row.weight) * parseInt(row.perPacket),
                color: row.color,
                packet: row.packet,
                camePrice: row.camePrice,
                sellPriceMufrad: row.sellPriceMufrad,
                sellPriceMahal: row.sellPriceMahal,
                sellPriceWasta: row.sellPriceWasta,
                sellPriceWakil: row.sellPriceWakil,
                sellPriceSharika: row.sellPriceSharika,
                totalPrice: row.camePrice * parseInt(row.perPacket),
                perPacket: parseInt(row.perPacket),
                remainedPacket: row.remainedPacket,
                remainedPerPacket: parseInt(row.perPacket),
                totalQuantity: parseInt(row.perPacket),
                status: "New Product",
                expireDate: Date.now(),
                trailerNumber: 1,
                addedBy: "Ahmad Qadir",
                updatedBy: "Ahmad Qadir",
                note: ".",
                softdelete: "false",
                productID: newProduct['_id'],
            });
            await newTrailer.save();
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
            } = await jwt.verify(accessToken, config.get("privateKey"));
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
        } = await jwt.verify(accessToken, config.get("privateKey"));
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
            totalPrice = totalPrice + element['sellPrice']*element['totalQuantity'];
        }
        Expenses = [totalPrice]
        //==============================================
        var totalPriceIncome = 0
        var Income = []
        for (let index = 0; index < TotalIncome.length; index++) {
            const element = TotalIncome[index];
            totalPriceIncome = totalPriceIncome + element['sellPrice']*element['totalQuantity'];
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
        // var _balance = Income * (parseInt(User['ratio']) / 100)
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
            mostwanted:_MostWanted,
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


//Error Handler
// process.on('uncaughtException', function (err) {
//     console.error((new Date).toUTCString() + ' uncaughtException:', err.message)
// });

//Main Listner
app.listen(process.env.PORT || 80).on('error', function (err) {
    console.log('Error Occured on error handler:' + err);
});