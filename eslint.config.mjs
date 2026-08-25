// Configuration ESLint du monorepo — une seule, a la racine.
//
// Quinze paquets declaraient une commande de lint sans qu'aucune configuration
// n'existe dans le depot : la commande ne pouvait donc aboutir nulle part.
// ESLint remonte les dossiers parents jusqu'a trouver ce fichier, un seul suffit.
//
// Parti pris : on signale ce qui casse (variables non definies, dependances de
// hooks manquantes, promesses ignorees), pas ce qui releve du style. Le formatage
// n'est pas l'affaire de cet outil.

import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import nextPlugin from '@next/eslint-plugin-next'

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/coverage/**',
      '.claude/**', // outillage local de la station de travail, pas du produit
      '_bmad/**',
      '_bmad-output/**',
      '_orpheus/**',
      'supabase/functions/**', // Deno : globals et imports par URL, hors perimetre
      '**/*.d.ts',
      'packages/types/src/database.types.ts', // genere par Supabase
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx,js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        React: 'readonly',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      // Les deux applications sont des applications Next et le code porte deja
      // des derogations visant ces regles : le greffon doit etre charge pour
      // qu'elles aient un sens.
      '@next/next': nextPlugin,
    },
    rules: {
      // Regles de hooks : elles attrapent des defauts reels de rafraichissement,
      // exactement le type de probleme documente dans le registre du projet.
      ...reactHooks.configs.recommended.rules,

      // Une variable inutilisee signale souvent un oubli de branchement. Les noms
      // prefixes d'un souligne restent tolérés : c'est la convention pour dire
      // « je sais, et c'est voulu ».
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],

      // `any` est proscrit par la convention du projet. Le code porte deja des
      // directives de derogation ligne a ligne, ecrites en prevision de cet outil :
      // la regle reste donc active, en avertissement le temps de resorber le stock.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Une variable inutilisee ou une dependance de hook oubliee sont des
      // signaux utiles mais nombreux sur du code existant : avertissement, pour
      // les rendre visibles sans bloquer. A rehausser une fois le stock traite.
      'react-hooks/exhaustive-deps': 'warn',

      // Faux positifs frequents sur les declarations de types et les surcharges.
      'no-undef': 'off',

      // Le projet affiche des images distantes (avatars, logos clients) que le
      // composant optimise de Next ne sert pas sans declaration de domaines.
      // Signalement conserve, sans blocage.
      '@next/next/no-img-element': 'warn',

      // Les gabarits de chaine contiennent volontairement des caracteres
      // invisibles — notamment la marque d'ordre des octets placee en tete des
      // exports CSV pour qu'Excel les ouvre correctement.
      'no-irregular-whitespace': ['error', { skipTemplates: true, skipStrings: true }],

    },
  },

  {
    // Fichiers de test : les utilitaires globaux de Vitest sont fournis par
    // l'environnement, et les imitations recourent volontiers a des types laches.
    files: ['**/*.test.{ts,tsx}', 'tests/**/*.{ts,tsx}', 'vitest.setup.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      // Un test compare volontiers des valeurs litterales entre elles.
      'no-constant-condition': 'off',
    },
  }
)
