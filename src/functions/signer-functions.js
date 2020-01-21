const { extractFormData } = require('../helper/helperFunctions');
const {createNanoPublication} = require('../helper/nanopub/nanopub_template')
const exec = require('child_process').exec;
const tmp = require('tmp');
const fs = require('fs');
const path = require('path');

exports.signNanopublication = async (req, res) => {
    console.log('extracting Form Data 123')
    const data = await extractFormData(req)
    // const verifyLogin = verifyLogin()
    const nanopublication = createNanoPublication(data.assertion, process.env.WEBID_BASE, data.baseUri)
    const signedDoc = await sign(nanopublication)
    res.json({ signedDoc })
}

const sign = async (np) => {
    const fileName = 'tmp-placeholder.trig'
    const filePath = './' + fileName
    const fullPath = fs.openSync(filePath, 'w')
    fs.writeFileSync(fullPath, np)

    let signed = await executeChildProcess(fileName)
    return signed
}

const executeChildProcess = (shortPath) => {
    return new Promise((resolve, reject) => {
        exec('bash ./src/helper/signer/np.sh sign -a RSA  -k ./config/key_rsa -v ./' + shortPath, function (err, stdout, stderr) {
            if (stderr) {
                reject(stderr)
            } else {
                console.log('done', stdout)

                // reconstructing the path to the temporary signed nanopublication
                const signedPath = './' + 'signed.' + shortPath
                var signedBuffer = new Buffer(fs.readFileSync(signedPath, 'utf8'))

                // delete the temporary signed file (stored in the Buffer now)
                // try {
                //     fs.unlinkSync(signedPath)
                //     //file removed
                // } catch (err) {
                //     console.error(err)
                // }

                // try {
                //     fs.unlinkSync(shortPath)
                //     //file removed
                // } catch (err) {
                //     console.error(err)
                // }

                resolve(signedBuffer.toString())
            }
        })
    })
}