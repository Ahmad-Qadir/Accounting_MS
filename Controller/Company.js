require('events').EventEmitter.defaultMaxListeners = Infinity
const validator = require("joi");
const config = require('config');


//Collections Section
const ProductsCollection = require('../Models/Product');
const CustomerTypeCollection = require('../Models/CustomerType');
const HistoryClass = require('../Models/records');
const ProfileCollection = require('../Models/Profiles');
const TrailerCollection = require('../Models/Trailers');
const CompanyCollection = require('../Models/Companies');
const address=process.env.address

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
            res.send(CompanyProducts)
        }, 500);

    } catch (error) {
        next(error)
    }
}

exports.AddNewCompany = async (req, res, next) => {
    try {
        const validationSchema = {
            companyName: validator.string().required(),
            note: validator.string()
        }
        const resultOfValidator = validator.validate(req.body, validationSchema);
        if (resultOfValidator.error) {
            req.flash('danger', resultOfValidator.error.details[0].message);
            res.redirect(process.env.address+"/Profiles/Customer/NewTypes")
        } else {
            const CompanyName = await CompanyCollection.findOne({
                companyName: req.body.companyName
            });
            if (CompanyCollection) {
                res.send("Customer Type is exist")
            } else {
                const NewCompany = new CompanyCollection({
                    companyName: req.body.companyName,
                    note: req.body.note
                });
                await NewCompany.save();
                res.send(NewCompany)
            }
        }
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
        .sort({
            "createdAt": -1
        })

    res.render("products/Products", {
        title: "بەرهەمەکان",
        product: Companies,
        user: req.user
    })
}