// ! Requirements
require('events').EventEmitter.defaultMaxListeners = Infinity
const {
    roles
} = require('../Middleware/roles');

// ! Collections
const TrailersCollection = require('../Models/trela');

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

// !: Trailers
exports.Trailers = async (req, res, next) => {
    try {
        const Trailers = await TrailersCollection
            .aggregate([{
                $sort: { "createdAt": -1 },
                $group: { "_id": { trailerNumber: "$trailerNumber" }, Files: { $push: "$$ROOT" } }
            }])

        res.json(Trailers)
        // res.render('Trailers/Trailers', {trailers: Trailers,title:"بارهەڵگرەکان"})
    } catch (error) {
        next(error)
    }
}
