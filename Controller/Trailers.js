// ! Requirements
require('events').EventEmitter.defaultMaxListeners = Infinity
const {
    roles
} = require('../Middleware/roles');

// ! Collections
const TrailersCollection = require('../models/Trailers');

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

// !: Trailers
exports.Trailers = async (req, res, next) => {
    try {
        const Trailers = await TrailersCollection
            .aggregate([
                {
                    $group:
                    {
                        _id: { trailerNumber: "$trailerNumber" },
                        count: { $sum: 1 },
                        amount: { $sum: "$totalPrice" },
                        items: {
                            $push: { weight: "$weight", itemName: "$itemName", itemModel: "$itemModel", totalQuantity: "$totalQuantity", camePrice: "$camePrice", itemUnit: "$itemUnit", itemType: "$itemType", manufacturerCompany: "$manufacturerCompany", color: "$color", remainedPacket: "$remainedPacket", remainedPerPacket: "$remainedPerPacket", usedIn: "$usedIn", totalQuantity: "$totalQuantity", createdAt: "$createdAt" }
                        }
                    }
                },
                {
                    $sort: { "_id": -1 },
                }
            ])

        // res.json(Trailers)
        // setTimeout(() => {
        res.render('Trailers/Trailers', { trailers: Trailers, title: "بارهەڵگرەکان" })
        // }, 1000);
    } catch (error) {
        next(error)
    }
}
