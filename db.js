const dotenv = require('dotenv')
const mongodb = require('mongodb') // install mongodb

dotenv.config()

// install package for .env -> npm install dotenv
// switched from connectionString const to enviroment variable for security reasons, string connection to DB in .env file

mongodb.connect(process.env.CONNECTIONSTRING, {useNewUrlParser: true, useUnifiedTopology: true}, function(err, client){ 
    module.exports = client
    const app = require('./app')
    app.listen(process.env.PORT)
})