const {me} = require('../helper/me')
const _ = require('lodash')
const solid = { auth: require('solid-auth-cli') };

exports.checkLogin = (req, res, next) => {
  console.log('checking credentials')
  const auth = req.headers.authorization
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
    solid.auth.login(creds)
      .then((authRes) => {
        req.webId = authRes.webId
        req.authentication = 'owner'
        next()
      })
      .catch(() => {
        return res.status(500).json({error: 'Credentials match, but an error occurred when logging in to the service provider'})
      })
  } else {
    console.log(creds)
    solid.auth.login(creds)
      .then((authRes) => {
        req.webId = authRes.webId
        req.authentication = 'visitor'
      })
      .then(async () => {
        await solid.auth.logout()
      })
      .then(async () => {
        await solid.auth.login(me)
      })
      .then(() => {
        next()
      })
      .catch(() => {
        return res.status(500).json({error: 'An error occurred when logging in to the service provider'})
      })
  }
}

exports.onlyOwner = (req, res, next) => {
  console.log('checking ownership')
  if (req.authentication === 'owner') {
    next()
  } else {
    return res.status(403).json({error: 'Unauthorized. Only the owner of this satellite has access to this functionality'})
  }
}

// to be added above: if a valid certificate for delegation is presented, signed by the owner, the visitor is considered a delegate. 
exports.onlyDelegates = (req, res, next) => {
  if (req.authentication === 'owner' || req.authentication === 'delegate') {
    next()
  } else {
    return res.status(403).json({error: 'Unauthorized. Only the owner of this satellite and their delegates have access to this functionality'})
  }
}

exports.justLogin = async (req, res) => {
  console.log('testing')
  const creds = {
    idp: "https://localhost:8443",
    username: "jeroenwerbrouck",
    password: "JMW@{{ord3on1023"
  }

  // const creds = {
  //   idp: "https://inrupt.net/",
  //   username: "consolidproject1",
  //   password: "Stef@@n1964"
  // }

  let login = await solid.auth.login(creds)
  console.log(login)
  return res.json({login})
}
 