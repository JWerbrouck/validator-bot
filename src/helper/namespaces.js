const rdflib = require('rdflib')

const RDF = new rdflib.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
const CS = new rdflib.Namespace('http://consolid.org/ontology/cs#');
const ACL = new rdflib.Namespace('http://www.w3.org/ns/auth/acl#');

module.exports = {RDF, CS, ACL}