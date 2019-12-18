const express = require('express')
const {fetchResource} = require('./functions/solid-functions')
const bodyParser = require('body-parser')

const app = express()
const port = process.env.PORT
app.use(bodyParser.json())

app.post('', fetchResource)


app.listen(port, () => {
    console.log('server is up on port '+ port)
})