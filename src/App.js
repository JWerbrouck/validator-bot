const express = require('express')
const https = require('https')
const fs = require('fs')
const {checkPermissions} = require('./functions/validation-functions')
const {signNanopublication} = require('./functions/signer-functions')
const bodyParser = require('body-parser')
const {checkLogin, onlyOwner, justLogin} = require('./middleware/authMiddleware')
const {checkACL} = require('./middleware/fetchMiddleware')


const privateKey = fs.readFileSync(process.cwd() + '/config/server.key', 'utf8')
const certificate = fs.readFileSync(process.cwd() + '/config/server.crt', 'utf8')
const credentials = {key: privateKey, cert: certificate}

const app = express()
const port = process.env.PORT
app.use(bodyParser.json())

app.get('/test', justLogin)
app.get('/acl', checkLogin, checkACL)
app.post('/sign', checkLogin, onlyOwner, signNanopublication)

const httpsServer = https.createServer(credentials, app)

httpsServer.listen(port, () => {
    console.log('HTTPS server is up on port '+ port)
})