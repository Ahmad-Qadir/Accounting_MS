var mongoose = require('mongoose');

const CustomerType = mongoose.model('Customer_Type', mongoose.Schema({
    customerType: String,
    note: String,
    softdelete: {
        type: String,
        default: false
    },
}, {
    timestamps: true
}), );

module.exports = CustomerType;