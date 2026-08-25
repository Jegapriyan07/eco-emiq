#!/usr/bin/env node

/**
 * Start the ML service (FastAPI) without Docker.
 * Requires Python 3.10+ with ml-service dependencies installed.
 */

const { spawn } = require('child_process');
const path = require('path');

const mlServiceDir = path.join(__dirname, '..', 'ml-service');
const pythonCandidates =
    process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];

function startWithPython(pythonCmd, index = 0) {
    if (index >= pythonCandidates.length) {
        console.error('❌ Python not found. Install Python 3.10+ from https://python.org');
        console.error('   Then run: pip install -r ml-service/requirements.txt');
        process.exit(1);
    }

    const cmd = pythonCandidates[index];
    const args = ['-m', 'uvicorn', 'src.main:app', '--reload', '--host', '127.0.0.1', '--port', '8000'];

    const proc = spawn(cmd, args, {
        cwd: mlServiceDir,
        stdio: 'inherit',
        shell: process.platform === 'win32',
    });

    proc.on('error', () => startWithPython(pythonCmd, index + 1));

    proc.on('exit', (code, signal) => {
        if (signal) {
            process.exit(1);
        }
        if (code === 9009 || code === 127) {
            startWithPython(pythonCmd, index + 1);
            return;
        }
        process.exit(code ?? 0);
    });
}

console.log('🤖 Starting ML service on http://localhost:8000 ...\n');
startWithPython();
