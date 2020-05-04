// a blueprint for a user object
// important lesson!!! Dont overuse arrow functions. These don't work with this keywords, nor when you need to come back and use such function again
// it leaves no reference, so don't use them on object models for this example
// but also arrow function doesnt manipulate this keyword, so we are safe in other examples

const bcrypt = require('bcryptjs')
const validator = require('validator')
const usersCollection = require('../db.js').db().collection("users")
const md5 = require('md5')

let User = function(data, getAvatar) {
    this.data = data
    this.errors = []
    if(getAvatar) {this.getAvatar()} else {getAvatar = false}
}

User.prototype.cleanUp = function() {
    if(typeof(this.data.username)   != "string"){this.data.username = ""}
    if(typeof(this.data.email)      != "string"){this.data.email = ""}
    if(typeof(this.data.password)   != "string"){this.data.password = ""}

    // get rid of any bogus properties
    this.data = {
        username: this.data.username.trim().toLowerCase(),
        email: this.data.email.trim().toLowerCase(),
        password: this.data.password
    }

}

User.prototype.validate = function() {
    return new Promise(async (resolve, reject) => { // async to enable await keyword
        if(this.data.username == ''){this.errors.push("You must provide a username.")}
        if(this.data.username.length > 0 && this.data.username.length < 4){this.errors.push("Username must be at least 4 characters long.")}
        if(this.data.username.length > 30) {this.errors.push("Username cannot exceed 30 characters.")}
        if(this.data.username.length != '' && !validator.isAlphanumeric(this.data.username)) {this.errors.push("Username can only contain letters and numbers!")}
    
        // download email validator -> npm install validator
        if(!validator.isEmail(this.data.email)){this.errors.push("You must provide a valid email address.")}
    
        if(this.data.password == ''){this.errors.push("You must provide a password.")}
        if(this.data.password.length > 0 && this.data.password.length < 8){this.errors.push("Password must be at least 8 characters long.")}
        if(this.data.password.length > 40) {this.errors.push("Password cannot exceed 40 characters.")}
    
        // Only if username is valid then check if it's already taken
        if(this.data.username.length > 3 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)){
            let usernameExists = await usersCollection.findOne({username: this.data.username})
            if(usernameExists){this.errors.push("That username is already taken.")}
        }
    
        // Only if email is valid then check if it's already taken
        if(validator.isEmail(this.data.email)){
            let emailExists = await usersCollection.findOne({email: this.data.email})
            if(emailExists){this.errors.push("That email is already being used.")}
        }

        resolve()
    })
}

User.prototype.login = function() {
    return new Promise((resolve, reject) => {
        this.cleanUp()
        usersCollection.findOne({username: this.data.username}).then((attemptedClient) => {
            if(attemptedClient && bcrypt.compareSync(this.data.password, attemptedClient.password)){
                this.data = attemptedClient
                this.getAvatar()
                resolve("Congrats.")
            } else {
                reject("Invalid username / password")
            }
        }).catch(function(){
            reject("Please try again later.")
        }) // mongodb uses promises, so they are up to date with new javascript feature
    })
}

User.prototype.register = function(){
    return new Promise(async (resolve, reject) => {
        // Step #1: Validate user data
        this.cleanUp()
        await this.validate()
    
        // Step #2: Only if! there are no validation errors then save the user data into a database
        if (!this.errors.length) {
            // hash user password
            let salt = bcrypt.genSaltSync(10)
            this.data.password = bcrypt.hashSync(this.data.password, salt)
            await usersCollection.insertOne(this.data)

            this.getAvatar()
            resolve()
        } else {
            reject(this.errors)
        }
    })
}

User.prototype.getAvatar = function() {
    this.avatar = `https://www.prchecker.info/free-icons/128x128/linux_128_px.png` // next time try to use 3rd party company to store images for us
}

User.findByUsername = function (username) {
    return new Promise(function(resolve, reject) {
        if (typeof(username) != "string") {
            reject()
        } else {

            usersCollection.findOne({username: username})
            .then((userDocument) => {
                if(userDocument){
                    userDocument = new User(userDocument, true)
                    userDocument = {
                        _id: userDocument.data._id,
                        username: userDocument.data.username,
                        avatar: userDocument.avatar
                    }
                    resolve(userDocument)
                } else {
                    reject()
                }
            })
            .catch(() => {
                reject()
            })

        }
    })
}

User.doesEmailExist = function(email) {
    return new Promise(async (resolve, reject) => {
        if(typeof(email) != "string") {
            resolve(false)
            return
        }

        let user = await usersCollection.findOne({email: email})
        if(user) {
            resolve(true)
        } else {
            resolve(false)
        }
    })
}

module.exports = User