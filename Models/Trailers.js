var mongoose = require('mongoose');

const TrailerSchema = new mongoose.Schema({
    itemName: {
        type: String,
    },
    itemCode: {
        type: String,
    },
    manufacturerCompany: String,
    itemUnit: String,

    companyCode: String,
    countryCompany: String,
    unit: String,
    itemType: String,
    weight: Number,
    totalWeight: Number,
    color: String,
    packet: Number, //pakat
    perPacket: Number, // Quantity
    remainedPacket: Number, // Quantity
    remainedPerPacket: Number,
    totalQuantity: Number, // Total Number of All Products
    status: String,
    expireDate: Date,
    camePrice: Number,
    sellPriceMufrad: Number,
    sellPriceMahal: Number,
    sellPriceWasta: Number,
    sellPriceWakil: Number,
    sellPriceSharika: Number,
    totalPrice: Number,
    trailerNumber: Number,
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