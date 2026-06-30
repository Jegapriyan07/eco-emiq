#!/usr/bin/env node

/**
 * Setup script for EcoTronics development environment
 * Checks prerequisites and initializes the project
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 EcoTronics Setup Script\n');

// Color codes for terminal output
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
        execSync(`${command} --version`, { stdio: 'ignore' });
        log(`✅ ${name} is installed`, 'green');
        return true;
    } catch (error) {
        log(`❌ ${name} is not installed`, 'red');
        return false;
    }
}

function runCommand(command, description) {
    log(`\n📦 ${description}...`, 'blue');
    try {
        execSync(command, { stdio: 'inherit' });
        log(`✅ ${description} completed`, 'green');
        return true;
    } catch (error) {
        log(`❌ ${description} failed`, 'red');
        return false;
    }
}

async function main() {
    // Step 1: Check prerequisites
    log('\n📋 Step 1: Checking prerequisites...', 'blue');

    const checks = [
        checkCommand('node', 'Node.js'),
        checkCommand('npm', 'npm'),
        checkCommand('docker', 'Docker'),
        checkCommand('git', 'Git'),
    ];

    if (!checks.every(Boolean)) {
        log('\n⚠️  Please install missing prerequisites before continuing', 'yellow');
        log('Visit: https://nodejs.org, https://docker.com, https://git-scm.com', 'yellow');
        process.exit(1);
    }

    // Step 2: Create .env file if it doesn't exist
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

    // Step 3: Install root dependencies
    if (!runCommand('npm install', 'Installing root dependencies')) {
        process.exit(1);
    }

    // Step 4: Build shared library
    log('\n📋 Step 4: Building shared library...', 'blue');
    if (!runCommand('cd shared && npm install && npm run build', 'Building shared types')) {
        process.exit(1);
    }

    // Step 5: Start Docker services
    log('\n📋 Step 5: Starting Docker services...', 'blue');
    log('⚠️  This may take a few minutes on first run...', 'yellow');

    if (!runCommand('docker-compose up -d postgres timescaledb redis mosquitto minio', 'Starting infrastructure')) {
        log('⚠️  Docker services failed to start. You may need to start them manually.', 'yellow');
    }

    // Step 6: Wait for services to be healthy
    log('\n📋 Step 6: Waiting for services to be healthy...', 'blue');
    log('⏳ Waiting 10 seconds for databases to initialize...', 'yellow');

    await new Promise(resolve => setTimeout(resolve, 10000));

    // Step 7: Initialize databases
    log('\n📋 Step 7: Initializing databases...', 'blue');

    const initDbCommands = [
        {
            cmd: 'docker exec -i ecotronics-postgres psql -U ecotronics -d ecotronics < infrastructure/init-db.sql',
            desc: 'Initializing PostgreSQL schema',
        },
        {
            cmd: 'docker exec -i ecotronics-timescaledb psql -U ecotronics -d ecotronics_timeseries < infrastructure/init-timescaledb.sql',
            desc: 'Initializing TimescaleDB schema',
        },
    ];

    for (const { cmd, desc } of initDbCommands) {
        if (!runCommand(cmd, desc)) {
            log('⚠️  Database initialization failed. You may need to run it manually.', 'yellow');
        }
    }

    // Step 8: Summary
    log('\n' + '='.repeat(60), 'green');
    log('🎉 Setup Complete!', 'green');
    log('='.repeat(60), 'green');

    log('\n📝 Next Steps:', 'blue');
    log('1. Review and update .env file with your configuration', 'yellow');
    log('2. Start backend services:', 'yellow');
    log('   cd backend/auth-service && npm install && npm run dev', 'reset');
    log('3. Start frontend:', 'yellow');
    log('   cd frontend && npm install && npm run dev', 'reset');
    log('4. Start edge device simulator:', 'yellow');
    log('   cd edge-device && npm install && npm run dev', 'reset');
    log('\n📚 Documentation: See README.md and IMPLEMENTATION_PLAN.md', 'blue');
    log('🐛 Issues? Check docker-compose logs: docker-compose logs -f', 'blue');
    log('\n');
}

main().catch((error) => {
    log(`\n❌ Setup failed: ${error.message}`, 'red');
    process.exit(1);
});
