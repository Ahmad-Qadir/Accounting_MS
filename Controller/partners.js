// ! Requirements
require('events').EventEmitter.defaultMaxListeners = Infinity
const {
    roles
} = require('../Middleware/roles');


var uuid = require('uuid');


// ! Collections
const PartnersCollection = require('../models/Partners');
const RecordsCollection = require('../models/records');
const DailyCollection = require('./Daily_Work');

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

// !: AddNewPartner
exports.AddNewPartner = async (req, res, next) => {
    try {
        const newPartner = new PartnersCollection({
            username: req.body.username,
            balance: req.body.balance,
            history: req.body.history,
            rate: req.body.rate,
            addedBy: req.user.username,
            updatedBy: req.user.username,
        });
        await newPartner.save();
        res.send(newPartner)
    } catch (error) {
        next(error)
    }
}

exports.GetPartners = async (req, res, next) => {
    try {
        const Partners = await PartnersCollection.find({
            softdelete: false
        })
        const TotalIncome = await RecordsCollection.find({ status: "Customer Request" });
        const Requests = await RecordsCollection.find({ status: "Partner Request" });

        const TotalExpense = await RecordsCollection.find({ status: { $ne: "Recovered" } });

        var Income = 0
        for (let index = 0; index < TotalIncome.length; index++) {
            const element = TotalIncome[index];
            Income = Income + element['totalPrice'];
        }

        var Expense = 0
        for (let index = 0; index < TotalExpense.length; index++) {
            const element = TotalExpense[index];
            Expense = Expense + element['totalPrice'];
        }

        for (let index = 0; index < Partners.length; index++) {
            const element = Partners[index];
            await PartnersCollection.findByIdAndUpdate({
                _id: Partners[index]['_id']
            }, {
                balance: Income * (parseInt(element['rate']) / 100),
            });
        }

        for (let index = 0; index < Requests.length; index++) {
            const element = Requests[index];
            const Partner = await PartnersCollection.find({
                softdelete: false,
                _id: element['cutomerID']
            })
            await PartnersCollection.findByIdAndUpdate({
                _id: element['cutomerID']
            }, {
                balance: Partner[0]['balance'] - element['sellPrice'],
            });
        }

        res.render('Partner/Partners', { title: "پشکدارەکان", partners: Partners, income: Income ,expense:Expense})
    } catch (error) {
        next(error)
    }
}


exports.AddNewRequestForPartner = async (req, res, next) => {
    try {
        const Partners = await PartnersCollection.find({
            softdelete: false
        })
        res.render('Partner/NewRequest', { title: "پشکدارەکان", partners: Partners })
    } catch (error) {
        next(error)
    }
}

exports.AddNewRequestForPartnerOperation = async (req, res, next) => {
    try {
        //===============Records Collection=============
        const newRecordtoHistory = new RecordsCollection({
            recordCode: uuid.v1(),
            status: "Partner Request",
            sellPrice: req.body.price,
            addedBy: req.user.username,
            updatedBy: req.user.username,
            cutomerID: req.body.partnerId,
            note: req.body.note,
        });
        await newRecordtoHistory.save();

        await PartnersCollection.findByIdAndUpdate({
            "_id": req.body.partnerId
        }, {
            $push: {
                history: newRecordtoHistory["_id"],
            }
        });

        req.flash('success', "داواکاریەکە بە سەرکەوتوویی جێبەجێ کرا");
        res.redirect("/Partners")
    } catch (error) {
        next(error)
    }
}

