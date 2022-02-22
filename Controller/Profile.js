require('events').EventEmitter.defaultMaxListeners = Infinity
const validator = require("joi");
const config = require('config');
var mongoose = require('mongoose');


//Collections Section
const ProductsCollection = require('../models/Product');
const CustomerTypeCollection = require('../models/CustomerType');
const RecordsCollection = require('../models/records');
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

// ! User Information
//Add New Customer
exports.addNewCustomer = async (req, res, next) => {
    try {
        const Account = await ProfileCollection.findOne({
            clientName: req.body.clientName
        });
        if (Account) {
            res.send("کڕیاری ناوبراو هەیە")
        } else {
            const newUser = new ProfileCollection({
                clientName: req.body.clientName,
                phoneNumber: req.body.phoneNumber,
                secondPhoneNumber: req.body.secondPhoneNumber,
                companyName: req.body.companyName,
                clientType: req.body.clientType,
                borrowedBalance: 0,
                recoveredBalance: 0,
                remainedbalance: 0,
                addedBy: req.user.username,
                updatedBy: req.user.username,
                note: "req.body.note"
            });
            await newUser.save();
            res.redirect('/Profiles')
        }
    } catch (error) {
        res.send(error)
    }
}

//Create New Profile UI
exports.CreateNewProfile = async (req, res, next) => {
    const CustomerType = await CustomerTypeCollection
        .find({
            softdelete: false
        })
    res.render("Profiles/AddProfile", {
        title: "زیادکردنی كڕیاری نوێ",
        types: CustomerType
    })
}

//Get All Customers
exports.GetAllCustomers = async (req, res, next) => {
    const Profiles = await ProfileCollection
        .find({})

    res.render("Profiles/Profiles", {
        title: "کڕیارەکان",
        profiles: Profiles
    })
}

//Get All Customers
exports.EditCustomerUI = async (req, res, next) => {
    const Profiles = await ProfileCollection
        .findOne({ _id: req.params.id })
    const CustomerType = await CustomerTypeCollection
        .find({
            softdelete: false
        })
    res.render("Profiles/EditProfile", {
        title: "نوێکردنەوەی زانیاریەکانی " + Profiles['clientName'],
        profiles: Profiles,
        types: CustomerType
    })
}

//Get All Customers
exports.PayMoneyUI = async (req, res, next) => {
    const Profiles = await ProfileCollection
        .findOne({ _id: req.params.id })

    res.render("Profiles/PayMoney", {
        title: "نوێکردنەوەی زانیاریەکانی " + Profiles['clientName'],
        profiles: Profiles,
    })
}

//Get All Customers
exports.PayMoney = async (req, res, next) => {

    const Record = await RecordsCollection.findOne({
        status: "Compensate",
        softdelete: false
    }).distinct("recordCode");

    var numberArray = Record.map(Number);

    numberArray.sort(function (a, b) {
        return a - b;
    });

    var invoiceID = parseFloat((numberArray[numberArray.length - 1])) + 1;

    if (isNaN(invoiceID))
        invoiceID = 1;

    var Profile = await ProfileCollection.find({
        _id: req.params.id
    });


    const newRecordtoHistory = new RecordsCollection({
        recordCode: invoiceID,
        status: "Compensate",
        sellPrice: req.body.paid,
        totalPrice: req.body.paid,
        prepaid: req.body.prepaid,
        discount: req.body.discount,
        totalQuantity: 0,
        oldDebut: Profile[0]['remainedbalance'],
        addedBy: req.user.username,
        updatedBy: req.user.username,
        note: req.body.note,
        cutomerID: req.params.id,
        moneyStatus: "Return Money"
    });
    await newRecordtoHistory.save();

    await ProfileCollection.findByIdAndUpdate({
        _id: req.params.id
    }, {
        remainedbalance: req.body.finalbalance,
        updatedBy: req.user.username,
        $push: {
            invoiceID: newRecordtoHistory["_id"],
        }
    });

    req.flash('success', "پارەدان بە سەرکەوتوویی تۆمارکرا");
    res.redirect("/Profiles")
}

