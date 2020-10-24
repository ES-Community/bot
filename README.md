# Bot Discord de la communauté

## Développement

### Prérequis

- Node.js v14
- npm v6
- Un bot Discord installé sur une copie du serveur ES Community.
  - Template: https://discord.new/T3mtuFqjR8Tm

### Préparation de l'environnement

Installez les dépendances avec npm:

```console
npm ci
```

Créez un fichier `.env` avec votre token de bot:

```env
DISCORD_TOKEN=votretoken
```

### Exécution du bot

```console
npm start
```

Cette commande exécute le fichier `src/bot.ts`, qui démarre le bot. Les changements dans le dossier `src` sont observés par `nodemon` et le bot est redémarré automatiquement.

### Tests

Le projet contient 3 scripts de test qui doivent passer pour tout commit poussé sur la branche `main`. Vous pouvez exécuter tous les tests avec la commande suivante:

```console
npm test
```

#### Tests TS

```console
# Exécution des tests.
npm run test-only

# Exécution des tests et création d'un rapport de couverture.
npm run test-coverage
```

Le framework de test [Jest](https://jestjs.io/) est utilisé pour exécuter les tests. Ceux-ci doivent être écrits en TypeScript dans le dossier `tests`. Essayez de conserver la même structure de dossiers que dans `src` pour organiser les tests.

#### Lint

```console
# Exécution d'ESLint
npm run lint

# Exécution d'ESLint avec correction automatique de ce qui peut l'être.
npm run lint-fix
```

Nous utilisons [ESLint](https://eslint.org/) ainsi que [typescript-eslint](https://github.com/typescript-eslint/typescript-eslint) pour l'analyse statique du code.

#### Vérification des types TypeScript

```console
npm run check-types
```

Cette commande exécute le compilateur TypeScript avec l'option `--noEmit`. Elle permet de valider les types de l'entier du projet, y compris sur les fichiers qui ne sont pas testés avec Jest.
