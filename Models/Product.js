var mongoose = require('mongoose');

const ItemsSchema = new mongoose.Schema({
    itemName: String,
    itemCode: String,
    itemModel:String,
    itemUnit: String,
    itemType: String,
    manufacturerCompany: String,
    companyCode: String,
    countryCompany: String,
    unit: String,
    packet: Number, //pakat
    usedIn: String, //shweni bakar henan
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
    itemHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Records'
    }],
}, {
    timestamps: true
});

const ItemsClass = mongoose.model('Items', ItemsSchema);

module.exports = ItemsClass;