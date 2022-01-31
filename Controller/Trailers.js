// ! Requirements
require('events').EventEmitter.defaultMaxListeners = Infinity
const {
    roles
} = require('../Middleware/roles');

// ! Collections
const TrailersCollection = require('../models/Trailers');
const RecordsCollection = require('../models/records');

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
        // const Trailers = await TrailersCollection
        //     .aggregate([
        //         {
        //             $group:
        //             {
        //                 _id: { trailerNumber: "$trailerNumber" },
        //                 count: { $sum: 1 },
        //                 amount: { $sum: "$totalPrice" },
        //                 items: {
        //                     $push: { weight: "$weight", itemName: "$itemName",remainedPerPacket: "$remainedPerPacket", itemModel: "$itemModel", totalQuantity: "$totalQuantity", camePrice: "$camePrice", itemUnit: "$itemUnit", itemType: "$itemType", manufacturerCompany: "$manufacturerCompany", color: "$color", remainedPacket: "$remainedPacket", remainedPerPacket: "$remainedPerPacket", usedIn: "$usedIn", totalQuantity: "$totalQuantity", createdAt: "$createdAt", sellPrice: "$sellPrice" }
        //                 }
        //             }
        //         },
        //         {
        //             $sort: { "_id": -1 },
        //         }
        //     ])

        const Trailers = await RecordsCollection
            .aggregate([
                {
                    $group: {
                        _id: { trailerNumber: "$trailerNumber" },
                        amount: { $sum: "$totalPrice" },
                        count: { $sum: 1 },
                        items: {
                            $push: { productID: "$productID", createdAt: "$createdAt", totalQuantity: "$totalQuantity", status: "$status", camePrice: "$camePrice", totalPrice: "$totalPrice", addedBy: "$addedBy", sellPrice: "$sellPrice" },
                        },
                    },
                },
                {
                    $sort: { "_id": -1 },
                },
                {
                    $match: {
                        "items.status": "New Trailer",
                    }
                },
                {
                    $lookup: {
                        from: "items",
                        localField: "items.productID",
                        foreignField: "_id",
                        as: "data",
                    },
                },
            ]);

        // res.json(Trailers)
        // setTimeout(() => {
        res.render('Trailers/Trailers', { trailers: Trailers, title: "بارهەڵگرەکان" })
        // }, 1000);
    } catch (error) {
        next(error)
    }
}


//Print Selected Invoice
exports.PrintSelectedInvoice = async (req, res, next) => {
    try {
        const Records = await RecordsCollection
            .find({
                trailerNumber: req.params.trailerNumber,
            }).populate('productID')

        // res.json(Records)
        res.render('Trailers/PrintTrailer', {
            title: "باری ژمارە " + req.params.trailerNumber,
            records: Records,
            invoiceID: req.params.trailerNumber
        })
    } catch (error) {
        next(error)
    }
}
