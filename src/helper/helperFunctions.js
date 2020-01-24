const Busboy = require('busboy')
const {me} = require('../helper/me')
const _ = require('lodash')
const fs = require('fs');
const solid = { auth: require('solid-auth-cli') };

// exports.extractFormData = async (req) => {
//     var busboy = new Busboy({ headers: req.headers });
//     let documentData = {}

//     busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
//       file.on('data', function(data) {
//         documentData[fieldname] = data.toString()
//         console.log('docdata', documentData)
//       });
//     });
//     busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
//         documentData[fieldname] = val
//     });
//     busboy.on('finish', function() {
//     });
//     req.pipe(busboy);
//     return documentData
// }

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
              resolve(signedBuffer.toString())
          }
      })
  })
}

exports.extractFormData = async (req) => {
  return new Promise(async (resolve, reject) => {
    var busboy = new Busboy({ headers: req.headers });
    let documentData = {}
  
    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
      let buff = ''
      file.on('data', (data) => {
        buff += data
      });
      file.on('end', () => {
        documentData[fieldname] = buff
      })
    });

    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
        documentData[fieldname] = val
    });

    busboy.on('finish', function() {
      if (_.isEmpty(documentData)) {
        reject([null, "Was not able to parse the FormData correctly"])
      } else {
        resolve([documentData, null])
      }
    });

    req.pipe(busboy);
  })
}

exports.controlCreds = (auth) => {
  const basic = auth.split(' ')
  let [un_idp, pw] = Base64.decode(basic[1]).split(':')
  un_idp = un_idp.split('.')
  const un = un_idp.shift() 
  let idp = 'https://'
  un_idp.forEach(i => {
    idp += i + '.'
  })
  idp = idp.substring(0, idp.length - 1) + '/'
  const creds = {idp, username: un, password: pw}
  if (_.isEqual(creds, me)) {
    return solid.auth.login(creds)
      .then((res) => {
        return [true, creds, null, res]
      })
      .catch((e) => {
        return [true, creds, e]
      })
  } else {
    return solid.auth.login(creds)
      .then((res) => {
        creds["webId"] = res.webId
        return [false, creds, false, res]
      })
      .catch((e) => {
        return [false, creds, e]
      })
  }
}

exports.deleteFile = (path) => {
    try {
        fs.unlinkSync(path)
        console.log(path + ' was deleted successfully')
    } catch (err) {
        console.error(err)
    }
}