#! /usr/bin/env node

require("shelljs/global");
var _md5 = require('md5');
var _req = require('request');
var _rlSync = require('readline-sync');
var _path = require('path');
var _parse = require('./parser.es5');
var _fs = require('fs');
var _yaml = require('read-yaml');

function randomString(length) {
    var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

// Print help
var _help = true;

// Get args
var _args = process.argv.slice(2);
_args = _parse(_args);

// Define default
var _data = {
    'name' : _path.parse(__dirname)['base'],
    'prefix' :  randomString(8)+'_',
    'themes' : []
};

var _cmds = {
    doSync : function () {
        echo('Début de synchro...');
        // get json sync file
        var _sync = JSON.parse(_fs.readFileSync('./.Sync.json', 'utf8'));

        var _gitStatus = exec('cd ./docker/wp && git status',{silent:true});
        if (_gitStatus.code > 0) {
            var _git = '';
            while (_git == '') {
                _git = _rlSync.question('Repo distant ? : \n');
            }
            exec('cd ./docker/wp && git init && git remote add origin ' + _git,{silent:true});
            echo('... Initialisation de git ok.');
        }

        // Remove old dump & build file.
        exec('cd ./docker/wp && ls | grep "^dump-[a-z0-9-]*.sql$" | xargs rm', {silent : true});
        exec('cd ./docker/wp && ls | grep "^build-[a-z0-9-]*$" | xargs rm', {silent : true});

        // Create build file
        var _build = guid();
        touch('./docker/wp/build-'+_build);

        _req(_sync.ping, function (error, response, body) {
            if (!error && response.statusCode == 200){
                var _dump = body;

                if (_sync.replaces.length > 0) {
                    // Change occurences
                    for (var _i = 0; _i < _sync.replaces.length; _i++) {
                        sed('-i', _sync.replaces[_i].search, _sync.replaces[_i].replace, './docker/wp/' + _dump);
                    }
                }

                // Set WP Config
                _yaml('docker-compose.yml', function (err, data) {

                    if (err) throw err;

                    var _wp = data.services.wordpress.environment;
                    sed('-i',"'DB_NAME', '"+_wp.WORDPRESS_DB_NAME+"'", "'DB_NAME', '"+_sync.db.name+"'", './docker/wp/wp-config.php');
                    sed('-i',"'DB_USER', '"+_wp.WORDPRESS_DB_USER+"'", "'DB_USER', '"+_sync.db.user+"'", './docker/wp/wp-config.php');
                    sed('-i',"'DB_PASSWORD', '"+_wp.WORDPRESS_DB_PASSWORD+"'", "'DB_PASSWORD', '"+_sync.db.password+"'", './docker/wp/wp-config.php');
                    sed('-i',"'DB_HOST', '"+_wp.WORDPRESS_DB_HOST+"'", "'DB_HOST', '"+_sync.db.host+"'", './docker/wp/wp-config.php');

                    var _git = exec('cd ./docker/wp/ && git add . && git commit -m "Build '+_build+'" && git push origin master', {silent : true});
                    if (_git.code == 0){

                        // Back to default WP Config
                        _yaml('docker-compose.yml', function (err, data) {
                            if (err) throw err;

                            var _wp = data.services.wordpress.environment;
                            sed('-i',"'DB_NAME', '"+_sync.db.name+"'", "'DB_NAME', '"+_wp.WORDPRESS_DB_NAME+"'", './docker/wp/wp-config.php');
                            sed('-i',"'DB_USER', '"+_sync.db.user+"'", "'DB_USER', '"+_wp.WORDPRESS_DB_USER+"'", './docker/wp/wp-config.php');
                            sed('-i',"'DB_PASSWORD', '"+_sync.db.password+"'", "'DB_PASSWORD', '"+_wp.WORDPRESS_DB_PASSWORD+"'", './docker/wp/wp-config.php');
                            sed('-i',"'DB_HOST', '"+_sync.db.host+"'", "'DB_HOST', '"+_wp.WORDPRESS_DB_HOST+"'", './docker/wp/wp-config.php');
                        });

                        echo('... Synchronisation terminée');
                    }else{
                        echo('... Erreur lors de la synchronisation');
                    }

                });
            }
        });
    },
    sync : function(){
        _fs.open('.Sync.json', 'r', function (err, fd) {
            if (err && err.code == 'ENOENT'){
                echo('Le fichier de synchronisation ".Sync.json" est inexistant');
            }else{
                _cmds.doSync();
            }
        })
    },
    reinit : function () {
        rm('-rf', ['.git', '.gitignore', 'README.md']);
        if (_data.themes != '' && _data.themes.length > 0){
            _data.themes.forEach(function (_index, _value) {
                var _themeFolder = __dirname+'/docker/wp/wp-content/themes/'+_index;
                mkdir('-p',_themeFolder);
                cd(_themeFolder);
                exec('git clone https://github.com/barriton/scratch.git . && npm install && grunt begin', {silent:true});
                echo ('... Terminée avec succès');
            });
        }
    },
    install : function () {
        echo('Installation...');

        var _name = _rlSync.question('Nom du projet ? ('+(_data.name)+') : \n');
        if (_name != '')
            _data.name = _name;

        var _prefix = _rlSync.question('Préfixe de table ? ('+_data.prefix+') : \n');
        if (_prefix != '')
            _data.prefix = _prefix;

        var _folders = _rlSync.question('Créer les dossiers de thèmes ? (saisir les slugs séparés par une virgule) : \n');
        if (_folders != '')
            _data.themes = _folders.trim().split(',');

        // Change in docker-compose
        sed('-i','_NAME_', _data.name, 'docker-compose.yml');
        sed('-i','_PREFIX_', _data.prefix, 'docker-compose.yml');

        // Run docker
        exec('docker-compose up -d', {silent:true});

        // Reinit
        _cmds.reinit();
    },
    help : function () {
        echo('\nWP Manipule, du local au web');
        echo('\nUsage : \nwp-manipulate --help, --install, --watch\n');
        echo('--help : Affiche cette aide');
        echo('--install[=watch] : Installation de WordPress via Docker');
        echo('--start : Start les conteneurs Docker');
        echo('--stop : Stop les conteneurs Docker');
        echo('--rm : Supprime le Wordpress (Docker + files)');
        echo('--sync : Synchronise le local au distant');
    },
    stop : function () {
        echo('Arrêt...');
        exec('docker-compose stop', {silent : true});
        echo('... Terminé');
    },
    start : function () {
        echo('Démarrage...');
        exec('docker-compose start', {silent : true});
        echo('... Prêt');
    },
    rm : function () {
        echo('Suppression...');
        exec('docker-compose down -v', {silent: true});
        rm('-rf', './docker');
        echo('... Terminée');
    }
};

// Each commands
for(var _index in _args){
    var _attr = _args[_index];
    _help = false;

    switch (_index){
        case 'install' :

            _cmds.install();

            if (_attr == 'watch')
                _cmds.watch();

            break;
        case 'stop' :

            _cmds.stop();

            break;
        case 'sync' :

            _cmds.sync();

            break;
        case 'start' :

            _cmds.start();

            break;
        case 'rm' :

            _cmds.rm();

            break;
        case 'help':

            _cmds.help();

            break;
    }
}

if (_help){
    _cmds.help();
}