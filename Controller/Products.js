// ! Requirements
require('events').EventEmitter.defaultMaxListeners = Infinity
const validator = require("joi");
const config = require('config');
var uuid = require('uuid');
var mongoose = require('mongoose');
const {
    roles
} = require('../Middleware/roles');

// ! Collections
const ProductsCollection = require('../models/Product');
const RecordsCollection = require('../models/records');
const ProfileCollection = require('../models/Profiles');
const TrailerCollection = require('../models/Trailers');
const EmployeeClass = require('../models/Employee');
const CompanyCollection = require('../models/Companies');
const ItemUnitCollection = require('../models/ItemUnit');

const address = process.env.address

//Authorization
exports.grantAccess = function (action, resource) {
    return async (req, res, next) => {
        try {
            const permission = roles.can(req.user.role)[action](resource);
            if (!permission.granted) {
                return res.render('Components/404')
                // return res.status(401).json({
                //     error: "You don't have enough permission to perform this action"
                // });
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
            return res.render('./Components/NotPermited')

        // return res.status(401).json({
        //     error: "You need to be logged in to access this route"
        // });
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
}

// TODO: Checked and Worked Properly
//Add New Product UI
exports.AddNewProduct = async (req, res, next) => {
    try {
        const Company = await CompanyCollection
            .find({
            })

        const Color = await ProductsCollection
            .find({
            }).distinct('color')

        const ItemUnit = await ItemUnitCollection
            .find({
            })
        res.render('Products/AddProduct.pug', {
            title: "زیادکردنی بەرهەمی نوێ",
            company: Company,
            itemUnit: ItemUnit,
            colors: Color
        })
    } catch (error) {
        next(error)
    }
}

// TODO: Checked and Worked Properly
//Add New Product Operation
exports.addNewItem = async (req, res, next) => {
    try {

        var _TrailerNumber = 0;

        const Trailer = await TrailerCollection.find({
            status: "New Trailer",
        }).sort({
            "createdAt": -1
        });

        if (Trailer[0] != undefined)
            _TrailerNumber = Trailer[0]['trailerNumber']

        const Product = await ProductsCollection.findOne({
            itemName: req.body.itemName,
            itemType: req.body.itemType,
            itemModel: req.body.itemModel,
            itemUnit: req.body.itemUnit,
            unit: req.body.unit,
            color: req.body.color,
            weight: req.body.weight,
        });

        if (Product) {
            req.flash('danger', "بەرهەمی ناوبراو بەردەستە");
            res.redirect("/NewProduct")
        } else {
            const newProduct = new ProductsCollection({
                itemName: req.body.itemName,
                itemCode: uuid.v1(),
                itemType: req.body.itemType,
                itemModel: req.body.itemModel,
                itemUnit: req.body.itemUnit,
                unit: req.body.unit,
                manufacturerCompany: req.body.manufacturerCompany,
                companyCode: req.body.companyCode,
                countryCompany: req.body.countryCompany,
                usedIn: req.body.usedIn,
                weight: req.body.weight,
                totalWeight: 0,
                color: req.body.color,
                packet: 1,
                camePrice: req.body.camePrice,
                sellPriceMufrad: req.body.sellPriceMufrad,
                sellPriceMahal: req.body.sellPriceMahal,
                sellPriceWasta: req.body.sellPriceWasta,
                sellPriceWakil: req.body.sellPriceWakil,
                sellPriceSharika: req.body.sellPriceSharika,
                totalPrice: 0,
                perPacket: req.body.perPacket,
                remainedPacket: 0,
                remainedPerPacket: 0,
                totalQuantity: 0,
                status: "New Product",
                expireDate: req.body.expireDate,
                trailerNumber: _TrailerNumber,
                addedBy: req.user.username,
                updatedBy: req.user.username,
                note: req.body.note
            });
            await newProduct.save();


            const newItem = new RecordsCollection({
                recordCode: uuid.v1(),
                packet: 1,
                perPacket: req.body.perPacket,
                status: "New Product",
                trailerNumber: _TrailerNumber,
                addedBy: req.user.username,
                updatedBy: req.user.username,
                totalQuantity: 0,
                totalPrice: 0,
                productID: newProduct['_id'],
            });
            await newItem.save();

            await ProductsCollection.findByIdAndUpdate({
                _id: newProduct['_id']
            }, {
                $push: {
                    itemHistory: newItem["_id"],
                }
            });
            res.redirect("/Products")
        }
    } catch (error) {
        next(error)
    }
}

// TODO: Checked and Worked Properly
//Remove Product UI
exports.RemoveProductUI = async (req, res, next) => {
    const Products = await ProductsCollection
        .find({
            _id: req.params.id
        })
    res.render('Products/Delete_Product', {
        title: "ڕەشکردنەوەی بەرهەم",
        product: Products,
        user: req.user
    })
}

// TODO: Checked and Worked Properly
//Remove Selected Product
exports.RemoveProduct = async (req, res, next) => {

    const Products = await ProductsCollection
        .findOne({
            _id: req.params.id
        })

    const deletedItem = new RecordsCollection({
        packet: Products['packet'],
        perPacket: Products['perPacket'],
        totalQuantity: Products['totalQuantity'],
        status: "Deleted Product",
        camePrice: Products['camePrice'],
        sellPrice: Products['sellPrice'],
        totalPrice: Products['totalPrice'],
        trailerNumber: Products['trailerNumber'],
        addedBy: req.user.username,
        updatedBy: req.user.username,
        productID: Products['_id'],
    });
    await deletedItem.save();

    setTimeout(async () => {
        await ProductsCollection
            .deleteOne({
                _id: req.params.id
            })
    }, 5000);

    req.flash('success', "بەرهەمەکە بە سەرکەوتوویی ڕەشکرایەوە");
    res.redirect("/Products")
}

// TODO: Checked and Worked Properly
// !: Invoices
//Invoice Request Operation
exports.NewInvoice = async (req, res, next) => {
    try {
        var RequestList = req.body[0];
        var checkLength = 0;
        var preparation = [];
        var resultOfValidation = [];
        var count = 0;
        const Record = await RecordsCollection.findOne({
            status: "Customer Request",
        }).distinct("recordCode");

        var numberArray = Record.map(Number);

        numberArray.sort(function (a, b) {
            return a - b;
        });

        var invoiceID = parseFloat((numberArray[numberArray.length - 1])) + 1;

        if (isNaN(invoiceID))
            invoiceID = 1;

        var Profile = await ProfileCollection.findOne({
            _id: req.params.id
        });

        for (let k = 0; k < RequestList.length; k++) {
            const element = RequestList[k];
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

            if (Product['totalQuantity'] < totalRequestedPackets) {
                preparation[count] = Product;
                count++;
            } else {
                checkLength++;
            }
        }

        setTimeout(async () => {

            if (checkLength == RequestList.length) {
                for (let index = 0; index < RequestList.length; index++) {
                    const element = RequestList[index];
                    // console.log("Item Model:" + element[1])
                    // console.log("Item Name:" + element[2])
                    // console.log("Item Type:" + element[3])
                    // console.log("Item Color:" + element[4])
                    // console.log("Item Weight:" + element[5].split(" ")[0])
                    // console.log("Item Unit:" + element[5].split(" ")[1])
                    // console.log("Item Number:"+element[6])
                    // console.log("Sell Price:"+element[7])
                    // console.log("Total Price:"+element[8])
                    // console.log("Item Trailer:"+element[9])

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




                    //Prevent 
                    if (Product['totalQuantity'] < totalRequestedPackets) {
                        res.send("بەرهەمی " + Product['itemModel'] + " " + Product['itemName'] + "تەنها " + Product['totalQuantity'] + " ماوە");
                        break;
                    } else {
                        //===============Records Collection=============
                        const newRecordtoHistory = new RecordsCollection({
                            recordCode: invoiceID,
                            totalQuantity: totalRequestedPackets,
                            status: "Customer Request",
                            sellPrice: _SellPrice,
                            totalPrice: _SellPrice * totalRequestedPackets,
                            oldDebut: Profile['remainedbalance'],
                            addedBy: req.user.username,
                            updatedBy: req.user.username,
                            note: req.body[1].toString(),
                            productID: Product['_id'],
                            cutomerID: req.params.id,
                            htmlObject: req.body['tbody'],
                            moneyStatus: "Paid",
                            personName: req.body[2].toString()
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

                    }
                }
                res.send("بە سەرکەوتوویی تۆمارکرا")
            } else {
                res.send(preparation)
            }
        }, 2000);

    } catch (error) {
        console.log(error)
    }
}

//Invoice Request Operation
exports.NewInvoiceForDiscount = async (req, res, next) => {
    try {
        var RequestList = req.body[0];
        var checkLength = 0;
        var preparation = [];
        var resultOfValidation = [];
        var count = 0;
        const Record = await RecordsCollection.findOne({
            status: "Customer Request",
        }).distinct("recordCode");

        var numberArray = Record.map(Number);

        numberArray.sort(function (a, b) {
            return a - b;
        });

        var invoiceID = parseFloat((numberArray[numberArray.length - 1])) + 1;

        if (isNaN(invoiceID))
            invoiceID = 1;

        var Profile = await ProfileCollection.findOne({
            _id: req.params.id
        });

        for (let k = 0; k < RequestList.length; k++) {
            const element = RequestList[k];
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

            if (Product['totalQuantity'] < totalRequestedPackets) {
                preparation[count] = Product;
                count++;
            } else {
                checkLength++;
            }
        }

        setTimeout(async () => {

            if (checkLength == RequestList.length) {
                for (let index = 0; index < RequestList.length; index++) {
                    const element = RequestList[index];
                    // console.log("Item Model:" + element[1])
                    // console.log("Item Name:" + element[2])
                    // console.log("Item Type:" + element[3])
                    // console.log("Item Color:" + element[4])
                    // console.log("Item Weight:" + element[5].split(" ")[0])
                    // console.log("Item Unit:" + element[5].split(" ")[1])
                    // console.log("Item Number:"+element[6])
                    // console.log("Sell Price:"+element[7])
                    // console.log("Total Price:"+element[8])
                    // console.log("Item Trailer:"+element[9])

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
                        recordCode: invoiceID,
                        totalQuantity: totalRequestedPackets,
                        status: "Customer Request",
                        sellPrice: _SellPrice,
                        totalPrice: _SellPrice * totalRequestedPackets,
                        discount: req.params.discount / 100,
                        paidMoney: _SellPrice * totalRequestedPackets - ((_SellPrice * totalRequestedPackets) * (req.params.discount / 100)),
                        oldDebut: Profile['remainedbalance'],
                        addedBy: req.user.username,
                        updatedBy: req.user.username,
                        note: req.body[1].toString(),
                        productID: Product['_id'],
                        cutomerID: req.params.id,
                        htmlObject: req.body['tbody'],
                        moneyStatus: "Discount Invoice",
                        personName: req.body[2].toString(),
                        camePrice: Product['camePrice']
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

                }
                res.status(201).send("بە سەرکەوتوویی تۆمارکرا")

                await ProfileCollection.findByIdAndUpdate({
                    _id: req.params.id
                }, {
                    remainedbalance: Profile['remainedbalance'] + parseFloat(req.params.price.replace("$", '')) - (parseFloat(req.params.price.replace("$", '')) * req.params.discount / 100),
                });

            } else {
                res.send(preparation)
            }
        }, 2000);

    } catch (error) {
        console.log(error)
    }
}

// TODO: Checked and Worked Properly
//Invoice Request Operation
exports.NewInvoiceOfNoPrice = async (req, res, next) => {
    try {
        var RequestList = req.body[0];
        var checkLength = 0;
        var preparation = [];
        var count = 0;
        const Record = await RecordsCollection.findOne({
            status: "Customer Request",
        }).distinct("recordCode");

        var numberArray = Record.map(Number);

        numberArray.sort(function (a, b) {
            return a - b;
        });

        var invoiceID = parseFloat((numberArray[numberArray.length - 1])) + 1;

        if (isNaN(invoiceID))
            invoiceID = 1;

        var Profile = await ProfileCollection.findOne({
            _id: req.params.id
        });

        for (let k = 0; k < RequestList.length; k++) {
            const element = RequestList[k];
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

            if (Product['totalQuantity'] < totalRequestedPackets) {
                preparation[count] = Product;
                count++;
            } else {
                checkLength++;
            }
        }

        setTimeout(async () => {
            if (checkLength == RequestList.length) {
                for (let index = 0; index < RequestList.length; index++) {
                    const element = RequestList[index];
                    // console.log("Item Model:" + element[1])
                    // console.log("Item Name:" + element[2])
                    // console.log("Item Type:" + element[3])
                    // console.log("Item Color:" + element[4])
                    // console.log("Item Weight:" + element[5].split(" ")[0])
                    // console.log("Item Unit:" + element[5].split(" ")[1])
                    // console.log("Item Number:"+element[6])
                    // console.log("Sell Price:"+element[7])
                    // console.log("Total Price:"+element[8])
                    // console.log("Item Trailer:"+element[9])

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

                    //Prevent 
                    //===============Records Collection=============
                    const newRecordtoHistory = new RecordsCollection({
                        recordCode: invoiceID,
                        totalQuantity: totalRequestedPackets,
                        status: "Customer Request",
                        sellPrice: _SellPrice,
                        totalPrice: _SellPrice * totalRequestedPackets,
                        oldDebut: Profile['remainedbalance'],
                        addedBy: req.user.username,
                        updatedBy: req.user.username,
                        note: req.body[1].toString(),
                        productID: Product['_id'],
                        cutomerID: req.params.id,
                        htmlObject: req.body['tbody'],
                        moneyStatus: "Debut",
                        personName: req.body[2].toString()
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

                }
                res.status(201).send("بە سەرکەوتوویی تۆمارکرا")

                await ProfileCollection.findByIdAndUpdate({
                    _id: req.params.id
                }, {
                    remainedbalance: Profile['remainedbalance'] + parseFloat(req.params.price.replace("$", '')),
                });
            } else {
                res.send(preparation)
            }
        }, 2000);

    } catch (error) {
        console.log(error)
    }
}

//Invoice Request Operation
exports.NewInvoiceForDebutAndPrice = async (req, res, next) => {
    try {
        var RequestList = req.body[0];
        var checkLength = 0;
        var preparation = [];
        var resultOfValidation = [];
        var count = 0;
        const Record = await RecordsCollection.findOne({
            status: "Customer Request",
        }).distinct("recordCode");

        var numberArray = Record.map(Number);

        numberArray.sort(function (a, b) {
            return a - b;
        });

        var invoiceID = parseFloat((numberArray[numberArray.length - 1])) + 1;

        if (isNaN(invoiceID))
            invoiceID = 1;

        var Profile = await ProfileCollection.findOne({
            _id: req.params.id
        });



        for (let k = 0; k < RequestList.length; k++) {
            const element = RequestList[k];
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

            if (Product['totalQuantity'] < totalRequestedPackets) {
                preparation[count] = Product;
                count++;
            } else {
                checkLength++;
            }
        }

        setTimeout(async () => {

            if (checkLength == RequestList.length) {
                for (let index = 0; index < RequestList.length; index++) {
                    const element = RequestList[index];
                    // console.log("Item Model:" + element[1])
                    // console.log("Item Name:" + element[2])
                    // console.log("Item Type:" + element[3])
                    // console.log("Item Color:" + element[4])
                    // console.log("Item Weight:" + element[5].split(" ")[0])
                    // console.log("Item Unit:" + element[5].split(" ")[1])
                    // console.log("Item Number:"+element[6])
                    // console.log("Sell Price:"+element[7])
                    // console.log("Total Price:"+element[8])
                    // console.log("Item Trailer:"+element[9])

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




                    //Prevent 
                    if (Product['totalQuantity'] < totalRequestedPackets) {
                        res.send("بەرهەمی " + Product['itemModel'] + " " + Product['itemName'] + "تەنها " + Product['totalQuantity'] + " ماوە");
                        break;
                    } else {
                        //===============Records Collection=============
                        const newRecordtoHistory = new RecordsCollection({
                            recordCode: invoiceID,
                            totalQuantity: totalRequestedPackets,
                            status: "Customer Request",
                            sellPrice: _SellPrice,
                            totalPrice: _SellPrice * totalRequestedPackets,
                            oldDebut: Profile['remainedbalance'],
                            addedBy: req.user.username,
                            updatedBy: req.user.username,
                            note: req.body[1].toString(),
                            productID: Product['_id'],
                            cutomerID: req.params.id,
                            htmlObject: req.body['tbody'],
                            moneyStatus: "Half Invoice",
                            paidMoney: req.params.pay,
                            remainedMoney: req.params.total - req.params.pay,
                            personName: req.body[2].toString()
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

                    }
                }
                res.send("بە سەرکەوتوویی تۆمارکرا")

                await ProfileCollection.findByIdAndUpdate({
                    _id: req.params.id
                }, {
                    remainedbalance: Profile['remainedbalance'] + (parseFloat(req.params.total) - parseFloat(req.params.pay)),
                });

            } else {
                res.send(preparation)
            }
        }, 2000);

    } catch (error) {
        console.log(error)
    }
}


// TODO: Checked and Worked Properly
//Invoice Request Operation
exports.NewInvoiceForDebut = async (req, res, next) => {
    try {
        const Records = await RecordsCollection.find({
            status: "Compensate",
        }).sort({
            "createdAt": -1
        });

        var Profile = await ProfileCollection.find({
            _id: req.params.id
        });

        var invoiceID = parseFloat(Records[0]['recordCode']) + 1;

        const newRecordtoHistory = new RecordsCollection({
            recordCode: invoiceID,
            status: "Compensate",
            sellPrice: req.params.paid,
            totalPrice: req.params.paid,
            totalQuantity: 0,
            oldDebut: Profile['remainedbalance'],
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
            remainedbalance: Profile[0]['remainedbalance'] - parseFloat(req.params.paid),
            $push: {
                invoiceID: newRecordtoHistory["_id"],
            }
        });

        res.send("بە سەرکەوتوویی تۆمارکرا")


    } catch (error) {
        console.log(error)
    }
}

// TODO: Checked and Worked Properly   
// !: Products
//Get All Products
exports.getProducts = async (req, res, next) => {
    const Products = await ProductsCollection
        .find({
        })
        .sort({
            "createdAt": -1
        })

    res.render("Products/Products", {
        title: "بەرهەمەکان",
        product: Products,
        user: req.user,
        address: address
    })
}


//Get All Products
exports.PrintAllProducts = async (req, res, next) => {

    // const Products = await ProductsCollection.aggregate(
    //     [
    //         {
    //             $group: {
    //                 _id: { manufacturerCompany: '$manufacturerCompany' },
    //                 count: { $sum: 1 },
    //                 items: {
    //                     $push: { itemModel: "$itemModel", itemName: "$itemName", countryCompany: "$countryCompany", unit: "$unit", itemUnit: "$itemUnit", itemType: "$itemType", usedIn: "$usedIn", weight: "$weight", color: "$color", totalQuantity: "$totalQuantity" },
    //                 },
    //             },

    //         },
    //         {
    //             $sort: { _id: 1, "items.itemModel": 1 },
    //         },
    //     ]);

    // console.log()
    // res.send(Products)

    const Products = await ProductsCollection.find({}).sort({ "manufacturerCompany": 1, "itemModel": 1 })


    res.render("Products/PrintProducts", {
        title: "بەرهەمەکان",
        product: Products,
        user: req.user,
    })
}

// TODO: Checked and Worked Properly
//Get All Invoices of Specific Product
exports.getInvoiceofSpecificProduct = async (req, res, next) => {
    const Products = await RecordsCollection
        .find({
            productID: req.params.id
        })
        .sort({
            "createdAt": -1
        }).populate('productID')

    const Profile = await RecordsCollection
        .find({
            productID: req.params.id
        })
        .sort({
            "createdAt": -1
        }).populate('cutomerID')

    const ProductInfo = await ProductsCollection
        .find({
            _id: req.params.id
        })

    if (Products == "") {
        req.flash('danger', "بەرهەمی داواکراو هیج تۆماڕێکی نیە");
        res.redirect("/Products")
    } else {
        res.render("Products/Invoices", {
            product: Products,
            title: " فاتوورەی " + Products[0]['productID']['itemName'] + " - " + Products[0]['productID']['itemModel'] + " - " + Products[0]['productID']['weight'] + " - " + Products[0]['productID']['color'],
            profile: Profile,
            productInfo: ProductInfo
        })
    }
}

// TODO: Checked and Worked Properly
//Update Products UI
exports.EditProductUI = async (req, res, next) => {
    try {
        const Product = await ProductsCollection
            .find({
                _id: req.params.id,
            });

        const Company = await CompanyCollection
            .find({
            })

        const Color = await ProductsCollection
            .find({
            }).distinct('color')

        const ItemUnit = await ItemUnitCollection
            .find({
            })
        res.render('Products/EditProduct', {
            title: "دەسکاریکردنی بەرهەمی " + Product[0]['itemName'],
            product: Product,
            company: Company,
            colors: Color,
            itemUnit: ItemUnit
        })
    } catch (error) {
        next(error)
    }
}

// TODO: Checked and Worked Properly
//Update Products Operation
exports.EditProductOperation = async (req, res, next) => {
    try {
        await ProductsCollection.findByIdAndUpdate({
            _id: req.params.id
        }, {
            itemName: req.body.itemName,
            itemType: req.body.itemType,
            itemModel: req.body.itemModel,
            itemUnit: req.body.itemUnit,
            unit: req.body.unit,
            manufacturerCompany: req.body.manufacturerCompany,
            companyCode: req.body.companyCode,
            countryCompany: req.body.countryCompany,
            usedIn: req.body.usedIn,
            weight: req.body.weight,
            color: req.body.color,
            camePrice: req.body.camePrice,
            sellPriceMufrad: req.body.sellPriceMufrad,
            sellPriceMahal: req.body.sellPriceMahal,
            sellPriceWasta: req.body.sellPriceWasta,
            sellPriceWakil: req.body.sellPriceWakil,
            sellPriceSharika: req.body.sellPriceSharika,
            perPacket: req.body.perPacket,
            totalQuantity: req.body.totalQuantity,
            updatedBy: req.user.username,
            note: req.body.note
        });
        req.flash('success', "بەرهەمەکە بە سەرکەوتوویی نوێکرایەوە");
        res.redirect("/Products")
    } catch (error) {
        next(error)
    }
}

// TODO: Checked and Worked Properly
//Clone Products UI
exports.CloneProductUI = async (req, res, next) => {
    try {
        const Product = await ProductsCollection
            .find({
                _id: req.params.id,
            });

        const Company = await CompanyCollection
            .find({
            })

        const Color = await ProductsCollection
            .find({
            }).distinct('color')

        const ItemUnit = await ItemUnitCollection
            .find({
            })
        res.render('Products/cloneProduct', {
            title: "لەبەرگرتنەوەی " + Product[0]['itemName'],
            product: Product,
            company: Company,
            colors: Color,
            itemUnit: ItemUnit
        })
    } catch (error) {
        next(error)
    }
}

// TODO: Checked and Worked Properly
//Clone Product Operation
exports.CloneProduct = async (req, res, next) => {
    try {

        const Trailer = await TrailerCollection.find({
            status: "New Trailer",
        }).sort({
            "createdAt": -1
        });

        const Product = await ProductsCollection.findOne({
            itemName: req.body.itemName,
            itemType: req.body.itemType,
            itemModel: req.body.itemModel,
            itemUnit: req.body.itemUnit,
            unit: req.body.unit,
            color: req.body.color,
            weight: req.body.weight,
        });

        if (Product) {
            req.flash('danger', "بەرهەمی ناوبراو بەردەستە");
            res.redirect("/NewProduct")
        } else {
            const newProduct = new ProductsCollection({
                itemName: req.body.itemName,
                itemCode: uuid.v1(),
                itemType: req.body.itemType,
                itemModel: req.body.itemModel,
                itemUnit: req.body.itemUnit,
                unit: req.body.unit,
                manufacturerCompany: req.body.manufacturerCompany,
                companyCode: req.body.companyCode,
                countryCompany: req.body.countryCompany,
                usedIn: req.body.usedIn,
                weight: req.body.weight,
                totalWeight: 0,
                color: req.body.color,
                packet: 1,
                camePrice: req.body.camePrice,
                sellPriceMufrad: req.body.sellPriceMufrad,
                sellPriceMahal: req.body.sellPriceMahal,
                sellPriceWasta: req.body.sellPriceWasta,
                sellPriceWakil: req.body.sellPriceWakil,
                sellPriceSharika: req.body.sellPriceSharika,
                totalPrice: 0,
                perPacket: req.body.perPacket,
                remainedPacket: 0,
                remainedPerPacket: 0,
                totalQuantity: 0,
                status: "New Product",
                expireDate: req.body.expireDate,
                trailerNumber: Trailer[0]['trailerNumber'],
                addedBy: req.user.username,
                updatedBy: req.user.username,
                note: req.body.note
            });
            await newProduct.save();


            const newItem = new RecordsCollection({
                recordCode: uuid.v1(),
                packet: 1,
                perPacket: req.body.perPacket,
                status: "New Product",
                trailerNumber: Trailer[0]['trailerNumber'],
                addedBy: req.user.username,
                updatedBy: req.user.username,
                totalQuantity: 0,
                totalPrice: 0,
                productID: newProduct['_id'],
            });
            await newItem.save();

            await ProductsCollection.findByIdAndUpdate({
                _id: newProduct['_id']
            }, {
                $push: {
                    itemHistory: newItem["_id"],
                }
            });
            req.flash('success', "بەرهەمی ناوبراو زیادکرا");
            res.redirect("/Products")
        }
    } catch (error) {
        next(error)
    }
}

// TODO: Checked and Worked Properly
// ! Trailers
//Add New Trailer UI
exports.AddNewTrailer = async (req, res, next) => {
    try {
        const Trailer = await TrailerCollection.find({
            status: "New Trailer",
        }).sort({
            "createdAt": -1
        });

        if (Trailer.length == 0)
            var invoiceID = 0;
        else if (Trailer[0]['trailerNumber'] == 0)
            var invoiceID = 1;
        else
            var invoiceID = Trailer[0]['trailerNumber'] + 1;

        const Products = await ProductsCollection
            .find({
            })

        const Company = await ProductsCollection
            .find({
            }).distinct('manufacturerCompany')

        res.render('Products/newTrailer', {
            title: "زیاد کردنی بار",
            products: Products,
            invoiceID: invoiceID,
            time: Date(),
            user: req.user,
            company: Company,
            address: address
        })
    } catch (error) {
        next(error)
    }
}

// TODO: Checked and Worked Properly
//Add New Trailer Operation
exports.AppendNewTrailertoProduct = async (req, res, next) => {
    try {
        var RequestList = req.body['tbody'];
        const Trailer = await TrailerCollection.find({
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

            const Companies = await CompanyCollection
                .find({
                    companyName: Product[0]['manufacturerCompany'],
                })

            const newRecordtoHistory = new RecordsCollection({
                recordCode: _TrailerNumber,
                oldDebut: Companies[0]['remainedbalance'],
                totalQuantity: parseFloat(element[11]),
                status: "New Trailer",
                camePrice: parseFloat(element[12]),
                sellPrice: parseFloat(element[13]),
                totalPrice: parseFloat(element[12]) * parseFloat(element[11]),
                cost: req.params.cost,
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
                camePrice: parseFloat(element[12]),
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

            const newTrailer = new TrailerCollection({
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
            });
            await newTrailer.save();
            await TrailerCollection.findByIdAndUpdate({
                "_id": newTrailer['_id']
            }, {
                $push: {
                    invoiceID: newRecordtoHistory["_id"],
                }
            });
        }
        req.flash('success', "باری نوێ بە سەرکەوتوویی زیاد کرا");
        res.redirect("/Products")
    } catch (error) {
        next(error)
    }
}

// TODO: Checked and Worked Properly
//Check For Product Price In Trailer
exports.CheckForProductPriceInTrailer = async (req, res, next) => {
    try {
        const Products = await ProductsCollection
            .find({
                itemName: req.body.itemName,
                itemType: req.body.itemType,
                color: req.body.color,
                itemModel: req.body.itemModel,
                itemUnit: req.body.itemUnit.split(" ")[1],
                weight: req.body.itemUnit.split(" ")[0],
            })
        res.send(Products[0])
    } catch (error) {
        next(error)
    }
}

// TODO: Checked and Worked Properly
exports.GetProductswithSearch = async (req, res, next) => {
    var searchStr = req.body.search.value;

    if (searchStr) {
        var regex = new RegExp(searchStr, "i")
        searchStr = {
            $or: [{
                'itemName': regex
            }, {
                'itemModel': regex
            }, {
                'manufacturerCompany': regex
            }, {
                'countryCompany': regex
            }, {
                'unit': regex
            }, {
                'itemUnit': regex
            }, {
                'itemType': regex
            }, {
                'usedIn': regex
            }, {
                'color': regex
            }, {
                'status': regex
            }]
        };


    } else {
        searchStr = {};
    }

    var recordsTotal = 0;
    var recordsFiltered = 0;

    ProductsCollection.count({}, function (err, c) {
        recordsTotal = c;
        ProductsCollection.count(searchStr, function (err, c) {
            recordsFiltered = c;
            ProductsCollection.find(searchStr, 'itemName itemModel countryCompany manufacturerCompany unit itemUnit itemType usedIn weight color sellPriceMufrad totalQuantity', {
                'skip': Number(req.body.start),
                'limit': Number(req.body.length),
                'sort': { 'itemModel': -1 },
            }, function (err, results) {
                if (err) {
                    console.log('error while getting results' + err);
                    return;
                }
                var data = JSON.stringify({
                    "draw": req.body.draw,
                    "recordsFiltered": recordsFiltered,
                    "recordsTotal": recordsTotal,
                    "data": results
                });
                res.send(data);
            });

        });
    });


}

// TODO: Checked and Worked Properly
//Search for Products of Specific Company
exports.SearchForProductsinCompany = async (req, res, next) => {
    try {
        var CompanyName = req.params.company;
        const Product = await ProductsCollection
            .find({
                manufacturerCompany: CompanyName
            });
        // console.log(Product)
        res.send(Product);
    } catch (error) {
        console.log(error)
    }
}

// TODO: Checked and Worked Properly
//Search for Products of Specific Company
exports.AddNewColor = async (req, res, next) => {
    try {
        res.render('Products/NewColor', {
            title: "زیادکردنی ڕەنگ",
            time: Date(),
            user: req.user,
        })
    } catch (error) {
        console.log(error)
    }
}






// ! Recover Product
// TODO: Checked and Worked Properly
//Add New Invoice for Recovered Items
exports.AddNewRecover = async (req, res, next) => {
    try {
        const Records = await RecordsCollection.find({
            status: "Recovered",
        }).sort({
            "createdAt": -1
        });

        if (Records == "")
            var invoiceID = 1;
        else
            var invoiceID = parseFloat(Records[0]['recordCode']) + 1;


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
            })
        const Trailers = await TrailerCollection
            .find({
                productID: req.params.id,
            })
        const Company = await CompanyCollection
            .find({
            })

        res.render('Profiles/AddNewRecover', {
            title: "گەڕانەوە بۆ " + Profiles[0]['clientName'],
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

exports.RecoveredSoldProducts = async (req, res, next) => {

    try {
        var RequestList = req.body['tbody'];
        var checkLength = 0;

        const Records = await RecordsCollection.find({
            status: "Recovered",
        }).sort({
            "createdAt": -1
        });

        var Profile = await ProfileCollection.findOne({
            _id: req.params.id
        });

        if (Records == "")
            var invoiceID = 1;
        else
            var invoiceID = parseFloat(Records[0]['recordCode']) + 1;







        for (let index = 0; index < RequestList.length; index++) {
            const element = RequestList[index];
            // console.log("Item Model:" + element[1])
            // console.log("Item Name:" + element[2])
            // console.log("Item Type:" + element[3])
            // console.log("Item Color:" + element[4])
            // console.log("Item Weight:" + element[5].split(" ")[0])
            // console.log("Item Unit:" + element[5].split(" ")[1])
            // console.log("Item Number:"+element[6])
            // console.log("Sell Price:"+element[7])
            // console.log("Total Price:"+element[8])
            // console.log("Item Trailer:"+element[9])

            const Product = await ProductsCollection.find({
                itemModel: element[1],
                itemName: element[2],
                itemType: element[3],
                color: element[4],
                weight: parseFloat(element[5].split(" ")[0]),
                itemUnit: element[5].split(" ")[1]
            });

            var totalRequestedPackets = parseFloat(element[6]);
            var _SellPrice = parseFloat(element[7].replace("$", ''));

            const Trailer = await TrailerCollection.find({
                productID: Product[0]['_id'],
                trailerNumber: 0,
                status: "Recovered"
            });


            if (Trailer == "") {
                // console.log((parseFloat(element[11]) * parseFloat(element[13])))
                const newTrailer = new TrailerCollection({
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
                    camePrice: Product[0]['camePrice'],
                    sellPrice: Product[0]['sellPrice'],
                    sellPriceWakil: Product[0]['sellPriceWakil'],
                    sellPriceSharika: Product[0]['sellPriceSharika'],
                    sellPriceMahal: Product[0]['sellPriceMahal'],
                    sellPriceMufrad: Product[0]['sellPriceMufrad'],
                    sellPriceWasta: Product[0]['sellPriceWasta'],
                    totalQuantity: totalRequestedPackets,
                    status: "Recovered",
                    trailerNumber: 0,
                    addedBy: req.user.username,
                    updatedBy: req.user.username,
                    // note: req.params.note,
                    productID: Product[0]['_id'],
                });
                await newTrailer.save();



                //===============Records Collection=============
                const newRecordtoHistory = new RecordsCollection({
                    recordCode: invoiceID,
                    totalQuantity: totalRequestedPackets,
                    status: "Recovered",
                    sellPrice: _SellPrice,
                    totalPrice: _SellPrice * totalRequestedPackets,
                    oldDebut: Profile['remainedbalance'],
                    trailerNumber: 0,
                    addedBy: req.user.username,
                    updatedBy: req.user.username,
                    note: req.body.note,
                    trailerID: newTrailer['_id'],
                    productID: Product[0]['_id'],
                    cutomerID: req.params.id,
                    htmlObject: req.body['tbody'],
                });

                await newRecordtoHistory.save();

                await ProductsCollection.findByIdAndUpdate({
                    _id: Product[0]['_id']
                }, {
                    totalQuantity: Product[0]['totalQuantity'] + totalRequestedPackets
                });



            } else {
                //===============Records Collection=============
                const newRecordtoHistory = new RecordsCollection({
                    recordCode: invoiceID,
                    totalQuantity: totalRequestedPackets,
                    status: "Recovered",
                    sellPrice: _SellPrice,
                    totalPrice: _SellPrice * totalRequestedPackets,
                    oldDebut: Profile['remainedbalance'],
                    trailerNumber: 0,
                    addedBy: req.user.username,
                    updatedBy: req.user.username,
                    note: req.body.note,
                    trailerID: Trailer[0]['_id'],
                    productID: Product[0]['_id'],
                    cutomerID: req.params.id,
                    htmlObject: req.body['tbody'],
                });
                await newRecordtoHistory.save();


                await ProductsCollection.findByIdAndUpdate({
                    _id: Product[0]['_id']
                }, {
                    totalQuantity: Product[0]['totalQuantity'] + totalRequestedPackets
                });



            }


            //     //     var result = Product[0]['totalQuantity'] - totalRequestedPackets;

            //     //     await ProductsCollection.findByIdAndUpdate({
            //     //         _id: Product[0]['_id']
            //     //     }, {
            //     //         totalQuantity: result,
            //     //         updatedBy: req.user.username,
            //     //         $push: {
            //     //             itemHistory: newRecordtoHistory["_id"],
            //     //         }
            //     //     });


            //     //     await ProfileCollection.findByIdAndUpdate({
            //     //         _id: req.params.id
            //     //     }, {
            //     //         updatedBy: req.user.username,
            //     //         $push: {
            //     //             invoiceID: newRecordtoHistory["_id"],
            //     //         }
            //     //     });


            //     //     var numbeOfPacketsinTrailer = Trailer[0]['totalQuantity'] - totalRequestedPackets;

            //     //     await TrailerCollection.findByIdAndUpdate({
            //     //         _id: Trailer[0]['_id']
            //     //     }, {
            //     //         totalQuantity: numbeOfPacketsinTrailer,
            //     //         updatedBy: req.user.username,
            //     //         $push: {
            //     //             invoiceID: newRecordtoHistory["_id"],
            //     //         }
            //     //     });
        }

        setTimeout(async () => {
            await ProfileCollection.findByIdAndUpdate({
                _id: req.params.id
            }, {
                remainedbalance: Profile['remainedbalance'] - parseFloat(req.params.price.replace("$", '')),
            });
        }, 3000);

        res.send("بەرهەمەکە بە سەرکەوتوویی گەڕێندرایەوە");


    } catch (error) {
        next(error)
    }
}

//Delete Items in Invoice
exports.DeleteItemInInvoice = async (req, res, next) => {

    try {
        var RequestList = req.body['tbody'];
        var invoiceID = uuid.v1();
        for (let index = 0; index < RequestList.length; index++) {
            const element = RequestList[index];
            const Product = await ProductsCollection.find({
                itemName: element[1]
            });

            var totalRequestedPackets = parseFloat(element[4]);

            const Trailer = await TrailerCollection.find({
                itemName: element[1],
                trailerNumber: element[6]
            });

            //Prevent 
            //===============Records Collection=============
            const newRecordtoHistory = new RecordsCollection({
                recordCode: invoiceID,
                weight: Product[0]['weight'],
                totalWeight: Product[0]['weight'] * totalRequestedPackets,
                totalQuantity: totalRequestedPackets,
                status: "Recovered Product",
                color: Product[0]['color'],
                camePrice: Trailer[0]['camePrice'],
                sellPrice: Product[0]['sellPrice'],
                totalPrice: Product[0]['sellPrice'] * totalRequestedPackets,
                expireDate: Product[0]['expireDate'],
                trailerNumber: element[6],
                addedBy: req.user.username,
                updatedBy: req.user.username,
                note: req.body.note,
                trailerID: Trailer[0]['_id'],
                productID: Product[0]['_id'],
                cutomerID: req.params.id,
                htmlObject: req.body['tbody']
            });
            await newRecordtoHistory.save();
            var result = Product[0]['totalQuantity'] + totalRequestedPackets;
            await ProductsCollection.findByIdAndUpdate({
                _id: Product[0]['_id']
            }, {
                remainedPacket: parseFloat(result / Product[0]['perPacket']),
                remainedPerPacket: result % Product[0]['perPacket'],
                totalQuantity: result,
                updatedBy: req.user.username,
                totalPrice: Product[0]['totalPrice'] + (totalRequestedPackets * Product[0]['sellPrice']),
                totalWeight: Product[0]['totalWeight'] + (totalRequestedPackets * Product[0]['weight']),
                $push: {
                    itemHistory: newRecordtoHistory["_id"],
                }
            });
            await ProfileCollection.findByIdAndUpdate({
                _id: req.params.id
            }, {
                borrowedBalance: Product[0]['sellPrice'],
                recoveredBalance: Product[0]['sellPrice'],
                // remainedbalance: Product[0]['remainedbalance'] - req.body.recoveredBalance,
                updatedBy: req.user.username,
                $push: {
                    invoiceID: newRecordtoHistory["_id"],
                }
            });



            var numbeOfPacketsinTrailer = Trailer[0]['totalQuantity'] + totalRequestedPackets;
            await TrailerCollection.findByIdAndUpdate({
                _id: Trailer[0]['_id']
            }, {
                remainedPacket: parseFloat(numbeOfPacketsinTrailer / Trailer[0]['perPacket']),
                remainedPerPacket: numbeOfPacketsinTrailer % Trailer[0]['perPacket'],
                totalQuantity: numbeOfPacketsinTrailer,
                updatedBy: req.user.username,
                totalPrice: Trailer[0]['totalPrice'] + (totalRequestedPackets * Trailer[0]['sellPrice']),
                totalWeight: Trailer[0]['totalWeight'] + (totalRequestedPackets * Trailer[0]['weight']),
                $push: {
                    invoiceID: newRecordtoHistory["_id"],
                }
            });
            res.send("Products Recovered").status(200)

        }

    } catch (error) {
        console.log(error)
    }
}

//Delete Items in Invoice
exports.SearchForProductModel = async (req, res, next) => {
    try {
        const Product = await ProductsCollection
            .find({
                itemModel: req.body.itemModel,
            }).sort({
                itemName: 1
            });
        res.send(Product);
    } catch (error) {
        console.log(error)
    }
}


//Add New Invoice for Recovered Items
exports.ProductHistory = async (req, res, next) => {
    try {
        const Records = await RecordsCollection.find({
            status: "New Trailer",
            productID: req.params.id
        }).sort({
            "createdAt": -1
        }).populate('productID');

        // res.json(Records)

        res.render('Products/ProductHistory', {
            title: "تۆماری بەرهەم",
            user: req.user,
            records: Records
        })
    } catch (error) {
        next(error)
    }
}




