const solid = { auth: require('solid-auth-cli') }
const rdflib = require('rdflib')
const { extractFormData, controlCreds, deleteFile } = require('../helper/helperFunctions');
const SHACLValidator = require('shacl-js')
const Base64 = require('js-base64').Base64;
const { example } = require('../helper/example.js')
const {RDF, CS, ACL} = require('../helper/namespaces')
const me = require('../helper/me')

exports.checkPermissions = async (req, res) => {
    // control creds: if owner of satellite: direct access
    const creds = await controlCreds(req.headers.authorization)
    if (creds[0]) {
        console.log('Owner request')
        const file = await solid.auth.fetch(req.body.requestedResource).catch(e => console.log("Error fetching: " + e))
        const fileText = await file.text().catch(e => {return res.json({ error: "Error parsing: " + e })})
        return res.status(200).json({document: fileText})
    } else if (creds[2]) {
        // login error
        return res.status(403).json({error: "Unauthorized. Could not login: No user found for that username - password combination"});
    }
    console.log('Non-owner request')
    const store = rdflib.graph()
    const acl = fetchACL(req.body.requestedResource, store)
        .then((res) => {
            console.log(res)
            return res
        })
        .catch(e => {return res.json({ error: "Error fetching: " + e })})

    // fetch ACL: if permanent: grant access; 
    // if temporary bound and still valid: grant access;
    // if temporary bound and not valid anymore: delete access.
    // if not temporary bound and not permanent: perform access validation

    return res.status(200).json({message: acl})
}

const fetchACL = async (resource, store) => {
    const resourceACL = resource + '.acl'
    const ACLdocument = await solid.auth.fetch(resourceACL).catch(e => console.log("Error fetching: " + e))
    const ACLtext = await ACLdocument.text().catch(e => res.json({ error: "Error parsing: " + e }))
    const acldoc = store.sym(resourceACL)
    rdflib.parse(ACLtext, store, acldoc.uri, 'text/turtle')
}