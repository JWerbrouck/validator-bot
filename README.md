# validator-bot
A prototype server for signing nanopublications (http://nanopub.org/wordpress/) using your webID. 
The current version relies on a private RSA key that needs to be stored in a secure way, to be placed in a to-be-created folder `config' as `key\_rsa', containing only the key itself. 
Also, a `dev.env'\footnote{\url{https://www.npmjs.com/package/env-cmd}} file containing the following environment variables should be added in this `config' directory: 

* PORT: the port to expose the server;
* SOLID\_IDP: the identity provider of your WebID (e.g. https://inrupt.net/);
* WEBID\_BASE: your WebID without `profile/card\#me';
* SOLID\_USERNAME: your Solid username (not your WebID);
* SOLID\_PASSWORD: your Solid password.

To enable validation of the nanopublication, the corresponding public key needs to be present in your WebID graph. To do this, follow the steps mentioned in https://dvcs.w3.org/hg/WebID/raw-file/tip/spec/tls-respec.html.
Authentication via Postman may happen in the following way: A local user may authenticate by inserting their local Solid username and password, a user whose WebID is hosted by a remote provider can do the same, but enhancing their username with their identity provider, delimited with a `.' (e.g.: bob.solid.community)
To configure a nanopublication, only an assertion graph (Turtle) should be send as a file (formData), using the key `assertion'; a base URI should be send with a key `baseUri'. A template is then used to fit the assertion in a nanopublication and sign it using the WebID public key. Under the hood, https://github.com/Nanopublication/nanopub-java is used for signing and checking the nanopublications.
