var mongoose = require('mongoose');

const ProfileClass = mongoose.model('Profiles', mongoose.Schema({
    clientName: String,
    phoneNumber: String,
    secondPhoneNumber: String,
    companyName: String,
    clientType: String,
    borrowedBalance: Number,
    recoveredBalance: Number,
    remainedbalance: Number,
    location:String,
    addedBy: {
        type: String
    },
    updatedBy: {
        type: String
    },
    softdelete: {
        type: Boolean,
        default: false
    },
    invoiceID: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Records"
    }],
    note: String
}, {
    timestamps: true
}), );

module.exports = ProfileClass;