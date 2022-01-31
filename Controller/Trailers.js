// ! Requirements
require('events').EventEmitter.defaultMaxListeners = Infinity
const {
    roles
} = require('../Middleware/roles');

// ! Collections
const TrailersCollection = require('../models/Trailers');
const RecordsCollection = require('../models/records');
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
                            $push: { _id: "$_id", productID: "$productID", createdAt: "$createdAt", totalQuantity: "$totalQuantity", status: "$status", camePrice: "$camePrice", totalPrice: "$totalPrice", addedBy: "$addedBy", sellPrice: "$sellPrice" },
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

//Print Selected Invoice
exports.EditProductInTrailer = async (req, res, next) => {
    try {


        const Product = await RecordsCollection
            .find({
                trailerNumber: req.params.trailerNumber,
                _id: req.params.id
            }).populate('productID')

        // res.json(Product)
        res.render('Trailers/EditProduct', {
            title: "دەسکاری کردنی باری ژمارە " + req.params.trailerNumber + " و بەرهەمی " + Product[0]['productID']['itemModel'],
            product: Product,
        })
    } catch (error) {
        next(error)
    }
}
//Update Products Operation
exports.UpdateChangesinEditOfTrailer = async (req, res, next) => {
    try {

        const Record = await RecordsCollection.find({
            _id: req.params.id
        });

        const Product = await ProductsCollection.find({
            _id: Record[0]['productID']
        });


        await RecordsCollection.findByIdAndUpdate({
            _id: req.params.id
        }, {
            totalQuantity: req.body.totalQuantity,
            camePrice: req.body.camePrice,
            sellPriceMufrad: req.body.sellPriceMufrad,
            sellPriceMahal: req.body.sellPriceMahal,
            sellPriceWasta: req.body.sellPriceWasta,
            sellPriceWakil: req.body.sellPriceWakil,
            sellPriceSharika: req.body.sellPriceSharika,
            updatedBy: req.user.username,
        });



        await TrailersCollection.findOneAndUpdate({
            trailerNumber: Record[0]['trailerNumber'],
            productID: Record[0]['productID']
        }, {
            totalQuantity: req.body.totalQuantity,
            camePrice: req.body.camePrice,
            sellPriceMufrad: req.body.sellPriceMufrad,
            sellPriceMahal: req.body.sellPriceMahal,
            sellPriceWasta: req.body.sellPriceWasta,
            sellPriceWakil: req.body.sellPriceWakil,
            sellPriceSharika: req.body.sellPriceSharika,
            updatedBy: req.user.username,
            totalPrice: parseFloat(req.body.sellPriceMufrad) * parseFloat(req.body.totalQuantity)
        });




        await ProductsCollection.findOneAndUpdate({
            _id: Record[0]['productID']
        }, {
            totalQuantity: parseFloat(Product[0]['totalQuantity']) + parseFloat(req.body.totalQuantity),
            updatedBy: req.user.username,
        });


        res.send(Trailer)
        // req.flash('success', "بەرهەمەکە بە سەرکەوتوویی نوێکرایەوە");
        // res.redirect("/Trailers")
    } catch (error) {
        next(error)
    }
}


//Update Products Operation
exports.DeleteTrailer = async (req, res, next) => {
    try {

        const Record = await RecordsCollection.find({
            _id: req.params.id
        });

        const Product = await ProductsCollection.find({
            _id: Record[0]['productID']
        });


        await RecordsCollection.findByIdAndUpdate({
            _id: req.params.id
        }, {
            totalQuantity: req.body.totalQuantity,
            camePrice: req.body.camePrice,
            sellPriceMufrad: req.body.sellPriceMufrad,
            sellPriceMahal: req.body.sellPriceMahal,
            sellPriceWasta: req.body.sellPriceWasta,
            sellPriceWakil: req.body.sellPriceWakil,
            sellPriceSharika: req.body.sellPriceSharika,
            updatedBy: req.user.username,
        });



        await TrailersCollection.findOneAndUpdate({
            trailerNumber: Record[0]['trailerNumber'],
            productID: Record[0]['productID']
        }, {
            totalQuantity: req.body.totalQuantity,
            camePrice: req.body.camePrice,
            sellPriceMufrad: req.body.sellPriceMufrad,
            sellPriceMahal: req.body.sellPriceMahal,
            sellPriceWasta: req.body.sellPriceWasta,
            sellPriceWakil: req.body.sellPriceWakil,
            sellPriceSharika: req.body.sellPriceSharika,
            updatedBy: req.user.username,
            totalPrice: parseFloat(req.body.sellPriceMufrad) * parseFloat(req.body.totalQuantity)
        });




        await ProductsCollection.findOneAndUpdate({
            _id: Record[0]['productID']
        }, {
            totalQuantity: parseFloat(Product[0]['totalQuantity']) + parseFloat(req.body.totalQuantity),
            updatedBy: req.user.username,
        });


        res.send(Trailer)
        // req.flash('success', "بەرهەمەکە بە سەرکەوتوویی نوێکرایەوە");
        // res.redirect("/Trailers")
    } catch (error) {
        next(error)
    }
}


