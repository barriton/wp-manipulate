#! /usr/bin/env node

var _shell = require("shelljs/global");
var _rl = require('readline');
var _path = require('path');
var _parse = require('./parser.es5');
var _fs = require('fs');

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
    'prefix' :  randomString(8)+'_',
    'git' : ''
};

var _cmds = {
    reinit : function () {
        rm('-rf', ['.git', '.gitignore', 'README.md']);
        cd(__dirname+'/docker/wp/wp-content');
        exec('git init');
        if (_data.git != '')
            exec('git remote add origin '+_data.git);
    },
    install : function () {
        echo('Installation...');

        // Prompt each data
        var _r = _rl.createInterface({
            input : process.stdin,
            output : process.stdout
        });
        _r.question('Nom du projet ? ('+(_data.name)+') : \n', function (answer) {
            if (answer.trim() != '')
                _data.name = answer;

            _r.question('Préfixe de table ? ('+_data.prefix+') : \n', function (answer) {

                if (answer.trim() != '')
                    _data.prefix = answer;

                // Generate docker-compose.yml
                for(var _index in _data){
                    var _val = _data[_index];
                    var _regex = new RegExp('_'+_index.toUpperCase()+'_');
                    sed('-i',_regex, _val, 'docker-compose.yml');
                }

                _r.question('Dépôt git distant ? : \n', function (answer) {
                    _r.close();

                    if (answer.trim() != '')
                        _data.git = answer;

                    // Run docker
                    exec('docker-compose up -d', function () {

                        // Reinit
                        _cmds.reinit();

                    });

                });

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