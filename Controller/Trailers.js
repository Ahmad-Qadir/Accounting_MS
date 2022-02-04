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
                            $push: { _id: "$_id", cost: "$cost", softdelete: "$softdelete", productID: "$productID", createdAt: "$createdAt", totalQuantity: "$totalQuantity", status: "$status", camePrice: "$camePrice", totalPrice: "$totalPrice", addedBy: "$addedBy", sellPrice: "$sellPrice" },
                        },
                    },
                },
                {
                    $sort: { "_id": -1 },
                },
                {
                    $match: {
                        "items.status": "New Trailer",
                        "items.softdelete": "false"
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

        // const Product = await ProductsCollection.find({
        //     _id: Record[0]['productID']
        // });


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
            totalPrice:parseFloat(req.body.camePrice) * parseFloat(req.body.totalQuantity),
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
            totalPrice: parseFloat(req.body.camePrice) * parseFloat(req.body.totalQuantity)
        });


        const Product = await ProductsCollection.find({
            _id: Record[0]['productID']
        });

        if (parseFloat(req.body.totalQuantity) > Record[0]['totalQuantity']) {
            const temp = parseFloat(req.body.totalQuantity) - Record[0]['totalQuantity'];
            await ProductsCollection.findOneAndUpdate({
                _id: Record[0]['productID']
            }, {
                camePrice: req.body.camePrice,
                sellPriceMufrad: req.body.sellPriceMufrad,
                sellPriceMahal: req.body.sellPriceMahal,
                sellPriceWasta: req.body.sellPriceWasta,
                sellPriceWakil: req.body.sellPriceWakil,
                sellPriceSharika: req.body.sellPriceSharika,
                totalQuantity: parseFloat(Product[0]['totalQuantity']) + temp,
                updatedBy: req.user.username,
            });

            const NewProduct = await ProductsCollection.find({
                _id: Record[0]['productID']
            });

            await ProductsCollection.findByIdAndUpdate({
                "_id": Product[0]['_id']
            }, {
                remainedPacket: parseFloat(NewProduct[0]['totalQuantity'] / Product[0]['perPacket']),
                remainedPerPacket: NewProduct[0]['totalQuantity'] % Product[0]['perPacket'],
                // totalPrice: NewProduct[0]['totalQuantity'] * NewProduct['sellPrice'],
                // totalWeight: Product[0]['totalWeight'] + NewProduct[0]['totalQuantity'],
            });


        } else if (parseFloat(req.body.totalQuantity) == Record[0]['totalQuantity']) {

            await ProductsCollection.findOneAndUpdate({
                _id: Record[0]['productID']
            }, {
                camePrice: req.body.camePrice,
                sellPriceMufrad: req.body.sellPriceMufrad,
                sellPriceMahal: req.body.sellPriceMahal,
                sellPriceWasta: req.body.sellPriceWasta,
                sellPriceWakil: req.body.sellPriceWakil,
                sellPriceSharika: req.body.sellPriceSharika,
                updatedBy: req.user.username,
            });
        }

        else {
            const temp = Record[0]['totalQuantity'] - parseFloat(req.body.totalQuantity);
            await ProductsCollection.findOneAndUpdate({
                _id: Record[0]['productID']
            }, {
                camePrice: req.body.camePrice,
                sellPriceMufrad: req.body.sellPriceMufrad,
                sellPriceMahal: req.body.sellPriceMahal,
                sellPriceWasta: req.body.sellPriceWasta,
                sellPriceWakil: req.body.sellPriceWakil,
                sellPriceSharika: req.body.sellPriceSharika,
                totalQuantity: parseFloat(Product[0]['totalQuantity']) - temp,
                updatedBy: req.user.username,
            });

            const NewProduct = await ProductsCollection.find({
                _id: Record[0]['productID']
            });

            await ProductsCollection.findByIdAndUpdate({
                _id: Product[0]['_id']
            }, {
                remainedPacket: parseFloat(NewProduct[0]['totalQuantity'] / Product[0]['perPacket']),
                remainedPerPacket: NewProduct[0]['totalQuantity'] % Product[0]['perPacket'],
                // totalPrice: Product[0]['totalPrice'] + NewProduct[0]['totalQuantity'],
                // totalWeight: Product[0]['totalWeight'] + NewProduct[0]['totalQuantity'],
            });

        }

        // res.send(Trailer)
        req.flash('success', "بەرهەمەکە بە سەرکەوتوویی نوێکرایەوە");
        res.redirect("/Trailers")
    } catch (error) {
        next(error)
    }
}

//Update Products Operation
exports.DeleteItemInTrailer = async (req, res, next) => {
    try {
        const Record = await RecordsCollection.find({
            _id: req.params.id
        });

        // await RecordsCollection.findByIdAndUpdate({
        //     _id: req.params.id
        // }, {
        //     totalQuantity: req.body.totalQuantity,
        //     camePrice: req.body.camePrice,
        //     sellPriceMufrad: req.body.sellPriceMufrad,
        //     sellPriceMahal: req.body.sellPriceMahal,
        //     sellPriceWasta: req.body.sellPriceWasta,
        //     sellPriceWakil: req.body.sellPriceWakil,
        //     sellPriceSharika: req.body.sellPriceSharika,
        //     updatedBy: req.user.username,
        // });

        await RecordsCollection.findOneAndUpdate({
            _id: req.params.id
        }, {
            softdelete: true
        });

        await TrailersCollection.deleteOne({
            trailerNumber: req.params.trailerNumber,
            productID: Record[0]['productID']
        });


        const Product = await ProductsCollection.find({
            _id: Record[0]['productID']
        });

        await ProductsCollection.findOneAndUpdate({
            _id: Record[0]['productID']
        }, {
            totalQuantity: parseFloat(Product[0]['totalQuantity']) - Record[0]['totalQuantity'],
            updatedBy: req.user.username,
        });

        const NewProduct = await ProductsCollection.find({
            _id: Record[0]['productID']
        });

        await ProductsCollection.findByIdAndUpdate({
            "_id": Product[0]['_id']
        }, {
            remainedPacket: parseFloat(NewProduct[0]['totalQuantity'] / Product[0]['perPacket']),
            remainedPerPacket: NewProduct[0]['totalQuantity'] % Product[0]['perPacket'],
        });

        req.flash('success', "بەرهەمەکە بە سەرکەوتوویی ڕەشکرایەوە");
        res.redirect("/Trailers")

    } catch (error) {
        next(error)
    }
}

// ! not finished
//Update Products Operation 
exports.DeleteTrailer = async (req, res, next) => {
    try {

        const Record = await RecordsCollection.find({
            trailerNumber: req.params.trailerNumber,
            status: "New Trailer"
        });

        // const Product = await ProductsCollection.find({
        //     _id: Record[0]['productID']
        // });

        await RecordsCollection.findByIdAndUpdate({
            trailerNumber: req.params.trailerNumber,
            status: "New Trailer"
        }, {
            softdelete: true,
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








        // await ProductsCollection.findOneAndUpdate({
        //     _id: Record[0]['productID']
        // }, {
        //     totalQuantity: parseFloat(Product[0]['totalQuantity']) + parseFloat(req.body.totalQuantity),
        //     updatedBy: req.user.username,
        // });


        res.send(Record)
        // req.flash('success', "بەرهەمەکە بە سەرکەوتوویی نوێکرایەوە");
        // res.redirect("/Trailers")
    } catch (error) {
        next(error)
    }
}
