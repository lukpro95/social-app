const userCollection = require('../db.js').db().collection('users')
const followsCollection = require('../db.js').db().collection('follows')
const User = require('./User.js')
const ObjectID = require('mongodb').ObjectID

let Follow = function (followedUsername, followerID) {
    this.followedUsername = followedUsername
    this.followerID = followerID
    this.errors = []
}

Follow.prototype.cleanUp = function() {
    if(typeof(this.followedUsername) != 'string') {this.followedUsername = ""}
}

Follow.prototype.validate = async function(action) {
    // followedUsername must exist in DB
    let followedAccount = await userCollection.findOne({username: this.followedUsername})
    if(followedAccount) {
        this.followedID = followedAccount._id
    } else {
        this.errors.push("You cannot follow a user that does not exist.")
    }

    let doesFollowAlreadyExist = await followsCollection.findOne({followedID: this.followedID, followerID: new ObjectID(this.followedID)})
    if(action == "create") {
        if(doesFollowAlreadyExist) {this.errors.push("You are already following this user.")}
    }
    if(action == "delete") {
        if(doesFollowAlreadyExist) {this.errors.push("You cannot stop following someone you do not already follow.")}
    }

    // should not be able to follow yourself
    if(this.followedID.equals(this.followerID)) {this.errors.push("You cannot follow yourself.")}

}

Follow.prototype.create = function() {
    return new Promise(async (resolve, reject) => {
        this.cleanUp()
        await this.validate("create")

        if(!this.errors.length) {
            await followsCollection.insertOne({followedID: this.followedID, followerID: new ObjectID(this.followerID)})
            resolve()
        } else {
            reject(this.errors)
        }

    })
}

Follow.prototype.delete = function() {
    return new Promise(async (resolve, reject) => {
        this.cleanUp()
        await this.validate("delete")

        if(!this.errors.length) {
            await followsCollection.deleteOne({followedID: this.followedID, followerID: new ObjectID(this.followerID)})
            resolve()
        } else {
            reject(this.errors)
        }

    })
}

Follow.isVisitorFollowing = async function (followedID, visitorID) {
    let followDoc = await followsCollection.findOne({followedID: followedID, followerID: new ObjectID(visitorID)})
    if(followDoc) {
        return true
    } else {
        return false
    }
}

Follow.getFollowersByID = function (id) {
    return new Promise(async (resolve, reject) => {
        try {

            let followers = await followsCollection.aggregate([
                {$match: {followedID: id}},
                {$lookup: {from: "users", localField: "followerID", foreignField: "_id", as: "userDoc"}},
                {$project: {
                    username: {$arrayElemAt: ["$userDoc.username", 0]},
                    email: {$arrayElemAt: ["$userDoc.email", 0]}
                }}
            ]).toArray()

            followers = followers.map((follower) => {
                // create a user
                let user = new User(follower, true)
                return {username: follower.username, avatar: user.avatar}
            })

            resolve(followers)
        } catch {
            reject()
        }
    })
}

Follow.getFollowingByID = function (id) {
    return new Promise(async (resolve, reject) => {
        try {

            let following = await followsCollection.aggregate([
                {$match: {followerID: id}},
                {$lookup: {from: "users", localField: "followedID", foreignField: "_id", as: "userDoc"}},
                {$project: {
                    username: {$arrayElemAt: ["$userDoc.username", 0]},
                    email: {$arrayElemAt: ["$userDoc.email", 0]}
                }}
            ]).toArray()

            following = following.map((profileFollowed) => {
                // create a user
                let user = new User(profileFollowed, true)
                return {username: profileFollowed.username, avatar: user.avatar}
            })

            resolve(following)
        } catch {
            reject()
        }
    })
}

Follow.countFollowersByID = function (id) {
    return new Promise(async (resolve, reject) => {
        let followerCount = await followsCollection.countDocuments({followedID: id})
        resolve(followerCount)
    })
}

Follow.countFollowingByID = function (id) {
    return new Promise(async (resolve, reject) => {
        let followingCount = await followsCollection.countDocuments({followerID: id})
        resolve(followingCount)
    })
}

module.exports = Follow