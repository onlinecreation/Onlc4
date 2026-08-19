# Paquets de langue de l’interface

Ces fichiers traduisent l’interface du **cœur et du thème** de l’éditeur. Ils sont produits
par `tools/i18n/build-langs.js` à partir des traductions de TinyMCE 6 (licence MIT).

```html
<script src="/hugerte/hugerte.js"></script>
<script>hugerte.init({ language: 'fr' });</script>
```

Le fichier est chargé tout seul depuis `langs/<code>.js`. Les codes régionaux (`fr_FR`,
`pt_BR`…) ont un alias sur leur code court quand celui-ci est libre : `fr` et `fr_FR`
fonctionnent donc l’un comme l’autre.

Les intitulés des **plugins ONLC** sont traduits à part, par les paquets de `langs/onlc/`
(voir `docs/i18n.md`). Chargez les deux pour une interface entièrement traduite.

Ne modifiez pas ces fichiers à la main : ils sont réécrits à chaque génération. Pour
corriger une traduction de l’interface du cœur, passez par le projet amont :
https://crowdin.com/project/hugerte
