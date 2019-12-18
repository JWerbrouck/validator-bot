const solid = { auth: require('solid-auth-cli') }
const rdflib = require('rdflib')
const SHACLValidator = require('shacl-js')
const Base64 = require('js-base64').Base64;
const { example } = require('../helper/example.js')

const project = {
    idp: process.env.SOLID_IDP,
    username: process.env.SOLID_USERNAME,
    password: process.env.SOLID_PASSWORD
}

const RDF = new rdflib.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
const CS = new rdflib.Namespace('http://consolid.org/ontology/cs#');

exports.fetchResource = async (req, res) => {
    const store = rdflib.graph()

    const basic = req.headers.authorization.split(' ')
    const [un, pw] = Base64.decode(basic[1]).split(':')

    //login with credentials of the requester (to check whether they can actually control this)
    const visitor = {
        idp: req.body.idp,
        username: un,
        password: pw
    }

    let loginValidation = await solid.auth.login(visitor).catch(e => res.json({ error: "Error logging in for the visitor: " + e }))

    //login
    let login = await solid.auth.login(project).catch(e => res.json({ error: "Error logging in for the bot: " + e }))
    
    // get ACL
    let acl = await fetchACL(req.body.requestedResource, store).catch(e => res.json({ error: "Error fetching: " + e }))
    
    // get the (external) shapes referred to in the ACL
    let shapes = await fetchDynamicRule(store).catch(e => res.json({ error: "Error finding the dynamic rule: " + e }))
    
    // get the trusted graphs referred to in the shapes
    let trustedGraphs = await fetchTrustedGraphs(store).catch(e => res.json({ error: "Error finding the trusted graphs: " + e }))

    // validate
    let validationResults = await validate(shapes, trustedGraphs, req.body.myWebId)
        // if validation = passed :
            // if onlyNow: pass file in response
            // if persistent: adapt ACL file

        // else: message: you do not conform to the rules set in the shapes

    res.json({ validationResults })
}

const fetchACL = async (resource, store) => {
    const resourceACL = resource + '.acl'
    const ACLdocument = await solid.auth.fetch(resourceACL).catch(e => console.log("Error fetching: " + e))
    const ACLtext = await ACLdocument.text().catch(e => res.json({ error: "Error parsing: " + e }))
    const acldoc = store.sym(resourceACL)
    rdflib.parse(ACLtext, store, acldoc.uri, 'text/turtle')
}

const fetchDynamicRule = async (store) => {
    let shapeURLs = []
    let shapes = []

    // weak query (prototype)
    let externalShapes  = store.match(null, CS('hasURL'))
    externalShapes.forEach((shape) => {
        shapeURLs.push(shape.object.value)
    })

    // fetch each external Shape (ttl)
    for (const item of shapeURLs) {
        const shapeGraph = await solid.auth.fetch(item).catch(e => console.log("Error fetching: " + e))
        const shapeGraphText = await shapeGraph.text()
        shapes.push({triples: shapeGraphText, why: item})
        rdflib.parse(shapeGraphText, store, item, 'text/turtle')           
    }

    return shapes
}

const fetchTrustedGraphs = async (store) => {
    let trustedGraphURLs = []
    let trustedGraphs = []

    // const externalShape = store.sym("https://jwerbrouck.inrupt.net/public/myProjects/BuildingProject1/AccessRule.ttl")
    // let externalGraphs = store.match(null, CS('hasTrustedGraph'), null, externalShape.doc())
    let externalGraphs = store.match(null, CS('hasTrustedGraph'))
    externalGraphs.forEach((graph) => {
        trustedGraphURLs.push(graph.object.value)
    })

    // fetch each external Shape (ttl)
    for (const item of trustedGraphURLs) {
        // to do: check if accessible by the bot
        const graph = await solid.auth.fetch(item).catch(e => console.log("Error fetching: " + e))
        const graphText = await graph.text()
        trustedGraphs.push({triples: graphText, why: item})
        rdflib.parse(graphText, store, item, 'text/turtle')            
    }

    return trustedGraphs
}

const validate = async (shapes, dataGraphs, visitorID) => {
    const shapeGraphs = []
    shapes.forEach(shape => {
        let customShape = shape.triples.replace("ex:__visitor__", `<${visitorID}>`)
        shapeGraphs.push({triples: customShape, why: shape.why})
    })

    let validationResults = []

    console.log(`validating the access for <${visitorID}>`)
    for (const shapeGraph of shapeGraphs) {
        console.log('shape: ', shapeGraph.why)
        for (const data of dataGraphs) {
            console.log('validating source: ', data.why)

            const result1 = await iterateValidation(shapeGraph, data)
            validationResults.push(result1)
        }     
    }

    return validationResults        

}

const iterateValidation = (shapeGraph, data) => {
    let validator = new SHACLValidator();

    return new Promise((resolve, reject) => {
        validator.validate(data.triples, "text/turtle", shapeGraph.triples, "text/turtle", function (e, report) {
            const result = {
                shape: shapeGraph.why,
                source: data.why               
            }
            
            console.log("Conforms? " + report.conforms());
            result['conforms'] = report.conforms();

            if (report.conforms() === false) {
                report.results().forEach(function(r) {
                    const message = "Severity: " + r.severity() + " for " + r.sourceConstraintComponent()
                    console.log(message);
                    result['message'] = message
                });
            }
            
            if (e === null) {
                resolve(result)
            } else {
                reject(e)
            }
        }); 
    })
}