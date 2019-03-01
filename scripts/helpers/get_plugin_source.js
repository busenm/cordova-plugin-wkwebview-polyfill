var helpers = require('./');

module.exports = function (platform) {
    var path = this.requireCordovaModule('path');
    var fs = this.requireCordovaModule('fs');
    var cordovaUtil = this.requireCordovaModule('cordova-lib/src/cordova/util');
    var projectRoot = cordovaUtil.isCordova();
    var platformPath = path.join(projectRoot, 'platforms', platform);
    var pluginDir;
    var sourceFile;
    var content;

    if (platform === 'android') {
        var filePath = 'com/bch/cdv/AI.java';
        try {
            sourceFile = path.join(platformPath, 'app/src/main/java', filePath);
            content = fs.readFileSync(sourceFile, 'utf-8');
        } catch (e) {
            try {
                sourceFile = path.join(platformPath, 'src', filePath);
                content = fs.readFileSync(sourceFile, 'utf-8');
            } catch (ex) {
                helpers.exit('Unable to read java class source at path ' + sourceFile, ex);
            }
        }
    }

    return {
        content: content,
        path: sourceFile
    };
};
