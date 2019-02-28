#!/usr/bin/env node

var helpers = require('../scripts/helpers');

module.exports = function (context) {
    var fs = context.requireCordovaModule('fs');

    process.stdout.write('[ANTI-TAMPERING] Clearing assets hash from previous build\n');

    helpers.getPlatformsList(context).forEach(function (platform) {
        var source = helpers.getPluginSource(context, platform);
        var content = source.content;

        if (platform === 'android') {
            var assetMapContentRegex = '/\s*put\("[^"]+",\s"[^"]{64}"\);/g';
            var assetMapRegex = '/assetsHashes\\s*=.+\\s*new.*(\\(\\d+\\)[^\\w]*)\\);/';
            content = source.content.replace(assetMapContentRegex, '')
            .replace(assetMapRegex, function (match, group) {
                return match.replace(group, '()\n    ');
            });

            try {
                fs.writeFileSync(source.path, content, 'utf-8');
            } catch (ex) {
                helpers.exit('Unable to write java class source at path ' + source.path, ex);
            }
        }
    });
};