//Get All Customers
exports.UpdateProfileChanges = async (req, res, next) => {

    await ProfileCollection.findByIdAndUpdate({
        _id: req.params.id
    }, {
        clientName: req.body.clientName,
        phoneNumber: req.body.phoneNumber,
        companyName: req.body.companyName,
        clientType: req.body.clientType,
        remainedbalance: req.body.remainedbalance,
        updatedBy: req.user.username,
    });


    req.flash('success', "زانیاریەکان بە سەرکەوتوویی نوێ کرانەوە");
    res.redirect("/Profiles")

}


// ! User Invoices
//Get Invoice for Specific Customer
exports.GetAllInvoiceForCustomers = async (req, res, next) => {
    const Invoices = await RecordsCollection.aggregate(
        [
            {
                $group: {
                    _id: { recordCode: '$recordCode', status: "$status" },
                    amount: { $sum: "$totalPrice" },
                    items: {
                        $push: { recordCode: '$recordCode',softdelete: "$softdelete", trailerNumber: "$trailerNumber", productID: "$productID", cutomerID: "$cutomerID", createdAt: "$createdAt", moneyStatus: "$moneyStatus", status: "$status", totalPrice: "$totalPrice", totalQuantity: "$totalQuantity", addedBy: "$addedBy", sellPrice: "$sellPrice" },
                    },
                },

            },
            {
                $sort: { "_id": -1 },
            },
            {
                $match: {
                    "items.cutomerID": mongoose.Types.ObjectId(req.params.id)
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

    const Profile = await RecordsCollection
        .find({
            cutomerID: req.params.id
        })
        .sort({
            "createdAt": -1
        }).populate('cutomerID')

    if (Invoices == "") {
        req.flash('danger', "کڕیاری داواکراو هیج تۆماڕێکی نیە");
        res.redirect("/Profiles")
    } else {
        res.render("Profiles/Invoices", {
            title: "تۆماری " + Profile[0]['cutomerID']['clientName'],
            invoices: Invoices,
            profile: Profile,
            address: address,
            // recovered: _RecoveredInvoices
        })
    }
    // res.send(Invoices)

}

//Get Debut Invoice for Specific Customer
exports.GetAllDebutInvoiceForCustomers = async (req, res, next) => {
    const Invoices = await RecordsCollection
        .aggregate([
            {
                $group: {
                    _id: { recordCode: "$recordCode" },
                    amount: { $sum: "$totalPrice" },
                    count: { $sum: 1 },
                    items: {
                        $push: { trailerNumber: "$trailerNumber", productID: "$productID", cutomerID: "$cutomerID", createdAt: "$createdAt", moneyStatus: "$moneyStatus", status: "$status", totalPrice: "$totalPrice", addedBy: "$addedBy", sellPrice: "$sellPrice" },
                    },
                },
            },
            {
                $sort: { "_id": -1 },
            },
            {
                $match: {
                    "items.cutomerID": mongoose.Types.ObjectId(req.params.id),
                    "moneyStatus": "Debut"
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

    const Profile = await RecordsCollection
        .find({
            cutomerID: req.params.id
        })
        .sort({
            "createdAt": -1
        }).populate('cutomerID')

    if (Invoices == "") {
        req.flash('danger', "کڕیاری داواکراو هیج تۆماڕێکی نیە");
        res.redirect("/Profiles/Debtors")
    } else {
        res.render("Profiles/Invoices", {
            title: "تۆمارەکان",
            invoices: Invoices,
            profile: Profile,
            address: address
        })
    }
    // res.send(Invoices)

}




//Get Invoice for Specific Customer
exports.PrintAllInvoiceforCustomer = async (req, res, next) => {
    const Invoices = await RecordsCollection.aggregate(
        [
            {
                $group: {
                    _id: { recordCode: '$recordCode', status: "$status" },
                    amount: { $sum: "$totalPrice" },
                    items: {
                        $push: { oldDebut: "$oldDebut", softdelete: "$softdelete", trailerNumber: "$trailerNumber", productID: "$productID", cutomerID: "$cutomerID", createdAt: "$createdAt", moneyStatus: "$moneyStatus", status: "$status", totalPrice: "$totalPrice", totalQuantity: "$totalQuantity", addedBy: "$addedBy", sellPrice: "$sellPrice" },
                    },
                },

            },
            {
                $sort: { "_id": -1 },
            },
            {
                $match: {
                    "items.cutomerID": mongoose.Types.ObjectId(req.params.id)
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

    const Profile = await ProfileCollection
        .findOne({
            _id: req.params.id
        });
    if (Invoices == "") {
        req.flash('danger', "کڕیاری داواکراو هیج تۆماڕێکی نیە");
        res.redirect("/Profiles")
    } else {
        res.render("Profiles/PrintAllInvoices", {
            title: "تۆماری " + Profile['clientName'],
            invoices: Invoices,
            profile: Profile,
            address: address,
            // recovered: _RecoveredInvoices
        })
    }
    // res.render('Profiles/PrintInvoice', {
    //     title: "تۆمارەکانی " + ProfileInformation['clientName'],
    //     records: Records,
    //     profile: ProfileInformation
    // })
    // res.send(Invoices)

}

//Add New Invoice For Customer UI
exports.AddNewRequest = async (req, res, next) => {
    try {

        // const Records = await RecordsCollection.findOne({
        //     status: "Customer Request",
        //     softdelete: false
        // }).sort({
        //     "createdAt": -1,
        //     "updatedAt": -1
        // });

        const Record = await RecordsCollection.findOne({
            status: "Customer Request",
            softdelete: false
        }).distinct("recordCode");

        var numberArray = Record.map(Number);

        numberArray.sort(function (a, b) {
            return a - b;
        });

        var invoiceID = parseFloat((numberArray[numberArray.length - 1])) + 1;

        if (isNaN(invoiceID))
            invoiceID = 1;

        const Products = await ProductsCollection
            .find({
                id: req.params.id,
                softdelete: false
            })

        const ProductNames = await ProductsCollection
            .find({
                id: req.params.id,
                softdelete: false
            }).distinct('itemModel')

        const Profiles = await ProfileCollection
            .find({
                _id: req.params.id,
                // softdelete: false,
            })
        const Trailers = await TrailerCollection
            .find({
                softdelete: false,
                productID: req.params.id,
            })
        const Company = await CompanyCollection
            .find({
                softdelete: false,
            })

        res.render('Profiles/AddNewRequest', {
            title: " فرۆشتن بۆ بەڕێز " + Profiles[0]['clientName'],
            profile: Profiles,
            productNames: ProductNames,
            products: Products,
            trailers: Trailers,
            invoiceID: invoiceID,
            company: Company,
            time: Date(),
            user: req.user,
            address: address
        })
    } catch (error) {
        next(error)
    }
}


//Add New Invoice For Customer UI
exports.debtors = async (req, res, next) => {
    try {

        const Profiles = await ProfileCollection
            .find({
                remainedbalance: { "$ne": 0 }
            }).sort({
                remainedbalance: -1
            })

        res.render('Debtors/debtors', {
            title: "لیستی قەرزدارەکان",
            profile: Profiles,
            address: address
        })
    } catch (error) {
        next(error)
    }
}

//Add New Invoice For Customer Operation
// exports.AddNewInvoiceForCustomer = async (req, res, next) => {
//     // const Product = await ProductsCollection.find({
//     //     _id: req.params.id
//     // });
//     try {
//         const validationSchema = {
//             sellPrice: validator.number().required(),
//             perPacket: validator.number().required(),
//             trailerNumber: validator.number().required(),
//             cutomerID: validator.string().required(),
//             note: validator.string().required(),
//             recordCode: validator.string()
//         }
//         const resultOfValidator = validator.validate(req.body, validationSchema);
//         if (resultOfValidator.error) {
//             req.flash('danger', resultOfValidator.error.details[0].message);
//             res.redirect(process.env.address + Product[0]['_id'] + '/NewRequest')
//             // res.status(400).send({
//             //     message: resultOfValidator.error.details[0].message
//             // });
//         } else {
//             var totalRequestedPackets = req.body.perPacket;
//             const Trailer = await TrailerCollection.find({
//                 itemName: Product[0]['itemName'],
//                 itemModel: Product[0]['itemModel'],
//                 color: Product[0]['color'],
//                 itemType: Product[0]['itemType'],
//                 weight: Product[0]['weight'],
//                 itemUnit: Product[0]['itemUnit'],
//                 trailerNumber: req.body.trailerNumber
//             });

//             //Prevent 
//             if (Trailer[0]['totalQuantity'] < req.body.perPacket) {
//                 req.flash('danger', "There is no enough Product in Store there is only " + Trailer[0]['totalQuantity'] + " remains in this Trailer");
//                 res.redirect(process.env.address + Product[0]['_id'] + '/NewRequest')
//             } else {
//                 //===============Records Collection=============
//                 const newRecordtoHistory = new RecordsCollection({
//                     recordCode: uuid.v1(),
//                     weight: Product[0]['weight'],
//                     totalWeight: Product[0]['weight'] * totalRequestedPackets,
//                     totalQuantity: totalRequestedPackets,
//                     status: "Customer Request",
//                     color: Product[0]['color'],
//                     camePrice: Trailer[0]['camePrice'],
//                     sellPrice: req.body.sellPrice,
//                     totalPrice: req.body.sellPrice * totalRequestedPackets,
//                     expireDate: Product[0]['expireDate'],
//                     trailerNumber: req.body.trailerNumber,
//                     addedBy: req.user.username,
//                     updatedBy: req.user.username,
//                     note: req.body.note,
//                     cutomerID: req.body.cutomerID,
//                     trailerID: Trailer[0]['_id'],
//                     productID: Product[0]['_id'],
//                 });
//                 await newRecordtoHistory.save();
//                 var result = Product[0]['totalQuantity'] - totalRequestedPackets;
//                 await ProductsCollection.findByIdAndUpdate({
//                     _id: req.params.id
//                 }, {
//                     remainedPacket: parseInt(result / Product[0]['perPacket']),
//                     remainedPerPacket: result % Product[0]['perPacket'],
//                     totalQuantity: result,
//                     updatedBy: req.user.username,
//                     totalPrice: Product[0]['totalPrice'] - (totalRequestedPackets * Product[0]['sellPrice']),
//                     totalWeight: Product[0]['totalWeight'] - (totalRequestedPackets * Product[0]['weight']),
//                     $push: {
//                         itemHistory: newRecordtoHistory["_id"],
//                     }
//                 });
//                 await ProfileCollection.findByIdAndUpdate({
//                     _id: req.body.cutomerID
//                 }, {
//                     borrowedBalance: Product[0]['sellPrice'],
//                     recoveredBalance: req.body.sellPrice,
//                     // remainedbalance: Product[0]['remainedbalance'] - req.body.recoveredBalance,
//                     updatedBy: req.user.username,
//                     $push: {
//                         invoiceID: newRecordtoHistory["_id"],
//                     }
//                 });



//                 var numbeOfPacketsinTrailer = Trailer[0]['totalQuantity'] - totalRequestedPackets;
//                 await TrailerCollection.findByIdAndUpdate({
//                     _id: Trailer[0]['_id']
//                 }, {
//                     remainedPacket: parseInt(numbeOfPacketsinTrailer / Trailer[0]['perPacket']),
//                     remainedPerPacket: numbeOfPacketsinTrailer % Trailer[0]['perPacket'],
//                     totalQuantity: numbeOfPacketsinTrailer,
//                     updatedBy: req.user.username,
//                     totalPrice: Trailer[0]['totalPrice'] - (totalRequestedPackets * Trailer[0]['sellPrice']),
//                     totalWeight: Trailer[0]['totalWeight'] - (totalRequestedPackets * Trailer[0]['weight']),
//                     $push: {
//                         invoiceID: newRecordtoHistory["_id"],
//                     }
//                 });
//                 req.flash('success', "The record has been saved");
//                 res.redirect('/Products')
//             }

//         }
//     } catch (error) {
//         next(error)
//     }
// }

//Print Selected Invoice
exports.PrintSelectedInvoice = async (req, res, next) => {
    try {
        const Records = await RecordsCollection
            .find({
                recordCode: req.params.invoiceID,
                cutomerID: req.params.id,
                status: req.params.status
            }).populate('productID')

        const ProfileInformation = await RecordsCollection
            .find({
                recordCode: req.params.invoiceID,
                cutomerID: req.params.id,
                status: req.params.status
            }).populate('cutomerID')

        const totalPrice = await RecordsCollection.aggregate([
            {
                $match: {
                    recordCode: req.params.invoiceID,
                    cutomerID: mongoose.Types.ObjectId(req.params.id),
                    status: req.params.status
                },
            },
            { $group: { _id: null, amount: { $sum: "$totalPrice" } } }
        ])

        if (Records[0]['productID'] == undefined) {
            res.render('Profiles/Psulayparawargrtn', {
                title: "تۆماری ژمارە " + req.params.invoiceID,
                records: Records,
                profile: ProfileInformation[0],
                invoiceID: req.params.invoiceID,
                totalPrice: totalPrice[0]
            })
        }
        else {
            res.render('Profiles/PrintInvoice', {
                title: "تۆماری ژمارە " + req.params.invoiceID,
                records: Records,
                profile: ProfileInformation[0],
                invoiceID: req.params.invoiceID,
                totalPrice: totalPrice[0]
            })
        }
        // res.json(Records)

    } catch (error) {
        next(error)
    }
}

// ! Customer Types
//Show All Customer Types
exports.ShowCustomerType = async (req, res, next) => {
    try {
        const CustomerType = await CustomerTypeCollection
            .find({
                softdelete: false
            })
        res.render('Profiles/CustomerType', {
            title: "Customer Types",
            type: CustomerType,
            user: req.user
        })
    } catch (error) {
        next(error)
    }
}

//Add New Customer Types UI
exports.NewCustomerType = async (req, res, next) => {
    try {
        res.render('Profiles/NewCustomerType', {
            title: "New Customer Types",
            user: req.user
        })
    } catch (error) {
        next(error)
    }
}

//Add New Customer Types Operation
exports.NewCustomerTypeOperation = async (req, res, next) => {
    try {
        const validationSchema = {
            customerType: validator.string().required(),
            note: validator.string()
        }
        const resultOfValidator = validator.validate(req.body, validationSchema);
        if (resultOfValidator.error) {
            req.flash('danger', resultOfValidator.error.details[0].message);
            res.redirect(process.env.address + "/Profiles/Customer/NewTypes")
        } else {
            const CustomerType = await CustomerTypeCollection.findOne({
                customerType: req.body.customerType
            });
            if (CustomerType) {
                res.send("Customer Type is exist")
            } else {
                const NewType = new CustomerTypeCollection({
                    customerType: req.body.customerType,
                    note: req.body.note
                });
                await NewType.save();
                res.redirect('/')
            }
        }
    } catch (error) {
        next(error)
    }
}

// !: Remove Product
//Remove Selected Product
exports.RemoveProfile = async (req, res, next) => {
    const Profile = await ProfileCollection
        .findOneAndUpdate({
            _id: req.params.id
        }, {
            softdelete: true
        })
    req.flash('danger', 'بە سەرکەوتوویی ڕەشکرایەوە')
    res.redirect('/Profiles')
}



exports.CheckForTrailerInRequest = async (req, res, next) => {
    try {
        const Products = await ProductsCollection
            .find({
                _id: req.params.id
            })
        // const Trailers = await TrailerCollection
        //     .find({
        //         softdelete: false,
        //         productID: Products[0]["_id"],
        //         status: "New Trailer"
        //     })
        const Recovered = await RecordsCollection
            .find({
                productID: Products[0]["_id"],
                status: "Recovered"
            })



        if (Recovered == "") {
            res.send(Products)
        } else {
            Products.push(Recovered[0])
            res.send(Products)
        }

    } catch (error) {
        next(error)
    }
}

// exports.AddNewInvoiceForCustomer = async (req, res, next) => {

//     try {
//         const Product = await ProductsCollection.find({
//             _id: req.params.id
//         });
//         const validationSchema = {
//             sellPrice: validator.number().required(),
//             perPacket: validator.number().required(),
//             trailerNumber: validator.number().required(),
//             cutomerID: validator.string().required(),
//             note: validator.string().required(),
//             recordCode: validator.string()
//         }
//         const resultOfValidator = validator.validate(req.body, validationSchema);
//         if (resultOfValidator.error) {
//             req.flash('danger', resultOfValidator.error.details[0].message);
//             res.redirect(process.env.address + Product[0]['_id'] + '/NewRequest')
//             // res.status(400).send({
//             //     message: resultOfValidator.error.details[0].message
//             // });
//         } else {
//             var totalRequestedPackets = req.body.perPacket;
//             const Trailer = await TrailerCollection.find({
//                 itemName: Product[0]['itemName'],
//                 trailerNumber: req.body.trailerNumber
//             });

//             //Prevent
//             if (Trailer[0]['totalQuantity'] < req.body.perPacket) {
//                 req.flash('danger', "There is no enough Product in Store there is only " + Trailer[0]['totalQuantity'] + " remains in this Trailer");
//                 res.redirect(process.env.address + Product[0]['_id'] + '/NewRequest')
//             } else {
//                 //===============Records Collection=============
//                 const newRecordtoHistory = new RecordsCollection({
//                     recordCode: uuid.v1(),
//                     weight: Product[0]['weight'],
//                     totalWeight: Product[0]['weight'] * totalRequestedPackets,
//                     totalQuantity: totalRequestedPackets,
//                     status: "Customer Request",
//                     color: Product[0]['color'],
//                     camePrice: Trailer[0]['camePrice'],
//                     sellPrice: req.body.sellPrice,
//                     totalPrice: req.body.sellPrice * totalRequestedPackets,
//                     expireDate: Product[0]['expireDate'],
//                     trailerNumber: req.body.trailerNumber,
//                     addedBy: "req.user.username",
//                     updatedBy: "req.user.username",
//                     note: req.body.note,
//                     cutomerID: req.body.cutomerID,
//                     trailerID: Trailer[0]['_id'],
//                     productID: Product[0]['_id'],
//                 });
//                 await newRecordtoHistory.save();
//                 var result = Product[0]['totalQuantity'] - totalRequestedPackets;
//                 await ProductsCollection.findByIdAndUpdate({
//                     _id: req.params.id
//                 }, {
//                     remainedPacket: parseInt(result / Product[0]['perPacket']),
//                     remainedPerPacket: result % Product[0]['perPacket'],
//                     totalQuantity: result,
//                     updatedBy: "req.user.username",
//                     totalPrice: Product[0]['totalPrice'] - (totalRequestedPackets * Product[0]['sellPrice']),
//                     totalWeight: Product[0]['totalWeight'] - (totalRequestedPackets * Product[0]['weight']),
//                     $push: {
//                         itemHistory: newRecordtoHistory["_id"],
//                     }
//                 });
//                 await ProfileCollection.findByIdAndUpdate({
//                     _id: req.body.cutomerID
//                 }, {
//                     borrowedBalance: Product[0]['sellPrice'],
//                     recoveredBalance: req.body.sellPrice,
//                     // remainedbalance: Product[0]['remainedbalance'] - req.body.recoveredBalance,
//                     updatedBy: "req.user.username",
//                     $push: {
//                         invoiceID: newRecordtoHistory["_id"],
//                     }
//                 });



//                 var numbeOfPacketsinTrailer = Trailer[0]['totalQuantity'] - totalRequestedPackets;
//                 await TrailerCollection.findByIdAndUpdate({
//                     _id: Trailer[0]['_id']
//                 }, {
//                     remainedPacket: parseInt(numbeOfPacketsinTrailer / Trailer[0]['perPacket']),
//                     remainedPerPacket: numbeOfPacketsinTrailer % Trailer[0]['perPacket'],
//                     totalQuantity: numbeOfPacketsinTrailer,
//                     updatedBy: "req.user.username",
//                     totalPrice: Trailer[0]['totalPrice'] - (totalRequestedPackets * Trailer[0]['sellPrice']),
//                     totalWeight: Trailer[0]['totalWeight'] - (totalRequestedPackets * Trailer[0]['weight']),
//                     $push: {
//                         invoiceID: newRecordtoHistory["_id"],
//                     }
//                 });
//                 req.flash('success', "The record has been saved");
//                 res.redirect('/Products')
//             }

//         }
//     } catch (error) {
//         next(error)
//     }
// }