var mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('config');

const employeesSchema = new mongoose.Schema({
    username: String,
    password: {
        type: String,
        default: Math.random().toString(36).slice(2)
    },
    fullname: String,
    phoneNumber: String,
    role: {
        type: String,
        default: 'Admin',
        enum: ["Admin", "Employee"]
    },
    balance: Number,
    ratio: Number,
    historyID: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Records"
    }]
}, {
    timestamps: true
});

employeesSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({
        _id: this._id
    }, "TitanService_jwtPrivateKey", {
        expiresIn: "30d"
    });
    return token;
}
const EmployeesClass = mongoose.model('employees', employeesSchema);

module.exports = EmployeesClass;