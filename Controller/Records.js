// ! Requirements
require('events').EventEmitter.defaultMaxListeners = Infinity
const {
    roles
} = require('../Middleware/roles');

// ! Collections
const RecordsCollection = require('../models/records');
const ProductsCollection = require('../models/Product');
const TrailersCollection = require('../models/Trailers');
const ProfileCollection = require('../models/Profiles');

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
exports.Records = async (req, res, next) => {
    try {
        const Records = await RecordsCollection.find({}).populate("productID").sort({
            "createdAt": -1
        }).limit(20);
        const TotalExpenses = await RecordsCollection.find({
            status: {
                $nin: ["Customer Request"]
            }
        }).populate("productID");
        const TotalIncome = await RecordsCollection.find({
            status: "Customer Request"
        }).populate("productID");

        var totalWeight = 0;
        var totalQuantity = 0
        var camePrice = 0
        var sellPrice = 0
        var totalPrice = 0
        var Expenses = []
        for (let index = 0; index < TotalExpenses.length; index++) {
            const element = TotalExpenses[index];
            totalWeight = totalWeight + element['totalWeight'];
            totalQuantity = totalQuantity + element['totalQuantity'];
            camePrice = camePrice + element['camePrice'];
            sellPrice = sellPrice + element['sellPriceMufrad'];
            totalPrice = totalPrice + element['totalPrice'];
        }
        Expenses = [totalWeight, totalQuantity, camePrice, sellPrice, totalPrice]
        //==============================================
        var totalWeightIncome = 0;
        var totalQuantityIncome = 0
        var camePriceIncome = 0
        var sellPriceIncome = 0
        var totalPriceIncome = 0
        var Income = []
        for (let index = 0; index < TotalIncome.length; index++) {
            const element = TotalIncome[index];
            totalWeightIncome = totalWeightIncome + element['totalWeight'];
            totalQuantityIncome = totalQuantityIncome + element['totalQuantity'];
            camePriceIncome = camePriceIncome + element['camePrice'];
            sellPriceIncome = sellPriceIncome + element['sellPriceMufrad'];
            totalPriceIncome = totalPriceIncome + element['totalPrice'];
        }
        Income = [totalWeightIncome, totalQuantityIncome, camePriceIncome, sellPriceIncome, totalPriceIncome]

        // res.send(Records[0]['productID']['itemName'])
        res.render('Records/Records', {
            title: "تۆمارەکان",
            records: Records,
            expenses: Expenses,
            Income: Income,
            user: req.user
        })
    } catch (error) {
        next(error)
    }
}

//Get Spedicif Invoice
exports.SearchForSpecificInvoice = async (req, res, next) => {
    const Records = await RecordsCollection
        .find({
            recordCode: req.params.invoiceID,

        }).populate('productID');
    for (let index = 0; index < Records.length; index++) {
        const element = Records[index];
        if (element['productID']['itemName'] == req.params.productName)
            res.send(element)
    }
    // const Recovered=Records[0]['htmlObject'];
    // const ProfileInformation = await RecordsCollection
    //     .find({
    //         recordCode: req.params.invoiceID,
    //     }).populate('cutomerID');
    // res.send(Records)

    // console.log(Recovered);

}

//Get Spedicif Invoice
exports.ShowSelectedDateOfInvoices = async (req, res, next) => {
    res.render('Records/Print', { title: "چاپکردنی تۆمارەکان" })
}

//Get Spedicif Invoice
exports.ShowSelectedDateOfInvoicesOperation = async (req, res, next) => {
    const Records = await RecordsCollection.find({
        createdAt: {
            $gte: req.body.startDate,
            $lt: req.body.endDate
        },
    }).populate("productID").sort({
        "createdAt": -1
    });

    res.send(Records)
}


