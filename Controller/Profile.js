require('events').EventEmitter.defaultMaxListeners = Infinity
const validator = require("joi");
const config = require('config');
var mongoose = require('mongoose');


//Collections Section
const ProductsCollection = require('../models/Product');
const CustomerTypeCollection = require('../models/CustomerType');
const HistoryClass = require('../models/records');
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
    res.render("Profiles/addProfile", {
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


// ! User Invoices
//Get Invoice for Specific Customer
exports.GetAllInvoiceForCustomers = async (req, res, next) => {
    const Invoices = await HistoryClass
        .aggregate([
            {
                $group: {
                    _id: { recordCode: "$recordCode" },
                    amount: { $sum: "$totalPrice" },
                    count: { $sum: 1 },
                    items: {
                        $push: { productID: "$productID", cutomerID: "$cutomerID",createdAt: "$createdAt", moneyStatus: "$moneyStatus", status: "$status", totalPrice: "$totalPrice", addedBy: "$addedBy", sellPrice: "$sellPrice" },
                    },
                },
            },
            // {
            //     $group: {
            //         _id: "$recordCode",
            //     },
            // },
            // {
            //     $project: {
            //         productID: "$productID"
            //     },
            // },
            {
                $sort: { "_id": -1 },
            },
            {
                $match: {
                    "items.cutomerID": mongoose.Types.ObjectId(req.params.id),
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
            // {
            //     $unwind: "$data",
            // },
        ]);

    const Profile = await HistoryClass
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
            title: "Customer Invoice",
            invoices: Invoices,
            profile: Profile,
            address: address
        })
    }
    // res.send(Invoices)

}


//Get Invoice for Specific Customer
exports.PrintAllInvoiceforCustomer = async (req, res, next) => {
    // console.log("hey")
    const Records = await HistoryClass
        .aggregate([
            // {
            //     $group: {
            //         _id: { recordCode: "$recordCode" },
            //         amount: { $sum: "$totalPrice" },
            //         count: { $sum: 1 },
            //         // data: {
            //         //     $push: { productID: "$productID", cutomerID: "$cutomerID" },
            //         // },
            //     },
            // },
            // {
            //     $sort: { "_id": -1 },
            // },
            {
                $match: {
                    cutomerID: mongoose.Types.ObjectId(req.params.id),
                }
            },
            {
                $lookup: {
                    from: "items",
                    localField: "productID",
                    foreignField: "_id",
                    as: "data",
                },
            },
            {
                $unwind: "$data",
            },
        ]);

    // var checker = await ProductsCollection.populate(Records, { path: "productID" });

    const ProfileInformation = await ProfileCollection
        .findOne({
            _id: req.params.id
        })

    res.json(Records)
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

        const Records = await HistoryClass
            .find({
                status: "Customer Request",
                softdelete: false
            });


        var invoiceID = Records.length;

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
        const Records = await HistoryClass
            .find({
                recordCode: req.params.invoiceID,
            }).populate('productID')

        const ProfileInformation = await HistoryClass
            .find({
                recordCode: req.params.invoiceID,
            }).populate('cutomerID')

        // res.json(Records)
        res.render('Components/PrintInvoice', {
            title: "تۆماری ژمارە " + req.params.invoiceID,
            records: Records,
            profile: ProfileInformation[0]
        })
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
                itemName: req.params.itemName,
                softdelete: false,
                itemType: req.params.itemType,
                color: req.params.color,
                itemModel: req.params.itemModel,
                itemUnit: req.params.itemUnit.split(" ")[1],
                weight: req.params.itemUnit.split(" ")[0],
            })
        const Trailers = await TrailerCollection
            .find({
                softdelete: false,
                productID: Products[0]["_id"],
                status: "New Trailer"
            })
        const Recovered = await HistoryClass
            .find({
                productID: Products[0]["_id"],
                status: "Recovered"
            })



        if (Recovered == "") {
            res.send(Trailers)
        } else {
            Trailers.push(Recovered[0])
            res.send(Trailers)
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