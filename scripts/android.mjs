import { spawn } from 'node:child_process'
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(scriptDir, '..')
const androidDir = join(projectRoot, 'android')
const isWindows = process.platform === 'win32'
const viteCli = join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')
const capacitorCli = join(projectRoot, 'node_modules', '@capacitor', 'cli', 'bin', 'capacitor')
const syncOnly = process.argv.includes('--sync')

function run(command, args, cwd = projectRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', shell: false })
    child.on('error', reject)
    child.on('exit', code => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`))
    })
  })
}

async function main() {
  await run(process.execPath, [viteCli, 'build'])
  await run(process.execPath, [capacitorCli, 'sync', 'android'])
  if (syncOnly) return

  if (isWindows) {
    await run(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'gradlew.bat assembleDebug'], androidDir)
  } else {
    await run('./gradlew', ['assembleDebug'], androidDir)
  }
  const packageJson = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'))
  const version = String(packageJson.version)
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Invalid package version: ${version}`)

  const apkSource = join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')
  const releaseDir = join(projectRoot, 'release')
  const apkDestination = join(releaseDir, `qinglv-feixingqi-v${version}-debug.apk`)
  await mkdir(releaseDir, { recursive: true })
  await copyFile(apkSource, apkDestination)
  console.log(`\nAPK ready: ${apkDestination}`)
}

main().catch(error => {
  console.error(`\nAndroid build failed: ${error.message}`)
  process.exitCode = 1
})
