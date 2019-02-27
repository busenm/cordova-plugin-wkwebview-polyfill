module.exports = function (preference) {
    var cordovaUtil = this.requireCordovaModule('cordova-lib/src/cordova/util');
    var metadata = this.requireCordovaModule('cordova-lib/src/plugman/util/metadata');
    var ConfigParser = this.requireCordovaModule('cordova-common/src/ConfigParser/ConfigParser');
    var projectRoot = cordovaUtil.isCordova();
    var xml = cordovaUtil.projectConfig(projectRoot);
    var config = new ConfigParser(xml);
    var plugin = this.opts.plugin;
    var configPlugin = config.getPlugin(plugin.id);
    var preferences;
    if (configPlugin && hasVariables(configPlugin)) {
        preferences = configPlugin.variables;
        if (Object.keys(preferences).length && hasPreference(preferences, preference)) {
            return preferences[preference];
        }
    }
    preferences = metadata.get_fetch_metadata(plugin.dir).variables;
    return preferences ? preferences[preference] : void 0;

    function hasVariables(config){
        return typeof config.variables === 'object';
    }

    function hasPreference(preferenceArray, preference) {
        return typeof preferenceArray[preference] !== 'undefined';
    }
};
