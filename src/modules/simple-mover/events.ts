export const CLIENT_LIST_DOCS = 'list docs'
export const SERVER_RETURN_DOCS = 'receive docs'
export const SERVER_RETURN_STATUS = 'receive item status'

export const CLIENT_IMPORT_OUTLINE = 'import to outline'
export const SERVER_IMPORT_VALIDATING = 'validating import'
export const SERVER_IMPORT_RETURN_ISSUES = 'receive import issues'
export const SERVER_IMPORT_CONFIRMING = 'confirming import'

export const CLIENT_REJECT_IMPORT = 'reject import'
export const CLIENT_CONFIRM_IMPORT = 'confirm import'

export const SERVER_SAVE_ITEMS = 'save items'
export const SERVER_LOAD_ITEMS = 'save items'

export const ITEM_STATUS_PENDING = 'pending'
export const ITEM_STATUS_LISTING = 'listing'
export const ITEM_STATUS_EXPORTING = 'exporting'
export const ITEM_STATUS_DOWNLOADING = 'downloading'
export const ITEM_STATUS_DONE = 'done'
export const ITEM_STATUS_ERROR = 'error'
export const ITEM_STATUS_VALIDATING = 'validating'
export const ITEM_STATUS_CONFIRMING = 'confirming'
export const ITEM_STATUS_IMPORTING = 'importing'
export const ITEM_STATUS_CANCELLED = 'cancelled'

export const ItemStatuses = [
  ITEM_STATUS_PENDING,
  ITEM_STATUS_LISTING,
  ITEM_STATUS_EXPORTING,
  ITEM_STATUS_DOWNLOADING,
  ITEM_STATUS_DONE,
  ITEM_STATUS_ERROR,
  ITEM_STATUS_VALIDATING,
  ITEM_STATUS_IMPORTING,
  ITEM_STATUS_CONFIRMING,
  ITEM_STATUS_CANCELLED,
] as const
