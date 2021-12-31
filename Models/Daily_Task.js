var mongoose = require('mongoose');

const Daily = mongoose.model('Daily_Task', mongoose.Schema({
    task: String,
    note: String,
    createdBy:String,
    money:Number,
    moneyType:String,
    softdelete: {
        type: String,
        default: false
    },
}, {
    timestamps: true
}), );

module.exports = Daily;