//Print Selected Invoice
exports.EditProductInInvoice = async (req, res, next) => {
    try {

        const Record = await RecordsCollection.find({
            recordCode: req.params.recordcode,
            status: "Customer Request",
            // productID: req.params.productid
        });

        res.send(Record)

        // res.json(Product)
        // res.render('Trailers/EditProduct', {
        //     title: "دەسکاری کردنی باری ژمارە " + req.params.trailerNumber + " و بەرهەمی " + Product[0]['productID']['itemModel'],
        //     product: Product,
        // })
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


        await RecordsCollection.dele({
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
exports.DeletIteminInvoice = async (req, res, next) => {
    try {

        const Record = await RecordsCollection.find({
            recordCode: req.params.recordcode,
            status: "Customer Request",
            productID: req.params.productid
        });

        // res.send(Record)

        const Trailer = await TrailersCollection.find({
            trailerNumber: Record[0]['trailerNumber'],
            productID: req.params.productid
        });

        const Product = await ProductsCollection.find({
            productID: req.params.productid
        });

        const returnedPackets = Record[0]['totalQuantity'] + Product[0]['totalQuantity'];
        const returnedPacketsForTrailer = Record[0]['totalQuantity'] + Trailer[0]['totalQuantity']

        await ProductsCollection.findByIdAndUpdate({
            _id: req.params.productid
        }, {
            totalQuantity: returnedPackets
        });


        await TrailersCollection.findByIdAndUpdate({
            "_id": Trailer[0]['_id']
        }, {
            totalQuantity: returnedPacketsForTrailer
        });

        setTimeout(async () => {
            await RecordsCollection.deleteOne({
                _id: Record[0]['_id'],
            })
        }, 1000);

        req.flash('success', "بەرهەمەکە بە سەرکەوتوویی ڕەشکرایەوە");
        res.redirect("/Profiles")

    } catch (error) {
        next(error)
    }
}


//Update Products Operation
exports.DeleteSelectedInvoice = async (req, res, next) => {
    try {

        const Record = await RecordsCollection.find({
            recordCode: req.params.recordcode,
            status: "Customer Request",
        });

        var Profile = await ProfileCollection.findOne({
            _id: Record[0]['cutomerID']
        });

        for (let index = 0; index < Record.length; index++) {
            const element = Record[index];

            if (element['moneyStatus'] == "Paid") {
                const Product = await ProductsCollection.findOne({
                    _id: element['productID']
                });

                const Trailer = await TrailersCollection.findOne({
                    trailerNumber: element['trailerNumber'],
                    productID: element['productID']
                });

                const returnedPackets = element['totalQuantity'] + Product['totalQuantity'];
                await ProductsCollection.findByIdAndUpdate({
                    _id: element['productID']
                }, {
                    totalQuantity: returnedPackets
                });

                const returnedPacketsForTrailer = element['totalQuantity'] + Trailer['totalQuantity']
                await TrailersCollection.findByIdAndUpdate({
                    "_id": Trailer['_id']
                }, {
                    totalQuantity: returnedPacketsForTrailer
                });


                setTimeout(async () => {
                    await RecordsCollection.deleteMany({
                        recordCode: req.params.recordcode,
                        status: "Customer Request",
                    })
                }, 1000);
            } else {
                const Product = await ProductsCollection.findOne({
                    _id: element['productID']
                });

                const Trailer = await TrailersCollection.findOne({
                    trailerNumber: element['trailerNumber'],
                    productID: element['productID']
                });

                const returnedPackets = element['totalQuantity'] + Product['totalQuantity'];
                await ProductsCollection.findByIdAndUpdate({
                    _id: element['productID']
                }, {
                    totalQuantity: returnedPackets
                });

                const returnedPacketsForTrailer = element['totalQuantity'] + Trailer['totalQuantity']
                await TrailersCollection.findByIdAndUpdate({
                    "_id": Trailer['_id']
                }, {
                    totalQuantity: returnedPacketsForTrailer
                });

                await ProfileCollection.findByIdAndUpdate({
                    _id: req.params.id
                }, {
                    remainedbalance: Profile['remainedbalance'] + parseFloat(element['totalPrice']),
                });

                setTimeout(async () => {
                    await RecordsCollection.deleteMany({
                        recordCode: req.params.recordcode,
                        status: "Customer Request",
                    })
                }, 1000);
            }
        }

        req.flash('success', "تۆمارەکە بە سەرکەوتوویی ڕەشکرایەوە");
        res.redirect("/Profiles")

    } catch (error) {
        next(error)
    }
}