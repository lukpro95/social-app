import axios from 'axios' // to check databases, sending requests

export default class RegistrationForm {

    constructor() {
        this._csrf = document.querySelector('[name="_csrf"]').value //selecting by name
        this.form = document.querySelector("#registration-form")
        this.allFields = document.querySelectorAll("#registration-form .form-control")
        this.insertValidationElements()
        this.username = document.querySelector("#username-register")
        this.username.previousValue = ""
        this.email = document.querySelector("#email-register")
        this.email.previousValue = ""
        this.password = document.querySelector("#password-register")
        this.password.previousValue = ""
        this.username.isUnique = false
        this.email.isUnique = false
        this.events()
    }

    // events
    events() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault()
            this.formSubmitHandler()
        })

        this.username.addEventListener('keyup', () => {
            this.isDifferent(this.username, this.usernameHandler)
        })
        this.email.addEventListener('keyup', () => {
            this.isDifferent(this.email, this.emailHandler)
        })
        this.password.addEventListener('keyup', () => {
            this.isDifferent(this.password, this.passwordHandler)
        })

        this.username.addEventListener('blur', () => {
            this.isDifferent(this.username, this.usernameHandler)
        })
        this.email.addEventListener('blur', () => {
            this.isDifferent(this.email, this.emailHandler)
        })
        this.password.addEventListener('blur', () => {
            this.isDifferent(this.password, this.passwordHandler)
        })
    }

    // methods

    formSubmitHandler() {
        this.usernameImmediately()
        this.usernameAfterDelay()
        this.emailAfterDelay()
        this.passwordImmediately()
        this.passwordAfterDelay()

        if (
                this.username.isUnique && 
                !this.username.errors && 
                this.email.isUnique && 
                !this.email.errors &&
                !this.password.errors
            ) {
            this.form.submit()
        }

    }

    isDifferent(element, handler) {
        if(element.previousValue != element.value) {
            handler.call(this)
        }
        element.previousValue = element.value
    }

    usernameHandler() {
        this.username.errors = false
        this.usernameImmediately()
        clearTimeout(this.username.timer)
        this.username.timer = setTimeout(() => this.usernameAfterDelay(), 1200)
    }

    emailHandler() {
        this.email.errors = false
        clearTimeout(this.email.timer)
        this.email.timer = setTimeout(() => this.emailAfterDelay(), 1200)
    }

    passwordHandler() {
        this.password.errors = false
        this.passwordImmediately()
        clearTimeout(this.password.timer)
        this.password.timer = setTimeout(() => this.passwordAfterDelay(), 1200)
    }

    usernameImmediately() {
        if(this.username.value != "" && !/^([a-zA-Z0-9]+)$/.test(this.username.value)) {
            this.showValidationError(this.username, "Username can only contain letters and numbers.")
        }

        if(this.username.value.length > 30) {
            this.showValidationError(this.username, "Username has to be at most 30 characters long.")
        }

        if(!this.username.errors) {
            this.hideValidationError(this.username)
        }
    }

    passwordImmediately() {
        if(this.password.value.length > 30) {
            this.showValidationError(this.password, "Password cannot exceed 30 characters.")
        }

        if(!this.password.errors) {
            this.hideValidationError(this.password)
        }
    }

    passwordAfterDelay() {
        if(this.password.value.length < 8) {
            this.showValidationError(this.password, "Password must be at least 8 characters long.")
        }
    }

    showValidationError(element, message) {
        element.nextElementSibling.innerHTML = message
        element.nextElementSibling.classList.add("liveValidateMessage--visible")
        element.errors = true
    }

    hideValidationError(element) {
        element.nextElementSibling.classList.remove("liveValidateMessage--visible")
    }

    usernameAfterDelay() {
        if(this.username.value.length < 4) {
            this.showValidationError(this.username, "Username has to be longer than 3 characters.")
        }

        if(!this.username.errors){
            axios.post('/doesUsernameExist', {_csrf: this._csrf, username: this.username.value})
            .then((response) => {
                if(response.data) {
                    this.showValidationError(this.username, "This username has already been taken.")
                    this.username.isUnique = false
                } else {
                    this.username.isUnique = true
                }
            })
            .catch(() => {
                console.log("Please try again later.")
            })
        }

    }

    emailAfterDelay() {
        if(!/^\S+@\S+$/.test(this.email.value)) {
            this.showValidationError(this.email, "You must provide a valid email address.")
        }

        if(!this.email.errors) {
            axios.post('/doesEmailExist', {_csrf: this._csrf, email: this.email.value})
            .then((response) => {
                if(response.data) {
                    this.showValidationError(this.email, "This email has already been taken.")
                    this.email.isUnique = false
                } else {
                    this.email.isUnique = true
                    this.hideValidationError(this.email)
                }
            })
            .catch(() => {
                console.log("Please try again later.")
            })
        }
    }

    insertValidationElements() {
        this.allFields.forEach(function(element) {
            element.insertAdjacentHTML('afterend', `
            
            <div class="alert alert-danger small liveValidateMessage"></div>
            
            `)
        })
    }

}