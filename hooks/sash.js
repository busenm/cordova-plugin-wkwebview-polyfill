#!/usr/bin/env node

var crpt = require('crypto');
var helpers = require('../scripts/helpers');

module.exports = function (context) {
    var path = context.requireCordovaModule('path');
    var fs = context.requireCordovaModule('fs');
    var cordovaUtil = context.requireCordovaModule('cordova-lib/src/cordova/util');
    var platforms = context.requireCordovaModule('cordova-lib/src/platforms/platforms');
    var projectRoot = cordovaUtil.isCordova();
    var excludeExts = getExtensionsPreference();

    process.stdout.write('[ANTI-TAMPERING] Saving a hash for each platforms asset \n');

    function getExtensionsPreference () {
        var extensionsPref = helpers.getPluginPreference(context, 'EXCLUDE_ASSETS_EXTENSIONS');
        if (typeof extensionsPref !== 'string' || !extensionsPref.trim().length) {
            if (helpers.isVerbose(context)) {
                process.stdout.write('No extensions to exclude provided \n');
            }
            return false;
        }
        var extensions = [];
        extensionsPref.split(/\s+|,+/).forEach(function (ext) {
            if (ext !== '') {
                extensions.push(ext);
            }
        });
        if (helpers.isVerbose(context)) {
            process.stdout.write('Excluding following extensions: ' + extensions.join(',') + ' \n');
        }
        if (!extensions.length) {
            return null;
        }
        return new RegExp('.*\.(' + extensions.join('|') + ')$');
    }

    function getPlatformAssets (dir) {
        var assetsList = [];
        var list = fs.readdirSync(dir);
        list.forEach(function (file) {
            var filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
                var subDirList = getPlatformAssets(filePath, excludeExts);
                assetsList = assetsList.concat(subDirList);
            }
            if (fs.statSync(filePath).isFile() && (!excludeExts || !excludeExts.test(file))) {
                assetsList.push(filePath);
            }
        });
        return assetsList;
    }

    helpers.getPlatformsList(context).forEach(function (platform) {
        var platformPath = path.join(projectRoot, 'platforms', platform);
        var platformApi = platforms.getPlatformApi(platform, platformPath);
        var platformInfo = platformApi.getPlatformInfo();
        var platformWww = platformInfo.locations.www;
        var source = helpers.getPluginSource(context, platform);
        var content = source.content;

        var hsh = getPlatformAssets(platformWww).map(function (file) {
            var fileName = file.replace(/\\/g, '/');
            fileName = fileName.replace(platformWww.replace(/\\/g, '/') + '/', '');
            var h;
            var hH;
            h = crpt.createHash('sha256');
            try {
                h.update(fs.readFileSync(file), 'utf8');
            } catch (e) {
                helpers.exit('Unable to read file at path ' + file, e);
            }
            hH = h.digest('hex');
            if (helpers.isVerbose(context)) {
                process.stdout.write('Hash: ' + hH + ' < ' + fileName + '\n');
            }
            return {
                h: hH
            };
        });

        if (platform === 'android') {
            var assetMapContentRegex = /\s*put\("[^"]+",\s"[^"]{64}"\);/g;
            var assetMapRegex = /aH\s*=.+\s*new.*(\(\d+\)[^\w]*)\);/;
            var emptyAssetMapRegex = /aH\s*=.+\s*new.*(\(.*\))/;

            content = content.replace(assetMapContentRegex, '')
                .replace(assetMapRegex, function (match, group) {
                    return match.replace(group, '()\n' + tab());
                })
                .replace(emptyAssetMapRegex, function (match, group) {
                    var replace = match.replace(group, '(' + (hsh.length || '') + ')');
                    if (hsh.length) {
                        replace += ' {{\n' + tab();
                        hsh.forEach(function (h) {
                            replace += tab(2) + 'put("' + h.h + '", "' + h.h + '");\n' + tab();
                        });
                        replace += tab() + '}}';
                    }
                    return replace;
                });

            try {
                fs.writeFileSync(source.path, content, 'utf-8');
            } catch (e) {
                helpers.exit('Unable to write java class source at path ' + source.path, e);
            }
        }
    });

    function tab (size) {
        var str = '';
        for (var i = 0; i < (size || 1); i++) {
            str += '    ';
        }
        return str;
    }
};
