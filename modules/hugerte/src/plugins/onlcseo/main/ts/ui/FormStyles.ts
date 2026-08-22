/**
 * Habillage du formulaire des microdonnées.
 *
 * Les styles sont posés dans le document du back-office plutôt que dans une feuille du plugin :
 * le formulaire est un composant libre du dialogue, et le thème n'habille que ses propres champs.
 * Tout est préfixé par `.tox` pour passer devant la remise à zéro très large de l'interface.
 */

const styleId = 'onlc-seo-form-styles';

const styles = `
.tox .onlc-schema { display: flex; flex-direction: column; gap: 12px; width: 100%; }
.tox .onlc-schema__trail { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 13px; }
.tox .onlc-schema__crumb {
  padding: 4px 10px; border: 0; border-radius: 999px; background: #eef2f6;
  font: inherit; font-size: 13px; color: #006ce7; cursor: pointer;
}
.tox .onlc-schema__crumb:hover { background: #d9e2ea; }
.tox .onlc-schema__crumb--current { background: transparent; color: #22303c; font-weight: 600; cursor: default; }
.tox .onlc-schema__crumb--current:hover { background: transparent; }
.tox .onlc-schema__sep { color: #8a949e; }

.tox .onlc-schema__intro {
  padding: 10px 12px; border-radius: 8px; background: #eef2f6; color: #22303c; font-size: 13px; line-height: 1.5;
}
.tox .onlc-schema__intro strong { font-weight: 600; }

.tox .onlc-schema__group { display: flex; flex-direction: column; gap: 10px; }
.tox .onlc-schema__grouptitle {
  margin: 4px 0 0; font-size: 12px; font-weight: 600; letter-spacing: 0.04em;
  text-transform: uppercase; color: #5a6570;
}

.tox .onlc-schema__field {
  display: flex; flex-direction: column; gap: 6px;
  padding: 10px 12px; border: 1px solid rgba(34, 47, 62, 0.14); border-radius: 8px; background: #fff;
}
.tox .onlc-schema__field--required { border-left: 3px solid #006ce7; }
.tox .onlc-schema__head { display: flex; align-items: baseline; gap: 8px; }
.tox .onlc-schema__label { flex: 1 1 auto; font-weight: 600; color: #22303c; }
.tox .onlc-schema__name { font-family: ui-monospace, "SFMono-Regular", "Menlo", monospace; font-size: 12px; color: #5a6570; }
.tox .onlc-schema__badge {
  padding: 1px 8px; border-radius: 999px; background: #006ce7; color: #fff; font-size: 11px; font-weight: 600;
}
.tox .onlc-schema__help { margin: 0; color: #5a6570; font-size: 12px; line-height: 1.5; }

.tox .onlc-schema__input, .tox .onlc-schema__area, .tox .onlc-schema__select {
  box-sizing: border-box; width: 100%; min-height: 44px; padding: 8px 10px;
  border: 1px solid rgba(34, 47, 62, 0.2); border-radius: 6px; font: inherit; color: #22303c; background: #fff;
}
.tox .onlc-schema__area { min-height: 88px; resize: vertical; }

.tox .onlc-schema__row { display: flex; gap: 8px; align-items: flex-start; }
.tox .onlc-schema__row > .onlc-schema__input { flex: 1 1 auto; }

.tox .onlc-schema__btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  min-height: 44px; padding: 0 14px; border: 1px solid rgba(34, 47, 62, 0.18);
  border-radius: 8px; background: #fff; font: inherit; color: #22303c; cursor: pointer; white-space: nowrap;
}
.tox .onlc-schema__btn:hover { background: #eef2f6; }
.tox .onlc-schema__btn--danger { min-width: 44px; padding: 0 10px; color: #5a6570; }
.tox .onlc-schema__btn--danger:hover { background: #fdecec; color: #b4241f; }
.tox .onlc-schema__btn--small { min-height: 34px; padding: 0 10px; font-size: 13px; }

.tox .onlc-schema__nested {
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 8px 10px;
  border: 1px dashed rgba(34, 47, 62, 0.28); border-radius: 6px; background: #f8fafc;
}
.tox .onlc-schema__nestedtext { flex: 1 1 160px; min-width: 0; color: #22303c; overflow-wrap: anywhere; }
.tox .onlc-schema__nestedempty { color: #5a6570; font-style: italic; }
.tox .onlc-schema__nested .onlc-schema__select { flex: 0 1 200px; width: auto; min-height: 34px; }

.tox .onlc-schema__add { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding-top: 4px; }
.tox .onlc-schema__add .onlc-schema__select { flex: 1 1 240px; width: auto; }

.tox .onlc-schema__types { display: flex; flex-direction: column; gap: 8px; }
.tox .onlc-schema__typelist { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
.tox .onlc-schema__type {
  display: flex; flex-direction: column; gap: 4px; padding: 12px;
  border: 1px solid rgba(34, 47, 62, 0.18); border-radius: 8px; background: #fff;
  font: inherit; text-align: left; cursor: pointer;
}
.tox .onlc-schema__type:hover { border-color: #006ce7; background: #f4f8fd; }
.tox .onlc-schema__typename { font-weight: 600; color: #22303c; }
.tox .onlc-schema__typedesc { color: #5a6570; font-size: 12px; line-height: 1.45; }
.tox .onlc-schema__typeraw { font-family: ui-monospace, "SFMono-Regular", "Menlo", monospace; font-size: 11px; color: #8a949e; }

/**
 * L'aperçu du json produit, en bas du formulaire.
 *
 * Il est là pour l'intégrateur : c'est exactement ce qui sera écrit dans la page, et le voir
 * évite d'avoir à publier pour vérifier. Sa hauteur est bornée pour qu'il ne repousse pas le
 * formulaire hors de l'écran.
 */
.tox .onlc-schema__preview {
  max-height: 220px; margin: 0; padding: 10px 12px; overflow: auto;
  border-radius: 8px; background: #22303c; color: #e8eef5;
  font-family: ui-monospace, "SFMono-Regular", "Menlo", monospace; font-size: 12px; line-height: 1.5;
  white-space: pre; tab-size: 2;
}
`;

const ensure = (doc: Document): void => {
  if (doc.getElementById(styleId) === null) {
    const style = doc.createElement('style');
    style.id = styleId;
    style.textContent = styles;
    doc.head.appendChild(style);
  }
};

export {
  styleId,
  styles,
  ensure
};
