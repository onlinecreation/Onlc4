import { Arr, Obj, Optional, Type } from '@ephox/katamari';

import Editor from 'hugerte/core/api/Editor';
import { Dialog } from 'hugerte/core/api/ui/Ui';
import * as LangMarkers from 'hugerte/plugins/onlcshared/text/LangMarkers';

import { SchemaField } from '../api/Types';
import * as Jsonld from '../core/Jsonld';
import * as Langs from '../core/Langs';
import * as Schema from '../core/Schema';
import * as FormStyles from './FormStyles';

/**
 * Le formulaire des microdonnées, du choix du type au json final.
 *
 * ## Pourquoi un composant à part et non un dialogue ordinaire
 *
 * Un dialogue de l'éditeur décrit ses champs une fois pour toutes, à l'ouverture. Or ici la liste
 * des champs **est** la chose que l'on modifie : on part des propriétés exigées, on en ajoute au
 * fur et à mesure, et certaines ouvrent à leur tour un objet qui a ses propres propriétés. Une
 * fiche produit contient une offre, qui contient un montant ; un commerce contient une adresse et
 * six plages horaires. Rien de tout cela ne tient dans une liste de champs figée.
 *
 * ## Le parcours
 *
 * 1. **Quel contenu décrivez-vous ?** Les types sont présentés par rubrique, avec une phrase
 *    d'explication et leur nom schema.org en petit — le rédacteur lit la phrase, l'intégrateur
 *    vérifie le nom.
 * 2. **Ce qu'il faut renseigner.** Les propriétés exigées apparaissent d'emblée et ne peuvent pas
 *    être retirées ; les conseillées apparaissent aussi, mais se retirent.
 * 3. **Ce que vous voulez ajouter.** Une liste déroulante propose le reste des propriétés du type
 *    — héritage compris — et une entrée permet d'en écrire une que le catalogue ignore.
 *
 * Un objet imbriqué se modifie **dans la même fenêtre** : le fil d'Ariane du haut dit où l'on se
 * trouve et permet de remonter. Ouvrir un second dialogue par-dessus le premier obligerait à
 * empiler des fenêtres pour renseigner une adresse.
 *
 * ## Ce qui est produit
 *
 * Un objet json, rien d'autre. Les valeurs vides ne sont pas écrites : une propriété laissée en
 * blanc n'a pas à figurer dans la fiche, où elle serait signalée comme une erreur.
 */

/** Un niveau de la navigation : l'objet en cours, son type, et comment le reposer en remontant. */
interface Level {
  readonly label: string;
  readonly typeName: string;
  readonly data: Record<string, Jsonld.JsonldValue | undefined>;
  readonly commit: (value: Jsonld.JsonldObject) => void;
}

/**
 * Valeur réservée de la liste déroulante : écrire soi-même le nom d'une propriété.
 *
 * Les tirets bas la mettent hors d'atteinte d'un vrai nom schema.org, qui commence toujours par
 * une lettre : aucune propriété du vocabulaire ne peut donc la recouvrir.
 */
const freeValue = '__libre__';

/**
 * Le type de champ html correspondant à chaque type de propriété.
 *
 * Les types absents retombent sur `text` : une adresse ou une image se saisissent dans un champ
 * ordinaire, où la validation stricte du navigateur ferait plus de mal que de bien — elle refuse
 * une adresse relative, qui est pourtant ce qu'on écrit le plus souvent.
 */
const inputTypes: Record<string, string> = {
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
  number: 'number'
};

const isBlank = (value: Jsonld.JsonldValue | undefined): boolean => {
  if (Type.isString(value)) {
    return value.trim() === '';
  }
  if (Type.isArray(value)) {
    return Arr.forall(value, isBlank);
  }
  if (Type.isObject(value)) {
    const record = value as Jsonld.JsonldObject;
    return Arr.forall(Obj.keys(record), (key) => key.indexOf('@') === 0 || isBlank(record[key]));
  }
  return true;
};

