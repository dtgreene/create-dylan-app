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

// Where this script lives at (e.g /bin/index.js)
const __dirname = fileURLToPath(new URL('.', import.meta.url));
// Where this script is being called from
const cwd = process.cwd();

const baseConfig = {
  contentPath: resolve(__dirname, '../content/javascript'),
  dependencies: {
    save: ['react@18', 'react-dom@18'],
    saveDev: ['vite@4', '@vitejs/plugin-react@4'],
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
      // Check if a directory with the same name exists
      if (existsSync(path) && !isDirectoryEmpty(path)) {
        return `Cannot use name "${value}"; this directory already exists and is not empty`;
      }

      return true;
    },
  },
  {
    type: 'list',
    name: 'styleLibrary',
    message: 'What style library would you like to include?',
    choices: Object.keys(styleConfigs),
  },
];

async function main() {
  // Log create-dylan-app letters
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

  // Start the prompt
  const answers = await inquirer.prompt(questions);

  console.log('\nCreating project...');

  const projectPaths = {
    root: resolve(cwd, answers.name),
    package: resolve(cwd, answers.name, 'package.json'),
  };

  // Create the project directory if needed
  if (!existsSync(projectPaths.root)) {
    mkdirSync(projectPaths.root);
  }

  // Copy the base folder
  await extra.copy(resolve(__dirname, '../content/base'), projectPaths.root);

  // Read and update the package name
  const packageJSON = JSON.parse(readFileSync(projectPaths.package, 'utf-8'));
  packageJSON.name = answers.name;

  // Write the updated package
  writeFileSync(
    projectPaths.package,
    JSON.stringify(packageJSON, undefined, 2)
  );

  // Get style config
  const styleConfig = styleConfigs[answers.styleLibrary];

  // Copy style content if any
  if (styleConfig.contentPath) {
    await extra.copy(styleConfig.contentPath, projectPaths.root);
  }

  console.log('Installing dependencies...');

  // Change directory to the project
  process.chdir(projectPaths.root);

  // Install dependencies
  install(baseConfig.dependencies.save);
  install(baseConfig.dependencies.saveDev, { isDev: true });

  // Install style dependencies if any
  if (styleConfig.dependencies) {
    install(styleConfig.dependencies.saveDev, { isDev: true });
  }

  console.log('Done!\n');
  console.log(
    `To start your development server, run \x1b[34mcd ${answers.name}\x1b[0m and \x1b[34mnpm start\x1b[0m\n`
  );
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
