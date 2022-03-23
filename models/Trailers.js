var mongoose = require('mongoose');

const TrailerSchema = new mongoose.Schema({
    itemName: String,
    itemCode: String,
    itemModel:String,
    itemUnit: String,
    itemType: String,
    manufacturerCompany: String,
    companyCode: String,
    countryCompany: String,
    unit: String,
    usedIn: String, //shweni bakar henan
    weight: Number,
    totalWeight: Number,
    color: String,
    packet: Number, //pakat
    perPacket: Number, // Quantity
    remainedPacket: Number, // Quantity
    remainedPerPacket: Number,
    totalQuantity: Number, // Total Number of All Products
    totalPrice: Number,
    status: String,
    expireDate: Date,
    cost: Number,
    camePrice: Number,
    sellPrice: Number,
    sellPriceMufrad: Number,
    sellPriceMahal: Number,
    sellPriceWasta: Number,
    sellPriceWakil: Number,
    sellPriceSharika: Number,
    trailerNumber: Number,
    moneyStatus: String, // for type of moneyStatus
    addedBy: {
        type: String
    },
    updatedBy: {
        type: String
    },
    softdelete: {
        type: String,
        default: false
    },
    note: String,
    productID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Items'
    },
    invoiceID: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Records'
    }],
}, {
    timestamps: true
});

const TrailerClass = mongoose.model('Trailers', TrailerSchema);

module.exports = TrailerClass;