require('events').EventEmitter.defaultMaxListeners = Infinity
const validator = require("joi");
const config = require('config');


//Collections Section
const ProductsCollection = require('../models/Product');
const CustomerTypeCollection = require('../models/CustomerType');
const HistoryClass = require('../models/records');
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