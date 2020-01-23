const express = require('express')
const https = require('https')
const fs = require('fs')
const {fetchResource} = require('./functions/validation-functions')
const {signNanopublication} = require('./functions/signer-functions')
const bodyParser = require('body-parser')


const privateKey = fs.readFileSync(process.cwd() + '/config/server.key', 'utf8')
const certificate = fs.readFileSync(process.cwd() + '/config/server.crt', 'utf8')
const credentials = {key: privateKey, cert: certificate}

const app = express()
const port = process.env.PORT
app.use(bodyParser.json())

app.get('/test', () => {return 'this is a test'})
app.get('/acl', fetchResource)
app.post('/sign', signNanopublication)

const httpsServer = https.createServer(credentials, app)

httpsServer.listen(port, () => {
    console.log('HTTPS server is up on port '+ port)
})