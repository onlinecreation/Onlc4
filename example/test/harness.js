'use strict';

/**
 * Le plus petit banc d'essai qui fasse l'affaire.
 *
 * L'exemple n'a **aucune dépendance npm** : c'est sa raison d'être — on le lit comme une
 * spécification exécutable, et on le lance avec le seul Node. Lui ajouter un cadre de test
 * reviendrait à renoncer à cela pour trois fonctions : `describe`, `it` et une poignée
 * d'assertions. Les voici.
 *
 * Node 18 apporte bien `node:test`, mais son affichage TAP se prête mal à un rapport lisible
 * dans une sortie de compilation déjà bavarde.
 */

const suites = [];
let current = null;

const describe = (name, body) => {
  current = { name, tests: [] };
  suites.push(current);
  body();
  current = null;
};

const it = (name, body) => {
  if (current === null) {
    throw new Error('« it » doit être appelé dans un « describe »');
  }
  current.tests.push({ name, body });
};

/** Écart lisible entre deux valeurs, pour que l'échec dise ce qui ne va pas. */
const show = (value) => {
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  try {
    return JSON.stringify(value);
  } catch (_err) {
    return String(value);
  }
};

const fail = (message, actual, expected) => {
  const error = new Error(
    message + '\n      attendu : ' + show(expected) + '\n      obtenu  : ' + show(actual));
  error.assertion = true;
  throw error;
};

const assert = {
  ok: (value, message = 'la valeur devrait être vraie') => {
    if (!value) {
      fail(message, value, true);
    }
  },
  notOk: (value, message = 'la valeur devrait être fausse') => {
    if (value) {
      fail(message, value, false);
    }
  },
  equal: (actual, expected, message = 'les valeurs diffèrent') => {
    if (actual !== expected) {
      fail(message, actual, expected);
    }
  },
  notEqual: (actual, expected, message = 'les valeurs devraient différer') => {
    if (actual === expected) {
      fail(message, actual, 'autre chose que ' + show(expected));
    }
  },
  deepEqual: (actual, expected, message = 'les structures diffèrent') => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      fail(message, actual, expected);
    }
  },
  includes: (haystack, needle, message = 'la chaîne ne contient pas ce qui est attendu') => {
    if (String(haystack).indexOf(needle) === -1) {
      fail(message, haystack, 'une chaîne contenant ' + show(needle));
    }
  },
  notIncludes: (haystack, needle, message = 'la chaîne contient ce qu’elle ne devrait pas') => {
    if (String(haystack).indexOf(needle) !== -1) {
      fail(message, haystack, 'une chaîne sans ' + show(needle));
    }
  },
  lengthOf: (list, length, message = 'la longueur ne correspond pas') => {
    if (list.length !== length) {
      fail(message, list.length, length);
    }
  },
  /** Vérifie qu'un appel échoue, et — quand on le demande — avec quel statut http. */
  throws: (body, status, message = 'l’appel aurait dû échouer') => {
    try {
      body();
    } catch (err) {
      if (status !== undefined && err.status !== status) {
        fail(message + ' (mauvais statut)', err.status, status);
      }
      return err;
    }
    return fail(message, 'aucune erreur', status === undefined ? 'une erreur' : 'statut ' + status);
  }
};

/** Exécute les suites déclarées et rend le nombre d'échecs. */
const run = async () => {
  let passed = 0;
  const failures = [];

  for (const suite of suites) {
    console.log('\n  ' + suite.name);
    for (const test of suite.tests) {
      try {
        await test.body();
        passed += 1;
        console.log('    [32m✓[0m ' + test.name);
      } catch (err) {
        failures.push({ suite: suite.name, test: test.name, err });
        console.log('    [31m✗[0m ' + test.name);
      }
    }
  }

  console.log('');
  if (failures.length === 0) {
    console.log('[32m  ' + passed + ' tests réussis[0m\n');
    return 0;
  }

  console.log('[31m  ' + failures.length + ' échec(s), ' + passed + ' réussite(s)[0m\n');
  failures.forEach((failure) => {
    console.log('  ' + failure.suite + ' → ' + failure.test);
    console.log('    ' + (failure.err.assertion ? failure.err.message : failure.err.stack) + '\n');
  });
  return failures.length;
};

module.exports = { describe, it, assert, run };
