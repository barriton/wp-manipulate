# WP Manipulate

Gestionnaire de Wordpress

```
cd /my/project/folder/
git clone https://github.com/barriton/wp-manipulate.git .
npm install
node wp-manipulate --install
```

## Syncrhonisation

Pour utiliser la synchronisation du local au distant, il faut mettre en place un repo distant et utiliser le plugin wp "Barriton"

* Créer une clé SSH pour autoriser le repo distant au read-only
* Ajouter la clé au repo distant et tester la connection
```
ssh -T hg@bitbucket.org
```
* Mettre en place la structure des dossiers sur le serveur
```
/domain
/domain/builds/
/domain/.htaccess
```
* Créer le lien symbolique de la build courante vers le dossier current
```
ln -s builds/build- current
```
* Lors du lancement du projet, le dossier de build doit être créé à la main.