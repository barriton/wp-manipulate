#! /usr/bin/env node

var _shell = require("shelljs/global");
var _rl = require('readline');
var _path = require('path');
var _parse = require('./parser.es5');
var _fs = require('fs');
var _ftp = require('ftpsync');

function randomString(length) {
    var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

// Print help
var _help = true;

// Get args
var _args = process.argv.slice(2);
_args = _parse(_args);

// Define default
var _data = {
    'name' : _path.parse(__dirname)['base'],
    'prefix' :  randomString(8)+'_'
};

var _cmds = {
    syncFile : function () {
        var _file = __dirname+_path.sep+'Syncfile.json';
        if (!_fs.existsSync(_file)) {
            echo('\nVous devez créer le fichier Syncfile.json avant de continuer\n');
            exit(1);
        }
        return JSON.parse(_fs.readFileSync(_file), 'utf8')['servers'];
    },
    sync : function () {
        var _folder = __dirname+_path.sep+'docker'+_path.sep+'wp';
        var _servers = _cmds.syncFile();
        for(_i = 0; _i < _servers.length; _i++){
            var _server = _servers[_i];
            _ftp.settings = {
                host: _server.host,
                user: _server.user,
                pass: _server.pass,
                local: _folder,
                remote: _server.folder
            };
            _ftp.run(function(err, result) {
                console.log(result);
            });
        }
    },
    watch : function () {
        var _sync = _cmds.syncFile();
        echo(_sync);
    },
    remove : function () {
        rm('-rf', ['.git', '.gitignore', 'README.md']);
    },
    install : function () {
        echo('Installation...');
        _cmds.remove();

        // Prompt each data
        var _r = _rl.createInterface({
            input : process.stdin,
            output : process.stdout
        });
        _r.question('Nom du projet ? ('+(_data.name)+') : \n', function (answer) {
            if (answer.trim() != '')
                _data.name = answer;

            _r.question('Préfixe de table ? ('+_data.prefix+') : \n', function (answer) {
                _r.close();
                if (answer.trim() != '')
                    _data.prefix = answer;

                // Generate docker-compose.yml
                for(var _index in _data){
                    var _val = _data[_index];
                    var _regex = new RegExp('_'+_index.toUpperCase()+'_');
                    sed('-i',_regex, _val, 'docker-compose.yml');
                }

                // Run docker
                exec('docker-compose up -d');

            });
        });
    },
    help : function () {
        _cmds.remove();

        echo('\nWP Manipule, du local au web');
        echo('\nUsage : \nwp-manipulate --help, --install, --watch\n');
        echo('--help : Affiche cette aide');
        echo('--install[=watch] : Installation de WordPress via Docker');
        echo('--start : Start les conteneurs Docker');
        echo('--stop : Stop les conteneurs Docker');
        echo('--rm : Supprime le Wordpress (Docker + files)');
        echo('--watch : Déployer facilement le projet\n');
    },
    stop : function () {
        echo('Arrêt...');
        exec('docker-compose stop');
    },
    start : function () {
        echo('Démarrage...');
        exec('docker-compose start');
    },
    rm : function () {
        echo('Suppression...');
        exec('docker-compose down -v');
        rm('-rf', './docker');
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
        case 'watch' :

            _cmds.watch();

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