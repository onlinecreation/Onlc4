/**
 * Habillage du formulaire des microdonnées.
 *
 * Les styles sont posés dans le document du back-office plutôt que dans une feuille du plugin :
 * le formulaire est un composant libre du dialogue, et le thème n'habille que ses propres champs.
 * Tout est préfixé par `.tox` pour passer devant la remise à zéro très large de l'interface.
 */

const styleId = 'onlc-seo-form-styles';

const styles = `
/**
 * Le formulaire défile **lui-même**.
 *
 * Le dialogue place un composant libre dans un cadre en overflow:hidden, dont
 * la hauteur vient du flex du corps. Une fiche produit complète y faisait douze cents pixels de
 * contenu dans quatre cent quatre-vingt-douze de cadre : tout ce qui passait sous la ligne de
 * flottaison — les dernières propriétés, et l'aperçu du json — était **hors d'atteinte**, sans
 * barre de défilement pour le dire.
 *
 * Le composant prend donc la hauteur de son cadre et fait défiler son propre contenu. Le retrait
 * intérieur est de son ressort aussi : le thème n'en pose aucun autour d'un composant libre, et
 * les champs se collaient aux bords.
 */
.tox .onlc-schema {
  display: flex; flex-direction: column; gap: 12px;
  box-sizing: border-box; width: 100%; height: 100%; max-height: 100%; min-height: 260px;
  padding: 4px 14px 14px; overflow-y: auto; overflow-x: hidden;
}
/**
 * L'entête d'un objet imbriqué.
 *
 * Elle est collante et occupe toute la largeur : descendre dans le prix d'une offre affichait
 * sinon la même page que la fiche elle-même, à trois mots près en haut de l'écran. On ne voyait
 * pas qu'on avait changé de niveau, et les boutons du pied du dialogue étaient pris pour le moyen
 * de revenir en arrière.
 */
.tox .onlc-schema__level {
  position: sticky; top: -4px; z-index: 2;
  display: flex; flex-direction: column; gap: 8px;
  margin: -4px -14px 0; padding: 12px 14px;
  background: #eef4fc; border-bottom: 2px solid #006ce7;
}
.tox .onlc-schema__back {
  align-self: flex-start;
  display: inline-flex; align-items: center; gap: 8px;
  min-height: 40px; padding: 0 16px;
  border: 1px solid #006ce7; border-radius: 8px; background: #fff;
  font: inherit; font-weight: 600; color: #006ce7; cursor: pointer;
}
.tox .onlc-schema__back:hover { background: #006ce7; color: #fff; }
.tox .onlc-schema__here { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; }
.tox .onlc-schema__heretitle { font-size: 15px; font-weight: 600; color: #22303c; }

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

/* Le sélecteur d'image : vignette, adresse en clair, et les deux boutons. */
.tox .onlc-schema__image { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
.tox .onlc-schema__thumb {
  flex: 0 0 auto; width: 88px; height: 88px; padding: 0; border-radius: 6px; cursor: pointer;
  border: 1px solid rgba(34, 47, 62, 0.2); background: #eef1f4 center/cover no-repeat;
  display: flex; align-items: center; justify-content: center; color: #8a949e; font: inherit; font-size: 11px;
}
.tox .onlc-schema__thumb:hover { outline: 2px solid #006ce7; outline-offset: 1px; }
.tox .onlc-schema__imagebody { display: flex; flex: 1 1 200px; min-width: 0; flex-direction: column; gap: 8px; }
.tox .onlc-schema__imagepath {
  color: #5a6570; font-size: 12px; overflow-wrap: anywhere; line-height: 1.4;
}
.tox .onlc-schema__imageactions { display: flex; flex-wrap: wrap; gap: 8px; }

/**
 * La barre des langues d'un champ de texte.
 *
 * Une pastille par langue déclarée, plus « Toutes les langues » qui est le cas ordinaire. Le
 * point marque celles pour lesquelles une version est écrite : sans lui, il faudrait cliquer sur
 * chacune pour savoir ce que la fiche contient.
 */
.tox .onlc-schema__langs { display: flex; flex-direction: column; gap: 8px; }
.tox .onlc-schema__langbar { display: flex; flex-wrap: wrap; gap: 6px; }
.tox .onlc-schema__lang {
  position: relative; min-height: 30px; padding: 3px 12px; border: 1px solid rgba(34, 47, 62, 0.18);
  border-radius: 999px; background: #fff; font: inherit; font-size: 12px; color: #5a6570; cursor: pointer;
}
.tox .onlc-schema__lang:hover { background: #eef2f6; }
.tox .onlc-schema__lang--current {
  border-color: #006ce7; background: #006ce7; color: #fff; font-weight: 600;
}
.tox .onlc-schema__lang--current:hover { background: #005bc4; }
.tox .onlc-schema__lang--filled::after {
  content: ""; position: absolute; top: 3px; right: 4px; width: 6px; height: 6px;
  border-radius: 50%; background: #2fae5e;
}
.tox .onlc-schema__lang--current.onlc-schema__lang--filled::after { background: #b9f2cf; }

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
  /* flex: 0 0 auto — sans lui, le formulaire étant une colonne flex, l'aperçu se laissait
     écraser à une ligne de haut par les champs qui le précèdent. */
  flex: 0 0 auto;
  max-height: 180px; margin: 0; padding: 10px 12px; overflow: auto;
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
