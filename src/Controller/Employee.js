require('events').EventEmitter.defaultMaxListeners = Infinity
const jwt = require('jsonwebtoken');
const validator = require("joi");
const config = require('config');

//Collections Section
const EmployeeClass = require('../Models/employee');
const {
    roles
} = require('../Middleware/roles')

const ProductsCollection = require('../Models/Products');
const EmployeeCollection = require('../Models/employee');

async function hashPassword(password) {
    return await Bcrypt.hash(password, Bcrypt.genSaltSync(10));
}

async function validatePassword(plainPassword, hashedPassword) {
    return await Bcrypt.compare(plainPassword, hashedPassword);
}

exports.grantAccess = function (action, resource) {
    return async (req, res, next) => {
        try {
            const permission = roles.can(req.user.role)[action](resource);
            if (!permission.granted) {
                return res.status(401).json({
                    error: "You don't have enough permission to perform this action"
                });
            }
            next()
        } catch (error) {
            next(error)
        }
    }
}

exports.allowIfLoggedin = async (req, res, next) => {
    try {
        const user = res.locals.loggedInUser;
        if (!user)
            return res.status(401).json({
                error: "You need to be logged in to access this route"
            });
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
}

exports.getRegistrationPage = async (req, res, next) => {
    try {
        res.render('Employees/Add_New', {
            title: "Add New Employee",
        })
    } catch (error) {
        next(error)
    }
}


exports.signup = async (req, res, next) => {
    try {
        const validationSchema = {
            username: validator.string().required().lowercase().min(3),
            fullname: validator.string().required().regex(/([A-Z][a-z]{3,} )([A-Z][a-z]{3,} )([A-Z][a-z]{3,})/),
            phoneNumber: validator.string().required().regex(/^\d{4}\d{7}$/),
            role: validator.required().valid(["Admin", "Employee"]),
            ratio:validator.required()
        }
        const resultOfValidator = validator.validate(req.body, validationSchema);
        if (resultOfValidator.error) {
            res.status(400).send({
                message: resultOfValidator.error.details[0].message
            });
        } else {
            var user = await EmployeeClass.findOne({
                username: req.body.username
            });
            if (user) {
                return res.json({
                    message: "The username exist"
                });
            } else {
                // var password = "Ahmad1998"
                // var password = Math.random().toString(36).slice(2);
                // password = Bcrypt.hashSync(password, Bcrypt.genSaltSync(10));
                const newEmployee = new EmployeeClass({
                    username: req.body.username,
                    password:  req.body.password,
                    fullname: req.body.fullname,
                    phoneNumber: req.body.phoneNumber,
                    role: req.body.role,
                    ratio:req.body.ratio
                });
                await newEmployee.save();
                res.send(newEmployee)
            }
        }
    } catch (error) {
        next(error)
    }
}

exports.login = async (req, res, next) => {
    try {
        const {
            username,
            password
        } = req.body;
        const user = await EmployeeClass.findOne({
            username
        });
        const validPassword = true;
        if (!user) {
            req.flash('danger', "Username does not exist");
            res.redirect("https://accounting-ms.herokuapp.com");
        } else if (!validPassword) {
            req.flash('danger', "Password is not Correct");
            res.redirect("https://accounting-ms.herokuapp.com");
        } else {
            const accessToken = jwt.sign({
                userId: user._id
            }, config.get("privateKey"), {
                expiresIn: "30d"
            });
            res.cookie('x-access-token', accessToken, {
                maxAge: 2592000000,
                httpOnly: true
            });
            res.redirect('/')
        }
    } catch (error) {
        next(error);
    }
}

exports.logout = async (req, res, next) => {
    try {
        res.clearCookie("x-access-token");
        res.render('Login', {
            title: "Login",
        })
    } catch (error) {
        next(error);
    }
}

exports.getUsers = async (req, res, next) => {
    const employee = await EmployeeClass.find({}).select("-password -updatedAt");
    res.render('Employees/Employees', {
        title: "Employees",
        employees: employee,
    })
}

exports.getChangePasswordPage = async (req, res, next) => {
    try {
        res.render('Profile/changepass', {
            title: "Change Password",
        });
    } catch (error) {
        next(error)
    }
}

exports.UpdatePassword = async (req, res, next) => {
    try {
        var oldPass = req.body.oldpass;
        var newPass = req.body.newpass;
        const validPassword = await validatePassword(oldPass, req.user.password);
        if (!validPassword) {
            console.log('Password is not correct')
        } else {
            newPass = await Bcrypt.hashSync(newPass, Bcrypt.genSaltSync(10));
            await EmployeeClass.findByIdAndUpdate({
                _id: req.user._id
            }, {
                $set: {
                    password: newPass
                }
            });
        }
        res.redirect(config.get('Default-Address') + "/MyAccount")
    } catch (error) {
        next(error)
    }
}

exports.getMyAccount = async (req, res, next) => {
    try {
        const result = await EmployeeCollection.findOne({
            "_id": req.user._id
        })
        res.render('Employee/Account', {
            title: "My Account",
            result: result,
            user:req.user
        });
    } catch (error) {
        next(error)
    }
}



















exports.getUser = async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const user = await EmployeeClass.find({
            "_id": userId
        }).select("-password -updatedAt");
        if (!user) return next(new Error('User does not exist'));
        res.status(200).json({
            data: user
        });
    } catch (error) {
        next(error)
    }
}

exports.updateUser = async (req, res, next) => {
    try {
        const {
            role
        } = req.body
        const userId = req.params.userId;
        await User.findByIdAndUpdate(userId, {
            role
        });
        const user = await User.findById(userId)
        res.status(200).json({
            data: user
        });
    } catch (error) {
        next(error)
    }
}

exports.deleteUser = async (req, res, next) => {
    try {
        const userId = req.params.userId;
        await User.findByIdAndDelete(userId);
        res.status(200).json({
            data: null,
            message: 'User has been deleted'
        });
    } catch (error) {
        next(error)
    }
}