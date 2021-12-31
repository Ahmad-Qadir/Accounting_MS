const AccessControl = require("accesscontrol");
const ac = new AccessControl();

exports.roles = (function () {
    ac.grant("Admin")
        .updateAny("products")
        .updateOwn("products")
        .deleteAny("products")
        .createAny("products")
        .readAny('products')
        .readAny('records')
        .readOwn('products')
        .deleteAny('invoice')
        .readAny('invoice')
        .updateAny('invoice')
        .readOwn('profile')
        .readAny('profile')
        .createAny('profile')
        .readAny('company')
        .createAny('company')

    return ac;
})();