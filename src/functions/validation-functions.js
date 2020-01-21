const solid = { auth: require('solid-auth-cli') }
const rdflib = require('rdflib')
const SHACLValidator = require('shacl-js')
const Base64 = require('js-base64').Base64;
const { example } = require('../helper/example.js')
const {RDF, CS, ACL} = require('../helper/namespaces')

const project = {
    idp: process.env.SOLID_IDP,
    username: process.env.SOLID_USERNAME,
    password: process.env.SOLID_PASSWORD
}

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

    // login with the credentials of the bot
    // make sure OpenSSL is installed and added to the %PATH% (C:\Program Files\OpenSSL-Win64\bin)
    let login = await solid.auth.login(project).catch(e => res.json({ error: "Error logging in for the bot: " + e }))

    // get ACL of the requested file
    let acl = await fetchACL(req.body.requestedResource, store).catch(e => res.json({ error: "Error fetching: " + e }))

    // control whether the visitor has already persistent rights

    // get the (external) shapes referred to in the ACL (only trustedGraphs, no trustedActors at the moment)
    let rules = await fetchDynamicRule(store, req.body.myWebId).catch(e => res.json({ error: "Error finding the dynamic rules: " + e }))

    // validate
    rules = await validate(rules, req.body.myWebId)

    // by default, all shapes must be confirmed by at least one of the trusted sources
    let finalDecision = decide(rules)

    // if applicable, set the correct Authorization in a persistent rule in the ACL file

    // if Read access is granted, also return the TTL file
    if (finalDecision.grantedRights) {
        if (finalDecision.grantedRights.includes(ACL('Read').value)){
            let file = await fetchFile(req.body.requestedResource)
            finalDecision['Document'] = file
        }
    }

    res.json(finalDecision)
}

const fetchACL = async (resource, store) => {
    const resourceACL = resource + '.acl'
    const ACLdocument = await solid.auth.fetch(resourceACL).catch(e => console.log("Error fetching: " + e))
    const ACLtext = await ACLdocument.text().catch(e => res.json({ error: "Error parsing: " + e }))
    const acldoc = store.sym(resourceACL)
    rdflib.parse(ACLtext, store, acldoc.uri, 'text/turtle')
}

const fetchDynamicRule = async (store, webID) => {
    let rules = []

    let ruleURLs = store.match(null, RDF('type'), CS('DynamicRule'))

    for (const url of ruleURLs) {
        let ruleObject = {shapes: [], sources: [], aclModes: []}
        ruleObject['ruleURL'] = url.subject.value
        // let timeConstraints = store.match(url.subject, CS('hasTimeConstraint'), null)
        let statements = store.connectedStatements(url.subject)

        // prototype contains only the modes: 'Permanent' and 'OnlyNow'
        let timeBnIds = []

        for (const s of statements) {
            if (s.predicate.value === CS('hasTimeConstraint').value) {
                timeBnIds.push(s.object.id)
            }

            if (s.predicate.value === ACL('mode').value) {
                ruleObject['aclModes'].push(s.object.value)
            }

            // inclusiveRule: all shapes should be conformant according to at least 1 source
            // exclusiveRule: all shapes should be conformant according to all mentioned sources
            if (s.object.value === CS('InclusiveRule').value || s.object.value === CS('ExclusiveRule').value) {
                ruleObject['inclusivity'] = s.object.value
            }

            if (s.predicate.value === CS('hasShape').value) {
                let shapeDetails = {shapeURL: s.object.value}
                let shape = await fetchGraph(s.object.value, store).catch(e => console.log("Problem fetching shapes: " + e))
                let customShape = shape.replace("ex:__visitor__", `<${webID}>`)
                shapeDetails['shapeTriples'] = customShape
                ruleObject['shapes'].push(shapeDetails)
            }

            // trustedActor is not implemented yet, but should be more robust. However, it will be more time-consuming
            // option: let actors mark certain resources as 'troths'/'pledges' to indicate these may be used for validation? or is this too far-fetched?
            if (s.predicate.value === CS('hasTrustedGraph').value) {
                let sourceDetails = {sourceURL: s.object.value}
                sourceDetails['sourceTriples'] = await fetchGraph(s.object.value, store).catch(e => console.log("Problem fetching sources: " + e))
                ruleObject['sources'].push(sourceDetails)
            }
        }
        statements.forEach(s => {
            timeBnIds.forEach(t => {
                if (s.subject.id === t) {
                    ruleObject['timeConstraint'] = { mode: s.object.value }
                }
            })
        })
        rules.push(ruleObject)
    }

    return rules
}

