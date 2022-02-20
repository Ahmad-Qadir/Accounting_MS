var mongoose = require('mongoose');

const Company = mongoose.model('Company', mongoose.Schema({
    companyName: String,
    note: String,
    remainedbalance: Number,
    phoneNumber: String,
    location: String,
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
    invoiceID: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Records"
    }],
}, {
    timestamps: true
}));

module.exports = Company;