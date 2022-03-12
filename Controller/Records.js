// ! Requirements
require('events').EventEmitter.defaultMaxListeners = Infinity
const {
    roles
} = require('../Middleware/roles');
var mongoose = require('mongoose');

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
// TODO: Checked and Worked Properly
exports.Records = async (req, res, next) => {
    try {
        // const Records = await RecordsCollection.find({}).populate("productID").sort({
        //     "createdAt": -1
        // }).limit(20);

        // const Profiles = await RecordsCollection.find({}).populate("cutomerID").sort({
        //     "createdAt": -1
        // }).limit(20);

        const Invoices = await RecordsCollection.aggregate(
            [
                {
                    $group: {
                        _id: { recordCode: '$recordCode', status: "$status" },
                        amount: { $sum: "$totalPrice" },
                        count: { $sum: 1 },
                        items: {
                            $push: { discount: "$discount", prepaid: "$prepaid", oldDebut: "$oldDebut", personName: "$personName", note: "$note", softdelete: "$softdelete", trailerNumber: "$trailerNumber", productID: "$productID", cutomerID: "$cutomerID", createdAt: "$createdAt", moneyStatus: "$moneyStatus", status: "$status", totalPrice: "$totalPrice", totalQuantity: "$totalQuantity", addedBy: "$addedBy", sellPrice: "$sellPrice" },
                        },
                    },

                },
                {
                    $sort: { "items.createdAt": -1 },
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
                    $lookup: {
                        from: "profiles",
                        localField: "items.cutomerID",
                        foreignField: "_id",
                        as: "profile",
                    },
                },
            ]);

        // res.send(Invoices)
        res.render('Records/Records', {
            title: "تۆمارەکان",
            records: Invoices,
            user: req.user,
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
        // createdAt: {
        //     $gte: req.body.startDate,
        //     $lt: req.body.endDate
        // },
        status: req.body.status
    }).populate("productID").sort({
        "createdAt": -1
    });

    const Profiles = await RecordsCollection.find({
        // createdAt: {
        //     $gte: req.body.startDate,
        //     $lt: req.body.endDate
        // },
        status: req.body.status
    }).populate("cutomerID").sort({
        "createdAt": -1
    });


    res.render('Records/SelectableRecord', {
        title: "تۆماری کارەکانی " + req.body.startDate + " تاکو " + req.body.endDate,
        records: Records,
        profiles: Profiles
    })
}

// TODO: Checked and Worked Properly
//Print Selected Invoice
exports.EditProductInInvoice = async (req, res, next) => {
    try {

        const Record = await RecordsCollection.find({
            recordCode: req.params.recordcode,
            status: "Customer Request",
            productID: req.params.productid
        });

        const Product = await ProductsCollection.find({
            _id: Record[0]['productID']
        });

        res.render('Records/Editinvoice', {
            title: "دەسکاری کردنی باری ژمارە " + req.params.trailerNumber + " و بەرهەمی " + Product[0]['itemModel'],
            product: Product,
            record: Record
        })
    } catch (error) {
        next(error)
    }
}


//Print Selected Invoice
exports.ChangeStatusOfInvoice = async (req, res, next) => {
    try {

        // const Record = await RecordsCollection.findOne({
        //     recordCode: req.params.recordcode,
        //     status: "Customer Request",
        //     moneyStatus: "Debut",
        //     cutomerID: req.params.customerID
        // });

        const Invoices = await RecordsCollection.aggregate(
            [
                {
                    $group: {
                        _id: { recordCode: '$recordCode', status: "$status" },
                        amount: { $sum: "$totalPrice" },
                        count: { $sum: 1 },
                        items: {
                            $push: { cutomerID: "$cutomerID", totalPrice: "$totalPrice", recordCode: "$recordCode", status: "$status", moneyStatus: "$moneyStatus" },
                        },
                    },

                },
                {
                    $match: {
                        "items.recordCode": req.params.recordcode,
                        "items.status": "Customer Request",
                        "items.moneyStatus": "Debut",
                        "items.cutomerID": mongoose.Types.ObjectId(req.params.customerID)
                    },
                },
            ]);


        // res.send(Invoices)


        const Record = await RecordsCollection.findOne({
            status: "Invoice Payment",
        }).distinct("recordCode");

        var numberArray = Record.map(Number);

        numberArray.sort(function (a, b) {
            return a - b;
        });

        var invoiceID = parseFloat((numberArray[numberArray.length - 1])) + 1;

        if (isNaN(invoiceID))
            invoiceID = 1;



        var Profile = await ProfileCollection.findOne({
            _id: req.params.customerID
        });



        const newRecordtoHistory = new RecordsCollection({
            recordCode: invoiceID,
            status: "Invoice Payment",
            sellPrice: Invoices[0]['amount'],
            totalPrice: Invoices[0]['amount'],
            totalQuantity: 0,
            oldDebut: Profile['remainedbalance'],
            addedBy: req.user.username,
            updatedBy: req.user.username,
            note: Invoices[0]['_id']['recordCode'],
            cutomerID: req.params.customerID,
        });
        await newRecordtoHistory.save();

        await ProfileCollection.findByIdAndUpdate({
            _id: req.params.customerID
        }, {
            remainedbalance: Profile['remainedbalance'] - parseFloat(Invoices[0]['amount']),
            $push: {
                invoiceID: newRecordtoHistory["_id"],
            }
        });

        req.flash('success', "پارەدانەکە بە سەرکەوتوویی تۆمارکرا");
        res.redirect("/Profiles/"+req.params.customerID+"/Invoices")
    } catch (error) {
        next(error)
    }
}

// TODO: Checked and Worked Properly
//Update Products Operation
exports.UpdateChangesinEditOfTrailer = async (req, res, next) => {
    try {

        const Record = await RecordsCollection.findOne({
            _id: req.params.id
        });

        const Product = await ProductsCollection.findOne({
            _id: Record['productID']
        });

        // const Trailer = await TrailersCollection.findOne({
        //     trailerNumber: Record['trailerNumber'],
        //     productID: Record['productID']
        // });


        const Profile = await ProfileCollection.findOne({
            _id: Record['cutomerID']
        });

        const NumberOfPackets = Math.abs(parseFloat(Record['totalQuantity']) - parseFloat(req.body.totalQuantity));
        var totalPrice = parseFloat(NumberOfPackets) * parseFloat(req.body.sellPrice);

        // console.log(NumberOfPackets)
        if (parseFloat(req.body.totalQuantity) > Record['totalQuantity']) {
            await RecordsCollection.findOneAndUpdate({
                _id: req.params.id
            }, {
                sellPrice: req.body.sellPrice,
                totalQuantity: parseFloat(req.body.totalQuantity),
                totalPrice: req.body.detail,
                updatedBy: req.user.username,
            });

            await ProductsCollection.findByIdAndUpdate({
                _id: Record['productID']
            }, {
                totalQuantity: Product['totalQuantity'] - NumberOfPackets
            });

            // await TrailersCollection.findByIdAndUpdate({
            //     "_id": Trailer['_id']
            // }, {
            //     totalQuantity: Trailer['totalQuantity'] - NumberOfPackets
            // });



            if (Record['moneyStatus'] == "Debut") {
                await ProfileCollection.findByIdAndUpdate({
                    _id: Record['cutomerID']
                }, {
                    remainedbalance: Profile['remainedbalance'] + totalPrice,
                });
            }

        } else if (parseFloat(req.body.totalQuantity) == Record['totalQuantity']) {

            await RecordsCollection.findOneAndUpdate({
                _id: req.params.id
            }, {
                sellPrice: req.body.sellPrice,
                totalPrice: req.body.detail,
                updatedBy: req.user.username,
            });


            if (Record['moneyStatus'] == "Debut") {
                await ProfileCollection.findByIdAndUpdate({
                    _id: Record['cutomerID']
                }, {
                    remainedbalance: Profile['remainedbalance'] - parseFloat(Record['totalPrice']) + parseFloat(req.body.detail),
                });
            }

        } else {
            await RecordsCollection.findOneAndUpdate({
                _id: req.params.id
            }, {
                sellPrice: req.body.sellPrice,
                totalQuantity: parseFloat(req.body.totalQuantity),
                totalPrice: req.body.detail,
                updatedBy: req.user.username,
            });

            await ProductsCollection.findByIdAndUpdate({
                _id: Record['productID']
            }, {
                totalQuantity: Product['totalQuantity'] + NumberOfPackets
            });

            // await TrailersCollection.findByIdAndUpdate({
            //     "_id": Trailer['_id']
            // }, {
            //     totalQuantity: Trailer['totalQuantity'] + NumberOfPackets
            // });

            if (Record['moneyStatus'] == "Debut") {
                await ProfileCollection.findByIdAndUpdate({
                    _id: Record['cutomerID']
                }, {
                    remainedbalance: Profile['remainedbalance'] - totalPrice,
                });
            }
        }

        req.flash('success', "تۆمارەکە بە سەرکەوتوویی نوێکرایەوە");
        res.redirect("/Profiles")
    } catch (error) {
        next(error)
    }
}

// TODO: Checked and Worked Properly
//Update Products Operation
exports.DeletIteminInvoice = async (req, res, next) => {
    try {

        const Record = await RecordsCollection.findOne({
            recordCode: req.params.recordcode,
            status: "Customer Request",
            productID: req.params.productid
        });

        const Product = await ProductsCollection.findOne({
            _id: Record['productID']
        });

        // const Trailer = await TrailersCollection.findOne({
        //     trailerNumber: Record['trailerNumber'],
        //     productID: Record['productID']
        // });

        const Profile = await ProfileCollection.findOne({
            _id: Record['cutomerID']
        });


        await RecordsCollection.deleteOne({
            _id: Record['_id'],
        })

        await ProductsCollection.findByIdAndUpdate({
            _id: Record['productID']
        }, {
            totalQuantity: Product['totalQuantity'] + Record['totalQuantity']
        });

        // await TrailersCollection.findByIdAndUpdate({
        //     "_id": Trailer['_id']
        // }, {
        //     totalQuantity: Trailer['totalQuantity'] + Record['totalQuantity']
        // });

        if (Record['moneyStatus'] == "Debut") {
            await ProfileCollection.findByIdAndUpdate({
                _id: Record['cutomerID']
            }, {
                remainedbalance: Profile['remainedbalance'] - parseFloat(Record['totalPrice']),
            });
        }

        req.flash('success', "بەرهەمەکە بە سەرکەوتوویی ڕەشکرایەوە");
        res.redirect("/Profiles")

    } catch (error) {
        next(error)
    }
}

// TODO: Checked and Worked Properly
//Update Products Operation
exports.DeleteSelectedInvoice = async (req, res, next) => {
    try {

        const Record = await RecordsCollection.find({
            recordCode: req.params.recordcode,
            status: req.params.status,
            cutomerID: req.params.id
        });

        const totalPrice = await RecordsCollection.aggregate([
            {
                $match: {
                    recordCode: req.params.recordcode,
                    cutomerID: mongoose.Types.ObjectId(req.params.id),
                    status: req.params.status
                },
            },
            { $group: { _id: null, amount: { $sum: "$totalPrice" } } }
        ])

        // console.log()


        var Profile = await ProfileCollection.findOne({
            _id: Record[0]['cutomerID']
        });

        for (let index = 0; index < Record.length; index++) {
            const element = Record[index];

            const Product = await ProductsCollection.findOne({
                _id: element['productID']
            });

            // const Trailer = await TrailersCollection.findOne({
            //     trailerNumber: element['trailerNumber'],
            //     productID: element['productID']
            // });

            const returnedPackets = element['totalQuantity'] + Product['totalQuantity'];
            await ProductsCollection.findByIdAndUpdate({
                _id: element['productID']
            }, {
                totalQuantity: returnedPackets
            });

            // const returnedPacketsForTrailer = element['totalQuantity'] + Trailer['totalQuantity']
            // await TrailersCollection.findByIdAndUpdate({
            //     "_id": Trailer['_id']
            // }, {
            //     totalQuantity: returnedPacketsForTrailer
            // });


            setTimeout(async () => {
                await RecordsCollection.deleteMany({
                    recordCode: req.params.recordcode,
                    status: "Customer Request",
                })
            }, 1000);
        }

        if (Record[0]['moneyStatus'] == "Debut") {
            await ProfileCollection.findByIdAndUpdate({
                _id: Record[0]['cutomerID']
            }, {
                remainedbalance: Profile['remainedbalance'] - parseFloat(totalPrice[0]['amount']),
            });
        }


        req.flash('success', "تۆمارەکە بە سەرکەوتوویی ڕەشکرایەوە");
        res.redirect("/Profiles")

    } catch (error) {
        next(error)
    }
}

// TODO: Checked and Worked Properly
//Update Products Operation
exports.DeleteSelectedInvoiceForRecovers = async (req, res, next) => {
    try {

        const Record = await RecordsCollection.find({
            recordCode: req.params.recordcode,
            status: req.params.status,
            cutomerID: req.params.id
        });

        const totalPrice = await RecordsCollection.aggregate([
            {
                $match: {
                    recordCode: req.params.recordcode,
                    cutomerID: mongoose.Types.ObjectId(req.params.id),
                    status: req.params.status
                },
            },
            { $group: { _id: null, amount: { $sum: "$totalPrice" } } }
        ])


        var Profile = await ProfileCollection.findOne({
            _id: Record[0]['cutomerID']
        });


        for (let index = 0; index < Record.length; index++) {
            const element = Record[index];

            const Product = await ProductsCollection.findOne({
                _id: element['productID']
            });

            // const Trailer = await TrailersCollection.findOne({
            //     trailerNumber: element['trailerNumber'],
            //     productID: element['productID']
            // });

            const returnedPackets = Product['totalQuantity'] - element['totalQuantity'];
            await ProductsCollection.findByIdAndUpdate({
                _id: element['productID']
            }, {
                totalQuantity: returnedPackets
            });

            // const returnedPacketsForTrailer = element['totalQuantity'] + Trailer['totalQuantity']
            // await TrailersCollection.findByIdAndUpdate({
            //     "_id": Trailer['_id']
            // }, {
            //     totalQuantity: returnedPacketsForTrailer
            // });

            setTimeout(async () => {
                await RecordsCollection.deleteMany({
                    recordCode: req.params.recordcode,
                    status: "Recovered",
                })
            }, 1000);
        }

        await ProfileCollection.findByIdAndUpdate({
            _id: Record[0]['cutomerID']
        }, {
            remainedbalance: Profile['remainedbalance'] - parseFloat(totalPrice[0]['amount']),
        });


        req.flash('success', "تۆمارەکە بە سەرکەوتوویی ڕەشکرایەوە");
        res.redirect("/Profiles")

    } catch (error) {
        next(error)
    }
}

// TODO: Checked and Worked Properly
//Update Products Operation
exports.AddNewItemToInvoiceUI = async (req, res, next) => {
    try {

        const Records = await RecordsCollection.find({
            recordCode: req.params.recordCode,
            cutomerID: req.params.id,
            status: "Customer Request",
        });

        const Products = await ProductsCollection
            .find({
                id: req.params.id,
            })

        const ProductNames = await ProductsCollection
            .find({
                id: req.params.id,
            }).distinct('itemModel')


        const Profiles = await ProfileCollection
            .find({
                _id: req.params.id,
                // softdelete: false,
            })

        res.render('Profiles/NewItemToInvoice', {
            title: "دەسکاری کردنی تۆماری ژمارە " + req.params.recordCode,
            record: Records,
            profile: Profiles,
            productNames: ProductNames,
            products: Products,
            time: Date(),
            user: req.user,
        });


    } catch (error) {
        next(error)
    }
}

// TODO: Checked and Worked Properly
//Update Products Operation
exports.AddNewItemToInvoice = async (req, res, next) => {
    try {

        const Record = await RecordsCollection.findOne({
            _id: req.params.recordCode,
            status: "Customer Request",
            cutomerID: req.params.id
        });


        var Profile = await ProfileCollection.findOne({
            _id: req.params.id
        });

        var totalPrice = 0;

        var RequestList = req.body[0];


        for (let index = 0; index < RequestList.length; index++) {
            const element = RequestList[index];

            const Product = await ProductsCollection.findOne({
                itemModel: element[1],
                itemName: element[2],
                itemType: element[3],
                color: element[4],
                weight: parseFloat(element[5].split(" ")[0]),
                itemUnit: element[5].split(" ")[1]
            });

            var totalRequestedPackets = element[6];
            var _SellPrice = parseFloat(element[7].replace("$", ''));

            //===============Records Collection=============
            const newRecordtoHistory = new RecordsCollection({
                recordCode: Record['recordCode'],
                totalQuantity: totalRequestedPackets,
                status: "Customer Request",
                sellPrice: _SellPrice,
                totalPrice: _SellPrice * totalRequestedPackets,
                oldDebut: Record['oldDebut'],
                addedBy: req.user.username,
                updatedBy: req.user.username,
                productID: Product['_id'],
                cutomerID: req.params.id,
                htmlObject: req.body['tbody'],
                moneyStatus: Record['moneyStatus'],
            });
            await newRecordtoHistory.save();

            var result = Product['totalQuantity'] - totalRequestedPackets;

            await ProductsCollection.findByIdAndUpdate({
                _id: Product['_id']
            }, {
                totalQuantity: result,
                updatedBy: req.user.username,
                $push: {
                    itemHistory: newRecordtoHistory["_id"],
                }
            });


            await ProfileCollection.findByIdAndUpdate({
                _id: req.params.id
            }, {
                updatedBy: req.user.username,
                $push: {
                    invoiceID: newRecordtoHistory["_id"],
                }
            });
            totalPrice += _SellPrice * totalRequestedPackets

        }

        setTimeout(async () => {
            await ProfileCollection.findByIdAndUpdate({
                _id: req.params.id
            }, {
                remainedbalance: Profile['remainedbalance'] + totalPrice,
            });
        }, 3000);

        res.send("بە سەرکەوتوویی تۆمارکرا");

    } catch (error) {
        next(error)
    }
}