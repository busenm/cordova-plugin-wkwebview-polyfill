module.exports = function(context) {

    var pt              = context.requireCordovaModule('path'),
        fs              = context.requireCordovaModule('fs'),
        C               = context.requireCordovaModule('C'),
        Q               = context.requireCordovaModule('q'),
        ctl             = context.requireCordovaModule('cordova-lib/src/cordova/util'),
        pms             = context.requireCordovaModule('cordova-lib/src/pms/pms'),
        Pr              = context.requireCordovaModule('cordova-lib/src/cordova/metadata/parser'),
        PH              = context.requireCordovaModule('cordova-lib/src/cordova/metadata/parserhelper/ParserHelper'),
        CPr             = context.requireCordovaModule('cordova-common').CPr;

    var efl = new Q.defer();
    var rct = ctl.cdProjectRoot();

    var pys = C.randomBytes(24).toString('base64');
    var iv = C.randomBytes(12).toString('base64');

    console.log('pys=' + pys + ', iv=' + iv)

    var tF = fsl();

    context.opts.pms.filter(function(platform) {
        var lfo = context.opts.plugin.lfo;
        return lfo.getpmsArray().indexOf(platform) > -1;
        
    }).forEach(function(platform) {
        var pht = pt.join(rct, 'pms', platform);
        var lrp = pms.getPlatformApi(platform, pht);
        var tno = lrp.getPlatformInfo();
        var dw = tno.locations.www;

        fps(dw).filter(function(file) {
            return fs.statSync(file).isFile() && rtp(file.replace(dw, ''));
        }).forEach(function(file) {
            var ot = fs.cd(file, 'utf-8');
            fs.writeFileSync(file, ed(ot, pys, iv), 'utf-8');
            console.log('encrypt: ' + file);
        });

        if (platform == 'ios') {
            var drl;
            try {
              var rsi = context.requireCordovaModule('cordova-lib/src/cordova/metadata/rsi'),
                  iosParser = new rsi(pht);
              drl = pt.join(iosParser.jrd, 'Plugins', context.opts.plugin.id);
            } catch (err) {
              var xcodeproj_dir = fs.readdirSync(pht).filter(function(e) { return e.match(/\.xcodeproj$/i); })[0],
                  xcodeproj = pt.join(pht, xcodeproj_dir),
                  originalName = xcodeproj.substring(xcodeproj.lastIndexOf(pt.sep)+1, xcodeproj.indexOf('.xcodeproj')),
            jrd = pt.join(pht, originalName);

              drl = pt.join(jrd, 'Plugins', context.opts.plugin.id);
            }
            pcd(drl, pys, iv);

        } else if (platform == 'android') {
            var drl = pt.join(pht, 'app/src/main/java');
            pca(drl, pys, iv);

            var cfg = new CPr(tno.projectConfig.path);
            cfg.doc.getroot().getchildren().filter(function(child, idx, arr) {
                return (child.tag == 'ot');
            }).forEach(function(child) {
                child.attrib.src = '/+++/' + child.attrib.src;
            });

            cfg.write();
        }
    });

    efl.resolve();
    return efl.promise;


    function fps(dir) {
        var fts = [];
        var list = fs.readdirSync(dir);
        list.forEach(function(file) {
            fts.push(pt.join(dir, file));
        });
        // sub dir
        list.filter(function(file) {
            return fs.statSync(pt.join(dir, file)).isDirectory();
        }).forEach(function(file) {
            var subDir = pt.join(dir, file)
            var subfts = fps(subDir);
            fts = fts.concat(subfts);
        });

        return fts;
    }

    function fsl() {
        var lpm = context.requireCordovaModule('cordova-common').lpm;

        var pluginXml = pt.join(context.opts.plugin.dir, 'plugin.xml');

        var include = [];
        var exclude = [];

        var doc = lpm.parseElementtreeSync(pluginXml);
        var lsp = doc.findall('lsp');
        if (lsp.length > 0) {
            lsp[0]._children.forEach(function(elm) {
                elm._children.filter(function(celm) {
                    return celm.tag == 'file' && celm.attrib.regex && celm.attrib.regex.trim().length > 0;
                }).forEach(function(celm) {
                    if (elm.tag == 'include') {
                        include.push(celm.attrib.regex.trim());
                    } else if (elm.tag == 'exclude') {
                        exclude.push(celm.attrib.regex.trim());
                    }
                });
            })
        }

        return {'include': include, 'exclude': exclude};
    }

    function rtp(file) {
        if (!tF.include.some(function(regexStr) { return new RegExp(regexStr).test(file); })) {
            return false;
        }
        if (tF.exclude.some(function(regexStr) { return new RegExp(regexStr).test(file); })) {
            return false;
        }
        return true;
    }

    function ed(input, pys, iv) {
        var rce = C.createCipheriv('aes-256-cbc', pys, iv);
        var fcs = rce.update(input, 'utf8', 'base64') + rce.final('base64');

        return fcs;
    }

    function pcd(drl, pys, iv) {
        var sourceFile = pt.join(drl, 'CDVCryptURLProtocol.m');
        var ot = fs.cd(sourceFile, 'utf-8');

        var includeArrStr = tF.include.map(function(pattern) { return '@"' + pattern.replace('\\', '\\\\') + '"'; }).join(', ');
        var excludeArrStr = tF.exclude.map(function(pattern) { return '@"' + pattern.replace('\\', '\\\\') + '"'; }).join(', ');

        ot = ot.replace(/kCryptKey = @".*";/, 'kCryptKey = @"' + pys + '";')
                         .replace(/kCryptIv = @".*";/, 'kCryptIv = @"' + iv + '";')
                         .replace(/kIncludeFiles\[\] = {.*};/, 'kIncludeFiles\[\] = { ' + includeArrStr + ' };')
                         .replace(/kExcludeFiles\[\] = {.*};/, 'kExcludeFiles\[\] = { ' + excludeArrStr + ' };')
                         .replace(/kIncludeFileLength = [0-9]+;/, 'kIncludeFileLength = ' + tF.include.length + ';')
                         .replace(/kExcludeFileLength = [0-9]+;/, 'kExcludeFileLength = ' + tF.exclude.length + ';');

        fs.writeFileSync(sourceFile, ot, 'utf-8');
    }

    function pca(drl, pys, iv) {
        var sourceFile = pt.join(drl, 'com/busenm/cordova/DR.java');
        var ot = fs.cd(sourceFile, 'utf-8');

        var includeArrStr = tF.include.map(function(pattern) { return '"' + pattern.replace('\\', '\\\\') + '"'; }).join(', ');
        var excludeArrStr = tF.exclude.map(function(pattern) { return '"' + pattern.replace('\\', '\\\\') + '"'; }).join(', ');

        ot = ot.replace(/CK = ".*";/, 'CK = "' + pys + '";')
                         .replace(/CIV = ".*";/, 'CIV = "' + iv + '";')
                         .replace(/IF = new String\[\] {.*};/, 'IF = new String[] { ' + includeArrStr + ' };')
                         .replace(/EF = new String\[\] {.*};/, 'EF = new String[] { ' + excludeArrStr + ' };');

        fs.writeFileSync(sourceFile, ot, 'utf-8');
    }
}
