# Bot Discord de la communauté

## Prérequis

- Node.js v16
- npm v7
- Un bot Discord installé sur une copie du serveur ES Community.
  - Template : https://discord.new/T3mtuFqjR8Tm

## Préparation de l'environnement

Installez les dépendances avec npm :

```console
npm ci
```

Créez un fichier `.env` avec votre token de bot :

```env
DISCORD_TOKEN=votretoken
```

## Exécution du bot

```console
npm start
```

Cette commande exécute le fichier `src/bot.ts`, qui démarre le bot. Les changements dans le dossier `src` sont observés par `nodemon` et le bot est redémarré automatiquement.

## Tests

Le projet contient 3 scripts de test qui doivent passer pour tout commit poussé sur la branche `main`. Vous pouvez exécuter tous les tests avec la commande suivante :

```console
npm test
```

### Tests TS

```console
# Exécution des tests.
npm run test-only

# Exécution des tests et création d'un rapport de couverture.
npm run test-coverage
```

Le framework de test [Jest](https://jestjs.io/) est utilisé pour exécuter les tests. Ceux-ci doivent être écrits en TypeScript dans le dossier `tests`. Essayez de conserver la même structure de dossiers que dans `src` pour organiser les tests.

### Lint

```console
# Exécution d'ESLint
npm run lint

# Exécution d'ESLint avec correction automatique de ce qui peut l'être.
npm run lint-fix
```

Nous utilisons [ESLint](https://eslint.org/) ainsi que [TypeScript ESLint](https://github.com/typescript-eslint/typescript-eslint) pour l'analyse statique du code.

### Vérification des types TypeScript

```console
npm run check-types
```

Cette commande exécute le compilateur TypeScript avec l'option `--noEmit`. Elle permet de valider les types de l'entier du projet, y compris sur les fichiers qui ne sont pas testés avec Jest.

## Écriture de fonctionnalités

### Commandes

#### Migrations

Si vous avez apporté des modifications à des commandes, ajouté des nouvelles commandes ou supprimé des commands, vous devez lancer une migration avant de lancer le bot.
Les migrations permettent d'enregistrer ou de mettre à jour les commande auprès de Discord. Si la migration n'est pas effectué (lorsque c'est nécessaire), les nouvelles commandes, commandes modifiées ou supprimées disfonctionneront. Le bot vous avertira au démarrage si une migration est nécessaire.

Pour migrer le commande vous pouvez faire :

```sh
$ npm run masco migrate # pour toutes les commandes
$ npm run masco migrate <nom du fichier de la commande> # pour une commande spécifique
```

Veuillez vous référer à la commande d'aide de `masco` pour plus d'informations et d'exempels : `npm run help`.

Chaque commande doit être écrite dans un fichier du dossier `src/commands`. Ce
fichier doit instancier et exporter par défaut une instance de la classe `Command`,
en lui passant les paramètres de configuration suivants :

- `enabled`: boolean. Si la commande doit être activé par défaut quand le bot est ajouté à un serveur (`true` par défaut) (correspond à `default_permission`).
- `name`: string. Nom de la commande..
- `description`: string. Description de ce que fait la commande (en français).
- `options`?: object. Options (arguments) de la commande.
- `handle`: function. Fonction exécutée lorsque cette commande est appellée. Elle recevra un argument `context`, avec les propriétés :
  - `args`: Objet correctement typé, contenant les options fournis par l'éxecuteur de la commande (abstraction d'`interaction.options`).
  - `interaction`: Instance de CommandInteraction (discord.js).
  - `client`: Instance du Client (discord.js).
  - `logger`: Instance du Logger (pino).

#### Exemple

**Fichier exemplaire :** [src/commands/Hello.ts](src/commands/Hello.ts).

```ts
import { Command, CommandOptionTypes } from '../framework';

// création d'une commande slash (https://discord.com/developers/docs/interactions/slash-commands)
export default new Command({
  enabled: true,
  name: 'say', // nom de la commande
  description: 'Dit ce que vous lui dites.', // description de la commande
  options: {
    message: {
      // ceci est une option ("argument") de la commande slash
      type: CommandOptionTypes.String, // type d'option (en l'occurence, chaine de caractère)
      description: 'Ce que le bot doit dire.', // description de cette option
      required: true, // option obligatoire (par défaut, false)
    },
  },
  handle({ args, interaction }) {
    // args aura comme type : `{ message: string }`
    return interaction.reply(
      `**${interaction.user.username}** m'a dit de dire : « ${args.message} ».`,
    );
    // si toutefois, vous voulez accéder aux arguments fourni comme telle par discord.js :
    // interaction.options.get('message').value;
  },
});
```

### Tâches cron

Chaque tâche cron doit être écrite dans un fichier du dossier `src/crons`. Ce
fichier doit instancier et exporter par défaut une instance de la classe `Cron`,
en lui passant les paramètres de configuration suivants :

- `enabled`: boolean. Peut être mis à `false` pour désactiver la tâche.
- `name`: string. Nom de la tâche. Utilisé dans les logs.
- `description`: string. Description de ce que fait la tâche (en français).
- `schedule`: string. Programme d'exécution. Vous pouvez utiliser [crontab guru](https://crontab.guru/) pour le préparer.
- `handle`: function. Fonction exécutée selon le programme. Elle recevra un argument `context`, avec les propriétés :
  - `date`: Date théorique d'exécution de la tâche.
  - `client`: Instance du Client (discord.js).
  - `logger`: Instance du Logger (pino).

#### Exemple

**Fichier exemplaire :** [src/crons/CommitStrip.ts](src/crons/CommitStrip.ts).

```ts
import { Cron } from '../framework';

export default new Cron({
  enabled: true,
  name: 'CronJob',
  description: 'Description',
  schedule: '*/30 * * * *',
  async handle(context) {
    // Code exécuté selon le programme
  },
});
```
