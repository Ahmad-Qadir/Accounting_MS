// ! Requirements
require('events').EventEmitter.defaultMaxListeners = Infinity
const {
    roles
} = require('../Middleware/roles');

// ! Collections
const TrailersCollection = require('../models/Trailers');
const RecordsCollection = require('../models/records');
const ProductsCollection = require('../models/Product');
const CompanyCollection = require('../models/Companies');

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
        const Trailers = await RecordsCollection
            .aggregate([
                {
                    $group: {
                        _id: { trailerNumber: "$trailerNumber", status: "$status" },
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
            totalPrice: parseFloat(req.body.camePrice) * parseFloat(req.body.totalQuantity),
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

        await RecordsCollection.deleteOne({
            _id: req.params.id
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


// TODO: Checked and Worked Properly
//Add New Trailer Operation
exports.AppendNewTrailer = async (req, res, next) => {
    try {
        var RequestList = req.body['tbody'];
        const Trailer = await TrailersCollection.find({
            status: "New Trailer",
        }).sort({
            "createdAt": -1
        });

        if (Trailer.length == 0)
            var _TrailerNumber = 1;
        else if (Trailer[0]['trailerNumber'] == 0)
            var _TrailerNumber = 1;
        else
            var _TrailerNumber = Trailer[0]['trailerNumber'] + 1;


        // console.log("ID: "+RequestList[0][0])                   
        // console.log("Product Model: "+RequestList[0][1])
        // console.log("Product Name: "+RequestList[0][2])
        // console.log("Product Color: "+RequestList[0][3])
        // console.log("Product Type: "+RequestList[0][4])
        // console.log("Weight: "+RequestList[0][5])
        // console.log("Wakil: "+RequestList[0][6])
        // console.log("Sharika: "+RequestList[0][7])
        // console.log("Mahal: "+RequestList[0][8])
        // console.log("Mufrad: "+RequestList[0][9])
        // console.log("Wasta: "+RequestList[0][10])
        // console.log("Quantity: "+RequestList[0][11])
        // console.log("Came Price: "+RequestList[0][12])
        // console.log("Sell Price: "+RequestList[0][13])
        // console.log("Total Price: "+RequestList[0][14])

        const CompanyName = await ProductsCollection.find({
            itemModel: RequestList[0][1],
            itemName: RequestList[0][2],
            color: RequestList[0][3],
            itemType: RequestList[0][4],
            weight: RequestList[0][5].split(" ")[0],
            itemUnit: RequestList[0][5].split(" ")[1]
        });

        const Companies = await CompanyCollection
            .find({
                companyName: CompanyName[0]['manufacturerCompany'],
            })


        for (let index = 0; index < RequestList.length; index++) {
            const element = RequestList[index];

            const Product = await ProductsCollection.find({
                itemModel: element[1],
                itemName: element[2],
                color: element[3],
                itemType: element[4],
                weight: element[5].split(" ")[0],
                itemUnit: element[5].split(" ")[1]
            });

            const newRecordtoHistory = new RecordsCollection({
                recordCode: _TrailerNumber,
                totalQuantity: parseFloat(element[11]),
                status: "New Trailer",
                moneyStatus: "Debut",
                oldDebut: Companies[0]['remainedbalance'],
                camePrice: parseFloat(element[12]),
                sellPrice: parseFloat(element[13]),
                totalPrice: parseFloat(element[12]) * parseFloat(element[11]),
                cost: parseFloat(req.params.cost),
                prepaid: parseFloat(req.params.pay),
                remainedMoney: parseFloat(req.params.total) - parseFloat(req.params.pay),
                sellPriceWakil: parseFloat(element[6]),
                sellPriceSharika: parseFloat(element[7]),
                sellPriceMahal: parseFloat(element[8]),
                sellPriceMufrad: parseFloat(element[9]),
                sellPriceWasta: parseFloat(element[10]),
                trailerNumber: _TrailerNumber,
                addedBy: req.user.username,
                updatedBy: req.user.username,
                productID: Product[0]['_id'],
                note: req.params.note,
            });
            await newRecordtoHistory.save();


            var quantity = Product[0]['totalQuantity'] + parseFloat(element[11]);

            // console.log(parseFloat(element[11]))
            // console.log("")
            await ProductsCollection.findByIdAndUpdate({
                "_id": Product[0]['_id']
            }, {
                totalQuantity: quantity,
                sellPriceWakil: parseFloat(element[6]),
                sellPriceSharika: parseFloat(element[7]),
                sellPriceMahal: parseFloat(element[8]),
                sellPriceMufrad: parseFloat(element[9]),
                sellPriceWasta: parseFloat(element[10]),
                updatedBy: req.user.username,
                $push: {
                    itemHistory: newRecordtoHistory["_id"],
                }
            });

            const newTrailer = new TrailersCollection({
                itemName: Product[0]['itemName'],
                itemModel: Product[0]['itemModel'],
                itemType: Product[0]['itemType'], //[boyax-adawat]
                itemUnit: Product[0]['itemUnit'],
                manufacturerCompany: Product[0]['manufacturerCompany'],
                companyCode: Product[0]['companyCode'],
                countryCompany: Product[0]['countryCompany'],
                unit: Product[0]['unit'],
                usedIn: Product[0]['usedIn'],
                color: Product[0]['color'],
                weight: Product[0]['weight'],
                camePrice: parseInt(element[12]),
                sellPrice: parseInt(element[13]),
                sellPriceWakil: parseFloat(element[6]),
                sellPriceSharika: parseFloat(element[7]),
                sellPriceMahal: parseFloat(element[8]),
                sellPriceMufrad: parseFloat(element[9]),
                sellPriceWasta: parseFloat(element[10]),
                totalQuantity: parseFloat(element[11]),
                status: "New Trailer",
                trailerNumber: _TrailerNumber,
                addedBy: req.user.username,
                updatedBy: req.user.username,
                productID: Product[0]['_id'],
                moneyStatus: "Debut",
            });
            await newTrailer.save();
            await TrailersCollection.findByIdAndUpdate({
                "_id": newTrailer['_id']
            }, {
                $push: {
                    invoiceID: newRecordtoHistory["_id"],
                }
            });
        }


        const totalMoney = Companies[0]['remainedbalance'] + parseFloat(req.params.total) - parseFloat(req.params.pay)

        await CompanyCollection
            .findOneAndUpdate({
                companyName: CompanyName[0]['manufacturerCompany'],
            }, {
                remainedbalance: totalMoney,
            })
        req.flash('success', "باری نوێ بە سەرکەوتوویی زیاد کرا");
        res.redirect("/NewTrailer")
    } catch (error) {
        next(error)
    }
}
