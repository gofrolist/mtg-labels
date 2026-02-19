import { execSync } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'

const projectRoot = '/vercel/share/v0-project'
const frontendModules = path.join(projectRoot, 'frontend', 'node_modules')

if (existsSync(frontendModules)) {
  console.log('Removing frontend/node_modules to prevent resolution conflicts...')
  execSync(`rm -rf "${frontendModules}"`, { stdio: 'inherit' })
  console.log('Done - frontend/node_modules removed.')
} else {
  console.log('frontend/node_modules does not exist, nothing to clean.')
}
