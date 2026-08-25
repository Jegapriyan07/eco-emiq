#!/usr/bin/env node

/**
 * Setup script for EcoTronics development environment
 * Checks prerequisites and initializes the project (no Docker required)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 EcoTronics Setup Script\n');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkCommand(command, name) {
    try {
        execSync(`${command} --version`, { stdio: 'ignore', shell: true });
        log(`✅ ${name} is installed`, 'green');
        return true;
    } catch (error) {
        log(`❌ ${name} is not installed`, 'red');
        return false;
    }
}

function checkPython() {
    const candidates =
        process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];
    for (const cmd of candidates) {
        try {
            execSync(`${cmd} --version`, { stdio: 'ignore', shell: true });
            log(`✅ Python is installed (${cmd})`, 'green');
            return cmd;
        } catch (error) {
            /* try next */
        }
    }
    log('❌ Python is not installed', 'red');
    return null;
}

function runCommand(command, description, options = {}) {
    log(`\n📦 ${description}...`, 'blue');
    try {
        execSync(command, { stdio: 'inherit', shell: true, ...options });
        log(`✅ ${description} completed`, 'green');
        return true;
    } catch (error) {
        log(`❌ ${description} failed`, 'red');
        return false;
    }
}

async function main() {
    log('\n📋 Step 1: Checking prerequisites...', 'blue');

    const pythonCmd = checkPython();
    const checks = [
        checkCommand('node', 'Node.js'),
        checkCommand('npm', 'npm'),
        checkCommand('git', 'Git'),
        Boolean(pythonCmd),
    ];

    if (!checks.every(Boolean)) {
        log('\n⚠️  Please install missing prerequisites before continuing', 'yellow');
        log('Visit: https://nodejs.org, https://python.org, https://git-scm.com', 'yellow');
        process.exit(1);
    }

    log('\n📋 Step 2: Setting up environment variables...', 'blue');

    const envPath = path.join(__dirname, '..', '.env');
    const envExamplePath = path.join(__dirname, '..', '.env.example');

    if (!fs.existsSync(envPath)) {
        if (fs.existsSync(envExamplePath)) {
            fs.copyFileSync(envExamplePath, envPath);
            log('✅ Created .env file from .env.example', 'green');
            log('⚠️  Please update .env with your configuration', 'yellow');
        } else {
            log('❌ .env.example not found', 'red');
        }
    } else {
        log('✅ .env file already exists', 'green');
    }

    if (!runCommand('npm install', 'Installing root dependencies', { cwd: path.join(__dirname, '..') })) {
        process.exit(1);
    }

    log('\n📋 Step 3: Building shared library...', 'blue');
    const sharedDir = path.join(__dirname, '..', 'shared');
    if (!runCommand('npm install && npm run build', 'Building shared types', { cwd: sharedDir })) {
        process.exit(1);
    }

    log('\n📋 Step 4: Installing ML service dependencies...', 'blue');
    const mlRequirements = path.join(__dirname, '..', 'ml-service', 'requirements.txt');
    if (fs.existsSync(mlRequirements)) {
        if (!runCommand(`${pythonCmd} -m pip install -r requirements.txt`, 'Installing ML service packages', {
            cwd: path.join(__dirname, '..', 'ml-service'),
        })) {
            log('⚠️  ML service install failed. Run manually: pip install -r ml-service/requirements.txt', 'yellow');
        }
    }

    log('\n📋 Step 5: Seeding demo database + training ML models...', 'blue');
    const mlDir = path.join(__dirname, '..', 'ml-service');
    runCommand(`${pythonCmd} scripts/seed_demo_db.py`, 'Seeding emission_readings demo data', { cwd: mlDir });
    runCommand(`${pythonCmd} train_all_models.py`, 'Training ML models from database', { cwd: mlDir });

    log('\n📋 Step 6: Installing frontend dependencies...', 'blue');
    runCommand('npm install', 'Installing frontend packages', {
        cwd: path.join(__dirname, '..', 'frontend'),
    });

    log('\n' + '='.repeat(60), 'green');
    log('🎉 Setup Complete!', 'green');
    log('='.repeat(60), 'green');

    log('\n📝 Next Steps:', 'blue');
    log('1. Review and update .env if needed', 'yellow');
    log('2. Start the app (frontend + ML service):', 'yellow');
    log('   npm run dev', 'reset');
    log('3. Reseed DB: npm run db:seed  |  Retrain: npm run ml:train', 'yellow');
    log('3. Open http://localhost:5173 and use demo login buttons', 'yellow');
    log('4. ML API docs: http://localhost:8000/docs', 'yellow');
    log('\n📚 Documentation: See README.md and GETTING_STARTED.md', 'blue');
    log('\n');
}

main().catch((error) => {
    log(`\n❌ Setup failed: ${error.message}`, 'red');
    process.exit(1);
});
