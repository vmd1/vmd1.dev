const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const configFile = path.join(__dirname, '..', 'ext-sites.json');
if (!fs.existsSync(configFile)) {
  console.log('No ext-sites.json found. Skipping external sites build.');
  process.exit(0);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
} catch (err) {
  console.error('Error parsing ext-sites.json:', err);
  process.exit(1);
}

const sitesDir = path.join(__dirname, '..', 'sites');
if (!fs.existsSync(sitesDir)) {
  fs.mkdirSync(sitesDir, { recursive: true });
}

// Helper to run commands, masking GH_TOKEN if present
function runCmd(cmd, cwd) {
  let maskedCmd = cmd;
  if (process.env.GH_TOKEN) {
    // Escape regex characters just in case the token has any special characters
    const escapedToken = process.env.GH_TOKEN.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    maskedCmd = cmd.replace(new RegExp(escapedToken, 'g'), '***');
  }
  console.log(`Running: ${maskedCmd} in ${cwd || 'current dir'}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

// Set Node memory limit options globally for builds
process.env.NODE_OPTIONS = '--max_old_space_size=4096';

for (const [key, site] of Object.entries(config)) {
  console.log(`\n--- Processing external site: ${key} ---`);
  
  const repo = site.repo;
  const build = site.build || {};
  const command = build.command;
  const outputDirName = build.output || ''; // e.g. "dist"
  
  if (!repo) {
    console.error(`Error: No repository specified for ${key}`);
    continue;
  }
  
  const domain = key;
  const targetDir = path.join(sitesDir, domain);
  
  // Create temp dir for cloning
  const tempDir = path.join(__dirname, '..', 'temp-' + domain.replace(/[^a-zA-Z0-9]/g, '-'));
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  
  let cloneRepoUrl = repo;
  if (process.env.GH_TOKEN && cloneRepoUrl.startsWith('https://github.com/')) {
    cloneRepoUrl = cloneRepoUrl.replace('https://github.com/', `https://x-access-token:${process.env.GH_TOKEN}@github.com/`);
  }

  try {
    // Clone repo
    runCmd(`git clone ${cloneRepoUrl} "${tempDir}"`);
    
    // Check if build command is specified and not empty
    if (command && command.trim() !== '') {
      console.log(`Build command specified: ${command}`);
      
      // If it's a Node project (package.json exists), install dependencies
      if (fs.existsSync(path.join(tempDir, 'package.json'))) {
        if (fs.existsSync(path.join(tempDir, 'package-lock.json'))) {
          console.log('package-lock.json found. Installing dependencies via npm ci...');
          runCmd('npm ci', tempDir);
        } else {
          console.log('package.json found but no lockfile. Installing dependencies via npm install...');
          runCmd('npm install', tempDir);
        }
      }
      
      // Run the build command
      runCmd(command, tempDir);
    } else {
      console.log('No build command specified or empty. Skipping build step.');
    }
    
    // Determine the source output path
    const srcOutputDir = outputDirName ? path.join(tempDir, outputDirName) : tempDir;
    
    if (!fs.existsSync(srcOutputDir)) {
      throw new Error(`Output directory "${srcOutputDir}" does not exist.`);
    }
    
    // Ensure target dir is clean and copy built/source files
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });
    
    // Copy output files to targetDir, excluding .git
    console.log(`Copying files from ${srcOutputDir} to ${targetDir} (excluding .git)`);
    
    fs.cpSync(srcOutputDir, targetDir, {
      recursive: true,
      filter: (src) => {
        const relativePath = path.relative(srcOutputDir, src);
        // Exclude the .git directory or files within it
        return !relativePath.split(path.sep).includes('.git');
      }
    });
    console.log(`Successfully built and copied ${key} to ${targetDir}`);
    
  } catch (err) {
    console.error(`Error building site ${key}:`, err);
    process.exit(1); // Fail the workflow build if a site build fails
  } finally {
    // Clean up temp dir
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}
