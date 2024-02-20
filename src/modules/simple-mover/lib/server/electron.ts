// Interact with electron

import { shell } from 'electron'
import * as log from 'electron-log'

/**
 * Open a link in the default browser
 * @param url
 */
export const openLink = async (url: string) => {
  // TODO: handle errors
  await shell.openExternal(url)
}

export { log }
