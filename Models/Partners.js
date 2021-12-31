var mongoose = require('mongoose');

const PartnersClass = mongoose.model('Partners', mongoose.Schema({
    username: {
        type: String,
    },
    balance: {
        type: String,
    },
    history: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Records"
    }],
    rate: Number,
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

module.exports = PartnersClass;