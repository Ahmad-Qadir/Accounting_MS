var mongoose = require('mongoose');

const itemHistorySchema = new mongoose.Schema({
    recordCode: String,
    packet: Number, //pakat
    perPacket: Number, // Quantity
    totalQuantity: Number,
    status: String,
    trailerNumber: Number,
    camePrice: Number,
    cost: Number,
    oldDebut:Number, //bakarde lo customer bzani qardy koni chand bwa
    sellPrice: Number, // bakarde bo bashy chapkrdni tomari customer
    sellPriceMufrad: Number,
    sellPriceMahal: Number,
    sellPriceWasta: Number,
    sellPriceWakil: Number,
    sellPriceSharika: Number,
    totalPrice: Number, // bakarde bo away bzani wasly esta chand bwa
    personName: String, 
    moneyStatus: String,
    addedBy: {
        type: String
    },
    updatedBy: {
        type: String
    },
    productID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Items"
    },
    cutomerID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Profiles"
    },
    softdelete: {
        type: String,
        default: false
    },
    htmlObject: [],
    note: String
}, {
    timestamps: true
});

const HistoryClass = mongoose.model('Records', itemHistorySchema);

module.exports = HistoryClass;