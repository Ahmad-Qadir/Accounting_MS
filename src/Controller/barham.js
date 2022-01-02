// ! Requirements
require('events').EventEmitter.defaultMaxListeners = Infinity
const validator = require("joi");
const config = require('config');
var uuid = require('uuid');
const {
    roles
} = require('../Middleware/roles');

// ! Collections
const ProductsCollection = require('../Models/products');
const RecordsCollection = require('../Models/Records');
const ProfileCollection = require('../Models/Profiles');
const TrailerCollection = require('../Models/Trailers');
const EmployeeClass = require('../Models/employee');
const CompanyCollection = require('../Models/Company');
const ItemUnitCollection = require('../Models/ItemUnit');

// !: Basic Configuration
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

// !: Products
//Add New Product UI
exports.AddNewProduct = async (req, res, next) => {
    try {
        const Company = await CompanyCollection
            .find({
                softdelete: false,
            })

        const ItemUnit = await ItemUnitCollection
            .find({
                softdelete: false,
            })
        res.render('products/AddProduct.pug', {
            title: "زیادکردنی بەرهەمی نوێ",
            company: Company,
            itemUnit: ItemUnit
        })
    } catch (error) {
        next(error)
    }
}

//Add New Product Operation
exports.addNewItem = async (req, res, next) => {
    try {

        const Trailer = await TrailerCollection.find({
            status: "New Trailer",
            softdelete: false
        })

        const Product = await ProductsCollection.findOne({
            itemName: req.body.itemName
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
                totalWeight: req.body.weight * req.body.packet * req.body.perPacket,
                color: req.body.color,
                packet: req.body.packet,
                camePrice: req.body.camePrice,
                sellPriceMufrad: req.body.sellPriceMufrad,
                sellPriceMahal: req.body.sellPriceMahal,
                sellPriceWasta: req.body.sellPriceWasta,
                sellPriceWakil: req.body.sellPriceWakil,
                sellPriceSharika: req.body.sellPriceSharika,
                totalPrice: req.body.sellPriceMufrad * req.body.packet * req.body.perPacket,
                perPacket: req.body.perPacket,
                remainedPacket: req.body.packet,
                remainedPerPacket: req.body.perPacket,
                totalQuantity: req.body.packet * req.body.perPacket,
                status: "New Product",
                expireDate: req.body.expireDate,
                trailerNumber: Trailer.length,
                addedBy: req.user.username,
                updatedBy: req.user.username,
                note: req.body.note
            });
            await newProduct.save();


            const newItem = new RecordsCollection({
                recordCode: uuid.v1(),
                packet: req.body.packet,
                perPacket: req.body.perPacket,
                status: "New Product",
                trailerNumber: Trailer.length,
                addedBy: req.user.username,
                updatedBy: req.user.username,
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

// !: Remove Product

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

//Remove Selected Product
exports.RemoveProduct = async (req, res, next) => {
    const Products = await ProductsCollection
        .findOneAndUpdate({
            _id: req.params.id
        }, {
            softdelete: true
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
    req.flash('success', "بەرهەمەکە بە سەرکەوتوویی ڕەشکرایەوە");
    res.redirect("/Products")
}

// !: Invoices
//Invoice Request Operation
exports.NewInvoice = async (req, res, next) => {

    try {
        var RequestList = req.body['tbody'];
        const Records = await RecordsCollection
            .find({
                status: "Customer Request",
                softdelete: false
            });

        var invoiceID = Records.length;
        for (let index = 0; index < RequestList.length; index++) {
            const element = RequestList[index];
            const Product = await ProductsCollection.find({
                itemName: element[1],
                itemTye: element[2].split('/')[1],
                color: element[2].split('/')[0]
            });

            var totalRequestedPackets = element[4];

            var _SellPrice = parseInt(element[3].replace(/[^0-9]/g, ''))
            if (element[6].split('-')[0] == 0) {
                const Trailer = await RecordsCollection.find({
                    productID: Product[0]['_id'],
                    trailerNumber: 0,
                    status: "Recovered"
                }).populate("productID");

                //Prevent 
                if (Trailer[0]['totalQuantity'] < totalRequestedPackets) {
                    res.send("بەرهەمی " + Trailer[0]['productID']['itemName'] + " تەنها " + Trailer[0]['totalQuantity'] + " ماوە");
                } else {
                    //===============Records Collection=============
                    const newRecordtoHistory = new RecordsCollection({
                        recordCode: invoiceID,
                        totalQuantity: totalRequestedPackets,
                        status: "Customer Request",
                        sellPrice: _SellPrice,
                        trailerNumber: element[6].split('-')[0],
                        addedBy: req.user.username,
                        updatedBy: req.user.username,
                        note: req.body.note,
                        trailerID: Trailer[0]['_id'],
                        productID: Product[0]['_id'],
                        cutomerID: req.params.id,
                        htmlObject: req.body['tbody']
                    });
                    await newRecordtoHistory.save();
                    var result = Product[0]['totalQuantity'] - totalRequestedPackets;
                    await ProductsCollection.findByIdAndUpdate({
                        _id: Product[0]['_id']
                    }, {
                        remainedPacket: parseInt(result / Product[0]['perPacket']),
                        remainedPerPacket: result % Product[0]['perPacket'],
                        totalQuantity: result,
                        updatedBy: req.user.username,
                        totalPrice: Product[0]['totalPrice'] - (totalRequestedPackets * _SellPrice),
                        totalWeight: Product[0]['totalWeight'] - (totalRequestedPackets * Product[0]['weight']),
                        $push: {
                            itemHistory: newRecordtoHistory["_id"],
                        }
                    });
                    await ProfileCollection.findByIdAndUpdate({
                        _id: req.params.id
                    }, {
                        updatedBy: req.user.username,
                        remainedbalance: 0,
                        $push: {
                            invoiceID: newRecordtoHistory["_id"],
                        }
                    });


                    var numbeOfPacketsinTrailer = Trailer[0]['totalQuantity'] - totalRequestedPackets;

                    await RecordsCollection.findByIdAndUpdate({
                        _id: Trailer[0]['_id']
                    }, {
                        remainedPacket: numbeOfPacketsinTrailer / Product[0]['perPacket'],
                        remainedPerPacket: numbeOfPacketsinTrailer % Product[0]['perPacket'],
                        totalQuantity: numbeOfPacketsinTrailer,
                        updatedBy: req.user.username,
                        totalPrice: Trailer[0]['totalPrice'] - (totalRequestedPackets * _SellPrice),
                    });

                }

            } else {
                const Trailer = await TrailerCollection.find({
                    itemName: element[1],
                    itemTye: element[2].split('/')[1],
                    color: element[2].split('/')[0],
                    trailerNumber: element[6].split('-')[0]
                });
                //Prevent 
                if (Trailer[0]['totalQuantity'] < totalRequestedPackets) {
                    res.send("بەرهەمی " + Trailer[0]['itemName'] + " " + Trailer[0]['color'] + " تەنها " + Trailer[0]['totalQuantity'] + " ماوە");
                } else {
                    //===============Records Collection=============
                    const newRecordtoHistory = new RecordsCollection({
                        recordCode: invoiceID,
                        totalQuantity: totalRequestedPackets,
                        status: "Customer Request",
                        sellPrice: _SellPrice,
                        trailerNumber: element[6].split('-')[0],
                        addedBy: req.user.username,
                        updatedBy: req.user.username,
                        note: req.body.note,
                        productID: Product[0]['_id'],
                        cutomerID: req.params.id,
                        htmlObject: req.body['tbody']
                    });
                    await newRecordtoHistory.save();
                    var result = Product[0]['totalQuantity'] - totalRequestedPackets;
                    await ProductsCollection.findByIdAndUpdate({
                        _id: Product[0]['_id']
                    }, {
                        remainedPacket: parseInt(result / Product[0]['perPacket']),
                        remainedPerPacket: result % Product[0]['perPacket'],
                        totalQuantity: result,
                        updatedBy: req.user.username,
                        totalPrice: Product[0]['totalPrice'] - (totalRequestedPackets * _SellPrice),
                        totalWeight: Product[0]['totalWeight'] - (totalRequestedPackets * Product[0]['weight']),
                        $push: {
                            itemHistory: newRecordtoHistory["_id"],
                        }
                    });
                    await ProfileCollection.findByIdAndUpdate({
                        _id: req.params.id
                    }, {
                        updatedBy: req.user.username,
                        remainedbalance: 0,
                        $push: {
                            invoiceID: newRecordtoHistory["_id"],
                        }
                    });


                    var numbeOfPacketsinTrailer = Trailer[0]['totalQuantity'] - totalRequestedPackets;


                    await TrailerCollection.findByIdAndUpdate({
                        _id: Trailer[0]['_id']
                    }, {
                        remainedPacket: numbeOfPacketsinTrailer / Product[0]['perPacket'],
                        remainedPerPacket: numbeOfPacketsinTrailer % Product[0]['perPacket'],
                        totalQuantity: numbeOfPacketsinTrailer,
                        updatedBy: req.user.username,
                        totalPrice: Trailer[0]['totalPrice'] - (totalRequestedPackets * _SellPrice),
                        totalWeight: Trailer[0]['totalWeight'] - (totalRequestedPackets * Trailer[0]['weight']),
                        $push: {
                            invoiceID: newRecordtoHistory["_id"],
                        }
                    });

                }

            }



        }
        res.send("بە سەرکەوتوویی تۆمارکرا")


    } catch (error) {
        console.log(error)
    }
}

//Invoice Request Operation
exports.NewInvoiceForDebut = async (req, res, next) => {

    try {
        var RequestList = req.body['tbody'];
        const Records = await RecordsCollection
            .find({
                status: "Customer Request",
                softdelete: false
            });

        var invoiceID = Records.length;
        const Prof = await ProfileCollection.find({
            _id: req.params.id
        });
        const newRecordtoHistory = new RecordsCollection({
            recordCode: invoiceID,
            status: "Compensate",
            sellPrice: req.params.paid,
            totalQuantity: 1,
            addedBy: req.user.username,
            updatedBy: req.user.username,
            note: req.body.note,
            cutomerID: req.params.id,
        });
        await newRecordtoHistory.save();

        await ProfileCollection.findByIdAndUpdate({
            _id: req.params.id
        }, {
            remainedbalance: Prof[0]['remainedbalance'] - parseInt(req.params.paid),
            $push: {
                invoiceID: newRecordtoHistory["_id"],
            }
        });

        res.send("بە سەرکەوتوویی تۆمارکرا")


    } catch (error) {
        console.log(error)
    }
}

//Invoice Request UI
exports.AddNewRequest = async (req, res, next) => {
    try {
        const Products = await ProductsCollection
            .find({
                id: req.params.id,
                softdelete: false
            })
        const Trailers = await TrailerCollection
            .find({
                softdelete: false,
                productID: req.params.id,
            })

        const Profiles = await ProfileCollection
            .find({
                softdelete: false,
            })

        res.render('products/CustomerRequest', {
            title: "Add New Request",
            product: Products,
            trailer: Trailers,
            profiles: Profiles
        })
    } catch (error) {
        next(error)
    }
}

// !: Products
//Get All Products
exports.getProducts = async (req, res, next) => {
    const Products = await ProductsCollection
        .find({
            softdelete: false,
        })
        .sort({
            "createdAt": -1
        })
    res.render("products/Products", {
        title: "بەرهەمەکان",
        product: Products,
        user: req.user
    })
}

//Get Spedicif Products
exports.getSpecificProducts = async (req, res, next) => {
    var Name = req.params.productName;

    const Product = await ProductsCollection
        .find({
            softdelete: false,
            itemName: Name
        }).populate("itemHistory");

    res.send(Product);
}

//Get All Invoices of Specific Product
exports.getInvoiceofSpecificProduct = async (req, res, next) => {
    const Products = await RecordsCollection
        .find({
            softdelete: false,
            productID: req.params.id
        })
        .sort({
            "createdAt": -1
        }).populate('productID')

    const Profile = await RecordsCollection
        .find({
            softdelete: false,
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
        res.redirect("http://localhost/Products")
    } else {
        res.render("products/invoices", {
            product: Products,
            title: " فاتوورەی " + Products[0]['productID']['itemName'],
            profile: Profile,
            productInfo: ProductInfo
        })
    }
}

//Update Products UI
exports.EditProductUI = async (req, res, next) => {
    try {
        const Product = await ProductsCollection
            .find({
                _id: req.params.id,
                softdelete: false,
            })
        res.render('Products/EditProduct', {
            title: "دەسکاریکردنی بەرهەمی " + Product[0]['itemName'],
            product: Product
        })
    } catch (error) {
        next(error)
    }
}

//Update Products Operation
exports.EditProductOperation = async (req, res, next) => {
    try {
        await ProductsCollection.findByIdAndUpdate({
            _id: req.params.id
        }, {
            sellPriceMufrad: req.body.sellPriceMufrad,
            sellPriceMahal: req.body.sellPriceMahal,
            sellPriceWasta: req.body.sellPriceWasta,
            sellPriceWakil: req.body.sellPriceWakil,
            sellPriceSharika: req.body.sellPriceSharika,
            updatedBy: req.user.username,
        });

        req.flash('success', "بەرهەمەکە بە سەرکەوتوویی نوێکرایەوە");
        res.redirect("/Products")
    } catch (error) {
        next(error)
    }
}

// ! Trailers
//Add New Trailer UI
exports.AddNewTrailer = async (req, res, next) => {
    try {
        const Records = await RecordsCollection
            .find({
                status: "New Trailer",
                softdelete: false
            });

        var invoiceID = Records.length;

        const Products = await ProductsCollection
            .find({
                softdelete: false
            })
        const Trailers = await TrailerCollection
            .find({
                softdelete: false,
            })
        const Company = await CompanyCollection
            .find({
                softdelete: false,
            })

        res.render('products/newTrailer', {
            title: "زیاد کردنی بار",
            products: Products,
            trailers: Trailers,
            invoiceID: invoiceID,
            time: Date(),
            user: req.user,
            company: Company
        })
    } catch (error) {
        next(error)
    }
}

//Add New Trailer Operation
exports.AppendNewTrailertoProduct = async (req, res, next) => {

    try {
        var RequestList = req.body['tbody'];
        var invoiceID = uuid.v1();
        const Trailer = await TrailerCollection.find({
            status: "New Trailer",
            softdelete: false
        }).sort({
            "createdAt": -1
        });

        if (Trailer.length == 0)
            var _TrailerNumber = 0;
        else
            var _TrailerNumber = Trailer[0]['trailerNumber'];

        // console.log("ID: "+RequestList[0][0])                   
        // console.log("Product Name: "+RequestList[0][1])
        // console.log("Product Color: "+RequestList[0][2])
        // console.log("Product Type: "+RequestList[0][3])
        // console.log("Item Unit: "+RequestList[0][4])
        // console.log("Wakil: "+RequestList[0][5])
        // console.log("Sharika: "+RequestList[0][6])
        // console.log("Mahal: "+RequestList[0][7])
        // console.log("Mufrad: "+RequestList[0][8])
        // console.log("Wasta: "+RequestList[0][9])
        // console.log("Total Quantity: "+RequestList[0][10])
        // console.log("Come Price: "+RequestList[0][11])
        // console.log("Sell Price: "+RequestList[0][12])
        // console.log("Total Price: "+RequestList[0][13])


        for (let index = 0; index < RequestList.length; index++) {
            const element = RequestList[index];
            const Product = await ProductsCollection.find({
                itemName: element[1],
                color: element[2],
                itemType: element[3]
            });


            const newRecordtoHistory = new RecordsCollection({
                recordCode: invoiceID,
                totalQuantity: parseInt(element[10]),
                status: "New Trailer",
                camePrice: parseInt(element[11]),
                sellPrice: parseInt(element[12]),
                trailerNumber: _TrailerNumber + 1,
                addedBy: req.user.username,
                updatedBy: req.user.username,
                productID: Product[0]['_id'],
            });
            await newRecordtoHistory.save();


            var quantity = Product[0]['totalQuantity'] + parseInt(element[10]);

            await ProductsCollection.findByIdAndUpdate({
                "_id": Product[0]['_id']
            }, {
                remainedPacket: parseInt(quantity / Product[0]['perPacket']),
                remainedPerPacket: quantity % Product[0]['perPacket'],
                totalQuantity: quantity,
                totalPrice: Product[0]['totalPrice'] + (parseInt(element[10]) * parseInt(element[12])),
                totalWeight: Product[0]['totalWeight'] + (parseInt(element[10]) * Product[0]['weight']),
                sellPriceWakil: parseInt(element[5]),
                sellPriceSharika: parseInt(element[6]),
                sellPriceMahal: parseInt(element[7]),
                sellPriceMufrad: parseInt(element[8]),
                sellPriceWasta: parseInt(element[9]),
                updatedBy: req.user.username,
                $push: {
                    itemHistory: newRecordtoHistory["_id"],
                }
            });
            const newTrailer = new TrailerCollection({
                itemName: Product[0]['itemName'],
                manufacturerCompany: Product[0]['manufacturerCompany'],
                companyCode: Product[0]['companyCode'],
                countryCompany: Product[0]['countryCompany'],
                unit: Product[0]['unit'],
                itemType: Product[0]['itemType'], //[boyax-adawat]
                usedIn: Product[0]['usedIn'],
                color: Product[0]['color'],
                weight: Product[0]['weight'],
                totalWeight: Product[0]['totalWeight'] + (parseInt(element[10]) * Product[0]['weight']),
                camePrice: Product[0]['camePrice'],
                sellPriceWakil: parseInt(element[5]),
                sellPriceSharika: parseInt(element[6]),
                sellPriceMahal: parseInt(element[7]),
                sellPriceMufrad: parseInt(element[8]),
                sellPriceWasta: parseInt(element[9]),
                totalPrice: Product[0]['totalPrice'] + (parseInt(element[10]) * parseInt(element[12])),
                packet: parseInt(element[10]) / Product[0]['packet'],
                perPacket: parseInt(element[10]) % Product[0]['packet'],
                remainedPacket: parseInt(element[10]) / Product[0]['packet'],
                remainedPerPacket: parseInt(element[10]) % Product[0]['packet'],
                totalQuantity: parseInt(element[10]),
                status: "New Trailer",
                expireDate: Product[0]['expireDate'],
                trailerNumber: _TrailerNumber + 1,
                addedBy: req.user.username,
                updatedBy: req.user.username,
                note: req.body.note,
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

//Check For Product Price In Trailer
exports.CheckForProductPriceInTrailer = async (req, res, next) => {
    try {
        const Products = await ProductsCollection
            .find({
                itemName: req.params.productName,
                itemType: req.params.itemType,
                color: req.params.color,
                softdelete: false
            })
        const Trailers = await TrailerCollection
            .find({
                trailerNumber: isNaN(parseInt(req.params.trailerNum)) ? 0 : parseInt(req.params.trailerNum),
                softdelete: false,
                productID: Products[0]["_id"],
                status: "New Trailer"
            })
        res.send(Trailers[0])

    } catch (error) {
        next(error)
    }
}

// ! Recover Product
//Add New Invoice for Recovered Items
exports.AddNewRecover = async (req, res, next) => {
    try {
        const Products = await ProductsCollection
            .find({
                _id: req.params.id,
                softdelete: false
            })
        const Profiles = await ProfileCollection
            .find({})
        res.render('Products/AddNewRecover', {
            title: "گەڕانەوە بۆ " + Products[0]['itemName'],
            product: Products,
            user: req.user,
            profiles: Profiles
        })
    } catch (error) {
        next(error)
    }
}

exports.RecoveredSoldProducts = async (req, res, next) => {
    const Product = await ProductsCollection.find({
        _id: req.params.id
    });
    try {
        var totalRecoveredPackets = parseInt(req.body.perPacket);

        const Recovered = await RecordsCollection
            .find({
                softdelete: false,
                productID: Product[0]["_id"],
                status: "Recovered"
            })
        if (Recovered != "") {

            await RecordsCollection.findByIdAndUpdate({
                _id: Recovered[0]['_id']
            }, {
                totalQuantity: Recovered[0]['totalQuantity'] + totalRecoveredPackets,
                updatedBy: req.user.username,
                totalPrice: Product[0]['totalPrice'] + (totalRecoveredPackets * Product[0]['sellPriceMufrad']),
            });

            //Prevent 
            var result = Product[0]['totalQuantity'] + totalRecoveredPackets;

            await ProductsCollection.findByIdAndUpdate({
                _id: req.params.id
            }, {
                remainedPacket: parseInt(result / Product[0]['perPacket']),
                remainedPerPacket: result % Product[0]['perPacket'],
                totalQuantity: result,
                updatedBy: req.user.username,
                totalPrice: Product[0]['totalPrice'] + (result * Product[0]['sellPriceMufrad']),
                totalWeight: Product[0]['totalWeight'] + (result * Product[0]['weight']),
            });

            await ProfileCollection.findByIdAndUpdate({
                _id: req.body.cutomerID
            }, {
                updatedBy: req.user.username,
                $push: {
                    invoiceID: Recovered[0]["_id"],
                }
            });
            req.flash('success', "بەرهەمەکە بە سەرکەوتوویی گەڕێندرایەوە");
            res.redirect('/Products')
        } else {
            const newRecordtoHistory = new RecordsCollection({
                recordCode: uuid.v1(),
                itemName: Product[0]['itemName'],
                itemCode: Product[0]["itemCode"],
                manufacturerCompany: Product[0]["manufacturerCompany"],
                companyCode: Product[0]["companyCode"],
                countryCompany: Product[0]["countryCompany"],
                unit: Product[0]["unit"],
                itemType: Product[0]["itemType"],
                usedIn: Product[0]["usedIn"],
                weight: Product[0]["weight"],
                totalWeight: totalRecoveredPackets * Product[0]["weight"],
                color: Product[0]["color"],
                price: Product[0]["price"],
                colorCode: Product[0]["colorCode"],
                camePrice: Product[0]["camePrice"],
                sellPriceMufrad: Product[0]["sellPriceMufrad"],
                sellPriceMahal: Product[0]["sellPriceMahal"],
                sellPriceWasta: Product[0]["sellPriceWasta"],
                sellPriceWakil: Product[0]["sellPriceWakil"],
                sellPriceSharika: Product[0]["sellPriceSharika"],
                totalPrice: Product[0]["sellPriceMufrad"] * totalRecoveredPackets,
                totalQuantity: totalRecoveredPackets,
                status: "Recovered",
                expireDate: Product[0]["expireDate"],
                trailerNumber: 0,
                addedBy: req.user.username,
                updatedBy: req.user.username,
                note: req.body.note,
                cutomerID: req.body.cutomerID,
                productID: req.params.id,
            });
            await newRecordtoHistory.save();


            //Prevent 
            var result = Product[0]['totalQuantity'] + totalRecoveredPackets;

            await ProductsCollection.findByIdAndUpdate({
                _id: req.params.id
            }, {
                remainedPacket: parseInt(result / Product[0]['perPacket']),
                remainedPerPacket: result % Product[0]['perPacket'],
                totalQuantity: result,
                updatedBy: req.user.username,
                totalPrice: Product[0]['totalPrice'] + (result * Product[0]['sellPriceMufrad']),
                totalWeight: Product[0]['totalWeight'] + (result * Product[0]['weight']),
            });

            await ProfileCollection.findByIdAndUpdate({
                _id: req.body.cutomerID
            }, {
                updatedBy: req.user.username,
                $push: {
                    invoiceID: newRecordtoHistory["_id"],
                }
            });
            req.flash('success', "بەرهەمەکە بە سەرکەوتوویی گەڕێندرایەوە");
            res.redirect('/Products')
        }



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

            var totalRequestedPackets = parseInt(element[4]);

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
                remainedPacket: parseInt(result / Product[0]['perPacket']),
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
                remainedPacket: parseInt(numbeOfPacketsinTrailer / Trailer[0]['perPacket']),
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
        var Name = req.params.productModel;

        const Product = await ProductsCollection
            .find({
                softdelete: false,
                itemName: Name
            });
        res.send(Product);
    } catch (error) {
        console.log(error)
    }
}


//Search for Products of Specific Company
exports.SearchForProductsinCompany = async (req, res, next) => {
    try {
        var CompanyName = req.params.company;
        const Product = await ProductsCollection
            .find({
                softdelete: false,
                manufacturerCompany: CompanyName
            }).sort({
                "itemName": 1
            });
        res.send(Product);
    } catch (error) {
        console.log(error)
    }
}

//TODO==================================