const fetchGraph = async (item, store) => {
    const shapeGraph = await solid.auth.fetch(item).catch(e => console.log("Error fetching: " + e))
    const shapeGraphText = await shapeGraph.text()
    rdflib.parse(shapeGraphText, store, item, 'text/turtle')
    return shapeGraphText
}

const validate = async (rules, visitorID) => {
    for (const rule of rules) {
        let validationResults = []
        console.log(`checking <${rule.ruleURL}>___________________`)
        for (const shape of rule.shapes) {
            console.log(`    validating shape: <${shape.shapeURL}>`)
            for (const source of rule.sources) {
                console.log(`        against source: <${source.sourceURL}>`)
                const result = await iterateValidation(shape, source)
                validationResults.push(result)               
            }
        }
        rule['validationResults'] = validationResults
    }
    return rules
}

const iterateValidation = (shape, source) => {
    let validator = new SHACLValidator();

    return new Promise((resolve, reject) => {
        validator.validate(source.sourceTriples, "text/turtle", shape.shapeTriples, "text/turtle", function (e, report) {
            const result = {
                shape: shape.shapeURL,
                source: source.sourceURL
            }

            // console.log("Conforms? " + report.conforms());
            result['conforms'] = report.conforms();

            if (report.conforms() === false) {
                report.results().forEach(function (r) {
                    const message = "Severity: " + r.severity() + " for " + r.sourceConstraintComponent()
                    // console.log(message);
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

const decide = (rules) => {
    let grantedRights = []
    let timeConstraints = { mode: 'http://consolid.org/ontology/cs#OnlyNow' }


    // also possible: set a new authorisation for each rule / time-setting combo
    // set the most restricting rule (onlynow > timerestricted > permanent)
    rules.forEach(rule => {
        if (rule.timeConstraint.mode === CS('Permanent').value) {
            timeConstraints = rule.timeConstraint
        } else if (rule.timeConstraint.mode === CS('TimeRestricted').value && timeConstraints.mode != CS('Permanent').value) {
            timeConstraints = rule.timeConstraint
        } else if (rule.timeConstraint.mode === CS('OnlyNow').value && timeConstraints.mode != CS('Permanent').value && timeConstraints.mode != CS('TimeRestricted').value) {
            timeConstraints = rule.timeConstraint
        }

        let iteratedShapes = []
        let shapesConformance = []
    
        rule.validationResults.forEach((validation) => {
            if (!iteratedShapes.includes(validation.shape)) {
                shapesConformance.push({shape: validation.shape, conformance: [validation.conforms]})
                iteratedShapes.push(validation.shape)
            } else {
                shapesConformance.forEach(sh => {
                    if (sh['shape'] === validation.shape) {
                        sh['conformance'].push(validation.conforms)
                    }
                })
            }
        })

        const necessary = shapesConformance.length
        let confirmed = 0

        if (rule.inclusivity != CS('ExclusiveRule').value) {
            // only one source must confirm the shape's validity
            shapesConformance.forEach(check => {
                if (check['conformance'].includes(true)) {
                    confirmed += 1
                }
            })
        } else {
            // all sources must confirm the shape's validity
            shapesConformance.forEach(check => {
                if (!check['conformance'].includes(false)) {
                    confirmed += 1
                }
            })
        }

        if (confirmed === necessary) {
            rule.aclModes.forEach(mode => {
                if (!grantedRights.includes(mode)) {
                    grantedRights.push(mode)
                }
            })
        }
    })

    if (grantedRights.length > 0) {
        return { grantedRights, timeConstraints }
    } else {
        return { message: "Access denied. You do not conform to all requirements to get access to this resource." }
    }

}

const fetchFile = async (url) => {
    const document = await solid.auth.fetch(url).catch(e => console.log("Error fetching document: " + e))
    const text = await document.text().catch(e => res.json({ error: "Error parsing: " + e }))
    return text
}