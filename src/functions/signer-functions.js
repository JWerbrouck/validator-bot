const { extractFormData, controlCreds, deleteFile } = require('../helper/helperFunctions');
const {createNanoPublication} = require('../helper/nanopub/nanopub_template')
const exec = require('child_process').exec;
const tmp = require('tmp');
const fs = require('fs');
const path = require('path');

exports.signNanopublication = async (req, res) => {
    // const creds = await controlCreds(req.headers.authorization)
    // if (creds[0] && creds[2]) {
    //     return res.status(403).json({error: 'Login matches with login of the owner but was unable to login to the service provider.'});
    // } else if (!creds[0]) {
    //     if (creds[2]) {
    //         console.log(creds)
    //         return res.status(403).json({error: "Unauthorized. Could not login: No user found for that username - password combination"});
    //     } else {
    //         return res.status(403).json({error: 'Unauthorized. Login does not match with login of the owner'});
    //     }
    // }
    
    console.log("Authenticated")
    const data = await extractFormData(req)

    if (!data[0]) {
        return res.status(400).json({error: data[1]});
    }

    const nanopublication = createNanoPublication(data[0].assertion, process.env.WEBID_BASE, data[0].baseUri)
    if (!nanopublication[0]) {
        return res.status(400).json({message: nanopublication[1]})
    }

    const signedDoc = sign(nanopublication[0])
        .then(() => {
            return res.sendFile('signed.tmp-placeholder.trig', { root: process.cwd() }, () => {
                // deleteFile(process.cwd() + '/signed.tmp-placeholder.trig')
                // deleteFile(process.cwd() + '/tmp-placeholder.trig')
            })
        }).catch((e) => {
            return res.status(400).json({message: e})
        })      
}

const sign = async (np) => {
    const fileName = 'tmp-placeholder.trig'
    const filePath = './' + fileName
    const fullPath = fs.openSync(filePath, 'w')
    fs.writeFileSync(fullPath, np)

    try {
        signed = await executeChildProcess(fileName)
        console.log({signed})
        return signed
    } catch (error) {
        return error
    }
}

const executeChildProcess = (shortPath) => {
    console.log('executing child')
    return new Promise((resolve, reject) => {
        exec('bash ./src/helper/signer/np.sh sign -a RSA  -k ./config/key_rsa -v ./' + shortPath, function (err, stdout, stderr) {
            if (stderr) {
                console.log(stderr)
                reject(stderr)
            } else {
                console.log('done', stdout)

                // reconstructing the path to the temporary signed nanopublication
                const signedPath = './' + 'signed.' + shortPath
                var signedBuffer = new Buffer(fs.readFileSync(signedPath, 'utf8'))
                console.log(signedBuffer.toString())
                resolve(signedBuffer.toString())
            }
        })
    })
} 