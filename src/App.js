const express = require('express')
const {fetchResource} = require('./functions/validation-functions')
const {signNanopublication} = require('./functions/signer-functions')
const bodyParser = require('body-parser')

const app = express()
const port = process.env.PORT
app.use(bodyParser.json())

app.get('/test', () => {return 'this is a test'})
app.get('/acl', fetchResource)
app.post('/sign', signNanopublication)

app.listen(port, () => {
    console.log('server is up on port '+ port)
})