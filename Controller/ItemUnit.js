// ! Requirements
require('events').EventEmitter.defaultMaxListeners = Infinity
const {
    roles
} = require('../Middleware/roles');

// ! Collections
const ItemUnitCollection = require('../models/ItemUnit');

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
exports.AddNewItemUnit = async (req, res, next) => {
    try {
        const newItemUnit = new ItemUnitCollection({
            unitName: req.body.unitName,
            addedBy: req.user.username,
            updatedBy: req.user.username,
        });
        await newItemUnit.save();
        res.send(newItemUnit)
    } catch (error) {
        next(error)
    }
}

exports.GetItemUnit = async (req, res, next) => {
    try {
        const ItemUnit = await ItemUnitCollection.find({
            softdelete: false
        })
        res.send(ItemUnit)
    } catch (error) {
        next(error)
    }
}