/** L'objet débarrassé de ses propriétés vides, prêt à être écrit. */
const prune = (data: Jsonld.JsonldObject): Jsonld.JsonldObject => {
  const cleaned: Record<string, Jsonld.JsonldValue> = {};
  Obj.each(data, (value, key) => {
    if (!Type.isNonNullable(value) || isBlank(value)) {
      return;
    }
    if (Type.isArray(value)) {
      const kept = Arr.filter(value, (entry) => !isBlank(entry));
      cleaned[key] = kept.length === 1 ? kept[0] : kept;
    } else if (Type.isObject(value)) {
      cleaned[key] = prune(value as Jsonld.JsonldObject);
    } else {
      cleaned[key] = value;
    }
  });
  return cleaned;
};

/** La valeur d'une propriété ramenée à une liste, qu'elle en soit une ou non. */
const asList = (value: Jsonld.JsonldValue | undefined): Jsonld.JsonldValue[] => {
  if (!Type.isNonNullable(value)) {
    return [];
  }
  return Type.isArray(value) ? value : [ value ];
};

/** Ce que le formulaire dit au dialogue à chaque changement de niveau. */
export interface LevelState {
  /** 0 à la racine de la fiche, 1 dans un objet imbriqué, et ainsi de suite. */
  readonly depth: number;
  /** Intitulé du niveau où l'on se trouve. */
  readonly label: string;
  /** Intitulé du niveau qui le contient, ou chaîne vide à la racine. */
  readonly parent: string;
}

/** Ce que le formulaire appelle à chaque changement de niveau. */
export type LevelListener = (state: LevelState) => void;

