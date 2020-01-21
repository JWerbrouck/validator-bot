const N3 = require('n3');

exports.createNanoPublication = function(assertion, webId, baseUri) {
   const date = new Date()
   const list = assertion.split('\n')
   let prefixes = ''
   let triples = ''
   list.forEach(line => {
      if (line[0] === '@') {
         prefixes += line + '\n'
      } else {
         triples += line + '\n'
      }
   })

   const np = `
@prefix : <${baseUri}> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix dc: <http://purl.org/dc/terms/> .
@prefix pav: <http://purl.org/pav/> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix np: <http://www.nanopub.org/nschema#> .
${prefixes}
      
:Head {
   : np:hasAssertion :assertion ;
   np:hasProvenance :provenance ;
   np:hasPublicationInfo :pubinfo ;
   a np:Nanopublication .
}

:assertion {
   ${triples}
}
     
:provenance {
   :assertion pav:createdBy <${webId}> .
}

:pubinfo {
   : dc:created "${date.toISOString()}"^^xsd:dateTime ;
   pav:createdBy <${webId}> .
}`

   return np
}