const solid = { auth: require('solid-auth-cli') }
const rdflib = require('rdflib')

exports.checkACL = async (req, res, next) => {
    const resource = req.body.requestedResource

    if (req.authentication === 'owner') {
        const file = await solid.auth.fetch(resource).catch(e => console.log("Error fetching: " + e))
        const fileText = await file.text().catch(e => {return res.json({ error: "Error parsing: " + e })})
        return res.status(200).json({document: fileText})
    }

    const store = rdflib.graph()
    try {
        const acl = await fetchACL(resource, store)
        return res.status(200).json({acl})
    } catch (error) {
        return res.status(500).json({ error: "Error fetching ACL file for resource: " + resource})
    }
    // next()
}

const fetchACL = async (resource, store) => {
    return new Promise (async (resolve, reject) => {
        // change to findClosestACL (cf Solid Server)
        const resourceACL = resource + '.acl'
        const ACLdocument = await solid.auth.fetch(resourceACL).catch(e => reject(e))
        const ACLtext = await ACLdocument.text().catch(e => reject(e))
        const acldoc = store.sym(resourceACL)
        try {
            rdflib.parse(ACLtext, store, acldoc.uri, 'text/turtle')
            resolve(ACLtext)
        } catch (error) {
            reject(error)
        }
    })
}

const checkPresence = () => {

}