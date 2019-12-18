exports.example = `@prefix : <#>.
@prefix n0: <http://www.w3.org/ns/auth/acl#>.
@prefix c: <https://consolidproject1.inrupt.net/profile/card#>.
@prefix cs: <http://consolid.org/ontology/cs#>.
@prefix c0: </profile/card#>.
@prefix sh: <http://www.w3.org/ns/shacl#>.

:ControlReadWrite
    a n0:Authorization;
    n0:accessTo <BuildingProject1.ttl>;
    n0:agent c:me, c0:me;
    n0:mode n0:Control, n0:Read, n0:Write.
:Read a n0:Authorization; n0:accessTo <BuildingProject1.ttl>; n0:mode n0:Read.



##################### DYNAMIC ACL RULES ##########################

# SHACL prefix declarations
cs: sh:declare [
		sh:prefix "cs";
		sh:namespace <http://consolid.org/ontology/cs#> ;
	] .

c0: sh:declare [
		sh:prefix "c0";
		sh:namespace <https://jwerbrouck.inrupt.net/profile/card#> ;
	] .


#RULE
<#ArchitectRule>
	a cs:DynamicRule;
	cs:hasTrustedActor <https://consolidproject1.inrupt.net/profile/card#me>;
	cs:hasTrustedGraph <https://consolidproject1.inrupt.net/private/stakeholders.ttl>;
	cs:SHACLRequirement <#ArchitectRuleShape>.

#RULESHAPE ($visitor is a parameter for the person requesting access)	
<#ArchitectRuleShape>
	a sh:NodeShape ;
	sh:targetClass cs:Visitor ; 
	sh:sparql [
		a sh:SPARQLConstraint ; 
		sh:message "visitor must be a project architect in a project where the owner is also a stakeholder";
		sh:prefixes cs:, c0: ;
		sh:select """
			SELECT $this
			WHERE {
				?project a cs:Project.
				?project cs:hasStakeholder owner:me ;
					cs:hasProjectArchitect $this.				
			}
			"""
		] .
`