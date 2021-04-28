<!-- mrm-task-lint-staged-wonderment -->

# mrm-task-lint-staged-wonderment

[Mrm](https://github.com/sapegin/mrm) task that adds configs for pre-commit code formatting

**Note:** supports only Prettier, ESLint and Stylelint now.

## What it does

-   Creates a config in `package.json`
-   Adds required packages in `devDependencies`
-   Creates `.prettierrc`
-   Sets up a pre-commit git hook
-   Updates `.gitignore` to ignore pre-commit hook script
-   Installs dependencies

## Usage

```
npm install -g mrm
mrm mrm-task-lint-staged-wonderment
```

OR

```
npx mrm mrm-task-lint-staged-wonderment
```

With `next.js`

```
npx -p npm@6 mrm mrm-task-lint-staged-wonderment
```
