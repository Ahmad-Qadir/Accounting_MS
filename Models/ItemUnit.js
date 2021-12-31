var mongoose = require('mongoose');

const ItemUnitClass = mongoose.model('ItemUnit', mongoose.Schema({
    unitName: {
        type: String,
        unique: true
    },
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
}, {
    timestamps: true
}));

module.exports = ItemUnitClass;