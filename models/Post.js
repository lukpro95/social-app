const postsCollection = require('../db.js').db().collection("posts")
const followsCollection = require('../db.js').db().collection("follows")
const ObjectID = require('mongodb').ObjectID
const User = require('./User.js')
const sanitizeHTML = require('sanitize-html')

let Post = function(data, userID, requestedPostID) {
    this.data = data
    this.errors = []
    this.userID = userID
    this.requestedPostID = requestedPostID
}

Post.prototype.cleanUp = function(){
    if(typeof(this.data.title) != "string") {this.data.title = ""}
    if(typeof(this.data.body) != "string") {this.data.title = ""}

    //boguses
    this.data = {
        author: ObjectID(this.userID),
        title: sanitizeHTML(this.data.title.trim(), {allowedTags: [], allowedAttributes: []}),
        body: sanitizeHTML(this.data.body.trim(), {allowedTags: [], allowedAttributes: []}),
        createdDate: new Date()
    }
}

Post.prototype.validate = function(){
    if(this.data.title == "") {"You need a title to create the post!"}
    if(this.data.body == "") {"You need some content here to create the post!"}
}

Post.prototype.create = function(){
    return new Promise((resolve, reject) => {
        this.cleanUp()
        this.validate()

        if(!this.errors.length){
            // save post into database
            postsCollection.insertOne(this.data)
            .then((info) => {
                resolve(info.ops[0]._id)
            })
            .catch(() => {
                this.errors.push("Please try again later.")
                reject(this.errors)
            })
        } else {
            reject(this.errors)
        }

    })
}

Post.prototype.update = function () {
    return new Promise(async (resolve, reject) => {
        try {
            let post = await Post.findPostByID(this.requestedPostID, this.userID)
            if(post.isVisitorOwner){
                let status = await this.actuallyUpdate()
                resolve(status)
            } else {
                reject()
            }
        } catch {
            reject()
        }
    })
}

Post.prototype.actuallyUpdate = function() {
    return new Promise(async (resolve, reject) => {
        this.cleanUp()
        this.validate()
        if(!this.errors.length){
            await postsCollection.findOneAndUpdate({_id: new ObjectID(this.requestedPostID)}, {$set: {title: this.data.title, body: this.data.body}})
            resolve("success")
        } else {
            resolve("failure")
        }
    })
}

Post.reusablePostQuery = function(uniqueOperations, visitorID) {
    return new Promise(async function(resolve, reject){

        let aggOperations = uniqueOperations.concat([
            {$lookup: {from: "users", localField: "author", foreignField: "_id", as: "authorDocument"}},
            {$project: {
                title: 1,
                body: 1,
                createdDate: 1,
                authorID: "$author",
                author: {$arrayElemAt: ["$authorDocument", 0]}
            }}
        ])

        let posts = await postsCollection.aggregate(aggOperations).toArray()

        // clean up author property in each post object
        posts = posts.map((post) => {
            post.isVisitorOwner = post.authorID.equals(visitorID)
            post.authorID = undefined
            post.author = {
                username: post.author.username,
                avatar: new User(post.author, true).avatar
            }
            return post
        })

        resolve(posts)

    })
}

Post.findPostByID = function(id, visitorID) {
    return new Promise(async (resolve, reject) => {

        if(!typeof(id) == "string" || !ObjectID.isValid(id)) {
            reject()
        } else {

            let posts = await Post.reusablePostQuery([
                {$match: {_id: new ObjectID(id)}}
            ], visitorID)

            if(posts.length) {
                resolve(posts[0])
            } else {
                reject()
            }

        }

    })
}

Post.findByAuthorID = function (authorID) {
    return Post.reusablePostQuery([
        {$match: {author: new ObjectID(authorID)}},
        {$sort: {createdDate: -1}}
    ])
}

Post.delete = function(postID, visitorID) {
    return new Promise(async (resolve, reject) => {
        try {
            let post = await Post.findPostByID(postID, visitorID)
            if(post.isVisitorOwner) {
                await postsCollection.deleteOne({_id: new ObjectID(postID)})
                resolve()
            } else {
                reject()
            }
        } catch {
            reject()
        }
    })
}

Post.search = function(searchTerm) {
    return new Promise(async (resolve, reject) => {
        if(typeof(searchTerm) == "string"){
            let posts = await Post.reusablePostQuery([
                {$match: {$text: {$search: searchTerm}}},
                {$sort: {score: {$meta: "textScore"}}}
            ])
            resolve(posts)
        } else {
            reject()
        }
    })
}

Post.countPostsByAuthor = function (id) {
    return new Promise(async (resolve, reject) => {
        let postCount = await postsCollection.countDocuments({author: id})
        resolve(postCount)
    })
}

Post.getFeed = async function (id) {
    // create an array of a user IDs that current user follows
    let followedUsers = await followsCollection.find({followerID: new ObjectID(id)}).toArray()
    followedUsers = followedUsers.map(function(followDoc) {
        return followDoc.followedID
    })

    // look for posts where the author is in the above array of followed users
    return Post.reusablePostQuery([
        {$match: {author: {$in: followedUsers}}},
        {$sort: {createdDate: -1}}
    ])
}

module.exports = Post