// ! Requirements
require('events').EventEmitter.defaultMaxListeners = Infinity
const validator = require("joi");
const config = require('config');
var uuid = require('uuid');
const {
    roles
} = require('../Middleware/roles');

// ! Collections
const ProductsCollection = require('../models/Product');
const RecordsCollection = require('../models/records');
const ProfileCollection = require('../models/Profiles');
const TrailerCollection = require('../models/Trailers');
const EmployeeClass = require('../models/Employee');
const CompanyCollection = require('../models/Companies');
const ItemUnitCollection = require('../models/ItemUnit');
const DailyCollection = require('../models/Daily_Task');

const address = process.env.address

//Authorization
exports.grantAccess = function (action, resource) {
    return async (req, res, next) => {
        try {
            const permission = roles.can(req.user.role)[action](resource);
            if (!permission.granted) {
                return res.render('Components/404')
                // return res.status(401).json({
                //     error: "You don't have enough permission to perform this action"
                // });
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
            return res.render('./Components/NotPermited')

        // return res.status(401).json({
        //     error: "You need to be logged in to access this route"
        // });
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
}

// TODO: Checked and Worked Properly
//Add New Product UI
exports.GetAllMyIncome = async (req, res, next) => {
    try {
        const Invoices = await RecordsCollection.find({}).populate('productID').sort({ 'createdAt': 1, "manufacturerCompany": 1 });


        const Daily = await DailyCollection.aggregate(
            [
                {
                    $group: {
                        _id: { moneyType: "$moneyType" },
                        amount: { $sum: "$money" },
                    },

                },
            ]);

        const ReturnedMoney = await RecordsCollection.aggregate(
            [
                {
                    $group: {
                        _id: { Compenstate: "$Compenstate" },
                        amount: { $sum: "$sellPrice" },
                    },

                },
            ]);

        const TotalExpenses = await RecordsCollection.aggregate(
            [
                {
                    $group: {
                        _id: null,
                        amount: { $sum: "$totalPrice" },
                        items: {
                            $push: { oldDebut: "$oldDebut", discount: "$discount", prepaid: "$prepaid", recordCode: '$recordCode', softdelete: "$softdelete", trailerNumber: "$trailerNumber", productID: "$productID", cutomerID: "$cutomerID", createdAt: "$createdAt", moneyStatus: "$moneyStatus", status: "$status", totalPrice: "$totalPrice", totalQuantity: "$totalQuantity", addedBy: "$addedBy", sellPrice: "$sellPrice" },
                        },
                    },

                },
                {
                    $match: {
                        "items.status": "New Trailer",
                    },
                }
            ]);

        const Debtors = await ProfileCollection.aggregate(
            [
                {
                    $group: {
                        _id: null,
                        amount: { $sum: "$remainedbalance" },
                    },

                },
                // {
                //     $match: {
                //         softdelete: false,
                //         remainedbalance: { $ne: 0 },
                //     },
                // }
            ]);

        res.render('Dashboard/Incomes.pug', {
            title: "تۆمارەکان",
            records: Invoices,
            daily: Daily,
            returnedmoney: ReturnedMoney,
            debtors: Debtors,
            expoenses:TotalExpenses
        })

    } catch (error) {
        next(error)
    }
}