const create = (editor: Editor, onLevel: LevelListener) => (element: HTMLElement): Promise<Dialog.CustomEditorInit> => {
  const doc = element.ownerDocument;
  FormStyles.ensure(doc);

  const t = (text: string): string => editor.translate(text) as string;

  const languages = Langs.list(editor);

  let root: Jsonld.JsonldObject = {};
  let stack: Level[] = [];

  element.className = 'onlc-schema';

  const node = <K extends keyof HTMLElementTagNameMap>(name: K, cls: string): HTMLElementTagNameMap[K] => {
    const created = doc.createElement(name);
    created.className = cls;
    return created;
  };

  const button = (label: string, cls: string, onClick: () => void): HTMLButtonElement => {
    const created = node('button', `onlc-schema__btn ${cls}`);
    created.type = 'button';
    created.textContent = t(label);
    created.addEventListener('click', onClick);
    return created;
  };

  const current = (): Level => stack[stack.length - 1];

  const descend = (level: Level) => {
    stack = stack.concat([ level ]);
    renderFromTop();
  };

  /** Remonte jusqu'au niveau demandé, en reposant chaque valeur dans celui qui la contient. */
  const ascend = (to: number) => {
    while (stack.length > to + 1) {
      const level = stack[stack.length - 1];
      stack = stack.slice(0, stack.length - 1);
      level.commit(prune(level.data));
    }
  };

  const goUp = (to: number) => {
    ascend(to);
    renderFromTop();
  };

  const renderTypePicker = () => {
    element.innerHTML = '';

    const intro = node('div', 'onlc-schema__intro');
    intro.innerHTML = `<strong>${Jsonld.escape(t('Que décrit cette page ?'))}</strong> ` +
      Jsonld.escape(t('Les moteurs de recherche affichent un prix, des étoiles ou une date de concert ' +
        'quand la page le leur dit dans un langage qu’ils connaissent. Choisissez ce qui correspond ' +
        'le mieux — vous pourrez en changer.'));
    element.appendChild(intro);

    const types = node('div', 'onlc-schema__types');

    Arr.each(Schema.categories(editor), (category) => {
      const title = node('p', 'onlc-schema__grouptitle');
      title.textContent = t(category);
      types.appendChild(title);

      const list = node('div', 'onlc-schema__typelist');
      Arr.each(Arr.filter(Schema.choosable(editor), (type) => type.category === category), (type) => {
        const card = node('button', 'onlc-schema__type');
        card.type = 'button';

        const name = node('span', 'onlc-schema__typename');
        name.textContent = t(type.label);

        const desc = node('span', 'onlc-schema__typedesc');
        desc.textContent = t(type.description);

        const raw = node('span', 'onlc-schema__typeraw');
        raw.textContent = type.name;

        card.appendChild(name);
        card.appendChild(desc);
        card.appendChild(raw);
        card.addEventListener('click', () => setType(type.name));
        list.appendChild(card);
      });
      types.appendChild(list);
    });

    element.appendChild(types);
  };

  /**
   * Choisit — ou change — le type décrit.
   *
   * Les valeurs déjà saisies sont conservées : passer de « Produit » à « Prestation » garde le nom
   * et la description, qui ont le même sens dans les deux. Celles que le nouveau type ne connaît
   * pas ne sont pas perdues pour autant : elles restent dans la fiche, et le formulaire les
   * présente comme des propriétés écrites à la main.
   */
  const setType = (typeName: string) => {
    root = { ...prune(root), '@type': typeName };
    stack = [{
      label: Schema.labelOf(editor, typeName),
      typeName,
      data: { ...root },
      commit: (value) => {
        root = value;
      }
    }];
    renderFromTop();
  };

  /**
   * L'entête d'un objet imbriqué : d'où l'on vient, et ce qu'on modifie.
   *
   * Un fil d'Ariane seul ne suffisait pas. Descendre dans le prix d'une offre affichait la même
   * page que la fiche elle-même, à trois mots près en haut de l'écran : on ne voyait pas qu'on
   * avait changé de niveau, et les boutons du pied — « Annuler », « Mettre à jour » — étaient pris
   * pour le moyen de revenir en arrière.
   *
   * La barre est donc **collante** et occupe toute la largeur : un bouton de retour qui nomme le
   * niveau parent, le nom du niveau courant en gros, et le chemin complet en dessous pour qui
   * descend de plusieurs crans.
   */
  const levelHeader = (): HTMLElement => {
    const parent = stack[stack.length - 2];
    const level = current();

    const bar = node('div', 'onlc-schema__level');

    const back = node('button', 'onlc-schema__back');
    back.type = 'button';
    back.innerHTML = '<span aria-hidden="true">\u2190</span> ';
    back.appendChild(doc.createTextNode(`${t('Retour à')} ${t(parent.label)}`));
    back.addEventListener('click', () => goUp(stack.length - 2));
    bar.appendChild(back);

    const here = node('div', 'onlc-schema__here');
    const title = node('span', 'onlc-schema__heretitle');
    title.textContent = `${t('Vous modifiez')} : ${t(level.label)}`;
    const name = node('code', 'onlc-schema__name');
    name.textContent = level.typeName;
    here.appendChild(title);
    here.appendChild(name);
    bar.appendChild(here);

    if (stack.length > 2) {
      bar.appendChild(trail());
    }

    return bar;
  };

  /** Le chemin complet, en rappel : utile à partir de deux niveaux d'imbrication. */
  const trail = (): HTMLElement => {
    const bar = node('div', 'onlc-schema__trail');
    Arr.each(stack, (level, index) => {
      if (index > 0) {
        const sep = node('span', 'onlc-schema__sep');
        sep.textContent = '\u203a';
        bar.appendChild(sep);
      }
      const last = index === stack.length - 1;
      const crumb = node('button', `onlc-schema__crumb${last ? ' onlc-schema__crumb--current' : ''}`);
      crumb.type = 'button';
      crumb.textContent = t(level.label);
      if (last) {
        crumb.disabled = true;
      } else {
        crumb.addEventListener('click', () => goUp(index));
      }
      bar.appendChild(crumb);
    });
    return bar;
  };

  /** L'entête d'un champ : son intitulé, son nom schema.org, et le cas échéant sa mention. */
  const fieldHead = (field: SchemaField, required: boolean, onRemove: Optional<() => void>): HTMLElement => {
    const head = node('div', 'onlc-schema__head');

    const label = node('span', 'onlc-schema__label');
    label.textContent = t(field.label);

    const name = node('code', 'onlc-schema__name');
    name.textContent = field.name;

    head.appendChild(label);
    head.appendChild(name);

    if (required) {
      const badge = node('span', 'onlc-schema__badge');
      badge.textContent = t('Obligatoire');
      head.appendChild(badge);
    }

    onRemove.each((drop) => {
      const remove = button('✕', 'onlc-schema__btn--danger onlc-schema__btn--small', drop);
      remove.title = `${t('Retirer')} ${t(field.label)}`;
      remove.setAttribute('aria-label', remove.title);
      head.appendChild(remove);
    });

    return head;
  };

  /**
   * Le sélecteur d'une image : sa vignette, et le bouton qui ouvre la médiathèque.
   *
   * Aucun champ d'adresse. Personne n'écrit de mémoire l'adresse d'une photo, et une adresse
   * recopiée de travers donne une fiche que les moteurs rejettent sans rien dire. Le champ ne
   * reparaît que si l'explorateur n'est pas chargé : mieux vaut un champ austère que pas de
   * moyen du tout d'indiquer une image.
   */
  const imageInput = (value: string, onChange: (next: string) => void): HTMLElement => {
    const box = node('div', 'onlc-schema__image');

    const thumb = node('button', 'onlc-schema__thumb');
    thumb.type = 'button';
    thumb.title = t('Choisir cette image dans la médiathèque');
    thumb.setAttribute('aria-label', thumb.title);

    const caption = node('span', 'onlc-schema__imagepath');
    const actions = node('div', 'onlc-schema__imageactions');

    const show = (next: string) => {
      if (next.trim() === '') {
        thumb.style.backgroundImage = '';
        thumb.textContent = t('aucune');
        caption.textContent = t('Aucune image choisie.');
      } else {
        thumb.textContent = '';
        thumb.style.backgroundImage = `url("${next.replace(/["\\]/g, '\\$&')}")`;
        caption.textContent = next;
      }
    };

    const set = (next: string) => {
      show(next);
      onChange(next);
    };

    const pick = (): boolean => editor.execCommand('OnlcPickMedia', false, {
      multiple: false,
      accept: 'image/',
      onSelect: (files: Array<{ url: string }>) => {
        Arr.head(files).each((file) => set(editor.documentBaseURI.toAbsolute(file.url)));
      }
    }) !== false;

    /** Champ d'adresse de secours, posé une seule fois, quand l'explorateur n'a pas répondu. */
    const fallback = () => {
      if (box.querySelector('.onlc-schema__fallback') !== null) {
        return;
      }
      const input = node('input', 'onlc-schema__input onlc-schema__fallback');
      input.type = 'url';
      input.value = value;
      input.placeholder = t('Adresse de l’image');
      input.setAttribute('aria-label', t('Adresse de l’image'));
      input.addEventListener('change', () => set(input.value));
      box.appendChild(input);
      input.focus();
    };

    thumb.addEventListener('click', () => {
      if (!pick()) {
        fallback();
      }
    });

    actions.appendChild(button(value.trim() === '' ? 'Choisir une image…' : 'Changer l’image…',
      'onlc-schema__btn--small', () => {
        if (!pick()) {
          fallback();
        }
      }));

    if (value.trim() !== '') {
      const clear = button('Retirer', 'onlc-schema__btn--small onlc-schema__btn--danger', () => set(''));
      clear.title = t('Retirer cette image');
      actions.appendChild(clear);
    }

    const body = node('div', 'onlc-schema__imagebody');
    body.appendChild(caption);
    body.appendChild(actions);

    box.appendChild(thumb);
    box.appendChild(body);
    show(value);
    return box;
  };

  /** Le champ nu, sans la barre des langues : c'est lui qui porte réellement la valeur. */
  const plainInput = (field: SchemaField, value: string, onChange: (next: string) => void): HTMLElement => {
    if (field.type === 'select') {
      const select = node('select', 'onlc-schema__select');
      const blank = doc.createElement('option');
      blank.value = '';
      blank.textContent = t('— choisir —');
      select.appendChild(blank);
      Arr.each(field.items ?? [], (item) => {
        const option = doc.createElement('option');
        option.value = item.value;
        option.textContent = t(item.text);
        select.appendChild(option);
      });
      select.value = value;
      select.addEventListener('change', () => onChange(select.value));
      return select;
    }

    if (field.type === 'textarea') {
      const area = node('textarea', 'onlc-schema__area');
      area.value = value;
      if (Type.isString(field.placeholder)) {
        area.placeholder = field.placeholder;
      }
      area.addEventListener('input', () => onChange(area.value));
      return area;
    }

    const input = node('input', 'onlc-schema__input');
    input.type = inputTypes[field.type] ?? 'text';
    input.value = value;
    if (Type.isString(field.placeholder)) {
      input.placeholder = field.placeholder;
    }
    input.addEventListener('input', () => onChange(input.value));
    return input;
  };

  /** Les types de champs qui se traduisent : du texte lu par un humain, et rien d'autre. */
  const translatable = (field: SchemaField): boolean =>
    field.type === 'text' || field.type === 'textarea';

  /**
   * Un champ de texte, avec ses versions par langue.
   *
   * Par défaut une valeur est **internationale** : elle est publiée quelle que soit la langue
   * demandée, et c'est ce que veut la quasi-totalité des propriétés — un prix, une référence, un
   * code-barres n'ont pas de traduction. Le nom et la description d'un produit, si.
   *
   * La barre n'apparaît que si le site déclare des langues. Sur un site monolingue, le champ est
   * exactement celui d'avant : rien de tout ceci n'a alors de sens à montrer.
   *
   * Vider la version d'une langue la retire : c'est ainsi qu'on revient à l'international, sans
   * avoir à chercher un bouton de suppression.
   */
  const multilingualInput = (
    field: SchemaField,
    value: string,
    onChange: (next: string) => void
  ): HTMLElement => {
    const box = node('div', 'onlc-schema__langs');
    let parsed = LangMarkers.parse(value);
    let selected = '';

    const bar = node('div', 'onlc-schema__langbar');
    const holder = node('div', 'onlc-schema__langfield');
    const note = node('p', 'onlc-schema__help');

    const publish = () => onChange(LangMarkers.compose(parsed));

    const draw = () => {
      bar.innerHTML = '';
      holder.innerHTML = '';

      const chip = (code: string, label: string) => {
        const written = code === ''
          ? parsed.common.trim() !== ''
          : LangMarkers.textOf(parsed, code).trim() !== '';
        const active = code === selected;
        const entry = node('button', 'onlc-schema__lang'
          + (active ? ' onlc-schema__lang--current' : '')
          + (written ? ' onlc-schema__lang--filled' : ''));
        entry.type = 'button';
        entry.textContent = label;
        entry.setAttribute('aria-pressed', String(active));
        entry.addEventListener('click', () => {
          selected = code;
          draw();
        });
        bar.appendChild(entry);
      };

      chip('', t('Toutes les langues'));
      Arr.each(languages, (language) => chip(language.code, language.label));

      const currentText = selected === '' ? parsed.common : LangMarkers.textOf(parsed, selected);
      holder.appendChild(plainInput(field, currentText, (next) => {
        parsed = selected === ''
          ? LangMarkers.withCommon(parsed, next)
          : LangMarkers.withText(parsed, selected, next);
        publish();
      }));

      note.textContent = selected === ''
        ? t('Cette valeur est publiée dans toutes les langues. Choisissez une langue pour en écrire une version qui ne paraîtra que dans celle-là.')
        : `${t('Version publiée uniquement en')} ${
          Arr.find(languages, (language) => language.code === selected)
            .fold(() => selected, (language) => language.label)
        }. ${t('Videz ce champ pour la retirer.')}`;
    };

    // On ouvre sur la version internationale, sauf si la valeur n'en a pas : une fiche déjà
    // traduite doit montrer ce qu'elle contient, pas un champ vide.
    const written = LangMarkers.codesOf(parsed);
    selected = parsed.common.trim() === '' && written.length > 0 ? written[0] : '';

    box.appendChild(bar);
    box.appendChild(holder);
    box.appendChild(note);
    draw();
    return box;
  };

  const simpleInput = (field: SchemaField, value: string, onChange: (next: string) => void): HTMLElement => {
    if (field.type === 'image') {
      return imageInput(value, onChange);
    }
    if (translatable(field) && languages.length > 0) {
      return multilingualInput(field, value, onChange);
    }
    return plainInput(field, value, onChange);
  };

  const nestedInput = (
    field: SchemaField,
    value: Jsonld.JsonldValue | undefined,
    onChange: (next: Jsonld.JsonldValue | undefined) => void
  ): HTMLElement => {
    const box = node('div', 'onlc-schema__nested');
    const known = Type.isObject(value) && !Type.isArray(value) ? value as Jsonld.JsonldObject : {};
    const declared = Jsonld.typeOf(known);
    const typeName = declared !== '' ? declared : (field.of ?? [ 'Thing' ])[0];

    const text = node('span', 'onlc-schema__nestedtext');
    const summary = Jsonld.summarize(known);
    if (summary === '') {
      text.className += ' onlc-schema__nestedempty';
      text.textContent = `${t('Rien de renseigné')} — ${Schema.labelOf(editor, typeName)}`;
    } else {
      text.textContent = `${Schema.labelOf(editor, typeName)} : ${summary}`;
    }
    box.appendChild(text);

    // Plusieurs types possibles — un auteur est une personne ou une entreprise — se choisissent
    // ici plutôt que dans un formulaire de plus.
    const choices = field.of ?? [ 'Thing' ];
    if (choices.length > 1) {
      const select = node('select', 'onlc-schema__select');
      Arr.each(choices, (choice) => {
        const option = doc.createElement('option');
        option.value = choice;
        option.textContent = Schema.labelOf(editor, choice);
        select.appendChild(option);
      });
      select.value = typeName;
      select.addEventListener('change', () => onChange({ ...known, '@type': select.value }));
      box.appendChild(select);
    }

    box.appendChild(button('Modifier…', 'onlc-schema__btn--small', () => {
      descend({
        label: field.label,
        typeName,
        data: { ...known, '@type': typeName },
        commit: (updated) => onChange(updated)
      });
    }));

    if (summary !== '') {
      const clear = button('✕', 'onlc-schema__btn--danger onlc-schema__btn--small', () => onChange(undefined));
      clear.title = t('Vider');
      clear.setAttribute('aria-label', t('Vider'));
      box.appendChild(clear);
    }

    return box;
  };

  const renderField = (field: SchemaField, required: boolean): HTMLElement => {
    const level = current();
    const box = node('div', `onlc-schema__field${required ? ' onlc-schema__field--required' : ''}`);

    const remove = required
      ? Optional.none<() => void>()
      : Optional.some(() => {
        delete level.data[field.name];
        render();
      });

    box.appendChild(fieldHead(field, required, remove));

    if (Type.isString(field.help)) {
      const help = node('p', 'onlc-schema__help');
      help.textContent = t(field.help);
      box.appendChild(help);
    }

    const values = asList(level.data[field.name]);
    const shown: Jsonld.JsonldValue[] = values.length === 0 ? [ field.type === 'nested' ? {} : '' ] : values;

    const store = (updated: Jsonld.JsonldValue[]) => {
      level.data[field.name] = updated.length === 1 ? updated[0] : updated;
    };

    const setAt = (index: number, next: Jsonld.JsonldValue | undefined) => {
      const updated = shown.slice();
      if (Type.isNonNullable(next)) {
        updated[index] = next;
      } else {
        updated.splice(index, 1);
      }
      store(updated);
      render();
    };

    Arr.each(shown, (value, index) => {
      const row = node('div', 'onlc-schema__row');
      const control = field.type === 'nested'
        ? nestedInput(field, value, (next) => setAt(index, next))
        : simpleInput(field, Type.isString(value) ? value : '', (next) => {
          // La frappe ne redessine pas le formulaire : le champ perdrait le curseur à chaque
          // caractère. La valeur est rangée directement, et le formulaire n'est reconstruit
          // qu'aux gestes qui en changent la structure.
          const updated = shown.slice();
          updated[index] = next;
          store(updated);
        });

      row.appendChild(control);

      if (field.many === true && shown.length > 1) {
        const drop = button('✕', 'onlc-schema__btn--danger onlc-schema__btn--small', () => setAt(index, undefined));
        drop.title = t('Retirer cette valeur');
        drop.setAttribute('aria-label', drop.title);
        row.appendChild(drop);
      }

      box.appendChild(row);
    });

    if (field.many === true) {
      box.appendChild(button('Ajouter une valeur', 'onlc-schema__btn--small', () => {
        store(shown.concat([ field.type === 'nested' ? {} : '' ]));
        render();
      }));
    }

    return box;
  };

  /** Une propriété que le catalogue ne connaît pas : elle est présentée comme du texte libre. */
  const unknownField = (name: string): SchemaField => ({
    name,
    label: name,
    type: 'text',
    help: 'Propriété écrite à la main : l’éditeur ne la connaît pas et ne peut donc pas la vérifier.'
  });

  const renderGroup = (title: string, fields: SchemaField[], required: boolean): Optional<HTMLElement> => {
    if (fields.length === 0) {
      return Optional.none();
    }
    const group = node('div', 'onlc-schema__group');
    const heading = node('p', 'onlc-schema__grouptitle');
    heading.textContent = t(title);
    group.appendChild(heading);
    Arr.each(fields, (field) => group.appendChild(renderField(field, required)));
    return Optional.some(group);
  };

  const renderAdd = (available: SchemaField[]): HTMLElement => {
    const level = current();
    const bar = node('div', 'onlc-schema__add');

    const select = node('select', 'onlc-schema__select');
    const blank = doc.createElement('option');
    blank.value = '';
    blank.textContent = t('Ajouter une propriété…');
    select.appendChild(blank);

    Arr.each(available, (field) => {
      const option = doc.createElement('option');
      option.value = field.name;
      option.textContent = `${t(field.label)} (${field.name})`;
      select.appendChild(option);
    });

    const free = doc.createElement('option');
    free.value = freeValue;
    free.textContent = t('Une autre propriété, écrite à la main…');
    select.appendChild(free);

    select.addEventListener('change', () => {
      const chosen = select.value;
      if (chosen === '') {
        return;
      }
      if (chosen === freeValue) {
        select.value = '';
        const typed = doc.defaultView?.prompt(
          t('Nom exact de la propriété schema.org, par exemple award :'), '') ?? '';
        const name = typed.trim();
        if (/^[a-zA-Z][A-Za-z0-9]*$/.test(name)) {
          level.data[name] = '';
          render();
        }
        return;
      }
      Arr.find(available, (candidate) => candidate.name === chosen).each((found) => {
        level.data[found.name] = found.type === 'nested' ? { '@type': (found.of ?? [ 'Thing' ])[0] } : '';
      });
      render();
    });

    bar.appendChild(select);
    return bar;
  };

  const renderLevel = () => {
    const level = current();
    const isRoot = stack.length === 1;
    element.innerHTML = '';
    if (!isRoot) {
      element.appendChild(levelHeader());
    }

    const required = Schema.requiredOf(editor, level.typeName);
    const recommended = Schema.recommendedOf(editor, level.typeName);
    const known = Schema.fieldsOf(editor, level.typeName);

    if (isRoot) {
      const intro = node('div', 'onlc-schema__intro');
      intro.innerHTML = `<strong>${Jsonld.escape(Schema.labelOf(editor, level.typeName))}</strong> ` +
        `<code class="onlc-schema__name">${Jsonld.escape(level.typeName)}</code><br>` +
        Jsonld.escape(t('Les propriétés marquées « Obligatoire » doivent être remplies pour que les moteurs ' +
          'acceptent la fiche. Les autres l’enrichissent.'));
      element.appendChild(intro);
      element.appendChild(button('Changer de type de contenu…', 'onlc-schema__btn--small', () => {
        stack = [];
        renderFromTop();
      }));
    }

    /** Les propriétés déjà renseignées qui ne sont ni exigées ni conseillées. */
    const extras = Arr.filter(Obj.keys(level.data), (key) =>
      key.indexOf('@') !== 0 && !Arr.contains(required, key) && !Arr.contains(recommended, key));

    const fieldFor = (name: string): SchemaField =>
      Arr.find(known, (field) => field.name === name).getOrThunk(() => unknownField(name));

    renderGroup('À renseigner', Arr.map(required, fieldFor), true)
      .each((group) => element.appendChild(group));
    renderGroup('Conseillées', Arr.map(recommended, fieldFor), false)
      .each((group) => element.appendChild(group));
    renderGroup('Ajoutées', Arr.map(extras, fieldFor), false)
      .each((group) => element.appendChild(group));

    const used = required.concat(recommended).concat(extras);
    element.appendChild(renderAdd(Arr.filter(known, (field) => !Arr.contains(used, field.name))));

    if (isRoot) {
      const preview = node('pre', 'onlc-schema__preview');
      preview.textContent = Jsonld.toJson(prune({ ...level.data }));
      element.appendChild(preview);
    }
  };

  const render = () => {
    if (stack.length === 0) {
      renderTypePicker();
    } else {
      renderLevel();
    }
    onLevel(stack.length === 0
      ? { depth: 0, label: '', parent: '' }
      : {
        depth: stack.length - 1,
        label: current().label,
        parent: stack.length > 1 ? stack[stack.length - 2].label : ''
      });
  };

  /**
   * Redessine, puis **remonte en haut**.
   *
   * Un changement de niveau doit repartir du début : descendre dans le prix d'une offre laissait
   * le formulaire à la hauteur où l'on venait de cliquer, c'est-à-dire souvent au milieu de rien,
   * et il fallait remonter à la main pour voir où l'on était et commencer à écrire.
   *
   * Les redessins **à l'intérieur** d'un niveau — ajouter une valeur, retirer une propriété —
   * passent par `render` et gardent la position : y remonter serait tout aussi désagréable.
   */
  const renderFromTop = () => {
    render();
    element.scrollTop = 0;
  };

  /** La fiche complète : tous les niveaux ouverts sont refermés avant d'être lus. */
  const collect = (): Jsonld.JsonldObject => {
    ascend(0);
    return stack.length === 0 ? prune(root) : prune(stack[0].data);
  };

  render();

  return Promise.resolve({
    getValue: () => JSON.stringify(collect()),
    setValue: (next: string) => {
      try {
        const parsed: unknown = JSON.parse(Type.isString(next) && next !== '' ? next : '{}');
        root = Type.isObject(parsed) ? parsed as Jsonld.JsonldObject : {};
      } catch (_err) {
        root = {};
      }
      const typeName = Jsonld.typeOf(root);
      stack = [];
      if (typeName !== '') {
        setType(typeName);
      } else {
        render();
      }
    },
    destroy: () => {
      element.innerHTML = '';
    }
  });
};

/** Spec du composant, à placer dans un dialogue. */
const field = (editor: Editor, name: string, onLevel: LevelListener): Dialog.CustomEditorSpec => ({
  type: 'customeditor',
  name,
  tag: 'div',
  init: create(editor, onLevel)
});

export {
  isBlank,
  prune,
  asList,
  create,
  field
};
