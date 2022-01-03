require('events').EventEmitter.defaultMaxListeners = Infinity
const validator = require("joi");
const config = require('config');


//Collections Section
const ProductsCollection = require('../Models/Product');
const CustomerTypeCollection = require('../Models/CustomerType');
const HistoryClass = require('../Models/Records');
const ProfileCollection = require('../Models/Profiles');
const TrailerCollection = require('../Models/Trailers');
const DailyCollection = require('../Models/Daily_Task');
const address=config.get('Default-Address')

const {
    roles
} = require('../Middleware/roles');

// !: Basic Configuration
//Authorization
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

//Authentication
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

exports.AddnewTask = async (req, res, next) => {
    try {
        const validationSchema = {
            task: validator.string().required(),
            money: validator.number().required(),
            moneyType: validator.string().required(),
            note: validator.string()
        }
        const resultOfValidator = validator.validate(req.body, validationSchema);
        if (resultOfValidator.error) {
            req.flash('danger', resultOfValidator.error.details[0].message);
            res.redirect(process.env.address+"/NewDailyTask")
        } else {
            const Task = await DailyCollection({
                task: req.body.task,
                money: req.body.money,
                moneyType: req.body.moneyType,
                note: req.body.note,
                createdBy: req.user.username
            });

            await Task.save();
            res.redirect('/Daily')
        }
    } catch (error) {
        next(error)
    }
}

//Get All Tasks
exports.GetAllTasks = async (req, res, next) => {
    const Task = await DailyCollection
        .find({
            softdelete: false,
        })
        .sort({
            "createdAt": -1
        })

    var totalMoneyOfDinar = 0;
    var totalMoneyOfDolar = 0;


    for (let index = 0; index < Task.length; index++) {
        const element = Task[index];
        if (element['moneyType'] == "دینار")
            totalMoneyOfDinar = totalMoneyOfDinar + element['money']
        else
            totalMoneyOfDolar = totalMoneyOfDolar + element['money']
    }


    res.render("Daily/Daily_Task", {
        title: "کاری ڕۆژانە",
        task: Task,
        user: req.user,
        totalMoneyOfDinar: totalMoneyOfDinar,
        totalMoneyOfDolar:totalMoneyOfDolar
    })
}

//Get All Tasks
exports.GetNewTaskUI = async (req, res, next) => {
    res.render("Daily/NewTask", {
        title: "کاری نوێ",
        user: req.user
    })
}
