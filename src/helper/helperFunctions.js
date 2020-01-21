const Busboy = require('busboy')

exports.extractFormData = async (req) => {
    var busboy = new Busboy({ headers: req.headers });
    let documentData = {}

    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
      file.on('data', function(data) {
        documentData[fieldname] = data.toString()
      });
    });
    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
        documentData[fieldname] = val
    });
    busboy.on('finish', function() {
    });
    req.pipe(busboy);
    return documentData
}