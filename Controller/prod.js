const helmet = require('helmet')
const compression = require('compression')


module.exports=function(app){
    app.use(compression());
    app.use(helmet());
}