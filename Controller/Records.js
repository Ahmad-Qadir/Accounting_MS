// ! Requirements
require('events').EventEmitter.defaultMaxListeners = Infinity
const {
    roles
} = require('../Middleware/roles');

// ! Collections
const RecordsCollection = require('../models/dasd');
const ProductsCollection = require('../models/Product');

// !: Basic Configuration
//Authorization
exports.grantAccess = function (action, resource) {
    return async (req, res, next) => {
        try {
            const permission = roles.can(req.user.role)[action](resource);
            if (!permission.granted) {
                return res.status(401).json({
                    error: "You don't have enough permission to perform this action"
                });
            }
            next()
        } catch (error) {
            next(error)
        }
    }
}

//Authentication
exports.allowIfLoggedin = async (req, res, next) => {
    try {
        const user = res.locals.loggedInUser;
        if (!user)
            return res.status(401).json({
                error: "You need to be logged in to access this route"
            });
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
}

// !: Records
exports.Records = async (req, res, next) => {
    try {
        const Records = await RecordsCollection.find({}).populate("productID").sort({
            "createdAt": -1
        }).limit(50);
        const TotalExpenses = await RecordsCollection.find({
            status: {
                $nin: ["Customer Request"]
            }
        }).populate("productID");
        const TotalIncome = await RecordsCollection.find({
            status: "Customer Request"
        }).populate("productID");

        var totalWeight = 0;
        var totalQuantity = 0
        var camePrice = 0
        var sellPrice = 0
        var totalPrice = 0
        var Expenses = []
        for (let index = 0; index < TotalExpenses.length; index++) {
            const element = TotalExpenses[index];
            totalWeight = totalWeight + element['totalWeight'];
            totalQuantity = totalQuantity + element['totalQuantity'];
            camePrice = camePrice + element['camePrice'];
            sellPrice = sellPrice + element['sellPriceMufrad'];
            totalPrice = totalPrice + element['totalPrice'];
        }
        Expenses = [totalWeight, totalQuantity, camePrice, sellPrice, totalPrice]
        //==============================================
        var totalWeightIncome = 0;
        var totalQuantityIncome = 0
        var camePriceIncome = 0
        var sellPriceIncome = 0
        var totalPriceIncome = 0
        var Income = []
        for (let index = 0; index < TotalIncome.length; index++) {
            const element = TotalIncome[index];
            totalWeightIncome = totalWeightIncome + element['totalWeight'];
            totalQuantityIncome = totalQuantityIncome + element['totalQuantity'];
            camePriceIncome = camePriceIncome + element['camePrice'];
            sellPriceIncome = sellPriceIncome + element['sellPriceMufrad'];
            totalPriceIncome = totalPriceIncome + element['totalPrice'];
        }
        Income = [totalWeightIncome, totalQuantityIncome, camePriceIncome, sellPriceIncome, totalPriceIncome]

        // res.send(Records[0]['productID']['itemName'])
        res.render('Records/Records', {
            title: "تۆمارەکان",
            records: Records,
            expenses: Expenses,
            Income: Income,
            user: req.user
        })
    } catch (error) {
        next(error)
    }
}

//Get Spedicif Invoice
exports.SearchForSpecificInvoice = async (req, res, next) => {
    const Records = await RecordsCollection
        .find({
            recordCode: req.params.invoiceID,

        }).populate('productID');
    for (let index = 0; index < Records.length; index++) {
        const element = Records[index];
        if (element['productID']['itemName'] == req.params.productName)
            res.send(element)
    }
    // const Recovered=Records[0]['htmlObject'];
    // const ProfileInformation = await RecordsCollection
    //     .find({
    //         recordCode: req.params.invoiceID,
    //     }).populate('cutomerID');
    // res.send(Records)

    // console.log(Recovered);

}

//Get Spedicif Invoice
exports.ShowSelectedDateOfInvoices = async (req, res, next) => {
    res.render('Records/Print', { title: "چاپکردنی تۆمارەکان" })
}


//Get Spedicif Invoice
exports.ShowSelectedDateOfInvoicesOperation = async (req, res, next) => {
    const Records = await RecordsCollection.find({
        createdAt: {
            $gte: req.body.startDate,
            $lt: req.body.endDate
        },
    }).populate("productID").sort({
        "createdAt": -1
    });

    res.send(Records)
}

