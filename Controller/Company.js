require('events').EventEmitter.defaultMaxListeners = Infinity
const validator = require("joi");
const config = require('config');
var mongoose = require('mongoose');


//Collections Section
const ProductsCollection = require('../models/Product');
const CustomerTypeCollection = require('../models/CustomerType');
const RecordsCollection = require('../models/records');
const ProfileCollection = require('../models/Profiles');
const TrailerCollection = require('../models/Trailers');
const CompanyCollection = require('../models/Companies');
const address = process.env.address

const {
    roles
} = require('../Middleware/roles');

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

exports.CheckForCompanyProducts = async (req, res, next) => {
    try {
        setTimeout(async () => {
            const CompanyProducts = await ProductsCollection
                .find({
                    manufacturerCompany: req.params.companyName,
                    softdelete: false
                })
            console.log(CompanyProducts)
            res.send(CompanyProducts)
        }, 500);

    } catch (error) {
        next(error)
    }
}

exports.AddNewCompanyUI = async (req, res, next) => {
    try {
        res.render("Company/AddNew", {
            title: "زیادکردنی کۆمپانیای نوێ",
        })
    } catch (error) {
        next(error)
    }
}

exports.AddNewCompany = async (req, res, next) => {
    try {
        const NewCompany = new CompanyCollection({
            companyName: req.body.companyName,
            phoneNumber: req.body.phoneNumber,
            location: req.body.location,
        });
        await NewCompany.save();
        req.flash('success', "بە سەرکەوتوویی تۆمارکرا");
        res.redirect("/Companies")
    } catch (error) {
        next(error)
    }
}

//Get All Products
exports.GetAllCompanies = async (req, res, next) => {
    const Companies = await CompanyCollection
        .find({
            softdelete: false,
        })

    res.render("Company/Companies", {
        title: "كۆمپانیاکان",
        companies: Companies,
        user: req.user
    })
}

//Get Invoice for Specific Customer
exports.GetAllInvoiceInList = async (req, res, next) => {
    const Invoices = await RecordsCollection.aggregate(
        [
            {
                $group: {
                    _id: { trailerNumber: '$trailerNumber', status: "$status" },
                    amount: { $sum: "$totalPrice" },
                    items: {
                        $push: { remainedMoney: "$remainedMoney", status: "$status", remainedMoney: "$remainedMoney", paidMoney: "$paidMoney", oldDebut: "$oldDebut", discount: "$discount", prepaid: "$prepaid", recordCode: '$recordCode', softdelete: "$softdelete", trailerNumber: "$trailerNumber", productID: "$productID", cutomerID: "$cutomerID", createdAt: "$createdAt", moneyStatus: "$moneyStatus", status: "$status", totalPrice: "$totalPrice", totalQuantity: "$totalQuantity", note: "$note", addedBy: "$addedBy", sellPrice: "$sellPrice" },
                    },
                },

            },
            {
                $sort: { "items.trailerNumber": 1 },
            },
            {
                $lookup: {
                    from: "items",
                    localField: "items.productID",
                    foreignField: "_id",
                    as: "data",
                },
            },
            {
                $match: {
                    "data.manufacturerCompany": req.params.companyName,
                    "items.status": "New Trailer"
                }
            },
        ]);

    const Company = await CompanyCollection
        .find({
            companyName: req.params.companyName
        })

    // res.send(Invoices)
    res.render("Company/ListOfDebut", {
        title: "تۆماری " + Company[0]['companyName'],
        invoices: Invoices,
        company: Company,
        // address: address,
        // recovered: _RecoveredInvoices
    })

}


exports.UpdateCompanyUI = async (req, res, next) => {
    try {
        const Companies = await CompanyCollection
            .findOne({
                _id: req.params.id
            })

        res.render("Company/Update", {
            title: "نوێ کردنەوەی زانیاریەکانی " + Companies['companyName'],
            company: Companies
        })
    } catch (error) {
        next(error)
    }
}

exports.UpdateCompany = async (req, res, next) => {
    try {
        await CompanyCollection
            .findByIdAndUpdate({
                _id: req.params.id
            }, {
                companyName: req.body.companyName,
                phoneNumber: req.body.phoneNumber,
                location: req.body.location,
                remainedbalance: req.body.remainedbalance
            })

        req.flash('success', "زانیاریەکان بە سەرکەوتوویی نوێکرانەوە");
        res.redirect("/Companies")
    } catch (error) {
        next(error)
    }
}



// ! User Invoices
//Get Invoice for Specific Company
exports.GetAllInvoiceForCompany = async (req, res, next) => {
    const Invoices = await TrailerCollection.aggregate(
        [
            {
                $group: {
                    _id: { trailerNumber: '$trailerNumber' },
                    amount: { $sum: { $multiply: ["$camePrice", "$totalQuantity"] } },
                    count: { $sum: 1 },
                    items: {
                        $push: {createdAt:"$createdAt",itemModel:"$itemModel", color: "$color", itemType: "$itemType", itemUnit: "$itemUnit", itemName: "$itemName", totalQuantity: "$totalQuantity", camePrice: "$camePrice", manufacturerCompany: "$manufacturerCompany", trailerNumber: '$trailerNumber', itemName: "$itemName" },
                    },
                },

            },
            {
                $sort: { "items.trailerNumber": -1 },
            },
            {
                $match: {
                    "items.manufacturerCompany": req.params.manufacturerCompany,
                }
            },
            // {
            //     $lookup: {
            //         from: "items",
            //         localField: "items.productID",
            //         foreignField: "_id",
            //         as: "data",
            //     },
            // },
        ]);

    const Profile = await CompanyCollection
        .find({
            companyName: req.params.manufacturerCompany
        })

    if (Invoices == "") {
        req.flash('danger', "کۆمپانیای داواکراو هیج تۆماڕێکی نیە");
        res.redirect("/Companies")
    } else {
        res.render("Company/Invoices", {
            title: "تۆماری " + Invoices[0]['items'][0]['manufacturerCompany'],
            invoices: Invoices,
            profile: Profile,
            // address: address,
            // recovered: _RecoveredInvoices
        })
    }
    // res.send(Invoices)
}