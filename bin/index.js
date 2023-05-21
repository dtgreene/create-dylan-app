#!/usr/bin/env node

'use-strict';

import inquirer from 'inquirer';
import { fileURLToPath } from 'node:url';
import {
  readdirSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import * as extra from 'fs-extra';

// where this script lives at (e.g /bin/index.js)
const __dirname = fileURLToPath(new URL('.', import.meta.url));
// where this script is being called from
const cwd = process.cwd();

const configs = {
  javascript: {
    contentPath: resolve(__dirname, '../content/javascript'),
    dependencies: {
      save: ['react@18', 'react-dom@18'],
      saveDev: ['vite@4', '@vitejs/plugin-react@4'],
    },
  },
  typescript: {
    contentPath: resolve(__dirname, '../content/typescript'),
    dependencies: {
      save: ['react@18', 'react-dom@18'],
      saveDev: [
        'vite@4',
        '@vitejs/plugin-react@4',
        '@types/react@18',
        '@types/react-dom@18',
        '@types/node@18',
      ],
    },
  },
};

const styleConfigs = {
  none: {},
  mui: {
    dependencies: {
      saveDev: ['@mui/material@5', '@emotion/react@11', '@emotion/styled@11'],
    },
  },
  tailwindcss: {
    contentPath: resolve(__dirname, '../content/tailwindcss'),
    dependencies: {
      saveDev: ['tailwindcss@3', 'postcss@8', 'autoprefixer@10'],
    },
  },
  bootstrap: {
    dependencies: {
      saveDev: ['bootstrap@5'],
    },
  },
};

const questions = [
  {
    type: 'input',
    name: 'name',
    message: "What is the project's name?",
    default: '',
    validate: (value) => {
      if (!value) {
        return 'Please enter a name';
      }

      const path = resolve(cwd, value);
      // check if a directory with the same name exists
      if (existsSync(path) && !isDirectoryEmpty(path)) {
        return `Cannot use name "${value}"; this directory already exists and is not empty`;
      }

      return true;
    },
  },
  {
    type: 'confirm',
    name: 'useTypeScript',
    message: 'Do you want to use TypeScript?',
    default: false,
    transformer: (answer) => (answer ? 'Yes' : 'No'),
  },
  {
    type: 'list',
    name: 'styleLibrary',
    message: 'What style library would you like to include?',
    choices: Object.keys(styleConfigs),
  },
];

async function main() {
  // log create-dylan-app letters
  [
    '    ___       ___       ___   ',
    '   /\\  \\     /\\  \\     /\\  \\  ',
    '  /::\\  \\   /::\\  \\   /::\\  \\ ',
    ' /:/\\:\\__\\ /:/\\:\\__\\ /::\\:\\__\\',
    ' \\:\\ \\/__/ \\:\\/:/  / \\/\\::/  /',
    '  \\:\\__\\    \\::/  /    /:/  / ',
    '   \\/__/     \\/__/     \\/__/  ',
    '',
  ].forEach((line) => console.log(line));

  // start the prompt
  const answers = await inquirer.prompt(questions);

  console.log('\nCreating project...');

  const projectPaths = {
    root: resolve(cwd, answers.name),
    package: resolve(cwd, answers.name, 'package.json'),
  };

  // create the project directory if needed
  if (!existsSync(projectPaths.root)) {
    mkdirSync(projectPaths.root);
  }

  // copy common folder
  await extra.copy(resolve(__dirname, '../content/common'), projectPaths.root);

  // read and update the package name
  const packageJSON = JSON.parse(readFileSync(projectPaths.package, 'utf-8'));
  packageJSON.name = answers.name;

  // write the updated package
  writeFileSync(
    projectPaths.package,
    JSON.stringify(packageJSON, undefined, 2)
  );

  // main setup
  const isTypeScript = answers.useTypeScript === 'Yes';
  const config = isTypeScript ? configs.typescript : configs.javascript;
  const styleConfig = styleConfigs[answers.styleLibrary];

  // copy main content
  await extra.copy(config.contentPath, projectPaths.root);

  // copy style content if any
  if (styleConfig.contentPath) {
    await extra.copy(styleConfig.contentPath, projectPaths.root);
  }

  console.log('Installing dependencies...');

  // change directory to the project
  process.chdir(projectPaths.root);

  // install dependencies
  install(config.dependencies.save);
  install(config.dependencies.saveDev, { isDev: true });

  // install style dependencies if any
  if (styleConfig.dependencies) {
    install(styleConfig.dependencies.saveDev, { isDev: true });
  }

  console.log('Done!\n');
}

function install(dependencies, options = { isDev: false }) {
  try {
    execSync(
      `npm install ${options.isDev ? '--save-dev ' : ''}${dependencies.join(
        ' '
      )}`,
      {
        stdio: 'pipe',
      }
    );
  } catch (error) {
    console.log(`npm install failed; ${error.toString()}`);
    process.exit(1);
  }
}

function isDirectoryEmpty(path) {
  return readdirSync(path).length === 0;
}

main();
