const {me} = require('../helper/me')
const _ = require('lodash')

module.exports = (req, res, next) => {
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
      return next()
    } else {
      return res.status(403).json({error: 'Unauthorized. Only the owner of this satellite can access this functionality'})
    }
  }