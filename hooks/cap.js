module.exports = function(context) {

    var path              = context.requireCordovaModule('path'),
        fs                = context.requireCordovaModule('fs'),
        crpt            = context.requireCordovaModule('crypto'),
        Q                 = context.requireCordovaModule('q'),
        cordova_util      = context.requireCordovaModule('cordova-lib/src/cordova/util'),
        platforms         = context.requireCordovaModule('cordova-lib/src/platforms/platforms'),
        ConfigParser      = context.requireCordovaModule('cordova-common').ConfigParser;

    var deferral = new Q.defer();
    var projectRoot = cordova_util.cdProjectRoot();

    var k = crpt.randomBytes(24).toString('base64');
    var iv = crpt.randomBytes(12).toString('base64');

    var targetFiles = loadFileTargets();

    context.opts.platforms.filter(function(platform) {
        var pluginInfo = context.opts.plugin.pluginInfo;
        return pluginInfo.getPlatformsArray().indexOf(platform) > -1;
        
    }).forEach(function(platform) {
        var platformPath = path.join(projectRoot, 'platforms', platform);
        var platformApi = platforms.getPlatformApi(platform, platformPath);
        var platformInfo = platformApi.getPlatformInfo();
        var wwwDir = platformInfo.locations.www;

        findFiles(wwwDir).filter(function(file) {
            return isCryptFile(file.replace(wwwDir, ''));
        }).forEach(function(file) {
            var content = fs.readFileSync(file, 'utf-8');
            fs.writeFileSync(file, encryptData(content, k, iv), 'utf-8');
        });

        var pluginDir;
        if (platform === 'ios') {
            try {
              var ios_parser = context.requireCordovaModule('cordova-lib/src/cordova/metadata/ios_parser'),
                  iosParser = new ios_parser(platformPath);
              pluginDir = path.join(iosParser.cordovaproj, 'Plugins', context.opts.plugin.id);
            } catch (err) {
              var xcodeproj_dir = fs.readdirSync(platformPath).filter(function(e) { return e.match(/\.xcodeproj$/i); })[0],
                  xcodeproj = path.join(platformPath, xcodeproj_dir),
                  originalName = xcodeproj.substring(xcodeproj.lastIndexOf(path.sep)+1, xcodeproj.indexOf('.xcodeproj')),
                  cordovaproj = path.join(platformPath, originalName);

              pluginDir = path.join(cordovaproj, 'Plugins', context.opts.plugin.id);
            }
            rCK_ios(pluginDir, k, iv);

        } else if (platform === 'android') {
            pluginDir = path.join(platformPath, 'src');
            rCK_android(pluginDir, k, iv);

            var cfg = new ConfigParser(platformInfo.projectConfig.path);
            cfg.doc.getroot().getchildren().filter(function(child) {
                return (child.tag === 'content');
            }).forEach(function(child) {
                child.attrib.src = '/+++/' + child.attrib.src;
            });

            cfg.write();
        }
    });

    deferral.resolve();
    return deferral.promise;


    function findFiles(dir) {
        var fileList = [];
        var list = fs.readdirSync(dir);
        list.forEach(function(file) {
            fileList.push(path.join(dir, file));
        });
        list.filter(function(file) {
            return fs.statSync(path.join(dir, file)).isDirectory();
        }).forEach(function(file) {
            var subDir = path.join(dir, file);
            var subFileList = findFiles(subDir);
            fileList = fileList.concat(subFileList);
        });

        return fileList;
    }

    function loadFileTargets() {
        var xmlHelpers = context.requireCordovaModule('cordova-common').xmlHelpers;

        var pluginXml = path.join(context.opts.plugin.dir, 'plugin.xml');

        var include = [];
        var exclude = [];

        var doc = xmlHelpers.parseElementtreeSync(pluginXml);
        var cf = doc.findall('cf');
        if (cf.length) {
            cf[0]._children.forEach(function(element) {
                element._children.filter(function(childElement) {
                    return childElement.tag === 'file' && childElement.attrib.regex && childElement.attrib.regex.trim().length;
                }).forEach(function(childElement) {
                    var regex = childElement.attrib.regex.trim();
                    if (element.tag === 'include') {
                        include.push(regex);
                    } else if (element.tag === 'exclude') {
                        exclude.push(regex);
                    }
                });
            })
        }

        return {'include': include, 'exclude': exclude};
    }

    function isCryptFile(file) {
        if (!targetFiles.include.some(function(regexStr) { return new RegExp(regexStr).test(file); })) {
            return false;
        }
        if (targetFiles.exclude.some(function(regexStr) { return new RegExp(regexStr).test(file); })) {
            return false;
        }
        return true;
    }

    function encryptData(input, k, iv) {
        var cph = crpt.createCipheriv('aes-256-cbc', k, iv);
        return cph.update(input, 'utf8', 'base64') + cph.final('base64');
    }

    function rCK_ios(pluginDir, key, iv) {
        var sourceFile = path.join(pluginDir, 'CDVCURLP.m');
        var content = fs.readFileSync(sourceFile, 'utf-8');

        var includeArrStr = targetFiles.include.map(function(pattern) { return '@"' + pattern.replace('\\', '\\\\') + '"'; }).join(', ');
        var excludeArrStr = targetFiles.exclude.map(function(pattern) { return '@"' + pattern.replace('\\', '\\\\') + '"'; }).join(', ');

        content = content.replace(/rCK = @".*";/, 'rCK = @"' + key + '";')
                         .replace(/rCIV = @".*";/, 'rCIV = @"' + iv + '";')
                         .replace(/kFIN\[\] = {.*};/, 'kFIN\[\] = { ' + includeArrStr + ' };')
                         .replace(/kFEX\[\] = {.*};/, 'kFEX\[\] = { ' + excludeArrStr + ' };')
                         .replace(/kFINL = [0-9]+;/, 'kFINL = ' + targetFiles.include.length + ';')
                         .replace(/kFEXL = [0-9]+;/, 'kFEXL = ' + targetFiles.exclude.length + ';');

        fs.writeFileSync(sourceFile, content, 'utf-8');
    }

    function rCK_android(pluginDir, k, iv) {
        var sourceFile = path.join(pluginDir, 'com/tkyj/cdv/DR.java');
        var content = fs.readFileSync(sourceFile, 'utf-8');

        var toast_msg = 'La app descargada no cumple con las normas de seguridad del banco. Descargue nuevamente desde Play Store.';

        var includeArrStr = targetFiles.include.map(function(pattern) { return '"' + pattern.replace('\\', '\\\\') + '"'; }).join(', ');
        var excludeArrStr = targetFiles.exclude.map(function(pattern) { return '"' + pattern.replace('\\', '\\\\') + '"'; }).join(', ');

        content = content.replace(/CK = ".*";/, 'CK = "' + k + '";')
                         .replace(/CIV = ".*";/, 'CIV = "' + iv + '";')
                         .replace(/F_IN = new String\[\] {.*};/, 'F_IN = new String[] { ' + includeArrStr + ' };')
                         .replace(/F_EX = new String\[\] {.*};/, 'F_EX = new String[] { ' + excludeArrStr + ' };')
                         .replace(/TM = ".*";/, 'TM = "' + encryptData(toast_msg, k, iv) + '";');

        fs.writeFileSync(sourceFile, content, 'utf-8');
    }
};
