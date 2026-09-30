import PluginManager from 'hugerte/core/api/PluginManager';

/**
 * Compatibilité : les codes courts font désormais partie de `onlcwidgets`.
 *
 * Blocs prédéfinis et éléments du site sont réunis dans un seul plugin, avec une seule
 * bibliothèque. Ce fichier ne subsiste que pour les configurations qui demandent encore
 * `onlcshortcodes` : plutôt que de laisser le chargeur échouer en silence sur un plugin absent,
 * il dit ce qu'il faut écrire à la place.
 *
 * Il ne charge rien : demander les deux noms n'ajoute donc ni code ni traitement.
 *
 * @class hugerte.onlcshortcodes.Plugin
 * @private
 */

export default (): void => {
  PluginManager.add('onlcshortcodes', (editor) => {
    if (!editor.hasPlugin('onlcwidgets')) {
      // eslint-disable-next-line no-console
      console.warn(
        '[onlc] Les codes courts font maintenant partie du plugin « onlcwidgets ». ' +
        'Remplacez « onlcshortcodes » par « onlcwidgets » dans l’option `plugins`.'
      );
    }
    return {};
  });
};
