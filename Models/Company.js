var mongoose = require('mongoose');

const Company = mongoose.model('Company', mongoose.Schema({
    companyName: String,
    note: String,
    softdelete: {
        type: String,
        default: false
    },
}, {
    timestamps: true
}), );

module.exports = Company;